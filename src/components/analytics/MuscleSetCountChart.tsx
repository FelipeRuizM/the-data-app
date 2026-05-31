import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { Card } from '../common/Card';
import { useExercises } from '../../context/ExercisesContext';
import { getVolumeByMuscleGroup } from '../../utils/workoutUtils';
import type { WorkoutSet } from '../../utils/csvParser';

interface Props {
  workouts: WorkoutSet[];
}

// One color per muscle group, pink → purple → blue spread.
const BAR_COLORS = ['#FF2E93', '#C81AAE', '#9D00FF', '#6A3CFF', '#00A8FF', '#00F0FF', '#5C677D'];

export const MuscleSetCountChart: React.FC<Props> = ({ workouts }) => {
  const { getMuscleGroup } = useExercises();

  const data = useMemo(() => {
    return getVolumeByMuscleGroup(workouts, getMuscleGroup)
      .map(g => ({ name: g.name, sets: g.sets }))
      .sort((a, b) => b.sets - a.sets);
  }, [workouts, getMuscleGroup]);

  if (data.length === 0) {
    return (
      <Card style={{ height: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'Outfit' }}>No data for this range</p>
      </Card>
    );
  }

  return (
    <Card style={{ height: '360px' }}>
      <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: 'var(--text-primary)' }}>
        Sets per Muscle Group
      </h3>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis
              type="number"
              stroke="var(--text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="var(--text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={70}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              contentStyle={{
                background: 'var(--bg-darker)',
                border: '1px solid var(--glass-border)',
                borderRadius: '12px',
                fontFamily: 'Outfit',
              }}
              itemStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
              labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px' }}
              formatter={(value: unknown) => [`${Number(value).toLocaleString()} sets`, 'Sets']}
            />
            <Bar dataKey="sets" radius={[0, 4, 4, 0]} maxBarSize={26}>
              {data.map((_entry, index) => (
                <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
