import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, supabaseReady } from "@/lib/supabase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseReady) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    ready: supabaseReady,
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signUp(email, password, name) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: name ? { data: { display_name: name } } : undefined,
      });
      if (error) throw error;
    },
    async signInGoogle() {
      if (!supabaseReady) {
        throw new Error("Google Sign-In requires Supabase to be configured with VITE_SUPABASE_* environment variables.");
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/app" },
      });
      if (error) throw error;
    },
    async resetPassword(email) {
      if (supabaseReady) {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
      }
    },
    async signOut() {
      if (supabaseReady) {
        await supabase.auth.signOut();
      }
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
