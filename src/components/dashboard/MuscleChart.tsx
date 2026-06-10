import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card } from '../common/Card';
import { useExercises } from '../../context/ExercisesContext';
import type { WorkoutSet } from '../../utils/csvParser';

interface Props {
  workouts: WorkoutSet[];
}

const COLORS = [
  '#FF2E93', // Primary pink
  '#9D00FF', // Deep Purple
  '#00F0FF', // Neon Blue
  '#FF85B3', // Light pink
  '#2E3C50', // Slate
  '#5C677D'  // Muted Gray
];

export const MuscleChart: React.FC<Props> = ({ workouts }) => {
  const { getMuscleGroup } = useExercises();

  const data = useMemo(() => {
    const groups = new Map<string, number>();

    workouts.forEach(w => {
      const group = getMuscleGroup(w.exerciseTitle);
      const current = groups.get(group) || 0;
      groups.set(group, current + 1); // We count by SETS dedicated to this muscle group
    });

    const result = Array.from(groups.entries()).map(([name, value]) => ({ name, value }));
    return result.sort((a, b) => b.value - a.value).filter(r => r.value > 0);
  }, [workouts, getMuscleGroup]);

  if (workouts.length === 0) return null;

  return (
    <Card style={{ height: '360px' }}>
      <h3 style={{ fontFamily: 'Outfit', fontSize: '18px', marginBottom: '16px' }}>Muscle Group Split (Sets)</h3>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={75}
              outerRadius={110}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
              cornerRadius={6}
            >
              {data.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ background: 'var(--bg-darker)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'var(--text-primary)' }}
              itemStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
