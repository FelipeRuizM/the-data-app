import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { format, parseISO, subMonths } from 'date-fns';
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
  /** Bar (default) or line rendering. */
  chart?: 'bar' | 'line';
}

// The window shown: the selected month plus the 4 before it. Missing months
// are zero-filled so the x-axis is always 5 consecutive calendar months.
const MONTHS_SHOWN = 5;

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

export const MonthlyTrendChart: React.FC<Props> = ({
  series, selectedMonthKey, title, metrics, chart = 'bar',
}) => {
  const { unit } = useSettings();
  const multiplier = unit === 'lbs' ? 2.20462 : 1;
  const visible = useMemo(
    () => (metrics ? METRICS.filter(m => metrics.includes(m.key)) : METRICS),
    [metrics],
  );
  const [metric, setMetric] = useState<MonthlyMetricKey>(metrics && metrics.length ? metrics[0] : 'volume');

  const cfg = METRICS.find(m => m.key === metric)!;

  const data = useMemo(() => {
    const byKey = new Map(series.map(m => [m.monthKey, m]));
    const selected = parseISO(`${selectedMonthKey}-01`);
    const window: { monthKey: string; label: string; value: number }[] = [];
    for (let i = MONTHS_SHOWN - 1; i >= 0; i--) {
      const date = subMonths(selected, i);
      const monthKey = format(date, 'yyyy-MM');
      const m = byKey.get(monthKey);
      window.push({
        monthKey,
        label: format(date, 'MMM yy'),
        value: !m ? 0
          : metric === 'activities' ? m.activityCount
          : metric === 'duration'   ? m.durationMin
          : metric === 'workoutDuration' ? m.workoutDurationMin
          : metric === 'runDuration'     ? m.runDurationMin
          : metric === 'volume'     ? Math.round(m.volumeKg * multiplier)
          : metric === 'distance'   ? m.runDistanceKm
          : m.setCount,
      });
    }
    return window;
  }, [series, selectedMonthKey, metric, multiplier]);

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

  const axisProps = {
    stroke: 'var(--text-muted)',
    fontSize: 11,
    tickLine: false,
    axisLine: false,
  } as const;

  const tooltipProps = {
    cursor: chart === 'bar' ? { fill: 'rgba(255,255,255,0.04)' } : undefined,
    contentStyle: {
      background: 'var(--bg-darker)',
      border: `1px solid ${cfg.color}44`,
      borderRadius: '12px',
      fontFamily: 'Outfit',
    },
    itemStyle: { color: cfg.color, fontWeight: 'bold' as const },
    labelStyle: { color: 'var(--text-secondary)', marginBottom: '4px' },
    formatter: (v: unknown) => [tip(Number(v)), cfg.label] as [string, string],
  };

  // Emphasize the selected month's dot on the line variant (mirrors the
  // full-opacity bar in the bar variant).
  const renderDot = (props: { cx?: number; cy?: number; payload?: { monthKey: string } }) => {
    const selected = props.payload?.monthKey === selectedMonthKey;
    return (
      <circle
        key={props.payload?.monthKey}
        cx={props.cx}
        cy={props.cy}
        r={selected ? 6 : 3.5}
        fill={cfg.color}
        fillOpacity={selected ? 1 : 0.45}
        strokeWidth={0}
      />
    );
  };

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

      {series.length === 0 ? (
        <div className="dmc-empty">No data yet</div>
      ) : (
        <div style={{ flex: 1, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            {chart === 'line' ? (
              <LineChart data={data} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" {...axisProps} tickMargin={8} />
                <YAxis {...axisProps} allowDecimals={false} tickFormatter={v => yTick(Number(v))} />
                <Tooltip {...tooltipProps} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={cfg.color}
                  strokeWidth={3}
                  dot={renderDot}
                  activeDot={{ r: 6, fill: cfg.color, strokeWidth: 0 }}
                />
              </LineChart>
            ) : (
              <BarChart data={data} margin={{ top: 4, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" {...axisProps} tickMargin={8} />
                <YAxis {...axisProps} allowDecimals={false} tickFormatter={v => yTick(Number(v))} />
                <Tooltip {...tooltipProps} />
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
            )}
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};
