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

export interface Person {
  id: string;   // Realtime DB push key
  name: string;
}

interface PeopleContextType {
  people: Person[];
  loading: boolean;
  createPerson: (name: string) => Promise<void>;
  updatePerson: (id: string, data: { name?: string }) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
}

const PeopleContext = createContext<PeopleContextType | undefined>(undefined);

export const PeopleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { dataUid, canWrite } = useAuth();
  const uid = dataUid;
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Subscribe to the user's people list ──────────────────────────────────
  useEffect(() => {
    if (!uid) {
      setPeople([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const path = `/users/${uid}/people`;
    const peopleRef = ref(realtimeDb, path);
    console.log(`[DB] Subscribing to people (${path})`);

    const unsubscribe = onValue(
      peopleRef,
      (snapshot) => {
        const data = (snapshot.val() ?? {}) as Record<string, { name?: string }>;
        const list: Person[] = Object.entries(data).map(([id, v]) => ({
          id,
          name: v?.name ?? '',
        }));
        list.sort((a, b) => a.name.localeCompare(b.name));
        console.log(`[DB] Fetched ${list.length} people`);
        setPeople(list);
        setLoading(false);
      },
      (error) => {
        console.error('[DB] People listen failed:', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [uid]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const createPerson = useCallback(
    async (name: string) => {
      if (!uid || !canWrite) throw new Error('Not authenticated');
      console.log(`[DB] Creating person "${name}"`);
      await push(ref(realtimeDb, `/users/${uid}/people`), { name: name.trim() });
    },
    [uid, canWrite],
  );

  const updatePerson = useCallback(
    async (id: string, data: { name?: string }) => {
      if (!uid || !canWrite) throw new Error('Not authenticated');
      const patch: Record<string, string> = {};
      if (data.name !== undefined) patch.name = data.name.trim();
      console.log(`[DB] Updating person ${id}`, patch);
      await update(ref(realtimeDb, `/users/${uid}/people/${id}`), patch);
    },
    [uid, canWrite],
  );

  const deletePerson = useCallback(
    async (id: string) => {
      if (!uid || !canWrite) throw new Error('Not authenticated');
      console.log(`[DB] Deleting person ${id}`);
      await remove(ref(realtimeDb, `/users/${uid}/people/${id}`));
    },
    [uid, canWrite],
  );

  return (
    <PeopleContext.Provider value={{ people, loading, createPerson, updatePerson, deletePerson }}>
      {children}
    </PeopleContext.Provider>
  );
};

export const usePeople = () => {
  const ctx = useContext(PeopleContext);
  if (ctx === undefined) {
    throw new Error('usePeople must be used within a PeopleProvider');
  }
  return ctx;
};
