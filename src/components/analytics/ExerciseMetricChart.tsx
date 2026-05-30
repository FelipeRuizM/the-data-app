import React, { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import { Card } from '../common/Card';
import { useSettings } from '../../context/SettingsContext';
import type { ExerciseSessionPoint, ExerciseMetric } from '../../utils/workoutUtils';

interface Props {
  sessions: ExerciseSessionPoint[];
  metric: ExerciseMetric;
}

const PINK = '#FF2E93';
const PINK_DEEP = '#E60073';

const METRIC_META: Record<ExerciseMetric, { title: string; field: keyof ExerciseSessionPoint }> = {
  volume:   { title: 'Total Volume',     field: 'volumeKg' },
  est1rm:   { title: 'Estimated 1RM',    field: 'est1rmKg' },
  bestSet:  { title: 'Best Set Volume',  field: 'bestSetKg' },
  heaviest: { title: 'Heaviest Weight',  field: 'heaviestKg' },
};

export const ExerciseMetricChart: React.FC<Props> = ({ sessions, metric }) => {
  const { unit } = useSettings();
  const multiplier = unit === 'lbs' ? 2.20462 : 1;
  const meta = METRIC_META[metric];

  const chartData = useMemo(() => {
    return sessions.map(p => ({
      ...p,
      value: Math.round((p[meta.field] as number) * multiplier),
    }));
  }, [sessions, meta.field, multiplier]);

  const { avgValue, peakValue, trend } = useMemo(() => {
    if (chartData.length === 0) return { avgValue: 0, peakValue: 0, trend: 0 };
    const total = chartData.reduce((s, d) => s + d.value, 0);
    const avg = Math.round(total / chartData.length);
    const peak = chartData.reduce((m, d) => Math.max(m, d.value), 0);

    // Simple trend: compare average of last third vs first third
    const third = Math.max(1, Math.floor(chartData.length / 3));
    const firstAvg = chartData.slice(0, third).reduce((s, d) => s + d.value, 0) / third;
    const lastAvg  = chartData.slice(-third).reduce((s, d) => s + d.value, 0) / third;
    const trendPct = firstAvg > 0 ? Math.round(((lastAvg - firstAvg) / firstAvg) * 100) : 0;

    return { avgValue: avg, peakValue: peak, trend: trendPct };
  }, [chartData]);

  const fmt = (v: number) =>
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
    : v >= 1000    ? `${(v / 1000).toFixed(1)}k`
    : String(v);

  if (chartData.length === 0) {
    return (
      <Card style={{ height: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'Outfit' }}>No data for this range</p>
      </Card>
    );
  }

  return (
    <Card style={{ height: '360px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <h3 style={{ fontFamily: 'Outfit', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            {meta.title}
          </h3>
          <span style={{ fontFamily: 'Outfit', fontSize: '12px', color: 'var(--text-muted)' }}>
            {chartData.length} session{chartData.length === 1 ? '' : 's'} · avg {fmt(avgValue)} {unit}
          </span>
        </div>
        {chartData.length >= 3 && (
          <span
            style={{
              fontFamily: 'Outfit',
              fontSize: '12px',
              fontWeight: 600,
              color: trend > 0 ? '#00F0A8' : trend < 0 ? '#FF5577' : 'var(--text-muted)',
              letterSpacing: '0.02em',
            }}
          >
            {trend > 0 ? '▲' : trend < 0 ? '▼' : '—'} {Math.abs(trend)}%
          </span>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="emcFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={PINK}      stopOpacity={0.45} />
                <stop offset="100%" stopColor={PINK_DEEP} stopOpacity={0.02} />
              </linearGradient>
              <filter id="emcGlow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
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
              minTickGap={24}
            />
            <YAxis
              stroke="var(--text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => fmt(Number(v))}
            />
            <ReferenceLine
              y={avgValue}
              stroke={PINK}
              strokeDasharray="4 4"
              strokeOpacity={0.3}
            />
            <Tooltip
              cursor={{ stroke: PINK, strokeOpacity: 0.25, strokeWidth: 1 }}
              contentStyle={{
                background: 'var(--bg-darker)',
                border: `1px solid ${PINK}44`,
                borderRadius: '12px',
                fontFamily: 'Outfit',
              }}
              labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px' }}
              labelFormatter={(_label, payload) => {
                const p = payload?.[0]?.payload;
                return p?.fullLabel ?? String(_label);
              }}
              formatter={(value: unknown) => {
                const n = Number(value);
                return [`${n.toLocaleString()} ${unit}`, meta.title];
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={PINK}
              strokeWidth={2.5}
              fill="url(#emcFill)"
              dot={{ fill: PINK, r: 3, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: PINK, filter: 'url(#emcGlow)' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {peakValue > 0 && (
        <div style={{ marginTop: '8px', fontFamily: 'Outfit', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
          Peak: <span style={{ color: PINK, fontWeight: 600 }}>{fmt(peakValue)} {unit}</span>
        </div>
      )}
    </Card>
  );
};
