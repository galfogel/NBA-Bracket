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

### State: two layers
- **`localStorage`** (`nba-bracket-2026-v2`): full app state including passwords. Never leaves the device.
- **Firestore** (`brackets/nba-2026`): shared picks. Passwords are stored as SHA-256 hashes. Picks are stored with **full team names** (e.g. `"Oklahoma City Thunder"`), not the short keys (`W1`) used everywhere internally. Conversion happens at the read/write boundary via `picksToNames()` / `picksToKeys()`.

On page load: `fetchPicks()` reads Firestore → `mergeRemoteState()` folds remote data in (remote submitted picks win, current user's local picks win). On round submit: `syncPicksToGitHub()` reads Firestore → merges other users → writes full document.

### Team / series data model
- Teams are keyed by short codes: `E1–E7`, `W1–W7`, plus play-in candidates `ORL`, `CHA`, `GSW`, `PHX`.
- Series IDs: `E1v8`, `E4v5`, `EQ1`, `ECF`, `WCF`, `FINALS`, etc.
- Series with `t2Slot` depend on the play-in result; series with `from: [sid, sid]` pull their teams from prior round winners via `resolveTeams()`.
- `DEFAULT_GAME_TIMES` holds first-game UTC timestamps; series lock **8 hours before** the first game.

### Scoring
`ROUND_POINTS = [0, 1, 2, 4, 8]` per round + `GAMES_BONUS = 1` for correct series length. `computeScore(pid)` iterates all series comparing picks to `state.results`.

### Rendering
Four tabs: **My Picks** (interactive bracket + mobile list view), **All Picks** (read-only, any user), **Results** (actual results + commissioner play-in controls), **Leaderboard**.

The bracket has two parallel HTML outputs from `renderBracketLayout()`:
- `.bracket-wrap` — the 7-column horizontal diagram (hidden on mobile via CSS).
- `.bracket-list` — list grouped by conference and round (hidden on desktop).

`bracketCard(sid, mode, pid)` is the shared card renderer used by both layouts.

### Scores pipeline
`scripts/fetch_scores.py` runs hourly via GitHub Actions, hits `stats.nba.com`, and writes `data/scores.json`. The front-end calls `fetchScores()` on load and uses it to show series records and auto-detect series winners. Commissioner can override `playIn` seeds and `gameTimes` via the Results tab; the Python script preserves existing `gameTimes` values when updating.

### Key non-obvious details
- **Play-in 8-seeds**: `state.playIn = { E8: teamKey, W8: teamKey }` is set by the commissioner in the Results tab. Until set, E1v8/W1v8 show as TBD.
- **Downstream clearing**: editing a result via the Results tab calls `clearResultDownstream()` which recursively invalidates later-round results that depended on it.
- **Mobile vs desktop bracket**: the bracket uses `height: var(--bracket-h)` (580px desktop / 480px mobile) — an **explicit height** is required so that `flex: 1` and CSS Grid `1fr` rows resolve correctly inside the column layout.
- **Firebase API key**: the Firestore `apiKey` in `app.js` is intentionally public (it identifies the project, not admin access). Security is enforced by Firestore Rules.
