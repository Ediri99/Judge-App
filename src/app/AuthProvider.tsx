import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const DEFAULT_ROLE: UserRole = 'judge';

export type UserRole = 'judge' | 'admin';

interface UserProfile {
  uid: string;
  email: string;
  roles: UserRole[];
  createdAt?: string;
  updatedAt?: string;
}

interface AuthContextValue {
  user: User | null;
  roles: UserRole[];
  loading: boolean;
  signIn: (email: string, password: string, role: UserRole) => Promise<void>;
  signUp: (email: string, password: string, role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function createInitialProfile(uid: string, email: string, role: UserRole): UserProfile {
  const roles: UserRole[] = role === 'admin' ? ['judge', 'admin'] : [DEFAULT_ROLE];

  return {
    uid,
    email,
    roles,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function ensureProfile(uid: string, email: string, role: UserRole) {
  const profileRef = doc(db, 'users', uid);
  const snapshot = await getDoc(profileRef);

  if (!snapshot.exists()) {
    await setDoc(profileRef, createInitialProfile(uid, email, role));
    return;
  }

  const nextRoles: UserRole[] = role === 'admin' ? ['judge', 'admin'] : [DEFAULT_ROLE];
  await setDoc(profileRef, { email, roles: nextRoles, updatedAt: new Date().toISOString() }, { merge: true });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        setRoles([]);
        setLoading(false);
        return;
      }

      const profileRef = doc(db, 'users', firebaseUser.uid);
      const snapshot = await getDoc(profileRef);

      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<UserProfile>;
        setRoles((data.roles as UserRole[]) ?? []);
      } else {
        setRoles([]);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string, role: UserRole) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await ensureProfile(result.user.uid, result.user.email ?? email, role);
    const profileRef = doc(db, 'users', result.user.uid);
    const snapshot = await getDoc(profileRef);
    const data = snapshot.data() as Partial<UserProfile> | undefined;
    setRoles((data?.roles as UserRole[]) ?? []);
  };

  const signUp = async (email: string, password: string, role: UserRole) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await ensureProfile(result.user.uid, result.user.email ?? email, role);
    const profileRef = doc(db, 'users', result.user.uid);
    const snapshot = await getDoc(profileRef);
    const data = snapshot.data() as Partial<UserProfile> | undefined;
    setRoles((data?.roles as UserRole[]) ?? []);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setRoles([]);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      roles,
      loading,
      signIn,
      signUp,
      signOut,
    }),
    [loading, roles, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
