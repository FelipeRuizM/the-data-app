/** Parses "mm:ss", "hh:mm:ss", or a bare minutes number into seconds. */
export const parseTimeToSeconds = (str: string): number => {
  const trimmed = str.trim();
  if (!trimmed) return 0;
  const parts = trimmed.split(':').map((p) => Number(p));
  if (parts.some((n) => isNaN(n))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 1) return parts[0] * 60; // bare number = minutes
  return 0;
};

/** Maps a 1–10 difficulty rating to a label + color bucket. */
export const runDifficulty = (n: number): { label: string; color: string } => {
  if (n <= 3) return { label: 'Easy', color: '#4ADE80' };
  if (n <= 6) return { label: 'Medium', color: '#FACC15' };
  if (n <= 8) return { label: 'Hard', color: '#FB7185' };
  return { label: 'Extreme', color: '#A855F7' };
};

/** Formats seconds as "m:ss" or "h:mm:ss". */
export const formatDuration = (seconds: number): string => {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};
