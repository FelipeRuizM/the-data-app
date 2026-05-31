#!/usr/bin/env node
/**
 * One-time Strava OAuth helper. Strava activities require credentials, so this
 * gets you a long-lived refresh token that importStrava.mjs uses afterwards.
 *
 * Prerequisites (one-time, free):
 *   1. Go to https://www.strava.com/settings/api and create an API application.
 *      - "Authorization Callback Domain": localhost
 *      - Copy the Client ID and Client Secret.
 *   2. Provide them to this script via either:
 *      - env vars:  STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET   (recommended)
 *      - or a file: scripts/.strava.json  { "client_id": "...", "client_secret": "..." }
 *
 * Usage:
 *   node scripts/strava-auth.mjs            # prints the authorize URL to open
 *   node scripts/strava-auth.mjs --code XXX # exchange the code from the redirect URL
 *
 * After approving in the browser you'll be redirected to a URL like
 *   http://localhost/?state=&code=ABC123&scope=read,activity:read_all
 * Copy the `code` value and run the second command. Tokens are saved to
 * scripts/.strava-tokens.json (gitignored).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS_FILE = join(__dirname, '.strava-tokens.json');
const CREDS_FILE = join(__dirname, '.strava.json');
const REDIRECT_URI = 'http://localhost/exchange_token';
const SCOPE = 'activity:read_all';

function getCreds() {
  let id = process.env.STRAVA_CLIENT_ID;
  let secret = process.env.STRAVA_CLIENT_SECRET;
  if ((!id || !secret) && existsSync(CREDS_FILE)) {
    const j = JSON.parse(readFileSync(CREDS_FILE, 'utf8'));
    id = id || j.client_id;
    secret = secret || j.client_secret;
  }
  if (!id || !secret) {
    console.error('Missing Strava credentials. Set STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET, or create scripts/.strava.json');
    process.exit(1);
  }
  return { id, secret };
}

async function exchange(code) {
  const { id, secret } = getCreds();
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: id,
      client_secret: secret,
      code,
      grant_type: 'authorization_code',
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('[strava-auth] token exchange failed:', data);
    process.exit(1);
  }
  writeFileSync(
    TOKENS_FILE,
    JSON.stringify(
      {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        athlete_id: data.athlete?.id,
      },
      null,
      2,
    ),
  );
  console.log(`[strava-auth] success. Tokens saved -> ${TOKENS_FILE}`);
  console.log('You can now run: node scripts/importStrava.mjs <strava-link>');
}

function printAuthUrl() {
  const { id } = getCreds();
  const url =
    'https://www.strava.com/oauth/authorize?' +
    new URLSearchParams({
      client_id: id,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      approval_prompt: 'auto',
      scope: SCOPE,
    }).toString();
  console.log('\n1) Open this URL in your browser and click Authorize:\n');
  console.log(url);
  console.log('\n2) Your browser will redirect to a localhost URL that fails to load — that is fine.');
  console.log('   Copy the `code` value from that URL, then run:\n');
  console.log('   node scripts/strava-auth.mjs --code <PASTE_CODE>\n');
}

const codeIdx = process.argv.indexOf('--code');
if (codeIdx !== -1 && process.argv[codeIdx + 1]) {
  exchange(process.argv[codeIdx + 1]).catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  printAuthUrl();
}
