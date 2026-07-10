import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthCard } from "@/components/auth/AuthCard";
import { FloatingBubbleText } from "@/components/auth/FloatingBubbleText";

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
    if (user) navigate({ to: "/app" });
  }, [user, navigate]);

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden louis-grid-bg">
      {/* interactive floating bubble tags */}
      <FloatingBubbleText />

      {/* floating blurred lights */}
      <div
        aria-hidden
        className="absolute -top-40 -left-32 w-[500px] h-[500px] rounded-full blur-3xl opacity-40 pointer-events-none"
        style={{ background: "var(--gradient-primary)" }}
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -right-32 w-[600px] h-[600px] rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ background: "var(--gradient-primary)" }}
      />

      <div className="relative z-10 w-full flex items-center justify-center px-4">
        <AuthCard onSuccess={() => navigate({ to: "/app" })} />
      </div>
    </div>
  );
}