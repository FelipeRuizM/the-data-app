import React, { useEffect, useState } from 'react';
import { ref, push, update } from 'firebase/database';
import { format } from 'date-fns';
import { ChevronLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { realtimeDb } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useRuns, RUN_TYPES, type RunType } from '../hooks/useRuns';
import { useGyms } from '../context/GymsContext';
import { usePeople } from '../context/PeopleContext';
import { Card } from '../components/common/Card';
import { PeoplePicker } from '../components/common/PeoplePicker';
import { inputStyle, selectStyle, labelStyle } from '../styles/formStyles';
import { parseTimeToSeconds, formatDuration, runDifficulty } from '../utils/runFormat';

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
  location: '',
  heartRate: '',
  calories: '',
});

export const AddRun: React.FC = () => {
  const { canWrite, dataUid } = useAuth();
  const { runs } = useRuns();
  const { gyms } = useGyms();
  const { people: dbPeople } = usePeople();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editParam = searchParams.get('edit');

  const [form, setForm] = useState(emptyForm);
  const [runPeople, setRunPeople] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState(5);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Preload an existing run when editing.
  useEffect(() => {
    if (!editParam) return;
    const run = runs.find(r => r.id === editParam);
    if (!run) return;
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
      location: run.location,
      heartRate: run.avgHeartRate ? String(run.avgHeartRate) : '',
      calories: run.calories ? String(run.calories) : '',
    });
    setRunPeople(run.people || []);
    setDifficulty(run.difficulty || 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editParam, runs.length]);

  const setField = (key: keyof ReturnType<typeof emptyForm>, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

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
      location: form.location,
      avg_heart_rate: Number(form.heartRate) || 0,
      calories: Number(form.calories) || 0,
      people: runPeople,
      difficulty,
    };

    setIsSaving(true);
    try {
      if (editingId) {
        await update(ref(realtimeDb, `/users/${dataUid}/runs/${editingId}`), payload);
      } else {
        await push(ref(realtimeDb, `/users/${dataUid}/runs`), payload);
      }
      navigate('/running');
    } catch (err) {
      console.error('[DB] Failed to save run:', err);
    } finally {
      setIsSaving(false);
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

  if (!canWrite) {
    return (
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <p style={{ color: 'var(--text-muted)' }}>You don't have permission to add runs.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '24px',
        animation: 'fadeIn 0.5s ease-out',
        paddingBottom: '64px',
        maxWidth: '900px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => navigate(-1)}
          title="Back"
          style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <ChevronLeft size={20} />
        </button>
        <h2 style={{ margin: 0, letterSpacing: '-0.02em', fontFamily: 'Outfit' }}>
          {editingId ? 'Edit Run' : 'Log a Run'}
        </h2>
      </div>

      <Card>
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
            <label style={labelStyle}>Avg Heart Rate (bpm)</label>
            <input
              type="number"
              step="1"
              min="0"
              value={form.heartRate}
              onChange={(e) => setField('heartRate', e.target.value)}
              placeholder="optional"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Calories</label>
            <input
              type="number"
              step="1"
              min="0"
              value={form.calories}
              onChange={(e) => setField('calories', e.target.value)}
              placeholder="optional"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Location</label>
            <select value={form.location} onChange={(e) => setField('location', e.target.value)} style={selectStyle}>
              <option value="" style={{ background: 'var(--bg-dark)' }}>No location</option>
              {gyms.map((g) => (
                <option key={g.id} value={g.name} style={{ background: 'var(--bg-dark)' }}>{g.name}</option>
              ))}
            </select>
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
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Difficulty</label>
              <span style={{ fontFamily: 'Outfit', fontSize: '14px', fontWeight: 700, color: runDifficulty(difficulty).color }}>
                {runDifficulty(difficulty).label} · {difficulty}/10
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              style={{ width: '100%', accentColor: runDifficulty(difficulty).color, cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Inter', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              <span>Easy</span>
              <span>Medium</span>
              <span>Hard</span>
              <span>Extreme</span>
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Ran With</label>
            <PeoplePicker
              options={dbPeople.map((p) => p.name)}
              value={runPeople}
              onChange={setRunPeople}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="How did the run feel?"
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'Inter' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button
            onClick={() => navigate(-1)}
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
          <button onClick={saveRun} disabled={isSaving} style={primaryBtn}>
            {isSaving ? 'Saving...' : editingId ? 'Update Run' : 'Save Run'}
          </button>
        </div>
      </Card>
    </div>
  );
};
