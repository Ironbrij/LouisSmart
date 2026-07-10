import { useEffect, useState, useCallback, useRef } from "react";
import { v4 as uuid } from "uuid";
import { supabase, supabaseReady } from "@/lib/supabase";
import type { ChatMessage } from "@/lib/types";
import { streamAiReply } from "@/lib/webhook";

export function useMessages(uid: string | undefined, chatId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const localRef = useRef<ChatMessage[]>([]);
  const [localTick, setLocalTick] = useState(0);

  const fromRow = (row: any): ChatMessage => ({
    id: row.id,
    role: row.role,
    content: row.content,
    attachments: row.attachments || [],
    timestamp: row.timestamp ? new Date(row.timestamp).getTime() : Date.now(),
  });

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

    if (!uid || !supabaseReady) {
      loadLocally();
      return;
    }

    let cancelled = false;

    const fetchInitial = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("timestamp", { ascending: true });

      if (cancelled) return;
      if (error) {
        console.warn("Supabase messages fetch failed, using local storage fallback", error);
        loadLocally();
        return;
      }
      setMessages((data || []).map(fromRow));
      setLoading(false);
    };

    fetchInitial();

    const channel = supabase
      .channel(`messages-${chatId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        () => fetchInitial(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [uid, chatId]);

  const uploadImage = useCallback(
    async (file: File): Promise<{ url: string; type: string; name: string }> => {
      if (!uid || !chatId) throw new Error("Not ready");
      const id = uuid();
      const path = `${uid}/${chatId}/${id}-${file.name}`;
      const { error } = await supabase.storage.from("chat-uploads").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("chat-uploads").getPublicUrl(path);
      return { url: data.publicUrl, type: file.type, name: file.name };
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
          if (uid && supabaseReady) {
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

      let useSupabase = Boolean(uid && supabaseReady && uid !== "mock-uid-123");
      let assistantRowId: string = assistantMsgId;

      if (useSupabase) {
        try {
          await supabase.from("chats").upsert(
            {
              id: chatId,
              user_id: uid,
              title: trimmed ? trimmed.slice(0, 48) : "New Chat",
              last_message: trimmed,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" },
          );

          await supabase.from("messages").insert({
            chat_id: chatId,
            role: "user",
            content: trimmed,
            attachments,
          });

          const { data: assistantRow, error: assistantErr } = await supabase
            .from("messages")
            .insert({ chat_id: chatId, role: "assistant", content: "" })
            .select()
            .single();
          if (assistantErr) throw assistantErr;
          assistantRowId = assistantRow.id;
        } catch (err) {
          console.warn("Supabase write failed, falling back to local storage", err);
          useSupabase = false;
        }
      }

      if (!useSupabase) {
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
              localRef.current = [{ id: assistantRowId, role: "assistant", content: buffer, timestamp: Date.now(), streaming: true }];
              setLocalTick((t) => t + 1);
            },
          },
        );
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          buffer += `\n\n_Error: ${e.message || "failed to reach webhook"}_`;
        }
      } finally {
        if (useSupabase) {
          try {
            await supabase.from("messages").update({ content: buffer }).eq("id", assistantRowId);
            await supabase
              .from("chats")
              .update({ last_message: buffer.slice(0, 120), updated_at: new Date().toISOString() })
              .eq("id", chatId);
          } catch (err) {
            console.error("Failed to update Supabase assistant message", err);
          }
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
