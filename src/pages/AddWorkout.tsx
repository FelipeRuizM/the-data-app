import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { format } from 'date-fns';
import { ChevronLeft, Plus, X, Pencil } from 'lucide-react';
import { ref, update, push } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useExercises } from '../context/ExercisesContext';
import { useGyms } from '../context/GymsContext';
import { usePeople } from '../context/PeopleContext';
import { MUSCLE_GROUPS, getLastExerciseSession } from '../utils/workoutUtils';
import { groupWorkoutSessions } from '../utils/sessions';
import { SET_TYPES, getSetLabel, getSetColor, type SetType } from '../utils/workoutDisplay';
import { Card } from '../components/common/Card';
import { PeoplePicker } from '../components/common/PeoplePicker';
import { inputStyle, selectStyle, labelStyle } from '../styles/formStyles';
import { pageTitleStyle } from '../styles/typography';
import type { TaggedWorkout } from '../hooks/useWorkouts';

// ── Logger types ──────────────────────────────────────────────
interface LogSet {
  setType: SetType;
  weight: number;
  reps: number;
}
interface LogExercise {
  exerciseTitle: string;
  notes: string;
  sets: LogSet[];
}

const colHeaderStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  fontFamily: 'Inter',
  fontWeight: 600,
  textAlign: 'center',
};

// Mirror of useWorkouts.ts — bodyweight is added to weightKg on read for these.
const BODYWEIGHT_EXERCISES = ['Pull Up', 'Chin Up', 'Dip', 'Push Up', 'Muscle Up'];
const getBodyweightAddition = (startTime: Date) =>
  startTime >= new Date('2026-02-01') ? 80 : 73;

export const AddWorkout: React.FC<{ workouts: TaggedWorkout[] }> = ({ workouts }) => {
  const { unit } = useSettings();
  const { user, canWrite } = useAuth();
  const uid = user?.uid;
  const { exercises: dbExercises, createExercise } = useExercises();
  const { gyms } = useGyms();
  const { people: dbPeople } = usePeople();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editParam = searchParams.get('edit');

  const freshDateTime = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const [logTitle, setLogTitle]       = useState('Workout');
  const [logDateTime, setLogDateTime] = useState(freshDateTime);
  const [logDuration, setLogDuration] = useState(60);
  const [logCategory, setLogCategory] = useState('Mixed');
  const [logGym, setLogGym]           = useState('');
  const [logHeartRate, setLogHeartRate] = useState('');
  const [logDescription, setLogDescription] = useState('');
  const [logPeople, setLogPeople]     = useState<string[]>([]);
  const [logExercises, setLogExercises] = useState<LogExercise[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [showDropdown, setShowDropdown]     = useState(false);
  const [isSaving, setIsSaving]             = useState(false);
  const [editingId, setEditingId]           = useState<string | null>(null);

  // ── New-exercise creation (writes to the exercise library) ──
  const [newExName, setNewExName]   = useState<string | null>(null);
  const [newExGroup, setNewExGroup] = useState('Other');
  const [creatingEx, setCreatingEx] = useState(false);

  // ── Inline exercise rename (swap which library exercise a slot uses) ──
  const [editingExIdx, setEditingExIdx] = useState<number | null>(null);
  const [editExSearch, setEditExSearch] = useState('');

  // ── Set-type picker popover (anchored via fixed positioning) ──
  const [setMenu, setSetMenu] = useState<{ exIdx: number; sIdx: number; x: number; y: number; placement: 'up' | 'down' } | null>(null);

  useEffect(() => {
    if (!setMenu) return;
    const close = () => setSetMenu(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [setMenu]);

  // ── Preload an existing session when editing ──
  const sessions = useMemo(() => groupWorkoutSessions(workouts), [workouts]);

  useEffect(() => {
    if (!editParam) return;
    const session = sessions.find(s => s.id === editParam);
    if (!session) return;

    const dispMul = unit === 'lbs' ? 2.20462 : 1;
    const bwAdd = getBodyweightAddition(session.startTime);

    const exercises: LogExercise[] = Array.from(session.exercises.entries())
      .map(([exTitle, sets]) => ({
        exerciseTitle: exTitle,
        notes: sets[0]?.exerciseNotes || '',
        sets: sets
          .slice()
          .sort((a, b) => (a.setIndex ?? 0) - (b.setIndex ?? 0))
          .map((s) => {
            const isBodyweight = BODYWEIGHT_EXERCISES.includes(exTitle);
            const rawKg = isBodyweight ? Math.max(0, s.weightKg - bwAdd) : s.weightKg;
            return {
              setType: s.setType as SetType,
              weight: Math.round(rawKg * dispMul * 100) / 100,
              reps: s.reps,
            };
          }),
      }));

    setEditingId(session.id);
    setLogTitle(session.title || 'Workout');
    setLogDateTime(format(session.startTime, "yyyy-MM-dd'T'HH:mm"));
    setLogDuration(Math.max(1, Math.round((session.durSeconds || 60 * 60) / 60)));
    setLogCategory(session.category || 'Mixed');
    setLogGym(session.gym || '');
    setLogHeartRate(session.avgHeartRate ? String(session.avgHeartRate) : '');
    setLogDescription(session.description || '');
    setLogPeople(session.people || []);
    setLogExercises(exercises);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editParam, sessions.length]);

  // ── Exercise list from the database-backed library ──
  const uniqueExercises = useMemo<string[]>(
    () => dbExercises.map(e => e.name).sort((a, b) => a.localeCompare(b)),
    [dbExercises],
  );

  const filteredExercises = useMemo<string[]>(() => {
    const q = exerciseSearch.trim().toLowerCase();
    const list = q ? uniqueExercises.filter(e => e.toLowerCase().includes(q)) : uniqueExercises;
    return list.filter(e => !logExercises.some(le => le.exerciseTitle === e));
  }, [uniqueExercises, exerciseSearch, logExercises]);

  const trimmedSearch = exerciseSearch.trim();
  const canCreateNew = useMemo<boolean>(() => {
    if (!trimmedSearch) return false;
    const lower = trimmedSearch.toLowerCase();
    if (uniqueExercises.some(e => e.toLowerCase() === lower)) return false;
    if (logExercises.some(le => le.exerciseTitle.toLowerCase() === lower)) return false;
    return true;
  }, [trimmedSearch, uniqueExercises, logExercises]);

  const renameOptions = useMemo<string[]>(() => {
    if (editingExIdx === null) return [];
    const q = editExSearch.trim().toLowerCase();
    const current = logExercises[editingExIdx]?.exerciseTitle;
    const used = new Set(
      logExercises.filter((_, i) => i !== editingExIdx).map(le => le.exerciseTitle),
    );
    const list = q ? uniqueExercises.filter(e => e.toLowerCase().includes(q)) : uniqueExercises;
    return list.filter(e => e === current || !used.has(e));
  }, [editingExIdx, editExSearch, uniqueExercises, logExercises]);

  // ── "Last time" reference for each logged exercise (most recent prior
  //    session containing it), formatted in the display unit. ──
  const dispMul = unit === 'lbs' ? 2.20462 : 1;
  const lastByExercise = useMemo(() => {
    const before = new Date(logDateTime);
    const map = new Map<string, { date: Date; label: string }>();
    logExercises.forEach(ex => {
      if (map.has(ex.exerciseTitle)) return;
      const last = getLastExerciseSession(workouts, ex.exerciseTitle, before);
      if (!last) return;
      const isBw = BODYWEIGHT_EXERCISES.includes(ex.exerciseTitle);
      const bwAdd = getBodyweightAddition(last.date);
      const label = last.sets
        .map(s => {
          const raw = isBw ? Math.max(0, s.weightKg - bwAdd) : s.weightKg;
          return `${Math.round(raw * dispMul * 100) / 100}${unit} × ${s.reps}`;
        })
        .join(', ');
      map.set(ex.exerciseTitle, { date: last.date, label });
    });
    return map;
  }, [logExercises, workouts, logDateTime, unit, dispMul]);

  // ── Logger handlers ──
  const addExercise = (title: string) => {
    if (!title) return;
    // Prefill sets from the last time this exercise was logged (overwritable).
    const last = getLastExerciseSession(workouts, title, new Date(logDateTime));
    let sets: LogSet[] = [{ setType: 'normal', weight: 0, reps: 0 }];
    if (last && last.sets.length > 0) {
      const isBw = BODYWEIGHT_EXERCISES.includes(title);
      const bwAdd = getBodyweightAddition(last.date);
      sets = last.sets.map(s => {
        const raw = isBw ? Math.max(0, s.weightKg - bwAdd) : s.weightKg;
        return { setType: s.setType as SetType, weight: Math.round(raw * dispMul * 100) / 100, reps: s.reps };
      });
    }
    setLogExercises(prev => [...prev, { exerciseTitle: title, notes: '', sets }]);
    setExerciseSearch('');
    setShowDropdown(false);
  };

  const updateExerciseNotes = (exIdx: number, notes: string) =>
    setLogExercises(prev => prev.map((ex, ei) => (ei === exIdx ? { ...ex, notes } : ex)));

  const removeExercise = (i: number) =>
    setLogExercises(prev => prev.filter((_, idx) => idx !== i));

  const beginRename = (exIdx: number) => {
    setEditingExIdx(exIdx);
    setEditExSearch(logExercises[exIdx]?.exerciseTitle ?? '');
  };

  const applyRename = (exIdx: number, newTitle: string) => {
    const title = newTitle.trim();
    setEditingExIdx(null);
    setEditExSearch('');
    if (!title) return;
    setLogExercises(prev => prev.map((ex, ei) => (ei === exIdx ? { ...ex, exerciseTitle: title } : ex)));
  };

  const beginCreate = (name: string) => {
    setNewExName(name.trim());
    setNewExGroup('Other');
    setShowDropdown(false);
  };

  const confirmCreate = async () => {
    const name = newExName?.trim();
    if (!name) return;
    setCreatingEx(true);
    try {
      await createExercise(name, newExGroup);
      addExercise(name);
      setNewExName(null);
      setExerciseSearch('');
    } catch (err) {
      console.error('Error creating exercise:', err);
    } finally {
      setCreatingEx(false);
    }
  };

  const updateSet = (exIdx: number, sIdx: number, field: keyof LogSet, value: LogSet[keyof LogSet]) =>
    setLogExercises(prev => prev.map((ex, ei) =>
      ei !== exIdx ? ex : { ...ex, sets: ex.sets.map((s, si) => si === sIdx ? { ...s, [field]: value } : s) }
    ));

  const chooseSetType = (exIdx: number, sIdx: number, type: SetType) => {
    updateSet(exIdx, sIdx, 'setType', type);
    setSetMenu(null);
  };

  const addSet = (exIdx: number) =>
    setLogExercises(prev => prev.map((ex, ei) => {
      if (ei !== exIdx) return ex;
      const last = ex.sets[ex.sets.length - 1];
      return { ...ex, sets: [...ex.sets, { setType: 'normal' as const, weight: last?.weight ?? 0, reps: last?.reps ?? 0 }] };
    }));

  const removeSet = (exIdx: number, sIdx: number) =>
    setLogExercises(prev => prev.map((ex, ei) =>
      ei !== exIdx || ex.sets.length <= 1 ? ex : { ...ex, sets: ex.sets.filter((_, si) => si !== sIdx) }
    ));

  // ── Save to Realtime DB ──
  const saveWorkout = async () => {
    if (logExercises.length === 0 || !uid) return;
    setIsSaving(true);
    const startTime = new Date(logDateTime);
    const endTime   = new Date(startTime.getTime() + logDuration * 60000);
    const toKg      = unit === 'lbs' ? 1 / 2.20462 : 1;

    const payload = {
      title: logTitle,
      start_time: format(startTime, 'd MMM yyyy, HH:mm'),
      end_time:   format(endTime,   'd MMM yyyy, HH:mm'),
      category: logCategory,
      description: logDescription.trim(),
      gym: logGym,
      avg_heart_rate: Number(logHeartRate) || 0,
      people: logPeople,
      exercises: logExercises.map(ex => ({
        exercise_title: ex.exerciseTitle,
        exercise_notes: ex.notes.trim(),
        sets: ex.sets.map((s, i) => ({
          set_index: i + 1,
          set_type: s.setType,
          weight_kg: Math.round(s.weight * toKg * 100) / 100,
          reps: s.reps,
          duration_seconds: 0,
        })),
      })),
    };

    try {
      const exerciseCount = logExercises.length;
      const setCount = logExercises.reduce((n, ex) => n + ex.sets.length, 0);
      if (editingId) {
        console.log(`[DB] Updating workout ${editingId} "${logTitle}" (${exerciseCount} exercises, ${setCount} sets)`);
        await update(ref(realtimeDb, `/users/${uid}/workouts/${editingId}`), payload);
        console.log(`[DB] Workout ${editingId} updated successfully`);
      } else {
        console.log(`[DB] Pushing new workout "${logTitle}" (${exerciseCount} exercises, ${setCount} sets)`);
        const newRef = await push(ref(realtimeDb, `/users/${uid}/workouts`), payload);
        console.log(`[DB] Workout saved successfully with key: ${newRef.key}`);
      }
      navigate('/workouts');
    } catch (err) {
      console.error('Error saving workout:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Guests can't write — bounce them back to the history.
  if (!canWrite) {
    return (
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <p style={{ color: 'var(--text-muted)' }}>You don't have permission to add workouts.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', animation: 'fadeIn 0.5s ease-out', paddingBottom: '64px', maxWidth: '900px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => navigate(-1)}
          title="Back"
          style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <ChevronLeft size={20} />
        </button>
        <h2 style={pageTitleStyle}>
          {editingId ? 'Edit Workout' : 'Log New Workout'}
        </h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Details card */}
        <Card>
          <h3 style={{ fontFamily: 'Outfit', fontSize: '15px', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '4px', height: '16px', background: 'var(--accent-gradient)', borderRadius: '4px' }} />
            Details
          </h3>
          <div className="log-metadata-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Title</label>
              <input value={logTitle} onChange={e => setLogTitle(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Category</label>
              <select value={logCategory} onChange={e => setLogCategory(e.target.value)} style={selectStyle}>
                {['Push', 'Pull', 'Legs', 'Mixed'].map(c => (
                  <option key={c} value={c} style={{ background: 'var(--bg-dark)' }}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Date &amp; Time</label>
              <input type="datetime-local" value={logDateTime} onChange={e => setLogDateTime(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Duration (min)</label>
              <input type="number" min={1} value={logDuration} onChange={e => setLogDuration(Math.max(1, Number(e.target.value)))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Gym</label>
              <select value={logGym} onChange={e => setLogGym(e.target.value)} style={selectStyle}>
                <option value="" style={{ background: 'var(--bg-dark)' }}>No gym</option>
                {gyms.map(g => (
                  <option key={g.id} value={g.name} style={{ background: 'var(--bg-dark)' }}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Avg Heart Rate (bpm)</label>
              <input
                type="number" min={0} step={1}
                value={logHeartRate}
                onChange={e => setLogHeartRate(e.target.value)}
                placeholder="optional"
                style={inputStyle}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Worked Out With</label>
              <PeoplePicker
                options={dbPeople.map(p => p.name)}
                value={logPeople}
                onChange={setLogPeople}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Description</label>
              <textarea
                value={logDescription}
                onChange={e => setLogDescription(e.target.value)}
                placeholder="How did the session go?"
                rows={2}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'Inter' }}
              />
            </div>
          </div>
        </Card>

        {/* Exercise search */}
        <div style={{ position: 'relative' }}>
          <label style={labelStyle}>Add Exercise</label>
          <input
            value={exerciseSearch}
            onChange={e => { setExerciseSearch(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            onKeyDown={e => {
              if (e.key !== 'Enter') return;
              if (filteredExercises.length > 0) addExercise(filteredExercises[0]);
              else if (canCreateNew) beginCreate(trimmedSearch);
            }}
            placeholder="Search exercises..."
            style={inputStyle}
          />
          {showDropdown && (filteredExercises.length > 0 || canCreateNew) && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
              background: 'rgba(15,18,25,0.97)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px', maxHeight: '200px', overflowY: 'auto',
              zIndex: 50, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            }}>
              {filteredExercises.map(ex => (
                <div
                  key={ex}
                  onMouseDown={e => { e.preventDefault(); addExercise(ex); }}
                  style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '14px', fontFamily: 'Inter', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {ex}
                </div>
              ))}
              {canCreateNew && (
                <div
                  onMouseDown={e => { e.preventDefault(); beginCreate(trimmedSearch); }}
                  style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '14px', fontFamily: 'Inter', color: 'var(--accent-pink-main)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Plus size={14} /> Create "{trimmedSearch}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* New-exercise panel */}
        {newExName && (
          <div style={{
            background: 'rgba(255,46,147,0.06)',
            border: '1px solid rgba(255,46,147,0.25)',
            borderRadius: '14px', padding: '16px',
            display: 'flex', flexDirection: 'column', gap: '12px',
          }}>
            <span style={{ fontFamily: 'Inter', fontSize: '13px', color: 'var(--text-secondary)' }}>
              New exercise: <strong style={{ color: 'var(--text-primary)' }}>{newExName}</strong>
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <select
                value={newExGroup}
                onChange={e => setNewExGroup(e.target.value)}
                style={{ ...selectStyle, flex: '1 1 140px', width: 'auto' }}
              >
                {MUSCLE_GROUPS.map(g => (
                  <option key={g} value={g} style={{ background: 'var(--bg-dark)' }}>{g}</option>
                ))}
              </select>
              <button
                onClick={confirmCreate}
                disabled={creatingEx}
                style={{
                  padding: '10px 20px', background: 'var(--accent-gradient)',
                  border: 'none', borderRadius: '10px', color: '#fff',
                  fontFamily: 'Outfit', fontWeight: 600, fontSize: '14px',
                  cursor: creatingEx ? 'not-allowed' : 'pointer', opacity: creatingEx ? 0.6 : 1,
                }}
              >
                {creatingEx ? 'Adding…' : 'Add'}
              </button>
              <button
                onClick={() => setNewExName(null)}
                disabled={creatingEx}
                style={{
                  padding: '10px 20px', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--glass-border)', borderRadius: '10px',
                  color: 'var(--text-secondary)', fontFamily: 'Outfit', fontWeight: 600,
                  fontSize: '14px', cursor: creatingEx ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Exercise cards */}
        {logExercises.map((ex, exIdx) => (
          <div key={exIdx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>

            {/* Exercise header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                <div style={{ width: '4px', height: '18px', background: 'var(--accent-gradient)', borderRadius: '4px', flexShrink: 0 }} />
                {editingExIdx === exIdx ? (
                  <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                    <input
                      autoFocus
                      value={editExSearch}
                      onChange={e => setEditExSearch(e.target.value)}
                      onBlur={() => setTimeout(() => setEditingExIdx(null), 150)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && renameOptions.length > 0) applyRename(exIdx, renameOptions[0]);
                        if (e.key === 'Escape') setEditingExIdx(null);
                      }}
                      placeholder="Search exercises..."
                      style={{ ...inputStyle, padding: '8px 12px', fontFamily: 'Outfit', fontSize: '15px' }}
                    />
                    {renameOptions.length > 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                        background: 'rgba(15,18,25,0.97)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px', maxHeight: '200px', overflowY: 'auto',
                        zIndex: 50, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                      }}>
                        {renameOptions.map(opt => (
                          <div
                            key={opt}
                            onMouseDown={e => { e.preventDefault(); applyRename(exIdx, opt); }}
                            style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '14px', fontFamily: 'Inter', color: opt === ex.exerciseTitle ? 'var(--accent-pink-main)' : 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <h4 style={{ fontFamily: 'Outfit', fontSize: '16px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.exerciseTitle}</h4>
                    <button
                      onClick={() => beginRename(exIdx)}
                      title="Change exercise"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '7px', width: '26px', height: '26px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0 }}
                    >
                      <Pencil size={13} />
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => removeExercise(exIdx)}
                style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '8px', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <X size={14} color="#EF4444" />
              </button>
            </div>

            {/* Last-time reference */}
            {lastByExercise.has(ex.exerciseTitle) && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', fontFamily: 'Inter', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-pink-main)', fontWeight: 600 }}>
                  Last time · {format(lastByExercise.get(ex.exerciseTitle)!.date, 'd MMM')}
                </span>
                <span>{lastByExercise.get(ex.exerciseTitle)!.label}</span>
              </div>
            )}

            {/* Exercise notes */}
            <input
              value={ex.notes}
              onChange={e => updateExerciseNotes(exIdx, e.target.value)}
              placeholder="Add a note for this exercise…"
              style={{ ...inputStyle, padding: '8px 12px', fontSize: '13px', marginBottom: '16px' }}
            />

            {/* Sets table */}
            <div className="sets-scroll-wrapper">
              <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1fr 32px', gap: '8px', paddingBottom: '8px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', minWidth: '220px' }}>
                <span style={colHeaderStyle}>SET</span>
                <span style={colHeaderStyle}>{unit.toUpperCase()}</span>
                <span style={colHeaderStyle}>REPS</span>
                <span />
              </div>

              {ex.sets.map((s, sIdx) => (
                <div key={sIdx} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1fr 32px', gap: '8px', alignItems: 'center', marginBottom: '6px', minWidth: '220px' }}>
                  <button
                    onClick={e => {
                      const r = e.currentTarget.getBoundingClientRect();
                      setSetMenu(cur => {
                        if (cur && cur.exIdx === exIdx && cur.sIdx === sIdx) return null;
                        const MENU_H = 290, MENU_W = 180, GAP = 6;
                        const openUp = r.bottom + GAP + MENU_H > window.innerHeight && r.top - GAP - MENU_H > 0;
                        const x = Math.max(8, Math.min(r.left, window.innerWidth - MENU_W - 8));
                        const y = openUp ? r.top - GAP : r.bottom + GAP;
                        return { exIdx, sIdx, x, y, placement: openUp ? 'up' : 'down' };
                      });
                    }}
                    title="Click to choose set type"
                    style={{
                      width: '40px', height: '40px', borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: s.setType !== 'normal' ? `${getSetColor(s.setType)}18` : 'rgba(255,255,255,0.04)',
                      color: getSetColor(s.setType),
                      fontWeight: 700, fontSize: '14px', fontFamily: 'Inter',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {getSetLabel(ex.sets, sIdx)}
                  </button>

                  <input
                    type="number" min={0} step="any"
                    value={s.weight || ''}
                    onChange={e => updateSet(exIdx, sIdx, 'weight', Number(e.target.value))}
                    placeholder="0"
                    style={{ ...inputStyle, padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}
                  />

                  <input
                    type="number" min={0} step={1}
                    value={s.reps || ''}
                    onChange={e => updateSet(exIdx, sIdx, 'reps', Number(e.target.value))}
                    placeholder="0"
                    style={{ ...inputStyle, padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}
                  />

                  {ex.sets.length > 1 ? (
                    <button
                      onClick={() => removeSet(exIdx, sIdx)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4, transition: 'opacity 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}
                    >
                      <X size={14} color="var(--text-muted)" />
                    </button>
                  ) : <span />}
                </div>
              ))}
            </div>

            {/* Add Set button */}
            <button
              onClick={() => addSet(exIdx)}
              style={{ marginTop: '10px', width: '100%', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px', color: 'var(--text-secondary)', fontFamily: 'Inter', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            >
              <Plus size={14} /> Add Set
            </button>

          </div>
        ))}

        {/* Empty state */}
        {logExercises.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: '14px' }}>
            Search and add exercises above to get started.
          </div>
        )}

        {/* Save / Cancel buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate(-1)}
            disabled={isSaving}
            style={{
              flex: '0 0 auto',
              padding: '14px 20px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--glass-border)',
              borderRadius: '14px',
              color: 'var(--text-secondary)',
              fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.6 : 1, transition: 'all 0.2s ease',
            }}
          >
            Cancel
          </button>
          <button
            onClick={saveWorkout}
            disabled={logExercises.length === 0 || isSaving}
            style={{
              flex: 1, padding: '14px',
              background: logExercises.length === 0 ? 'rgba(255,255,255,0.05)' : 'var(--accent-gradient)',
              border: 'none', borderRadius: '14px',
              color: logExercises.length === 0 ? 'var(--text-muted)' : '#fff',
              fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600,
              cursor: logExercises.length === 0 ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.6 : 1, transition: 'all 0.2s ease', letterSpacing: '0.02em',
            }}
          >
            {isSaving ? 'Saving...' : editingId ? 'Save Changes' : 'Save Workout'}
          </button>
        </div>

      </div>

      {/* Set-type picker popover */}
      {setMenu && createPortal(
        <>
          <div
            onMouseDown={() => setSetMenu(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 1500 }}
          />
          <div
            style={{
              position: 'fixed', top: setMenu.y, left: setMenu.x, zIndex: 1501,
              transform: setMenu.placement === 'up' ? 'translateY(-100%)' : 'none',
              background: 'rgba(10, 13, 20, 0.98)',
              backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
              padding: '6px', minWidth: '150px',
              maxHeight: 'calc(100vh - 16px)', overflowY: 'auto',
              boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
            }}
          >
            {SET_TYPES.map(t => {
              const active = logExercises[setMenu.exIdx]?.sets[setMenu.sIdx]?.setType === t.key;
              return (
                <button
                  key={t.key}
                  onMouseDown={e => { e.preventDefault(); chooseSetType(setMenu.exIdx, setMenu.sIdx, t.key); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                    background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                    border: 'none', borderRadius: '8px', padding: '9px 10px',
                    cursor: 'pointer', textAlign: 'left',
                    fontFamily: 'Inter', fontSize: '13px', fontWeight: 600,
                    color: 'var(--text-primary)', transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span
                    style={{
                      width: '26px', height: '26px', borderRadius: '7px', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: t.key === 'normal' ? 'rgba(255,255,255,0.06)' : `${t.color}1A`,
                      color: t.color,
                      fontWeight: 700, fontSize: '12px',
                    }}
                  >
                    {t.label}
                  </span>
                  <span>{t.name}</span>
                </button>
              );
            })}
          </div>
        </>,
        document.body,
      )}

    </div>
  );
};
