import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { ref, onValue, set } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { useAuth } from './AuthContext';

interface FeaturedContextType {
  /** Exercise titles the owner has pinned to the top of the Records page, in display order. */
  featured: string[];
  loading: boolean;
  isFeatured: (title: string) => boolean;
  /** Pin an exercise (no-op if already featured). Owner only. */
  addFeatured: (title: string) => Promise<void>;
  /** Unpin an exercise. Owner only. */
  removeFeatured: (title: string) => Promise<void>;
  /** Toggle an exercise's featured state. Owner only. */
  toggleFeatured: (title: string) => Promise<void>;
  /** Move a featured exercise up/down in display order. Owner only. */
  moveFeatured: (title: string, dir: 'up' | 'down') => Promise<void>;
}

const FeaturedContext = createContext<FeaturedContextType | undefined>(undefined);

const PATH = (uid: string) => `/users/${uid}/settings/featuredExercises`;

/** Realtime DB returns an array (possibly sparse) or a keyed object — normalize to string[]. */
const normalize = (raw: unknown): string[] => {
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === 'string');
  if (raw && typeof raw === 'object') return Object.values(raw).filter((v): v is string => typeof v === 'string');
  return [];
};

export const FeaturedProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { dataUid, canWrite } = useAuth();
  const uid = dataUid;
  const [featured, setFeatured] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setFeatured([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = onValue(
      ref(realtimeDb, PATH(uid)),
      (snapshot) => {
        setFeatured(normalize(snapshot.val()));
        setLoading(false);
      },
      (error) => {
        console.error('[DB] Featured exercises listen failed:', error);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [uid]);

  // All writes replace the whole ordered list — the array is small (a handful of titles).
  const persist = useCallback(
    async (next: string[]) => {
      if (!uid || !canWrite) throw new Error('Not authenticated');
      await set(ref(realtimeDb, PATH(uid)), next);
    },
    [uid, canWrite],
  );

  const isFeatured = useCallback((title: string) => featured.includes(title), [featured]);

  const addFeatured = useCallback(
    async (title: string) => {
      if (featured.includes(title)) return;
      await persist([...featured, title]);
    },
    [featured, persist],
  );

  const removeFeatured = useCallback(
    async (title: string) => {
      await persist(featured.filter(t => t !== title));
    },
    [featured, persist],
  );

  const toggleFeatured = useCallback(
    async (title: string) => {
      await (featured.includes(title)
        ? persist(featured.filter(t => t !== title))
        : persist([...featured, title]));
    },
    [featured, persist],
  );

  const moveFeatured = useCallback(
    async (title: string, dir: 'up' | 'down') => {
      const i = featured.indexOf(title);
      if (i < 0) return;
      const j = dir === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= featured.length) return;
      const next = [...featured];
      [next[i], next[j]] = [next[j], next[i]];
      await persist(next);
    },
    [featured, persist],
  );

  return (
    <FeaturedContext.Provider
      value={{ featured, loading, isFeatured, addFeatured, removeFeatured, toggleFeatured, moveFeatured }}
    >
      {children}
    </FeaturedContext.Provider>
  );
};

export const useFeatured = () => {
  const ctx = useContext(FeaturedContext);
  if (ctx === undefined) {
    throw new Error('useFeatured must be used within a FeaturedProvider');
  }
  return ctx;
};
