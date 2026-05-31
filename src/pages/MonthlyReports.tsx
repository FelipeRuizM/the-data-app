import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { startOfMonth, addMonths, subMonths, format, isSameMonth } from 'date-fns';
import { Card } from '../components/common/Card';
import { useSettings } from '../context/SettingsContext';
import { getMonthlySummary, getMonthlySeries } from '../utils/workoutUtils';
import { WorkoutCalendar } from '../components/analytics/WorkoutCalendar';
import { MuscleRadarChart } from '../components/analytics/MuscleRadarChart';
import { MuscleSetCountChart } from '../components/analytics/MuscleSetCountChart';
import { MainExercises } from '../components/analytics/MainExercises';
import { MonthlyTrendChart } from '../components/analytics/MonthlyTrendChart';
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

type Dir = 'up' | 'down' | 'flat';

/** Compares this month to last; returns the change amount + percent (no label). */
function compare(cur: number, prev: number, fmt: (n: number) => string): { dir: Dir; amount: string; pct: string } {
  const diff = cur - prev;
  if (diff === 0) return { dir: 'flat', amount: '—', pct: '' };
  if (prev === 0) return { dir: 'up', amount: fmt(cur), pct: 'new' };
  const dir: Dir = diff > 0 ? 'up' : 'down';
  return { dir, amount: fmt(Math.abs(diff)), pct: `${Math.abs(Math.round((diff / prev) * 100))}%` };
}

const StatCard: React.FC<{
  label: string;
  cur: number;
  prev: number;
  fmt: (n: number) => string;
  unit?: string;
}> = ({ label, cur, prev, fmt, unit }) => {
  const c = compare(cur, prev, fmt);
  return (
    <Card className="mr-card">
      <span className="mr-card-label">{label}</span>
      <div className="mr-card-value-row">
        <span className="mr-card-value">{fmt(cur)}</span>
        {unit && <span className="mr-card-unit">{unit}</span>}
      </div>
      <div className={`mr-trend mr-trend--${c.dir}`}>
        <span className="mr-trend-arrow">{c.dir === 'up' ? '▲' : c.dir === 'down' ? '▼' : '—'}</span>
        {c.amount !== '—' && <span className="mr-trend-amount">{c.amount}</span>}
        {c.pct && <span className="mr-trend-pct">({c.pct})</span>}
      </div>
    </Card>
  );
};

export const MonthlyReports: React.FC<Props> = ({ workouts }) => {
  const { unit } = useSettings();
  const multiplier = unit === 'lbs' ? 2.20462 : 1;

  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()));
  const isCurrentMonth = isSameMonth(month, new Date());
  const monthKey = format(month, 'yyyy-MM');

  const cur    = useMemo(() => getMonthlySummary(workouts, month), [workouts, month]);
  const prev   = useMemo(() => getMonthlySummary(workouts, subMonths(month, 1)), [workouts, month]);
  const series = useMemo(() => getMonthlySeries(workouts), [workouts]);
  const monthWorkouts = useMemo(
    () => workouts.filter(w => isSameMonth(w.startTime, month)),
    [workouts, month],
  );

  const curVol  = Math.round(cur.volumeKg * multiplier);
  const prevVol = Math.round(prev.volumeKg * multiplier);

  const curAvgVol  = cur.workoutCount  ? Math.round(curVol / cur.workoutCount)   : 0;
  const prevAvgVol = prev.workoutCount ? Math.round(prevVol / prev.workoutCount) : 0;
  const curAvgDur  = cur.workoutCount  ? Math.round(cur.durationMin / cur.workoutCount)   : 0;
  const prevAvgDur = prev.workoutCount ? Math.round(prev.durationMin / prev.workoutCount) : 0;

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
      </div>

      <div className="mr-grid">
        <StatCard label="Workouts" cur={cur.workoutCount}  prev={prev.workoutCount}  fmt={fmtInt} />
        <StatCard label="Duration" cur={cur.durationMin}   prev={prev.durationMin}   fmt={fmtDuration} />
        <StatCard label="Volume"   cur={curVol}            prev={prevVol}            fmt={fmtVolume} unit={unit} />
        <StatCard label="Sets"     cur={cur.setCount}      prev={prev.setCount}      fmt={fmtInt} />
        <StatCard label="Avg Volume / Session" cur={curAvgVol} prev={prevAvgVol} fmt={fmtVolume} unit={unit} />
        <StatCard label="Avg Session Time"     cur={curAvgDur} prev={prevAvgDur} fmt={fmtDuration} />
      </div>

      {/* Cross-month trend (toggle workouts / duration / volume / sets) */}
      <div className="mr-section">
        <MonthlyTrendChart series={series} selectedMonthKey={monthKey} />
      </div>

      {cur.workoutCount === 0 ? (
        <div className="mr-empty">No workouts logged in {format(month, 'MMMM yyyy')}.</div>
      ) : (
        <>
          <div className="mr-row">
            <WorkoutCalendar workouts={workouts} month={month} />
            <MuscleRadarChart workouts={monthWorkouts} />
          </div>
          <div className="mr-row">
            <MuscleSetCountChart workouts={monthWorkouts} />
            <MainExercises workouts={monthWorkouts} />
          </div>
        </>
      )}
    </div>
  );
};
