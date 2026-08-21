import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { firebaseConfigured } from "@/lib/firebase";

export type AppUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const LOCAL_KEY = "ls.localUser";

function readLocalUser(): AppUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as AppUser) : null;
  } catch {
    return null;
  }
}

function makeLocalUser(email: string, name?: string): AppUser {
  return {
    uid: `local-${btoa(email.toLowerCase()).replace(/[^a-zA-Z0-9]/g, "")}`,
    email,
    displayName: name ?? email.split("@")[0] ?? "You",
    photoURL: null,
  };
}

async function fbAuth() {
  const [auth, { getFirebaseAuth }] = await Promise.all([
    import("firebase/auth"),
    import("@/lib/firebase"),
  ]);
  return { ...auth, instance: getFirebaseAuth() };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    if (!firebaseConfigured) {
      setUser(readLocalUser());
      setLoading(false);
      return;
    }
    let active = true;
    void fbAuth().then((f) => {
      if (!active) return;
      unsub = f.onAuthStateChanged(f.instance, (u) => {
        setUser(
          u
            ? {
                uid: u.uid,
                email: u.email,
                displayName: u.displayName,
                photoURL: u.photoURL,
              }
            : null,
        );
        setLoading(false);
      });
    });
    return () => {
      active = false;
      unsub?.();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async signIn(email, password) {
        if (!firebaseConfigured) {
          const local = makeLocalUser(email);
          window.localStorage.setItem(LOCAL_KEY, JSON.stringify(local));
          setUser(local);
          return;
        }
        const f = await fbAuth();
        await f.signInWithEmailAndPassword(f.instance, email, password);
      },
      async signUp(email, password, name) {
        if (!firebaseConfigured) {
          const local = makeLocalUser(email, name);
          window.localStorage.setItem(LOCAL_KEY, JSON.stringify(local));
          setUser(local);
          return;
        }
        const f = await fbAuth();
        const cred = await f.createUserWithEmailAndPassword(f.instance, email, password);
        if (name) await f.updateProfile(cred.user, { displayName: name });
      },
      async signInWithGoogle() {
        if (!firebaseConfigured) {
          throw new Error("Google sign-in needs Firebase configuration.");
        }
        const f = await fbAuth();
        await f.signInWithPopup(f.instance, new f.GoogleAuthProvider());
      },
      async resetPassword(email) {
        if (!firebaseConfigured) {
          throw new Error("Password reset needs Firebase configuration.");
        }
        const f = await fbAuth();
        await f.sendPasswordResetEmail(f.instance, email);
      },
      async signOut() {
        if (!firebaseConfigured) {
          window.localStorage.removeItem(LOCAL_KEY);
          setUser(null);
          return;
        }
        const f = await fbAuth();
        await f.signOut(f.instance);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
