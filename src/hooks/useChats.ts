import { useEffect, useState, useCallback } from "react";
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db, firebaseReady } from "@/lib/firebase";
import type { ChatSummary } from "@/lib/types";

const MOCK_UID = "mock-uid-123";

function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  return Date.now();
}

export function useChats(uid: string | undefined) {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLocally = useCallback(() => {
    try {
      const stored = localStorage.getItem("louis-chats-list");
      setChats(stored ? JSON.parse(stored) : []);
    } catch (e) {
      console.error("failed to load local chats list", e);
    }
    setLoading(false);
  }, []);

  const fromDoc = (d: QueryDocumentSnapshot<DocumentData>): ChatSummary => {
    const data = d.data();
    return {
      id: d.id,
      title: data.title || "New Chat",
      lastMessage: data.last_message || "",
      createdAt: toMillis(data.created_at),
      updatedAt: toMillis(data.updated_at),
    };
  };

  useEffect(() => {
    const handleUpdate = () => loadLocally();

    if (!uid || !firebaseReady || uid === MOCK_UID) {
      loadLocally();
      window.addEventListener("louis-chats-updated", handleUpdate);
      return () => window.removeEventListener("louis-chats-updated", handleUpdate);
    }

    setLoading(true);
    const q = query(collection(db, "chats"), where("user_id", "==", uid), orderBy("updated_at", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setChats(snap.docs.map(fromDoc));
        setLoading(false);
      },
      (error) => {
        console.warn("Firestore chats subscription failed, using local storage fallback", error);
        loadLocally();
        window.addEventListener("louis-chats-updated", handleUpdate);
      },
    );

    return () => {
      unsubscribe();
      window.removeEventListener("louis-chats-updated", handleUpdate);
    };
  }, [uid, loadLocally]);

  const renameChat = useCallback(
    async (chatId: string, title: string) => {
      if (!uid || !firebaseReady || uid === MOCK_UID) {
        try {
          const stored = localStorage.getItem("louis-chats-list");
          if (stored) {
            const list = JSON.parse(stored);
            const index = list.findIndex((c: any) => c.id === chatId);
            if (index >= 0) {
              list[index].title = title;
              list[index].updatedAt = Date.now();
              localStorage.setItem("louis-chats-list", JSON.stringify(list));
              window.dispatchEvent(new Event("louis-chats-updated"));
            }
          }
        } catch (e) {
          console.error("failed to local rename", e);
        }
        return;
      }
      try {
        await updateDoc(doc(db, "chats", chatId), { title, updated_at: serverTimestamp() });
      } catch (e) {
        console.error("Firestore rename failed", e);
      }
    },
    [uid],
  );

  const deleteChat = useCallback(
    async (chatId: string) => {
      try {
        const stored = localStorage.getItem("louis-chats-list");
        if (stored) {
          const list = JSON.parse(stored);
          const filtered = list.filter((c: any) => c.id !== chatId);
          localStorage.setItem("louis-chats-list", JSON.stringify(filtered));
        }
        localStorage.removeItem(`louis-chat-${chatId}`);
        window.dispatchEvent(new Event("louis-chats-updated"));
      } catch (e) {
        console.error("failed to local delete", e);
      }

      if (uid && firebaseReady && uid !== MOCK_UID) {
        try {
          // Firestore has no cascade delete — remove the chat's messages first.
          const msgsSnap = await getDocs(query(collection(db, "messages"), where("chat_id", "==", chatId)));
          await Promise.all(msgsSnap.docs.map((m) => deleteDoc(m.ref)));
          await deleteDoc(doc(db, "chats", chatId));
        } catch (e) {
          console.error("Firestore delete failed", e);
        }
      }
    },
    [uid],
  );

  const deleteAllChats = useCallback(async () => {
    try {
      const stored = localStorage.getItem("louis-chats-list");
      if (stored) {
        const list = JSON.parse(stored);
        list.forEach((c: any) => localStorage.removeItem(`louis-chat-${c.id}`));
      }
      localStorage.removeItem("louis-chats-list");
      window.dispatchEvent(new Event("louis-chats-updated"));
    } catch (e) {
      console.error("failed to local delete all", e);
    }

    if (uid && firebaseReady && uid !== MOCK_UID) {
      try {
        const chatsSnap = await getDocs(query(collection(db, "chats"), where("user_id", "==", uid)));
        for (const chatDoc of chatsSnap.docs) {
          const msgsSnap = await getDocs(query(collection(db, "messages"), where("chat_id", "==", chatDoc.id)));
          await Promise.all(msgsSnap.docs.map((m) => deleteDoc(m.ref)));
          await deleteDoc(chatDoc.ref);
        }
      } catch (e) {
        console.error("Firestore delete all failed", e);
      }
    }
  }, [uid]);

  const ensureChat = useCallback(
    async (chatId: string, title?: string) => {
      if (!uid || !firebaseReady || uid === MOCK_UID) {
        try {
          const stored = localStorage.getItem("louis-chats-list");
          const list = stored ? JSON.parse(stored) : [];
          const existing = list.find((c: any) => c.id === chatId);
          if (!existing) {
            list.unshift({
              id: chatId,
              title: title || "New Chat",
              lastMessage: "",
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
            localStorage.setItem("louis-chats-list", JSON.stringify(list));
            window.dispatchEvent(new Event("louis-chats-updated"));
          }
        } catch (e) {
          console.error("failed to local ensure chat", e);
        }
        return;
      }
      try {
        const ref = doc(db, "chats", chatId);
        const existing = await getDoc(ref);
        if (!existing.exists()) {
          await setDoc(ref, {
            user_id: uid,
            title: title || "New Chat",
            last_message: "",
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
          });
        }
      } catch (e) {
        console.error("Firestore ensureChat failed", e);
      }
    },
    [uid],
  );

  return { chats, loading, renameChat, deleteChat, deleteAllChats, ensureChat };
}
