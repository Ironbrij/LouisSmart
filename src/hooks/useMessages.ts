import { useEffect, useState, useCallback, useRef } from "react";
import { v4 as uuid } from "uuid";
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, firebaseReady } from "@/lib/firebase";
import type { ChatMessage } from "@/lib/types";
import { streamAiReply } from "@/lib/webhook";

const MOCK_UID = "mock-uid-123";

function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  return Date.now();
}

export function useMessages(uid: string | undefined, chatId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (!chatId) return [];
    try {
      const stored = localStorage.getItem(`louis-chat-${chatId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const localRef = useRef<ChatMessage[]>([]);
  const streamFrameRef = useRef<number | null>(null);
  const pendingBufferRef = useRef("");
  const messagesRef = useRef<ChatMessage[]>(messages);
  const [, setLocalTick] = useState(0);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const fromDoc = (d: QueryDocumentSnapshot<DocumentData>): ChatMessage => {
    const data = d.data();
    return {
      id: d.id,
      role: data.role,
      content: data.content || "",
      attachments: data.attachments || [],
      timestamp: toMillis(data.timestamp),
    };
  };

  useEffect(() => {
    localRef.current = [];
    setMessages((prev) => (chatId ? prev : []));
    abortRef.current?.abort();
    abortRef.current = null;
    pendingBufferRef.current = "";
    if (streamFrameRef.current !== null) {
      cancelAnimationFrame(streamFrameRef.current);
      streamFrameRef.current = null;
    }
    setGenerating(false);
    if (!chatId) return;

    const loadLocally = () => {
      try {
        const stored = localStorage.getItem(`louis-chat-${chatId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          setMessages(parsed);
        }
      } catch (e) {
        console.error("Local storage load failed", e);
      }
      setLoading(false);
    };

    loadLocally();

    if (!uid || !firebaseReady || uid === MOCK_UID) {
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "messages"),
      where("chat_id", "==", chatId),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const remote = snap.docs.map(fromDoc);
          setMessages(remote);
          try {
            localStorage.setItem(`louis-chat-${chatId}`, JSON.stringify(remote));
          } catch {
            // ignore
          }
        }
        setLoading(false);
      },
      (error) => {
        console.warn("Firestore messages subscription failed, using local storage fallback", error);
        loadLocally();
      },
    );

    return () => unsubscribe();
  }, [uid, chatId]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (streamFrameRef.current !== null) {
        cancelAnimationFrame(streamFrameRef.current);
      }
    };
  }, []);

  const uploadImage = useCallback(
    async (file: File): Promise<{ url: string; type: string; name: string }> => {
      if (!uid || !chatId) throw new Error("Not ready");
      const id = uuid();
      const path = `chat-uploads/${uid}/${chatId}/${id}-${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      return { url, type: file.type, name: file.name };
    },
    [uid, chatId],
  );

  const sendMessage = useCallback(
    async (text: string, image?: File | null) => {
      if (!chatId) return;
      const trimmed = text.trim();
      if (!trimmed && !image) return;

      let attachments: ChatMessage["attachments"] = [];
      if (image) {
        try {
          if (uid && firebaseReady && uid !== MOCK_UID) {
            const up = await uploadImage(image);
            attachments = [up];
          } else {
            attachments = [{ url: URL.createObjectURL(image), type: image.type, name: image.name }];
          }
        } catch (e) {
          console.error("upload failed", e);
          attachments = [{ url: URL.createObjectURL(image), type: image.type, name: image.name }];
        }
      }

      const userMsgId = uuid();
      const userMsg: ChatMessage = { id: userMsgId, role: "user", content: trimmed, attachments, timestamp: Date.now() };
      const assistantMsgId = uuid();
      const assistantMsg: ChatMessage = { id: assistantMsgId, role: "assistant", content: "", timestamp: Date.now() + 1, streaming: true };

      let useFirestore = Boolean(uid && firebaseReady && uid !== MOCK_UID);
      let userRowId = userMsgId;
      let assistantRowId: string = assistantMsgId;

      // Update state immediately so the user's message appears instantly
      setMessages((prev) => {
        const next = [...prev, userMsg, assistantMsg];
        try {
          localStorage.setItem(`louis-chat-${chatId}`, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });

      // Update local chats list summary immediately
      try {
        const stored = localStorage.getItem("louis-chats-list");
        const list = stored ? JSON.parse(stored) : [];
        const existingIndex = list.findIndex((c: any) => c.id === chatId);
        const chatSummary = {
          id: chatId,
          title: trimmed ? trimmed.slice(0, 48) : "New Chat",
          lastMessage: trimmed,
          updatedAt: Date.now(),
          createdAt: existingIndex >= 0 ? list[existingIndex].createdAt : Date.now(),
        };
        if (existingIndex >= 0) list[existingIndex] = chatSummary;
        else list.unshift(chatSummary);
        localStorage.setItem("louis-chats-list", JSON.stringify(list));
        window.dispatchEvent(new Event("louis-chats-updated"));
      } catch (e) {
        console.error("failed to update local chats list", e);
      }

      if (useFirestore) {
        try {
          const userRef = doc(collection(db, "messages"));
          const assistantRef = doc(collection(db, "messages"));
          userRowId = userRef.id;
          assistantRowId = assistantRef.id;

          void Promise.all([
            setDoc(
              doc(db, "chats", chatId),
              {
                user_id: uid,
                title: trimmed ? trimmed.slice(0, 48) : "New Chat",
                last_message: trimmed,
                updated_at: serverTimestamp(),
              },
              { merge: true },
            ),
            setDoc(userRef, {
              chat_id: chatId,
              role: "user",
              content: trimmed,
              attachments,
              timestamp: serverTimestamp(),
            }),
            setDoc(assistantRef, {
              chat_id: chatId,
              role: "assistant",
              content: "",
              attachments: [],
              timestamp: serverTimestamp(),
            }),
          ]).catch((err) => {
            console.warn("Firestore persistence deferred or failed", err);
          });
        } catch (err) {
          console.warn("Firestore setup failed, using local storage", err);
          useFirestore = false;
        }
      }

      setGenerating(true);
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      let buffer = "";
      pendingBufferRef.current = "";
      localRef.current = [{ id: assistantRowId, role: "assistant", content: "", timestamp: Date.now() + 1, streaming: true }];
      setLocalTick((t) => t + 1);

      const historyPayload = messagesRef.current.map((m) => ({ role: m.role, content: m.content }));

      try {
        await streamAiReply(
          {
            firebase_uid: uid || "local-user",
            chat_uuid: chatId,
            message: trimmed,
            chatInput: trimmed,
            sessionId: chatId,
            history: historyPayload,
            image_url: attachments[0]?.url,
          },
          {
            signal: ctrl.signal,
            onToken: (chunk) => {
              buffer += chunk;
              pendingBufferRef.current = buffer;
              if (streamFrameRef.current === null) {
                streamFrameRef.current = requestAnimationFrame(() => {
                  localRef.current = [
                    {
                      id: assistantRowId,
                      role: "assistant",
                      content: pendingBufferRef.current,
                      timestamp: Date.now() + 1,
                      streaming: true,
                    },
                  ];
                  streamFrameRef.current = null;
                  setLocalTick((t) => t + 1);
                });
              }
            },
          },
        );
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          const errMsg = e?.message || "Failed to reach Louis Smart AI service. Please try again.";
          buffer = buffer ? `${buffer}\n\n_(${errMsg})_` : errMsg;
        }
      } finally {
        const finalContent = buffer.trim() || (ctrl.signal.aborted ? "*(Response stopped)*" : "I'm sorry, I couldn't generate a response. Please try again.");

        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.id === assistantRowId || m.id === assistantMsgId
              ? { ...m, id: assistantRowId, content: finalContent, streaming: false }
              : m
          );
          try {
            localStorage.setItem(`louis-chat-${chatId}`, JSON.stringify(updated));
          } catch {
            // ignore
          }
          return updated;
        });

        try {
          const stored = localStorage.getItem("louis-chats-list");
          const list = stored ? JSON.parse(stored) : [];
          const existingIndex = list.findIndex((c: any) => c.id === chatId);
          if (existingIndex >= 0) {
            list[existingIndex].lastMessage = finalContent.slice(0, 120);
            list[existingIndex].updatedAt = Date.now();
            localStorage.setItem("louis-chats-list", JSON.stringify(list));
            window.dispatchEvent(new Event("louis-chats-updated"));
          }
        } catch (e) {
          console.error("failed to update local chats list summary", e);
        }

        if (useFirestore) {
          void Promise.all([
            updateDoc(doc(db, "messages", assistantRowId), { content: finalContent }),
            updateDoc(doc(db, "chats", chatId), {
              last_message: finalContent.slice(0, 120),
              updated_at: serverTimestamp(),
            }),
          ]).catch((err) => console.error("Failed to persist Firestore response", err));
        }

        localRef.current = [];
        if (streamFrameRef.current !== null) {
          cancelAnimationFrame(streamFrameRef.current);
          streamFrameRef.current = null;
        }
        setLocalTick((t) => t + 1);
        setGenerating(false);
        abortRef.current = null;
      }
    },
    [uid, chatId, uploadImage],
  );

  const stopGenerating = useCallback(() => {
    abortRef.current?.abort();
    setGenerating(false);
  }, []);

  const merged: ChatMessage[] = (() => {
    if (localRef.current.length === 0) return messages;
    const byId = new Map(messages.map((m) => [m.id, m] as const));
    for (const l of localRef.current) byId.set(l.id, l);
    return Array.from(byId.values()).sort((a, b) => a.timestamp - b.timestamp);
  })();

  return { messages: merged, loading, sendMessage, generating, stopGenerating };
}
