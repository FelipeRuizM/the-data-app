import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { OWNER_UID } from '../config/constants';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  /** The uid whose data should be read (owner's own uid, or OWNER_UID for guests). */
  dataUid: string | null;
  /** Only the authenticated owner may write to the database. */
  canWrite: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  enterGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setIsGuest(false); // a real sign-in supersedes guest mode
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    setIsGuest(false);
    await firebaseSignOut(auth);
  };

  const enterGuestMode = () => setIsGuest(true);

  const dataUid = user?.uid ?? (isGuest ? OWNER_UID : null);
  const canWrite = !!user;

  return (
    <AuthContext.Provider
      value={{ user, loading, isGuest, dataUid, canWrite, signIn, signOut, enterGuestMode }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
