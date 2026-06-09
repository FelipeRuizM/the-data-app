import { useState, useEffect } from 'react';
import type { WorkoutSet } from '../utils/csvParser';
import { parse } from 'date-fns';
import { realtimeDb } from '../config/firebase';
import { ref, onValue } from 'firebase/database';
import { useAuth } from '../context/AuthContext';

export type TaggedWorkout = WorkoutSet & { id: string, category?: string };

export const useWorkouts = () => {
  const { dataUid } = useAuth();
  const uid = dataUid;
  const [workouts, setWorkouts] = useState<TaggedWorkout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setWorkouts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const BODYWEIGHT_EXERCISES = ['Pull Up', 'Chin Up', 'Dip', 'Push Up', 'Muscle Up'];

    const parseDataToFlat = (data: any): TaggedWorkout[] => {
      const flatData: TaggedWorkout[] = [];

      // Realtime DB can be an array OR an object with strings as keys
      const entries = Array.isArray(data)
        ? data.map((v, i) => [i.toString(), v])
        : Object.entries(data);

      entries.forEach(([dbKey, item]: any) => {
        if (!item || !item.exercises) return;

        const startTimeString = String(item.start_time);
        let startTime = new Date();
        try {
          startTime = parse(startTimeString, 'd MMM yyyy, HH:mm', new Date());
          if (isNaN(startTime.getTime())) startTime = new Date(startTimeString);
        } catch (e) { }

        const isFeb1OrLater = startTime >= new Date('2026-02-01');
        const bodyweightAddition = isFeb1OrLater ? 80 : 73;

        item.exercises.forEach((ex: any) => {
          const rootTitle = ex.exercise_title || '';
          const isBodyweight = BODYWEIGHT_EXERCISES.includes(rootTitle);

          ex.sets.forEach((s: any) => {
            let finalWeight = Number(s.weight_kg) || 0;
            if (isBodyweight) finalWeight += bodyweightAddition;

            flatData.push({
              id: dbKey, // This is the key we use for updates!
              category: item.category || 'Mixed',
              title: item.title || '',
              startTime,
              endTime: item.end_time ? new Date(item.end_time) : undefined,
              description: item.description || '',
              gym: item.gym || '',
              avgHeartRate: Number(item.avg_heart_rate) || 0,
              people: Array.isArray(item.people) ? item.people : [],
              exerciseTitle: rootTitle,
              supersetId: '',
              exerciseNotes: ex.exercise_notes || '',
              setIndex: s.set_index || 0,
              setType: s.set_type || 'normal',
              weightKg: finalWeight,
              reps: Number(s.reps) || 0,
              distanceKm: 0,
              durationSeconds: s.duration_seconds || 0,
              rpe: 0
            });
          });
        });
      });

      return flatData;
    };

    const path = `/users/${uid}/workouts`;
    const workoutsRef = ref(realtimeDb, path);
    console.log(`[DB] Subscribing to Realtime Database (${path})`);
    const unsubscribe = onValue(workoutsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const flat = parseDataToFlat(data);
        console.log(`[DB] Fetched ${flat.length} sets across ${new Set(flat.map(w => w.id)).size} workouts`);
        setWorkouts(flat);
      } else {
        console.log('[DB] Fetch returned empty snapshot');
        setWorkouts([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('[DB] Realtime Database listen failed:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid]);

  return { workouts, loading };
};
