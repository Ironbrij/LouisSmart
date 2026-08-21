import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { EmptyState } from "./empty-state";
import { Composer } from "./composer";
import { MessageBubble, TypingIndicator } from "./message-bubble";
import { useAuth } from "@/hooks/use-auth";
import { addMessage, createThread, listMessages, updateThread } from "@/lib/chat-store";
import { sendToAssistant } from "@/lib/n8n";
import { newId, titleFromText, type Attachment, type ChatMessage } from "@/lib/chat-types";

/** Carries the first message from /chat into the freshly created thread route. */
let pendingMessage: { text: string; attachments: Attachment[] } | null = null;

export function ChatWindow({ threadId }: { threadId: string | null }) {
  const { user } = useAuth();
  const uid = user?.uid ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [streaming, setStreaming] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<ChatMessage | null>(null);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useQuery({
    queryKey: ["messages", uid, threadId],
    queryFn: () => listMessages(uid, threadId!),
    enabled: Boolean(uid && threadId),
  });

  const messages = messagesQuery.data ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, pendingUser, streaming !== null]);

  const run = useCallback(
    async (activeThreadId: string, text: string, attachments: Attachment[]) => {
      const userMessage: ChatMessage = {
        id: newId(),
        role: "user",
        content: text,
        createdAt: Date.now(),
        ...(attachments.length ? { attachments } : {}),
      };
      setPendingUser(userMessage);
      setBusy(true);
      setStreaming("");

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await addMessage(uid, activeThreadId, userMessage);
        const history = (
          (await queryClient.getQueryData<ChatMessage[]>(["messages", uid, activeThreadId])) ?? []
        ).map((m) => ({ role: m.role, content: m.content }));

        let acc = "";
        for await (const chunk of sendToAssistant(
          {
            threadId: activeThreadId,
            userId: uid,
            message: text,
            ...(attachments.length ? { attachments } : {}),
            history,
          },
          controller.signal,
        )) {
          acc += chunk;
          setStreaming(acc);
        }

        if (acc.trim()) {
          await addMessage(uid, activeThreadId, {
            id: newId(),
            role: "assistant",
            content: acc.trim(),
            createdAt: Date.now(),
          });
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          toast.error((error as Error).message || "Louis Smart could not respond.");
        }
      } finally {
        abortRef.current = null;
        setBusy(false);
        setStreaming(null);
        setPendingUser(null);
        await queryClient.invalidateQueries({
          queryKey: ["messages", uid, activeThreadId],
        });
        await queryClient.invalidateQueries({ queryKey: ["threads", uid] });
      }
    },
    [queryClient, uid],
  );

  // A message typed on /chat starts a new thread, then replays here.
  useEffect(() => {
    if (!threadId || !pendingMessage) return;
    const next = pendingMessage;
    pendingMessage = null;
    void run(threadId, next.text, next.attachments);
  }, [threadId, run]);

  const handleSend = useCallback(
    async (text: string, attachments: Attachment[]) => {
      if (!uid) return;
      if (!threadId) {
        pendingMessage = { text, attachments };
        const thread = await createThread(uid, titleFromText(text));
        await queryClient.invalidateQueries({ queryKey: ["threads", uid] });
        void navigate({ to: "/chat/$threadId", params: { threadId: thread.id } });
        return;
      }
      if (messages.length === 0) {
        void updateThread(uid, threadId, { title: titleFromText(text) });
      }
      void run(threadId, text, attachments);
    },
    [messages.length, navigate, queryClient, run, threadId, uid],
  );

  const isEmpty = !threadId || (messages.length === 0 && !pendingUser && streaming === null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isEmpty ? (
          <EmptyState onPick={(text) => void handleSend(text, [])} />
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-3 py-6 sm:px-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {pendingUser && !messages.some((m) => m.id === pendingUser.id) && (
              <MessageBubble message={pendingUser} />
            )}
            {streaming !== null &&
              (streaming.length === 0 ? (
                <TypingIndicator />
              ) : (
                <MessageBubble
                  streaming
                  message={{
                    id: "streaming",
                    role: "assistant",
                    content: streaming,
                    createdAt: Date.now(),
                  }}
                />
              ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <Composer
        busy={busy}
        autoFocusKey={threadId ?? "new"}
        draftKey={uid ? `${uid}.${threadId ?? "new"}` : undefined}
        onSend={(text, attachments) => void handleSend(text, attachments)}
        onStop={() => abortRef.current?.abort()}
      />
    </div>
  );
}
