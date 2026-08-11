import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { v4 as uuid } from "uuid";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/chat/EmptyState";
import { MessageList } from "@/components/chat/MessageList";
import { Composer } from "@/components/chat/Composer";
import { useMessages } from "@/hooks/useMessages";

interface ChatSearch {
  initial?: string;
}

export const Route = createFileRoute("/app/$chatId")({
  validateSearch: (s: Record<string, unknown>): ChatSearch => ({
    initial: typeof s.initial === "string" ? s.initial : undefined,
  }),
  component: ChatPage,
});

function ChatPage() {
  const { user } = useAuth();
  const { chatId } = Route.useParams();
  const { initial } = useSearch({ from: "/app/$chatId" });
  const navigate = useNavigate();
  const { messages, sendMessage, generating, stopGenerating } = useMessages(user?.id, chatId);
  const [seed, setSeed] = useState<string | undefined>();
  const sentRef = useRef<string | null>(null);

  // If we arrived with an initial message, auto-send it once
  useEffect(() => {
    if (!initial || !chatId) return;

    // Build a unique key so we only send once per chatId+initial combo
    const key = `${chatId}::${initial}`;
    if (sentRef.current === key) return;
    sentRef.current = key;

    sendMessage(initial, null);
    // Strip the ?initial= search param so a refresh won't re-send
    navigate({ to: "/app/$chatId", params: { chatId }, search: {}, replace: true });
  }, [initial, chatId, sendMessage, navigate]);

  return (
    <AppShell>
      {messages.length === 0 && !generating ? (
        <EmptyState onPick={(t) => sendMessage(t, null)} />
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <MessageList messages={messages} />
        </div>
      )}
      <Composer
        onSend={(text, image) => sendMessage(text, image)}
        onStop={stopGenerating}
        generating={generating}
        seed={seed}
      />
    </AppShell>
  );
}
