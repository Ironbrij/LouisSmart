import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, BarChart3, CalendarDays, Lock, Mail, PenLine, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import mascot from "@/assets/louis-mascot.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Louis Smart — Turn one idea into a smarter strategy" },
      {
        name: "description",
        content:
          "Louis Smart helps you plan, write, and organize better content without losing your own voice.",
      },
      { property: "og:title", content: "Louis Smart — AI content strategist" },
      {
        property: "og:description",
        content: "Plan, write, and organize better content without losing your own voice.",
      },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "reset";

const FEATURES = [
  {
    icon: PenLine,
    title: "AI copywriter",
    body: "Hooks, captions, and campaigns that sound like you.",
  },
  {
    icon: CalendarDays,
    title: "Content planning",
    body: "Turn scattered ideas into a clear publishing rhythm.",
  },
  {
    icon: BarChart3,
    title: "Growth direction",
    body: "Spot practical next steps for your audience.",
  },
  {
    icon: ArrowRight,
    title: "Less busywork",
    body: "Move from blank page to useful draft faster.",
  },
];

function AuthPage() {
  const { user, loading, signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/chat", replace: true });
  }, [loading, user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") await signIn(email, password);
      else if (mode === "signup") await signUp(email, password, name);
      else {
        await resetPassword(email);
        toast.success("Password reset link sent. Check your inbox.");
        setMode("signin");
      }
    } catch (error) {
      toast.error((error as Error).message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const heading =
    mode === "signin"
      ? "Welcome back"
      : mode === "signup"
        ? "Create your account"
        : "Reset password";
  const sub =
    mode === "signin"
      ? "Login to continue using Louis Smart"
      : mode === "signup"
        ? "Start planning smarter content today"
        : "We'll email you a secure reset link";

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-border/70 p-10 lg:flex xl:p-14">
        <div className="pointer-events-none absolute inset-0 bg-aura opacity-70" />
        <div className="relative flex items-center gap-3">
          <img src={mascot} alt="" width={768} height={1024} className="size-9 object-contain" />
          <span className="text-lg font-bold">Louis Smart</span>
        </div>

        <div className="relative max-w-xl">
          <h1 className="text-5xl leading-[1.05] font-extrabold tracking-tight xl:text-6xl">
            Turn one idea into{" "}
            <span className="font-display italic text-primary">a smarter strategy.</span>
          </h1>
          <p className="mt-5 text-base text-muted-foreground">
            Louis Smart helps you plan, write, and organize better content without losing your own
            voice.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-soft"
              >
                <div className="grid size-9 place-items-center rounded-xl bg-accent text-primary">
                  <f.icon className="size-4" />
                </div>
                <h2 className="mt-3 text-sm font-bold">{f.title}</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs font-semibold text-muted-foreground">
          Built for people with something to say.
        </p>
      </section>

      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md rounded-3xl border border-border/70 bg-card p-6 shadow-card sm:p-9">
          <div className="mb-6 flex items-center justify-center gap-2 lg:hidden">
            <img src={mascot} alt="" width={768} height={1024} className="size-8 object-contain" />
            <span className="font-bold">Louis Smart</span>
          </div>

          <h2 className="text-center text-2xl font-bold">{heading}</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">{sub}</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Your name</Label>
                <div className="relative">
                  <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Louis"
                    className="h-11 rounded-xl pl-9"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="h-11 rounded-xl pl-9"
                />
              </div>
            </div>

            {mode !== "reset" && (
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-11 rounded-xl pl-9"
                  />
                </div>
              </div>
            )}

            {mode === "signin" && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMode("reset")}
                  className="text-xs font-medium text-muted-foreground hover:text-primary"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="h-11 w-full rounded-xl bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-soft transition-opacity disabled:opacity-60"
            >
              {busy
                ? "Please wait…"
                : mode === "signin"
                  ? "Login"
                  : mode === "signup"
                    ? "Create account"
                    : "Send reset link"}
            </button>
          </form>

          {mode !== "reset" && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or{" "}
                <span className="h-px flex-1 bg-border" />
              </div>
              <button
                type="button"
                onClick={() => {
                  void signInWithGoogle().catch((error: Error) =>
                    toast.error(error.message || "Google sign-in failed."),
                  );
                }}
                className="h-11 w-full rounded-xl border border-border bg-background text-sm font-semibold transition-colors hover:bg-accent"
              >
                Continue with Google
              </button>
            </>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                New here?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-semibold text-primary hover:underline"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="font-semibold text-primary hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </section>
    </main>
  );
}
