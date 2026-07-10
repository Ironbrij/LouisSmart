import { useEffect, useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LouisLogo } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/badge";

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
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
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {!isMobile && <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border/60 flex items-center gap-3 px-4 shrink-0">
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
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{title || "Louis Smart"}</span>
            <Badge variant="secondary" className="text-[10px]">AI</Badge>
          </div>
          <div className="ml-auto" />
          {isMobile && <LouisLogo size={22} />}
        </header>
        <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  );
}