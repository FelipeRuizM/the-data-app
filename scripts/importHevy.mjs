#!/usr/bin/env node
/**
 * Import a single Hevy workout from a public share link, mapped to the exact
 * shape the website stores at /users/{uid}/workouts/{key}. Writes JSON to
 * scripts/output/ for you to VERIFY. It does NOT touch Firebase.
 *
 * Usage:
 *   node scripts/importHevy.mjs https://hevy.com/workout/0IPJCabQJql
 *   node scripts/importHevy.mjs 0IPJCabQJql
 *   node scripts/importHevy.mjs <url> --raw     # also dump the raw page + parsed JSON
 *
 * How it works: Hevy's share page is a web app that embeds the workout as JSON
 * (Next.js __NEXT_DATA__ or a <script type="application/json"> blob). We extract
 * that, find the workout-shaped object, and map Hevy's field names to ours.
 * If the structure differs, run with --raw and send me scripts/output/*.raw.* so
 * I can adjust the mapper.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatDbDate, findNode, findAllNodes } from './lib/format.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'output');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function parseArgs(argv) {
  const args = { raw: false, input: null };
  for (const a of argv.slice(2)) {
    if (a === '--raw') args.raw = true;
    else if (!args.input) args.input = a;
  }
  return args;
}

function workoutIdFrom(input) {
  if (!input) return null;
  const m = input.match(/workout\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : input.trim();
}

/** Pull every embedded JSON blob out of the HTML. */
function extractJsonBlobs(html) {
  const blobs = [];
  // Next.js
  const next = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (next) blobs.push(next[1]);
  // Generic application/json script tags
  const re = /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) blobs.push(m[1]);
  return blobs
    .map((b) => {
      try { return JSON.parse(b); } catch { return null; }
    })
    .filter(Boolean);
}

/** Map a Hevy-shaped workout object to our DB payload. */
function mapWorkout(w) {
  const exercisesRaw = w.exercises || w.workout_exercises || [];
  const exercises = exercisesRaw.map((ex) => {
    const setsRaw = ex.sets || [];
    return {
      exercise_title: ex.title ?? ex.name ?? ex.exercise_title ?? '',
      exercise_notes: ex.notes ?? ex.exercise_notes ?? '',
      sets: setsRaw.map((s, i) => ({
        set_index: s.index ?? s.set_index ?? i + 1,
        set_type: s.type ?? s.set_type ?? 'normal',
        weight_kg: Number(s.weight_kg ?? s.weightKg ?? s.weight ?? 0) || 0,
        reps: Number(s.reps ?? 0) || 0,
        duration_seconds: Number(s.duration_seconds ?? s.durationSeconds ?? 0) || 0,
      })),
    };
  });

  const startRaw = w.start_time ?? w.startTime ?? w.created_at ?? w.createdAt;
  const endRaw = w.end_time ?? w.endTime ?? w.updated_at ?? w.updatedAt;
  const start = startRaw ? new Date(startRaw) : new Date();
  const end = endRaw ? new Date(endRaw) : start;

  return {
    title: w.title ?? w.name ?? 'Workout',
    start_time: formatDbDate(start),
    end_time: formatDbDate(end),
    category: 'Mixed', // Hevy has no category; matches our default. Adjust in the app.
    description: w.description ?? '',
    exercises,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const id = workoutIdFrom(args.input);
  if (!id) {
    console.error('Usage: node scripts/importHevy.mjs <hevy-url-or-id> [--raw]');
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const url = `https://hevy.com/workout/${id}`;
  console.log(`[hevy] fetching ${url}`);
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
  if (!res.ok) {
    console.error(`[hevy] HTTP ${res.status}. The link may be private or expired.`);
    process.exit(1);
  }
  const html = await res.text();

  if (args.raw) {
    const rawHtml = join(OUT_DIR, `hevy-${id}.raw.html`);
    writeFileSync(rawHtml, html);
    console.log(`[hevy] raw HTML -> ${rawHtml}`);
  }

  const blobs = extractJsonBlobs(html);
  if (args.raw && blobs.length) {
    const rawJson = join(OUT_DIR, `hevy-${id}.raw.json`);
    writeFileSync(rawJson, JSON.stringify(blobs, null, 2));
    console.log(`[hevy] parsed JSON blobs -> ${rawJson}`);
  }
  if (!blobs.length) {
    console.error('[hevy] No embedded JSON found. Re-run with --raw and send me the .raw.html so I can adapt the parser (Hevy may have changed their page, or the link needs auth).');
    process.exit(2);
  }

  // Find a workout-shaped node: has an exercises array whose items have sets.
  let workout = null;
  for (const blob of blobs) {
    workout = findNode(blob, (n) =>
      Array.isArray(n.exercises) &&
      n.exercises.some((e) => e && Array.isArray(e.sets)),
    );
    if (workout) break;
  }
  // Fallback: some payloads nest exercises under workout_exercises
  if (!workout) {
    for (const blob of blobs) {
      const candidates = findAllNodes(blob, (n) => Array.isArray(n.sets));
      if (candidates.length) {
        // Reconstruct a minimal workout from the first ancestor we can find.
        workout = findNode(blob, (n) => Array.isArray(n.workout_exercises));
        if (workout) break;
      }
    }
  }

  if (!workout) {
    console.error('[hevy] Found JSON but no workout-shaped object. Re-run with --raw and send me scripts/output/hevy-' + id + '.raw.json');
    process.exit(2);
  }

  const payload = mapWorkout(workout);
  const outFile = join(OUT_DIR, `hevy-${id}.json`);
  writeFileSync(outFile, JSON.stringify(payload, null, 2));

  const setCount = payload.exercises.reduce((n, e) => n + e.sets.length, 0);
  console.log('\n=== Mapped workout (NOT written to Firebase) ===');
  console.log(`title:      ${payload.title}`);
  console.log(`start_time: ${payload.start_time}`);
  console.log(`exercises:  ${payload.exercises.length}  (${setCount} sets)`);
  payload.exercises.forEach((e) =>
    console.log(`  - ${e.exercise_title}: ${e.sets.map((s) => `${s.weight_kg}kg x ${s.reps}`).join(', ')}`),
  );
  console.log(`\nSaved -> ${outFile}`);
  console.log('Verify it, then we can wire up the DB write step.');
}

main().catch((err) => {
  console.error('[hevy] failed:', err);
  process.exit(1);
});
