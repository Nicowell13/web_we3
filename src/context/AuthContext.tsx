'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  idToken: string | null;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          // Force fresh token to avoid 401 on first login (client clock/refresh race)
          const token = await u.getIdToken(true);
          setIdToken(token);
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/sync`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            const txt = await res.text();
            console.error('[AuthContext] /api/auth/sync failed', res.status, txt);
          }
        } catch (e: any) {
          console.error('[AuthContext] sync error', e?.message ?? e);
        }
      } else {
        setIdToken(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setIdToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut, idToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
