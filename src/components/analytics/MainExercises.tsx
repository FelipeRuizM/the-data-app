import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Card } from '../common/Card';
import { getMostLoggedExercises } from '../../utils/workoutUtils';
import type { TaggedWorkout } from '../../hooks/useWorkouts';
import './MainExercises.css';

interface Props {
  workouts: TaggedWorkout[];
}

export const MainExercises: React.FC<Props> = ({ workouts }) => {
  const navigate = useNavigate();

  const data = useMemo(() => getMostLoggedExercises(workouts, 8), [workouts]);
  const max = data[0]?.sessionCount ?? 1;

  return (
    <Card style={{ height: '360px' }}>
      <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)' }}>
        Main Exercises
      </h3>
      {data.length === 0 ? (
        <div className="mx-empty">No data for this range</div>
      ) : (
        <div className="mx-list">
          {data.map((e, i) => (
            <button
              key={e.exerciseTitle}
              className="mx-row"
              onClick={() => navigate(`/exercises/${encodeURIComponent(e.exerciseTitle)}`)}
              title={`View ${e.exerciseTitle}`}
            >
              <span className="mx-rank">{i + 1}</span>
              <div className="mx-info">
                <span className="mx-name">{e.exerciseTitle}</span>
                <span className="mx-bar-track">
                  <span className="mx-bar-fill" style={{ width: `${(e.sessionCount / max) * 100}%` }} />
                </span>
              </div>
              <span className="mx-count">{e.sessionCount}<span className="mx-count-unit"> {e.sessionCount === 1 ? 'time' : 'times'}</span></span>
              <ChevronRight size={15} className="mx-chevron" />
            </button>
          ))}
        </div>
      )}
    </Card>
  );
};
