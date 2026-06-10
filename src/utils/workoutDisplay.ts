import type { ComponentType } from 'react';
import { Activity, Trophy, TrendingUp, Gauge, type LucideIcon } from 'lucide-react';
import { PushIcon, PullIcon, LegsIcon, type CategoryIconProps } from '../components/icons/WorkoutCategoryIcons';

// Either a Lucide icon or one of our custom split icons — both accept size/color.
export type CategoryIcon = ComponentType<CategoryIconProps>;

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
export const CATEGORY_STYLES: Record<string, { color: string; icon: CategoryIcon }> = {
  Push:  { color: '#60A5FA', icon: PushIcon },
  Pull:  { color: '#4ADE80', icon: PullIcon },
  Legs:  { color: '#FB7185', icon: LegsIcon },
  Mixed: { color: '#A78BFA', icon: Activity },
};

export const getCategoryStyle = (category?: string) =>
  CATEGORY_STYLES[category ?? 'Mixed'] ?? CATEGORY_STYLES.Mixed;

// ── PR record types (shared badge styling) ────────────────────
export type PRType = 'weight' | 'volume' | 'oneRM';

export const PR_TYPES: { key: PRType; label: string; short: string; color: string; icon: LucideIcon; description: string }[] = [
  { key: 'weight', label: 'Weight', short: 'PR',  color: '#FFC400', icon: Trophy,     description: 'Heaviest weight ever for this exercise' },
  { key: 'oneRM',  label: '1RM',    short: '1RM', color: '#34D399', icon: Gauge,      description: 'Best estimated one-rep max for this exercise' },
  { key: 'volume', label: 'Volume', short: 'Vol', color: '#60A5FA', icon: TrendingUp, description: 'Most volume ever in a single set for this exercise' },
];
