import React, { useMemo, useState } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Tooltip,
} from 'recharts';
import { Card } from '../common/Card';
import { useExercises } from '../../context/ExercisesContext';
import { useSettings } from '../../context/SettingsContext';
import { getVolumeByMuscleGroup, MUSCLE_GROUPS, type MuscleGroupPoint } from '../../utils/workoutUtils';
import type { WorkoutSet } from '../../utils/csvParser';
import './ChartPills.css';

interface Props {
  workouts: WorkoutSet[];
}

const PINK = '#FF2E93';

type RadarMetric = 'sets' | 'reps' | 'volume';

const METRICS: { key: RadarMetric; label: string; field: keyof MuscleGroupPoint }[] = [
  { key: 'sets',   label: 'Sets',   field: 'sets' },
  { key: 'reps',   label: 'Reps',   field: 'reps' },
  { key: 'volume', label: 'Volume', field: 'volumeKg' },
];

// Primary movement groups shown on the radar — 'Core' and 'Other' are excluded
// as they aren't useful axes for a strength-balance shape.
const RADAR_GROUPS = MUSCLE_GROUPS.filter(g => g !== 'Core' && g !== 'Other');

export const MuscleRadarChart: React.FC<Props> = ({ workouts }) => {
  const { getMuscleGroup } = useExercises();
  const { unit } = useSettings();
  const [metric, setMetric] = useState<RadarMetric>('sets');

  const cfg = METRICS.find(m => m.key === metric)!;
  // Only volume is stored in kg and needs unit conversion; sets/reps are counts.
  const multiplier = metric === 'volume' && unit === 'lbs' ? 2.20462 : 1;

  const data = useMemo(() => {
    const byGroup = new Map(
      getVolumeByMuscleGroup(workouts, getMuscleGroup).map(g => [g.name, g[cfg.field] as number]),
    );
    // Plot every primary group (0 when absent) so the radar keeps a full shape.
    return RADAR_GROUPS.map(name => ({
      muscle: name,
      value: Math.round((byGroup.get(name) ?? 0) * multiplier),
    }));
  }, [workouts, getMuscleGroup, cfg.field, multiplier]);

  const fmt = (v: number) =>
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
    : v >= 1000    ? `${(v / 1000).toFixed(1)}k`
    : String(v);

  const tooltipSuffix = metric === 'volume' ? ` ${unit}` : '';

  const title = metric === 'volume'
    ? `Muscle Split — Volume (${unit.toUpperCase()})`
    : `Muscle Split — ${cfg.label}`;

  return (
    <Card style={{ height: '400px' }}>
      <div className="dmc-header">
        <h3 className="dmc-title">{title}</h3>
        <div className="dmc-pills">
          {METRICS.map(m => (
            <button
              key={m.key}
              className={`dmc-pill ${metric === m.key ? 'dmc-pill--active' : ''}`}
              onClick={() => setMetric(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {workouts.length === 0 ? (
        <div className="dmc-empty">No data for this range</div>
      ) : (
        <div style={{ flex: 1, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
              <defs>
                <radialGradient id="mrcFill" cx="50%" cy="50%" r="50%">
                  <stop offset="0%"   stopColor={PINK} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={PINK} stopOpacity={0.12} />
                </radialGradient>
              </defs>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis
                dataKey="muscle"
                tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontFamily: 'Outfit' }}
              />
              <PolarRadiusAxis tick={false} axisLine={false} />
              <Radar
                dataKey="value"
                stroke={PINK}
                strokeWidth={2}
                fill="url(#mrcFill)"
                dot={{ fill: PINK, r: 3, strokeWidth: 0 }}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-darker)',
                  border: `1px solid ${PINK}44`,
                  borderRadius: '12px',
                  fontFamily: 'Outfit',
                }}
                itemStyle={{ color: PINK, fontWeight: 'bold' }}
                labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px' }}
                formatter={(value: unknown) => [`${fmt(Number(value))}${tooltipSuffix}`, cfg.label]}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};
