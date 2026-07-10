import { useEffect, useState, useCallback } from "react";
import { supabase, supabaseReady } from "@/lib/supabase";
import type { ChatSummary } from "@/lib/types";

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

  const fromRow = (row: any): ChatSummary => ({
    id: row.id,
    title: row.title || "New Chat",
    lastMessage: row.last_message || "",
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
  });

  useEffect(() => {
    const handleUpdate = () => loadLocally();

    if (!uid || !supabaseReady || uid === "mock-uid-123") {
      loadLocally();
      window.addEventListener("louis-chats-updated", handleUpdate);
      return () => window.removeEventListener("louis-chats-updated", handleUpdate);
    }

    let cancelled = false;

    const fetchInitial = async () => {
      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .eq("user_id", uid)
        .order("updated_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        console.warn("Supabase chats fetch failed, using local storage fallback", error);
        loadLocally();
        window.addEventListener("louis-chats-updated", handleUpdate);
        return;
      }
      setChats((data || []).map(fromRow));
      setLoading(false);
    };

    fetchInitial();

    const channel = supabase
      .channel(`chats-${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chats", filter: `user_id=eq.${uid}` },
        () => {
          // Simplest correct approach: re-fetch on any change rather than
          // hand-patching local state from the payload.
          fetchInitial();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      window.removeEventListener("louis-chats-updated", handleUpdate);
    };
  }, [uid, loadLocally]);

  const renameChat = useCallback(
    async (chatId: string, title: string) => {
      if (!uid || !supabaseReady || uid === "mock-uid-123") {
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
      const { error } = await supabase
        .from("chats")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", chatId);
      if (error) console.error("Supabase rename failed", error);
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

      if (uid && supabaseReady && uid !== "mock-uid-123") {
        // messages cascade-delete via the FK constraint (ON DELETE CASCADE)
        const { error } = await supabase.from("chats").delete().eq("id", chatId);
        if (error) console.error("Supabase delete failed", error);
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

    if (uid && supabaseReady && uid !== "mock-uid-123") {
      const { error } = await supabase.from("chats").delete().eq("user_id", uid);
      if (error) console.error("Supabase delete all failed", error);
    }
  }, [uid]);

  const ensureChat = useCallback(
    async (chatId: string, title?: string) => {
      if (!uid || !supabaseReady || uid === "mock-uid-123") {
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
      const { error } = await supabase.from("chats").upsert(
        {
          id: chatId,
          user_id: uid,
          title: title || "New Chat",
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
      if (error) console.error("Supabase ensureChat failed", error);
    },
    [uid],
  );

  return { chats, loading, renameChat, deleteChat, deleteAllChats, ensureChat };
}
