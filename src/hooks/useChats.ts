import { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db, firebaseReady } from "@/lib/firebase";
import type { ChatSummary } from "@/lib/types";

export function useChats(uid: string | undefined) {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLocally = useCallback(() => {
    try {
      const stored = localStorage.getItem("louis-chats-list");
      if (stored) {
        setChats(JSON.parse(stored));
      } else {
        setChats([]);
      }
    } catch (e) {
      console.error("failed to load local chats list", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      loadLocally();
    };

    if (!uid || !firebaseReady || uid === "mock-uid-123") {
      loadLocally();
      window.addEventListener("louis-chats-updated", handleUpdate);
      return () => {
        window.removeEventListener("louis-chats-updated", handleUpdate);
      };
    }

    let settled = false;
    // Safety net: if Firestore is silently blocked (ad blocker / tracking
    // prevention swallows the request without an error callback), don't
    // hang forever — fall back to local storage after a few seconds.
    const timeout = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        console.warn("Firestore chats listener timed out, using local storage fallback");
        loadLocally();
        window.addEventListener("louis-chats-updated", handleUpdate);
      }
    }, 5000);

    const q = query(collection(db, "users", uid, "chats"), orderBy("updatedAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        settled = true;
        window.clearTimeout(timeout);
        const list: ChatSummary[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            title: data.title || "New Chat",
            lastMessage: data.lastMessage || "",
            createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
            updatedAt: data.updatedAt?.toMillis?.() ?? Date.now(),
          };
        });
        setChats(list);
        setLoading(false);
      },
      (err) => {
        settled = true;
        window.clearTimeout(timeout);
        console.warn("Firestore chats listener failed, using local storage fallback", err);
        loadLocally();
        window.addEventListener("louis-chats-updated", handleUpdate);
      },
    );

    return () => {
      window.clearTimeout(timeout);
      unsub();
      window.removeEventListener("louis-chats-updated", handleUpdate);
    };
  }, [uid, loadLocally]);

  const renameChat = useCallback(
    async (chatId: string, title: string) => {
      if (!uid || !firebaseReady || uid === "mock-uid-123") {
        try {
          const stored = localStorage.getItem("louis-chats-list");
          if (stored) {
            let list = JSON.parse(stored);
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
        await updateDoc(doc(db, "users", uid, "chats", chatId), { title, updatedAt: serverTimestamp() });
      } catch (err) {
        console.error("Firestore rename failed", err);
      }
    },
    [uid],
  );

  const deleteChat = useCallback(
    async (chatId: string) => {
      // 1. Always delete from local storage
      try {
        const stored = localStorage.getItem("louis-chats-list");
        if (stored) {
          let list = JSON.parse(stored);
          const filtered = list.filter((c: any) => c.id !== chatId);
          localStorage.setItem("louis-chats-list", JSON.stringify(filtered));
        }
        localStorage.removeItem(`louis-chat-${chatId}`);
        window.dispatchEvent(new Event("louis-chats-updated"));
      } catch (e) {
        console.error("failed to local delete", e);
      }

      // 2. If firebase is active and not mock, also attempt to delete from Firestore
      if (uid && firebaseReady && uid !== "mock-uid-123") {
        try {
          const msgs = await getDocs(collection(db, "users", uid, "chats", chatId, "messages"));
          const batch = writeBatch(db);
          msgs.forEach((m) => batch.delete(m.ref));
          batch.delete(doc(db, "users", uid, "chats", chatId));
          await batch.commit();
        } catch (err) {
          console.error("Firestore delete failed", err);
        }
      }
    },
    [uid],
  );

  const deleteAllChats = useCallback(async () => {
    // 1. Always delete all from local storage
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

    // 2. If firebase is active and not mock, also attempt to delete from Firestore
    if (uid && firebaseReady && uid !== "mock-uid-123") {
      try {
        const snap = await getDocs(collection(db, "users", uid, "chats"));
        for (const c of snap.docs) {
          const msgs = await getDocs(collection(db, "users", uid, "chats", c.id, "messages"));
          const batch = writeBatch(db);
          msgs.forEach((m) => batch.delete(m.ref));
          batch.delete(c.ref);
          await batch.commit();
        }
      } catch (err) {
        console.error("Firestore delete all failed", err);
      }
    }
  }, [uid]);

  const ensureChat = useCallback(
    async (chatId: string, title?: string) => {
      if (!uid || !firebaseReady || uid === "mock-uid-123") {
        try {
          const stored = localStorage.getItem("louis-chats-list");
          let list = stored ? JSON.parse(stored) : [];
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
        await setDoc(
          doc(db, "users", uid, "chats", chatId),
          {
            title: title || "New Chat",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      } catch (err) {
        console.error("Firestore ensureChat failed", err);
      }
    },
    [uid],
  );

  return { chats, loading, renameChat, deleteChat, deleteAllChats, ensureChat };
}
