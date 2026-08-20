import { useEffect, useState, type ReactNode } from "react";
import { LogOut, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "@tanstack/react-router";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LouisLogo } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/badge";

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div className="flex h-[100dvh] min-h-0 w-full overflow-hidden bg-background">
      {!isMobile && <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/60 px-3 sm:gap-3 sm:px-4">
          {isMobile && (
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button className="p-2 rounded-lg hover:bg-muted">
                  <Menu className="w-5 h-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[280px]">
                <Sidebar collapsed={false} onToggle={() => {}} onClose={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
          )}
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-semibold">{title || "Louis Smart"}</span>
            <Badge variant="secondary" className="text-[10px]">AI</Badge>
          </div>
          <div className="ml-auto" />
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/auth" });
            }}
            className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs text-muted-foreground transition hover:bg-muted hover:text-destructive"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
          {isMobile && <LouisLogo size={22} />}
        </header>
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  );
}