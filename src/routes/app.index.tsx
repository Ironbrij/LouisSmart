import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { v4 as uuid } from "uuid";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/chat/EmptyState";
import { Composer } from "@/components/chat/Composer";

export const Route = createFileRoute("/app/")({
  component: AppHome,
});

function AppHome() {
  const navigate = useNavigate();

  function handleSend(text: string, image: File | null) {
    const id = uuid();
    // Navigate to chat and stash the initial message via URL search state
    navigate({
      to: "/app/$chatId",
      params: { chatId: id },
      search: { initial: text } as any,
    });
    // image is dropped for the very first send from home; user can re-attach in the chat.
    void image;
  }

  return (
    <AppShell>
      <EmptyState
        onPick={(text) => {
          const id = uuid();
          navigate({ to: "/app/$chatId", params: { chatId: id }, search: { initial: text } as any });
        }}
      />
      <Composer onSend={handleSend} onStop={() => {}} generating={false} />
    </AppShell>
  );
}
