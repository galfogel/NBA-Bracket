# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Local development** — no build step. Open `index.html` directly in a browser. All logic is in `app.js`; changes are reflected immediately on reload.

**Deploy** — push to `main`. GitHub Pages serves the site automatically.

**Trigger score update manually** — GitHub Actions → `update_scores.yml` → Run workflow. Or run locally:
```bash
pip3 install requests
python scripts/fetch_scores.py
```

**One-off Firestore admin scripts** — use `python3 -` with inline script + `requests` library (SSL on macOS requires `requests`, not `urllib`). Firestore REST base URL: `https://firestore.googleapis.com/v1/projects/nba-bracket-f91f1/databases/(default)/documents`. API key is in `app.js` (`FIRESTORE_API_KEY`).

## Architecture

### Stack
Pure vanilla JS + CSS static site hosted on GitHub Pages. No framework, no build tool, no bundler. Firebase Firestore is the only external runtime dependency, loaded via CDN compat scripts in `index.html`.

### Access control
A platform-wide gate (`PLATFORM_PASSWORD = 'nba2026'`) must be passed via `initGate()` before the login overlay appears. Gate state is stored in `sessionStorage`. The user "Fogel" is the commissioner/admin — identified by name match in `isAdmin` checks throughout the code.

### State: two layers
- **`localStorage`** (`nba-bracket-2026-v2`): full app state. Never leaves the device.
- **Firestore** (`brackets/nba-2026`): shared picks. Passwords stored as SHA-256 hashes. Picks stored with **full team names** (e.g. `"Oklahoma City Thunder"`), not the short keys (`W1`) used internally. Conversion at the read/write boundary via `picksToNames()` / `picksToKeys()`. Each pick entry also includes a `round` field (1–4) for DB readability.

On page load: `fetchPicks()` reads Firestore → `mergeRemoteState()` folds remote in (remote submitted picks win, current user's local picks win). On round submit: `syncPicksToGitHub()` reads Firestore → merges other users → writes full document.

**Firestore document fields**: `participants`, `picks`, `picksSubmitted`, `finalsGap`, `finalsGame1ActualGap`, `updated`.

### Team / series data model
- Teams keyed by short codes: `E1–E7`, `W1–W7`, plus play-in candidates `ORL`, `CHA`, `GSW`, `PHX`.
- Series IDs: `E1v8`, `E4v5`, `EQ1`, `ECF`, `WCF`, `FINALS`, etc.
- Series with `t2Slot` depend on the play-in result; series with `from: [sid, sid]` pull teams from prior round winners via `resolveTeams()`.
- `DEFAULT_GAME_TIMES` holds first-game UTC timestamps (verified against NBA.com official schedule, EDT = UTC−4); series lock **3 hours before** the first game (`isSeriesLocked()`). Lock deadlines display in **Israel time** (`Asia/Jerusalem`) via `formatDeadline()`.
- A series becomes pickable independently as soon as both feeder series have results (`isSeriesAvailable()`) — does not wait for the full round to finish.

### Scoring
`ROUND_POINTS = [0, 10, 20, 40, 80]` per round + `GAMES_BONUS = 10` for correct series length.

**Upset bonus** (Formula B): `getUpsetBonus(sid, pickedKey, roundPts)` — correctly picking the underdog earns `floor(roundPts × (favPct − 50) / 100)`. Fan pick %s hardcoded in `WIN_PCT` (R1 only, from picks.nba.com).

**Tiebreaker**: `state.finalsGap[pid]` — each user predicts Game 1 Finals score margin (required before saving Finals picks). `state.finalsGame1ActualGap` is auto-populated from `scoresData.finalsGame1Gap` (detected by `fetch_scores.py`). Leaderboard sorts ties by closest gap prediction.

`computeScore(pid)` sums base + games bonus + upset bonus across all series.

### Rendering
Five tabs: **My Picks**, **All Picks**, **Results**, **Leaderboard**, **Rules**. Each renderer registered in `RENDERERS`; corresponding `#tab-{name}` div in `index.html`.

Three card render modes, all via `bracketCard(sid, mode, pid)`:
- `'picks'` → `cardPicks()` — interactive, current user's bracket
- `'results'` → `cardResults()` — read-only, shows series record footer (`Tied 0–0` before games start → `SAS leads 2–1` / `Tied 1–1` → `SAS wins in 6`)
- `'view'` → `cardView()` — read-only, another user's picks (picks hidden until series locks, except admin/own)

The bracket has two parallel HTML outputs:
- `.bracket-wrap` — 7-column horizontal diagram (hidden on mobile).
- `.bracket-list` — list by conference/round (hidden on desktop; shown in landscape mobile via `@media (orientation: landscape) and (max-height: 500px)`).

**Pick visibility**: other users' picks hidden until series locks — unless viewer is admin (Fogel) or viewing own picks. Gap prediction shown on Finals card in All Picks only when the viewed user has submitted one.

### Scores pipeline
`scripts/fetch_scores.py` runs hourly via GitHub Actions, hits `stats.nba.com`, writes `data/scores.json` with: `records` (wins per series), `playIn` (confirmed 8-seeds), `gameTimes` (preserved from prior run), `finalsGame1Gap` (auto-detected from Game 1 point totals — identified as the series with the latest first-game date). Front-end `fetchScores()` reads this on load: auto-sets series winners, auto-populates `state.finalsGame1ActualGap`.

### Key non-obvious details
- **Play-in 8-seeds**: `state.playIn = { E8: teamKey, W8: teamKey }` set by commissioner in Results tab. Until set, E1v8/W1v8 show TBD.
- **gameTimes for R2+**: not yet auto-detected by the script — only R1 times are in `DEFAULT_GAME_TIMES`. Later-round lock deadlines won't show until the script is extended or times are added manually.
- **Downstream clearing**: `clearResultDownstream()` recursively invalidates later-round results when a result is edited.
- **Mobile bracket height**: uses `height: var(--bracket-h)` (580px desktop / 480px mobile) — explicit height required so `flex: 1` and CSS Grid `1fr` rows resolve inside the column layout. Tablet (`≤900px`) card width stays at `120px`.
- **ESPN logo abbreviation exceptions**: SAS → `'sa'`, GSW → `'gs'`.
- **Firebase API key**: intentionally public (project identifier only). Security enforced by Firestore Rules.
