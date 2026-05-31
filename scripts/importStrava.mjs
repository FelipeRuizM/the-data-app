#!/usr/bin/env node
/**
 * Import a single Strava activity (run/walk) from a share link, mapped to the
 * shape the website stores at /users/{uid}/runs/{key}. Writes JSON to
 * scripts/output/ for you to VERIFY. It does NOT touch Firebase.
 *
 * Strava activities are private to your account, so this needs credentials.
 * Run scripts/strava-auth.mjs ONCE first (see that file's header).
 *
 * Usage:
 *   node scripts/importStrava.mjs https://strava.app.link/nIdzJvyGA3b
 *   node scripts/importStrava.mjs https://www.strava.com/activities/1234567890
 *   node scripts/importStrava.mjs 1234567890
 *   node scripts/importStrava.mjs <link> --type Long   # override run type
 *   node scripts/importStrava.mjs <link> --raw         # also dump the raw API JSON
 *
 * Run types (matches the website): Light | Explosion | Long | Other.
 * Default mapping from Strava workout_type: long run -> Long, race/workout ->
 * Explosion, otherwise Light (Walk -> Other). Override with --type.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatDbDate, paceFromDistance, formatDuration } from './lib/format.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'output');
const TOKENS_FILE = join(__dirname, '.strava-tokens.json');
const CREDS_FILE = join(__dirname, '.strava.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const RUN_TYPES = ['Light', 'Explosion', 'Long', 'Other'];

function parseArgs(argv) {
  const args = { raw: false, input: null, type: null };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--raw') args.raw = true;
    else if (a === '--type') args.type = rest[++i];
    else if (!args.input) args.input = a;
  }
  return args;
}

function getCreds() {
  let id = process.env.STRAVA_CLIENT_ID;
  let secret = process.env.STRAVA_CLIENT_SECRET;
  if ((!id || !secret) && existsSync(CREDS_FILE)) {
    const j = JSON.parse(readFileSync(CREDS_FILE, 'utf8'));
    id = id || j.client_id;
    secret = secret || j.client_secret;
  }
  return { id, secret };
}

/** Resolve a strava.app.link / URL / id into a numeric activity id. */
async function resolveActivityId(input) {
  if (/^\d+$/.test(input.trim())) return input.trim();

  const direct = input.match(/activities\/(\d+)/);
  if (direct) return direct[1];

  // Follow the Branch (app.link) redirects and scan for an activity id.
  console.log(`[strava] resolving link ${input} ...`);
  const res = await fetch(input, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  const finalUrl = res.url || '';
  let m = finalUrl.match(/activities\/(\d+)/);
  if (m) return m[1];

  const body = await res.text();
  m = body.match(/activities\/(\d+)/) || body.match(/"activity_id"\s*:\s*"?(\d+)/);
  if (m) return m[1];

  console.error('[strava] Could not find an activity id in the link. Open the link in your browser, copy the https://www.strava.com/activities/<ID> URL (or just the number), and pass that instead.');
  process.exit(2);
}

async function getAccessToken() {
  if (!existsSync(TOKENS_FILE)) {
    console.error('[strava] No tokens found. Run: node scripts/strava-auth.mjs   (one-time setup)');
    process.exit(1);
  }
  const tokens = JSON.parse(readFileSync(TOKENS_FILE, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  if (tokens.expires_at && tokens.expires_at - 60 > now) return tokens.access_token;

  // Refresh
  const { id, secret } = getCreds();
  if (!id || !secret) {
    console.error('[strava] Missing credentials to refresh token (STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET or scripts/.strava.json).');
    process.exit(1);
  }
  console.log('[strava] refreshing access token ...');
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: id,
      client_secret: secret,
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('[strava] token refresh failed:', data);
    process.exit(1);
  }
  writeFileSync(
    TOKENS_FILE,
    JSON.stringify(
      { ...tokens, access_token: data.access_token, refresh_token: data.refresh_token, expires_at: data.expires_at },
      null,
      2,
    ),
  );
  return data.access_token;
}

function mapRunType(activity, override) {
  if (override) {
    const match = RUN_TYPES.find((t) => t.toLowerCase() === override.toLowerCase());
    return match || 'Other';
  }
  const sport = (activity.sport_type || activity.type || '').toLowerCase();
  if (sport.includes('walk') || sport.includes('hike')) return 'Other';
  switch (activity.workout_type) {
    case 2: return 'Long';      // long run
    case 1: return 'Explosion'; // race
    case 3: return 'Explosion'; // workout
    default: return 'Light';
  }
}

/** Map a Strava activity to our /runs payload. */
function mapActivity(a, typeOverride) {
  const km = (Number(a.distance) || 0) / 1000;
  const seconds = Number(a.moving_time) || Number(a.elapsed_time) || 0;
  const start = new Date(a.start_date_local || a.start_date || Date.now());
  const place = [a.location_city, a.location_state, a.location_country].filter(Boolean).join(', ');
  return {
    title: a.name || 'Run',
    type: mapRunType(a, typeOverride),
    start_time: formatDbDate(start),
    distance_km: Math.round(km * 100) / 100,
    duration_seconds: seconds,
    pace: paceFromDistance(seconds, km),
    description: a.description || place || '',
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.input) {
    console.error('Usage: node scripts/importStrava.mjs <strava-link-or-id> [--type Light|Explosion|Long|Other] [--raw]');
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const id = await resolveActivityId(args.input);
  const token = await getAccessToken();

  console.log(`[strava] fetching activity ${id} ...`);
  const res = await fetch(`https://www.strava.com/api/v3/activities/${id}?include_all_efforts=false`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const activity = await res.json();
  if (!res.ok) {
    console.error('[strava] API error:', activity);
    process.exit(1);
  }

  if (args.raw) {
    const rawFile = join(OUT_DIR, `strava-${id}.raw.json`);
    writeFileSync(rawFile, JSON.stringify(activity, null, 2));
    console.log(`[strava] raw activity -> ${rawFile}`);
  }

  const payload = mapActivity(activity, args.type);
  const outFile = join(OUT_DIR, `strava-${id}.json`);
  writeFileSync(outFile, JSON.stringify(payload, null, 2));

  console.log('\n=== Mapped run (NOT written to Firebase) ===');
  console.log(`title:      ${payload.title}`);
  console.log(`type:       ${payload.type}`);
  console.log(`start_time: ${payload.start_time}`);
  console.log(`distance:   ${payload.distance_km} km`);
  console.log(`time:       ${formatDuration(payload.duration_seconds)}`);
  console.log(`pace:       ${payload.pace}`);
  console.log(`description:${payload.description ? ' ' + payload.description : ''}`);
  console.log(`\nSaved -> ${outFile}`);
  console.log('Verify it, then we can wire up the DB write step.');
}

main().catch((err) => {
  console.error('[strava] failed:', err);
  process.exit(1);
});
