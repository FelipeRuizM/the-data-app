# Import scripts (local, verify-before-DB)

These run **on your machine only** (Node 18+, uses built-in `fetch` — no `npm install`).
They fetch a single Hevy workout or Strava run, map it to the **exact shape** the
website stores, and write the result to `scripts/output/` for you to inspect.
**Nothing is written to Firebase** — that step is intentionally separate until you
confirm the output looks right.

Why local and not on the website? The site is a static GitHub Pages app with no
backend, and Strava requires OAuth secrets that can't live in client-side code.
A local script is the safe place to hold those secrets.

## Hevy

Hevy share links are public, so no credentials are needed.

```bash
node scripts/importHevy.mjs https://hevy.com/workout/0IPJCabQJql
# or just the id:
node scripts/importHevy.mjs 0IPJCabQJql
# if the mapping looks off, dump the raw page/JSON and send it to me:
node scripts/importHevy.mjs 0IPJCabQJql --raw
```

Output: `scripts/output/hevy-<id>.json` in the `/users/{uid}/workouts` payload shape
(`title`, `start_time`, `end_time`, `category`, `description`, `exercises[].sets[]`).

> Note: Hevy renders the workout from an embedded JSON blob. The parser searches
> the page for a workout-shaped object, so it's resilient to minor changes — but if
> Hevy changed their page or the link needs auth, run with `--raw` and share
> `scripts/output/hevy-<id>.raw.html` so I can adjust the field mapping.

## Strava — needs credentials (one-time setup)

Strava activities are private to your account, so the API needs OAuth. This is a
**one-time** setup; afterwards imports are a single command.

1. Create a (free) API app at <https://www.strava.com/settings/api>
   - **Authorization Callback Domain:** `localhost`
   - Copy the **Client ID** and **Client Secret**.
2. Give them to the scripts — either:
   - export `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET`, **or**
   - create `scripts/.strava.json`:
     ```json
     { "client_id": "12345", "client_secret": "abc...def" }
     ```
3. Authorize and store a refresh token:
   ```bash
   node scripts/strava-auth.mjs            # prints a URL — open it, click Authorize
   # browser redirects to http://localhost/exchange_token?...&code=XXXX (page won't load — that's fine)
   node scripts/strava-auth.mjs --code XXXX   # paste the code from that URL
   ```
   Tokens are saved to `scripts/.strava-tokens.json` and auto-refreshed later.

Then import a run:

```bash
node scripts/importStrava.mjs https://strava.app.link/nIdzJvyGA3b
node scripts/importStrava.mjs https://www.strava.com/activities/1234567890
node scripts/importStrava.mjs 1234567890 --type Long   # override the run type
node scripts/importStrava.mjs <link> --raw             # also dump raw API JSON
```

Output: `scripts/output/strava-<id>.json` in the `/users/{uid}/runs` payload shape
(`title`, `type`, `start_time`, `distance_km`, `duration_seconds`, `pace`,
`description`). Run type defaults from Strava's `workout_type` (long run → `Long`,
race/workout → `Explosion`, else `Light`; walks → `Other`) and can be overridden
with `--type`.

## Security

`.strava.json`, `.strava-tokens.json`, `.env`, and `output/` are gitignored
(`scripts/.gitignore`) so secrets and personal data never get committed or
deployed to the public site.

## Next step (when you're happy with the output)

Once you've verified a few JSON files, tell me and I'll add a small
`publish` script that writes a verified `output/*.json` to
`/users/<OWNER_UID>/workouts` or `/runs` in Realtime DB (using the Firebase Admin
SDK with a service-account key, run locally) — keeping the "review first, publish
second" workflow.
```
