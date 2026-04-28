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

## Architecture

### Stack
Pure vanilla JS + CSS static site hosted on GitHub Pages. No framework, no build tool, no bundler. Firebase Firestore is the only external runtime dependency, loaded via CDN compat scripts in `index.html`.

### Access control
No platform gate. The user "Fogel" is the commissioner/admin — identified by name match in `isAdmin` checks throughout the code.

The login overlay has two tabs — **Sign In** (existing user) and **Sign Up** (new user) — controlled by `loginMode` and `setLoginMode()`. Sign In rejects unknown usernames. **Sign Up is currently blocked** — submitting the form shows "Registration is closed. The playoffs have already started." **The Sign In / Sign Up tab bar is hidden** (`display: none !important`) since only Sign In is active. The access code gate (`initGate()`) is bypassed — it always returns true. Switching accounts shows a **← Back** button (`canGoBack = true` in `showLoginOverlay()`) that restores the previous session without logging out.

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
- **Diagram / mobile list / Rules long names**: First Round, Conf. Semifinals, Conf. Finals, NBA Finals (`ROUND_NAMES` constant)
- **Table column abbreviations** (leaderboard, upset bonus table): FR, CSF, CF, Finals

### Scoring
`ROUND_POINTS = [0, 10, 20, 40, 80]` per round + `GAMES_BONUS = 10` for correct series length.

**Upset bonus**: `getUpsetBonus(sid, pickedKey, roundPts)` — correctly picking the underdog earns `2 × roundPts × gap / 100`, where `gap = floor10(favPct) − 50` (minimum 5). Fan pick %s hardcoded in `WIN_PCT` (R1 only, from picks.nba.com). `floor10` = floor to nearest 10%.

**Tiebreaker**: `state.finalsGap[pid]` — each user predicts Game 1 Finals score margin (required before saving Finals picks). `state.finalsGame1ActualGap` is auto-populated from `scoresData.finalsGame1Gap` (detected by `fetch_scores.py`). Leaderboard sorts ties by closest gap prediction.

`computeScore(pid)` sums base + games bonus + upset bonus across all series. Returns `{ score, correct, possible }` where **`correct`** = number of series where `seriesPoints > 0` (i.e. scored anything, not strictly "right winner"). Shown as "X correct · Y pts" in the All Picks header.

**Prizes**: Buy-in is 100 ₪ per player. Rules page shows formulas (not hardcoded amounts): 1st = (Prize pool − Buy-in) × 70%, 2nd = (Prize pool − Buy-in) × 30%, 3rd = Buy-in back. Leaderboard shows prizes on `.prize-bar`; actual amounts 1,050 ₪ / 450 ₪ / 100 ₪, prize pool = 1,600 ₪.

**Series emoji** (`seriesEmoji(sid, leaderKey)`): shown on results cards and Pick Details breakdown next to the score. Based on the leader's pre-series fan win % from `WIN_PCT` (R1 only): ≤25% → 😮, ≤50% → 🤔, ≤75% → 🙂, >75% → 😎. Exception: SAS leading any series always returns 😭 (personal easter egg — SAS is favoured over Portland at ~98%). R2+ series have no `WIN_PCT` so emoji is always empty.

### Rendering
Five tabs: **My Picks**, **All Picks**, **Results**, **Leaderboard**, **Rules**. Each renderer registered in `RENDERERS`; corresponding `#tab-{name}` div in `index.html`. Active tab persisted in `sessionStorage`; restored on page refresh, reset to My Picks on login.

Three card render modes, all via `bracketCard(sid, mode, pid)`:
- `'picks'` → `cardPicks()` — interactive, current user's bracket; shows countdown timer in footer
- `'results'` → `cardResults()` — read-only, shows series record footer (`Tied 0–0` → `SAS leads 2–1` → `SAS wins in 6`)
- `'view'` → `cardView()` — read-only, another user's picks (hidden until series locks, except admin/own)

The bracket has two parallel HTML outputs:
- `.bracket-wrap` — 7-column horizontal diagram (hidden on mobile and landscape phones).
- `.bracket-list` — list by conference/round (shown on mobile and landscape phones).

**Pick visibility**: other users' picks hidden until series locks — unless viewer is admin (Fogel) or viewing own picks. Gap prediction shown on Finals card in All Picks only when the viewed user has submitted one.

### Scores pipeline
`scripts/fetch_scores.py` runs hourly via GitHub Actions, hits `stats.nba.com` (retries up to 3×), writes `data/scores.json` with: `records` (wins per series, all rounds), `gameTimes` (preserved from prior run — R1 only, R2+ added manually), `finalsGame1Gap` (auto-detected from Game 1 point totals). Front-end `fetchScores()` runs on load and every 5 minutes: auto-sets series winners via `syncResultsFromAPI()`, auto-populates `state.finalsGame1ActualGap`.

### Key non-obvious details
- **Downstream clearing**: `clearResultDownstream()` recursively invalidates later-round results when a result is edited.
- **Mobile bracket height**: uses `height: var(--bracket-h)` (580px desktop / 480px mobile) — explicit height required so `flex: 1` and CSS Grid `1fr` rows resolve inside the column layout. Do not add `overflow` to `.bracket` — it clips the y-axis in Chrome/Safari.
- **Responsive breakpoints**: one `@media (max-width: 600px), (orientation: landscape) and (max-height: 500px)` block covers both portrait and landscape phones — landscape phones get identical styles to portrait mobile. A separate `@media (max-width: 900px)` block handles tablet layout (compact header tabs).
- **Potential points font sizes**: `fan-pct`, `pot-pts`, `pot-base`, `pot-bonus`, and `games-bonus-hint` are all 10px base (diagram), dropping to 9px in the landscape phone breakpoint. In `.bracket-list--single` (list view) they are explicitly set to 14px. All five must be kept in sync at every breakpoint — never rely on inheritance alone for `pot-base`/`pot-bonus`/`games-bonus-hint`.
- **Games row layout**: `.games-selector` uses flexbox with order: label → buttons (`.games-btns`) → `+10` hint (`.games-bonus-hint`, grey, `margin-left: auto` to push right) → games ✓ mark (`.win-mark`, appears after `+10` when games prediction is correct). `.pot-pts` has `gap: 3px` between base and bonus spans.
- **Prize place column**: `.info-table td.prize-place` — needs the full selector (not just `.prize-place`) to beat `.info-table td { white-space: normal }` specificity on the Rules page.
- **Rules page spacing**: `.info-tab` uses `gap: 32px` between sections; `.info-section` has `padding-top: 16px` plus a border-top divider (~48px total visual gap). Matches the rhythm of other pages.
- **Swipe navigation**: touchend handler threshold is 80px horizontal min, 2.5× horizontal-to-vertical ratio — prevents false triggers while scrolling.
- **Bracket width formula**: `--card-w: min(calc((100vw - 128px) / 7), 260px)` — fills full viewport width, capped at 260px per card. `main` has no max-width so the diagram always fills the screen. The Finals column and each bracket column are equal width via `flex: 3` on each `.half` and `flex: 1` on `.finals-col`. Do NOT use fixed widths on `.finals-col` or `.round-labels-spacer` — they must use `flex: 1` to match bracket column widths.
- **Team names in diagram**: `.team-name` uses `white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0` so names stay on one line and never push `.pot-pts` off-card.
- **ESPN logo abbreviation exception**: SAS → `'sa'`.
- **Firebase API key**: intentionally public (project identifier only). Security enforced by Firestore Rules.
- **Cache busting**: `index.html` references `app.js?v=X` and `style.css?v=X`. The `cache_bust.yml` GitHub Action replaces `X` with the short commit SHA on every push to `main` (excluding `data/scores.json` changes). Never manually edit the `?v=` values.
- **GitHub Actions git push**: both workflows do `git pull --rebase origin main` before pushing to handle concurrent commits between the two workflows.
- **Leaderboard total points**: styled via `.total-cell` in `style.css` — currently green (`var(--green)`).
- **Leaderboard rank arrows**: snapshot (`SCORE_SNAPSHOT_KEY`) stores `__resultsCount` alongside per-user rank/score. Arrows (▲/▼/–) only appear when `Object.keys(state.results).length > snap.__resultsCount` — i.e. new series have completed since the last login. All users see "–" until a new series finishes after their session starts.
- **Pick Details (breakdown) row**: layout is `display: flex` with three fixed-width columns — `.bd-pick-name` (`flex: 1`, truncates with `…`), `.bd-pick-team` (`width: 52px`, right-aligned), `.bd-pts-earned` (`width: 20px`, centered). All rows are `height: 28px` so users align horizontally across series cards. In-progress picks show green/yellow background; completed picks show ✓✓ (winner + games), ✓ (winner only), ✗ (wrong) in `.bd-pts-earned` (green) / `.bd-pts-wrong` (red). The result bar (`.bd-result`) below the series header shows live score + emoji, mirroring the Results tab footer. Two legends above the grid: "Pick Potential" (dot colours) and "Pick Status" (✓✓/✓/✗ meanings).
- **All cards have equal height**: every `matchup-card` always renders a `.card-footer` — invisible spacer (`.card-footer-spacer`) when there is no real footer content, so finished and in-progress cards are the same height.
- **User greeting + "Log out" button**: rendered in `updateUserDisplay()` — greeting shows `[name] is in the building!` where the name is wrapped in `.greeting-name` (bold, orange `var(--accent)`), rest is normal weight dimmed text. Logout is `.btn-switch-user`; clicking calls `switchUser()` which shows the login overlay.
- **Leaderboard conference titles**: `.bd-conf-title` — "Eastern Conference" / "Western Conference" headers in the pick breakdown, styled orange (`var(--accent)`).
- **Floating save/edit buttons**: `renderFloatingSaveBar(pid)` renders `.floating-save-bar` with `.fab-save` (orange) and `.fab-edit` buttons pinned to bottom-center of the My Picks tab. Replaces the old sticky round-controls bar. After saving, `showSaveToast('✓ Picks saved!')` shows a center-screen auto-dismissing toast.
- **Save scores workflow**: `update_scores.yml` runs on `cron: '0 * * * *'` (every hour on the hour).
- **Removed users re-syncing**: `syncPicksToGitHub()` checks Firestore participants on every save — if the current user is not in the remote list, `switchUser()` is called immediately (logged out, write aborted). `fetchPicks()` on page load performs the same check. Local `state.participants` is also pruned to only Firestore-authorised IDs before each write, so stale localStorage cannot restore removed users.
