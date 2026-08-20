import { useEffect, useState, useCallback, useRef } from "react";
import { v4 as uuid } from "uuid";
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const localRef = useRef<ChatMessage[]>([]);
  const streamFrameRef = useRef<number | null>(null);
  const pendingBufferRef = useRef("");
  const [localTick, setLocalTick] = useState(0);

  const fromDoc = (d: QueryDocumentSnapshot<DocumentData>): ChatMessage => {
    const data = d.data();
    return {
      id: d.id,
      role: data.role,
      content: data.content,
      attachments: data.attachments || [],
      timestamp: toMillis(data.timestamp),
    };
  };

  useEffect(() => {
    localRef.current = [];
    setMessages([]);
    if (!chatId) return;

    const loadLocally = () => {
      try {
        const stored = localStorage.getItem(`louis-chat-${chatId}`);
        setMessages(stored ? JSON.parse(stored) : []);
      } catch (e) {
        console.error("Local storage load failed", e);
      }
      setLoading(false);
    };

    if (!uid || !firebaseReady) {
      loadLocally();
      return;
    }

    setLoading(true);
    const q = query(collection(db, "messages"), where("chat_id", "==", chatId), orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setMessages(snap.docs.map(fromDoc));
        setLoading(false);
      },
      (error) => {
        console.warn("Firestore messages subscription failed, using local storage fallback", error);
        loadLocally();
      },
    );

    return () => unsubscribe();
  }, [uid, chatId]);

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
          if (uid && firebaseReady) {
            const up = await uploadImage(image);
            attachments = [up];
          } else {
            attachments = [{ url: URL.createObjectURL(image), type: image.type, name: image.name }];
          }
        } catch (e) {
          console.error("upload failed", e);
        }
      }

      const userMsgId = uuid();
      const userMsg: ChatMessage = { id: userMsgId, role: "user", content: trimmed, attachments, timestamp: Date.now() };
      const assistantMsgId = uuid();
      const assistantMsg: ChatMessage = { id: assistantMsgId, role: "assistant", content: "", timestamp: Date.now() };

      let useFirestore = Boolean(uid && firebaseReady && uid !== MOCK_UID);
      let userRowId = userMsgId;
      let assistantRowId: string = assistantMsgId;

      if (useFirestore) {
        try {
          await setDoc(
            doc(db, "chats", chatId),
            {
              user_id: uid,
              title: trimmed ? trimmed.slice(0, 48) : "New Chat",
              last_message: trimmed,
              updated_at: serverTimestamp(),
            },
            { merge: true },
          );

          const userRef = await addDoc(collection(db, "messages"), {
            chat_id: chatId,
            role: "user",
            content: trimmed,
            attachments,
            timestamp: serverTimestamp(),
          });
          userRowId = userRef.id;

          const assistantRef = await addDoc(collection(db, "messages"), {
            chat_id: chatId,
            role: "assistant",
            content: "",
            attachments: [],
            timestamp: serverTimestamp(),
          });
          assistantRowId = assistantRef.id;

          setMessages((prev) => {
            const byId = new Map(prev.map((message) => [message.id, message] as const));
            byId.set(userRowId, { ...userMsg, id: userRowId });
            byId.set(assistantRowId, { ...assistantMsg, id: assistantRowId, streaming: true });
            return Array.from(byId.values()).sort((a, b) => a.timestamp - b.timestamp);
          });
        } catch (err) {
          console.warn("Firestore write failed, falling back to local storage", err);
          useFirestore = false;
        }
      }

      if (!useFirestore) {
        setMessages((prev) => {
          const updated = [...prev, userMsg];
          localStorage.setItem(`louis-chat-${chatId}`, JSON.stringify(updated));
          return updated;
        });
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
      }

      setGenerating(true);
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      let buffer = "";
      localRef.current = [{ id: assistantRowId, role: "assistant", content: "", timestamp: Date.now(), streaming: true }];
      setLocalTick((t) => t + 1);

      try {
        await streamAiReply(
          {
            firebase_uid: uid || "local-user",
            chat_uuid: chatId,
            message: trimmed,
            chatInput: trimmed,
            sessionId: chatId,
            history: messages.map((m) => ({ role: m.role, content: m.content })),
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
                      timestamp: Date.now(),
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
          buffer += `\n\n_Error: ${e.message || "failed to reach webhook"}_`;
        }
      } finally {
        if (useFirestore) {
          // Render and unlock the composer before network persistence completes.
          setMessages((prev) => {
            const updated = prev.some((message) => message.id === assistantRowId)
              ? prev.map((message) =>
                  message.id === assistantRowId ? { ...message, content: buffer } : message,
                )
              : [...prev, { ...assistantMsg, id: assistantRowId, content: buffer }];
            return updated.sort((a, b) => a.timestamp - b.timestamp);
          });

          void Promise.all([
            updateDoc(doc(db, "messages", assistantRowId), { content: buffer }),
            updateDoc(doc(db, "chats", chatId), {
              last_message: buffer.slice(0, 120),
              updated_at: serverTimestamp(),
            }),
          ]).catch((err) => console.error("Failed to persist Firestore response", err));
        } else {
          const finalAssistantMsg: ChatMessage = { ...assistantMsg, content: buffer, timestamp: Date.now() };
          setMessages((prev) => {
            const updated = [...prev, finalAssistantMsg];
            localStorage.setItem(`louis-chat-${chatId}`, JSON.stringify(updated));
            return updated;
          });
          try {
            const stored = localStorage.getItem("louis-chats-list");
            const list = stored ? JSON.parse(stored) : [];
            const existingIndex = list.findIndex((c: any) => c.id === chatId);
            if (existingIndex >= 0) {
              list[existingIndex].lastMessage = buffer.slice(0, 120);
              list[existingIndex].updatedAt = Date.now();
              localStorage.setItem("louis-chats-list", JSON.stringify(list));
              window.dispatchEvent(new Event("louis-chats-updated"));
            }
          } catch (e) {
            console.error("failed to update local chats list summary", e);
          }
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
    [uid, chatId, uploadImage, messages],
  );

  const stopGenerating = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const merged: ChatMessage[] = (() => {
    if (localRef.current.length === 0) return messages;
    const byId = new Map(messages.map((m) => [m.id, m] as const));
    for (const l of localRef.current) byId.set(l.id, l);
    return Array.from(byId.values()).sort((a, b) => a.timestamp - b.timestamp);
  })();

  void localTick;

  return { messages: merged, loading, sendMessage, generating, stopGenerating };
}
