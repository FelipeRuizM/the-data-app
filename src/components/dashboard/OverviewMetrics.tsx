import React, { useMemo } from 'react';
import { Card } from '../common/Card';
import { useSettings } from '../../context/SettingsContext';
import type { WorkoutSet } from '../../utils/csvParser';
import { startOfWeek, subWeeks, format } from 'date-fns';

const WEEK_OPTS = { weekStartsOn: 0 as const };

interface Props {
  workouts: WorkoutSet[];
}

export const OverviewMetrics: React.FC<Props> = ({ workouts }) => {
  const { unit } = useSettings();

  const metrics = useMemo(() => {
    if (workouts.length === 0) return { avgVol: 0, avgDur: 0, avgSets: 0, maxBench: 0, streak: 0 };
    
    const sessions = new Map<string, { vol: number, dur: number, sets: number }>();
    let maxBench = 0;
    
    const weeksSet = new Set<string>();
    const timestamps: number[] = [];

    workouts.forEach(w => {
      const sessionId = w.startTime.getTime().toString();
      const existing = sessions.get(sessionId) || { vol: 0, dur: 0, sets: 0 };
      
      const setVol = w.weightKg * w.reps;
      
      let dur = w.durationSeconds;
      if (!dur && w.endTime && w.startTime) {
        dur = (w.endTime.getTime() - w.startTime.getTime()) / 1000;
      }
      
      sessions.set(sessionId, {
        vol: existing.vol + setVol,
        dur: dur > existing.dur ? dur : existing.dur, // Using max session duration detected
        sets: existing.sets + 1
      });

      // Best bench tracking — exclude failed lifts that didn't complete a rep.
      const isFailedLift = (w as any).setType === 'failure' && w.reps === 0;
      if (!isFailedLift && w.exerciseTitle.toLowerCase().includes('bench press')) {
        if (w.weightKg > maxBench) maxBench = w.weightKg;
      }

      weeksSet.add(format(startOfWeek(w.startTime, WEEK_OPTS), 'yyyy-MM-dd'));
      timestamps.push(w.startTime.getTime());
    });

    let totalVol = 0;
    let totalDur = 0;
    let totalSets = 0;
    
    sessions.forEach(s => {
      totalVol += s.vol;
      totalDur += s.dur;
      totalSets += s.sets;
    });

    const sessionCount = sessions.size;

    // ISO Consistent Weekly Streak Algorithm
    let streak = 0;
    const sortedDates = timestamps.sort((a, b) => b - a);
    let latestWeekStart = startOfWeek(new Date(sortedDates[0]), WEEK_OPTS);
    
    while (weeksSet.has(format(latestWeekStart, 'yyyy-MM-dd'))) {
      streak++;
      latestWeekStart = subWeeks(latestWeekStart, 1);
    }
    
    return {
      avgVol: sessionCount ? Math.round(totalVol / sessionCount) : 0,
      avgDur: sessionCount ? Math.round(totalDur / sessionCount / 60) : 0,
      avgSets: sessionCount ? Math.round(totalSets / sessionCount) : 0,
      maxBench,
      streak
    };
  }, [workouts]);

  const displayAvgVol = unit === 'lbs' ? Math.round(metrics.avgVol * 2.20462) : metrics.avgVol;
  const displayBench = unit === 'lbs' ? Math.round(metrics.maxBench * 2.20462) : metrics.maxBench;

  const valueStyle = {
    fontFamily: 'Inter, sans-serif', 
    fontSize: '42px', 
    fontWeight: 'bold', 
    background: 'var(--accent-gradient)', 
    WebkitBackgroundClip: 'text', 
    WebkitTextFillColor: 'transparent', 
    WebkitBoxDecorationBreak: 'clone' as const
  };

  const labelStyle = {
    fontFamily: 'Outfit, sans-serif', 
    color: 'var(--text-secondary)', 
    fontSize: '14px', 
    textTransform: 'uppercase' as const, 
    letterSpacing: '0.05em', 
    marginBottom: '8px'
  };

  const unitStyle = {
    fontSize: '18px', 
    WebkitTextFillColor: 'var(--text-muted)'
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '24px' }}>
      <Card>
        <div style={labelStyle}>Avg Volume / Session</div>
        <div style={valueStyle}>
          {displayAvgVol.toLocaleString()} <span style={unitStyle}>{unit}</span>
        </div>
      </Card>

      <Card>
        <div style={labelStyle}>Avg Session Time</div>
        <div style={valueStyle}>
          {metrics.avgDur} <span style={unitStyle}>min</span>
        </div>
      </Card>

      <Card>
        <div style={labelStyle}>Best Bench Press</div>
        <div style={valueStyle}>
          {displayBench} <span style={unitStyle}>{unit}</span>
        </div>
      </Card>

      <Card>
        <div style={labelStyle}>Weekly Streak</div>
        <div style={valueStyle}>
          <span style={{ fontSize: '32px' }}>🔥</span> {metrics.streak} <span style={unitStyle}>wks</span>
        </div>
      </Card>
    </div>
  );
};
