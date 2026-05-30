import React, { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Card } from '../common/Card';
import { useSettings } from '../../context/SettingsContext';
import { getExerciseSetPoints } from '../../utils/workoutUtils';
import type { TaggedWorkout } from '../../hooks/useWorkouts';

interface Props {
  workouts: TaggedWorkout[];
}

type SeriesKey = 'reps' | 'weight' | 'volume';
type HideableType = 'warmup' | 'feeder';

const SERIES: { key: SeriesKey; label: string; color: string; weighted: boolean }[] = [
  { key: 'reps',   label: 'Reps',   color: '#FF2E93', weighted: false },
  { key: 'weight', label: 'Weight', color: '#36CFFF', weighted: true  },
  { key: 'volume', label: 'Volume', color: '#00F0A8', weighted: true  },
];

// Lighter "ramp-up" set types — hidden by default, added back via the toggles.
const HIDEABLE: { key: HideableType; label: string; color: string }[] = [
  { key: 'warmup', label: 'Warmup', color: '#F59E0B' },
  { key: 'feeder', label: 'Feeder', color: '#A855F7' },
];

// Friendly tooltip names for each set type.
const SET_TYPE_LABELS: Record<string, string> = {
  normal:  'Working set',
  working: 'Working set',
  warmup:  'Warmup set',
  feeder:  'Feeder set',
  dropset: 'Drop set',
  failure: 'To failure',
};

const SetTooltip: React.FC<any> = ({ active, payload, unit, visible }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div
      style={{
        background: 'var(--bg-darker)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '12px',
        fontFamily: 'Outfit',
        padding: '10px 14px',
        minWidth: '150px',
      }}
    >
      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '7px' }}>
        {p.dateLabel} · {SET_TYPE_LABELS[p.setType] ?? 'Set'}
      </div>
      {SERIES.filter(s => visible[s.key]).map(s => (
        <div
          key={s.key}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginTop: '3px' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: s.color }} />
            {s.label}
          </span>
          <span style={{ color: s.color, fontSize: '13px', fontWeight: 600 }}>
            {p[s.key].toLocaleString()}{s.weighted ? ` ${unit}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
};

export const SetSeriesChart: React.FC<Props> = ({ workouts }) => {
  const { unit } = useSettings();
  const multiplier = unit === 'lbs' ? 2.20462 : 1;

  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
    reps: true, weight: true, volume: true,
  });
  const toggle = (key: SeriesKey) => setVisible(v => ({ ...v, [key]: !v[key] }));

  // Warmup & feeder sets are hidden by default; these toggles add them back.
  const [showTypes, setShowTypes] = useState<Record<HideableType, boolean>>({
    warmup: false, feeder: false,
  });

  const chartData = useMemo(() => {
    const filtered = workouts.filter(w =>
      (w.setType !== 'warmup' || showTypes.warmup) &&
      (w.setType !== 'feeder' || showTypes.feeder),
    );
    return getExerciseSetPoints(filtered).map(p => ({
      index: p.index,
      dateLabel: p.dateLabel,
      setType: p.setType,
      reps: p.reps,
      weight: Math.round(p.weightKg * multiplier * 10) / 10,
      volume: Math.round(p.weightKg * p.reps * multiplier),
    }));
  }, [workouts, multiplier, showTypes]);

  // Map a sequential index back to its date for sparse x-axis ticks ('MMM d').
  const dateForIndex = useMemo(() => {
    const m = new Map<number, string>();
    chartData.forEach(d => m.set(d.index, d.dateLabel.replace(/,? \d{4}$/, '')));
    return m;
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <Card style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'Outfit' }}>No data for this range</p>
      </Card>
    );
  }

  return (
    <Card style={{ height: '400px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <h3 style={{ fontFamily: 'Outfit', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Set-by-Set Trends
          </h3>
          <span style={{ fontFamily: 'Outfit', fontSize: '12px', color: 'var(--text-muted)' }}>
            {chartData.length} set{chartData.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Controls — metric line toggles + warmup/feeder show toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {SERIES.map(s => {
            const on = visible[s.key];
            return (
              <button
                key={s.key}
                onClick={() => toggle(s.key)}
                title={`Toggle ${s.label} line`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: on ? `${s.color}1A` : 'transparent',
                  border: `1px solid ${on ? `${s.color}66` : 'var(--glass-border)'}`,
                  borderRadius: '8px', padding: '4px 11px', cursor: 'pointer',
                  fontFamily: 'Outfit', fontSize: '12px', fontWeight: 600,
                  color: on ? s.color : 'var(--text-muted)',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: on ? s.color : 'var(--text-muted)' }} />
                {s.label}
              </button>
            );
          })}

          <span style={{ width: '1px', height: '18px', background: 'var(--glass-border)', margin: '0 2px' }} />
          <span style={{ fontFamily: 'Outfit', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Show
          </span>

          {HIDEABLE.map(t => {
            const on = showTypes[t.key];
            return (
              <button
                key={t.key}
                onClick={() => setShowTypes(s => ({ ...s, [t.key]: !s[t.key] }))}
                title={`${on ? 'Hide' : 'Show'} ${t.label.toLowerCase()} sets`}
                style={{
                  background: on ? `${t.color}1A` : 'transparent',
                  border: `1px ${on ? 'solid' : 'dashed'} ${on ? `${t.color}66` : 'var(--glass-border)'}`,
                  borderRadius: '8px', padding: '4px 11px', cursor: 'pointer',
                  fontFamily: 'Outfit', fontSize: '12px', fontWeight: 600,
                  color: on ? t.color : 'var(--text-muted)',
                  transition: 'all 0.15s ease',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="index"
              type="category"
              stroke="var(--text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
              minTickGap={36}
              tickFormatter={(v: number) => dateForIndex.get(Number(v)) ?? ''}
            />
            {/* Each metric scales on its own hidden axis so the differently-sized
                lines all fill the chart height and overlap for shape comparison. */}
            <YAxis yAxisId="reps"   hide domain={['auto', 'auto']} />
            <YAxis yAxisId="weight" hide domain={['auto', 'auto']} />
            <YAxis yAxisId="volume" hide domain={['auto', 'auto']} />
            <Tooltip
              cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
              content={<SetTooltip unit={unit} visible={visible} />}
            />
            {SERIES.map(s =>
              visible[s.key] ? (
                <Line
                  key={s.key}
                  yAxisId={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={2.5}
                  dot={{ fill: s.color, r: 2.5, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: s.color }}
                  isAnimationActive={false}
                />
              ) : null,
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
