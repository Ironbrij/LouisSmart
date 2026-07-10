import { useEffect, useState, useCallback, useRef } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref as sref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuid } from "uuid";
import { db, storage, firebaseReady } from "@/lib/firebase";
import type { ChatMessage } from "@/lib/types";
import { streamAiReply } from "@/lib/webhook";

export function useMessages(uid: string | undefined, chatId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  // Optimistic local messages (before Firestore round-trip / while streaming)
  const localRef = useRef<ChatMessage[]>([]);
  const [localTick, setLocalTick] = useState(0);

  useEffect(() => {
    localRef.current = [];
    setMessages([]);
    if (!chatId) return;

    const loadLocally = () => {
      try {
        const stored = localStorage.getItem(`louis-chat-${chatId}`);
        if (stored) {
          setMessages(JSON.parse(stored));
        } else {
          setMessages([]);
        }
      } catch (e) {
        console.error("Local storage load failed", e);
      }
      setLoading(false);
    };

    if (!uid || !firebaseReady) {
      loadLocally();
      return;
    }

    let settled = false;
    // Safety net: if Firestore is silently blocked (ad blocker / tracking
    // prevention swallows the request without an error callback), don't
    // hang forever — fall back to local storage after a few seconds.
    const timeout = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        console.warn("Firestore messages listener timed out, using local storage fallback");
        loadLocally();
      }
    }, 5000);

    const q = query(collection(db, "users", uid, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        settled = true;
        window.clearTimeout(timeout);
        const list: ChatMessage[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            role: data.role,
            content: data.content,
            attachments: data.attachments || [],
            timestamp: data.timestamp?.toMillis?.() ?? Date.now(),
          };
        });
        setMessages(list);
        setLoading(false);
      },
      (err) => {
        settled = true;
        window.clearTimeout(timeout);
        console.warn("Firestore listener failed, using local storage fallback", err);
        loadLocally();
      },
    );
    return () => {
      window.clearTimeout(timeout);
      unsub();
    };
  }, [uid, chatId]);

  const uploadImage = useCallback(
    async (file: File): Promise<{ url: string; type: string; name: string }> => {
      if (!uid || !chatId) throw new Error("Not ready");
      const id = uuid();
      const r = sref(storage, `users/${uid}/chats/${chatId}/${id}-${file.name}`);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
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

      // Generate local messages for tracking
      const userMsgId = uuid();
      const userMsg: ChatMessage = {
        id: userMsgId,
        role: "user",
        content: trimmed,
        attachments,
        timestamp: Date.now(),
      };

      const assistantMsgId = uuid();
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };

      let useFirestore = Boolean(uid && firebaseReady && uid !== "mock-uid-123");
      let assistantDocRef: any = null;
      let chatDocRef: any = null;

      if (useFirestore) {
        try {
          chatDocRef = doc(db, "users", uid!, "chats", chatId);
          await setDoc(
            chatDocRef,
            {
              title: trimmed ? trimmed.slice(0, 48) : "New Chat",
              lastMessage: trimmed,
              updatedAt: serverTimestamp(),
              createdAt: serverTimestamp(),
            },
            { merge: true },
          );

          await addDoc(collection(chatDocRef, "messages"), {
            role: "user",
            content: trimmed,
            attachments,
            timestamp: serverTimestamp(),
          });

          assistantDocRef = await addDoc(collection(chatDocRef, "messages"), {
            role: "assistant",
            content: "",
            timestamp: serverTimestamp(),
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

        // Also update chats list summary in localStorage!
        try {
          const stored = localStorage.getItem("louis-chats-list");
          let list = stored ? JSON.parse(stored) : [];
          const existingIndex = list.findIndex((c: any) => c.id === chatId);
          const chatSummary = {
            id: chatId,
            title: trimmed ? trimmed.slice(0, 48) : "New Chat",
            lastMessage: trimmed,
            updatedAt: Date.now(),
            createdAt: existingIndex >= 0 ? list[existingIndex].createdAt : Date.now(),
          };
          if (existingIndex >= 0) {
            list[existingIndex] = chatSummary;
          } else {
            list.unshift(chatSummary);
          }
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
      const targetAssistantId = useFirestore ? assistantDocRef.id : assistantMsgId;
      localRef.current = [{ id: targetAssistantId, role: "assistant", content: "", timestamp: Date.now(), streaming: true }];
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
              localRef.current = [{ id: targetAssistantId, role: "assistant", content: buffer, timestamp: Date.now(), streaming: true }];
              setLocalTick((t) => t + 1);
            },
          },
        );
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          buffer += `\n\n_Error: ${e.message || "failed to reach webhook"}_`;
        }
      } finally {
        if (useFirestore) {
          try {
            await updateDoc(assistantDocRef, { content: buffer, timestamp: serverTimestamp() });
            await setDoc(chatDocRef, { lastMessage: buffer.slice(0, 120), updatedAt: serverTimestamp() }, { merge: true });
          } catch (err) {
            console.error("Failed to update Firestore assistant message", err);
          }
        } else {
          const finalAssistantMsg: ChatMessage = {
            ...assistantMsg,
            content: buffer,
            timestamp: Date.now(),
          };
          setMessages((prev) => {
            const updated = [...prev, finalAssistantMsg];
            localStorage.setItem(`louis-chat-${chatId}`, JSON.stringify(updated));
            return updated;
          });

          // Also update chats list summary with the assistant response
          try {
            const stored = localStorage.getItem("louis-chats-list");
            let list = stored ? JSON.parse(stored) : [];
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
