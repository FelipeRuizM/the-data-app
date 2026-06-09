import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { subDays, subYears, startOfWeek, subWeeks, format } from 'date-fns';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { DynamicMetricChart } from '../components/analytics/DynamicMetricChart';
import { FrequencyChart } from '../components/analytics/FrequencyChart';
import { WorkoutCalendar } from '../components/analytics/WorkoutCalendar';
import { MuscleRadarChart } from '../components/analytics/MuscleRadarChart';
import { MainExercises } from '../components/analytics/MainExercises';
import { MuscleSetCountChart } from '../components/analytics/MuscleSetCountChart';
import { useSettings } from '../context/SettingsContext';
import { useExercises } from '../context/ExercisesContext';
import { useRuns } from '../hooks/useRuns';
import { groupWorkoutSessions } from '../utils/sessions';
import {
  applyChartFilters,
  MUSCLE_GROUPS,
  type ChartFilters,
} from '../utils/workoutUtils';
import type { TaggedWorkout } from '../hooks/useWorkouts';
import './Analytics.css';

const fmtDuration = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

type TimeRange = '30d' | '90d' | '180d' | '1y' | 'All';

interface Props {
  workouts: TaggedWorkout[];
}

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: '30d',  label: '30D'  },
  { key: '90d',  label: '90D'  },
  { key: '180d', label: '180D' },
  { key: '1y',   label: '1Y'   },
  { key: 'All',  label: 'All'  },
];

const CATEGORIES = ['Push', 'Pull', 'Legs', 'Mixed'];

function getDateCutoff(range: TimeRange): Date | null {
  const now = new Date();
  if (range === '30d')  return subDays(now, 30);
  if (range === '90d')  return subDays(now, 90);
  if (range === '180d') return subDays(now, 180);
  if (range === '1y')   return subYears(now, 1);
  return null;
}

function activeFilterCount(f: ChartFilters): number {
  return (f.categories.length > 0 ? 1 : 0) + (f.muscleGroup ? 1 : 0) + (f.exercise ? 1 : 0);
}

// ── Searchable exercise dropdown ──────────────────────────────────────────────

const ExercisePicker: React.FC<{
  exercises: string[];
  value: string;
  onChange: (v: string) => void;
}> = ({ exercises, value, onChange }) => {
  const [query, setQuery]     = useState(value);
  const [open, setOpen]       = useState(false);
  const ref                   = useRef<HTMLDivElement>(null);

  // Keep query in sync when value is cleared externally
  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? exercises.filter(e => e.toLowerCase().includes(q)) : exercises;
  }, [exercises, query]);

  return (
    <div className="adv-ex-picker" ref={ref}>
      <div className="adv-ex-input-wrap">
        <input
          className="adv-input"
          placeholder="Search exercise…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {value && (
          <button className="adv-ex-clear" onClick={() => { onChange(''); setQuery(''); }}>
            <X size={12} />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="adv-ex-dropdown">
          {filtered.slice(0, 80).map(ex => (
            <div
              key={ex}
              className={`adv-ex-option ${value === ex ? 'adv-ex-option--active' : ''}`}
              onMouseDown={e => { e.preventDefault(); onChange(ex); setQuery(ex); setOpen(false); }}
            >
              {ex}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export const Analytics: React.FC<Props> = ({ workouts }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [timeRange, setTimeRange]   = useState<TimeRange>('90d');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters]       = useState<ChartFilters>({
    categories: [],
    muscleGroup: '',
    exercise: '',
  });
  const { unit } = useSettings();
  const { getMuscleGroup } = useExercises();
  const { runs } = useRuns();

  // ── Unique exercise list for the picker ──────────────────────────────────
  const uniqueExercises = useMemo<string[]>(() => {
    const s = new Set(workouts.map(w => w.exerciseTitle));
    return Array.from(s).sort();
  }, [workouts]);

  // ── Catch incoming deep-links from Trophy Room ───────────────────────────
  // e.g. /analytics?exercise=Bench+Press&timeframe=all
  useEffect(() => {
    const incomingExercise  = searchParams.get('exercise');
    const incomingTimeframe = searchParams.get('timeframe');
    if (!incomingExercise && !incomingTimeframe) return;

    if (incomingTimeframe) {
      const normalized = incomingTimeframe.toLowerCase();
      const match = TIME_RANGES.find(t => t.key.toLowerCase() === normalized);
      if (match) setTimeRange(match.key);
    }

    if (incomingExercise) {
      // Try to match against the actual exercise catalog so the chart picker
      // (which compares titles strictly) locks onto a real entry.
      const exactMatch =
        uniqueExercises.find(e => e.toLowerCase() === incomingExercise.toLowerCase()) ??
        uniqueExercises.find(e => e.toLowerCase().includes(incomingExercise.toLowerCase())) ??
        incomingExercise;

      setFilters(f => ({ ...f, exercise: exactMatch, muscleGroup: '' }));
      setFiltersOpen(true);
    }

    // Consume the params so a later manual filter change / refresh doesn't
    // keep re-applying them.
    const next = new URLSearchParams(searchParams);
    next.delete('exercise');
    next.delete('timeframe');
    setSearchParams(next, { replace: true });
  }, [searchParams, uniqueExercises, setSearchParams]);

  // ── Date-filtered slice ──────────────────────────────────────────────────
  const rangeStart = useMemo(() => getDateCutoff(timeRange), [timeRange]);
  // Stable "now" — only refreshes when the time range changes, so charts don't
  // recompute on every parent re-render.
  const rangeEnd   = useMemo(() => new Date(), [timeRange]);

  const dateFiltered = useMemo(() => {
    if (!rangeStart) return workouts;
    return workouts.filter(w => w.startTime >= rangeStart);
  }, [workouts, rangeStart]);

  // ── Fully filtered slice (date + advanced) ───────────────────────────────
  const filteredWorkouts = useMemo(
    () => applyChartFilters(dateFiltered, filters, getMuscleGroup),
    [dateFiltered, filters, getMuscleGroup],
  );

  // ── Runs sliced to the active time range (runs have no category/muscle/
  //    exercise to filter on, so they respect the time range only). ──────────
  const rangeRuns = useMemo(
    () => (rangeStart ? runs.filter(r => r.startTime >= rangeStart) : runs),
    [runs, rangeStart],
  );

  // ── Combined overview totals (lifts + runs), honoring the active filters. ──
  const overall = useMemo(() => {
    const sessions = groupWorkoutSessions(filteredWorkouts);
    const liftSeconds = sessions.reduce((s, x) => s + x.durSeconds, 0);
    const runSeconds = rangeRuns.reduce((s, r) => s + r.durationSeconds, 0);
    return {
      count: sessions.length + rangeRuns.length,
      minutes: Math.round((liftSeconds + runSeconds) / 60),
    };
  }, [filteredWorkouts, rangeRuns]);

  // ── Key metrics ──────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const multiplier   = unit === 'lbs' ? 2.20462 : 1;
    const sessions     = new Set(filteredWorkouts.map(w => w.id));
    const totalVolumeKg = filteredWorkouts.reduce((s, w) => s + w.weightKg * w.reps, 0);
    const totalReps    = filteredWorkouts.reduce((s, w) => s + w.reps, 0);
    return {
      totalWorkouts: sessions.size,
      totalVolume:   Math.round(totalVolumeKg * multiplier),
      avgReps:       filteredWorkouts.length > 0 ? Math.round(totalReps / filteredWorkouts.length) : 0,
    };
  }, [filteredWorkouts, unit]);

  const fmtVolume = (v: number) =>
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
    : v >= 1000    ? `${(v / 1000).toFixed(1)}k`
    : String(v);

  // ── Weekly streak (all-time, consecutive active weeks ending at the most
  //    recent workout's week) ──────────────────────────────────────────────
  const streak = useMemo(() => {
    if (workouts.length === 0) return 0;
    const WEEK_OPTS = { weekStartsOn: 0 as const };
    const weeks = new Set<string>();
    let latest = 0;
    workouts.forEach(w => {
      weeks.add(format(startOfWeek(w.startTime, WEEK_OPTS), 'yyyy-MM-dd'));
      latest = Math.max(latest, w.startTime.getTime());
    });
    let count = 0;
    let cursor = startOfWeek(new Date(latest), WEEK_OPTS);
    while (weeks.has(format(cursor, 'yyyy-MM-dd'))) {
      count++;
      cursor = subWeeks(cursor, 1);
    }
    return count;
  }, [workouts]);

  // ── Filter helpers ───────────────────────────────────────────────────────
  const toggleCategory = (cat: string) =>
    setFilters(f => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter(c => c !== cat)
        : [...f.categories, cat],
    }));

  const clearFilters = () => setFilters({ categories: [], muscleGroup: '', exercise: '' });

  const activeCount = activeFilterCount(filters);

  return (
    <div className="analytics-page" style={{ animation: 'fadeIn 0.5s ease-out' }}>

      {/* ── Header row ─────────────────────────────────────────── */}
      <div className="analytics-header">
        <h2 className="analytics-title">Analytics</h2>

        <div className="analytics-header-controls">
          {/* Time range pills */}
          <div className="analytics-time-selector">
            {TIME_RANGES.map(({ key, label }) => (
              <button
                key={key}
                className={`time-range-btn ${timeRange === key ? 'active' : ''}`}
                onClick={() => setTimeRange(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Advanced filters toggle */}
          <button
            className={`adv-toggle-btn ${filtersOpen ? 'adv-toggle-btn--open' : ''} ${activeCount > 0 ? 'adv-toggle-btn--active' : ''}`}
            onClick={() => setFiltersOpen(v => !v)}
          >
            <SlidersHorizontal size={14} />
            <span>Filters</span>
            {activeCount > 0 && <span className="adv-badge">{activeCount}</span>}
            <ChevronDown size={12} className={`adv-chevron ${filtersOpen ? 'adv-chevron--open' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Advanced filter panel ───────────────────────────────── */}
      {filtersOpen && (
        <div className="adv-panel glass-panel">
          <div className="adv-panel-inner">

            {/* Category multi-select */}
            <div className="adv-group">
              <span className="adv-label">Category</span>
              <div className="adv-cat-pills">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    className={`adv-cat-pill ${filters.categories.includes(cat) ? 'adv-cat-pill--active' : ''}`}
                    onClick={() => toggleCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Muscle group dropdown */}
            <div className="adv-group">
              <span className="adv-label">Muscle Group</span>
              <div className="adv-select-wrap">
                <select
                  className="adv-select"
                  value={filters.muscleGroup}
                  disabled={!!filters.exercise}
                  onChange={e => setFilters(f => ({ ...f, muscleGroup: e.target.value, exercise: '' }))}
                >
                  <option value="">All muscles</option>
                  {MUSCLE_GROUPS.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="adv-select-icon" />
              </div>
            </div>

            {/* Exercise isolation picker */}
            <div className="adv-group">
              <span className="adv-label">Exercise Isolation</span>
              <ExercisePicker
                exercises={uniqueExercises}
                value={filters.exercise}
                onChange={ex => setFilters(f => ({ ...f, exercise: ex, muscleGroup: '' }))}
              />
            </div>

            {/* Clear all */}
            {activeCount > 0 && (
              <button className="adv-clear-btn" onClick={clearFilters}>
                <X size={12} /> Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Key Metrics ────────────────────────────────────────── */}
      <div className="analytics-metrics-row">
        <div className="analytics-metric-card glass-panel">
          <span className="metric-label">Total Activities</span>
          <span className="metric-value">{overall.count.toLocaleString()}</span>
        </div>
        <div className="analytics-metric-card glass-panel">
          <span className="metric-label">Total Time</span>
          <span className="metric-value">{fmtDuration(overall.minutes)}</span>
        </div>
        <div className="analytics-metric-card glass-panel">
          <span className="metric-label">Total Volume</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span className="metric-value">{fmtVolume(metrics.totalVolume)}</span>
            <span className="metric-unit">{unit.toUpperCase()}</span>
          </div>
        </div>
        <div className="analytics-metric-card glass-panel">
          <span className="metric-label">Avg Reps / Set</span>
          <span className="metric-value">{metrics.avgReps}</span>
        </div>
        <div className="analytics-metric-card glass-panel">
          <span className="metric-label">Weekly Streak</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="metric-value">
              <span role="img" aria-label="streak" style={{ marginRight: '4px' }}>🔥</span>{streak}
            </span>
            <span className="metric-unit">{streak === 1 ? 'WEEK' : 'WEEKS'}</span>
          </div>
        </div>
      </div>

      {/* ── Calendar + Muscle Split (hidden when isolating a single exercise) ── */}
      {!filters.exercise && (
        <div className="analytics-calendar-row">
          <WorkoutCalendar workouts={workouts} runs={runs} />
          <MuscleRadarChart workouts={filteredWorkouts} />
        </div>
      )}

      {/* ── Charts Grid ────────────────────────────────────────── */}
      <div className="analytics-charts-grid">
        <DynamicMetricChart
          workouts={filteredWorkouts}
          runs={filters.exercise ? [] : rangeRuns}
          fillGaps
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
        />
        <FrequencyChart
          workouts={filteredWorkouts}
          runs={filters.exercise ? [] : rangeRuns}
          fillGaps
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
        />
        {!filters.exercise && <MainExercises workouts={filteredWorkouts} />}
        {!filters.exercise && <MuscleSetCountChart workouts={filteredWorkouts} />}
      </div>

    </div>
  );
};
