import { LogOut, PanelLeft } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export function ChatHeader({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border/70 bg-background/80 px-3 py-3 backdrop-blur-sm sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label="Toggle chat history"
          onClick={onToggleSidebar}
          className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <PanelLeft className="size-5" />
        </button>
        <span className="truncate text-base font-bold sm:text-lg">Louis Smart</span>
        <span className="shrink-0 rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold tracking-wide text-accent-foreground">
          AI
        </span>
        <span className="ml-1 hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
          <span className="size-1.5 rounded-full bg-emerald-500" /> Online
        </span>
      </div>

      <button
        type="button"
        onClick={() => {
          void signOut().then(() => navigate({ to: "/", replace: true }));
        }}
        className="flex shrink-0 items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <LogOut className="size-4" />
        <span className="hidden sm:inline">Logout</span>
      </button>
    </header>
  );
}
