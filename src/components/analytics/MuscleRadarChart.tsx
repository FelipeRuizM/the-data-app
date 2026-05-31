import React, { useMemo } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Tooltip,
} from 'recharts';
import { Card } from '../common/Card';
import { useExercises } from '../../context/ExercisesContext';
import { useSettings } from '../../context/SettingsContext';
import { getVolumeByMuscleGroup, MUSCLE_GROUPS } from '../../utils/workoutUtils';
import type { WorkoutSet } from '../../utils/csvParser';

interface Props {
  workouts: WorkoutSet[];
}

const PINK = '#FF2E93';

// Primary movement groups shown on the radar — 'Core' and 'Other' are excluded
// as they aren't useful axes for a strength-balance shape.
const RADAR_GROUPS = MUSCLE_GROUPS.filter(g => g !== 'Core' && g !== 'Other');

export const MuscleRadarChart: React.FC<Props> = ({ workouts }) => {
  const { getMuscleGroup } = useExercises();
  const { unit } = useSettings();
  const multiplier = unit === 'lbs' ? 2.20462 : 1;

  const data = useMemo(() => {
    const byGroup = new Map(
      getVolumeByMuscleGroup(workouts, getMuscleGroup).map(g => [g.name, g.volumeKg]),
    );
    // Plot every primary group (0 when absent) so the radar keeps a full shape.
    return RADAR_GROUPS.map(name => ({
      muscle: name,
      volume: Math.round((byGroup.get(name) ?? 0) * multiplier),
    }));
  }, [workouts, getMuscleGroup, multiplier]);

  const fmt = (v: number) =>
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
    : v >= 1000    ? `${(v / 1000).toFixed(1)}k`
    : String(v);

  if (workouts.length === 0) {
    return (
      <Card style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'Outfit' }}>No data for this range</p>
      </Card>
    );
  }

  return (
    <Card style={{ height: '400px' }}>
      <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
        Muscle Split ({unit.toUpperCase()})
      </h3>
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
              dataKey="volume"
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
              formatter={(value: unknown) => [`${fmt(Number(value))} ${unit}`, 'Volume']}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
