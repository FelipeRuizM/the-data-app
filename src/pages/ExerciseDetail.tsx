import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { subDays, subYears } from 'date-fns';
import { ExerciseMetricChart } from '../components/analytics/ExerciseMetricChart';
import { SetSeriesChart } from '../components/analytics/SetSeriesChart';
import { useSettings } from '../context/SettingsContext';
import { useExercises } from '../context/ExercisesContext';
import { getExerciseSessions, type ExerciseMetric } from '../utils/workoutUtils';
import type { TaggedWorkout } from '../hooks/useWorkouts';
import './ExerciseDetail.css';

type TimeRange = '90d' | '180d' | '1y' | 'All';

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: '90d',  label: '90D'  },
  { key: '180d', label: '180D' },
  { key: '1y',   label: '1Y'   },
  { key: 'All',  label: 'All'  },
];

const VIEWS: { key: ExerciseMetric; label: string }[] = [
  { key: 'bestSet',  label: 'Best Set' },
  { key: 'est1rm',   label: 'Est 1RM'  },
  { key: 'heaviest', label: 'Heaviest' },
  { key: 'volume',   label: 'Volume'   },
];

function getDateCutoff(range: TimeRange): Date | null {
  const now = new Date();
  if (range === '90d')  return subDays(now, 90);
  if (range === '180d') return subDays(now, 180);
  if (range === '1y')   return subYears(now, 1);
  return null;
}

interface Props {
  workouts: TaggedWorkout[];
}

export const ExerciseDetail: React.FC<Props> = ({ workouts }) => {
  const { name } = useParams<{ name: string }>();
  const exerciseTitle = decodeURIComponent(name ?? '');
  const { unit } = useSettings();
  const { getMuscleGroup } = useExercises();

  const [view, setView] = useState<ExerciseMetric>('bestSet');
  const [timeRange, setTimeRange] = useState<TimeRange>('1y');

  const multiplier = unit === 'lbs' ? 2.20462 : 1;

  // All sets for this exercise (across history) — used for all-time summary stats.
  const allSets = useMemo(
    () => workouts.filter(w => w.exerciseTitle === exerciseTitle),
    [workouts, exerciseTitle],
  );

  // Date-filtered slice feeding the chart.
  const rangeStart = useMemo(() => getDateCutoff(timeRange), [timeRange]);
  const rangedSets = useMemo(
    () => (rangeStart ? allSets.filter(w => w.startTime >= rangeStart) : allSets),
    [allSets, rangeStart],
  );

  const sessions = useMemo(() => getExerciseSessions(rangedSets), [rangedSets]);

  // All-time summary (independent of the selected time range).
  const summary = useMemo(() => {
    const allSessions = getExerciseSessions(allSets);
    const best1rm = allSessions.reduce((m, s) => Math.max(m, s.est1rmKg), 0);
    const heaviest = allSessions.reduce((m, s) => Math.max(m, s.heaviestKg), 0);
    const bestSet = allSessions.reduce((m, s) => Math.max(m, s.bestSetKg), 0);
    return {
      sessionCount: allSessions.length,
      best1rm: Math.round(best1rm * multiplier),
      heaviest: Math.round(heaviest * multiplier),
      bestSet: Math.round(bestSet * multiplier),
    };
  }, [allSets, multiplier]);

  const muscleGroup = getMuscleGroup(exerciseTitle);

  return (
    <div className="exd-page" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <Link to="/records" className="exd-back">
        <ChevronLeft size={16} /> Records
      </Link>

      <div className="exd-header">
        <div>
          <h2 className="exd-title">{exerciseTitle}</h2>
          <span className="exd-muscle">{muscleGroup}</span>
        </div>
        <div className="exd-time-selector">
          {TIME_RANGES.map(({ key, label }) => (
            <button
              key={key}
              className={`exd-pill ${timeRange === key ? 'active' : ''}`}
              onClick={() => setTimeRange(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {summary.sessionCount === 0 ? (
        <div className="exd-empty">No sets logged for this exercise yet.</div>
      ) : (
        <>
          {/* All-time summary stats */}
          <div className="exd-stats-row">
            <div className="exd-stat glass-panel">
              <span className="exd-stat-label">Sessions</span>
              <span className="exd-stat-value">{summary.sessionCount}</span>
            </div>
            <div className="exd-stat glass-panel">
              <span className="exd-stat-label">Best Est. 1RM</span>
              <div className="exd-stat-value-row">
                <span className="exd-stat-value">{summary.best1rm.toLocaleString()}</span>
                <span className="exd-stat-unit">{unit}</span>
              </div>
            </div>
            <div className="exd-stat glass-panel">
              <span className="exd-stat-label">Heaviest</span>
              <div className="exd-stat-value-row">
                <span className="exd-stat-value">{summary.heaviest.toLocaleString()}</span>
                <span className="exd-stat-unit">{unit}</span>
              </div>
            </div>
            <div className="exd-stat glass-panel">
              <span className="exd-stat-label">Best Set</span>
              <div className="exd-stat-value-row">
                <span className="exd-stat-value">{summary.bestSet.toLocaleString()}</span>
                <span className="exd-stat-unit">{unit}</span>
              </div>
            </div>
          </div>

          {/* Graph type toggle */}
          <div className="exd-metric-selector">
            {VIEWS.map(({ key, label }) => (
              <button
                key={key}
                className={`exd-pill ${view === key ? 'active' : ''}`}
                onClick={() => setView(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <ExerciseMetricChart sessions={sessions} metric={view} />

          {/* Per-set breakdown: reps / weight / volume as overlapping, filterable lines */}
          <div style={{ marginTop: '20px' }}>
            <SetSeriesChart workouts={rangedSets} />
          </div>
        </>
      )}
    </div>
  );
};
