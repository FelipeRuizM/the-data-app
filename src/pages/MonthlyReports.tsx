import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Trophy, Lock, Activity, Dumbbell, Footprints, HeartPulse, Flame } from 'lucide-react';
import { startOfMonth, addMonths, subMonths, format, isSameMonth } from 'date-fns';
import { Card } from '../components/common/Card';
import { useSettings } from '../context/SettingsContext';
import { useRuns, type Run, type RunType } from '../hooks/useRuns';
import { getMonthlySummary, getMonthlySeries } from '../utils/workoutUtils';
import { formatDuration } from '../utils/runFormat';
import { computePRAchievements, estimateOneRM, type PRAchievement, type PRType } from '../utils/prEngine';
import { PR_TYPES } from '../utils/workoutDisplay';
import { WorkoutCalendar } from '../components/analytics/WorkoutCalendar';
import { MuscleRadarChart } from '../components/analytics/MuscleRadarChart';
import { MuscleSetCountChart } from '../components/analytics/MuscleSetCountChart';
import { MainExercises } from '../components/analytics/MainExercises';
import { MonthlyTrendChart } from '../components/analytics/MonthlyTrendChart';
import { SectionHeader } from '../components/common/SectionHeader';
import type { TaggedWorkout } from '../hooks/useWorkouts';
import './MonthlyReports.css';

interface Props {
  workouts: TaggedWorkout[];
}

const fmtVolume = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
  : v >= 1000    ? `${(v / 1000).toFixed(1)}k`
  : String(v);

const fmtDuration = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const fmtInt = (n: number) => String(n);

const fmtKm = (n: number) => `${(Math.round(n * 10) / 10).toLocaleString()}`;

const fmtHr = (n: number) => (n > 0 ? String(n) : '—');

const fmtPace = (sec: number) => (sec > 0 ? formatDuration(sec) : '—');

type Dir = 'up' | 'down' | 'flat';

/**
 * Compares this month to last; returns the change amount + percent (no label).
 * `invert` flips the up/down direction for metrics where lower is better (pace).
 */
function compare(cur: number, prev: number, fmt: (n: number) => string, invert = false): { dir: Dir; amount: string; pct: string } {
  const diff = cur - prev;
  if (diff === 0) return { dir: 'flat', amount: '—', pct: '' };
  if (prev === 0) return { dir: 'up', amount: fmt(cur), pct: 'new' };
  let dir: Dir = diff > 0 ? 'up' : 'down';
  if (invert) dir = dir === 'up' ? 'down' : 'up';
  return { dir, amount: fmt(Math.abs(diff)), pct: `${Math.abs(Math.round((diff / prev) * 100))}%` };
}

const StatCard: React.FC<{
  label: string;
  cur: number;
  prev: number;
  fmt: (n: number) => string;
  unit?: string;
  sub?: React.ReactNode;
  invertTrend?: boolean;
}> = ({ label, cur, prev, fmt, unit, sub, invertTrend }) => {
  const c = compare(cur, prev, fmt, invertTrend);
  return (
    <Card className="mr-card">
      <span className="mr-card-label">{label}</span>
      <div className="mr-card-value-row">
        <span className="mr-card-value">{fmt(cur)}</span>
        {unit && <span className="mr-card-unit">{unit}</span>}
      </div>
      {sub && <div className="mr-card-sub">{sub}</div>}
      <div className={`mr-trend mr-trend--${c.dir}`}>
        <span className="mr-trend-arrow">{c.dir === 'up' ? '▲' : c.dir === 'down' ? '▼' : '—'}</span>
        {c.amount !== '—' && <span className="mr-trend-amount">{c.amount}</span>}
        {c.pct && <span className="mr-trend-pct">({c.pct})</span>}
      </div>
    </Card>
  );
};

// ── Records section: PRs broken in the selected month ─────────
const RECORD_ORDER: PRType[] = ['weight', 'oneRM', 'volume'];

/** The achieved value for a given record type, in kg. */
const recordValueKg = (a: PRAchievement, type: PRType): number =>
  type === 'weight' ? a.weightKg
  : type === 'volume' ? a.weightKg * a.reps
  : estimateOneRM(a.weightKg, a.reps);

const RecordsSection: React.FC<{ workouts: TaggedWorkout[]; month: Date }> = ({ workouts, month }) => {
  const { unit } = useSettings();
  const multiplier = unit === 'lbs' ? 2.20462 : 1;

  const summary = useMemo(() => {
    const monthPRs = computePRAchievements(workouts).filter(a => isSameMonth(a.date, month));

    // For each exercise + type, keep only the heaviest achievement.
    const best = new Map<string, Map<PRType, PRAchievement>>();
    monthPRs.forEach(a => {
      RECORD_ORDER.forEach(type => {
        if (!a[type]) return;
        const perType = best.get(a.exerciseTitle) ?? new Map<PRType, PRAchievement>();
        const cur = perType.get(type);
        if (!cur || recordValueKg(a, type) > recordValueKg(cur, type)) perType.set(type, a);
        best.set(a.exerciseTitle, perType);
      });
    });

    const totals: Record<PRType, number> = { weight: 0, volume: 0, oneRM: 0 };
    const rows = Array.from(best.entries())
      .map(([exerciseTitle, perType]) => {
        const records = RECORD_ORDER.filter(t => perType.has(t)).map(type => ({ type, a: perType.get(type)! }));
        records.forEach(r => { totals[r.type] += 1; });
        return { exerciseTitle, records };
      })
      .sort((a, b) => b.records.length - a.records.length || a.exerciseTitle.localeCompare(b.exerciseTitle));

    const total = totals.weight + totals.volume + totals.oneRM;
    return { total, totals, rows };
  }, [workouts, month]);

  const typeChip = (type: PRType, count: number) => {
    const meta = PR_TYPES.find(t => t.key === type)!;
    const Icon = meta.icon;
    return (
      <span
        key={type}
        title={meta.description}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          background: `${meta.color}1F`, color: meta.color,
          border: `1px solid ${meta.color}59`, borderRadius: '999px',
          padding: '3px 10px', fontSize: '12px', fontWeight: 700, fontFamily: 'Inter',
        }}
      >
        <Icon size={13} /> {meta.label} ×{count}
      </span>
    );
  };

  const recordLine = (type: PRType, a: PRAchievement) => {
    const meta = PR_TYPES.find(t => t.key === type)!;
    const Icon = meta.icon;
    const value = Math.round(recordValueKg(a, type) * multiplier);
    const setWeight = Math.round(a.weightKg * multiplier);
    return (
      <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'Inter', fontSize: '13px', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: meta.color, fontWeight: 700, minWidth: '74px' }}>
          <Icon size={14} /> {meta.label}
        </span>
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
          {value.toLocaleString()} {unit}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>
          {setWeight.toLocaleString()} {unit} × {a.reps} reps
        </span>
      </div>
    );
  };

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: summary.total > 0 ? '20px' : '0' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
          background: 'rgba(255,196,0,0.12)', border: '1px solid rgba(255,196,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Trophy size={22} color="#FFC400" />
        </div>
        <div>
          <h3 style={{ fontFamily: 'Outfit', margin: 0, fontSize: '18px' }}>Records</h3>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'Inter' }}>
            {summary.total > 0
              ? `${summary.total} personal record${summary.total > 1 ? 's' : ''} broken this month`
              : 'No personal records broken this month'}
          </span>
        </div>
      </div>

      {summary.total > 0 && (
        <>
          {/* Totals by type */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
            {RECORD_ORDER.filter(k => summary.totals[k] > 0).map(k => typeChip(k, summary.totals[k]))}
          </div>

          {/* Per-exercise breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {summary.rows.map(row => (
              <div
                key={row.exerciseTitle}
                style={{
                  display: 'flex', flexDirection: 'column', gap: '10px',
                  padding: '14px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <span style={{ fontFamily: 'Outfit', fontSize: '15px', fontWeight: 600 }}>
                  {row.exerciseTitle}
                </span>
                {row.records.map(r => recordLine(r.type, r.a))}
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
};

// ── Compact list of the runs logged in the selected month ─────────────────────
const RUN_TYPE_COLORS: Record<RunType, string> = {
  Light: '#4ADE80',
  Explosion: '#FB7185',
  Long: '#60A5FA',
  Other: '#A78BFA',
};

const MonthRunList: React.FC<{ runs: Run[] }> = ({ runs }) => {
  if (runs.length === 0) {
    return <div className="mr-run-empty">No runs logged this month.</div>;
  }
  return (
    <Card>
      <div className="mr-run-list">
        {runs.map(run => (
          <div key={run.id} className="mr-run-row" style={{ borderLeft: `3px solid ${RUN_TYPE_COLORS[run.type]}` }}>
            <div className="mr-run-row-head">
              <Footprints size={15} style={{ color: RUN_TYPE_COLORS[run.type], flexShrink: 0 }} />
              <span className="mr-run-title">{run.title || 'Run'}</span>
              <span
                className="mr-run-type"
                style={{ color: RUN_TYPE_COLORS[run.type], border: `1px solid ${RUN_TYPE_COLORS[run.type]}55` }}
              >
                {run.type}
              </span>
              <span className="mr-run-date">{format(run.startTime, 'd MMM, HH:mm')}</span>
            </div>
            <div className="mr-run-metrics">
              <span>{run.distanceKm.toFixed(2)} km</span>
              <span>{formatDuration(run.durationSeconds)}</span>
              {run.pace && <span>{run.pace}</span>}
              {run.elevationGainM > 0 && <span>↑ {run.elevationGainM} m</span>}
              {run.avgHeartRate > 0 && (
                <span className="mr-run-metric-icon"><HeartPulse size={12} style={{ color: '#FB7185' }} /> {run.avgHeartRate} bpm</span>
              )}
              {run.calories > 0 && (
                <span className="mr-run-metric-icon"><Flame size={12} style={{ color: '#F59E0B' }} /> {run.calories.toLocaleString()} kcal</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export const MonthlyReports: React.FC<Props> = ({ workouts }) => {
  const { unit } = useSettings();
  const { runs } = useRuns();
  const multiplier = unit === 'lbs' ? 2.20462 : 1;

  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [unlocked, setUnlocked] = useState(false);
  const isCurrentMonth = isSameMonth(month, new Date());
  const locked = isCurrentMonth && !unlocked;
  const monthKey = format(month, 'yyyy-MM');
  const unlockDate = format(startOfMonth(addMonths(month, 1)), 'MMM d');

  const cur    = useMemo(() => getMonthlySummary(workouts, month, runs), [workouts, runs, month]);
  const prev   = useMemo(() => getMonthlySummary(workouts, subMonths(month, 1), runs), [workouts, runs, month]);
  const series = useMemo(() => getMonthlySeries(workouts, runs), [workouts, runs]);
  const monthWorkouts = useMemo(
    () => workouts.filter(w => isSameMonth(w.startTime, month)),
    [workouts, month],
  );
  const monthRuns = useMemo(
    () => runs
      .filter(r => isSameMonth(r.startTime, month))
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime()),
    [runs, month],
  );

  // Only surface the Workouts / Runs sections when that activity type is
  // relevant this month or last (so the comparison cards mean something).
  const showWorkouts = cur.workoutCount > 0 || prev.workoutCount > 0;
  const showRuns     = cur.runCount > 0 || prev.runCount > 0;

  const curVol  = Math.round(cur.volumeKg * multiplier);
  const prevVol = Math.round(prev.volumeKg * multiplier);

  const curAvgVol  = cur.workoutCount  ? Math.round(curVol / cur.workoutCount)   : 0;
  const prevAvgVol = prev.workoutCount ? Math.round(prevVol / prev.workoutCount) : 0;
  const curAvgDur  = cur.activityCount  ? Math.round(cur.durationMin / cur.activityCount)   : 0;
  const prevAvgDur = prev.activityCount ? Math.round(prev.durationMin / prev.activityCount) : 0;

  // Small breakdown of the combined Duration into lifting vs running.
  const durationParts = [
    cur.workoutDurationMin > 0 ? `${fmtDuration(cur.workoutDurationMin)} lifting` : null,
    cur.runDurationMin > 0 ? `${fmtDuration(cur.runDurationMin)} running` : null,
  ].filter(Boolean);
  const durationBreakdown = durationParts.length > 0 ? durationParts.join(' · ') : null;

  return (
    <div className="mr-page" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className="mr-header">
        <h2 className="mr-title">Monthly Reports</h2>
        <div className="mr-month-nav">
          <button className="mr-nav-btn" onClick={() => setMonth(m => subMonths(m, 1))} aria-label="Previous month">
            <ChevronLeft size={18} />
          </button>
          <span className="mr-month-label">{format(month, 'MMMM yyyy')}</span>
          <button
            className="mr-nav-btn"
            onClick={() => setMonth(m => addMonths(m, 1))}
            disabled={isCurrentMonth}
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        {isCurrentMonth && unlocked && (
          <button className="mr-lock-btn mr-lock-btn--small" onClick={() => setUnlocked(false)}>
            <Lock size={13} /> Lock report
          </button>
        )}
      </div>

      <div className="mr-locked-region">
      <div className={`mr-body${locked ? ' mr-body--locked' : ''}`}>
        {cur.activityCount === 0 ? (
          <div className="mr-empty">No activities logged in {format(month, 'MMMM yyyy')}.</div>
        ) : (
          <>
            {/* ─────────────── ACTIVITIES (workouts + runs combined) ─────────────── */}
            <SectionHeader icon={Activity} title="Activities" subtitle="Workouts and runs combined" color="#A78BFA" compact />
            <div className="mr-grid">
              <StatCard label="Activities" cur={cur.activityCount} prev={prev.activityCount} fmt={fmtInt} />
              <StatCard
                label="Duration"
                cur={cur.durationMin}
                prev={prev.durationMin}
                fmt={fmtDuration}
                sub={durationBreakdown}
              />
              <StatCard label="Avg Session Time" cur={curAvgDur} prev={prevAvgDur} fmt={fmtDuration} />
              <StatCard label="Avg Heart Rate"   cur={cur.avgHeartRate} prev={prev.avgHeartRate} fmt={fmtHr} unit="bpm" />
            </div>
            <div className="mr-section">
              <MonthlyTrendChart series={series} selectedMonthKey={monthKey} />
            </div>
            <div className="mr-section">
              <WorkoutCalendar workouts={workouts} runs={runs} month={month} />
            </div>

            {/* ─────────────── WORKOUTS (strength training) ─────────────── */}
            {showWorkouts && (
              <>
                <SectionHeader icon={Dumbbell} title="Workouts" subtitle="Strength training" color="#FF2E93" />
                <div className="mr-grid">
                  <StatCard label="Volume"     cur={curVol}        prev={prevVol}        fmt={fmtVolume} unit={unit} />
                  <StatCard label="Total Reps" cur={cur.repsTotal} prev={prev.repsTotal} fmt={fmtInt} />
                  <StatCard label="Sets"       cur={cur.setCount}  prev={prev.setCount}  fmt={fmtInt} />
                  <StatCard label="Avg Volume / Session" cur={curAvgVol} prev={prevAvgVol} fmt={fmtVolume} unit={unit} />
                </div>
                {monthWorkouts.length > 0 ? (
                  <>
                    <div className="mr-row">
                      <MuscleRadarChart workouts={monthWorkouts} />
                      <MuscleSetCountChart workouts={monthWorkouts} />
                    </div>
                    <div className="mr-section">
                      <MainExercises workouts={monthWorkouts} />
                    </div>
                  </>
                ) : (
                  <div className="mr-empty">No workouts logged in {format(month, 'MMMM yyyy')}.</div>
                )}
                <div className="mr-section">
                  <RecordsSection workouts={workouts} month={month} />
                </div>
              </>
            )}

            {/* ─────────────── RUNS (running) ─────────────── */}
            {showRuns && (
              <>
                <SectionHeader icon={Footprints} title="Runs" subtitle="Running" color="#4ADE80" />
                <div className="mr-grid">
                  <StatCard label="Distance"  cur={cur.runDistanceKm}  prev={prev.runDistanceKm}  fmt={fmtKm} unit="km" />
                  <StatCard label="Avg Pace"  cur={cur.paceSec}        prev={prev.paceSec}        fmt={fmtPace} unit="/km" invertTrend />
                  <StatCard label="Elevation" cur={cur.elevationGainM} prev={prev.elevationGainM} fmt={fmtInt} unit="m" />
                  <StatCard label="Calories"  cur={cur.caloriesTotal}  prev={prev.caloriesTotal}  fmt={fmtInt} unit="kcal" />
                </div>
                <div className="mr-section">
                  <MonthRunList runs={monthRuns} />
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Current month stays locked until it ends — unlock anyway if you want */}
      {locked && (
        <div className="mr-lock-overlay">
          <div className="mr-lock-card">
            <Lock size={30} />
            <h3 className="mr-lock-title">This month is still in progress</h3>
            <p className="mr-lock-text">Your {format(month, 'MMMM')} report unlocks on {unlockDate}.</p>
            <button className="mr-lock-btn" onClick={() => setUnlocked(true)}>Unlock anyway</button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
