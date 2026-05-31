import React, { useMemo, useState } from 'react';
import { Pencil, Trash2, Plus, X, Check } from 'lucide-react';
import { useExercises, type Exercise } from '../../context/ExercisesContext';
import { useAuth } from '../../context/AuthContext';
import { MUSCLE_GROUPS } from '../../utils/workoutUtils';

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff',
  borderRadius: '10px',
  padding: '10px 14px',
  fontFamily: 'Inter',
  fontSize: '14px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'auto',
  cursor: 'pointer',
};

const iconBtnStyle: React.CSSProperties = {
  width: '34px',
  height: '34px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid var(--glass-border)',
  borderRadius: '8px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-secondary)',
  flexShrink: 0,
};

// ── A single library row — view mode with inline edit ────────────────────────
const ExerciseRow: React.FC<{ exercise: Exercise }> = ({ exercise }) => {
  const { updateExercise, deleteExercise } = useExercises();
  const { canWrite } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName]   = useState(exercise.name);
  const [group, setGroup] = useState(exercise.muscleGroup);
  const [busy, setBusy]   = useState(false);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await updateExercise(exercise.id, { name: trimmed, muscleGroup: group });
      setEditing(false);
    } catch (err) {
      console.error('Failed to update exercise:', err);
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setName(exercise.name);
    setGroup(exercise.muscleGroup);
    setEditing(false);
  };

  const del = async () => {
    if (!window.confirm(`Delete "${exercise.name}"? This won't change workouts already logged with it.`)) return;
    setBusy(true);
    try {
      await deleteExercise(exercise.id);
    } catch (err) {
      console.error('Failed to delete exercise:', err);
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px 0', flexWrap: 'wrap' }}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
          style={{ ...inputStyle, flex: '2 1 150px' }}
          autoFocus
        />
        <select value={group} onChange={e => setGroup(e.target.value)} style={{ ...selectStyle, flex: '1 1 120px' }}>
          {MUSCLE_GROUPS.map(g => (
            <option key={g} value={g} style={{ background: 'var(--bg-dark)' }}>{g}</option>
          ))}
        </select>
        <button onClick={save} disabled={busy} title="Save" style={{ ...iconBtnStyle, color: '#2ecc71' }}>
          <Check size={15} />
        </button>
        <button onClick={cancel} disabled={busy} title="Cancel" style={iconBtnStyle}>
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', gap: '12px', alignItems: 'center', padding: '10px 0',
      borderBottom: '1px dashed rgba(255,255,255,0.05)',
    }}>
      <span style={{ flex: 1, fontFamily: 'Inter', fontSize: '14px', color: 'var(--text-primary)' }}>
        {exercise.name}
      </span>
      <span style={{
        fontFamily: 'Inter', fontSize: '12px', fontWeight: 600,
        color: 'var(--accent-pink-main)', background: 'rgba(255,46,147,0.1)',
        padding: '4px 10px', borderRadius: '20px',
      }}>
        {exercise.muscleGroup}
      </span>
      {canWrite && (
        <>
          <button onClick={() => setEditing(true)} disabled={busy} title="Edit" style={iconBtnStyle}>
            <Pencil size={14} />
          </button>
          <button onClick={del} disabled={busy} title="Delete" style={{ ...iconBtnStyle, color: '#fca5a5' }}>
            <Trash2 size={14} />
          </button>
        </>
      )}
    </div>
  );
};

// ── Exercise library manager ─────────────────────────────────────────────────
export const ExerciseManager: React.FC = () => {
  const { exercises, loading, createExercise } = useExercises();
  const { canWrite } = useAuth();
  const [search, setSearch]     = useState('');
  const [newName, setNewName]   = useState('');
  const [newGroup, setNewGroup] = useState('Other');
  const [adding, setAdding]     = useState(false);
  const [error, setError]       = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? exercises.filter(e => e.name.toLowerCase().includes(q)) : exercises;
  }, [exercises, search]);

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    if (exercises.some(e => e.name.toLowerCase() === name.toLowerCase())) {
      setError('An exercise with that name already exists.');
      return;
    }
    setError('');
    setAdding(true);
    try {
      await createExercise(name, newGroup);
      setNewName('');
      setNewGroup('Other');
    } catch (err) {
      console.error('Failed to create exercise:', err);
      setError('Could not save exercise. Try again.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div>
      <h3 style={{ fontSize: '18px', marginBottom: '8px', fontFamily: 'Outfit' }}>Exercise Library</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
        Add, rename or remove exercises and set the muscle group used across your analytics.
      </p>

      {/* Add form (owner only) */}
      {canWrite && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input
              value={newName}
              onChange={e => { setNewName(e.target.value); setError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') add(); }}
              placeholder="New exercise name"
              style={{ ...inputStyle, flex: '2 1 150px' }}
            />
            <select value={newGroup} onChange={e => setNewGroup(e.target.value)} style={{ ...selectStyle, flex: '1 1 120px' }}>
              {MUSCLE_GROUPS.map(g => (
                <option key={g} value={g} style={{ background: 'var(--bg-dark)' }}>{g}</option>
              ))}
            </select>
            <button
              onClick={add}
              disabled={adding || !newName.trim()}
              style={{
                padding: '10px 18px',
                background: newName.trim() ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
                border: 'none', borderRadius: '10px',
                color: newName.trim() ? '#fff' : 'var(--text-muted)',
                fontFamily: 'Outfit', fontWeight: 600, fontSize: '14px',
                cursor: adding || !newName.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
              }}
            >
              <Plus size={15} /> {adding ? 'Adding…' : 'Add'}
            </button>
          </div>
          {error && <p style={{ color: '#fca5a5', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
        </>
      )}

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={`Search ${exercises.length} exercise${exercises.length === 1 ? '' : 's'}…`}
        style={{ ...inputStyle, marginBottom: '4px' }}
      />

      {/* List */}
      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '16px 0' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '16px 0' }}>
          {exercises.length === 0
            ? 'No exercises yet. Add your first one above.'
            : 'No exercises match your search.'}
        </p>
      ) : (
        <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
          {filtered.map(ex => <ExerciseRow key={ex.id} exercise={ex} />)}
        </div>
      )}
    </div>
  );
};
