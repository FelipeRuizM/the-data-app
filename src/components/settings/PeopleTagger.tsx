import React, { useMemo, useState } from 'react';
import { ref, update } from 'firebase/database';
import { format } from 'date-fns';
import { realtimeDb } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useWorkouts } from '../../hooks/useWorkouts';
import { usePeople } from '../../context/PeopleContext';
import { groupWorkoutSessions } from '../../utils/sessions';
import { PeoplePicker } from '../common/PeoplePicker';

const selectStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff',
  borderRadius: '8px',
  padding: '7px 10px',
  fontFamily: 'Inter',
  fontSize: '13px',
  outline: 'none',
  appearance: 'auto',
  cursor: 'pointer',
  minWidth: '150px',
};

/**
 * Quick bulk editor for tagging training partners on existing WORKOUTS.
 * Owner-only — writes a partial update to /users/{uid}/workouts/{id}
 * (touches `people` only).
 */
export const PeopleTagger: React.FC = () => {
  const { user, canWrite } = useAuth();
  const uid = user?.uid;
  const { workouts } = useWorkouts();
  const { people } = usePeople();

  const [bulkPerson, setBulkPerson] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  const sessions = useMemo(() => groupWorkoutSessions(workouts), [workouts]);
  const options = useMemo(() => people.map(p => p.name), [people]);

  const missingCount = useMemo(
    () => (bulkPerson ? sessions.filter(s => !s.people.includes(bulkPerson)).length : 0),
    [sessions, bulkPerson],
  );

  const setPeople = async (sessionId: string, next: string[]) => {
    if (!uid || !canWrite) return;
    try {
      await update(ref(realtimeDb, `/users/${uid}/workouts/${sessionId}`), { people: next });
    } catch (err) {
      console.error('[DB] Failed to set workout people:', err);
    }
  };

  const addPersonToAll = async () => {
    if (!uid || !canWrite || !bulkPerson || bulkBusy) return;
    if (!window.confirm(`Add "${bulkPerson}" to ${missingCount} workout${missingCount === 1 ? '' : 's'}?`)) return;
    setBulkBusy(true);
    try {
      await Promise.all(
        sessions
          .filter(s => !s.people.includes(bulkPerson))
          .map(s => update(ref(realtimeDb, `/users/${uid}/workouts/${s.id}`), { people: [...s.people, bulkPerson] })),
      );
    } catch (err) {
      console.error('[DB] Bulk people update failed:', err);
    } finally {
      setBulkBusy(false);
    }
  };

  if (!canWrite) return null;

  return (
    <div>
      <h3 style={{ fontSize: '18px', marginBottom: '8px', fontFamily: 'Outfit' }}>Tag Workout Partners</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
        Quickly add who you trained with on past workouts. Changes save instantly.
        {people.length === 0 && ' Add people above first.'}
      </p>

      {/* Bulk: add one person to every workout that doesn't have them */}
      {people.length > 0 && sessions.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
          <select value={bulkPerson} onChange={e => setBulkPerson(e.target.value)} style={selectStyle}>
            <option value="" style={{ background: 'var(--bg-dark)' }}>Choose a person…</option>
            {options.map(name => (
              <option key={name} value={name} style={{ background: 'var(--bg-dark)' }}>{name}</option>
            ))}
          </select>
          <button
            onClick={addPersonToAll}
            disabled={!bulkPerson || missingCount === 0 || bulkBusy}
            style={{
              padding: '8px 16px',
              background: bulkPerson && missingCount > 0 ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
              border: 'none', borderRadius: '8px',
              color: bulkPerson && missingCount > 0 ? '#fff' : 'var(--text-muted)',
              fontFamily: 'Outfit', fontWeight: 600, fontSize: '13px',
              cursor: !bulkPerson || missingCount === 0 || bulkBusy ? 'not-allowed' : 'pointer',
            }}
          >
            {bulkBusy ? 'Applying…' : bulkPerson ? `Add to ${missingCount} workout${missingCount === 1 ? '' : 's'}` : 'Add to all'}
          </button>
        </div>
      )}

      {/* Per-workout list */}
      {sessions.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '16px 0' }}>No workouts logged yet.</p>
      ) : (
        <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
          {sessions.map(s => (
            <div
              key={s.id}
              style={{
                display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px 0',
                borderBottom: '1px dashed rgba(255,255,255,0.05)',
              }}
            >
              <div style={{ width: '150px', flexShrink: 0 }}>
                <div style={{ fontFamily: 'Inter', fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.title || 'Workout'}
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: '12px', color: 'var(--text-muted)' }}>
                  {format(s.startTime, 'd MMM yyyy')}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <PeoplePicker
                  options={options}
                  value={s.people}
                  onChange={next => setPeople(s.id, next)}
                  emptyHint="No people to add."
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
