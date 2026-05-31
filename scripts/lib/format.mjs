// Shared helpers for the import scripts. No external dependencies.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Format a Date into the exact string the website stores in Realtime DB:
 *   "d MMM yyyy, HH:mm"  e.g. "1 Jan 2026, 14:30"
 * Matches src/hooks/useWorkouts.ts and src/pages/Workouts.tsx (date-fns 'd MMM yyyy, HH:mm').
 */
export function formatDbDate(date) {
  const d = date.getDate();
  const mon = MONTHS[date.getMonth()];
  const y = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${d} ${mon} ${y}, ${hh}:${mm}`;
}

/** seconds -> "m:ss /km" pace string from a distance in km. */
export function paceFromDistance(seconds, km) {
  if (!km || km <= 0 || !seconds) return '';
  const secPerKm = seconds / km;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

/** Pretty seconds -> "h:mm:ss" / "m:ss". */
export function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Walk an arbitrary parsed JSON tree and return the first node matching predicate. */
export function findNode(root, predicate) {
  const seen = new Set();
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;
    if (seen.has(node)) continue;
    seen.add(node);
    if (predicate(node)) return node;
    for (const key of Object.keys(node)) stack.push(node[key]);
  }
  return null;
}

/** Walk the tree and collect every node matching predicate. */
export function findAllNodes(root, predicate) {
  const seen = new Set();
  const out = [];
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;
    if (seen.has(node)) continue;
    seen.add(node);
    if (predicate(node)) out.push(node);
    for (const key of Object.keys(node)) stack.push(node[key]);
  }
  return out;
}
