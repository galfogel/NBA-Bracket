// ============================================================
// TEAMS  (play-in teams included — seed assigned once confirmed)
// ============================================================
const TEAMS = {
  E1:  { name: 'Detroit Pistons',           abbr: 'DET', seed: 1, conf: 'East', color: '#C8102E' },
  E2:  { name: 'Boston Celtics',            abbr: 'BOS', seed: 2, conf: 'East', color: '#007A33' },
  E3:  { name: 'New York Knicks',           abbr: 'NYK', seed: 3, conf: 'East', color: '#006BB6' },
  E4:  { name: 'Cleveland Cavaliers',       abbr: 'CLE', seed: 4, conf: 'East', color: '#6F263D' },
  E5:  { name: 'Toronto Raptors',           abbr: 'TOR', seed: 5, conf: 'East', color: '#CE1141' },
  E6:  { name: 'Atlanta Hawks',             abbr: 'ATL', seed: 6, conf: 'East', color: '#E03A3E' },
  E7:  { name: 'Philadelphia 76ers',        abbr: 'PHI', seed: 7, conf: 'East', color: '#006BB6' },
  W1:  { name: 'Oklahoma City Thunder',     abbr: 'OKC', seed: 1, conf: 'West', color: '#007AC1' },
  W2:  { name: 'San Antonio Spurs',         abbr: 'SAS', seed: 2, conf: 'West', color: '#1d1160' },
  W3:  { name: 'Denver Nuggets',            abbr: 'DEN', seed: 3, conf: 'West', color: '#0E2240' },
  W4:  { name: 'Los Angeles Lakers',        abbr: 'LAL', seed: 4, conf: 'West', color: '#552583' },
  W5:  { name: 'Houston Rockets',           abbr: 'HOU', seed: 5, conf: 'West', color: '#CE1141' },
  W6:  { name: 'Minnesota Timberwolves',    abbr: 'MIN', seed: 6, conf: 'West', color: '#236192' },
  W7:  { name: 'Portland Trail Blazers',    abbr: 'POR', seed: 7, conf: 'West', color: '#E03A3E' },
  // Play-In candidates — only visible after commissioner confirms 8-seed
  ORL: { name: 'Orlando Magic',             abbr: 'ORL', seed: 8, conf: 'East', color: '#0077C0' },
  CHA: { name: 'Charlotte Hornets',         abbr: 'CHA', seed: 8, conf: 'East', color: '#00788C' },
  GSW: { name: 'Golden State Warriors',     abbr: 'GSW', seed: 8, conf: 'West', color: '#1D428A' },
  PHX: { name: 'Phoenix Suns',             abbr: 'PHX', seed: 8, conf: 'West', color: '#E56020' },
};

// Play-In game definitions (tonight, Apr 17 — commissioner sets winners)
const PLAYIN = {
  E8: { label: 'East #8 Seed', teamA: 'ORL', teamB: 'CHA', game: 'Charlotte @ Orlando — 7:30 PM ET' },
  W8: { label: 'West #8 Seed', teamA: 'GSW', teamB: 'PHX', game: 'Golden State @ Phoenix — 10:00 PM ET' },
};

// ============================================================
// BRACKET STRUCTURE
// ============================================================
const SERIES = [
  { id: 'E1v8', r: 1, conf: 'East', t1: 'E1', t2Slot: 'E8' },
  { id: 'E4v5', r: 1, conf: 'East', t1: 'E4', t2: 'E5' },
  { id: 'E2v7', r: 1, conf: 'East', t1: 'E2', t2: 'E7' },
  { id: 'E3v6', r: 1, conf: 'East', t1: 'E3', t2: 'E6' },
  { id: 'W1v8', r: 1, conf: 'West', t1: 'W1', t2Slot: 'W8' },
  { id: 'W4v5', r: 1, conf: 'West', t1: 'W4', t2: 'W5' },
  { id: 'W2v7', r: 1, conf: 'West', t1: 'W2', t2: 'W7' },
  { id: 'W3v6', r: 1, conf: 'West', t1: 'W3', t2: 'W6' },
  { id: 'EQ1',  r: 2, conf: 'East', from: ['E1v8', 'E4v5'] },
  { id: 'EQ2',  r: 2, conf: 'East', from: ['E2v7', 'E3v6'] },
  { id: 'WQ1',  r: 2, conf: 'West', from: ['W1v8', 'W4v5'] },
  { id: 'WQ2',  r: 2, conf: 'West', from: ['W2v7', 'W3v6'] },
  { id: 'ECF',  r: 3, conf: 'East', from: ['EQ1', 'EQ2'] },
  { id: 'WCF',  r: 3, conf: 'West', from: ['WQ1', 'WQ2'] },
  { id: 'FINALS', r: 4, conf: null, from: ['ECF', 'WCF'] },
];

const SERIES_MAP   = Object.fromEntries(SERIES.map(s => [s.id, s]));
const ROUND_NAMES  = ['', 'First Round', 'Conf. Semifinals', 'Conf. Finals', 'NBA Finals'];
const ROUND_POINTS = [0, 1, 2, 4, 8];
const GAMES_BONUS  = 1; // bonus point for predicting correct game count

// Default first-game UTC timestamps per series (deadline = -8 hours)
const DEFAULT_GAME_TIMES = {
  E1v8: '2026-04-19T17:30:00Z',
  E4v5: '2026-04-20T17:00:00Z',
  E2v7: '2026-04-20T19:30:00Z',
  E3v6: '2026-04-19T20:00:00Z',
  W1v8: '2026-04-19T22:00:00Z',
  W4v5: '2026-04-20T22:30:00Z',
  W2v7: '2026-04-20T00:30:00Z',
  W3v6: '2026-04-19T23:30:00Z',
};

// ============================================================
// STATE
// ============================================================
const STORAGE_KEY = 'nba-bracket-2026-v2';
const USER_KEY    = 'nba-bracket-2026-user-v2';

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      s.participants   = s.participants   || [];
      s.picks          = s.picks          || {};
      s.results        = s.results        || {};
      s.picksSubmitted = s.picksSubmitted || {};
      s.playIn         = s.playIn         || { E8: null, W8: null };
      return s;
    }
  } catch (_) {}
  return { results: {}, participants: [], picks: {}, playIn: { E8: null, W8: null }, picksSubmitted: {} };
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ── Shared picks database (Firebase Firestore) ────────────────
const FIRESTORE_API_KEY = 'AIzaSyDIzbGO0lnNwKYYRuEd0ap4f7yX_uFtXus';
const FIRESTORE_PROJECT = 'nba-bracket-f91f1';
firebase.initializeApp({ apiKey: FIRESTORE_API_KEY, projectId: FIRESTORE_PROJECT });
const db = firebase.firestore();

async function hashPassword(pass) {
  if (!pass) return null;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pass));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Read picks from Firestore ──────────────────────────────────
async function fetchPicks() {
  try {
    const snap = await db.collection('brackets').doc('nba-2026').get();
    if (!snap.exists) return;
    mergeRemoteState(snap.data());
    save();
  } catch (err) { console.warn('fetchPicks error:', err); }
}

// Merge remote participants + picks into local state.
// Remote is the source of truth for submitted picks and password hashes.
function mergeRemoteState(remote) {
  const rParticipants  = remote.participants   || [];
  const rPicks         = remote.picks          || {};
  const rSubmitted     = remote.picksSubmitted || {};

  for (const rp of rParticipants) {
    const local = state.participants.find(
      p => p.id === rp.id ||
           p.name.toLowerCase() === rp.name.toLowerCase()
    );
    if (!local) {
      state.participants.push({ id: rp.id, name: rp.name, passwordHash: rp.passwordHash || null });
    } else {
      if (rp.passwordHash) local.passwordHash = rp.passwordHash;
      // Normalise to the canonical remote ID so all devices agree
      if (local.id !== rp.id) {
        state.picks[rp.id]         = state.picks[local.id] || {};
        state.picksSubmitted[rp.id] = state.picksSubmitted[local.id] || {};
        delete state.picks[local.id];
        delete state.picksSubmitted[local.id];
        if (currentUserId === local.id) currentUserId = rp.id;
        local.id = rp.id;
      }
    }
    // Remote submitted picks always win (they are the committed source)
    if (rPicks[rp.id])     state.picks[rp.id]          = rPicks[rp.id];
    if (rSubmitted[rp.id]) state.picksSubmitted[rp.id] = rSubmitted[rp.id];
  }
}

// ── Write picks to Firestore ───────────────────────────────────
async function syncPicksToGitHub() {
  try {
    const ref = db.collection('brackets').doc('nba-2026');
    // Snapshot current user's state before any remote merge — local is authoritative for the submitter
    const myPicks     = currentUserId ? JSON.parse(JSON.stringify(state.picks[currentUserId] || {})) : null;
    const mySubmitted = currentUserId ? JSON.parse(JSON.stringify(state.picksSubmitted[currentUserId] || {})) : null;
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) { mergeRemoteState(snap.data()); }
      // Restore current user's picks on top — the merge must not overwrite them
      if (currentUserId && myPicks !== null) {
        state.picks[currentUserId]          = myPicks;
        state.picksSubmitted[currentUserId] = mySubmitted;
      }
      tx.set(ref, {
        updated:        new Date().toISOString(),
        participants:   state.participants.map(({ id, name, passwordHash }) => ({ id, name, passwordHash: passwordHash || null })),
        picks:          state.picks,
        picksSubmitted: state.picksSubmitted,
      });
    });
    save();
  } catch (err) { console.warn('syncPicksToGitHub error:', err); }
}

// Pick accessor — normalises legacy string format to { winner, games }
function getPick(pid, sid) {
  const raw = (state.picks[pid] || {})[sid];
  if (!raw) return { winner: null, games: null };
  if (typeof raw === 'string') return { winner: raw, games: null };
  return { winner: raw.winner || null, games: raw.games || null };
}

function setPick(pid, sid, winner, games) {
  if (!state.picks[pid]) state.picks[pid] = {};
  if (!winner) delete state.picks[pid][sid];
  else state.picks[pid][sid] = { winner, games: games ?? null };
}

// ============================================================
// LOGIN
// ============================================================
let currentUserId = null;

function initLogin() {
  const stored = localStorage.getItem(USER_KEY);
  if (stored && state.participants.find(p => p.id === stored)) {
    currentUserId = stored;
    startApp();
  } else {
    localStorage.removeItem(USER_KEY);
    showLoginOverlay();
  }
}

function showLoginOverlay() {
  document.getElementById('login-overlay').classList.remove('hidden');
  setTimeout(() => document.getElementById('login-name').focus(), 60);
}

async function attemptLogin() {
  const nameInput = document.getElementById('login-name');
  const passInput = document.getElementById('login-pass');
  const msg       = document.getElementById('login-msg');

  try {
  const name = nameInput.value.trim();
  const pass = passInput.value;

  if (!name) {
    msg.textContent = 'Please enter your name.';
    msg.className = 'login-msg msg-error';
    return;
  }

  const hash     = await hashPassword(pass);
  const existing = state.participants.find(p => p.name.toLowerCase() === name.toLowerCase());

  if (existing) {
    if (existing.passwordHash && existing.passwordHash !== hash) {
      msg.textContent = 'Incorrect password.';
      msg.className = 'login-msg msg-error';
      passInput.focus();
      return;
    }
    msg.textContent = `Welcome back, ${existing.name}!`;
    msg.className = 'login-msg msg-welcome';
    currentUserId = existing.id;
  } else {
    const id = 'p_' + Date.now();
    state.participants.push({ id, name, passwordHash: hash });
    state.picks[id] = {};
    save();
    syncPicksToGitHub(); // register new user in shared DB immediately
    msg.textContent = `Welcome, ${name}! Account created.`;
    msg.className = 'login-msg msg-welcome';
    currentUserId = id;
  }

  localStorage.setItem(USER_KEY, currentUserId);
  setTimeout(() => {
    document.getElementById('login-overlay').classList.add('hidden');
    startApp();
  }, 600);
  } catch (err) {
    msg.textContent = 'Error: ' + err.message;
    msg.className = 'login-msg msg-error';
  }
}

function switchUser() {
  currentUserId = null;
  editingState  = { pid: null, round: null };
  localStorage.removeItem(USER_KEY);
  document.getElementById('login-name').value = '';
  document.getElementById('login-pass').value = '';
  document.getElementById('login-msg').textContent = '';
  showLoginOverlay();
}

function startApp() {
  updateUserDisplay();
  switchTab('bracket');
}

function updateUserDisplay() {
  const el = document.getElementById('user-display');
  if (!el || !currentUserId) return;
  const p = state.participants.find(p => p.id === currentUserId);
  if (!p) return;
  el.innerHTML = `<span class="user-greeting">👤 ${p.name}</span>
    <button class="btn-switch-user" id="switch-btn">Switch</button>`;
  document.getElementById('switch-btn').addEventListener('click', switchUser);
}

// ============================================================
// LIVE SCORES  (data/scores.json, updated hourly by GitHub Actions)
// ============================================================
let scoresData  = null;
let editingState = { pid: null, round: null };

function getGameTime(sid) {
  return scoresData?.gameTimes?.[sid] ?? DEFAULT_GAME_TIMES[sid] ?? null;
}

// Series locks 8 hours before its first game
function isSeriesLocked(sid) {
  const gt = getGameTime(sid);
  if (!gt) return false;
  return Date.now() > new Date(gt).getTime() - 8 * 3600 * 1000;
}

function formatDeadline(sid) {
  const gt = getGameTime(sid);
  if (!gt) return null;
  const dl = new Date(new Date(gt).getTime() - 8 * 3600 * 1000);
  return dl.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
    timeZone: 'America/New_York', timeZoneName: 'short',
  });
}

// A series is available to pick when both teams are known
function isSeriesAvailable(sid) {
  const def = SERIES_MAP[sid];
  if (def.t1) {
    const t2 = def.t2 || (def.t2Slot ? state.playIn[def.t2Slot] : null);
    return !!t2;
  }
  return !!state.results[def.from[0]] && !!state.results[def.from[1]];
}

// Can the user still pick/edit this series?
function canPickSeries(pid, sid) {
  if (!isSeriesAvailable(sid)) return false;
  if (isSeriesLocked(sid)) return false;
  const round = SERIES_MAP[sid].r;
  if (state.picksSubmitted[pid]?.[round]) {
    return editingState.pid === pid && editingState.round === round;
  }
  return true;
}

// Is every available series in this round past its deadline?
function isRoundFullyLocked(round) {
  const avail = SERIES.filter(s => s.r === round && isSeriesAvailable(s.id));
  return avail.length > 0 && avail.every(s => isSeriesLocked(s.id));
}

// Series record from NBA API
function getRecord(sid) {
  if (!scoresData?.records) return null;
  const [t1, t2] = resolveTeams(sid);
  if (!t1 || !t2) return null;
  const a1 = TEAMS[t1]?.abbr, a2 = TEAMS[t2]?.abbr;
  if (!a1 || !a2) return null;
  const key = [a1, a2].sort().join('-');
  const rec = scoresData.records[key];
  if (!rec) return null;
  return { t1Wins: rec[a1] ?? 0, t2Wins: rec[a2] ?? 0 };
}

// Actual game count from API (available once series ends)
function getActualGames(sid) {
  const rec = getRecord(sid);
  if (!rec) return null;
  const total = rec.t1Wins + rec.t2Wins;
  return total >= 4 ? total : null;
}

async function fetchScores() {
  try {
    const resp = await fetch('data/scores.json?_=' + Date.now());
    if (!resp.ok) return;
    scoresData = await resp.json();
    syncResultsFromAPI();
    if (RENDERERS[activeTab]) RENDERERS[activeTab]();
  } catch (_) {}
}

// Auto-advance bracket when API shows a team with 4 wins
function syncResultsFromAPI() {
  if (!scoresData) return;
  let changed = false;

  // Auto-detect play-in 8-seeds: whichever play-in candidate appears in
  // the Playoffs records is the confirmed #8 seed.
  const allAbbrs = new Set(
    Object.keys(scoresData.records || {}).flatMap(k => k.split('-'))
  );
  for (const [slot, candidates] of [['E8', ['ORL', 'CHA']], ['W8', ['GSW', 'PHX']]]) {
    if (!state.playIn[slot]) {
      const found = candidates.find(a => allAbbrs.has(a));
      if (found) { state.playIn[slot] = found; changed = true; }
    }
  }

  // Also honour explicit playIn field written by fetch_scores.py
  if (scoresData.playIn) {
    for (const slot of ['E8', 'W8']) {
      if (scoresData.playIn[slot] && !state.playIn[slot]) {
        state.playIn[slot] = scoresData.playIn[slot]; changed = true;
      }
    }
  }

  for (const def of SERIES) {
    if (state.results[def.id]) continue;
    const [t1, t2] = resolveTeams(def.id);
    if (!t1 || !t2) continue;
    const rec = getRecord(def.id);
    if (!rec) continue;
    if (rec.t1Wins >= 4)      { state.results[def.id] = t1; changed = true; }
    else if (rec.t2Wins >= 4) { state.results[def.id] = t2; changed = true; }
  }
  if (changed) save();
}

// ============================================================
// CORE LOGIC
// ============================================================

// Teams always resolved from state.results (actual winners)
function resolveTeams(sid) {
  const def = SERIES_MAP[sid];
  if (def.t1) {
    const t2 = def.t2 || (def.t2Slot ? state.playIn[def.t2Slot] : null);
    return [def.t1, t2 || null];
  }
  return [state.results[def.from[0]] || null, state.results[def.from[1]] || null];
}

function computeScore(pid) {
  let score = 0, correct = 0, possible = 0;
  for (const def of SERIES) {
    const actual = state.results[def.id];
    const pick   = getPick(pid, def.id);
    if (pick.winner) possible++;
    if (actual && pick.winner && actual === pick.winner) {
      let pts = ROUND_POINTS[def.r];
      const ag = getActualGames(def.id);
      if (ag && pick.games && ag === pick.games) pts += GAMES_BONUS;
      score += pts;
      correct++;
    }
  }
  return { score, correct, possible };
}

function clearResultDownstream(sid) {
  delete state.results[sid];
  for (const def of SERIES) {
    if (def.from && def.from.includes(sid)) {
      const [t1, t2] = resolveTeams(def.id);
      const cur = state.results[def.id];
      if (cur && cur !== t1 && cur !== t2) clearResultDownstream(def.id);
    }
  }
}

// ============================================================
// SHARED BRACKET RENDERING
// ============================================================
// mode: 'picks'   → current user's bets (interactive)
//       'results' → actual results (read-only, API data)
//       'view'    → another user's picks (read-only)
// pid: relevant participant ID for picks/view modes

function renderBracketLayout(mode, pid) {
  return `
    <div class="bracket-wrap">
      <div class="conf-label east-label">EASTERN CONFERENCE</div>
      <div class="conf-label west-label">WESTERN CONFERENCE</div>
      <div class="bracket">
        <div class="half east">
          ${bracketCol(['E1v8','E4v5','E2v7','E3v6'], 1, 'east', mode, pid)}
          ${bracketCol(['EQ1','EQ2'],                 2, 'east', mode, pid)}
          ${bracketCol(['ECF'],                        3, 'east', mode, pid)}
        </div>
        <div class="finals-col">
          <div class="round-label">NBA Finals</div>
          ${bracketCard('FINALS', mode, pid)}
          <div class="champion-slot">${renderChampion(mode, pid)}</div>
        </div>
        <div class="half west">
          ${bracketCol(['WCF'],                        3, 'west', mode, pid)}
          ${bracketCol(['WQ1','WQ2'],                 2, 'west', mode, pid)}
          ${bracketCol(['W1v8','W4v5','W2v7','W3v6'], 1, 'west', mode, pid)}
        </div>
      </div>
      <div class="round-labels-row">
        <div class="round-labels east-rounds">
          <span>First Round</span><span>Semifinals</span><span>Conf. Finals</span>
        </div>
        <div class="round-labels-spacer"></div>
        <div class="round-labels west-rounds">
          <span>Conf. Finals</span><span>Semifinals</span><span>First Round</span>
        </div>
      </div>
    </div>`;
}

function bracketCol(ids, round, side, mode, pid) {
  const label = round === 1 ? 'First Round' : round === 2 ? 'Semifinals' : 'Conf. Finals';
  return `
    <div class="bracket-col r${round} ${side}">
      <div class="round-label">${label}</div>
      <div class="col-series">
        ${ids.map(id => bracketCard(id, mode, pid)).join('')}
      </div>
    </div>`;
}

function renderChampion(mode, pid) {
  const key = mode === 'results' ? state.results['FINALS'] : getPick(pid, 'FINALS').winner;
  return key
    ? `<div class="champion-badge" style="--team-color:${TEAMS[key].color}">🏆 ${TEAMS[key].name}</div>`
    : `<div class="champion-tbd">${mode === 'results' ? '🏆 Champion TBD' : '🏆 Pick a champion'}</div>`;
}

function bracketCard(sid, mode, pid) {
  const [t1, t2] = resolveTeams(sid);
  if (!t1 || !t2) {
    return `<div class="matchup-card card-tbd">
      <div class="team-row tbd-row"><span class="team-name">TBD</span></div>
      <div class="series-divider"></div>
      <div class="team-row tbd-row"><span class="team-name">TBD</span></div>
    </div>`;
  }
  if (mode === 'results') return cardResults(sid, t1, t2);
  if (mode === 'picks')   return cardPicks(sid, t1, t2, pid);
  return cardView(sid, t1, t2, pid);
}

// ---- Results card (read-only, actual winner + record) ----
function cardResults(sid, t1, t2) {
  const winner = state.results[sid] || null;
  const rec    = getRecord(sid);
  const ag     = getActualGames(sid);

  function row(key) {
    const t    = TEAMS[key];
    const isW  = winner === key;
    const isL  = winner && !isW;
    const wins = rec ? (key === t1 ? rec.t1Wins : rec.t2Wins) : null;
    return `<div class="team-row ${isW ? 'is-winner' : ''} ${isL ? 'is-elim' : ''}">
      <span class="seed-num">${t.seed ?? ''}</span>
      <span class="team-name">${t.name}</span>
      ${wins !== null ? `<span class="series-wins ${isW ? 'wins-lead' : ''}">${wins}</span>` : ''}
      ${isW ? '<span class="win-mark">✓</span>' : ''}
    </div>`;
  }

  const footer = winner && ag
    ? `<div class="card-footer">${TEAMS[winner].abbr} wins in ${ag} games</div>`
    : '';

  return `<div class="matchup-card" data-series="${sid}">
    ${row(t1)}<div class="series-divider"></div>${row(t2)}${footer}
  </div>`;
}

// ---- Picks card (current user's bet, interactive) ----
function cardPicks(sid, t1, t2, pid) {
  const pick     = getPick(pid, sid);
  const editable = canPickSeries(pid, sid);
  const locked   = isSeriesLocked(sid);
  const dl       = !locked ? formatDeadline(sid) : null;
  const actual   = state.results[sid] || null;
  const ag       = getActualGames(sid);

  function row(key) {
    const t        = TEAMS[key];
    const isPicked = pick.winner === key;
    const isOk     = isPicked && actual && actual === key;
    const isBad    = isPicked && actual && actual !== key;
    const cls      = isPicked ? (isBad ? 'is-wrong-pick' : 'is-winner') : '';
    const mark     = isPicked ? (isOk ? '✓' : isBad ? '✗' : '') : '';
    return `<div class="team-row ${cls} ${editable ? 'is-clickable' : ''}"
                 data-ps="${sid}" data-pt="${key}">
      <span class="seed-num">${t.seed ?? ''}</span>
      <span class="team-name">${t.name}</span>
      ${mark ? `<span class="win-mark">${mark}</span>` : ''}
    </div>`;
  }

  const gamesRow = pick.winner ? `
    <div class="games-selector">
      <span class="games-label">Games:</span>
      ${[4, 5, 6, 7].map(n => {
        const sel = pick.games === n;
        const gcls = sel && ag ? (n === ag ? 'games-correct' : 'games-wrong') : '';
        return `<button class="games-btn ${sel ? 'selected' : ''} ${gcls}"
                        data-ps="${sid}" data-pg="${n}"
                        ${!editable ? 'disabled' : ''}>${n}</button>`;
      }).join('')}
    </div>` : '';

  const footer = locked
    ? `<div class="card-footer footer-locked">🔒 Locked</div>`
    : dl
      ? `<div class="card-footer footer-deadline">Locks ${dl}</div>`
      : '';

  return `<div class="matchup-card ${locked && !pick.winner ? 'card-inactive' : ''}"
               data-series="${sid}">
    ${row(t1)}<div class="series-divider"></div>${row(t2)}${gamesRow}${footer}
  </div>`;
}

// ---- View card (another user's picks, read-only) ----
function cardView(sid, t1, t2, pid) {
  const pick   = getPick(pid, sid);
  const actual = state.results[sid] || null;

  function row(key) {
    const t        = TEAMS[key];
    const isPicked = pick.winner === key;
    const isOk     = isPicked && actual && actual === key;
    const isBad    = isPicked && actual && actual !== key;
    const cls      = isPicked ? (isOk ? 'is-winner' : isBad ? 'is-wrong-pick' : 'is-winner') : '';
    return `<div class="team-row no-pointer ${cls}">
      <span class="seed-num">${t.seed ?? ''}</span>
      <span class="team-name">${t.name}</span>
      ${isPicked ? `<span class="win-mark">${isOk ? '✓' : isBad ? '✗' : '·'}</span>` : ''}
    </div>`;
  }

  const ag2    = getActualGames(sid);
  const gOk    = pick.games && ag2 && pick.games === ag2;
  const gBad   = pick.games && ag2 && pick.games !== ag2;
  const footer = pick.games
    ? `<div class="card-footer ${gOk ? 'footer-correct' : gBad ? 'footer-wrong' : ''}">
         ${pick.games} games${gOk ? ' ✓' : gBad ? ` ✗ (actual ${ag2})` : ''}
       </div>`
    : '';

  return `<div class="matchup-card" data-series="${sid}">
    ${row(t1)}<div class="series-divider"></div>${row(t2)}${footer}
  </div>`;
}

// ============================================================
// MY PICKS TAB  (bracket tab)
// ============================================================

function renderBracket() {
  const el = document.getElementById('tab-bracket');
  if (!currentUserId) return;
  el.innerHTML = `
    ${renderRoundControls(currentUserId)}
    ${renderBracketLayout('picks', currentUserId)}`;
}

function renderRoundControls(pid) {
  const rows = [1, 2, 3, 4].flatMap(r => {
    const avail = SERIES.filter(s => s.r === r && isSeriesAvailable(s.id));
    if (!avail.length) return [];

    const submitted  = !!state.picksSubmitted[pid]?.[r];
    const locked     = isRoundFullyLocked(r);
    const isEditing  = editingState.pid === pid && editingState.round === r;
    const picked     = avail.filter(s => getPick(pid, s.id).winner).length;
    const games      = avail.filter(s => getPick(pid, s.id).games).length;
    const allDone    = picked === avail.length && games === avail.length;

    let badge, action;
    if (locked) {
      badge  = `<span class="rc-badge rc-locked">🔒 Locked</span>`;
      action = '';
    } else if (submitted && !isEditing) {
      badge  = `<span class="rc-badge rc-saved">✓ Saved</span>`;
      action = `<button class="edit-round-btn btn-outline-sm" data-round="${r}">Edit</button>`;
    } else {
      const missing = [];
      if (picked < avail.length) missing.push(`${avail.length - picked} winner${avail.length - picked > 1 ? 's' : ''}`);
      if (games  < avail.length) missing.push(`${avail.length - games}  game count${avail.length - games > 1 ? 's' : ''}`);
      badge  = `<span class="rc-badge rc-open">Open</span>`;
      action = allDone
        ? `<button class="save-round-btn btn-primary" data-round="${r}">Save ${ROUND_NAMES[r]}</button>`
        : `<button class="save-round-btn btn-primary btn-disabled" disabled data-round="${r}" title="Still missing: ${missing.join(', ')}">
             Missing: ${missing.join(' · ')}
           </button>`;
    }

    return [`<div class="round-control-row">
      <span class="rc-name">${ROUND_NAMES[r]}</span>
      <div class="rc-right">${badge}${action}</div>
    </div>`];
  });

  if (!rows.length) return '';
  return `<div class="round-controls">${rows.join('')}</div>`;
}

// ============================================================
// MY PICKS — event delegation
// ============================================================

function handlePicksClick(e) {
  if (!currentUserId) return;

  // Team pick click
  const teamEl = e.target.closest('[data-ps][data-pt]');
  if (teamEl) {
    const sid = teamEl.dataset.ps;
    const tid = teamEl.dataset.pt;
    if (!canPickSeries(currentUserId, sid)) return;
    const cur = getPick(currentUserId, sid);
    setPick(currentUserId, sid, cur.winner === tid ? null : tid, cur.winner === tid ? null : cur.games);
    save(); renderBracket(); renderLeaderboard();
    return;
  }

  // Games button click
  const gamesEl = e.target.closest('[data-ps][data-pg]');
  if (gamesEl && !gamesEl.disabled) {
    const sid   = gamesEl.dataset.ps;
    const games = parseInt(gamesEl.dataset.pg);
    if (!canPickSeries(currentUserId, sid)) return;
    const cur = getPick(currentUserId, sid);
    if (!cur.winner) return;
    setPick(currentUserId, sid, cur.winner, cur.games === games ? null : games);
    save(); renderBracket(); renderLeaderboard();
    return;
  }

  // Save round
  const saveBtn = e.target.closest('.save-round-btn[data-round]');
  if (saveBtn && !saveBtn.disabled) {
    const r     = parseInt(saveBtn.dataset.round);
    const avail = SERIES.filter(s => s.r === r && isSeriesAvailable(s.id));
    const allDone = avail.every(s => getPick(currentUserId, s.id).winner && getPick(currentUserId, s.id).games);
    if (!allDone) return; // guarded by disabled attr, but double-check
    if (!state.picksSubmitted[currentUserId]) state.picksSubmitted[currentUserId] = {};
    state.picksSubmitted[currentUserId][r] = true;
    editingState = { pid: null, round: null };
    save();
    syncPicksToGitHub();
    renderBracket(); renderLeaderboard();
    return;
  }

  // Edit round
  const editBtn = e.target.closest('.edit-round-btn[data-round]');
  if (editBtn) {
    editingState = { pid: currentUserId, round: parseInt(editBtn.dataset.round) };
    renderBracket();
  }
}

// ============================================================
// ALL PICKS TAB  (view mode — read-only bracket)
// ============================================================
let viewingPid = null;

function renderPicksTab() {
  const el = document.getElementById('tab-picks');

  if (!state.participants.length) {
    el.innerHTML = `<div class="empty-state">No participants yet.</div>`;
    return;
  }

  if (!viewingPid || !state.participants.find(p => p.id === viewingPid)) {
    viewingPid = currentUserId || state.participants[0].id;
  }

  const { score, correct } = computeScore(viewingPid);

  el.innerHTML = `
    <div class="allpicks-header">
      <div class="allpicks-left">
        <label>Viewing picks for:</label>
        <select id="view-select">
          ${state.participants.map(p =>
            `<option value="${p.id}" ${p.id === viewingPid ? 'selected' : ''}>${p.name}</option>`
          ).join('')}
        </select>
      </div>
      <div class="allpicks-right">
        <span class="allpicks-score">${correct} correct · ${score} pts</span>
      </div>
    </div>
    ${renderBracketLayout('view', viewingPid)}`;

  el.querySelector('#view-select').addEventListener('change', e => {
    viewingPid = e.target.value;
    renderPicksTab();
  });
}

// ============================================================
// RESULTS TAB  (read-only bracket + commissioner play-in setup)
// ============================================================

function renderResults() {
  const el = document.getElementById('tab-participants');

  el.innerHTML = `
    <div class="bracket-instructions">
      Actual results — updated automatically from the NBA API every hour.
      ${scoresData
        ? `<span class="scores-updated">Last sync: ${scoresData.updated.replace('T', ' ').replace('Z', ' UTC')}</span>`
        : ''}
    </div>
    ${renderBracketLayout('results', null)}`;
}

// ============================================================
// LEADERBOARD TAB
// ============================================================

function renderLeaderboard() {
  const el = document.getElementById('tab-leaderboard');

  if (!state.participants.length) {
    el.innerHTML = `<div class="empty-state">No participants yet. Log in to join!</div>`;
    return;
  }

  const rows = state.participants
    .map(p => ({ ...p, ...computeScore(p.id) }))
    .sort((a, b) => b.score - a.score || b.correct - a.correct);

  el.innerHTML = `
    <div class="leaderboard-wrap">
      <h2>Leaderboard</h2>
      <div class="scoring-legend">
        ${[1, 2, 3, 4].map(r =>
          `<span>${ROUND_NAMES[r]}: <strong>${ROUND_POINTS[r]}pt</strong></span>`
        ).join(' · ')}
        <span>Correct games: <strong>+${GAMES_BONUS}pt</strong></span>
      </div>
      <table class="leaderboard-table">
        <thead>
          <tr><th>#</th><th>Name</th><th>R1</th><th>R2</th><th>CF</th><th>Finals</th><th>Total</th></tr>
        </thead>
        <tbody>
          ${rows.map((p, i) => {
            const rs = [0, 0, 0, 0];
            for (const def of SERIES) {
              const actual = state.results[def.id];
              const pick   = getPick(p.id, def.id);
              if (actual && pick.winner && actual === pick.winner) {
                let pts = ROUND_POINTS[def.r];
                const ag = getActualGames(def.id);
                if (ag && pick.games === ag) pts += GAMES_BONUS;
                rs[def.r - 1] += pts;
              }
            }
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
            const isMe  = p.id === currentUserId;
            return `<tr class="${i === 0 && p.score > 0 ? 'leader-row' : ''} ${isMe ? 'my-row' : ''}">
              <td>${medal || (i + 1)}</td>
              <td class="p-name-cell">${p.name}${isMe ? ' <span class="you-badge">you</span>' : ''}</td>
              ${rs.map(s => `<td>${s > 0 ? s : '–'}</td>`).join('')}
              <td class="total-cell">${p.score}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      ${renderPickBreakdown(rows)}
    </div>`;
}

function renderPickBreakdown(rows) {
  let html = '<div class="pick-breakdown"><h3>Pick Details</h3>';
  for (const r of [1, 2, 3, 4]) {
    const series = SERIES.filter(s => s.r === r && isSeriesAvailable(s.id));
    if (!series.length) continue;
    html += `<div class="breakdown-round"><h4>${ROUND_NAMES[r]}</h4><div class="breakdown-grid">`;
    for (const def of series) {
      const actual = state.results[def.id];
      const [t1, t2] = resolveTeams(def.id);
      const ag = getActualGames(def.id);
      html += `<div class="breakdown-series">
        <div class="series-title">${t1 ? TEAMS[t1].abbr : '?'} vs ${t2 ? TEAMS[t2].abbr : '?'}</div>
        <div class="actual-result">${actual
          ? `<strong style="color:${TEAMS[actual].color}">${TEAMS[actual].abbr}</strong>${ag ? ` in ${ag}` : ''}`
          : 'Pending'}</div>
        <div class="picks-list">
          ${rows.map(p => {
            const pick = getPick(p.id, def.id);
            const ok   = actual && pick.winner && actual === pick.winner;
            const bad  = actual && pick.winner && actual !== pick.winner;
            const gok  = ok && ag && pick.games && ag === pick.games;
            return `<span class="pick-chip ${ok ? 'pick-correct' : bad ? 'pick-wrong' : 'pick-pending'}" title="${p.name}">
              ${p.name.split(' ')[0]}: ${pick.winner ? TEAMS[pick.winner]?.abbr : '?'}${pick.games ? ` in ${pick.games}${gok ? '✓' : ''}` : ''}
            </span>`;
          }).join('')}
        </div>
      </div>`;
    }
    html += '</div></div>';
  }
  return html + '</div>';
}

// ============================================================
// TAB NAVIGATION
// ============================================================

const RENDERERS = {
  bracket:      renderBracket,
  picks:        renderPicksTab,
  participants: renderResults,
  leaderboard:  renderLeaderboard,
};

let activeTab = 'bracket';

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(el =>
    el.classList.toggle('active', el.id === `tab-${tab}`));
  RENDERERS[tab]();
  // Refresh shared picks when switching to All Picks or Leaderboard
  if (tab === 'picks' || tab === 'leaderboard') {
    fetchPicks().then(() => { save(); RENDERERS[tab](); });
  }
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  // Login
  document.getElementById('login-btn').addEventListener('click', attemptLogin);
  ['login-name', 'login-pass'].forEach(id =>
    document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') attemptLogin(); }));

  // Picks interactions (event delegation on the bracket tab)
  document.getElementById('tab-bracket').addEventListener('click', handlePicksClick);

  // Load shared picks from repo before showing login so that returning
  // users on a new device are recognised by name.
  const loginBtn = document.getElementById('login-btn');
  const loginMsg = document.getElementById('login-msg');
  loginBtn.disabled = true;
  loginMsg.textContent = 'Loading…';
  loginMsg.className = 'login-msg';
  await fetchPicks();
  loginBtn.disabled = false;
  loginMsg.textContent = '';

  initLogin();
  fetchScores();
});
