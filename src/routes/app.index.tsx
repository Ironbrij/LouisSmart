import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useChats } from "@/hooks/useChats";
import { useMessages } from "@/hooks/useMessages";
import { EmptyState } from "@/components/chat/EmptyState";
import { Composer } from "@/components/chat/Composer";

export function AppIndexPage() {
  const navigate = useNavigate();
  const { createChat } = useChats();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInitialSend = async (messageText: string) => {
    if (!messageText.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);

      // 1. Create new chat session in storage/database
      const newChat = await createChat(messageText.slice(0, 30));
      
      if (!newChat || !newChat.id) {
        throw new Error("Could not initialize chat session.");
      }

      // 2. Navigate to the dynamic route for this new chat
      await navigate({
        to: "/app/$chatId",
        params: { chatId: newChat.id },
        search: { initialMessage: messageText },
      });
    } catch (error) {
      console.error("Failed to start chat from main screen:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto px-4">
      <div className="flex-1 overflow-y-auto">
        <EmptyState
          onSelectPrompt={handleInitialSend}
          isLoading={isSubmitting}
        />
      </div>
      <div className="pb-6">
        <Composer
          onSend={handleInitialSend}
          disabled={isSubmitting}
          placeholder="Ask Louis Smart anything or pick a quick command..."
        />
      </div>
    </div>
  );
}

export default AppIndexPage;
