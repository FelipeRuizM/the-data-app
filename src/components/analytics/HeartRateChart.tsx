import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import { Card } from '../common/Card';
import { getWeeklyHeartRate } from '../../utils/workoutUtils';
import type { TaggedWorkout } from '../../hooks/useWorkouts';

interface Props {
  workouts: TaggedWorkout[];
  runs?: { startTime: Date; avgHeartRate: number }[];
}

const ROSE = '#FB7185';

export const HeartRateChart: React.FC<Props> = ({ workouts, runs = [] }) => {
  const chartData = useMemo(() => getWeeklyHeartRate(workouts, runs), [workouts, runs]);

  const avgHr = useMemo(() => {
    if (chartData.length === 0) return 0;
    const total = chartData.reduce((sum, d) => sum + d.value, 0);
    return Math.round(total / chartData.length);
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <Card style={{ height: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'Outfit' }}>No heart-rate data yet</p>
      </Card>
    );
  }

  return (
    <Card style={{ height: '360px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '20px' }}>
        <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Avg Heart Rate
        </h3>
        <span style={{ fontFamily: 'Outfit', fontSize: '12px', color: 'var(--text-muted)' }}>
          avg {avgHr} bpm
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <filter id="roseGlow">
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
            />
            <YAxis
              stroke="var(--text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              domain={['dataMin - 8', 'dataMax + 8']}
            />
            <ReferenceLine y={avgHr} stroke={ROSE} strokeDasharray="4 4" strokeOpacity={0.35} />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-darker)',
                border: '1px solid var(--glass-border)',
                borderRadius: '12px',
                fontFamily: 'Outfit',
              }}
              itemStyle={{ color: ROSE, fontWeight: 'bold' }}
              labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px' }}
              formatter={(value: unknown) => [`${value} bpm`, 'Avg HR']}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={ROSE}
              strokeWidth={3}
              dot={{ fill: ROSE, r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: ROSE, filter: 'url(#roseGlow)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
