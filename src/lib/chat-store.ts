import { firebaseConfigured } from "./firebase";
import { newId, type ChatMessage, type ChatThread } from "./chat-types";

/**
 * Chat persistence. Firestore when Firebase config is present
 * (users/{uid}/threads/{threadId}/messages/{messageId}), otherwise the
 * same shape in localStorage so the UI stays usable offline.
 */

const THREADS_KEY = (uid: string) => `ls.threads.${uid}`;
const MESSAGES_KEY = (uid: string, tid: string) => `ls.messages.${uid}.${tid}`;
let useLocalFallback = false;

function canUseFirestore() {
  return firebaseConfigured && !useLocalFallback;
}

function fallBackToLocal(error: unknown) {
  useLocalFallback = true;
  console.warn("Firestore is unavailable; using local chat storage.", error);
}

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota — ignore */
  }
}

async function fs() {
  const [firestore, { getDb }] = await Promise.all([
    import("firebase/firestore"),
    import("./firebase"),
  ]);
  return { ...firestore, db: getDb() };
}

export async function listThreads(uid: string): Promise<ChatThread[]> {
  if (canUseFirestore()) {
    try {
      const f = await fs();
      const snap = await f.getDocs(
        f.query(f.collection(f.db, "users", uid, "threads"), f.orderBy("updatedAt", "desc")),
      );
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChatThread, "id">) }));
    } catch (error) {
      fallBackToLocal(error);
    }
  }
  return readLocal<ChatThread[]>(THREADS_KEY(uid), []).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function createThread(uid: string, title = "New chat"): Promise<ChatThread> {
  const thread: ChatThread = {
    id: newId(),
    title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  if (canUseFirestore()) {
    try {
      const f = await fs();
      const { id, ...rest } = thread;
      await f.setDoc(f.doc(f.db, "users", uid, "threads", id), rest);
      return thread;
    } catch (error) {
      fallBackToLocal(error);
    }
  }
  const all = readLocal<ChatThread[]>(THREADS_KEY(uid), []);
  writeLocal(THREADS_KEY(uid), [thread, ...all]);
  return thread;
}

export async function updateThread(
  uid: string,
  threadId: string,
  patch: Partial<Pick<ChatThread, "title" | "updatedAt">>,
): Promise<void> {
  if (canUseFirestore()) {
    try {
      const f = await fs();
      await f.updateDoc(f.doc(f.db, "users", uid, "threads", threadId), patch);
      return;
    } catch (error) {
      fallBackToLocal(error);
    }
  }
  const all = readLocal<ChatThread[]>(THREADS_KEY(uid), []);
  writeLocal(
    THREADS_KEY(uid),
    all.map((t) => (t.id === threadId ? { ...t, ...patch } : t)),
  );
}

export async function deleteThread(uid: string, threadId: string): Promise<void> {
  if (firebaseConfigured) {
    const f = await fs();
    const msgs = await f.getDocs(f.collection(f.db, "users", uid, "threads", threadId, "messages"));
    await Promise.all(msgs.docs.map((d) => f.deleteDoc(d.ref)));
    await f.deleteDoc(f.doc(f.db, "users", uid, "threads", threadId));
    return;
  }
  const all = readLocal<ChatThread[]>(THREADS_KEY(uid), []);
  writeLocal(
    THREADS_KEY(uid),
    all.filter((t) => t.id !== threadId),
  );
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(MESSAGES_KEY(uid, threadId));
  }
}

export async function deleteAllThreads(uid: string): Promise<void> {
  const threads = await listThreads(uid);
  for (const t of threads) await deleteThread(uid, t.id);
}

export async function listMessages(uid: string, threadId: string): Promise<ChatMessage[]> {
  if (canUseFirestore()) {
    try {
      const f = await fs();
      const snap = await f.getDocs(
        f.query(
          f.collection(f.db, "users", uid, "threads", threadId, "messages"),
          f.orderBy("createdAt", "asc"),
        ),
      );
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChatMessage, "id">) }));
    } catch (error) {
      fallBackToLocal(error);
    }
  }
  return readLocal<ChatMessage[]>(MESSAGES_KEY(uid, threadId), []);
}

export async function addMessage(
  uid: string,
  threadId: string,
  message: ChatMessage,
): Promise<void> {
  if (canUseFirestore()) {
    try {
      const f = await fs();
      const { id, ...rest } = message;
      await f.setDoc(f.doc(f.db, "users", uid, "threads", threadId, "messages", id), rest);
    } catch (error) {
      fallBackToLocal(error);
    }
  }
  if (!canUseFirestore()) {
    const all = readLocal<ChatMessage[]>(MESSAGES_KEY(uid, threadId), []);
    writeLocal(MESSAGES_KEY(uid, threadId), [...all, message]);
  }
  await updateThread(uid, threadId, { updatedAt: Date.now() });
}
