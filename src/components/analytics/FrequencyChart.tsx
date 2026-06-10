import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import { Card } from '../common/Card';
import { getWeeklyActivityFrequency, fillWeeklyGaps, weekAxisTick } from '../../utils/workoutUtils';
import type { TaggedWorkout } from '../../hooks/useWorkouts';

interface Props {
  workouts: TaggedWorkout[];
  runs?: { startTime: Date }[];
  fillGaps?: boolean;
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
}

const CYAN = '#00F0FF';

export const FrequencyChart: React.FC<Props> = ({ workouts, runs = [], fillGaps = false, rangeStart, rangeEnd }) => {
  const chartData = useMemo(() => {
    const base = getWeeklyActivityFrequency(workouts, runs);
    if (!fillGaps) return base;
    return fillWeeklyGaps(
      base,
      (weekKey, label) => ({ weekKey, label, workoutCount: 0 }),
      rangeStart,
      rangeEnd,
    );
  }, [workouts, runs, fillGaps, rangeStart, rangeEnd]);

  const avgFrequency = useMemo(() => {
    if (chartData.length === 0) return 0;
    const total = chartData.reduce((sum, d) => sum + d.workoutCount, 0);
    return Math.round((total / chartData.length) * 10) / 10;
  }, [chartData]);

  if (workouts.length === 0 && runs.length === 0) {
    return (
      <Card style={{ height: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'Outfit' }}>No data for this range</p>
      </Card>
    );
  }

  return (
    <Card style={{ height: '360px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '20px' }}>
        <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Activity Frequency
        </h3>
        <span style={{ fontFamily: 'Outfit', fontSize: '12px', color: 'var(--text-muted)' }}>
          avg {avgFrequency}/wk
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <filter id="cyanGlow">
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
              minTickGap={32}
              tickFormatter={weekAxisTick}
            />
            <YAxis
              stroke="var(--text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              domain={[0, 'dataMax + 1']}
            />
            <ReferenceLine
              y={avgFrequency}
              stroke={CYAN}
              strokeDasharray="4 4"
              strokeOpacity={0.35}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-darker)',
                border: '1px solid var(--glass-border)',
                borderRadius: '12px',
                fontFamily: 'Outfit',
              }}
              itemStyle={{ color: CYAN, fontWeight: 'bold' }}
              labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px' }}
              formatter={(value: unknown) => [String(value), 'Activities']}
            />
            <Line
              type="monotone"
              dataKey="workoutCount"
              stroke={CYAN}
              strokeWidth={3}
              dot={{ fill: CYAN, r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: CYAN, filter: 'url(#cyanGlow)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
