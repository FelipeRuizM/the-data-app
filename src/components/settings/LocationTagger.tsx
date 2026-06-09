import React, { useMemo, useState } from 'react';
import { ref, update } from 'firebase/database';
import { format } from 'date-fns';
import { Check } from 'lucide-react';
import { realtimeDb } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useWorkouts } from '../../hooks/useWorkouts';
import { useGyms } from '../../context/GymsContext';
import { groupWorkoutSessions } from '../../utils/sessions';

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
  minWidth: '140px',
};

/**
 * Quick bulk editor for setting the `gym` on existing workouts. Owner-only —
 * writes a partial update to /users/{uid}/workouts/{id} (touches `gym` only).
 */
export const LocationTagger: React.FC = () => {
  const { user, canWrite } = useAuth();
  const uid = user?.uid;
  const { workouts } = useWorkouts();
  const { gyms } = useGyms();

  const [savedId, setSavedId] = useState<string | null>(null);
  const [bulkGym, setBulkGym] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  const sessions = useMemo(() => groupWorkoutSessions(workouts), [workouts]);
  const untaggedCount = useMemo(() => sessions.filter(s => !s.gym).length, [sessions]);

  const setGym = async (sessionId: string, gym: string) => {
    if (!uid || !canWrite) return;
    try {
      await update(ref(realtimeDb, `/users/${uid}/workouts/${sessionId}`), { gym });
      setSavedId(sessionId);
      setTimeout(() => setSavedId(cur => (cur === sessionId ? null : cur)), 1500);
    } catch (err) {
      console.error('[DB] Failed to set workout gym:', err);
    }
  };

  const applyToUntagged = async () => {
    if (!uid || !canWrite || !bulkGym || bulkBusy) return;
    if (!window.confirm(`Set "${bulkGym}" on ${untaggedCount} workout${untaggedCount === 1 ? '' : 's'} that have no location yet?`)) return;
    setBulkBusy(true);
    try {
      await Promise.all(
        sessions
          .filter(s => !s.gym)
          .map(s => update(ref(realtimeDb, `/users/${uid}/workouts/${s.id}`), { gym: bulkGym })),
      );
    } catch (err) {
      console.error('[DB] Bulk gym update failed:', err);
    } finally {
      setBulkBusy(false);
    }
  };

  if (!canWrite) return null;

  return (
    <div>
      <h3 style={{ fontSize: '18px', marginBottom: '8px', fontFamily: 'Outfit' }}>Set Workout Locations</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
        Quickly assign a gym to past workouts. Changes save instantly.
        {gyms.length === 0 && ' Add a gym above first.'}
      </p>

      {/* Bulk apply to untagged */}
      {gyms.length > 0 && untaggedCount > 0 && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
          <select value={bulkGym} onChange={e => setBulkGym(e.target.value)} style={selectStyle}>
            <option value="" style={{ background: 'var(--bg-dark)' }}>Choose a gym…</option>
            {gyms.map(g => (
              <option key={g.id} value={g.name} style={{ background: 'var(--bg-dark)' }}>{g.name}</option>
            ))}
          </select>
          <button
            onClick={applyToUntagged}
            disabled={!bulkGym || bulkBusy}
            style={{
              padding: '8px 16px',
              background: bulkGym ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
              border: 'none', borderRadius: '8px',
              color: bulkGym ? '#fff' : 'var(--text-muted)',
              fontFamily: 'Outfit', fontWeight: 600, fontSize: '13px',
              cursor: !bulkGym || bulkBusy ? 'not-allowed' : 'pointer',
            }}
          >
            {bulkBusy ? 'Applying…' : `Apply to ${untaggedCount} untagged`}
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
                display: 'flex', gap: '12px', alignItems: 'center', padding: '10px 0',
                borderBottom: '1px dashed rgba(255,255,255,0.05)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Inter', fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.title || 'Workout'}
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: '12px', color: 'var(--text-muted)' }}>
                  {format(s.startTime, 'd MMM yyyy')}
                </div>
              </div>
              {savedId === s.id && <Check size={15} color="#2ecc71" />}
              <select
                value={s.gym || ''}
                onChange={e => setGym(s.id, e.target.value)}
                style={selectStyle}
              >
                <option value="" style={{ background: 'var(--bg-dark)' }}>No gym</option>
                {gyms.map(g => (
                  <option key={g.id} value={g.name} style={{ background: 'var(--bg-dark)' }}>{g.name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
