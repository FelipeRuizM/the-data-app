import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Trophy, Flame, LineChart, Search, X, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { calculatePRs, REP_BASED_EXERCISES, type PRData } from '../utils/prEngine';
import { MUSCLE_GROUPS } from '../utils/workoutUtils';
import type { TaggedWorkout } from '../hooks/useWorkouts';
import { useSettings } from '../context/SettingsContext';
import { useExercises } from '../context/ExercisesContext';
import { useFeatured } from '../context/FeaturedContext';
import { format } from 'date-fns';
import { PageHeader } from '../components/common/PageHeader';
import './PersonalRecords.css';

// Muscle-group accent colors — give each card/section a meaningful identity
// (replaces the old gold/silver/bronze tiers).
const MUSCLE_COLORS: Record<string, string> = {
  Chest: '#FB7185',
  Back: '#60A5FA',
  Legs: '#A78BFA',
  Shoulders: '#34D399',
  Arms: '#F472B6',
  Core: '#FBBF24',
  Other: '#94A3B8',
};
const muscleColor = (group: string) => MUSCLE_COLORS[group] ?? MUSCLE_COLORS.Other;

// A natural training order for the muscle sections (MUSCLE_GROUPS is alphabetical).
const MUSCLE_ORDER = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Other']
  .filter(g => (MUSCLE_GROUPS as readonly string[]).includes(g));

const emptyPR = (title: string): PRData => ({
  exerciseTitle: title,
  maxWeight: 0,
  maxReps: 0,
  maxVolume: 0,
  maxWeightDate: new Date(),
  maxRepsDate: new Date(),
  maxVolumeDate: new Date(),
  daysSinceLastPR: 0,
});

// ── Exercise search → jumps to the per-exercise detail page ──────────────────
const ExerciseSearch: React.FC<{ exercises: string[] }> = ({ exercises }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? exercises.filter(e => e.toLowerCase().includes(q)) : exercises;
  }, [exercises, query]);

  const go = (title: string) => navigate(`/exercises/${encodeURIComponent(title)}`);

  return (
    <div className="pr-search" ref={ref}>
      <Search size={16} className="pr-search-icon" />
      <input
        className="pr-search-input"
        placeholder="Search an exercise to see its progress…"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'Enter' && filtered.length > 0) go(filtered[0]);
        }}
      />
      {query && (
        <button className="pr-search-clear" onClick={() => { setQuery(''); setOpen(false); }}>
          <X size={14} />
        </button>
      )}
      {open && filtered.length > 0 && (
        <div className="pr-search-dropdown">
          {filtered.slice(0, 80).map(ex => (
            <div
              key={ex}
              className="pr-search-option"
              onMouseDown={e => { e.preventDefault(); go(ex); }}
            >
              {ex}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const PersonalRecords: React.FC<{ workouts: TaggedWorkout[] }> = ({ workouts }) => {
  const { unit } = useSettings();
  const { getMuscleGroup } = useExercises();
  const { featured } = useFeatured();
  const navigate = useNavigate();
  const multiplier = unit === 'lbs' ? 2.20462 : 1;

  const prs = useMemo(() => calculatePRs(workouts), [workouts]);

  const uniqueExercises = useMemo<string[]>(
    () => Array.from(new Set(workouts.map(w => w.exerciseTitle))).sort(),
    [workouts],
  );

  const isRepBased = (exerciseTitle: string) =>
    REP_BASED_EXERCISES.some(name => exerciseTitle.toLowerCase().includes(name.toLowerCase()));

  // ── Featured exercises (owner-chosen). Falls back to top lifts by weight. ──
  const prByTitle = useMemo(() => {
    const m = new Map<string, PRData>();
    prs.forEach(p => m.set(p.exerciseTitle.toLowerCase(), p));
    return m;
  }, [prs]);

  const featuredCards = useMemo(() => {
    const titles = featured.length > 0
      ? featured
      : prs.slice(0, 3).map(p => p.exerciseTitle); // calculatePRs sorts by maxWeight desc
    return titles.map(t => prByTitle.get(t.toLowerCase()) ?? emptyPR(t));
  }, [featured, prs, prByTitle]);

  const featuredKeys = useMemo(
    () => new Set(featuredCards.map(p => p.exerciseTitle.toLowerCase())),
    [featuredCards],
  );

  // ── Everything else, grouped by muscle group ──────────────────────────────
  const groups = useMemo(() => {
    const map = new Map<string, PRData[]>();
    prs.forEach(pr => {
      if (featuredKeys.has(pr.exerciseTitle.toLowerCase())) return;
      const mg = getMuscleGroup(pr.exerciseTitle);
      const arr = map.get(mg) ?? [];
      arr.push(pr);
      map.set(mg, arr);
    });
    map.forEach(arr => arr.sort((a, b) => b.maxWeight - a.maxWeight));
    return MUSCLE_ORDER.filter(g => map.has(g)).map(g => ({ group: g, items: map.get(g)! }));
  }, [prs, featuredKeys, getMuscleGroup]);

  const [muscleFilter, setMuscleFilter] = useState<string>('All');
  const visibleGroups = muscleFilter === 'All' ? groups : groups.filter(g => g.group === muscleFilter);

  const renderCard = (pr: PRData, variant: 'featured' | 'hof') => {
    const isFeatured = variant === 'featured';
    const displayWeight = Math.round(pr.maxWeight * multiplier);
    const displayVol = Math.round(pr.maxVolume * multiplier);
    const repBased = isRepBased(pr.exerciseTitle);
    const accent = muscleColor(getMuscleGroup(pr.exerciseTitle));

    // Pull Up breakdown (only relevant for the non-rep-based display path)
    let bodyweightAnnotation = null;
    if (!repBased && pr.exerciseTitle.toLowerCase().includes('pull up') && pr.bodyweightAtPR) {
      const bwDis = Math.round(pr.bodyweightAtPR * multiplier);
      const addedDis = displayWeight - bwDis;
      bodyweightAnnotation = (
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
          {displayWeight} {unit} ({bwDis}{unit} + {addedDis > 0 ? `${addedDis}${unit}` : `0${unit}`})
        </div>
      );
    }

    const hasRecord = repBased ? pr.maxReps > 0 : displayWeight > 0;
    const handleClick = () => navigate(`/exercises/${encodeURIComponent(pr.exerciseTitle)}`);

    return (
      <div
        key={pr.exerciseTitle}
        className={`${isFeatured ? 'pr-featured-card' : 'pr-hof-card'} pr-card-clickable`}
        style={{ '--accent-bar': accent } as React.CSSProperties}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); }
        }}
      >
        <LineChart size={isFeatured ? 18 : 14} className="pr-card-link-icon" />
        {isFeatured && <Star size={14} className="pr-featured-star" fill={accent} color={accent} />}

        <div className="pr-card-head">
          <h3 className="pr-card-title" style={{ fontSize: isFeatured ? '22px' : '17px' }}>
            {pr.exerciseTitle}
          </h3>
          <span className="pr-card-muscle" style={{ color: accent, borderColor: `${accent}59`, background: `${accent}1A` }}>
            {getMuscleGroup(pr.exerciseTitle)}
          </span>
        </div>

        <div className="pr-stat">
          <div>
            <div className="pr-stat-label">{repBased ? 'Max Reps PR' : 'Max Weight'}</div>
            <div className="pr-value">
              {repBased
                ? (pr.maxReps > 0 ? `${pr.maxReps} Reps` : '—')
                : (displayWeight > 0 ? `${displayWeight} ${unit}` : '—')}
            </div>
            {bodyweightAnnotation}
          </div>
          <div className="pr-date">
            {repBased
              ? (pr.maxReps > 0 ? format(pr.maxRepsDate, 'MM/yy') : '')
              : (displayWeight > 0 ? format(pr.maxWeightDate, 'MM/yy') : '')}
          </div>
        </div>

        <div className="pr-stat" style={{ marginTop: '14px' }}>
          <div>
            <div className="pr-stat-label">Max Set Volume</div>
            <div className="pr-vol-value">{displayVol > 0 ? `${displayVol.toLocaleString()} ${unit}` : '—'}</div>
          </div>
          <div className="pr-date">{displayVol > 0 ? format(pr.maxVolumeDate, 'MM/yy') : ''}</div>
        </div>

        <div className="days-counter">
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Flame size={16} color={pr.daysSinceLastPR < 7 && hasRecord ? 'var(--accent-pink-main)' : 'var(--text-muted)'} />
            Days since PR
          </span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{hasRecord ? pr.daysSinceLastPR : '—'}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="pr-container">
      <PageHeader icon={Trophy} title="Records" />

      <ExerciseSearch exercises={uniqueExercises} />

      {prs.length === 0 ? (
        <div className="pr-empty">No records yet — log a few workouts to start setting PRs.</div>
      ) : (
        <>
          {/* ── Featured ──────────────────────────────────────────── */}
          <div className="pr-section-head">
            <Star size={18} color="var(--accent-pink-main)" />
            <h3 className="pr-section-title">Featured</h3>
            <span className="pr-section-hint">Set these in Settings → Featured Records</span>
          </div>
          <div className="pr-featured-grid">
            {featuredCards.map(pr => renderCard(pr, 'featured'))}
          </div>

          {/* ── Hall of Fame, organized by muscle group ───────────── */}
          {groups.length > 0 && (
            <>
              <div className="pr-section-head pr-section-head--spaced">
                <Trophy size={18} color="var(--text-secondary)" />
                <h3 className="pr-section-title">Hall of Fame</h3>
              </div>

              <div className="pr-muscle-filter">
                <button
                  className={`pr-filter-chip ${muscleFilter === 'All' ? 'pr-filter-chip--active' : ''}`}
                  onClick={() => setMuscleFilter('All')}
                >
                  All
                </button>
                {groups.map(({ group }) => (
                  <button
                    key={group}
                    className={`pr-filter-chip ${muscleFilter === group ? 'pr-filter-chip--active' : ''}`}
                    style={muscleFilter === group ? { color: muscleColor(group), borderColor: `${muscleColor(group)}80` } : undefined}
                    onClick={() => setMuscleFilter(group)}
                  >
                    {group}
                  </button>
                ))}
              </div>

              {visibleGroups.map(({ group, items }) => (
                <div key={group} className="pr-muscle-group">
                  <div className="pr-group-label">
                    <span className="pr-group-dot" style={{ background: muscleColor(group) }} />
                    {group}
                    <span className="pr-group-count">{items.length}</span>
                  </div>
                  <div className="pr-hof-grid">
                    {items.map(pr => renderCard(pr, 'hof'))}
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
};
