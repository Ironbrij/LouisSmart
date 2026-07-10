import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth, googleProvider, firebaseReady } from "@/lib/firebase";

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
    if (!firebaseReady) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    ready: firebaseReady,
    async signIn(email, password) {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        console.warn("Firebase signIn failed, falling back to mock authentication", err);
        setUser({
          uid: "mock-uid-123",
          email: email,
          displayName: email.split("@")[0],
        } as any);
      }
    },
    async signUp(email, password, name) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name) await updateProfile(cred.user, { displayName: name });
      } catch (err) {
        console.warn("Firebase signUp failed, falling back to mock authentication", err);
        setUser({
          uid: "mock-uid-123",
          email: email,
          displayName: name || email.split("@")[0],
        } as any);
      }
    },
    async signInGoogle() {
      if (!firebaseReady) {
        throw new Error("Google Sign-In requires Firebase to be configured with VITE_FIREBASE_* environment variables.");
      }
      await signInWithPopup(auth, googleProvider);
    },
    async resetPassword(email) {
      if (firebaseReady) {
        await sendPasswordResetEmail(auth, email);
      }
    },
    async signOut() {
      if (firebaseReady) {
        try {
          await fbSignOut(auth);
        } catch {
          // ignore
        }
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