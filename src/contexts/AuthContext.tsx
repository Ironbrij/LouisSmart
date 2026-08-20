import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth, firebaseReady } from "@/lib/firebase";

/**
 * Normalized user shape. The rest of the app (Sidebar, routes) was built
 * against Supabase's User object (`id`, `user_metadata.{full_name,avatar_url}`),
 * so we map Firebase's `uid`/`displayName`/`photoURL` onto that same shape
 * here rather than touching every call site.
 */
export interface AppUser {
  id: string;
  email: string | null;
  user_metadata: {
    full_name?: string | null;
    avatar_url?: string | null;
  };
}

function toAppUser(u: FirebaseUser | null): AppUser | null {
  if (!u) return null;
  return {
    id: u.uid,
    email: u.email,
    user_metadata: {
      full_name: u.displayName,
      avatar_url: u.photoURL,
    },
  };
}

interface AuthContextValue {
  user: AppUser | null;
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
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseReady) {
      setLoading(false);
      return;
    }

    let settled = false;
    const settle = (firebaseUser: FirebaseUser | null) => {
      if (settled) return;
      settled = true;
      setUser(toAppUser(firebaseUser));
      setLoading(false);
    };

    const unsubscribe = onAuthStateChanged(auth, settle, () => settle(null));
    const timeout = window.setTimeout(() => settle(null), 3000);
    void getRedirectResult(auth)
      .then((credential) => {
        if (credential?.user) settle(credential.user);
      })
      .catch((error) => console.error("Google sign-in redirect failed", error));

    return () => {
      window.clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    ready: firebaseReady,
    async signIn(email, password) {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      setUser(toAppUser(credential.user));
    },
    async signUp(email, password, name) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) {
        await updateProfile(cred.user, { displayName: name });
      }
      setUser(toAppUser(cred.user));
    },
    async signInGoogle() {
      if (!firebaseReady) {
        throw new Error("Google Sign-In requires Firebase to be configured with VITE_FIREBASE_* environment variables.");
      }
      try {
        const credential = await signInWithPopup(auth, new GoogleAuthProvider());
        setUser(toAppUser(credential.user));
      } catch (error: any) {
        const fallbackCodes = new Set([
          "auth/popup-blocked",
          "auth/popup-closed-by-user",
          "auth/cancelled-popup-request",
          "auth/internal-error",
        ]);
        if (fallbackCodes.has(error?.code)) {
          await signInWithRedirect(auth, new GoogleAuthProvider());
          return;
        }
        throw error;
      }
    },
    async resetPassword(email) {
      if (firebaseReady) {
        await sendPasswordResetEmail(auth, email);
      }
    },
    async signOut() {
      if (firebaseReady) {
        await firebaseSignOut(auth);
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

