import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card } from '../common/Card';
import { useSettings } from '../../context/SettingsContext';
import type { WorkoutSet } from '../../utils/csvParser';
import { format } from 'date-fns';

interface Props {
  workouts: WorkoutSet[];
}

export const VolumeChart: React.FC<Props> = ({ workouts }) => {
  const { unit } = useSettings();

  const chartData = useMemo(() => {
    const sessionMap = new Map<string, { dateObj: Date, volume: number }>();
    
    workouts.forEach(w => {
      const dateKey = format(w.startTime, 'yyyy-MM-dd');
      const vol = w.weightKg * w.reps; // Strict KG tracking underneath
      const current = sessionMap.get(dateKey) || { dateObj: w.startTime, volume: 0 };
      sessionMap.set(dateKey, {
        dateObj: w.startTime,
        volume: current.volume + vol
      });
    });

    const list = Array.from(sessionMap.values()).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    
    return list.map(s => ({
      date: format(s.dateObj, 'MMM dd'),
      baseVolume: s.volume
    }));
  }, [workouts]);

  // Transform data dynamically pre-render based on Global Settings
  const displayData = useMemo(() => {
    const multiplier = unit === 'lbs' ? 2.20462 : 1;
    return chartData.map(d => ({
      ...d,
      displayVolume: Math.round(d.baseVolume * multiplier)
    }));
  }, [chartData, unit]);

  if (workouts.length === 0) return null;

  return (
    <Card style={{ height: '360px' }}>
      <h3 style={{ fontFamily: 'Outfit', fontSize: '18px', marginBottom: '24px' }}>
        Volume Progression ({unit.toUpperCase()})
      </h3>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={displayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="pinkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent-pink-main)" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="var(--accent-pink-main)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="var(--text-muted)" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              tickMargin={10} 
            />
            <YAxis 
              stroke="var(--text-muted)" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val} 
            />
            <Tooltip 
              contentStyle={{ background: 'var(--bg-darker)', border: '1px solid var(--glass-border)', borderRadius: '12px' }}
              itemStyle={{ color: 'var(--accent-pink-main)', fontWeight: 'bold' }}
              labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px' }}
              formatter={((value: unknown) => [`${Number(value ?? 0).toLocaleString()} ${unit}`, 'Volume']) as any}
            />
            <Area 
              type="monotone" 
              dataKey="displayVolume" 
              stroke="var(--accent-pink-main)" 
              strokeWidth={4}
              fillOpacity={1} 
              fill="url(#pinkGradient)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
