import React, { useMemo, useState } from 'react';
import { ref, push, update, remove } from 'firebase/database';
import { format } from 'date-fns';
import { Footprints, Pencil, Trash2, MapPin } from 'lucide-react';
import { realtimeDb } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useRuns, RUN_TYPES, type RunType, type Run } from '../hooks/useRuns';
import { Card } from '../components/common/Card';
import { inputStyle, selectStyle, labelStyle } from '../styles/formStyles';

const TYPE_COLORS: Record<RunType, string> = {
  Light: '#4ADE80',
  Explosion: '#FB7185',
  Long: '#60A5FA',
  Other: '#A78BFA',
};

const parseTimeToSeconds = (str: string): number => {
  const trimmed = str.trim();
  if (!trimmed) return 0;
  const parts = trimmed.split(':').map((p) => Number(p));
  if (parts.some((n) => isNaN(n))) return 0;
  // mm:ss  or  hh:mm:ss
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 1) return parts[0] * 60; // bare number = minutes
  return 0;
};

const formatDuration = (seconds: number): string => {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};

const emptyForm = () => ({
  title: '',
  type: 'Light' as RunType,
  distance: '',
  pace: '',
  time: '',
  elevationGain: '',
  maxElevation: '',
  steps: '',
  dateTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  description: '',
});

const sectionTitle: React.CSSProperties = {
  marginBottom: '24px',
  letterSpacing: '-0.02em',
  fontFamily: 'Outfit',
};

export const Running: React.FC = () => {
  const { canWrite, dataUid } = useAuth();
  const { runs, loading } = useRuns();

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const stats = useMemo(() => {
    const totalDistance = runs.reduce((sum, r) => sum + r.distanceKm, 0);
    const totalTime = runs.reduce((sum, r) => sum + r.durationSeconds, 0);
    return { totalRuns: runs.length, totalDistance, totalTime };
  }, [runs]);

  const setField = (key: keyof ReturnType<typeof emptyForm>, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  const startEdit = (run: Run) => {
    setEditingId(run.id);
    setForm({
      title: run.title,
      type: run.type,
      distance: run.distanceKm ? String(run.distanceKm) : '',
      pace: run.pace,
      time: formatDuration(run.durationSeconds),
      elevationGain: run.elevationGainM ? String(run.elevationGainM) : '',
      maxElevation: run.maxElevationM ? String(run.maxElevationM) : '',
      steps: run.steps ? String(run.steps) : '',
      dateTime: format(run.startTime, "yyyy-MM-dd'T'HH:mm"),
      description: run.description,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveRun = async () => {
    if (!canWrite || !dataUid || isSaving) return;
    const date = new Date(form.dateTime);
    if (isNaN(date.getTime())) return;

    const payload = {
      title: form.title.trim(),
      type: form.type,
      start_time: format(date, 'd MMM yyyy, HH:mm'),
      distance_km: Number(form.distance) || 0,
      duration_seconds: parseTimeToSeconds(form.time),
      pace: form.pace.trim(),
      elevation_gain_m: Number(form.elevationGain) || 0,
      max_elevation_m: Number(form.maxElevation) || 0,
      steps: Number(form.steps) || 0,
      description: form.description.trim(),
    };

    setIsSaving(true);
    try {
      if (editingId) {
        await update(ref(realtimeDb, `/users/${dataUid}/runs/${editingId}`), payload);
      } else {
        await push(ref(realtimeDb, `/users/${dataUid}/runs`), payload);
      }
      resetForm();
    } catch (err) {
      console.error('[DB] Failed to save run:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRun = async (id: string) => {
    if (!canWrite || !dataUid) return;
    if (!window.confirm('Delete this run?')) return;
    try {
      await remove(ref(realtimeDb, `/users/${dataUid}/runs/${id}`));
      if (editingId === id) resetForm();
    } catch (err) {
      console.error('[DB] Failed to delete run:', err);
    }
  };

  const primaryBtn: React.CSSProperties = {
    flex: 1,
    padding: '14px',
    background: 'var(--accent-gradient)',
    border: 'none',
    borderRadius: '14px',
    color: '#fff',
    fontFamily: 'Outfit',
    fontSize: '16px',
    fontWeight: 600,
    cursor: isSaving ? 'not-allowed' : 'pointer',
    opacity: isSaving ? 0.6 : 1,
    transition: 'all 0.2s ease',
    letterSpacing: '0.02em',
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

      {/* Logging form (owner only) */}
      {canWrite && (
        <Card style={{ marginBottom: '24px' }}>
          <h3 style={{ fontFamily: 'Outfit', marginTop: 0, marginBottom: '20px' }}>
            {editingId ? 'Edit Run' : 'Log a Run'}
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px',
            }}
          >
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Title</label>
              <input
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                placeholder="Morning run"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Type</label>
              <select value={form.type} onChange={(e) => setField('type', e.target.value)} style={selectStyle}>
                {RUN_TYPES.map((t) => (
                  <option key={t} value={t} style={{ background: 'var(--bg-dark)' }}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Distance (km)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.distance}
                onChange={(e) => setField('distance', e.target.value)}
                placeholder="5.0"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Pace</label>
              <input
                value={form.pace}
                onChange={(e) => setField('pace', e.target.value)}
                placeholder="5:30 /km"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Moving time</label>
              <input
                value={form.time}
                onChange={(e) => setField('time', e.target.value)}
                placeholder="27:30"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Elevation Gain (m)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={form.elevationGain}
                onChange={(e) => setField('elevationGain', e.target.value)}
                placeholder="250"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Max Elevation (m)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={form.maxElevation}
                onChange={(e) => setField('maxElevation', e.target.value)}
                placeholder="1200"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Steps</label>
              <input
                type="number"
                step="1"
                min="0"
                value={form.steps}
                onChange={(e) => setField('steps', e.target.value)}
                placeholder="6500"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Date &amp; Time</label>
              <input
                type="datetime-local"
                value={form.dateTime}
                onChange={(e) => setField('dateTime', e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="Where did you run today?"
                rows={2}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'Inter' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button onClick={saveRun} disabled={isSaving} style={primaryBtn}>
              {isSaving ? 'Saving...' : editingId ? 'Update Run' : 'Save Run'}
            </button>
            {editingId && (
              <button
                onClick={resetForm}
                style={{
                  padding: '14px 20px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '14px',
                  color: 'var(--text-secondary)',
                  fontFamily: 'Outfit',
                  fontSize: '16px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </Card>
      )}

      {/* History */}
      <h3 style={{ ...sectionTitle, fontSize: '18px' }}>History</h3>
      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading runs...</p>
      ) : runs.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No runs logged yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {runs.map((run) => (
            <Card key={run.id}>
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
                    <span style={{ color: 'var(--text-muted)' }}>{format(run.startTime, 'd MMM yyyy, HH:mm')}</span>
                  </div>
                  {run.description && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', color: 'var(--text-muted)', fontFamily: 'Inter', fontSize: '13px' }}>
                      <MapPin size={13} />
                      <span>{run.description}</span>
                    </div>
                  )}
                </div>

                {canWrite && (
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={() => startEdit(run)}
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
