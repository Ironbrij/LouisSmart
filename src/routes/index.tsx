import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { LouisLogo } from "@/components/brand/Logo";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-background px-6">
        <LouisLogo size={34} />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing your workspace...
        </div>
      </div>
    );
  }
  return <Navigate to={user ? "/app" : "/auth"} />;
}
