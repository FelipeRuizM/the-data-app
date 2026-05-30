import React, { useMemo, useState, useEffect } from 'react';
import { Card } from '../components/common/Card';
import { useSettings } from '../context/SettingsContext';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Plus, X, Pencil } from 'lucide-react';
import { ref, update, push } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useExercises } from '../context/ExercisesContext';
import { MUSCLE_GROUPS } from '../utils/workoutUtils';

// ── Logger types ──────────────────────────────────────────────
interface LogSet {
  setType: 'normal' | 'warmup' | 'dropset' | 'failure' | 'feeder' | 'working';
  weight: number;
  reps: number;
}
interface LogExercise {
  exerciseTitle: string;
  sets: LogSet[];
}

const SET_TYPES: { key: LogSet['setType']; label: string; name: string; color: string }[] = [
  { key: 'normal',  label: '#',  name: 'Normal',   color: 'var(--text-primary)' },
  { key: 'working', label: 'Wk', name: 'Working',  color: '#10B981' },
  { key: 'warmup',  label: 'W',  name: 'Warmup',   color: '#F59E0B' },
  { key: 'feeder',  label: 'Fd', name: 'Feeder',   color: '#A855F7' },
  { key: 'dropset', label: 'D',  name: 'Drop Set', color: '#3B82F6' },
  { key: 'failure', label: 'F',  name: 'Failure',  color: '#EF4444' },
];

// ── Shared inline styles (defined at module scope so hoisting is not needed) ──
const inputStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  color: '#fff',
  borderRadius: '10px',
  padding: '10px 14px',
  fontFamily: 'Inter',
  fontSize: '14px',
  outline: 'none',
  width: '100%',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'auto' as const,
  cursor: 'pointer',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '6px',
  fontFamily: 'Inter',
};

const colHeaderStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  fontFamily: 'Inter',
  fontWeight: 600,
  textAlign: 'center',
};

// ── Helper: set label / color ─────────────────────────────────
const getSetLabel = (sets: LogSet[], idx: number): string => {
  const s = sets[idx];
  if (s.setType !== 'normal') {
    return SET_TYPES.find(t => t.key === s.setType)?.label ?? '?';
  }
  let n = 0;
  for (let i = 0; i <= idx; i++) if (sets[i].setType === 'normal') n++;
  return n.toString();
};

const getSetColor = (type: LogSet['setType']) =>
  SET_TYPES.find(t => t.key === type)?.color ?? 'var(--text-primary)';

// Mirror of useWorkouts.ts — bodyweight is added to weightKg on read for these.
const BODYWEIGHT_EXERCISES = ['Pull Up', 'Chin Up', 'Dip', 'Push Up', 'Muscle Up'];
const getBodyweightAddition = (startTime: Date) =>
  startTime >= new Date('2026-02-01') ? 80 : 73;

// ── WorkoutCard (historical sessions) ────────────────────────
const WorkoutCard = ({ session, unit, onEdit, isEditing }: any) => {
  const { user } = useAuth();
  const uid = user?.uid;
  const [isOpen, setIsOpen] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const multiplier = unit === 'lbs' ? 2.20462 : 1;

  const handleCategoryChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value;
    if (!session.id || !uid) return;
    try {
      console.log(`[DB] Updating category for workout ${session.id} → "${newCategory}"`);
      await update(ref(realtimeDb, `/users/${uid}/workouts/${session.id}`), { category: newCategory });
      console.log(`[DB] Category updated successfully for workout ${session.id}`);
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 2000);
    } catch (err) {
      console.error('[DB] Error updating category:', err);
    }
  };

  return (
    <Card style={{ position: 'relative', cursor: 'pointer', transition: 'all 0.3s ease' }}>
      {/* Saved toast */}
      <div style={{
        position: 'absolute', top: '16px', right: '16px',
        background: 'rgba(46, 204, 113, 0.1)', color: '#2ecc71',
        padding: '4px 8px', borderRadius: '6px', fontSize: '12px',
        fontWeight: 'bold', fontFamily: 'Inter',
        opacity: showSavedToast ? 1 : 0, pointerEvents: 'none',
        transition: 'opacity 0.3s ease', zIndex: 10,
      }}>
        ✓ Saved
      </div>

      <div onClick={() => setIsOpen(!isOpen)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Header row */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          borderBottom: isOpen ? '1px solid var(--glass-border)' : 'none',
          paddingBottom: isOpen ? '16px' : '0',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h3 style={{ fontSize: '20px', fontFamily: 'Outfit', margin: 0 }}>{session.title || 'Workout'}</h3>
              {isOpen
                ? <ChevronUp size={18} color="var(--accent-pink-main)" />
                : <ChevronDown size={18} color="var(--text-muted)" />}
            </div>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {format(session.startTime, 'EEEE, MMM do yyyy - h:mm a')}
            </span>
          </div>

          <div onClick={e => e.stopPropagation()} style={{ marginRight: '80px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={session.category || 'Mixed'}
              onChange={handleCategoryChange}
              style={{
                background: 'rgba(255,255,255,0.05)', color: 'var(--accent-pink-main)',
                border: '1px solid var(--glass-border)', padding: '6px 12px',
                borderRadius: '8px', fontFamily: 'Inter', fontWeight: 'bold',
                outline: 'none', cursor: 'pointer', appearance: 'auto',
              }}
            >
              {['Push', 'Pull', 'Legs', 'Mixed'].map(c => (
                <option key={c} value={c} style={{ background: 'var(--bg-dark)' }}>{c}</option>
              ))}
            </select>
            <button
              onClick={() => onEdit?.(session)}
              title="Edit workout"
              style={{
                width: '34px', height: '34px',
                background: isEditing ? 'rgba(255,46,147,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isEditing ? 'var(--accent-pink-main)' : 'var(--glass-border)'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isEditing ? 'var(--accent-pink-main)' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              <Pencil size={14} />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', paddingTop: isOpen ? '0' : '4px' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duration</span>
            <div style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'Inter' }}>{Math.round(session.durSeconds / 60)} min</div>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Volume</span>
            <div style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'Inter' }}>
              {Math.round(session.volume * multiplier).toLocaleString()} {unit}
            </div>
          </div>
        </div>

        {/* Expanded exercise list */}
        {isOpen && (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}
            onClick={e => e.stopPropagation()}
          >
            {Array.from(session.exercises.entries()).map(([exTitle, sets]: any) => (
              <div key={exTitle}>
                <h4 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '4px', height: '14px', background: 'var(--accent-gradient)', borderRadius: '4px' }} />
                  {exTitle}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '12px' }}>
                  {sets.map((set: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '6px 0', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                      <span style={{ color: 'var(--text-secondary)', width: '60px' }}>Set {idx + 1}</span>
                      <span style={{ fontWeight: '500', fontFamily: 'Inter', width: '120px' }}>
                        {Math.round(set.weightKg * multiplier)} {unit}
                        <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>×</span>
                        {set.reps} reps
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

// ── Workouts page ─────────────────────────────────────────────
export const Workouts: React.FC<any> = ({ workouts }) => {
  const { unit } = useSettings();
  const { user } = useAuth();
  const uid = user?.uid;
  const { exercises: dbExercises, createExercise } = useExercises();

  // ── Historical sessions ──
  const sessions = useMemo(() => {
    const map = new Map<string, {
      id: string; startTime: Date; title: string; category: string;
      volume: number; durSeconds: number; exercises: Map<string, any[]>;
    }>();

    workouts.forEach((w: any) => {
      const key = w.startTime.getTime().toString();
      const s = map.get(key) ?? {
        id: w.id, startTime: w.startTime, title: w.title,
        category: w.category || 'Mixed', volume: 0, durSeconds: 0,
        exercises: new Map<string, any[]>(),
      };

      s.volume += w.weightKg * w.reps;

      let ds = w.durationSeconds;
      if (!ds && w.endTime && w.startTime)
        ds = (w.endTime.getTime() - w.startTime.getTime()) / 1000;
      if (ds > s.durSeconds) s.durSeconds = ds;

      const exArr = s.exercises.get(w.exerciseTitle) ?? [];
      exArr.push(w);
      s.exercises.set(w.exerciseTitle, exArr);
      map.set(key, s);
    });

    return Array.from(map.values()).sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }, [workouts]);

  // ── Logger state ──
  const freshDateTime = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const [isExpanded, setIsExpanded]   = useState(false);
  const [logTitle, setLogTitle]       = useState('Workout');
  const [logDateTime, setLogDateTime] = useState(freshDateTime);
  const [logDuration, setLogDuration] = useState(60);
  const [logCategory, setLogCategory] = useState('Mixed');
  const [logExercises, setLogExercises] = useState<LogExercise[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [showDropdown, setShowDropdown]     = useState(false);
  const [showToast, setShowToast]           = useState(false);
  const [isSaving, setIsSaving]             = useState(false);
  const [editingId, setEditingId]           = useState<string | null>(null);

  // ── New-exercise creation (writes to the exercise library) ──
  const [newExName, setNewExName]   = useState<string | null>(null);
  const [newExGroup, setNewExGroup] = useState('Other');
  const [creatingEx, setCreatingEx] = useState(false);

  // ── Inline exercise rename (swap which library exercise a slot uses) ──
  const [editingExIdx, setEditingExIdx] = useState<number | null>(null);
  const [editExSearch, setEditExSearch] = useState('');

  // ── Set-type picker popover (anchored via fixed positioning so it escapes
  //    the sets row's horizontal-scroll container) ──
  const [setMenu, setSetMenu] = useState<{ exIdx: number; sIdx: number; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!setMenu) return;
    const close = () => setSetMenu(null);
    // Outside-click handled per-item via onMouseDown; here we close on any
    // scroll or resize so the fixed popover never drifts away from its anchor.
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [setMenu]);

  const resetForm = () => {
    setEditingId(null);
    setLogTitle('Workout');
    setLogDuration(60);
    setLogCategory('Mixed');
    setLogExercises([]);
    setExerciseSearch('');
    setNewExName(null);
    setEditingExIdx(null);
    setEditExSearch('');
    setLogDateTime(freshDateTime());
  };

  const startEdit = (session: any) => {
    if (editingId === session.id) {
      // Toggle off
      resetForm();
      setIsExpanded(false);
      return;
    }
    const dispMul = unit === 'lbs' ? 2.20462 : 1;
    const bwAdd = getBodyweightAddition(session.startTime);

    const exercises: LogExercise[] = Array.from(session.exercises.entries() as Iterable<[string, any[]]>)
      .map(([exTitle, sets]) => ({
        exerciseTitle: exTitle,
        sets: sets
          .slice()
          .sort((a, b) => (a.setIndex ?? 0) - (b.setIndex ?? 0))
          .map((s) => {
            const isBodyweight = BODYWEIGHT_EXERCISES.includes(exTitle);
            const rawKg = isBodyweight ? Math.max(0, s.weightKg - bwAdd) : s.weightKg;
            return {
              setType: s.setType as LogSet['setType'],
              weight: Math.round(rawKg * dispMul * 100) / 100,
              reps: s.reps,
            };
          }),
      }));

    const localDT = format(session.startTime, "yyyy-MM-dd'T'HH:mm");
    const durMin = Math.max(1, Math.round((session.durSeconds || 60 * 60) / 60));

    setEditingId(session.id);
    setLogTitle(session.title || 'Workout');
    setLogDateTime(localDT);
    setLogDuration(durMin);
    setLogCategory(session.category || 'Mixed');
    setLogExercises(exercises);
    setIsExpanded(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  // True when the typed name isn't an existing exercise and hasn't been added yet —
  // lets the user log an exercise they've never done before.
  const trimmedSearch = exerciseSearch.trim();
  const canCreateNew = useMemo<boolean>(() => {
    if (!trimmedSearch) return false;
    const lower = trimmedSearch.toLowerCase();
    if (uniqueExercises.some(e => e.toLowerCase() === lower)) return false;
    if (logExercises.some(le => le.exerciseTitle.toLowerCase() === lower)) return false;
    return true;
  }, [trimmedSearch, uniqueExercises, logExercises]);

  // Library options for the inline rename picker — excludes exercises already
  // used in this workout (the slot's current exercise stays selectable).
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

  // ── Logger handlers ──
  const addExercise = (title: string) => {
    if (!title) return;
    setLogExercises(prev => [...prev, { exerciseTitle: title, sets: [{ setType: 'normal', weight: 0, reps: 0 }] }]);
    setExerciseSearch('');
    setShowDropdown(false);
  };

  const removeExercise = (i: number) =>
    setLogExercises(prev => prev.filter((_, idx) => idx !== i));

  // Open the inline picker for an exercise card.
  const beginRename = (exIdx: number) => {
    setEditingExIdx(exIdx);
    setEditExSearch(logExercises[exIdx]?.exerciseTitle ?? '');
  };

  // Swap the slot to a different library exercise.
  const applyRename = (exIdx: number, newTitle: string) => {
    const title = newTitle.trim();
    setEditingExIdx(null);
    setEditExSearch('');
    if (!title) return;
    setLogExercises(prev => prev.map((ex, ei) => (ei === exIdx ? { ...ex, exerciseTitle: title } : ex)));
  };

  // Open the "new exercise" panel — the user still needs to pick a muscle group.
  const beginCreate = (name: string) => {
    setNewExName(name.trim());
    setNewExGroup('Other');
    setShowDropdown(false);
  };

  // Persist the new exercise to the library, then drop it into this workout.
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

  const updateSet = (exIdx: number, sIdx: number, field: keyof LogSet, value: any) =>
    setLogExercises(prev => prev.map((ex, ei) =>
      ei !== exIdx ? ex : { ...ex, sets: ex.sets.map((s, si) => si === sIdx ? { ...s, [field]: value } : s) }
    ));

  const chooseSetType = (exIdx: number, sIdx: number, type: LogSet['setType']) => {
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
      description: '',
      exercises: logExercises.map(ex => ({
        exercise_title: ex.exerciseTitle,
        exercise_notes: '',
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
      resetForm();
      setIsExpanded(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error('Error saving workout:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px', animation: 'fadeIn 0.5s ease-out', paddingBottom: '64px', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

      {/* ── Success toast ── */}
      {showToast && (
        <div style={{
          position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(46, 204, 113, 0.15)', border: '1px solid rgba(46, 204, 113, 0.3)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          color: '#2ecc71', padding: '12px 28px', borderRadius: '12px',
          fontFamily: 'Inter', fontWeight: 600, fontSize: '14px',
          zIndex: 1000, animation: 'fadeIn 0.3s ease-out',
        }}>
          Workout saved successfully
        </div>
      )}

      {/* ── Workout Logger ── */}
      <div style={{
        background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)',
        border: isExpanded ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,46,147,0.25)',
        boxShadow: isExpanded ? 'var(--glass-shadow)' : 'var(--glass-shadow), 0 0 20px rgba(255,46,147,0.08)',
        borderRadius: '20px', marginBottom: '32px', transition: 'all 0.3s ease',
      }}>

        {/* Header / toggle bar */}
        <div
          onClick={() => setIsExpanded(v => !v)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', cursor: 'pointer', userSelect: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: isExpanded ? 'rgba(255,46,147,0.15)' : 'var(--accent-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.3s ease',
            }}>
              <Plus size={20} color={isExpanded ? 'var(--accent-pink-main)' : '#fff'} style={{ transform: isExpanded ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s ease' }} />
            </div>
            <span style={{ fontFamily: 'Outfit', fontSize: '18px', fontWeight: 600 }}>
              {editingId ? 'Editing Workout' : isExpanded ? 'Log New Workout' : 'Start Workout'}
            </span>
          </div>
          {isExpanded
            ? <ChevronUp size={20} color="var(--text-muted)" />
            : <ChevronDown size={20} color="var(--text-muted)" />}
        </div>

        {/* Expanded form body */}
        {isExpanded && (
          <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Metadata grid */}
            <div className="log-metadata-grid" style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
              borderTop: '1px solid var(--glass-border)', paddingTop: '20px',
            }}>
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
            </div>

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

            {/* New-exercise panel — pick a muscle group before it joins the library */}
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

                {/* Sets table — scroll wrapper prevents mobile overflow */}
                <div className="sets-scroll-wrapper">
                  {/* Column headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1fr 32px', gap: '8px', paddingBottom: '8px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', minWidth: '220px' }}>
                    <span style={colHeaderStyle}>SET</span>
                    <span style={colHeaderStyle}>{unit.toUpperCase()}</span>
                    <span style={colHeaderStyle}>REPS</span>
                    <span />
                  </div>

                  {/* Set rows */}
                  {ex.sets.map((s, sIdx) => (
                    <div key={sIdx} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1fr 32px', gap: '8px', alignItems: 'center', marginBottom: '6px', minWidth: '220px' }}>
                      <button
                        onClick={e => {
                          const r = e.currentTarget.getBoundingClientRect();
                          setSetMenu(cur =>
                            cur && cur.exIdx === exIdx && cur.sIdx === sIdx
                              ? null
                              : { exIdx, sIdx, x: r.left, y: r.bottom + 6 },
                          );
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
                </div>{/* end sets-scroll-wrapper */}

                {/* Add Set button (outside scroll wrapper so it stretches full width) */}
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
              {editingId && (
                <button
                  onClick={() => { resetForm(); setIsExpanded(false); }}
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
              )}
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
        )}{/* end expanded form */}
      </div>{/* end logger panel */}

      {/* ── Workout History ── */}
      <h2 style={{ marginBottom: '24px', letterSpacing: '-0.02em', fontFamily: 'Outfit' }}>Workout History</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
        {sessions.map(session => (
          <WorkoutCard
            key={session.startTime.getTime().toString()}
            session={session}
            unit={unit}
            onEdit={startEdit}
            isEditing={editingId === session.id}
          />
        ))}
        {sessions.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
            No workouts logged yet.
          </div>
        )}
      </div>

      {/* ── Set-type picker popover (fixed-positioned, anchored to the chip) ── */}
      {setMenu && (
        <>
          {/* Invisible backdrop closes the menu on any outside click */}
          <div
            onMouseDown={() => setSetMenu(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 1500 }}
          />
          <div
            style={{
              position: 'fixed', top: setMenu.y, left: setMenu.x, zIndex: 1501,
              background: 'rgba(10, 13, 20, 0.98)',
              backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
              padding: '6px', minWidth: '150px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
              animation: 'fadeIn 0.12s ease-out',
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
        </>
      )}

    </div>
  );
};
