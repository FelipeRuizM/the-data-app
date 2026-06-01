import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { useSettings } from '../context/SettingsContext';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Pencil, Trophy } from 'lucide-react';
import { ref, update } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { groupWorkoutSessions, type WorkoutSession } from '../utils/sessions';
import {
  SET_TYPES,
  PR_TYPES,
  getSetLabel,
  getSetColor,
  getSetTypeName,
  getCategoryStyle,
  type SetType,
} from '../utils/workoutDisplay';
import { computeSetPRs, setPRKey, type SetPR } from '../utils/prEngine';
import { labelStyle } from '../styles/formStyles';
import type { TaggedWorkout } from '../hooks/useWorkouts';

const fmtDuration = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const statValueStyle: React.CSSProperties = {
  fontFamily: 'Inter',
  fontSize: '32px',
  fontWeight: 'bold',
  color: 'var(--text-primary)',
};

// ── PR badge shown next to a set that set a new record ──────────
const PRBadge: React.FC<{ pr: SetPR }> = ({ pr }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0, flexWrap: 'wrap' }}>
    {PR_TYPES.filter(t => pr[t.key]).map(t => {
      const Icon = t.icon;
      return (
        <span
          key={t.key}
          title={t.description}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            background: `${t.color}1F`, color: t.color,
            border: `1px solid ${t.color}59`, borderRadius: '999px',
            padding: '2px 8px', fontSize: '10px', fontWeight: 700,
            fontFamily: 'Inter', textTransform: 'uppercase', letterSpacing: '0.04em',
          }}
        >
          <Icon size={11} /> {t.short}
        </span>
      );
    })}
  </span>
);

// ── WorkoutCard (historical session) ──────────────────────────
const WorkoutCard: React.FC<{
  session: WorkoutSession;
  unit: string;
  setPRs: Map<string, SetPR>;
  onEdit: (session: WorkoutSession) => void;
}> = ({ session, unit, setPRs, onEdit }) => {
  const { user, canWrite } = useAuth();
  const uid = user?.uid;
  const [isOpen, setIsOpen] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const multiplier = unit === 'lbs' ? 2.20462 : 1;

  const { color: catColor, icon: CatIcon } = getCategoryStyle(session.category);

  const handleCategoryChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value;
    if (!session.id || !uid) return;
    try {
      await update(ref(realtimeDb, `/users/${uid}/workouts/${session.id}`), { category: newCategory });
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 2000);
    } catch (err) {
      console.error('[DB] Error updating category:', err);
    }
  };

  // Count records broken in this session (each type counts) for a header badge.
  const prCount = useMemo(() => {
    let n = 0;
    session.exercises.forEach((sets, exTitle) => {
      sets.forEach(s => {
        const pr = setPRs.get(setPRKey(s.id, exTitle, s.setIndex));
        if (pr) n += (pr.weight ? 1 : 0) + (pr.volume ? 1 : 0) + (pr.oneRM ? 1 : 0);
      });
    });
    return n;
  }, [session, setPRs]);

  return (
    <Card style={{ position: 'relative', cursor: 'pointer', transition: 'all 0.3s ease', borderLeft: `4px solid ${catColor}` }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            {/* Category icon badge */}
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
              background: `${catColor}1A`, border: `1px solid ${catColor}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CatIcon size={22} color={catColor} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '20px', fontFamily: 'Outfit', margin: 0 }}>{session.title || 'Workout'}</h3>
                <span style={{
                  fontSize: '11px', fontFamily: 'Inter', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  color: catColor, background: `${catColor}1A`,
                  border: `1px solid ${catColor}40`, borderRadius: '999px', padding: '2px 10px',
                }}>
                  {session.category || 'Mixed'}
                </span>
                {prCount > 0 && (
                  <span
                    title={`${prCount} personal record${prCount > 1 ? 's' : ''} this session`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      fontSize: '11px', fontFamily: 'Inter', fontWeight: 700,
                      color: '#FFC400', background: 'rgba(255,196,0,0.12)',
                      border: '1px solid rgba(255,196,0,0.35)', borderRadius: '999px', padding: '2px 10px',
                    }}
                  >
                    <Trophy size={12} /> {prCount} PR{prCount > 1 ? 's' : ''}
                  </span>
                )}
                {isOpen
                  ? <ChevronUp size={18} color="var(--accent-pink-main)" />
                  : <ChevronDown size={18} color="var(--text-muted)" />}
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {format(session.startTime, 'EEEE, MMM do yyyy - h:mm a')}
              </span>
            </div>
          </div>

          {canWrite && (
            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '12px' }}>
              <select
                value={session.category || 'Mixed'}
                onChange={handleCategoryChange}
                title="Change category"
                style={{
                  background: 'rgba(255,255,255,0.05)', color: catColor,
                  border: `1px solid ${catColor}55`, padding: '6px 12px',
                  borderRadius: '8px', fontFamily: 'Inter', fontWeight: 'bold',
                  outline: 'none', cursor: 'pointer', appearance: 'auto',
                }}
              >
                {['Push', 'Pull', 'Legs', 'Mixed'].map(c => (
                  <option key={c} value={c} style={{ background: 'var(--bg-dark)' }}>{c}</option>
                ))}
              </select>
              <button
                onClick={() => onEdit(session)}
                title="Edit workout"
                style={{
                  width: '34px', height: '34px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-secondary)', transition: 'all 0.15s',
                }}
              >
                <Pencil size={14} />
              </button>
            </div>
          )}
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
            {Array.from(session.exercises.entries()).map(([exTitle, rawSets]) => {
              const sets = rawSets.slice().sort((a, b) => (a.setIndex ?? 0) - (b.setIndex ?? 0));
              return (
                <div key={exTitle}>
                  <h4 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '4px', height: '14px', background: catColor, borderRadius: '4px' }} />
                    {exTitle}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '12px' }}>
                    {sets.map((set, idx) => {
                      const pr = setPRs.get(setPRKey(set.id, exTitle, set.setIndex));
                      const setType = set.setType as SetType;
                      const color = getSetColor(setType);
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', padding: '7px 0', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                          {/* Set-type chip */}
                          <span style={{
                            width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: setType === 'normal' ? 'rgba(255,255,255,0.05)' : `${color}1A`,
                            color, fontWeight: 700, fontSize: '12px', fontFamily: 'Inter',
                          }}>
                            {getSetLabel(sets, idx)}
                          </span>
                          {setType !== 'normal' && (
                            <span style={{ fontSize: '12px', color, fontFamily: 'Inter', fontWeight: 600, minWidth: '54px' }}>
                              {getSetTypeName(setType)}
                            </span>
                          )}
                          <span style={{ fontWeight: 500, fontFamily: 'Inter' }}>
                            {Math.round(set.weightKg * multiplier)} {unit}
                            <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>×</span>
                            {set.reps} reps
                          </span>
                          {pr && <PRBadge pr={pr} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Set-type legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', paddingTop: '4px' }}>
              {SET_TYPES.filter(t => t.key !== 'normal').map(t => (
                <span key={t.key} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'Inter' }}>
                  <span style={{ width: '16px', height: '16px', borderRadius: '5px', background: `${t.color}1A`, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700 }}>{t.label}</span>
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

// ── Workouts page (history only) ──────────────────────────────
export const Workouts: React.FC<{ workouts: TaggedWorkout[] }> = ({ workouts }) => {
  const { unit } = useSettings();
  const { canWrite } = useAuth();
  const navigate = useNavigate();

  const sessions = useMemo(() => groupWorkoutSessions(workouts), [workouts]);
  const setPRs = useMemo(() => computeSetPRs(workouts), [workouts]);

  const stats = useMemo(() => {
    const totalSeconds = sessions.reduce((s, x) => s + x.durSeconds, 0);
    const totalReps = workouts.reduce((s, w) => s + w.reps, 0);
    return {
      totalLifts: sessions.length,
      totalMinutes: Math.round(totalSeconds / 60),
      totalReps,
    };
  }, [sessions, workouts]);

  return (
    <div style={{ padding: '24px', animation: 'fadeIn 0.5s ease-out', paddingBottom: '64px', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <Card>
          <div style={labelStyle}>Total Lifts</div>
          <div style={statValueStyle}>{stats.totalLifts.toLocaleString()}</div>
        </Card>
        <Card>
          <div style={labelStyle}>Total Time Working Out</div>
          <div style={statValueStyle}>{fmtDuration(stats.totalMinutes)}</div>
        </Card>
        <Card>
          <div style={labelStyle}>Total Reps</div>
          <div style={statValueStyle}>{stats.totalReps.toLocaleString()}</div>
        </Card>
      </div>

      <h2 style={{ marginBottom: '24px', letterSpacing: '-0.02em', fontFamily: 'Outfit' }}>Workout History</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
        {sessions.map(session => (
          <WorkoutCard
            key={session.startTime.getTime().toString()}
            session={session}
            unit={unit}
            setPRs={setPRs}
            onEdit={(s) => navigate(`/add/workout?edit=${s.id}`)}
          />
        ))}
        {sessions.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
            No workouts logged yet.{canWrite ? ' Add one from the home screen.' : ''}
          </div>
        )}
      </div>
    </div>
  );
};
