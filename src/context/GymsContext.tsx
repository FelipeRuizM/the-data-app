import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { useAuth } from './AuthContext';

export interface Gym {
  id: string;   // Realtime DB push key
  name: string;
}

interface GymsContextType {
  gyms: Gym[];
  loading: boolean;
  createGym: (name: string) => Promise<void>;
  updateGym: (id: string, data: { name?: string }) => Promise<void>;
  deleteGym: (id: string) => Promise<void>;
}

const GymsContext = createContext<GymsContextType | undefined>(undefined);

export const GymsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { dataUid, canWrite } = useAuth();
  const uid = dataUid;
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Subscribe to the user's gym/location list ────────────────────────────
  useEffect(() => {
    if (!uid) {
      setGyms([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const path = `/users/${uid}/gyms`;
    const gymsRef = ref(realtimeDb, path);
    console.log(`[DB] Subscribing to gyms (${path})`);

    const unsubscribe = onValue(
      gymsRef,
      (snapshot) => {
        const data = (snapshot.val() ?? {}) as Record<string, { name?: string }>;
        const list: Gym[] = Object.entries(data).map(([id, v]) => ({
          id,
          name: v?.name ?? '',
        }));
        list.sort((a, b) => a.name.localeCompare(b.name));
        console.log(`[DB] Fetched ${list.length} gyms`);
        setGyms(list);
        setLoading(false);
      },
      (error) => {
        console.error('[DB] Gyms listen failed:', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [uid]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const createGym = useCallback(
    async (name: string) => {
      if (!uid || !canWrite) throw new Error('Not authenticated');
      console.log(`[DB] Creating gym "${name}"`);
      await push(ref(realtimeDb, `/users/${uid}/gyms`), { name: name.trim() });
    },
    [uid, canWrite],
  );

  const updateGym = useCallback(
    async (id: string, data: { name?: string }) => {
      if (!uid || !canWrite) throw new Error('Not authenticated');
      const patch: Record<string, string> = {};
      if (data.name !== undefined) patch.name = data.name.trim();
      console.log(`[DB] Updating gym ${id}`, patch);
      await update(ref(realtimeDb, `/users/${uid}/gyms/${id}`), patch);
    },
    [uid, canWrite],
  );

  const deleteGym = useCallback(
    async (id: string) => {
      if (!uid || !canWrite) throw new Error('Not authenticated');
      console.log(`[DB] Deleting gym ${id}`);
      await remove(ref(realtimeDb, `/users/${uid}/gyms/${id}`));
    },
    [uid, canWrite],
  );

  return (
    <GymsContext.Provider value={{ gyms, loading, createGym, updateGym, deleteGym }}>
      {children}
    </GymsContext.Provider>
  );
};

export const useGyms = () => {
  const ctx = useContext(GymsContext);
  if (ctx === undefined) {
    throw new Error('useGyms must be used within a GymsProvider');
  }
  return ctx;
};
