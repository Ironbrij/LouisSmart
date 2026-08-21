import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createThread,
  deleteAllThreads,
  deleteThread,
  listThreads,
  updateThread,
} from "@/lib/chat-store";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ChatSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useAuth();
  const uid = user?.uid ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams({ strict: false }) as { threadId?: string };
  const [search, setSearch] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const threadsQuery = useQuery({
    queryKey: ["threads", uid],
    queryFn: () => listThreads(uid),
    enabled: Boolean(uid),
  });

  const threads = useMemo(() => {
    const list = threadsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    return q ? list.filter((t) => t.title.toLowerCase().includes(q)) : list;
  }, [threadsQuery.data, search]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["threads", uid] });

  const newChat = useMutation({
    mutationFn: () => createThread(uid),
    onSuccess: async (thread) => {
      await invalidate();
      onNavigate?.();
      void navigate({ to: "/chat/$threadId", params: { threadId: thread.id } });
    },
  });

  const rename = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => updateThread(uid, id, { title }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteThread(uid, id),
    onSuccess: async (_data, id) => {
      await invalidate();
      if (params.threadId === id) void navigate({ to: "/chat" });
    },
  });

  const removeAll = useMutation({
    mutationFn: () => deleteAllThreads(uid),
    onSuccess: async () => {
      await invalidate();
      toast.success("All chats deleted");
      void navigate({ to: "/chat" });
    },
  });

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="p-3">
        <button
          type="button"
          onClick={() => newChat.mutate()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft"
        >
          <Plus className="size-4" /> New chat
        </button>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats"
            className="h-9 rounded-xl border-border/70 bg-card pl-9 text-sm"
          />
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {threadsQuery.isLoading && (
          <p className="px-3 py-4 text-xs text-muted-foreground">Loading chats…</p>
        )}
        {!threadsQuery.isLoading && threads.length === 0 && (
          <p className="px-3 py-4 text-xs text-muted-foreground">No chats yet.</p>
        )}
        <ul className="space-y-1">
          {threads.map((thread) => {
            const active = params.threadId === thread.id;
            return (
              <li
                key={thread.id}
                className={`group flex items-center gap-1 rounded-xl px-1 transition-colors ${
                  active ? "bg-accent" : "hover:bg-accent/60"
                }`}
              >
                {renamingId === thread.id ? (
                  <form
                    className="flex-1 py-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const title = draftTitle.trim();
                      if (title) rename.mutate({ id: thread.id, title });
                      setRenamingId(null);
                    }}
                  >
                    <Input
                      autoFocus
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      onBlur={() => setRenamingId(null)}
                      className="h-8 rounded-lg text-sm"
                    />
                  </form>
                ) : (
                  <>
                    <Link
                      to="/chat/$threadId"
                      params={{ threadId: thread.id }}
                      onClick={() => onNavigate?.()}
                      className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2.5 text-sm"
                    >
                      <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{thread.title}</span>
                    </Link>
                    <button
                      type="button"
                      aria-label="Rename chat"
                      onClick={() => {
                        setRenamingId(thread.id);
                        setDraftTitle(thread.title);
                      }}
                      className="hidden size-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:text-foreground group-hover:grid"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete chat"
                      onClick={() => remove.mutate(thread.id)}
                      className="hidden size-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:text-destructive group-hover:grid"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-2 border-t border-sidebar-border p-3">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
            >
              <Trash2 className="size-3.5" /> Delete all chats
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete all chats?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes every conversation and its messages.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => removeAll.mutate()}>Delete all</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex items-center gap-2 rounded-xl px-2 py-1.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">
            {(user?.displayName ?? user?.email ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{user?.displayName ?? "You"}</p>
            <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            void signOut().then(() => navigate({ to: "/", replace: true }));
          }}
          className="w-full rounded-xl px-2 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
