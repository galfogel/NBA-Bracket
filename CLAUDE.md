# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Local development** — no build step. Open `index.html` directly in a browser. All logic is in `app.js`; changes are reflected immediately on reload.

**Deploy** — push to `main`. GitHub Pages serves the site automatically.

**Trigger score update manually** — GitHub Actions → `update_scores.yml` → Run workflow. Or run locally:
```bash
pip install requests
python scripts/fetch_scores.py
```

## Architecture

### Stack
Pure vanilla JS + CSS static site hosted on GitHub Pages. No framework, no build tool, no bundler. Firebase Firestore is the only external runtime dependency, loaded via CDN compat scripts in `index.html`.

### Access control
A platform-wide gate (`PLATFORM_PASSWORD = 'nba2026'`) must be passed via `initGate()` before the login overlay appears. Gate state is stored in `sessionStorage`. The user "Fogel" is the commissioner/admin — identified by name match in `isAdmin` checks throughout the code.

### State: two layers
- **`localStorage`** (`nba-bracket-2026-v2`): full app state including passwords. Never leaves the device.
- **Firestore** (`brackets/nba-2026`): shared picks. Passwords are stored as SHA-256 hashes. Picks are stored with **full team names** (e.g. `"Oklahoma City Thunder"`), not the short keys (`W1`) used everywhere internally. Conversion happens at the read/write boundary via `picksToNames()` / `picksToKeys()`.

On page load: `fetchPicks()` reads Firestore → `mergeRemoteState()` folds remote data in (remote submitted picks win, current user's local picks win). On round submit: `syncPicksToGitHub()` reads Firestore → merges other users → writes full document.

### Team / series data model
- Teams are keyed by short codes: `E1–E7`, `W1–W7`, plus play-in candidates `ORL`, `CHA`, `GSW`, `PHX`.
- Series IDs: `E1v8`, `E4v5`, `EQ1`, `ECF`, `WCF`, `FINALS`, etc.
- Series with `t2Slot` depend on the play-in result; series with `from: [sid, sid]` pull their teams from prior round winners via `resolveTeams()`.
- `DEFAULT_GAME_TIMES` holds first-game UTC timestamps; series lock **3 hours before** the first game (`isSeriesLocked()`).
- A series becomes pickable independently as soon as both its two feeder series have results (`isSeriesAvailable()`) — it does not wait for the full round to finish.

### Scoring
`ROUND_POINTS = [0, 10, 20, 40, 80]` per round + `GAMES_BONUS = 10` for correct series length.

**Upset bonus**: `getUpsetBonus(sid, pickedKey, roundPts)` — if a user correctly picks the underdog (lower fan-pick %), they earn `floor(roundPts × favoritePct / 100)` extra points. Fan pick percentages are hardcoded in `WIN_PCT` (R1 only, sourced from picks.nba.com).

`computeScore(pid)` iterates all series comparing picks to `state.results`, summing base points + games bonus + upset bonus.

### Rendering
Five tabs: **My Picks**, **All Picks**, **Results** (commissioner), **Leaderboard**, **Rules**. Each tab has a renderer registered in `RENDERERS` and a corresponding `#tab-{name}` div.

The bracket has two parallel HTML outputs:
- `.bracket-wrap` — 7-column horizontal diagram (hidden on mobile via CSS).
- `.bracket-list` — list grouped by conference and round (hidden on desktop; also shown in landscape mobile via `@media (orientation: landscape) and (max-height: 500px)`).

`bracketCard(sid, mode, pid)` is the shared card renderer. Each team row includes an ESPN CDN logo (`https://a.espncdn.com/i/teamlogos/nba/500/{abbr}.png`) and fan pick % for R1 series.

**Pick visibility**: other users' picks for a series are hidden until the series is locked — unless the viewer is admin (Fogel) or viewing their own picks.

### Scores pipeline
`scripts/fetch_scores.py` runs hourly via GitHub Actions, hits `stats.nba.com`, and writes `data/scores.json`. The front-end calls `fetchScores()` on load and uses it to show series records and auto-detect series winners. Commissioner can override `playIn` seeds and `gameTimes` via the Results tab; the Python script preserves existing `gameTimes` values when updating.

### Key non-obvious details
- **Play-in 8-seeds**: `state.playIn = { E8: teamKey, W8: teamKey }` is set by the commissioner in the Results tab. Until set, E1v8/W1v8 show as TBD.
- **Downstream clearing**: editing a result via the Results tab calls `clearResultDownstream()` which recursively invalidates later-round results that depended on it.
- **Mobile vs desktop bracket**: the bracket uses `height: var(--bracket-h)` (580px desktop / 480px mobile) — an **explicit height** is required so that `flex: 1` and CSS Grid `1fr` rows resolve correctly inside the column layout. Tablet (`≤900px`) card width stays at `120px` (not the clamp formula used on desktop).
- **ESPN logo abbreviation exceptions**: SAS → `'sa'`, GSW → `'gs'` (not the standard 3-letter abbr).
- **Firebase API key**: the Firestore `apiKey` in `app.js` is intentionally public (it identifies the project, not admin access). Security is enforced by Firestore Rules.
