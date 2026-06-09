import React, { useMemo } from 'react';
import { ref, remove } from 'firebase/database';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Footprints, Pencil, Trash2, MapPin, HeartPulse, Flame } from 'lucide-react';
import { realtimeDb } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useRuns, type RunType } from '../hooks/useRuns';
import { Card } from '../components/common/Card';
import { labelStyle } from '../styles/formStyles';
import { formatDuration } from '../utils/runFormat';

const TYPE_COLORS: Record<RunType, string> = {
  Light: '#4ADE80',
  Explosion: '#FB7185',
  Long: '#60A5FA',
  Other: '#A78BFA',
};

const sectionTitle: React.CSSProperties = {
  marginBottom: '24px',
  letterSpacing: '-0.02em',
  fontFamily: 'Outfit',
};

export const Running: React.FC = () => {
  const { canWrite, dataUid } = useAuth();
  const { runs, loading } = useRuns();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const totalDistance = runs.reduce((sum, r) => sum + r.distanceKm, 0);
    const totalTime = runs.reduce((sum, r) => sum + r.durationSeconds, 0);
    return { totalRuns: runs.length, totalDistance, totalTime };
  }, [runs]);

  const deleteRun = async (id: string) => {
    if (!canWrite || !dataUid) return;
    if (!window.confirm('Delete this run?')) return;
    try {
      await remove(ref(realtimeDb, `/users/${dataUid}/runs/${id}`));
    } catch (err) {
      console.error('[DB] Failed to delete run:', err);
    }
  };

  return (
    <div
      style={{
        padding: '24px',
        animation: 'fadeIn 0.5s ease-out',
        paddingBottom: '64px',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <h2 style={sectionTitle}>Running</h2>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <Card>
          <div style={labelStyle}>Total Runs</div>
          <div style={{ fontFamily: 'Inter', fontSize: '32px', fontWeight: 'bold' }}>
            {stats.totalRuns}
          </div>
        </Card>
        <Card>
          <div style={labelStyle}>Total Distance</div>
          <div style={{ fontFamily: 'Inter', fontSize: '32px', fontWeight: 'bold' }}>
            {stats.totalDistance.toFixed(1)} <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>km</span>
          </div>
        </Card>
        <Card>
          <div style={labelStyle}>Total Moving Time</div>
          <div style={{ fontFamily: 'Inter', fontSize: '32px', fontWeight: 'bold' }}>
            {formatDuration(stats.totalTime)}
          </div>
        </Card>
      </div>

      {/* History */}
      <h3 style={{ ...sectionTitle, fontSize: '18px' }}>History</h3>
      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading runs...</p>
      ) : runs.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>
          No runs logged yet.{canWrite ? ' Add one from the home screen.' : ''}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {runs.map((run) => (
            <Card key={run.id} style={{ borderLeft: `4px solid ${TYPE_COLORS[run.type]}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <Footprints size={16} style={{ color: TYPE_COLORS[run.type] }} />
                    <span style={{ fontFamily: 'Outfit', fontWeight: 600 }}>{run.title || 'Run'}</span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontFamily: 'Inter',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: TYPE_COLORS[run.type],
                        border: `1px solid ${TYPE_COLORS[run.type]}55`,
                        borderRadius: '999px',
                        padding: '2px 10px',
                      }}
                    >
                      {run.type}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', color: 'var(--text-secondary)', fontFamily: 'Inter', fontSize: '14px' }}>
                    <span>{run.distanceKm.toFixed(2)} km</span>
                    <span>{formatDuration(run.durationSeconds)}</span>
                    {run.pace && <span>{run.pace}</span>}
                    {run.elevationGainM > 0 && <span>↑ {run.elevationGainM} m</span>}
                    {run.maxElevationM > 0 && <span>⛰ {run.maxElevationM} m</span>}
                    {run.steps > 0 && <span>{run.steps.toLocaleString()} steps</span>}
                    {run.avgHeartRate > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <HeartPulse size={13} style={{ color: '#FB7185' }} /> {run.avgHeartRate} bpm
                      </span>
                    )}
                    {run.calories > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Flame size={13} style={{ color: '#F59E0B' }} /> {run.calories.toLocaleString()} kcal
                      </span>
                    )}
                    <span style={{ color: 'var(--text-muted)' }}>{format(run.startTime, 'd MMM yyyy, HH:mm')}</span>
                  </div>
                  {run.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', color: 'var(--text-secondary)', fontFamily: 'Inter', fontSize: '13px' }}>
                      <MapPin size={13} />
                      <span>{run.location}</span>
                    </div>
                  )}
                  {run.description && (
                    <div style={{ marginTop: '6px', color: 'var(--text-muted)', fontFamily: 'Inter', fontSize: '13px', fontStyle: 'italic' }}>
                      "{run.description}"
                    </div>
                  )}
                </div>

                {canWrite && (
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={() => navigate(`/add/run?edit=${run.id}`)}
                      aria-label="Edit run"
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => deleteRun(run.id)}
                      aria-label="Delete run"
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
