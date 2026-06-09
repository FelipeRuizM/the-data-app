import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, addWeeks, parseISO } from 'date-fns';
import type { WorkoutSet } from './csvParser';

// ─── Filter Types ─────────────────────────────────────────────────────────────

export type MetricType = 'volume' | 'reps' | 'sets' | 'duration' | 'distance';

/**
 * Minimal structural shape of a run needed by the analytics aggregators. Keeps
 * this module decoupled from the full `Run` type / its hook.
 */
export interface ActivityRun {
  startTime: Date;
  durationSeconds: number;
  distanceKm: number;
}

export interface ChartFilters {
  categories: string[];    // e.g. ['Push','Pull'] — empty = all
  muscleGroup: string;     // e.g. 'Chest' — '' = all
  exercise: string;        // exact exerciseTitle — '' = all
}

/**
 * Apply category / muscle / exercise filters to a flat set list.
 * `getMuscleGroup` resolves an exercise title to its muscle group — supplied by
 * the caller from the database-backed exercise library.
 */
export function applyChartFilters(
  workouts: (WorkoutSet & { id: string; category?: string })[],
  filters: ChartFilters,
  getMuscleGroup: (exerciseTitle: string) => string,
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

// NOTE: Exercises and their muscle groups now live in the database (see
// ExercisesContext). Functions that need a title → muscle-group lookup take a
// `getMuscleGroup` resolver supplied by the caller.

// ─── Weekly Grouping Helpers ─────────────────────────────────────────────────

/** Returns the ISO week start (Monday) as a sortable 'yyyy-MM-dd' string. */
function getWeekKey(date: Date): string {
  return format(startOfWeek(date, { weekStartsOn: 0 }), 'yyyy-MM-dd');
}

/** Display label for a week, e.g. "Jan 06 - Jan 12". */
function getWeekLabel(date: Date): string {
  const start = startOfWeek(date, { weekStartsOn: 0 });
  const end = endOfWeek(date, { weekStartsOn: 0 });
  return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd')}`;
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
  const weekOpts = { weekStartsOn: 0 as const };

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
    const weekEnd = endOfWeek(cursor, weekOpts);
    const label = `${format(cursor, 'MMM dd')} - ${format(weekEnd, 'MMM dd')}`;
    result.push(existing.get(key) ?? zero(key, label));
    cursor = addWeeks(cursor, 1);
  }

  return result;
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

/**
 * Counts activities per week: unique workout sessions (by `id`) plus each run.
 * `workoutCount` carries the combined total so existing chart code is reused.
 */
export function getWeeklyActivityFrequency(
  workouts: (WorkoutSet & { id: string })[],
  runs: { startTime: Date }[] = [],
): WeeklyFrequencyPoint[] {
  const weekMap = new Map<string, { label: string; ids: Set<string>; runs: number }>();

  const bucket = (date: Date) => {
    const key = getWeekKey(date);
    if (!weekMap.has(key)) weekMap.set(key, { label: getWeekLabel(date), ids: new Set(), runs: 0 });
    return weekMap.get(key)!;
  };

  workouts.forEach(w => bucket(w.startTime).ids.add(w.id));
  runs.forEach(r => { bucket(r.startTime).runs += 1; });

  return Array.from(weekMap.entries())
    .map(([weekKey, { label, ids, runs: runCount }]) => ({ weekKey, label, workoutCount: ids.size + runCount }))
    .sort((a, b) => a.weekKey.localeCompare(b.weekKey));
}

// ─── Most Logged Exercises ──────────────────────────────────────────────────

export interface ExerciseFrequencyPoint {
  exerciseTitle: string;
  sessionCount: number; // distinct workout sessions the exercise appears in
}

/**
 * Ranks exercises by how many distinct workout sessions they appear in — i.e.
 * how often they're logged, regardless of how many sets logged per session.
 */
export function getMostLoggedExercises(
  workouts: (WorkoutSet & { id: string })[],
  limit = 10,
): ExerciseFrequencyPoint[] {
  const map = new Map<string, Set<string>>();

  workouts.forEach(w => {
    if (!map.has(w.exerciseTitle)) map.set(w.exerciseTitle, new Set());
    map.get(w.exerciseTitle)!.add(w.id);
  });

  return Array.from(map.entries())
    .map(([exerciseTitle, ids]) => ({ exerciseTitle, sessionCount: ids.size }))
    .sort((a, b) => b.sessionCount - a.sessionCount)
    .slice(0, limit);
}

// ─── Volume by Muscle Group ───────────────────────────────────────────────────

export interface MuscleGroupPoint {
  name: string;
  sets: number;
  reps: number;
  volumeKg: number;
}

export function getVolumeByMuscleGroup(
  workouts: WorkoutSet[],
  getMuscleGroup: (exerciseTitle: string) => string,
): MuscleGroupPoint[] {
  const map = new Map<string, MuscleGroupPoint>();

  workouts.forEach(w => {
    const group = getMuscleGroup(w.exerciseTitle);
    const existing = map.get(group) ?? { name: group, sets: 0, reps: 0, volumeKg: 0 };
    existing.sets += 1;
    existing.reps += w.reps;
    existing.volumeKg += w.weightKg * w.reps;
    map.set(group, existing);
  });

  return Array.from(map.values())
    .sort((a, b) => b.volumeKg - a.volumeKg)
    .filter(r => r.sets > 0);
}

// ─── Per-Exercise Session Metrics ─────────────────────────────────────────────

export type ExerciseMetric = 'volume' | 'est1rm' | 'bestSet' | 'heaviest';

export interface ExerciseSessionPoint {
  workoutId: string;
  date: Date;
  label: string;      // 'MMM d'   — x-axis ticks
  fullLabel: string;  // 'MMM d, yyyy' — tooltips
  volumeKg: number;   // Σ weight×reps across the exercise's sets that session
  est1rmKg: number;   // max over sets of weight×(1 + reps/30)  (Epley)
  bestSetKg: number;  // max over sets of weight×reps
  heaviestKg: number; // max weight lifted
}

/**
 * Aggregates one point per workout session for a (pre-filtered) single exercise,
 * tracking the four supported per-exercise metrics. Values stay in kg — callers
 * convert to lbs. Ordered chronologically.
 */
export function getExerciseSessions(
  workouts: (WorkoutSet & { id: string })[],
): ExerciseSessionPoint[] {
  const map = new Map<string, ExerciseSessionPoint>();

  workouts.forEach(w => {
    const existing = map.get(w.id) ?? {
      workoutId: w.id,
      date: w.startTime,
      label: format(w.startTime, 'MMM d'),
      fullLabel: format(w.startTime, 'MMM d, yyyy'),
      volumeKg: 0,
      est1rmKg: 0,
      bestSetKg: 0,
      heaviestKg: 0,
    };

    const setVolume = w.weightKg * w.reps;
    const est1rm = w.weightKg * (1 + w.reps / 30);

    existing.volumeKg += setVolume;
    existing.bestSetKg = Math.max(existing.bestSetKg, setVolume);
    existing.est1rmKg = Math.max(existing.est1rmKg, est1rm);
    existing.heaviestKg = Math.max(existing.heaviestKg, w.weightKg);

    // Keep the earliest startTime as the canonical session date
    if (w.startTime < existing.date) {
      existing.date = w.startTime;
      existing.label = format(w.startTime, 'MMM d');
      existing.fullLabel = format(w.startTime, 'MMM d, yyyy');
    }
    map.set(w.id, existing);
  });

  return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ─── Per-Set Points (one point per set, chronological) ────────────────────────

export interface ExerciseSetPoint {
  index: number;       // sequential position — used as the x value
  date: Date;
  dateLabel: string;   // 'MMM d, yyyy'
  reps: number;
  weightKg: number;    // kg — caller converts to display unit
  setType: string;
}

/**
 * One point per logged set for a (pre-filtered) single exercise, ordered
 * chronologically then by set index within a session. The incoming rows are
 * already flattened to one row per set, so this just sorts and shapes them.
 */
export function getExerciseSetPoints(
  workouts: (WorkoutSet & { id: string })[],
): ExerciseSetPoint[] {
  return workouts
    .slice()
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime() || a.setIndex - b.setIndex)
    .map((w, i) => ({
      index: i,
      date: w.startTime,
      dateLabel: format(w.startTime, 'MMM d, yyyy'),
      reps: w.reps,
      weightKg: w.weightKg,
      setType: w.setType,
    }));
}

// ─── Last logged session for an exercise ─────────────────────────────────────

export interface LastExerciseSet {
  weightKg: number;   // kg, as stored (callers strip bodyweight / convert units)
  reps: number;
  setType: string;
  setIndex: number;
}

export interface LastExerciseSession {
  date: Date;
  sets: LastExerciseSet[];
}

/**
 * Finds the most recent prior session that logged `exerciseTitle`, strictly
 * before `before` (defaults to now). Returns its sets ordered by set index,
 * or null when the exercise has no earlier history. Used by the logger to show
 * a "Last time" reference.
 */
export function getLastExerciseSession(
  workouts: (WorkoutSet & { id: string })[],
  exerciseTitle: string,
  before?: Date,
): LastExerciseSession | null {
  const cutoff = before ? before.getTime() : Date.now();
  const sessions = new Map<string, LastExerciseSession>();

  workouts.forEach(w => {
    if (w.exerciseTitle !== exerciseTitle) return;
    if (w.startTime.getTime() >= cutoff) return;
    const s = sessions.get(w.id) ?? { date: w.startTime, sets: [] };
    s.sets.push({ weightKg: w.weightKg, reps: w.reps, setType: w.setType, setIndex: w.setIndex });
    sessions.set(w.id, s);
  });

  let latest: LastExerciseSession | null = null;
  sessions.forEach(s => {
    if (!latest || s.date.getTime() > latest.date.getTime()) latest = s;
  });

  if (latest) (latest as LastExerciseSession).sets.sort((a, b) => (a.setIndex ?? 0) - (b.setIndex ?? 0));
  return latest;
}

// ─── Monthly Summary ──────────────────────────────────────────────────────────

export interface MonthlySummary {
  workoutCount: number;   // distinct workout sessions in the month
  runCount: number;       // runs in the month
  activityCount: number;  // workoutCount + runCount
  durationMin: number;    // summed session + run durations, in minutes
  volumeKg: number;       // Σ weight×reps across every set
  setCount: number;       // total sets logged
  runDistanceKm: number;  // Σ run distance
}

/**
 * Totals for the calendar month containing `monthAnchor` (1st → last day).
 * Duration sums each session once (sets share a session's start/end times),
 * plus run durations. Runs also contribute to the activity count and distance.
 */
export function getMonthlySummary(
  workouts: (WorkoutSet & { id: string })[],
  monthAnchor: Date,
  runs: ActivityRun[] = [],
): MonthlySummary {
  const start = startOfMonth(monthAnchor);
  const end   = endOfMonth(monthAnchor);

  const sessions = new Set<string>();
  const sessionDurSec = new Map<string, number>();
  let volumeKg = 0;
  let setCount = 0;

  workouts.forEach(w => {
    if (w.startTime < start || w.startTime > end) return;
    sessions.add(w.id);
    volumeKg += w.weightKg * w.reps;
    setCount += 1;
    if (!sessionDurSec.has(w.id)) {
      const sec = w.endTime ? Math.max(0, (w.endTime.getTime() - w.startTime.getTime()) / 1000) : 0;
      sessionDurSec.set(w.id, sec);
    }
  });

  let durationSec = 0;
  sessionDurSec.forEach(s => { durationSec += s; });

  let runCount = 0;
  let runDistanceKm = 0;
  runs.forEach(r => {
    if (r.startTime < start || r.startTime > end) return;
    runCount += 1;
    runDistanceKm += r.distanceKm;
    durationSec += r.durationSeconds;
  });

  return {
    workoutCount: sessions.size,
    runCount,
    activityCount: sessions.size + runCount,
    durationMin: Math.round(durationSec / 60),
    volumeKg,
    setCount,
    runDistanceKm: Math.round(runDistanceKm * 100) / 100,
  };
}

export interface MonthlyPoint extends MonthlySummary {
  monthKey: string; // 'yyyy-MM' — sortable
  label: string;    // 'MMM yy'
}

/**
 * One point per calendar month that has data, chronological — for charting a
 * metric across months. Single pass; dedupes session duration by id.
 */
export function getMonthlySeries(
  workouts: (WorkoutSet & { id: string })[],
  runs: ActivityRun[] = [],
): MonthlyPoint[] {
  interface Acc {
    date: Date;
    sessions: Set<string>;
    durSec: Map<string, number>;
    volumeKg: number;
    setCount: number;
    runCount: number;
    runDistanceKm: number;
    runDurSec: number;
  }
  const map = new Map<string, Acc>();

  const ensure = (date: Date): Acc => {
    const key = format(date, 'yyyy-MM');
    let e = map.get(key);
    if (!e) {
      e = { date: startOfMonth(date), sessions: new Set(), durSec: new Map(), volumeKg: 0, setCount: 0, runCount: 0, runDistanceKm: 0, runDurSec: 0 };
      map.set(key, e);
    }
    return e;
  };

  workouts.forEach(w => {
    const e = ensure(w.startTime);
    e.sessions.add(w.id);
    e.volumeKg += w.weightKg * w.reps;
    e.setCount += 1;
    if (!e.durSec.has(w.id)) {
      const sec = w.endTime ? Math.max(0, (w.endTime.getTime() - w.startTime.getTime()) / 1000) : 0;
      e.durSec.set(w.id, sec);
    }
  });

  runs.forEach(r => {
    const e = ensure(r.startTime);
    e.runCount += 1;
    e.runDistanceKm += r.distanceKm;
    e.runDurSec += r.durationSeconds;
  });

  return Array.from(map.entries())
    .map(([monthKey, e]) => {
      let durationSec = e.runDurSec;
      e.durSec.forEach(s => { durationSec += s; });
      return {
        monthKey,
        label: format(e.date, 'MMM yy'),
        workoutCount: e.sessions.size,
        runCount: e.runCount,
        activityCount: e.sessions.size + e.runCount,
        durationMin: Math.round(durationSec / 60),
        volumeKg: e.volumeKg,
        setCount: e.setCount,
        runDistanceKm: Math.round(e.runDistanceKm * 100) / 100,
      };
    })
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
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
  runs: ActivityRun[] = [],
): WeeklyMetricPoint[] {
  // For 'sets' we need to count per-session unique sets, not raw rows (each row IS one set).
  // For 'duration' we want total minutes of unique sessions (not per-set duplication),
  // plus run durations. 'distance' comes entirely from runs.
  const map     = new Map<string, WeeklyMetricPoint>();
  const sessDur = new Map<string, { weekKey: string; durationSec: number }>();

  const ensure = (date: Date): string => {
    const wk = getWeekKey(date);
    if (!map.has(wk)) map.set(wk, { weekKey: wk, label: getWeekLabel(date), value: 0 });
    return wk;
  };

  workouts.forEach(w => {
    const wk = ensure(w.startTime);
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

  if (metric === 'duration') {
    sessDur.forEach(({ weekKey, durationSec }) => { map.get(weekKey)!.value += durationSec; });
    runs.forEach(r => { map.get(ensure(r.startTime))!.value += r.durationSeconds; });
    map.forEach(pt => { pt.value = Math.round(pt.value / 60); }); // seconds → minutes
  } else if (metric === 'distance') {
    runs.forEach(r => { map.get(ensure(r.startTime))!.value += r.distanceKm; });
    map.forEach(pt => { pt.value = Math.round(pt.value * 100) / 100; });
  } else if (metric === 'volume') {
    // Leave as-is; caller converts kg→lbs if needed
  } else {
    // reps / sets are already integers — round to be safe
    map.forEach(pt => { pt.value = Math.round(pt.value); });
  }

  return Array.from(map.values()).sort((a, b) => a.weekKey.localeCompare(b.weekKey));
}
