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

The login overlay has two tabs — **Sign In** (existing user) and **Sign Up** (new user) — controlled by `loginMode` and `setLoginMode()`. Sign In rejects unknown usernames. **Sign Up is currently blocked** — submitting the form shows "Registration is closed. The playoffs have already started." Switching accounts shows a **← Back** button (`canGoBack = true` in `showLoginOverlay()`) that restores the previous session without logging out.

### State: two layers
- **`localStorage`** (`nba-bracket-2026-v2`): full app state. Never leaves the device.
- **Firestore** (`brackets/nba-2026`): shared picks. Passwords stored as SHA-256 hashes. Picks stored with **full team names** (e.g. `"Oklahoma City Thunder"`), not the short keys (`W1`) used internally. Conversion at the read/write boundary via `picksToNames()` / `picksToKeys()`. Each pick entry also includes a `round` field (1–4) for DB readability.

On page load: `fetchPicks()` reads Firestore → `mergeRemoteState()` folds remote in (remote submitted picks win, current user's local picks win). For the current user, remote picks are **merged** on top of local (spread: local first, remote on top) — this preserves unsubmitted draft picks (e.g. a locally-set Finals pick) across tab switches that trigger fetchPicks. For other users, remote always replaces local entirely. On round submit: `syncPicksToGitHub()` reads Firestore → merges other users → writes full document.

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

**Upset bonus**: `getUpsetBonus(sid, pickedKey, roundPts)` — correctly picking the underdog earns `2 × roundPts × gap / 100`, where `gap = floor10(favPct) − 50` (minimum 5). Fan pick %s hardcoded in `WIN_PCT` (R1 + R2 entries). `floor10` = floor to nearest 10%. R2 entries: `EQ1 {t1:58,t2:42}`, `EQ2 {t1:29,t2:71}`, `WQ1 {t1:91,t2:9}`, `WQ2 {t1:87,t2:13}` — t1/t2 order matches `state.results[def.from[0/1]]`. R3 entries: `ECF {t1:42,t2:58}` (CLE vs NYK), `WCF {t1:73,t2:27}` (OKC vs SAS). R4: `FINALS {t1:34,t2:66}` (NYK vs SAS — NYK 34% underdog, upset bonus = 2×80×10/100 = 16 pts).

**Tiebreaker**: `state.finalsGap[pid]` — each user predicts Game 1 Finals score margin (optional, not required for saving). `state.finalsGame1ActualGap` is auto-populated from `scoresData.finalsGame1Gap` (detected by `fetch_scores.py`). Always synced from remote — if Firestore sends null, state is cleared (prevents stale values). Leaderboard sorts ties by closest gap prediction.

`computeScore(pid)` sums base + games bonus + upset bonus across all series. Returns `{ score, correct, possible }` where **`correct`** = number of series where `seriesPoints > 0` (i.e. scored anything, not strictly "right winner"). Shown as "X correct · Y pts" in the All Picks header.

**Prizes**: Buy-in is 100 ₪ per player. Rules page shows formulas (not hardcoded amounts): 1st = (Prize pool − Buy-in) × 70%, 2nd = (Prize pool − Buy-in) × 30%, 3rd = Buy-in back. Leaderboard shows prizes on `.prize-bar`; actual amounts 1,050 ₪ / 450 ₪ / 100 ₪, prize pool = 1,600 ₪.

**Series emoji** (`seriesEmoji(sid, leaderKey)`): shown on results cards next to the score when one team leads. Based on the leader's pre-series fan win % from `WIN_PCT` (R1 only): ≤25% → 😮, ≤50% → 🤔, ≤75% → 🙂, >75% → 😎. Exception: any team leading against Portland (W7) always returns 😭 (personal easter egg — Portland is at 2%). R2+ series have no `WIN_PCT` so emoji is always empty.

### Rendering
Five tabs: **My Picks**, **All Picks**, **Results**, **Leaderboard**, **Rules**. Each renderer registered in `RENDERERS`; corresponding `#tab-{name}` div in `index.html`. Active tab persisted in `sessionStorage`; restored on page refresh. On fresh login `getLandingTab()` picks the tab by priority: (1) incomplete picks → My Picks, (2) new series results + user rank changed → Leaderboard, (3) new series results, rank unchanged → Results, (4) nothing new → Leaderboard.

Three card render modes, all via `bracketCard(sid, mode, pid)`:
- `'picks'` → `cardPicks()` — interactive, current user's bracket; shows countdown timer in footer
- `'results'` → `cardResults()` — read-only, shows series record footer (`Tied 0–0` → `SAS leads 2–1` → `SAS wins in 6`)
- `'view'` → `cardView()` — read-only, another user's picks (hidden until series locks, except own picks)

The bracket has two parallel HTML outputs:
- `.bracket-wrap` — 7-column horizontal diagram (hidden on mobile and landscape phones).
- `.bracket-list` — list by conference/round (shown on mobile and landscape phones).

**Pick visibility**: other users' picks hidden until series locks — no admin bypass. Fogel sees the same hidden card as regular players in All Picks. In Leaderboard Pick Details, Fogel sees a green/red completion dot (`.bd-legend-dot`) per player row for unlocked series instead of actual picks. Gap prediction shown on Finals card in All Picks only when the viewed user has submitted one.

### Scores pipeline
`scripts/fetch_scores.py` runs hourly via GitHub Actions, fetches from `cdn.nba.com/static/json/staticData/scheduleLeagueV2.json`, writes `data/scores.json` with:
- `records` — win counts per series (keyed by sorted team abbr pair e.g. `"OKC-PHX"`)
- `games` — per-game breakdown per series: `[{ n, gameId, home, homePts, away, awayPts, date }]`
- `boxScores` — player stats per finished game keyed by `gameId`: `{ home: { tricode, city, name, score, players: [{name, jersey, min, pts, reb, ast, stl, blk}] }, away: {...} }`. Players sorted by pts; DNP players excluded. Minutes parsed from `PT38M` / `PT37M56.00S` format via regex. Already-fetched games are cached and skipped on subsequent runs.
- `gameTimes` — preserved from prior run (R1 only; R2+ added manually)
- `finalsGame1Gap` — auto-detected from Finals Game 1 point totals

Front-end `fetchScores()` runs on load and every 5 minutes: auto-sets series winners via `syncResultsFromAPI()`, auto-populates `state.finalsGame1ActualGap`.

### Key non-obvious details
- **Downstream clearing**: `clearResultDownstream()` recursively invalidates later-round results when a result is edited.
- **Mobile bracket height**: uses `height: var(--bracket-h)` (580px desktop / 480px mobile) — explicit height required so `flex: 1` and CSS Grid `1fr` rows resolve inside the column layout. Do not add `overflow` to `.bracket` — it clips the y-axis in Chrome/Safari.
- **Responsive breakpoints**: one `@media (max-width: 600px), (orientation: landscape) and (max-height: 500px)` block covers both portrait and landscape phones — landscape phones get identical styles to portrait mobile. A separate `@media (max-width: 900px)` block handles tablet layout (compact header tabs).
- **Potential points font sizes**: `fan-pct`, `pot-pts`, `pot-base`, `pot-bonus`, and `games-bonus-hint` are all 10px base (diagram), dropping to 9px in the landscape phone breakpoint. In `.bracket-list--single` (list view) they are explicitly set to 14px. All five must be kept in sync at every breakpoint — never rely on inheritance alone for `pot-base`/`pot-bonus`/`games-bonus-hint`.
- **Games row layout**: `.games-selector` uses flexbox with order: label → buttons (`.games-btns`) → `+10` hint (`.games-bonus-hint`, grey, `margin-left: auto` to push right) → games ✓/✗ mark (`.win-mark`, hidden in My Picks and All Picks). `.pot-pts` has `gap: 3px` between base and bonus spans. Games label and buttons use `var(--text)` color (white). Font sizes: 9px in diagram, 14px in list view. `.games-selector` left-padded to 24px (diagram) / 28px (list) to align label with team logo column.
- **Pick colors (My Picks & All Picks)**: team rows — `is-winner` (green, correct pick or in-progress if correct result), `is-selected` (yellow, picked but series not yet done), `is-wrong-pick` (red, wrong pick after result). Games buttons — selected=green, `games-correct`=brighter green, `games-wrong`=red. ✓/✗ marks hidden in My Picks and All Picks (`mark = ''`, `gamesMark = ''`) — background colors convey status instead. Results tab (cardResults) still shows marks.
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
- **Best possible placement** (`renderMaxPlacements(rows)`): shown below the leaderboard table as a single text line (`.max-place-section`, `padding: 10px 0 20px`, `font-size: 13px`, dim text) followed by an info "i" button with explanation. Only visible while at least one series is still open. Anchors the scenario to the **current user's picks** — everyone's score is computed assuming MY picks are the actual outcomes. This is intentional: computing each player's independent best case produces an impossible scenario (e.g. SAS winning in both 6 and 7 simultaneously). Games bonus is awarded only when another player's games pick matches mine AND the count is still achievable given the current live series record (`getRecord` → `oppWins + 4` check). Includes FINALS once the user has made a FINALS pick; excluded until then. Updates automatically every 5 min as `scoresData` refreshes.
- **Leaderboard rank arrows**: snapshot (`SCORE_SNAPSHOT_KEY = 'nba-2026-rank-snap'`) stores per-user `{ score, rank }` and `__resultsCount`. Created once on first login — NOT overwritten on subsequent logins. `syncResultsFromAPI()` saves the snapshot BEFORE applying each new series result, so the baseline always reflects pre-series rankings. Arrows (▲/▼) only display when `currentResultsCount >= 2`; all users see the "no change" mark until at least 2 series are complete. The "–" no-change mark is a CSS-drawn horizontal bar (`.rank-same-line`: `5px × 2px`, yellow `#eab308`) rendered inside `.rank-same` — avoids font baseline issues that caused the en-dash character to render below the arrows. To re-baseline all users simultaneously, bump `SCORE_SNAPSHOT_KEY` to a new string.
- **Leaderboard notification toast**: shown on login when `currentResultsCount > lbSeen` (new results since last LB visit). `getRankMessage(pid)` returns `{ msg, toastCls }`. `toastCls` is `'toast-positive'` (green) for moved-up or top-3, `''` (orange accent) for no change ("You're holding Xth place 🔒"), `'toast-negative'` (red) for moved down. `leaderboardMessage` / `leaderboardToastCls` are set in `startApp()` and cleared by `switchTab()` when leaving the Leaderboard tab — NOT cleared inside `renderLeaderboard()` (that caused a visible flash during the fetchPicks re-render). `markLbSeen` is only called inside `renderLeaderboard()` when `activeTab === 'leaderboard'` — prevents background re-renders (e.g. from My Picks pick clicks) from prematurely marking the toast seen. The toast stays visible for the entire session on Leaderboard and is gone on the next visit. My Picks toast (`showIncompleteToast` removed — now computed live in `renderBracket()`) persists on every visit until all unlocked series have a winner + games pick. Leaderboard initially sorted alphabetically when all scores are 0.
- **Pick Details (breakdown) row**: layout is `display: flex; height: 28px` — three fixed-width columns: `.bd-pick-name` (`flex: 1`, truncates with `…`), `.bd-pick-team` (`width: 52px`, `justify-content: flex-end`), `.bd-pts-earned` (`width: 20px`, `text-align: center`). No `margin-left: auto` on `.bd-pts-earned` — competed with `flex: 1` on name causing misalignment. Fixed heights keep all rows aligned horizontally across series cards. In-progress picks show a coloured dot (`.bd-pot-dot green/yellow`) inside `.bd-pick-team`. Completed picks: ✓✓ (winner + games), ✓✗ (winner only), ✗✗ (wrong). The result bar (`.bd-result`) shows live score + emoji mirroring the Results tab. Two legends: "Potential Status" (dot colours) and "Final Status" (✓✓/✓✗/✗✗).
- **Pick Details conference layout**: R1 — East then West stacked. R2 (CSF) — side by side desktop only. R3 (CF) — side by side on both desktop and mobile (`.breakdown-confs-row--r3` overrides the mobile stack). R4 (Finals) — single card centered (`.breakdown-finals-centered`, no max-width — matches full leaderboard width). `.breakdown-finals-gap` class targets both the Finals card container and the tiebreaker/correct-picks containers; all use `grid-template-columns: 1fr` to fill the full width. Wrapper gets `breakdown-confs-row--r${bdRoundFilter}` class for per-round CSS targeting.
- **All cards have equal height**: every `matchup-card` always renders a `.card-footer` — invisible spacer (`.card-footer-spacer`) when there is no real footer content, so finished and in-progress cards are the same height.
- **Series detail view**: clicking a Results card opens `renderSeriesDetail(sid)` inline (same tab, no overlay). Shows logos, series status, and all game scores. Clicking a game row opens `renderGameDetail()` showing both teams' box scores from `scoresData.boxScores[gameId]`. Back buttons navigate up. State: `seriesDetailSid` / `gameDetailData`. Cleared when switching away from Results tab via `switchTab()`. Cards in All Picks always navigate to Results via `handleSeriesCardClick()`; My Picks cards only navigate when the series is locked (`handleSeriesCardClick(event, sid, locked)` — `locked` passed as `allowNav`). Unlocked My Picks cards have no pointer cursor and no onclick navigation.
- **Username → All Picks navigation**: `goToAllPicksUser(pid, sid)` sets `viewingPid` and `highlightedSid`, then calls `switchTab('picks')`. Names in Leaderboard table (`.p-name-link`) and Pick Details rows trigger this. Highlighted series gets `.series-highlight` class (orange border) and is scrolled into view after a 80ms delay with 120px header offset.
- **User greeting + "Log out" button**: rendered in `updateUserDisplay()` — greeting shows `[name] is in the building!` where the name is wrapped in `.greeting-name` (bold, orange `var(--accent)`), rest is normal weight dimmed text. Logout is `.btn-switch-user`; clicking calls `switchUser()` which shows the login overlay.
- **Leaderboard conference titles**: `.bd-conf-title` — "Eastern Conference" / "Western Conference" headers in the pick breakdown, styled orange (`var(--accent)`).
- **Pick Details — Finals extra tables**: When `bdRoundFilter === 4`, two additional tables appear below the Finals series card in a side-by-side `.breakdown-finals-row` flex container: (1) **Correct Picks** — always visible; sorted by leaderboard order (not by correct count); shows `X/total` format — both values 12px (`X` bold green, `/total` dim). (2) **Game 1 Finals Gap** — gaps hidden with `🔒 Hidden until series starts` until `isSeriesLocked('FINALS') || adminView`; once revealed shows each user's gap or `-` if not entered; when actual gap known shows `gap (diff)` — gap dim 12px, diff bold green 12px, brackets dim 12px. No pick shown as `-` (`.bd-pick-games` style). Both tables use `.breakdown-finals-gap` (full-width single-column grid). Side-by-side on all screen sizes; `flex: 1 1 0` ensures equal widths.
- **My Picks pending toast**: Shows "You have pending picks — lock them in before tip-off! ⏰" when any available + unlocked series has no winner or games pick. No hard save requirements — gap is never required for saving.
- **Partial picks validation**: `getPartialSeries(pid, round)` returns series where ≥1 param is set but not all. Non-Finals: needs winner + games (both or neither). Finals: needs winner + games + gap (all or none). Empty series (nothing set) is always allowed. Save is blocked with an orange toast: "Some picks are incomplete — finish them or clear them to save". `showSaveToast(msg, warn=false)` — pass `warn=true` for orange colour.
- **Floating save/edit buttons**: `renderFloatingSaveBar(pid)` renders `.floating-save-bar` with `.fab-save` (orange) and `.fab-edit` buttons pinned to bottom-center of the My Picks tab. Replaces the old sticky round-controls bar. After saving, `showSaveToast('✓ Picks saved!')` shows a center-screen auto-dismissing toast (green). Partial-picks error shows in orange (`warn=true`).
- **Info buttons**: `infoBtn(html)` helper returns a small circular "i" button with a click-toggle tooltip. Used next to: Best possible placement, Potential Status legend, Final Status legend. Tooltip uses `position: absolute` on desktop, `position: fixed` (full-width, centered) on mobile to prevent clipping. Click outside any `.info-btn` to close all tooltips (global handler in `beginApp()`).
- **Games selector / gap row styling**: Both rows use `height: 3px 6px` padding, `9px` font, same left alignment. List view scales to `14px`. `.gap-input-row` and `.games-selector` share identical layout so they appear the same height.
- **CF breakdown width**: `.breakdown-confs-row--r3` overrides the generic row with `width: 100%; gap: 16px; flex: 1 1 0` on each conf-col and `grid-template-columns: 1fr` so the single series card per conference fills its column to match the leaderboard width. CSF (R2) is unaffected.
- **Rules page sections**: "How Picking Works" (first section — when each round opens/locks, IST deadlines), "Points System", "Upset Bonus", "Prizes", "Tiebreaker" (last section — correct picks first, then Game 1 Finals gap margin).
- **Save scores workflow**: `update_scores.yml` runs on `cron: '0 * * * *'` (every hour on the hour).
- **Removed users re-syncing**: `syncPicksToGitHub()` checks Firestore participants on every save — if the current user is not in the remote list, `switchUser()` is called immediately (logged out, write aborted). `fetchPicks()` on page load performs the same check. Local `state.participants` is also pruned to only Firestore-authorised IDs before each write, so stale localStorage cannot restore removed users.
- **Round recap pages**: Standalone static HTML pages per round — `r1-recap.html`, `csf-recap.html`, `cf-recap.html`, `finals-recap.html` (future). No app.js dependency; all data hardcoded. Same CSS/component structure across all pages (hero, lb-wrap, series-grid, insights-grid, pick-scroll, bar-fill animation). Data fetched from Firestore REST API (`FIRESTORE_API_KEY` from app.js) via curl → PowerShell parse (avoid `$pid` — reserved PS variable; use `$pkey`). **Leaderboard always shows cumulative totals** across all rounds to date, with correct count out of total series (e.g. 9/12 after R1+CSF). Pick grid shows current round picks only, sorted by cumulative score. NOT linked from the app.
- **Leaderboard scroll**: `switchTab()` calls `window.scrollTo(0, 0)` once on tab switch. The `fetchPicks().then()` callback does NOT call `scrollTo` — doing so caused scroll snap-back when the async fetch resolved while the user was scrolled down interacting with the round filter.
- **Pick Details row layout**: `display: flex; height: 28px` — three columns: `.bd-pick-name` (`flex: 1`, truncates), `.bd-pick-team` (`width: 52px`, `justify-content: flex-end`), `.bd-pts-earned` (`width: 20px`, `text-align: center`). Fixed widths keep the team abbreviation and status mark vertically aligned across all rows. No `margin-left: auto` on `.bd-pts-earned` — that competed with `flex: 1` on name and caused misalignment.
- **Sign In / Sign Up**: tab bar hidden (`display: none !important`). Sign Up blocked at submit. Access code gate (`initGate()`) bypassed — always returns true.
