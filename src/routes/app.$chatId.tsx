import React, { useEffect } from "react";
import { useParams, useSearch } from "@tanstack/react-router";
import { useMessages } from "@/hooks/useMessages";
import { MessageList } from "@/components/chat/MessageList";
import { Composer } from "@/components/chat/Composer";

export function ChatDetailPage() {
  const { chatId } = useParams({ from: "/app/$chatId" });
  const search = useSearch({ from: "/app/$chatId" }) as { initialMessage?: string };
  
  const { messages, isLoading, sendMessage } = useMessages(chatId);

  // Trigger initial message if coming from the root suggestion cards
  useEffect(() => {
    if (search?.initialMessage && messages.length === 0 && !isLoading) {
      sendMessage(search.initialMessage).catch((err) => {
        console.error("Error sending initial prompt message:", err);
      });
    }
  }, [search?.initialMessage, chatId]);

  const handleSendMessage = async (text: string, files?: File[]) => {
    try {
      await sendMessage(text, files);
    } catch (err) {
      console.error("Failed to send message to webhook:", err);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto px-4">
      <div className="flex-1 overflow-y-auto py-4">
        <MessageList messages={messages} isLoading={isLoading} />
      </div>
      <div className="pb-6">
        <Composer
          onSend={handleSendMessage}
          disabled={isLoading}
          placeholder="Type your message to Louis Smart..."
        />
      </div>
    </div>
  );
}

export default ChatDetailPage;
