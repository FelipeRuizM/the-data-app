import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { Card } from '../common/Card';
import { useSettings } from '../../context/SettingsContext';
import type { MonthlyPoint } from '../../utils/workoutUtils';
import './ChartPills.css';

export type MonthlyMetricKey =
  | 'activities' | 'duration' | 'workoutDuration' | 'runDuration'
  | 'volume' | 'sets' | 'distance';

interface Props {
  series: MonthlyPoint[];
  selectedMonthKey: string;
  /** Heading prefix, e.g. "Monthly Workouts". Defaults to "Monthly <metric>". */
  title?: string;
  /** Restrict the selectable metrics (and their order). Defaults to all. */
  metrics?: MonthlyMetricKey[];
}

const METRICS: { key: MonthlyMetricKey; label: string; color: string }[] = [
  { key: 'activities',      label: 'Activities', color: '#FF2E93' },
  { key: 'duration',        label: 'Duration',   color: '#FF85B3' },
  { key: 'workoutDuration', label: 'Duration',   color: '#FF85B3' },
  { key: 'runDuration',     label: 'Duration',   color: '#38BDF8' },
  { key: 'volume',          label: 'Volume',     color: '#9D00FF' },
  { key: 'sets',            label: 'Sets',       color: '#00F0FF' },
  { key: 'distance',        label: 'Distance',   color: '#4ADE80' },
];

const isDuration = (m: MonthlyMetricKey) =>
  m === 'duration' || m === 'workoutDuration' || m === 'runDuration';

const abbrev = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
  : v >= 1000    ? `${(v / 1000).toFixed(1)}k`
  : String(v);

const fmtDur = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export const MonthlyTrendChart: React.FC<Props> = ({ series, selectedMonthKey, title, metrics }) => {
  const { unit } = useSettings();
  const multiplier = unit === 'lbs' ? 2.20462 : 1;
  const visible = useMemo(
    () => (metrics ? METRICS.filter(m => metrics.includes(m.key)) : METRICS),
    [metrics],
  );
  const [metric, setMetric] = useState<MonthlyMetricKey>(metrics && metrics.length ? metrics[0] : 'volume');

  const cfg = METRICS.find(m => m.key === metric)!;

  const data = useMemo(() => series.map(m => ({
    monthKey: m.monthKey,
    label: m.label,
    value: metric === 'activities' ? m.activityCount
         : metric === 'duration'   ? m.durationMin
         : metric === 'workoutDuration' ? m.workoutDurationMin
         : metric === 'runDuration'     ? m.runDurationMin
         : metric === 'volume'     ? Math.round(m.volumeKg * multiplier)
         : metric === 'distance'   ? m.runDistanceKm
         : m.setCount,
  })), [series, metric, multiplier]);

  const yTick = (v: number) =>
    isDuration(metric) ? (v >= 60 ? `${Math.round(v / 60)}h` : `${v}m`)
    : metric === 'distance' ? `${v}km`
    : abbrev(v);

  const tip = (v: number) =>
    isDuration(metric) ? fmtDur(v)
    : metric === 'volume'  ? `${v.toLocaleString()} ${unit}`
    : metric === 'distance' ? `${v.toLocaleString()} km`
    : metric === 'activities' ? `${v} activit${v === 1 ? 'y' : 'ies'}`
    : `${v} set${v === 1 ? '' : 's'}`;

  const suffix = metric === 'volume' ? ` (${unit.toUpperCase()})` : metric === 'distance' ? ' (km)' : '';
  // Single-metric charts don't need pills or a "· Metric" qualifier.
  const heading = visible.length > 1
    ? `${title ?? 'Monthly'} · ${cfg.label}${suffix}`
    : `${title ?? `Monthly ${cfg.label}`}${suffix}`;

  return (
    <Card style={{ height: '360px' }}>
      <div className="dmc-header">
        <h3 className="dmc-title">{heading}</h3>
        {visible.length > 1 && (
          <div className="dmc-pills">
            {visible.map(m => (
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
        )}
      </div>

      {data.length === 0 ? (
        <div className="dmc-empty">No data yet</div>
      ) : (
        <div style={{ flex: 1, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 10, left: -18, bottom: 0 }}>
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
                allowDecimals={false}
                tickFormatter={v => yTick(Number(v))}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                contentStyle={{
                  background: 'var(--bg-darker)',
                  border: `1px solid ${cfg.color}44`,
                  borderRadius: '12px',
                  fontFamily: 'Outfit',
                }}
                itemStyle={{ color: cfg.color, fontWeight: 'bold' }}
                labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px' }}
                formatter={(v: unknown) => [tip(Number(v)), cfg.label]}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {data.map(d => (
                  <Cell
                    key={d.monthKey}
                    fill={cfg.color}
                    fillOpacity={d.monthKey === selectedMonthKey ? 1 : 0.32}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};
