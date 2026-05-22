import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { useAuth } from './AuthContext';

export interface Exercise {
  id: string;          // Realtime DB push key
  name: string;
  muscleGroup: string;
}

interface ExercisesContextType {
  exercises: Exercise[];
  loading: boolean;
  /** Resolve an exercise title to its muscle group (exact, case-insensitive). Falls back to 'Other'. */
  getMuscleGroup: (exerciseTitle: string) => string;
  createExercise: (name: string, muscleGroup: string) => Promise<void>;
  updateExercise: (id: string, data: { name?: string; muscleGroup?: string }) => Promise<void>;
  deleteExercise: (id: string) => Promise<void>;
}

const ExercisesContext = createContext<ExercisesContextType | undefined>(undefined);

export const ExercisesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const uid = user?.uid;
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Subscribe to the user's exercise library ──────────────────────────────
  useEffect(() => {
    if (!uid) {
      setExercises([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const path = `/users/${uid}/exercises`;
    const exRef = ref(realtimeDb, path);
    console.log(`[DB] Subscribing to exercises (${path})`);

    const unsubscribe = onValue(
      exRef,
      (snapshot) => {
        const data = (snapshot.val() ?? {}) as Record<
          string,
          { name?: string; muscleGroup?: string }
        >;
        const list: Exercise[] = Object.entries(data).map(([id, v]) => ({
          id,
          name: v?.name ?? '',
          muscleGroup: v?.muscleGroup ?? 'Other',
        }));
        list.sort((a, b) => a.name.localeCompare(b.name));
        console.log(`[DB] Fetched ${list.length} exercises`);
        setExercises(list);
        setLoading(false);
      },
      (error) => {
        console.error('[DB] Exercises listen failed:', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [uid]);

  // ── Muscle-group resolver (replaces the old hard-coded MUSCLE_MAP) ─────────
  const muscleByName = useMemo(() => {
    const m = new Map<string, string>();
    exercises.forEach((e) => m.set(e.name.trim().toLowerCase(), e.muscleGroup));
    return m;
  }, [exercises]);

  const getMuscleGroup = useCallback(
    (exerciseTitle: string) => muscleByName.get(exerciseTitle.trim().toLowerCase()) ?? 'Other',
    [muscleByName],
  );

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const createExercise = useCallback(
    async (name: string, muscleGroup: string) => {
      if (!uid) throw new Error('Not authenticated');
      console.log(`[DB] Creating exercise "${name}" (${muscleGroup})`);
      await push(ref(realtimeDb, `/users/${uid}/exercises`), {
        name: name.trim(),
        muscleGroup,
      });
    },
    [uid],
  );

  const updateExercise = useCallback(
    async (id: string, data: { name?: string; muscleGroup?: string }) => {
      if (!uid) throw new Error('Not authenticated');
      const patch: Record<string, string> = {};
      if (data.name !== undefined) patch.name = data.name.trim();
      if (data.muscleGroup !== undefined) patch.muscleGroup = data.muscleGroup;
      console.log(`[DB] Updating exercise ${id}`, patch);
      await update(ref(realtimeDb, `/users/${uid}/exercises/${id}`), patch);
    },
    [uid],
  );

  const deleteExercise = useCallback(
    async (id: string) => {
      if (!uid) throw new Error('Not authenticated');
      console.log(`[DB] Deleting exercise ${id}`);
      await remove(ref(realtimeDb, `/users/${uid}/exercises/${id}`));
    },
    [uid],
  );

  return (
    <ExercisesContext.Provider
      value={{ exercises, loading, getMuscleGroup, createExercise, updateExercise, deleteExercise }}
    >
      {children}
    </ExercisesContext.Provider>
  );
};

export const useExercises = () => {
  const ctx = useContext(ExercisesContext);
  if (ctx === undefined) {
    throw new Error('useExercises must be used within an ExercisesProvider');
  }
  return ctx;
};
