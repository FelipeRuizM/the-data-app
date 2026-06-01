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
// all-time record for an exercise. Three independent records are tracked:
//   • weight — heaviest single-set weight
//   • volume — most weight × reps in a single set
//   • 1RM    — highest estimated one-rep-max (Epley) in a single set
// Used to badge sets in the workout history and to summarise records per month.
// The very first set of an exercise establishes the baseline and is NOT flagged
// (you can only "break" a record that already exists).

export type PRType = 'weight' | 'volume' | 'oneRM';

export interface SetPR {
  weight: boolean;
  volume: boolean;
  oneRM: boolean;
}

export interface PRAchievement extends SetPR {
  key: string;          // setPRKey — links back to the badged set
  exerciseTitle: string;
  date: Date;
  weightKg: number;
  reps: number;
}

/** Epley estimated one-rep max. */
export const estimateOneRM = (weightKg: number, reps: number) => weightKg * (1 + reps / 30);

/** Stable key for a logged set: session id + exercise + set index. */
export const setPRKey = (sessionId: string, exerciseTitle: string, setIndex: number) =>
  `${sessionId}|${exerciseTitle}|${setIndex}`;

/**
 * Walks each exercise session-by-session in chronological order and returns one
 * entry per set that broke at least one record. Each record type (weight /
 * volume / 1RM) can be broken at most ONCE per exercise per workout — only the
 * session's single best set for that metric is flagged, and only if it beats the
 * all-time best from before this session. The exercise's first session merely
 * establishes the baseline, so it never produces PRs.
 */
export const computePRAchievements = (workouts: TaggedWorkout[]): PRAchievement[] => {
  // Bucket sets per exercise, ignoring empty or failed-at-zero attempts.
  const byExercise = new Map<string, TaggedWorkout[]>();
  workouts.forEach(w => {
    if (w.weightKg <= 0 || w.reps <= 0) return;
    if (w.setType === 'failure' && w.reps === 0) return;
    const arr = byExercise.get(w.exerciseTitle) ?? [];
    arr.push(w);
    byExercise.set(w.exerciseTitle, arr);
  });

  const achievements: PRAchievement[] = [];

  byExercise.forEach(sets => {
    // Group the exercise's sets into sessions (by session id), oldest first.
    const sessions = new Map<string, { date: Date; sets: TaggedWorkout[] }>();
    sets.forEach(s => {
      const sess = sessions.get(s.id) ?? { date: s.startTime, sets: [] };
      sess.sets.push(s);
      sessions.set(s.id, sess);
    });
    const ordered = Array.from(sessions.values()).sort((a, b) => a.date.getTime() - b.date.getTime());

    let maxWeight = 0;
    let maxVolume = 0;
    let maxOneRM = 0;

    ordered.forEach(({ sets: sessionSets }) => {
      // The session's best set for each metric.
      let bestWeight = sessionSets[0];
      let bestVolume = sessionSets[0];
      let bestOneRM  = sessionSets[0];
      sessionSets.forEach(s => {
        if (s.weightKg > bestWeight.weightKg) bestWeight = s;
        if (s.weightKg * s.reps > bestVolume.weightKg * bestVolume.reps) bestVolume = s;
        if (estimateOneRM(s.weightKg, s.reps) > estimateOneRM(bestOneRM.weightKg, bestOneRM.reps)) bestOneRM = s;
      });

      const sWeight = bestWeight.weightKg;
      const sVolume = bestVolume.weightKg * bestVolume.reps;
      const sOneRM  = estimateOneRM(bestOneRM.weightKg, bestOneRM.reps);

      const weightPR = maxWeight > 0 && sWeight > maxWeight;
      const volumePR = maxVolume > 0 && sVolume > maxVolume;
      const oneRMPR  = maxOneRM > 0 && sOneRM > maxOneRM;

      // Attribute the PR(s) to the achieving set(s); one set may earn several.
      const flagsBySet = new Map<TaggedWorkout, SetPR>();
      const flagsFor = (s: TaggedWorkout) => {
        let f = flagsBySet.get(s);
        if (!f) { f = { weight: false, volume: false, oneRM: false }; flagsBySet.set(s, f); }
        return f;
      };
      if (weightPR) flagsFor(bestWeight).weight = true;
      if (volumePR) flagsFor(bestVolume).volume = true;
      if (oneRMPR)  flagsFor(bestOneRM).oneRM  = true;

      flagsBySet.forEach((flags, s) => {
        achievements.push({
          key: setPRKey(s.id, s.exerciseTitle, s.setIndex),
          exerciseTitle: s.exerciseTitle,
          date: s.startTime,
          weightKg: s.weightKg,
          reps: s.reps,
          ...flags,
        });
      });

      maxWeight = Math.max(maxWeight, sWeight);
      maxVolume = Math.max(maxVolume, sVolume);
      maxOneRM  = Math.max(maxOneRM, sOneRM);
    });
  });

  return achievements;
};

/** Map of set key → which records that set broke (for badging the history). */
export const computeSetPRs = (workouts: TaggedWorkout[]): Map<string, SetPR> => {
  const result = new Map<string, SetPR>();
  computePRAchievements(workouts).forEach(a => {
    result.set(a.key, { weight: a.weight, volume: a.volume, oneRM: a.oneRM });
  });
  return result;
};
