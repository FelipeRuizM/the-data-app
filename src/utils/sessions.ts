import type { TaggedWorkout } from '../hooks/useWorkouts';

export interface WorkoutSession {
  id: string;
  startTime: Date;
  title: string;
  category: string;
  description: string;
  gym: string;
  avgHeartRate: number;
  people: string[];
  volume: number;
  durSeconds: number;
  exercises: Map<string, TaggedWorkout[]>;
}

/**
 * Groups the flat set list into one entry per workout session (keyed by start
 * time), summing volume, tracking duration, and bucketing sets by exercise.
 * Returned newest-first.
 */
export const groupWorkoutSessions = (workouts: TaggedWorkout[]): WorkoutSession[] => {
  const map = new Map<string, WorkoutSession>();

  workouts.forEach(w => {
    const key = w.startTime.getTime().toString();
    const s = map.get(key) ?? {
      id: w.id,
      startTime: w.startTime,
      title: w.title,
      category: w.category || 'Mixed',
      description: w.description || '',
      gym: w.gym || '',
      avgHeartRate: w.avgHeartRate || 0,
      people: w.people || [],
      volume: 0,
      durSeconds: 0,
      exercises: new Map<string, TaggedWorkout[]>(),
    };

    s.volume += w.weightKg * w.reps;

    let ds = w.durationSeconds;
    if (!ds && w.endTime && w.startTime)
      ds = (w.endTime.getTime() - w.startTime.getTime()) / 1000;
    if (ds > s.durSeconds) s.durSeconds = ds;

    const exArr = s.exercises.get(w.exerciseTitle) ?? [];
    exArr.push(w);
    s.exercises.set(w.exerciseTitle, exArr);
    map.set(key, s);
  });

  return Array.from(map.values()).sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
};
