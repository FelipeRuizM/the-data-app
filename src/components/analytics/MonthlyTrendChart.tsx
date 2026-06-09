import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { Card } from '../common/Card';
import { useSettings } from '../../context/SettingsContext';
import type { MonthlyPoint } from '../../utils/workoutUtils';

interface Props {
  series: MonthlyPoint[];
  selectedMonthKey: string;
}

type MetricKey = 'activities' | 'duration' | 'volume' | 'sets' | 'distance';

const METRICS: { key: MetricKey; label: string; color: string }[] = [
  { key: 'activities', label: 'Activities', color: '#FF2E93' },
  { key: 'duration',   label: 'Duration',   color: '#FF85B3' },
  { key: 'volume',     label: 'Volume',     color: '#9D00FF' },
  { key: 'sets',       label: 'Sets',       color: '#00F0FF' },
  { key: 'distance',   label: 'Distance',   color: '#4ADE80' },
];

const abbrev = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
  : v >= 1000    ? `${(v / 1000).toFixed(1)}k`
  : String(v);

const fmtDur = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export const MonthlyTrendChart: React.FC<Props> = ({ series, selectedMonthKey }) => {
  const { unit } = useSettings();
  const multiplier = unit === 'lbs' ? 2.20462 : 1;
  const [metric, setMetric] = useState<MetricKey>('volume');

  const cfg = METRICS.find(m => m.key === metric)!;

  const data = useMemo(() => series.map(m => ({
    monthKey: m.monthKey,
    label: m.label,
    value: metric === 'activities' ? m.activityCount
         : metric === 'duration'   ? m.durationMin
         : metric === 'volume'     ? Math.round(m.volumeKg * multiplier)
         : metric === 'distance'   ? m.runDistanceKm
         : m.setCount,
  })), [series, metric, multiplier]);

  const yTick = (v: number) =>
    metric === 'duration' ? (v >= 60 ? `${Math.round(v / 60)}h` : `${v}m`)
    : metric === 'distance' ? `${v}km`
    : abbrev(v);

  const tip = (v: number) =>
    metric === 'duration' ? fmtDur(v)
    : metric === 'volume'  ? `${v.toLocaleString()} ${unit}`
    : metric === 'distance' ? `${v.toLocaleString()} km`
    : metric === 'activities' ? `${v} activit${v === 1 ? 'y' : 'ies'}`
    : `${v} set${v === 1 ? '' : 's'}`;

  return (
    <Card style={{ height: '340px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
        <h3 style={{ fontFamily: 'Outfit', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Monthly {cfg.label}{metric === 'volume' ? ` (${unit.toUpperCase()})` : metric === 'distance' ? ' (km)' : ''}
        </h3>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '3px' }}>
          {METRICS.map(m => {
            const active = metric === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                style={{
                  background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: 'none', borderRadius: '7px', padding: '4px 11px',
                  fontFamily: 'Outfit', fontSize: '12px', fontWeight: 600,
                  color: active ? m.color : 'var(--text-muted)',
                  cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s ease',
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {data.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: 'Outfit', fontSize: '14px' }}>No data yet</div>
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
