import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, format, addMonths, subMonths, isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { TaggedWorkout } from '../../hooks/useWorkouts';
import './WorkoutCalendar.css';

interface WorkoutInfo {
  title: string;
  category: string;
}

interface RunInfo {
  title: string;
  distanceKm: number;
}

interface PopoverState {
  top: number;
  left: number;
  above: boolean;
}

interface Props {
  // Receives the full unfiltered workout list so any month is navigable
  workouts: TaggedWorkout[];
  // Runs to overlay as activities (distinct color). Structural so the calendar
  // stays decoupled from the full Run type.
  runs?: { startTime: Date; title: string; distanceKm: number }[];
  // When provided, the calendar locks to this month and hides its own nav —
  // the parent (e.g. Monthly Reports) controls the month instead.
  month?: Date;
}

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const RUN_COLOR = '#4ADE80';

const CATEGORY_COLORS: Record<string, string> = {
  Push:  '#FF2E93',
  Pull:  '#00F0FF',
  Legs:  '#9D00FF',
  Mixed: '#FF85B3',
};

export const WorkoutCalendar: React.FC<Props> = ({ workouts, runs = [], month }) => {
  const controlled = month !== undefined;
  const [viewMonth, setViewMonth]     = useState(() => startOfMonth(month ?? new Date()));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [popover, setPopover]         = useState<PopoverState | null>(null);
  const containerRef                  = useRef<HTMLDivElement>(null);

  // Follow the parent-controlled month when supplied.
  useEffect(() => {
    if (month !== undefined) {
      setViewMonth(startOfMonth(month));
      setSelectedKey(null);
      setPopover(null);
    }
  }, [month]);

  // ── Build date → sessions map (deduped by workout id) ──────────
  const workoutMap = useMemo(() => {
    const map    = new Map<string, WorkoutInfo[]>();
    const seenIds = new Map<string, Set<string>>();

    workouts.forEach(w => {
      const key = format(w.startTime, 'yyyy-MM-dd');
      if (!seenIds.has(key)) seenIds.set(key, new Set());
      if (seenIds.get(key)!.has(w.id)) return;
      seenIds.get(key)!.add(w.id);

      const arr = map.get(key) ?? [];
      arr.push({ title: w.title || 'Workout', category: w.category || 'Mixed' });
      map.set(key, arr);
    });

    return map;
  }, [workouts]);

  // ── Build date → runs map ──────────────────────────────────────
  const runMap = useMemo(() => {
    const map = new Map<string, RunInfo[]>();
    runs.forEach(r => {
      const key = format(r.startTime, 'yyyy-MM-dd');
      const arr = map.get(key) ?? [];
      arr.push({ title: r.title || 'Run', distanceKm: r.distanceKm });
      map.set(key, arr);
    });
    return map;
  }, [runs]);

  const hasActivity = (key: string) => workoutMap.has(key) || runMap.has(key);

  // ── Grid cells: leading blanks + days of the month ─────────────
  const cells = useMemo<(Date | null)[]>(() => {
    const first  = startOfMonth(viewMonth);
    const last   = endOfMonth(viewMonth);
    const blanks = Array<null>(getDay(first)).fill(null);
    return [...blanks, ...eachDayOfInterval({ start: first, end: last })];
  }, [viewMonth]);

  // ── Outside-click dismissal ─────────────────────────────────────
  useEffect(() => {
    if (!selectedKey) return;
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setSelectedKey(null);
        setPopover(null);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [selectedKey]);

  // ── Day click handler ───────────────────────────────────────────
  const handleDayClick = (day: Date, e: React.MouseEvent<HTMLDivElement>) => {
    const key = format(day, 'yyyy-MM-dd');

    if (!hasActivity(key)) {
      setSelectedKey(null);
      setPopover(null);
      return;
    }

    e.stopPropagation(); // prevent container's dismiss handler

    if (selectedKey === key) {
      setSelectedKey(null);
      setPopover(null);
      return;
    }

    const calRect  = containerRef.current!.getBoundingClientRect();
    const cellRect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const POPOVER_H = 76; // rough popover height
    const above = cellRect.top - calRect.top > POPOVER_H + 20;

    setSelectedKey(key);
    setPopover({
      top:   above ? cellRect.top - calRect.top : cellRect.bottom - calRect.top + 8,
      left:  cellRect.left - calRect.left + cellRect.width / 2,
      above,
    });
  };

  const goPrev = () => { setViewMonth(m => subMonths(m, 1)); setSelectedKey(null); setPopover(null); };
  const goNext = () => { setViewMonth(m => addMonths(m, 1)); setSelectedKey(null); setPopover(null); };

  return (
    // container click dismisses any open popover (blanks / non-workout days)
    <div
      className="cal-container glass-panel"
      ref={containerRef}
      onClick={() => { setSelectedKey(null); setPopover(null); }}
    >
      {/* ── Month navigation (hidden when parent-controlled) ──── */}
      <div className="cal-nav" style={controlled ? { justifyContent: 'center' } : undefined}>
        {!controlled && (
          <button className="cal-nav-btn" onClick={e => { e.stopPropagation(); goPrev(); }}>
            <ChevronLeft size={15} />
          </button>
        )}
        <span className="cal-month-title">{format(viewMonth, 'MMMM yyyy')}</span>
        {!controlled && (
          <button className="cal-nav-btn" onClick={e => { e.stopPropagation(); goNext(); }}>
            <ChevronRight size={15} />
          </button>
        )}
      </div>

      {/* ── Calendar grid ────────────────────────────────────── */}
      <div className="cal-grid">
        {DOW.map(d => (
          <div key={d} className="cal-dow">{d}</div>
        ))}

        {cells.map((day, i) => {
          if (!day) return <div key={`b-${i}`} className="cal-blank" />;

          const key        = format(day, 'yyyy-MM-dd');
          const hasWorkout = workoutMap.has(key);
          const hasRun     = runMap.has(key);
          const today      = isToday(day);
          const selected   = key === selectedKey;

          return (
            <div
              key={key}
              className={[
                'cal-day',
                hasWorkout || hasRun ? 'cal-day--workout' : '',
                today      ? 'cal-day--today'   : '',
                selected   ? 'cal-day--selected' : '',
              ].filter(Boolean).join(' ')}
              onClick={e => handleDayClick(day, e)}
            >
              <span className="cal-day-num">{format(day, 'd')}</span>
              {(hasWorkout || hasRun) && (
                <span style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                  {hasWorkout && <span className="cal-dot" />}
                  {hasRun && <span className="cal-dot" style={{ background: RUN_COLOR }} />}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Popover ──────────────────────────────────────────── */}
      {selectedKey && popover && hasActivity(selectedKey) && (
        <div
          className={`cal-popover cal-popover--${popover.above ? 'above' : 'below'}`}
          style={{ top: popover.top, left: popover.left }}
          onClick={e => e.stopPropagation()}
        >
          {(workoutMap.get(selectedKey) ?? []).map((w, i) => (
            <div
              key={`w-${i}`}
              className={`cal-popover-item${i > 0 ? ' cal-popover-item--divider' : ''}`}
            >
              <span className="cal-popover-title">{w.title}</span>
              <span
                className="cal-popover-cat"
                style={{ color: CATEGORY_COLORS[w.category] ?? '#FF85B3' }}
              >
                {w.category}
              </span>
            </div>
          ))}
          {(runMap.get(selectedKey) ?? []).map((r, i) => (
            <div
              key={`r-${i}`}
              className={`cal-popover-item${(workoutMap.get(selectedKey)?.length ?? 0) + i > 0 ? ' cal-popover-item--divider' : ''}`}
            >
              <span className="cal-popover-title">{r.title}</span>
              <span className="cal-popover-cat" style={{ color: RUN_COLOR }}>
                {r.distanceKm > 0 ? `${r.distanceKm.toFixed(1)} km` : 'Run'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
