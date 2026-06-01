import type { TaggedWorkout } from '../hooks/useWorkouts';

export interface PRData {
  exerciseTitle: string;
  maxWeight: number;
  maxWeightDate: Date;
  maxReps: number;
  maxRepsDate: Date;
  maxVolume: number;
  maxVolumeDate: Date;
  daysSinceLastPR: number;
  bodyweightAtPR?: number; // Only used for Bodyweight exercises
}

const BODYWEIGHT_EXERCISES = ['Pull Up', 'Chin Up', 'Dip', 'Push Up', 'Muscle Up'];
const REP_BASED_EXERCISES = ['Pull Up', 'Chin Up', 'Dip', 'Push Up', 'Muscle Up'];

export const calculatePRs = (workouts: TaggedWorkout[]): PRData[] => {
  const prMap = new Map<string, PRData>();

  workouts.forEach(w => {
    // Failed lifts at 0 reps mean "couldn't lift it" — don't count them as PRs.
    if (w.setType === 'failure' && w.reps === 0) return;

    // w.weightKg already has the bodyweight included if it's a bodyweight exercise
    const entry = prMap.get(w.exerciseTitle) || {
      exerciseTitle: w.exerciseTitle,
      maxWeight: 0,
      maxWeightDate: w.startTime,
      maxReps: 0,
      maxRepsDate: w.startTime,
      maxVolume: 0,
      maxVolumeDate: w.startTime,
      daysSinceLastPR: 0,
    };

    // Max Weight PR
    if (w.weightKg > entry.maxWeight) {
      entry.maxWeight = w.weightKg;
      entry.maxWeightDate = w.startTime;
      if (BODYWEIGHT_EXERCISES.includes(w.exerciseTitle)) {
        entry.bodyweightAtPR = w.startTime < new Date('2026-02-01') ? 73 : 80;
      }
    }

    // Max Reps PR (for rep-based exercises like Pull Up)
    if (w.reps > entry.maxReps) {
      entry.maxReps = w.reps;
      entry.maxRepsDate = w.startTime;
    }

    // Max Set Volume (weightKg already includes bodyweight for BW exercises)
    const setVolume = w.weightKg * w.reps;
    if (setVolume > entry.maxVolume) {
      entry.maxVolume = setVolume;
      entry.maxVolumeDate = w.startTime;
    }

    prMap.set(w.exerciseTitle, entry);
  });

  // Calculate days since last PR
  const today = new Date();
  prMap.forEach((entry, key) => {
    const dates = [entry.maxWeightDate.getTime(), entry.maxVolumeDate.getTime()];
    if (REP_BASED_EXERCISES.includes(entry.exerciseTitle)) {
      dates.push(entry.maxRepsDate.getTime());
    }
    const latestPRDate = new Date(Math.max(...dates));
    const timeDiff = Math.abs(today.getTime() - latestPRDate.getTime());
    entry.daysSinceLastPR = Math.floor(timeDiff / (1000 * 3600 * 24));
    prMap.set(key, entry);
  });

  return Array.from(prMap.values()).sort((a, b) => b.maxWeight - a.maxWeight);
};

export { REP_BASED_EXERCISES };

// ── Per-set PR detection ──────────────────────────────────────
// Flags the specific sets that, at the moment they were logged, set a new
// all-time record for an exercise — either the heaviest weight or the most
// volume (weight × reps) in a single set. Used to badge sets in the workout
// history. The very first set of an exercise establishes the baseline and is
// not flagged (you can only "break" a record that already exists).

export interface SetPR {
  weight: boolean; // heaviest single-set weight to date
  volume: boolean; // most single-set volume to date
}

/** Stable key for a logged set: session id + exercise + set index. */
export const setPRKey = (sessionId: string, exerciseTitle: string, setIndex: number) =>
  `${sessionId}|${exerciseTitle}|${setIndex}`;

export const computeSetPRs = (workouts: TaggedWorkout[]): Map<string, SetPR> => {
  // Bucket sets per exercise, ignoring empty or failed-at-zero attempts.
  const byExercise = new Map<string, TaggedWorkout[]>();
  workouts.forEach(w => {
    if (w.weightKg <= 0 || w.reps <= 0) return;
    if (w.setType === 'failure' && w.reps === 0) return;
    const arr = byExercise.get(w.exerciseTitle) ?? [];
    arr.push(w);
    byExercise.set(w.exerciseTitle, arr);
  });

  const result = new Map<string, SetPR>();

  byExercise.forEach(sets => {
    sets.sort((a, b) => a.startTime.getTime() - b.startTime.getTime() || a.setIndex - b.setIndex);
    let maxWeight = 0;
    let maxVolume = 0;

    sets.forEach(s => {
      const volume = s.weightKg * s.reps;
      const weightPR = maxWeight > 0 && s.weightKg > maxWeight;
      const volumePR = maxVolume > 0 && volume > maxVolume;

      if (s.weightKg > maxWeight) maxWeight = s.weightKg;
      if (volume > maxVolume) maxVolume = volume;

      if (weightPR || volumePR) {
        result.set(setPRKey(s.id, s.exerciseTitle, s.setIndex), { weight: weightPR, volume: volumePR });
      }
    });
  });

  return result;
};
