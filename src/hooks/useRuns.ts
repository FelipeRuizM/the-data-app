import { useState, useEffect } from 'react';
import { parse } from 'date-fns';
import { realtimeDb } from '../config/firebase';
import { ref, onValue } from 'firebase/database';
import { useAuth } from '../context/AuthContext';

export type RunType = 'Light' | 'Explosion' | 'Long' | 'Other';

export const RUN_TYPES: RunType[] = ['Light', 'Explosion', 'Long', 'Other'];

export interface Run {
  id: string;
  title: string;
  type: RunType;
  startTime: Date;
  distanceKm: number;
  durationSeconds: number;
  pace: string;
  elevationGainM: number;
  maxElevationM: number;
  steps: number;
  description: string;
  location: string;
  avgHeartRate: number;
  calories: number;
  people: string[];
  difficulty: number;
}

const parseStartTime = (raw: unknown): Date => {
  const str = String(raw ?? '');
  try {
    const parsed = parse(str, 'd MMM yyyy, HH:mm', new Date());
    if (!isNaN(parsed.getTime())) return parsed;
  } catch (e) { /* fall through */ }
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
};

export const useRuns = () => {
  const { dataUid } = useAuth();
  const uid = dataUid;
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setRuns([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const path = `/users/${uid}/runs`;
    const runsRef = ref(realtimeDb, path);
    const unsubscribe = onValue(
      runsRef,
      (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          setRuns([]);
          setLoading(false);
          return;
        }

        const entries = Array.isArray(data)
          ? data.map((v, i) => [i.toString(), v] as [string, any])
          : Object.entries(data);

        const parsed: Run[] = entries
          .filter(([, item]) => item)
          .map(([key, item]: [string, any]) => ({
            id: key,
            title: item.title || '',
            type: (item.type as RunType) || 'Other',
            startTime: parseStartTime(item.start_time),
            distanceKm: Number(item.distance_km) || 0,
            durationSeconds: Number(item.duration_seconds) || 0,
            pace: item.pace || '',
            elevationGainM: Number(item.elevation_gain_m) || 0,
            maxElevationM: Number(item.max_elevation_m) || 0,
            steps: Number(item.steps) || 0,
            description: item.description || '',
            location: item.location || '',
            avgHeartRate: Number(item.avg_heart_rate) || 0,
            calories: Number(item.calories) || 0,
            people: Array.isArray(item.people) ? item.people : [],
            difficulty: Number(item.difficulty) || 0,
          }))
          .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

        setRuns(parsed);
        setLoading(false);
      },
      (error) => {
        console.error('[DB] Runs listen failed:', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [uid]);

  return { runs, loading };
};
