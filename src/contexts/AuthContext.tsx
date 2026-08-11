import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
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

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(toAppUser(firebaseUser));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    ready: firebaseReady,
    async signIn(email, password) {
      await signInWithEmailAndPassword(auth, email, password);
    },
    async signUp(email, password, name) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) {
        await updateProfile(cred.user, { displayName: name });
      }
    },
    async signInGoogle() {
      if (!firebaseReady) {
        throw new Error("Google Sign-In requires Firebase to be configured with VITE_FIREBASE_* environment variables.");
      }
      await signInWithPopup(auth, new GoogleAuthProvider());
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
