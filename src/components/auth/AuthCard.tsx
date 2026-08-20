import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function AuthCard({ onSuccess }: { onSuccess: () => void }) {
  const { signIn, signUp, signInGoogle, resetPassword, ready } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) {
      toast.error("Firebase isn't configured yet. Set the VITE_FIREBASE_* env vars.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signin") await signIn(email, password);
      else await signUp(email, password, name);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (!ready) {
      toast.error("Firebase isn't configured yet.");
      return;
    }
    setLoading(true);
    try {
      await signInGoogle();
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Google sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!email) return toast.error("Enter your email first");
    try {
      await resetPassword(email);
      toast.success("Password reset email sent");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full rounded-[28px] border border-border/70 bg-card p-7 shadow-[0_24px_70px_-28px_rgba(15,23,42,0.28)] sm:p-9"
    >
      <div className="flex flex-col items-center text-center">
        <h1 className="text-[28px] font-semibold tracking-tight">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin" ? "Login to continue using Louis Smart" : "Sign up to get started"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {mode === "signup" && (
          <label className="block space-y-1.5 text-left text-xs font-medium text-foreground">
            Full name
            <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-xl" />
          </label>
        )}
        <label className="block space-y-1.5 text-left text-xs font-medium text-foreground">
          Email address
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input required type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl pl-10" />
          </div>
        </label>
        <label className="block space-y-1.5 text-left text-xs font-medium text-foreground">
          Password
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input required type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl pl-10" />
          </div>
        </label>

        {mode === "signin" && (
          <div className="flex justify-end">
            <button type="button" onClick={handleReset} className="text-xs text-muted-foreground hover:text-primary transition">
              Forgot password?
            </button>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-xl text-sm font-semibold"
          style={{ background: "var(--gradient-primary)", color: "var(--color-primary-foreground)" }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "signin" ? "Login" : "Create account"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button variant="outline" onClick={handleGoogle} disabled={loading} className="h-12 w-full rounded-xl gap-2">
        <GoogleIcon /> Continue with Google
      </Button>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        {mode === "signin" ? "New here?" : "Have an account?"}{" "}
        <button
          type="button"
          className="text-primary font-medium hover:underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </motion.div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}