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

**Remove a user from DB** — fetch the `brackets/nba-2026` document, filter `participants`, `picks`, `picksSubmitted`, `finalsGap` by the user's `id`, then PATCH back with `updateMask.fieldPaths` for each field. Always verify with a second GET after the PATCH. Use the participant's `id` field (e.g. `p_1776521786553`), not their name.

**Force all users to re-enter the access code** — bump `PLATFORM_SESSION_KEY` in `app.js` (e.g. `'nba-gate-2026'` → `'nba-gate-2026-v2'`). Since the gate is stored in `sessionStorage` under that key, changing it invalidates all existing sessions.

## Architecture

### Stack
Pure vanilla JS + CSS static site hosted on GitHub Pages. No framework, no build tool, no bundler. Firebase Firestore is the only external runtime dependency, loaded via CDN compat scripts in `index.html`.

### Access control
A platform-wide gate (`PLATFORM_PASSWORD = 'nba2026'`) must be passed via `initGate()` before the login overlay appears. Gate state is stored in `sessionStorage`. The user "Fogel" is the commissioner/admin — identified by name match in `isAdmin` checks throughout the code.

The login overlay has two tabs — **Sign In** (existing user) and **Sign Up** (new user) — controlled by `loginMode` and `setLoginMode()`. Sign In rejects unknown usernames; Sign Up rejects already-taken names. Switching accounts shows a **← Back** button (`canGoBack = true` in `showLoginOverlay()`) that restores the previous session without logging out.

### State: two layers
- **`localStorage`** (`nba-bracket-2026-v2`): full app state. Never leaves the device.
- **Firestore** (`brackets/nba-2026`): shared picks. Passwords stored as SHA-256 hashes. Picks stored with **full team names** (e.g. `"Oklahoma City Thunder"`), not the short keys (`W1`) used internally. Conversion at the read/write boundary via `picksToNames()` / `picksToKeys()`. Each pick entry also includes a `round` field (1–4) for DB readability.

On page load: `fetchPicks()` reads Firestore → `mergeRemoteState()` folds remote in (remote submitted picks win, current user's local picks win). On round submit: `syncPicksToGitHub()` reads Firestore → merges other users → writes full document.

**Firestore document fields**: `participants`, `picks`, `picksSubmitted`, `finalsGap`, `finalsGame1ActualGap`, `updated`.

### Team / series data model
- Teams keyed by short codes: `E1–E8`, `W1–W8`. E8 = Orlando Magic, W8 = Phoenix Suns (play-in winners, hardcoded).
- Series IDs: `E1v8`, `E4v5`, `EQ1`, `ECF`, `WCF`, `FINALS`, etc.
- R1 series have `t1`/`t2` directly. R2+ series have `from: [sid, sid]` and pull teams from prior round winners via `resolveTeams()`.
- `DEFAULT_GAME_TIMES` holds first-game UTC timestamps for R1 (EDT = UTC−4). Series lock **at tip-off** of Game 1 (`isSeriesLocked()`). Deadlines display in **Israel time** (`Asia/Jerusalem`) via `formatDeadline()`.
- **R2+ locking**: no hard-coded game times for later rounds. `isSeriesLocked()` falls back to: (1) if `state.results[sid]` is set → locked; (2) if the team pair appears in `scoresData.records` → locked (games have started). Add R2+ times manually to `data/scores.json → gameTimes` when the NBA announces the schedule.
- A series becomes pickable as soon as both feeder series have results (`isSeriesAvailable()`).

### Round name conventions
- **Diagram / mobile list / Rules long names**: First Round, Semifinals, Conf. Finals, NBA Finals (`ROUND_NAMES` constant)
- **Table column abbreviations** (leaderboard, upset bonus table): R1, SF, CF, Finals

### Scoring
`ROUND_POINTS = [0, 10, 20, 40, 80]` per round + `GAMES_BONUS = 10` for correct series length.

**Upset bonus**: `getUpsetBonus(sid, pickedKey, roundPts)` — correctly picking the underdog earns `2 × roundPts × gap / 100`, where `gap = floor10(favPct) − 50` (minimum 5). Fan pick %s hardcoded in `WIN_PCT` (R1 only, from picks.nba.com). `floor10` = floor to nearest 10%.

**Tiebreaker**: `state.finalsGap[pid]` — each user predicts Game 1 Finals score margin (required before saving Finals picks). `state.finalsGame1ActualGap` is auto-populated from `scoresData.finalsGame1Gap` (detected by `fetch_scores.py`). Leaderboard sorts ties by closest gap prediction.

`computeScore(pid)` sums base + games bonus + upset bonus across all series.

### Rendering
Five tabs: **My Picks**, **All Picks**, **Results**, **Leaderboard**, **Rules**. Each renderer registered in `RENDERERS`; corresponding `#tab-{name}` div in `index.html`. Active tab persisted in `sessionStorage`; restored on page refresh, reset to My Picks on login.

Three card render modes, all via `bracketCard(sid, mode, pid)`:
- `'picks'` → `cardPicks()` — interactive, current user's bracket; shows countdown timer in footer
- `'results'` → `cardResults()` — read-only, shows series record footer (`Tied 0–0` → `SAS leads 2–1` → `SAS wins in 6`)
- `'view'` → `cardView()` — read-only, another user's picks (hidden until series locks, except admin/own)

The bracket has two parallel HTML outputs:
- `.bracket-wrap` — 7-column horizontal diagram (hidden on mobile).
- `.bracket-list` — list by conference/round (shown on mobile).

**Pick visibility**: other users' picks hidden until series locks — unless viewer is admin (Fogel) or viewing own picks. Gap prediction shown on Finals card in All Picks only when the viewed user has submitted one.

### Scores pipeline
`scripts/fetch_scores.py` runs hourly via GitHub Actions, hits `stats.nba.com` (retries up to 3×), writes `data/scores.json` with: `records` (wins per series, all rounds), `gameTimes` (preserved from prior run — R1 only, R2+ added manually), `finalsGame1Gap` (auto-detected from Game 1 point totals). Front-end `fetchScores()` runs on load and every 5 minutes: auto-sets series winners via `syncResultsFromAPI()`, auto-populates `state.finalsGame1ActualGap`.

### Key non-obvious details
- **Downstream clearing**: `clearResultDownstream()` recursively invalidates later-round results when a result is edited.
- **Mobile bracket height**: uses `height: var(--bracket-h)` (580px desktop / 480px mobile) — explicit height required so `flex: 1` and CSS Grid `1fr` rows resolve inside the column layout. Do not add `overflow` to `.bracket` — it clips the y-axis in Chrome/Safari.
- **Bracket width formula**: `--card-w: min(calc((100vw - 128px) / 7), 200px)` — 7 columns × card-w + 80px spacing + 48px padding = 100vw, exact fit.
- **ESPN logo abbreviation exception**: SAS → `'sa'`.
- **Firebase API key**: intentionally public (project identifier only). Security enforced by Firestore Rules.
- **Cache busting**: `index.html` references `app.js?v=X` and `style.css?v=X`. The `cache_bust.yml` GitHub Action replaces `X` with the short commit SHA on every push to `main` (excluding `data/scores.json` changes). Never manually edit the `?v=` values.
- **GitHub Actions git push**: both workflows do `git pull --rebase origin main` before pushing to handle concurrent commits between the two workflows.
- **Leaderboard total points**: styled via `.total-cell` in `style.css` — currently green (`var(--green)`).
- **"Log out" button**: rendered in `updateUserDisplay()` as `.btn-switch-user`; clicking calls `switchUser()` which shows the login overlay.
- **Removed users re-syncing**: `syncPicksToGitHub()` checks Firestore participants on every save — if the current user is not in the remote list, `switchUser()` is called immediately (logged out, write aborted). `fetchPicks()` on page load performs the same check. Local `state.participants` is also pruned to only Firestore-authorised IDs before each write, so stale localStorage cannot restore removed users.
