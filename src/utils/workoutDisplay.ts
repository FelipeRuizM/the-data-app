import { Dumbbell, Cable, Footprints, Activity, type LucideIcon } from 'lucide-react';

// ── Set types ─────────────────────────────────────────────────
export type SetType = 'normal' | 'warmup' | 'dropset' | 'failure' | 'feeder' | 'working';

export const SET_TYPES: { key: SetType; label: string; name: string; color: string }[] = [
  { key: 'normal',  label: '#',  name: 'Normal',   color: 'var(--text-primary)' },
  { key: 'working', label: 'Wk', name: 'Working',  color: '#10B981' },
  { key: 'warmup',  label: 'W',  name: 'Warmup',   color: '#F59E0B' },
  { key: 'feeder',  label: 'Fd', name: 'Feeder',   color: '#A855F7' },
  { key: 'dropset', label: 'D',  name: 'Drop Set', color: '#3B82F6' },
  { key: 'failure', label: 'F',  name: 'Failure',  color: '#EF4444' },
];

/** Label for a set: a running count for normal sets, the type abbreviation otherwise. */
export const getSetLabel = (sets: { setType: SetType }[], idx: number): string => {
  const s = sets[idx];
  if (s.setType !== 'normal') {
    return SET_TYPES.find(t => t.key === s.setType)?.label ?? '?';
  }
  let n = 0;
  for (let i = 0; i <= idx; i++) if (sets[i].setType === 'normal') n++;
  return n.toString();
};

export const getSetTypeName = (type: SetType) =>
  SET_TYPES.find(t => t.key === type)?.name ?? 'Normal';

export const getSetColor = (type: SetType) =>
  SET_TYPES.find(t => t.key === type)?.color ?? 'var(--text-primary)';

// ── Workout categories (split types) ──────────────────────────
export const CATEGORY_STYLES: Record<string, { color: string; icon: LucideIcon }> = {
  Push:  { color: '#60A5FA', icon: Dumbbell },
  Pull:  { color: '#4ADE80', icon: Cable },
  Legs:  { color: '#FB7185', icon: Footprints },
  Mixed: { color: '#A78BFA', icon: Activity },
};

export const getCategoryStyle = (category?: string) =>
  CATEGORY_STYLES[category ?? 'Mixed'] ?? CATEGORY_STYLES.Mixed;
