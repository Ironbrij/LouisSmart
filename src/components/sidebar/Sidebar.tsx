import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { v4 as uuid } from "uuid";
import {
  PanelLeftClose,
  PanelLeft,
  Plus,
  Search,
  MessageSquare,
  Trash2,
  Pencil,
  LogOut,
  Trash,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useChats } from "@/hooks/useChats";
import { LouisLogo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  onClose?: () => void;
}

export function Sidebar({ collapsed, onToggle, onClose }: Props) {
  const { user, signOut } = useAuth();
  const { chats, renameChat, deleteChat, deleteAllChats } = useChats(user?.id);
  const [search, setSearch] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const activeId = (params as any).chatId as string | undefined;

  const filtered = chats.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));

  function handleNewChat() {
    const id = uuid();
    navigate({ to: "/app/$chatId", params: { chatId: id } });
    onClose?.();
  }

  const width = collapsed ? 72 : 280;

  return (
    <motion.aside
      initial={false}
      animate={{ width }}
      transition={{ type: "spring", stiffness: 220, damping: 28 }}
      className="h-full bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        {!collapsed && <LouisLogo size={28} />}
        <Button
          size="icon"
          variant="ghost"
          onClick={onToggle}
          className="rounded-lg h-9 w-9"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </Button>
      </div>

      {/* New chat */}
      <div className="px-3">
        <button
          onClick={handleNewChat}
          className={`w-full flex items-center ${collapsed ? "justify-center" : "gap-2 justify-start px-3"} h-11 rounded-xl text-sm font-medium text-white shadow-sm hover:opacity-95 active:scale-[0.98] transition`}
          style={{ background: "var(--gradient-primary)" }}
        >
          <Plus className="w-4 h-4" />
          {!collapsed && <span>New chat</span>}
        </button>
      </div>

      {!collapsed && (
        <div className="px-3 mt-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats"
              className="h-9 pl-9 rounded-lg bg-background/60"
            />
          </div>
        </div>
      )}

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin mt-3">
        {!collapsed && (
          <div className="px-4 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            Recent
          </div>
        )}
        <div className="space-y-0.5 px-2">
          <AnimatePresence>
            {filtered.map((chat) => {
              const isActive = chat.id === activeId;
              return (
                <motion.div
                  key={chat.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`group flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer transition ${
                    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60"
                  }`}
                  onClick={() => {
                    if (renameId === chat.id) return;
                    navigate({ to: "/app/$chatId", params: { chatId: chat.id } });
                    onClose?.();
                  }}
                >
                  <MessageSquare className="w-4 h-4 shrink-0 text-muted-foreground" />
                  {!collapsed && (
                    <>
                      {renameId === chat.id ? (
                        <Input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={async () => {
                            if (renameValue.trim()) await renameChat(chat.id, renameValue.trim());
                            setRenameId(null);
                          }}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              if (renameValue.trim()) await renameChat(chat.id, renameValue.trim());
                              setRenameId(null);
                            }
                          }}
                          className="h-7 text-sm"
                        />
                      ) : (
                        <span className="flex-1 truncate text-sm">{chat.title}</span>
                      )}
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameId(chat.id);
                            setRenameValue(chat.title);
                          }}
                          className="p-1 rounded hover:bg-background text-muted-foreground"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            await deleteChat(chat.id);
                            if (isActive) navigate({ to: "/app" });
                          }}
                          className="p-1 rounded hover:bg-background text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          {filtered.length === 0 && !collapsed && (
            <div className="text-center text-xs text-muted-foreground py-6">No chats yet</div>
          )}
        </div>
      </div>

      {!collapsed && chats.length > 0 && (
        <div className="px-3 pb-2">
          <button
            onClick={() => setConfirmDeleteAll(true)}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-lg border border-destructive/40 text-destructive text-xs hover:bg-destructive/10 transition"
          >
            <Trash className="w-3.5 h-3.5" /> Delete all chats
          </button>
        </div>
      )}

      {/* User section */}
      <div className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={`w-full flex items-center ${collapsed ? "justify-center" : "gap-2"} rounded-lg p-2 hover:bg-sidebar-accent/60 transition`}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0 overflow-hidden"
                style={{ background: "var(--gradient-primary)" }}
              >
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  (user?.user_metadata?.full_name || user?.email || "?").charAt(0).toUpperCase()
                )}
              </div>
              {!collapsed && (
                <div className="flex-1 text-left overflow-hidden">
                  <div className="text-sm font-medium truncate">{user?.user_metadata?.full_name || "User"}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{user?.email}</div>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuItem
              onClick={async () => {
                await signOut();
                navigate({ to: "/auth" });
              }}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmDeleteAll} onOpenChange={setConfirmDeleteAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all chats?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes every conversation. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await deleteAllChats();
                toast.success("All chats deleted");
                navigate({ to: "/app" });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.aside>
  );
}