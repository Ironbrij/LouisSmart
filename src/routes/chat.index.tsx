import { createFileRoute } from "@tanstack/react-router";
import { ChatWindow } from "@/components/chat/chat-window";

export const Route = createFileRoute("/chat/")({
  ssr: false,
  component: NewChatPage,
});

function NewChatPage() {
  return <ChatWindow threadId={null} />;
}
