import { startOfWeek, format, addWeeks, parseISO } from 'date-fns';
import type { WorkoutSet } from './csvParser';

// ─── Filter Types ─────────────────────────────────────────────────────────────

export type MetricType = 'volume' | 'reps' | 'sets' | 'duration';

export interface ChartFilters {
  categories: string[];    // e.g. ['Push','Pull'] — empty = all
  muscleGroup: string;     // e.g. 'Chest' — '' = all
  exercise: string;        // exact exerciseTitle — '' = all
}

export const EMPTY_FILTERS: ChartFilters = { categories: [], muscleGroup: '', exercise: '' };

/** Apply category / muscle / exercise filters to a flat set list. */
export function applyChartFilters(
  workouts: (WorkoutSet & { id: string; category?: string })[],
  filters: ChartFilters,
): (WorkoutSet & { id: string; category?: string })[] {
  return workouts.filter(w => {
    if (filters.categories.length > 0) {
      if (!filters.categories.includes(w.category ?? 'Mixed')) return false;
    }
    if (filters.exercise) {
      if (w.exerciseTitle !== filters.exercise) return false;
    } else if (filters.muscleGroup) {
      if (getMuscleGroup(w.exerciseTitle) !== filters.muscleGroup) return false;
    }
    return true;
  });
}

/** All distinct muscle groups (sorted) for use in dropdowns. */
export const MUSCLE_GROUPS = ['Arms', 'Back', 'Chest', 'Core', 'Legs', 'Other', 'Shoulders'] as const;

// ─── Centralized Muscle Group Mapping ───────────────────────────────────────
// Matching is done via partial, case-insensitive includes() on exerciseTitle.
// Order matters: more specific entries should come before general ones.

export const MUSCLE_MAP: Record<string, string> = {
  // Chest
  'Incline Bench Press': 'Chest',
  'Decline Bench Press': 'Chest',
  'Bench Press': 'Chest',
  'Incline Press': 'Chest',
  'Decline Press': 'Chest',
  'Chest Fly': 'Chest',
  'Cable Fly': 'Chest',
  'Pec Deck': 'Chest',
  'Chest Press': 'Chest',
  'Push Up': 'Chest',
  'Dip': 'Chest',

  // Back
  'Romanian Deadlift': 'Legs', // More legs than back, override before generic Deadlift
  'Deadlift': 'Back',
  'Pulldown': 'Back',
  'Lat Pull': 'Back',
  'Pull Up': 'Back',
  'Chin Up': 'Back',
  'Seated Row': 'Back',
  'Cable Row': 'Back',
  'Bent Over Row': 'Back',
  'Row': 'Back',
  'Back Extension': 'Back',
  'Pull Over': 'Back',
  'Shrug': 'Back',
  'Rack Pull': 'Back',
  'Muscle Up': 'Back',

  // Legs
  'Hack Squat': 'Legs',
  'Front Squat': 'Legs',
  'Split Squat': 'Legs',
  'Bulgarian Split Squat': 'Legs',
  'Squat': 'Legs',
  'Leg Press': 'Legs',
  'Leg Extension': 'Legs',
  'Leg Curl': 'Legs',
  'Lying Leg Curl': 'Legs',
  'Seated Leg Curl': 'Legs',
  'Hip Thrust': 'Legs',
  'Glute Bridge': 'Legs',
  'Hip Abduction': 'Legs',
  'Hip Adduction': 'Legs',
  'Adduction': 'Legs',
  'Abduction': 'Legs',
  'Calf Raise': 'Legs',
  'Calf': 'Legs',
  'Nordic': 'Legs',
  'Lunge': 'Legs',
  'Step Up': 'Legs',
  'Good Morning': 'Legs',
  'Sissy Squat': 'Legs',

  // Shoulders
  'Overhead Press': 'Shoulders',
  'Military Press': 'Shoulders',
  'Shoulder Press': 'Shoulders',
  'Arnold Press': 'Shoulders',
  'Lateral Raise': 'Shoulders',
  'Front Raise': 'Shoulders',
  'Reverse Fly': 'Shoulders',
  'Rear Delt': 'Shoulders',
  'Upright Row': 'Shoulders',
  'Face Pull': 'Shoulders', // duplicate intentional – face pull hits rear delt

  // Arms – Biceps
  'Preacher Curl': 'Arms',
  'Concentration Curl': 'Arms',
  'Spider Curl': 'Arms',
  'Hammer Curl': 'Arms',
  'Incline Curl': 'Arms',
  'Bicep Curl': 'Arms',
  'Biceps Curl': 'Arms',
  'Cable Curl': 'Arms',
  'Barbell Curl': 'Arms',
  'EZ Bar Curl': 'Arms',

  // Arms – Triceps
  'Skull Crusher': 'Arms',
  'Triceps Pushdown': 'Arms',
  'Tricep Pushdown': 'Arms',
  'Close Grip Bench': 'Arms',
  'Overhead Tricep Extension': 'Arms',
  'Overhead Extension': 'Arms',
  'Triceps': 'Arms',
  'Tricep': 'Arms',
  'Wrist Curl': 'Arms',
  'Close Grip': 'Arms',

  // Core
  'Cable Crunch': 'Core',
  'Crunch': 'Core',
  'Sit Up': 'Core',
  'Plank': 'Core',
  'Russian Twist': 'Core',
  'Leg Raise': 'Core',
  'Hanging Leg Raise': 'Core',
  'Toes to Bar': 'Core',
  'Ab Wheel': 'Core',
  'Wood Chop': 'Core',
  'Hyperextension': 'Core',
  'Ab ': 'Core',
};

export function getMuscleGroup(exerciseTitle: string): string {
  const lower = exerciseTitle.toLowerCase();
  for (const [key, value] of Object.entries(MUSCLE_MAP)) {
    if (lower.includes(key.toLowerCase())) return value;
  }
  return 'Other';
}

// ─── Weekly Grouping Helpers ─────────────────────────────────────────────────

/** Returns the ISO week start (Monday) as a sortable 'yyyy-MM-dd' string. */
function getWeekKey(date: Date): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

/** Display label for a week, e.g. "Jan 06". */
function getWeekLabel(date: Date): string {
  return format(startOfWeek(date, { weekStartsOn: 1 }), 'MMM dd');
}

/**
 * Pads a sparse weekly series so that every calendar week between the first
 * and last visible week is represented — even weeks with no activity show up
 * as a zero-valued entry.
 *
 * - `rangeStart` / `rangeEnd` override the bounds; otherwise we infer from
 *   the data itself. Both get snapped to the Monday of their ISO week.
 * - `zero` builds the empty-week entry (recharts needs a complete row, not
 *   a null).
 */
export function fillWeeklyGaps<T extends { weekKey: string; label: string }>(
  points: T[],
  zero: (weekKey: string, label: string) => T,
  rangeStart?: Date | null,
  rangeEnd?: Date | null,
): T[] {
  const weekOpts = { weekStartsOn: 1 as const };

  const dataStart = points.length > 0 ? parseISO(points[0].weekKey) : null;
  const dataEnd   = points.length > 0 ? parseISO(points[points.length - 1].weekKey) : null;

  const start = rangeStart ? startOfWeek(rangeStart, weekOpts) : dataStart;
  const end   = rangeEnd   ? startOfWeek(rangeEnd,   weekOpts) : dataEnd;

  if (!start || !end || start.getTime() > end.getTime()) return points;

  const existing = new Map(points.map(p => [p.weekKey, p]));
  const result: T[] = [];

  let cursor = start;
  // Safety cap: never emit more than ~10 years of weeks
  let guard = 600;
  while (cursor.getTime() <= end.getTime() && guard-- > 0) {
    const key = format(cursor, 'yyyy-MM-dd');
    const label = format(cursor, 'MMM dd');
    result.push(existing.get(key) ?? zero(key, label));
    cursor = addWeeks(cursor, 1);
  }

  return result;
}

// ─── Weekly Volume ────────────────────────────────────────────────────────────

export interface WeeklyVolumePoint {
  weekKey: string;
  label: string;
  volumeKg: number;
}

export function getWeeklyVolume(workouts: WorkoutSet[]): WeeklyVolumePoint[] {
  const map = new Map<string, WeeklyVolumePoint>();

  workouts.forEach(w => {
    const key = getWeekKey(w.startTime);
    const existing = map.get(key) ?? { weekKey: key, label: getWeekLabel(w.startTime), volumeKg: 0 };
    existing.volumeKg += w.weightKg * w.reps;
    map.set(key, existing);
  });

  return Array.from(map.values()).sort((a, b) => a.weekKey.localeCompare(b.weekKey));
}

// ─── Weekly Frequency ────────────────────────────────────────────────────────

export interface WeeklyFrequencyPoint {
  weekKey: string;
  label: string;
  workoutCount: number;
}

/** Counts unique workout sessions (by `id`) per week. */
export function getWeeklyFrequency(workouts: (WorkoutSet & { id: string })[]): WeeklyFrequencyPoint[] {
  const weekMap = new Map<string, { label: string; ids: Set<string> }>();

  workouts.forEach(w => {
    const key = getWeekKey(w.startTime);
    if (!weekMap.has(key)) {
      weekMap.set(key, { label: getWeekLabel(w.startTime), ids: new Set() });
    }
    weekMap.get(key)!.ids.add(w.id);
  });

  return Array.from(weekMap.entries())
    .map(([weekKey, { label, ids }]) => ({ weekKey, label, workoutCount: ids.size }))
    .sort((a, b) => a.weekKey.localeCompare(b.weekKey));
}

// ─── Top Exercises ────────────────────────────────────────────────────────────

export interface TopExercisePoint {
  exerciseTitle: string;
  volumeKg: number;
  setCount: number;
}

export function getTopExercises(workouts: WorkoutSet[], limit = 10): TopExercisePoint[] {
  const map = new Map<string, TopExercisePoint>();

  workouts.forEach(w => {
    const existing = map.get(w.exerciseTitle) ?? {
      exerciseTitle: w.exerciseTitle,
      volumeKg: 0,
      setCount: 0,
    };
    existing.volumeKg += w.weightKg * w.reps;
    existing.setCount += 1;
    map.set(w.exerciseTitle, existing);
  });

  return Array.from(map.values())
    .sort((a, b) => b.volumeKg - a.volumeKg)
    .slice(0, limit);
}

// ─── Volume by Muscle Group ───────────────────────────────────────────────────

export interface MuscleGroupPoint {
  name: string;
  sets: number;
  volumeKg: number;
}

export function getVolumeByMuscleGroup(workouts: WorkoutSet[]): MuscleGroupPoint[] {
  const map = new Map<string, MuscleGroupPoint>();

  workouts.forEach(w => {
    const group = getMuscleGroup(w.exerciseTitle);
    const existing = map.get(group) ?? { name: group, sets: 0, volumeKg: 0 };
    existing.sets += 1;
    existing.volumeKg += w.weightKg * w.reps;
    map.set(group, existing);
  });

  return Array.from(map.values())
    .sort((a, b) => b.volumeKg - a.volumeKg)
    .filter(r => r.sets > 0);
}

// ─── Per-Workout Volume ───────────────────────────────────────────────────────

export interface WorkoutVolumePoint {
  workoutId: string;
  date: Date;
  label: string;      // short "MMM d" for x-axis ticks
  fullLabel: string;  // "MMM d, yyyy" for tooltips
  volumeKg: number;
  sets: number;
}

/**
 * Aggregates total volume per individual workout session, ordered chronologically.
 * Ideal for exercise-isolated views — one point per workout the exercise appeared in.
 */
export function getVolumePerWorkout(
  workouts: (WorkoutSet & { id: string })[],
): WorkoutVolumePoint[] {
  const map = new Map<string, WorkoutVolumePoint>();

  workouts.forEach(w => {
    const existing = map.get(w.id) ?? {
      workoutId: w.id,
      date: w.startTime,
      label: format(w.startTime, 'MMM d'),
      fullLabel: format(w.startTime, 'MMM d, yyyy'),
      volumeKg: 0,
      sets: 0,
    };
    existing.volumeKg += w.weightKg * w.reps;
    existing.sets += 1;
    // Keep the earliest startTime as the canonical workout date
    if (w.startTime < existing.date) {
      existing.date = w.startTime;
      existing.label = format(w.startTime, 'MMM d');
      existing.fullLabel = format(w.startTime, 'MMM d, yyyy');
    }
    map.set(w.id, existing);
  });

  return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ─── Dynamic Weekly Metric ────────────────────────────────────────────────────

export interface WeeklyMetricPoint {
  weekKey: string;
  label: string;
  value: number;
}

/**
 * Aggregates the dataset by calendar week for any of the four supported metrics.
 * Duration is summed in minutes (rounded). Volume stays in kg — callers convert.
 * Sets counts unique workout sessions; Reps sums raw reps.
 */
export function getWeeklyMetric(
  workouts: (WorkoutSet & { id: string })[],
  metric: MetricType,
): WeeklyMetricPoint[] {
  // For 'sets' we need to count per-session unique sets, not raw rows (each row IS one set).
  // For 'duration' we want total minutes of unique sessions (not per-set duplication).
  // We track sessions separately to avoid double-counting session duration.
  const map     = new Map<string, WeeklyMetricPoint>();
  const sessDur = new Map<string, { weekKey: string; durationSec: number }>();

  workouts.forEach(w => {
    const wk  = getWeekKey(w.startTime);
    const lbl = getWeekLabel(w.startTime);

    if (!map.has(wk)) map.set(wk, { weekKey: wk, label: lbl, value: 0 });
    const pt = map.get(wk)!;

    if (metric === 'volume') {
      pt.value += w.weightKg * w.reps;
    } else if (metric === 'reps') {
      pt.value += w.reps;
    } else if (metric === 'sets') {
      pt.value += 1; // each row is one set
    } else if (metric === 'duration') {
      // Accumulate per-session duration once (avoid multiplying by set count)
      if (!sessDur.has(w.id)) {
        const durSec = w.endTime
          ? Math.round((w.endTime.getTime() - w.startTime.getTime()) / 1000)
          : 0;
        sessDur.set(w.id, { weekKey: wk, durationSec: durSec });
      }
    }
  });

  // Merge session durations into weekly buckets
  if (metric === 'duration') {
    sessDur.forEach(({ weekKey, durationSec }) => {
      if (!map.has(weekKey)) return;
      map.get(weekKey)!.value += durationSec;
    });
    // Convert seconds → minutes
    map.forEach(pt => { pt.value = Math.round(pt.value / 60); });
  } else if (metric === 'volume') {
    // Leave as-is; caller converts kg→lbs if needed
  } else {
    // reps / sets are already integers — round to be safe
    map.forEach(pt => { pt.value = Math.round(pt.value); });
  }

  return Array.from(map.values()).sort((a, b) => a.weekKey.localeCompare(b.weekKey));
}
