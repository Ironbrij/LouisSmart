import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { ArrowRight, BarChart3, CalendarDays, PenLine } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthCard } from "@/components/auth/AuthCard";
import { LouisLogo } from "@/components/brand/Logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Louis Smart" },
      { name: "description", content: "Sign in to Louis Smart." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    if (user) navigate({ to: "/app" });
  }, [user, navigate]);

  return (
    <main className="min-h-[100dvh] w-full bg-background text-foreground lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
      <section className="relative hidden min-h-[100dvh] overflow-hidden border-r border-border/60 bg-[linear-gradient(145deg,#f8faff_0%,#ffffff_55%,#f1f4ff_100%)] px-10 py-10 lg:flex lg:flex-col xl:px-16">
        <div className="relative z-10"><LouisLogo size={30} /></div>
        <div className="relative z-10 my-auto max-w-2xl py-16">
          <h1 className="max-w-xl text-5xl font-semibold leading-[1.05] tracking-tight xl:text-7xl">
            Turn one idea into a <span className="text-primary">smarter strategy.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground xl:text-lg">
            Louis Smart helps you plan, write, and organize better content without losing your own voice.
          </p>
          <div className="mt-10 grid max-w-xl grid-cols-2 gap-3">
            <Feature icon={<PenLine />} title="AI copywriter" text="Hooks, captions, and campaigns that sound like you." />
            <Feature icon={<CalendarDays />} title="Content planning" text="Turn scattered ideas into a clear publishing rhythm." />
            <Feature icon={<BarChart3 />} title="Growth direction" text="Spot practical next steps for your audience." />
            <Feature icon={<ArrowRight />} title="Less busywork" text="Move from blank page to useful draft faster." />
          </div>
        </div>
        <div className="relative z-10 flex items-end justify-between text-xs text-muted-foreground">
          <span>Built for people with something to say.</span>
        </div>
        <div aria-hidden className="absolute -bottom-40 -right-24 h-[480px] w-[480px] rounded-full bg-primary/10 blur-3xl" />
      </section>

      <section className="flex min-h-[100dvh] items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden"><LouisLogo size={30} /></div>
        <AuthCard onSuccess={() => navigate({ to: "/app" })} />
        </div>
      </section>
    </main>
  );
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-white/70 p-4 shadow-sm backdrop-blur-sm">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary [&>svg]:h-4 [&>svg]:w-4">{icon}</div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}