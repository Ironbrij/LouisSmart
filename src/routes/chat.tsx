import { useEffect, useState } from "react";
import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatHeader } from "@/components/chat/chat-header";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/chat")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Chat — Louis Smart" },
      {
        name: "description",
        content:
          "Plan, write, and organize better content with Louis Smart, your AI content strategist.",
      },
      { property: "og:title", content: "Chat — Louis Smart" },
      {
        property: "og:description",
        content: "Your AI content strategist for hooks, captions, and campaigns.",
      },
    ],
  }),
  component: ChatLayout,
});

function ChatLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/", replace: true });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <aside
        className={`hidden shrink-0 border-r border-sidebar-border transition-[width] duration-200 md:block ${
          desktopOpen ? "w-72" : "w-0 overflow-hidden"
        }`}
      >
        <ChatSidebar />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[85vw] max-w-80 p-0">
          <SheetTitle className="sr-only">Chat history</SheetTitle>
          <ChatSidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <ChatHeader
          onToggleSidebar={() => {
            if (window.matchMedia("(min-width: 768px)").matches) {
              setDesktopOpen((v) => !v);
            } else {
              setMobileOpen(true);
            }
          }}
        />
        <Outlet />
      </div>
    </div>
  );
}
