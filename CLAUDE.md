# The Data App

Personal fitness tracker (workouts, runs, PRs, analytics). React 19 + TypeScript + Vite,
Firebase Realtime DB, Recharts, deployed to GitHub Pages via `.github/workflows/deploy.yml`
on every push to `main`.

## Commands

- `npm run dev` — dev server
- `npm run build` — typecheck (`tsc -b`) + production build. Run this before considering work done.
- `npm run lint` — eslint

## UI patterns

**Page header** — every page except the Dashboard opens with the shared `PageHeader`
component (`src/components/common/PageHeader.tsx`): a 28px pink-accent icon + the page
title, 24px below it the content. Use the tab's sidebar icon (Activity for Workouts,
Footprints for Running, Trophy for Records, BarChart3 for Analytics, CalendarDays for
Monthly, Settings for Settings). Pages also share a 24px top padding so headers line up
across tabs.

**Typography scale** — defined in `src/styles/typography.ts`; always import from there
instead of hand-rolling font styles. The hierarchy every page follows:

| Role | Style | Use |
|---|---|---|
| Page title | Outfit 24px/700 | the single `h2` at the top of a page |
| Section title | Outfit 18px/600 | `h3` separating sections |
| Card title | Outfit 16px/600 | Card / history-item titles, paired with a 16px icon |
| Body text | Inter 14px, `--text-secondary` | metric & info rows |
| Meta text | Inter 13px, `--text-muted` | dates, fine print |
| Stat value | Inter 32px/bold | big numbers in stat cards |

Card layout pattern for history items (see Run + Workout cards): small inline icon
(16px Lucide; the custom category icons render at 20px to match visual weight) + title +
chips on one row, date on the right, then one compact metrics row underneath. History
lists stack with a 12px gap under an "History" `h3`. Form styles live in
`src/styles/formStyles.ts`.

**Dates: simpler is better.** Never show verbose dates ("Wednesday, Jun 10th 2026 - 4:57 PM").
- History items: `d MMM, HH:mm` → "10 Jun, 16:57", muted, on the right
- Records / low-precision: `MM/yy` → "04/26"
- Weekly chart axes: week start only via `weekAxisTick` ("Jan 6"); tooltips get the compact
  range from `getWeekLabel` ("Jan 6 – 12"). Use `minTickGap` so axes never get crowded.

**Charts**: every chart `Card` is exactly **360px tall** — side-by-side graphs must always
match heights, otherwise the page looks sloppy. Chart headers use the shared
`.dmc-header` / `.dmc-pills` classes from `src/components/analytics/ChartPills.css`
(they wrap on narrow screens instead of overflowing the card).

**Mobile matters.** This app is used on a phone. Nothing may bleed out of its container:
grid cells need `min-width: 0`, native date/time inputs are width-capped in `App.css`,
pill rows wrap. Check layouts at ~375px width when touching UI.

## Data conventions

- Weights are stored in **kg**; convert for display with `unit === 'lbs' ? 2.20462 : 1`
  from `useSettings()`.
- Workout history is flat sets grouped into sessions via `groupWorkoutSessions`.
- Exercise → muscle-group mapping comes from the DB (`useExercises().getMuscleGroup`),
  never hardcoded.

## Versioning

The version is **derived from git at build time** in `vite.config.ts` (injected as
`__APP_VERSION__`, declared in `src/vite-env.d.ts`) — do not edit it by hand and ignore
`package.json`'s version field. Scheme: commit 504ba75 (rename to "The Data App") is the
v2.0.0 baseline; each commit bumps the patch and every 10 commits roll into the minor
(`2.{n/10}.{n%10}`). It updates automatically on every push because the Pages workflow
rebuilds (checkout uses `fetch-depth: 0` — keep it, the commit count needs full history).
The version is shown on the loading screen (`App.tsx`) and the Settings footer.
