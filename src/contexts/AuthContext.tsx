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

const LOCAL_USER_KEY = "louis_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getLocalUser = (): AppUser | null => {
      try {
        const stored = localStorage.getItem(LOCAL_USER_KEY);
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    };

    if (!firebaseReady) {
      const local = getLocalUser();
      setUser(local);
      setLoading(false);
      return;
    }

    let settled = false;
    const settle = (firebaseUser: FirebaseUser | null) => {
      if (settled) return;
      settled = true;
      if (firebaseUser) {
        const appUser = toAppUser(firebaseUser);
        setUser(appUser);
        try {
          if (appUser) localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(appUser));
        } catch {
          // ignore
        }
      } else {
        const local = getLocalUser();
        setUser(local);
      }
      setLoading(false);
    };

    const unsubscribe = onAuthStateChanged(auth, settle, () => settle(null));
    const timeout = window.setTimeout(() => settle(null), 2500);
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
      if (firebaseReady) {
        try {
          const credential = await signInWithEmailAndPassword(auth, email, password);
          const appUser = toAppUser(credential.user);
          setUser(appUser);
          if (appUser) localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(appUser));
          return;
        } catch (e: any) {
          // If Firebase rejects or fails to connect, fallback to local user if not configured
          if (e?.code === "auth/invalid-api-key" || e?.code === "auth/network-request-failed") {
            console.warn("Firebase sign in failed, using local user fallback", e);
          } else {
            throw e;
          }
        }
      }
      const localUser: AppUser = {
        id: "user-" + (email.split("@")[0] || "guest").replace(/[^a-zA-Z0-9]/g, ""),
        email,
        user_metadata: {
          full_name: email.split("@")[0],
          avatar_url: null,
        },
      };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(localUser));
      setUser(localUser);
    },
    async signUp(email, password, name) {
      if (firebaseReady) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          if (name) {
            await updateProfile(cred.user, { displayName: name });
          }
          const appUser = toAppUser(cred.user);
          setUser(appUser);
          if (appUser) localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(appUser));
          return;
        } catch (e: any) {
          if (e?.code === "auth/invalid-api-key" || e?.code === "auth/network-request-failed") {
            console.warn("Firebase sign up failed, using local user fallback", e);
          } else {
            throw e;
          }
        }
      }
      const localUser: AppUser = {
        id: "user-" + (name ? name.toLowerCase().replace(/[^a-zA-Z0-9]/g, "-") : email.split("@")[0]),
        email,
        user_metadata: {
          full_name: name || email.split("@")[0],
          avatar_url: null,
        },
      };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(localUser));
      setUser(localUser);
    },
    async signInGoogle() {
      if (firebaseReady) {
        try {
          const credential = await signInWithPopup(auth, new GoogleAuthProvider());
          const appUser = toAppUser(credential.user);
          setUser(appUser);
          if (appUser) localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(appUser));
          return;
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
      }
      // Local Google fallback
      const localUser: AppUser = {
        id: "google-user-123",
        email: "user@gmail.com",
        user_metadata: {
          full_name: "Google User",
          avatar_url: null,
        },
      };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(localUser));
      setUser(localUser);
    },
    async resetPassword(email) {
      if (firebaseReady) {
        await sendPasswordResetEmail(auth, email);
      }
    },
    async signOut() {
      if (firebaseReady) {
        try {
          await firebaseSignOut(auth);
        } catch {
          // ignore
        }
      }
      try {
        localStorage.removeItem(LOCAL_USER_KEY);
      } catch {
        // ignore
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


