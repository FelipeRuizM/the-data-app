import React, { useMemo } from 'react';
import { Card } from '../common/Card';
import type { WorkoutSet } from '../../utils/csvParser';
import { startOfWeek, subWeeks, format } from 'date-fns';

const WEEK_OPTS = { weekStartsOn: 0 as const };

interface Props {
  workouts: WorkoutSet[];
}

const fmtDuration = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export const OverviewMetrics: React.FC<Props> = ({ workouts }) => {
  const metrics = useMemo(() => {
    if (workouts.length === 0) return { totalWorkouts: 0, totalDurMin: 0, totalReps: 0, streak: 0 };

    const sessions = new Map<string, { dur: number }>();
    let totalReps = 0;

    const weeksSet = new Set<string>();
    const timestamps: number[] = [];

    workouts.forEach(w => {
      const sessionId = w.startTime.getTime().toString();
      const existing = sessions.get(sessionId) || { dur: 0 };

      let dur = w.durationSeconds;
      if (!dur && w.endTime && w.startTime) {
        dur = (w.endTime.getTime() - w.startTime.getTime()) / 1000;
      }

      sessions.set(sessionId, {
        dur: dur > existing.dur ? dur : existing.dur, // Using max session duration detected
      });

      totalReps += w.reps;

      weeksSet.add(format(startOfWeek(w.startTime, WEEK_OPTS), 'yyyy-MM-dd'));
      timestamps.push(w.startTime.getTime());
    });

    let totalDur = 0;
    sessions.forEach(s => {
      totalDur += s.dur;
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
      totalWorkouts: sessionCount,
      totalDurMin: Math.round(totalDur / 60),
      totalReps,
      streak
    };
  }, [workouts]);

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
        <div style={labelStyle}>Total Workouts</div>
        <div style={valueStyle}>
          {metrics.totalWorkouts.toLocaleString()}
        </div>
      </Card>

      <Card>
        <div style={labelStyle}>Total Time Working Out</div>
        <div style={valueStyle}>
          {fmtDuration(metrics.totalDurMin)}
        </div>
      </Card>

      <Card>
        <div style={labelStyle}>Total Reps</div>
        <div style={valueStyle}>
          {metrics.totalReps.toLocaleString()} <span style={unitStyle}>reps</span>
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
