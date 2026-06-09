import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Card } from '../common/Card';
import { useSettings } from '../../context/SettingsContext';
import { getWeeklyMetric, fillWeeklyGaps, type MetricType } from '../../utils/workoutUtils';
import type { TaggedWorkout } from '../../hooks/useWorkouts';

interface Props {
  workouts: TaggedWorkout[];
  runs?: { startTime: Date; durationSeconds: number; distanceKm: number }[];
  fillGaps?: boolean;
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
}

// ── Metric configuration ────────────────────────────────────────────────────

interface MetricConfig {
  key:   MetricType;
  label: string;
  color: string;
  gradId: string;
  gradTop: string;
  gradBot: string;
}

const METRICS: MetricConfig[] = [
  { key: 'volume',   label: 'Volume',   color: '#FF2E93', gradId: 'dmcVol',  gradTop: '#FF2E93', gradBot: '#E60073' },
  { key: 'reps',     label: 'Reps',     color: '#00F0FF', gradId: 'dmcReps', gradTop: '#00F0FF', gradBot: '#00A8B3' },
  { key: 'sets',     label: 'Sets',     color: '#9D00FF', gradId: 'dmcSets', gradTop: '#9D00FF', gradBot: '#6600CC' },
  { key: 'duration', label: 'Duration', color: '#FF85B3', gradId: 'dmcDur',  gradTop: '#FF85B3', gradBot: '#E05080' },
  { key: 'distance', label: 'Distance', color: '#4ADE80', gradId: 'dmcDist', gradTop: '#4ADE80', gradBot: '#22A35A' },
];

// ── Formatting helpers ──────────────────────────────────────────────────────

function yTickFormatter(v: number, metric: MetricType, _unit: string): string {
  if (metric === 'volume') {
    const val = v;
    return val >= 1000 ? `${(val / 1000).toFixed(0)}k` : String(val);
  }
  if (metric === 'duration') return `${v}m`;
  if (metric === 'distance') return `${v}km`;
  return v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v);
}

function tooltipFormatter(value: unknown, metric: MetricType, unit: string): [string, string] {
  const n = Number(value);
  if (metric === 'volume')   return [`${n.toLocaleString()} ${unit}`, 'Volume'];
  if (metric === 'reps')     return [`${n.toLocaleString()} reps`, 'Reps'];
  if (metric === 'sets')     return [`${n.toLocaleString()} sets`, 'Sets'];
  if (metric === 'duration') return [`${n} min`, 'Duration'];
  if (metric === 'distance') return [`${n.toLocaleString()} km`, 'Distance'];
  return [String(n), ''];
}

// ── Component ───────────────────────────────────────────────────────────────

export const DynamicMetricChart: React.FC<Props> = ({ workouts, runs = [], fillGaps = false, rangeStart, rangeEnd }) => {
  const { unit } = useSettings();
  const [metric, setMetric] = useState<MetricType>('duration');

  const cfg = METRICS.find(m => m.key === metric)!;

  // Base weekly aggregation — recomputes only when workouts/runs or metric changes
  const weeklyBase = useMemo(() => {
    const base = getWeeklyMetric(workouts, metric, runs);
    if (!fillGaps) return base;
    return fillWeeklyGaps(
      base,
      (weekKey, label) => ({ weekKey, label, value: 0 }),
      rangeStart,
      rangeEnd,
    );
  }, [workouts, runs, metric, fillGaps, rangeStart, rangeEnd]);

  // Apply kg→lbs conversion for volume only
  const displayData = useMemo(() => {
    const multiplier = metric === 'volume' && unit === 'lbs' ? 2.20462 : 1;
    return weeklyBase.map(d => ({ label: d.label, value: Math.round(d.value * multiplier * 100) / 100 }));
  }, [weeklyBase, metric, unit]);

  return (
    <Card style={{ height: '360px' }}>

      {/* ── Header row with metric pills ─────────────────────── */}
      <div className="dmc-header">
        <h3 className="dmc-title">Weekly {cfg.label}{metric === 'volume' ? ` (${unit.toUpperCase()})` : metric === 'duration' ? ' (min)' : metric === 'distance' ? ' (km)' : ''}</h3>
        <div className="dmc-pills">
          {METRICS.map(m => (
            <button
              key={m.key}
              className={`dmc-pill ${metric === m.key ? 'dmc-pill--active' : ''}`}
              style={metric === m.key ? { '--pill-color': m.color } as React.CSSProperties : {}}
              onClick={() => setMetric(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chart ────────────────────────────────────────────── */}
      {workouts.length === 0 && runs.length === 0 ? (
        <div className="dmc-empty">No data for this range</div>
      ) : (
        <div style={{ flex: 1, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayData} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {METRICS.map(m => (
                  <linearGradient key={m.gradId} id={m.gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={m.gradTop} stopOpacity={1}   />
                    <stop offset="100%" stopColor={m.gradBot} stopOpacity={0.7} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="var(--text-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="var(--text-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => yTickFormatter(v, metric, unit)}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-darker)',
                  border: `1px solid ${cfg.color}44`,
                  borderRadius: '12px',
                  fontFamily: 'Outfit',
                }}
                itemStyle={{ color: cfg.color, fontWeight: 'bold' }}
                labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px' }}
                formatter={(v: unknown) => tooltipFormatter(v, metric, unit)}
              />
              <Bar
                key={metric}               /* key forces re-mount on metric change for clean animation */
                dataKey="value"
                fill={`url(#${cfg.gradId})`}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};
