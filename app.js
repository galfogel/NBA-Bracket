// ============================================================
// TEAMS
// ============================================================
const ESPN = s => `https://a.espncdn.com/i/teamlogos/nba/500/${s}.png`;
const TEAMS = {
  E1:  { name: 'Detroit Pistons',           abbr: 'DET', seed: 1, conf: 'East', color: '#C8102E', logo: ESPN('det') },
  E2:  { name: 'Boston Celtics',            abbr: 'BOS', seed: 2, conf: 'East', color: '#007A33', logo: ESPN('bos') },
  E3:  { name: 'New York Knicks',           abbr: 'NYK', seed: 3, conf: 'East', color: '#006BB6', logo: ESPN('nyk') },
  E4:  { name: 'Cleveland Cavaliers',       abbr: 'CLE', seed: 4, conf: 'East', color: '#6F263D', logo: ESPN('cle') },
  E5:  { name: 'Toronto Raptors',           abbr: 'TOR', seed: 5, conf: 'East', color: '#CE1141', logo: ESPN('tor') },
  E6:  { name: 'Atlanta Hawks',             abbr: 'ATL', seed: 6, conf: 'East', color: '#E03A3E', logo: ESPN('atl') },
  E7:  { name: 'Philadelphia 76ers',        abbr: 'PHI', seed: 7, conf: 'East', color: '#006BB6', logo: ESPN('phi') },
  E8:  { name: 'Orlando Magic',             abbr: 'ORL', seed: 8, conf: 'East', color: '#0077C0', logo: ESPN('orl') },
  W1:  { name: 'Oklahoma City Thunder',     abbr: 'OKC', seed: 1, conf: 'West', color: '#007AC1', logo: ESPN('okc') },
  W2:  { name: 'San Antonio Spurs',         abbr: 'SAS', seed: 2, conf: 'West', color: '#1d1160', logo: ESPN('sa')  },
  W3:  { name: 'Denver Nuggets',            abbr: 'DEN', seed: 3, conf: 'West', color: '#0E2240', logo: ESPN('den') },
  W4:  { name: 'Los Angeles Lakers',        abbr: 'LAL', seed: 4, conf: 'West', color: '#552583', logo: ESPN('lal') },
  W5:  { name: 'Houston Rockets',           abbr: 'HOU', seed: 5, conf: 'West', color: '#CE1141', logo: ESPN('hou') },
  W6:  { name: 'Minnesota Timberwolves',    abbr: 'MIN', seed: 6, conf: 'West', color: '#236192', logo: ESPN('min') },
  W7:  { name: 'Portland Trail Blazers',    abbr: 'POR', seed: 7, conf: 'West', color: '#E03A3E', logo: ESPN('por') },
  W8:  { name: 'Phoenix Suns',              abbr: 'PHX', seed: 8, conf: 'West', color: '#E56020', logo: ESPN('phx') },
};

// ============================================================
// BRACKET STRUCTURE
// ============================================================
const SERIES = [
  { id: 'E1v8', r: 1, conf: 'East', t1: 'E1', t2: 'E8' },
  { id: 'E4v5', r: 1, conf: 'East', t1: 'E4', t2: 'E5' },
  { id: 'E2v7', r: 1, conf: 'East', t1: 'E2', t2: 'E7' },
  { id: 'E3v6', r: 1, conf: 'East', t1: 'E3', t2: 'E6' },
  { id: 'W1v8', r: 1, conf: 'West', t1: 'W1', t2: 'W8' },
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
const ROUND_POINTS = [0, 10, 20, 40, 80];
const GAMES_BONUS  = 10; // bonus point for predicting correct game count

// Fan pick % from picks.nba.com (t1 = higher seed)
const WIN_PCT = {
  E1v8: { t1: 92, t2: 8  },
  E4v5: { t1: 86, t2: 14 },
  E2v7: { t1: 98, t2: 2  },
  E3v6: { t1: 89, t2: 11 },
  W1v8: { t1: 97, t2: 3  },
  W4v5: { t1: 35, t2: 65 },
  W2v7: { t1: 98, t2: 2  },
  W3v6: { t1: 82, t2: 18 },
};

function getWinPct(sid, teamKey) {
  const pct = WIN_PCT[sid];
  if (!pct) return null;
  const def = SERIES_MAP[sid];
  const t1key = def.t1 || state.results[def.from?.[0]];
  return teamKey === t1key ? pct.t1 : pct.t2;
}

function getUpsetBonus(sid, pickedKey, roundPts) {
  const pct = WIN_PCT[sid];
  if (!pct) return 0;
  const def = SERIES_MAP[sid];
  const t1key = def.t1 || state.results[def.from?.[0]];
  const pickedPct = pickedKey === t1key ? pct.t1 : pct.t2;
  const favPct = Math.max(pct.t1, pct.t2);
  if (pickedPct >= favPct) return 0;
  const favFloored = Math.floor(favPct / 10) * 10;
  const gap = favFloored <= 50 ? 5 : favFloored - 50;
  return 2 * roundPts * gap / 100;
}

// Default first-game UTC timestamps per series. Series lock at tip-off.
const DEFAULT_GAME_TIMES = {
  // EDT = UTC-4. Sources: NBA.com / CBS Sports official first-round schedule.
  E4v5: '2026-04-18T17:00:00Z',  // CLE vs TOR  – Apr 18, 1:00 PM ET
  W3v6: '2026-04-18T19:30:00Z',  // DEN vs MIN  – Apr 18, 3:30 PM ET
  E3v6: '2026-04-18T22:00:00Z',  // NYK vs ATL  – Apr 18, 6:00 PM ET
  W4v5: '2026-04-19T00:30:00Z',  // LAL vs HOU  – Apr 18, 8:30 PM ET
  E2v7: '2026-04-19T17:00:00Z',  // BOS vs PHI  – Apr 19, 1:00 PM ET
  W1v8: '2026-04-19T19:30:00Z',  // OKC vs W8   – Apr 19, 3:30 PM ET
  E1v8: '2026-04-19T22:30:00Z',  // DET vs E8   – Apr 19, 6:30 PM ET
  W2v7: '2026-04-20T01:00:00Z',  // SAS vs POR  – Apr 19, 9:00 PM ET
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
      s.picksSubmitted      = s.picksSubmitted      || {};
      s.finalsGap           = s.finalsGap           || {};
      s.finalsGame1ActualGap = s.finalsGame1ActualGap ?? null;
      return s;
    }
  } catch (_) {}
  return { results: {}, participants: [], picks: {}, picksSubmitted: {}, finalsGap: {}, finalsGame1ActualGap: null };
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ── Shared picks database (Firebase Firestore) ────────────────
const FIRESTORE_API_KEY = 'AIzaSyDIzbGO0lnNwKYYRuEd0ap4f7yX_uFtXus';
const FIRESTORE_PROJECT = 'nba-bracket-f91f1';
firebase.initializeApp({ apiKey: FIRESTORE_API_KEY, projectId: FIRESTORE_PROJECT });
const db = firebase.firestore();

// Reverse lookup: team name → TEAMS key (e.g. "Oklahoma City Thunder" → "W1")
const TEAM_KEY_BY_NAME = Object.fromEntries(Object.entries(TEAMS).map(([k, t]) => [t.name, k]));

// Convert picks stored in Firestore (team names) back to internal keys
function picksToKeys(picks) {
  const out = {};
  for (const [pid, pPicks] of Object.entries(picks || {})) {
    out[pid] = {};
    for (const [sid, pick] of Object.entries(pPicks || {})) {
      if (!pick) continue;
      const winner = pick.winner ? (TEAM_KEY_BY_NAME[pick.winner] || pick.winner) : null;
      out[pid][sid] = { winner, games: pick.games ?? null };
    }
  }
  return out;
}

// Convert internal keys to team names for Firestore storage
function picksToNames(picks) {
  const out = {};
  for (const [pid, pPicks] of Object.entries(picks || {})) {
    out[pid] = {};
    for (const [sid, pick] of Object.entries(pPicks || {})) {
      if (!pick) continue;
      const winner = pick.winner ? (TEAMS[pick.winner]?.name || pick.winner) : null;
      const round  = SERIES_MAP[sid]?.r ?? null;
      out[pid][sid] = { winner, games: pick.games ?? null, round };
    }
  }
  return out;
}

async function hashPassword(pass) {
  if (!pass) return null;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pass));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Commissioner / admin — identified by case-insensitive name match
const ADMIN_NAME = 'Fogel';
function isAdmin(pid = currentUserId) {
  const p = state.participants.find(p => p.id === pid);
  return p?.name.toLowerCase() === ADMIN_NAME.toLowerCase();
}

// Prune participants, picks, picksSubmitted, and finalsGap down to allowedIds
function pruneStaleUserData(allowedIds) {
  state.participants = state.participants.filter(p => allowedIds.has(p.id));
  for (const pid of Object.keys(state.picks))          if (!allowedIds.has(pid)) delete state.picks[pid];
  for (const pid of Object.keys(state.picksSubmitted)) if (!allowedIds.has(pid)) delete state.picksSubmitted[pid];
  for (const pid of Object.keys(state.finalsGap))      if (!allowedIds.has(pid)) delete state.finalsGap[pid];
}

// ── Sync error banner ─────────────────────────────────────────
function showSyncError(action, err) {
  const el = document.getElementById('sync-error');
  if (!el) return;
  const detail = err?.message || String(err);
  el.querySelector('.sync-toast-msg').textContent =
    `Couldn't ${action} — your picks may not be saved. ` +
    `Check your connection; if you're on a network that blocks Google services (e.g. China/Iran), try a VPN. ` +
    `(${detail})`;
  el.classList.remove('hidden');
}
function clearSyncError() {
  document.getElementById('sync-error')?.classList.add('hidden');
}

// ── Read picks from Firestore ──────────────────────────────────
async function fetchPicks() {
  try {
    const snap = await db.collection('brackets').doc('nba-2026').get();
    if (!snap.exists) { clearSyncError(); return; }
    const data = snap.data();
    data.picks = picksToKeys(data.picks);
    mergeRemoteState(data);
    // If logged-in user was removed from Firestore, log them out immediately.
    // A pending signup won't be in remote yet, so skip the check for them.
    if (currentUserId && currentUserId !== pendingSignupId) {
      const remoteIds = new Set((data.participants || []).map(p => p.id));
      if (!remoteIds.has(currentUserId)) { switchUser(); return; }
    }
    save();
    clearSyncError();
  } catch (err) {
    console.warn('fetchPicks error:', err);
    showSyncError('load picks from the server', err);
  }
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
    // Merge finalsGap: remote wins for other users, local wins for current user
    if (rp.id !== currentUserId && remote.finalsGap?.[rp.id] != null) {
      state.finalsGap[rp.id] = remote.finalsGap[rp.id];
    }
  }
  // Commissioner-set actual gap: remote always wins
  if (remote.finalsGame1ActualGap != null) state.finalsGame1ActualGap = remote.finalsGame1ActualGap;

  // Prune local participants (and their picks) not in remote, so a removed user's
  // stale credentials can't be used to sign back in. Exempt a pending signup.
  const remoteIds = new Set(rParticipants.map(p => p.id));
  const keepIds   = new Set(remoteIds);
  if (pendingSignupId) keepIds.add(pendingSignupId);
  pruneStaleUserData(keepIds);

  // Clear the pending-signup flag once a fetch confirms the user has been written.
  if (pendingSignupId && remoteIds.has(pendingSignupId)) pendingSignupId = null;
}

// ── Write picks to Firestore ───────────────────────────────────
async function syncPicksToGitHub() {
  try {
    const ref = db.collection('brackets').doc('nba-2026');
    // Fetch latest to avoid overwriting other users' concurrent picks
    const snap = await ref.get();
    if (snap.exists) {
      const remote = snap.data();
      const remoteIds = new Set((remote.participants || []).map(p => p.id));

      // If current user was removed from Firestore, log them out — don't write.
      // A pending signup won't be in remote yet, so exempt them.
      if (currentUserId && currentUserId !== pendingSignupId && !remoteIds.has(currentUserId)) {
        switchUser();
        return;
      }

      // Merge other users in from remote; skip current user — local is authoritative
      for (const rp of (remote.participants || [])) {
        if (rp.id === currentUserId) continue;
        if (!state.participants.find(p => p.id === rp.id)) {
          state.participants.push({ id: rp.id, name: rp.name, passwordHash: rp.passwordHash || null });
        }
        if (remote.picks?.[rp.id])          state.picks[rp.id]          = picksToKeys({ x: remote.picks[rp.id] }).x;
        if (remote.picksSubmitted?.[rp.id]) state.picksSubmitted[rp.id] = remote.picksSubmitted[rp.id];
        if (remote.finalsGap?.[rp.id] != null) state.finalsGap[rp.id]  = remote.finalsGap[rp.id];
      }
      if (remote.finalsGame1ActualGap != null) state.finalsGame1ActualGap = remote.finalsGame1ActualGap;

      // Prune local participants (and their picks/submitted/gap) to only those in Firestore
      // (plus the pending signup, if any) so removed users' stale data isn't re-written.
      const allowedIds = pendingSignupId ? new Set([...remoteIds, pendingSignupId]) : remoteIds;
      pruneStaleUserData(allowedIds);
    }
    await ref.set({
      updated:              new Date().toISOString(),
      participants:         state.participants.map(({ id, name, passwordHash }) => ({ id, name, passwordHash: passwordHash || null })),
      picks:                picksToNames(state.picks),
      picksSubmitted:       state.picksSubmitted,
      finalsGap:            state.finalsGap,
      finalsGame1ActualGap: state.finalsGame1ActualGap ?? null,
    });
    // Signup confirmed — from this point on, the removed-user check applies to this id.
    if (pendingSignupId && pendingSignupId === currentUserId) pendingSignupId = null;
    save();
    clearSyncError();

  } catch (err) {
    console.error('syncPicksToGitHub error:', err);
    showSyncError('save your picks to the server', err);
  }
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
// PLATFORM GATE
// ============================================================
const PLATFORM_PASSWORD    = 'nba2026';
const PLATFORM_SESSION_KEY = 'nba-gate-2026-v2';

function initGate() {
  if (sessionStorage.getItem(PLATFORM_SESSION_KEY) === '1') {
    document.getElementById('gate-overlay').classList.add('hidden');
    return true;
  }
  document.getElementById('gate-overlay').classList.remove('hidden');
  setTimeout(() => document.getElementById('gate-pass').focus(), 60);
  return false;
}

function attemptGate() {
  const input = document.getElementById('gate-pass');
  const msg   = document.getElementById('gate-msg');
  if (input.value === PLATFORM_PASSWORD) {
    sessionStorage.setItem(PLATFORM_SESSION_KEY, '1');
    document.getElementById('gate-overlay').classList.add('hidden');
    beginApp();
  } else {
    msg.textContent = 'Incorrect access code.';
    msg.className = 'login-msg msg-error';
    input.value = '';
    input.focus();
  }
}

// ============================================================
// LOGIN
// ============================================================
let currentUserId = null;
// Set during signup (and cleared after the first successful sync) so fetch/sync
// logic can distinguish a brand-new user (not in Firestore yet) from a removed one.
let pendingSignupId = null;

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

let loginMode = 'signin'; // 'signin' | 'signup'

function setLoginMode(mode) {
  loginMode = mode;
  document.querySelectorAll('.login-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.mode === mode));
  document.getElementById('login-btn').textContent = mode === 'signin' ? 'Sign In' : 'Sign Up';
  document.getElementById('login-msg').textContent = '';
}

function showLoginOverlay(canGoBack = false) {
  const overlay = document.getElementById('login-overlay');
  overlay.classList.remove('hidden');
  setLoginMode('signin');

  let backBtn = overlay.querySelector('.login-back-btn');
  if (canGoBack) {
    if (!backBtn) {
      backBtn = document.createElement('button');
      backBtn.className = 'login-back-btn';
      backBtn.textContent = '← Back';
      backBtn.addEventListener('click', () => {
        overlay.classList.add('hidden');
        currentUserId = localStorage.getItem(USER_KEY);
        startApp();
      });
      overlay.querySelector('.login-box').appendChild(backBtn);
    }
    backBtn.style.display = '';
  } else if (backBtn) {
    backBtn.style.display = 'none';
  }
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
    msg.textContent = 'Please enter your username.';
    msg.className = 'login-msg msg-error';
    return;
  }
  if (!pass) {
    msg.textContent = 'Password is required.';
    msg.className = 'login-msg msg-error';
    passInput.focus();
    return;
  }

  const hash     = await hashPassword(pass);
  const existing = state.participants.find(p => p.name.toLowerCase() === name.toLowerCase());

  if (loginMode === 'signin') {
    if (!existing) {
      msg.textContent = 'Username not found. Sign up to create an account.';
      msg.className = 'login-msg msg-error';
      return;
    }
    if (existing.passwordHash !== hash) {
      msg.textContent = 'Incorrect password.';
      msg.className = 'login-msg msg-error';
      passInput.focus();
      return;
    }
    msg.textContent = `Welcome back, ${existing.name}!`;
    msg.className = 'login-msg msg-welcome';
    currentUserId = existing.id;
  } else {
    // signup
    if (existing) {
      msg.textContent = 'Username already taken. Sign in instead.';
      msg.className = 'login-msg msg-error';
      return;
    }
    const id = 'p_' + Date.now();
    state.participants.push({ id, name, passwordHash: hash });
    state.picks[id] = {};
    currentUserId   = id;
    pendingSignupId = id;
    save();
    syncPicksToGitHub();
    msg.textContent = `Welcome, ${name}! Account created.`;
    msg.className = 'login-msg msg-welcome';
  }

  localStorage.setItem(USER_KEY, currentUserId);
  activeTab = 'bracket';
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
  const prevUserId = currentUserId;
  currentUserId   = null;
  pendingSignupId = null;
  editingState    = { pid: null, round: null };
  document.getElementById('login-name').value = '';
  document.getElementById('login-pass').value = '';
  document.getElementById('login-msg').textContent = '';
  showLoginOverlay(!!prevUserId);
}

function startApp() {
  updateUserDisplay();
  switchTab(activeTab);
}

function updateUserDisplay() {
  const el = document.getElementById('user-display');
  if (!el || !currentUserId) return;
  const p = state.participants.find(p => p.id === currentUserId);
  if (!p) return;
  el.innerHTML = `<span class="user-greeting">👤 ${p.name}</span>
    <button class="btn-switch-user" id="switch-btn">Log out</button>`;
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

// Series locks at its first game time (R1), or immediately once games appear in records (R2+)
function isSeriesLocked(sid) {
  const gt = getGameTime(sid);
  if (gt && Date.now() >= new Date(gt).getTime()) return true;
  const defaultGt = DEFAULT_GAME_TIMES[sid];
  if (defaultGt && Date.now() >= new Date(defaultGt).getTime()) return true;
  if (state.results[sid]) return true;
  if (scoresData?.records) {
    const [t1, t2] = resolveTeams(sid);
    if (t1 && t2) {
      const a1 = TEAMS[t1]?.abbr, a2 = TEAMS[t2]?.abbr;
      if (a1 && a2 && scoresData.records[[a1, a2].sort().join('-')]) return true;
    }
  }
  return false;
}

function formatCountdown(lockTs, gameTs) {
  if (Date.now() >= lockTs) return '🔒 Locked';
  const diff = (gameTs ?? lockTs) - Date.now();
  const totalMins = Math.floor(diff / 60000);
  const days  = Math.floor(totalMins / 1440);
  const hours = Math.floor((totalMins % 1440) / 60);
  const mins  = totalMins % 60;
  if (days > 0)  return `Locks in ${days}d ${hours}h`;
  if (hours > 0) return `Locks in ${hours}h ${mins}m`;
  return `Locks in ${mins}m`;
}

let _countdownTimer = null;
function startCountdownTimer() {
  if (_countdownTimer) return;
  _countdownTimer = setInterval(() => {
    const els = document.querySelectorAll('[data-lock-ts]');
    if (!els.length) return;
    let needsRerender = false;
    els.forEach(el => {
      const lockTs = parseInt(el.dataset.lockTs);
      if (Date.now() >= lockTs) { needsRerender = true; return; }
      const gameTs = el.dataset.gameTs ? parseInt(el.dataset.gameTs) : null;
      if (el.classList.contains('footer-countdown')) el.textContent = formatCountdown(lockTs, gameTs);
    });
    if (needsRerender) {
      renderBracket();
      if (activeTab !== 'bracket' && RENDERERS[activeTab]) RENDERERS[activeTab]();
    }
  }, 30000);
}

function formatDeadline(sid) {
  const gt = getGameTime(sid);
  if (!gt) return null;
  return new Date(gt).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
    timeZone: 'Asia/Jerusalem', timeZoneName: 'short',
  });
}

// A series is available to pick when both teams are known
function isSeriesAvailable(sid) {
  const def = SERIES_MAP[sid];
  if (def.t1) return !!def.t2;
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
  if (!state.results[sid]) return null;
  const rec = getRecord(sid);
  if (!rec) return null;
  return rec.t1Wins + rec.t2Wins;
}

async function fetchScores() {
  try {
    const resp = await fetch('data/scores.json?_=' + Date.now());
    if (!resp.ok) return;
    const next = await resp.json();
    if (scoresData && next.updated === scoresData.updated) return; // no-op refresh
    scoresData = next;
    // Auto-populate Finals Game 1 gap from scores pipeline
    if (scoresData.finalsGame1Gap != null && scoresData.finalsGame1Gap !== state.finalsGame1ActualGap) {
      state.finalsGame1ActualGap = scoresData.finalsGame1Gap;
      save();
    }
    syncResultsFromAPI();
    if (RENDERERS[activeTab]) RENDERERS[activeTab]();
  } catch (_) {}
}

// Auto-advance bracket when API shows a team with 4 wins
function syncResultsFromAPI() {
  if (!scoresData) return;
  let changed = false;

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
  if (def.t1) return [def.t1, def.t2 || null];
  return [state.results[def.from[0]] || null, state.results[def.from[1]] || null];
}

// Points earned for a single pick (0 if incorrect, missing, or pending)
function seriesPoints(pid, sid) {
  const actual = state.results[sid];
  const pick   = getPick(pid, sid);
  if (!actual || !pick.winner || actual !== pick.winner) return 0;
  const r = SERIES_MAP[sid].r;
  let pts = ROUND_POINTS[r];
  const ag = getActualGames(sid);
  if (ag && pick.games === ag) pts += GAMES_BONUS;
  pts += getUpsetBonus(sid, pick.winner, ROUND_POINTS[r]);
  return pts;
}

function computeScore(pid) {
  let score = 0, correct = 0, possible = 0;
  for (const def of SERIES) {
    if (getPick(pid, def.id).winner) possible++;
    const pts = seriesPoints(pid, def.id);
    if (pts > 0) { score += pts; correct++; }
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
    </div>
    ${renderBracketList(mode, pid)}`;
}

function renderBracketList(mode, pid) {
  const conf = (name, r1ids, r2ids, r3id) => `
    <div class="blist-conf">
      <div class="blist-conf-header">${name}</div>
      <div class="blist-round">
        <div class="blist-round-title">First Round</div>
        <div class="blist-cards">${r1ids.map(id => bracketCard(id, mode, pid)).join('')}</div>
      </div>
      <div class="blist-round">
        <div class="blist-round-title">Semifinals</div>
        <div class="blist-cards">${r2ids.map(id => bracketCard(id, mode, pid)).join('')}</div>
      </div>
      <div class="blist-round">
        <div class="blist-round-title">Conference Finals</div>
        <div class="blist-cards">${bracketCard(r3id, mode, pid)}</div>
      </div>
    </div>`;

  return `
    <div class="bracket-list">
      ${conf('Eastern Conference', ['E1v8','E4v5','E2v7','E3v6'], ['EQ1','EQ2'], 'ECF')}
      ${conf('Western Conference', ['W1v8','W4v5','W2v7','W3v6'], ['WQ1','WQ2'], 'WCF')}
      <div class="blist-conf">
        <div class="blist-conf-header">NBA Finals</div>
        <div class="blist-cards">${bracketCard('FINALS', mode, pid)}</div>
        <div class="blist-champion">${renderChampion(mode, pid)}</div>
      </div>
    </div>`;
}

function bracketCol(ids, round, side, mode, pid) {
  const label = round === 1 ? 'First Round' : round === 2 ? 'Semifinals' : 'Conf. Finals';
  return `
    <div class="bracket-col r${round} ${side}">
      <div class="round-label">${label}</div>
      <div class="col-series">
        ${ids.map(id => `<div class="series-slot">${bracketCard(id, mode, pid)}</div>`).join('')}
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

  // At least one team known — show partial card (non-interactive)
  if (!t1 || !t2) {
    function teamRow(key) {
      if (!key) return `<div class="team-row tbd-row"><span class="team-name">TBD</span></div>`;
      const t = TEAMS[key];
      const pct = getWinPct(sid, key);
      return `<div class="team-row tbd-row">
        <span class="seed-num">${t.seed ?? ''}</span>
        <img class="team-logo" src="${t.logo}" alt="${t.abbr}" />
        <span class="team-name">${t.name}</span>
        ${pct !== null ? `<span class="fan-pct">${pct}%</span>` : ''}
      </div>`;
    }
    const gt = getGameTime(sid);
    const lockTs = gt ? new Date(gt).getTime() : null;
    const locked = lockTs && Date.now() >= lockTs;
    const footer = mode === 'picks'
      ? (locked
          ? `<div class="card-footer footer-locked">🔒 Locked</div>`
          : lockTs
            ? `<div class="card-footer footer-countdown" data-lock-ts="${lockTs}">${formatCountdown(lockTs)}</div>`
            : '')
      : '';
    return `<div class="matchup-card card-tbd">
      ${teamRow(t1)}<div class="series-divider"></div>${teamRow(t2)}${footer}
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
    const pct = getWinPct(sid, key);
    return `<div class="team-row ${isW ? 'is-winner' : ''} ${isL ? 'is-elim' : ''}">
      <span class="seed-num">${t.seed ?? ''}</span>
      <img class="team-logo" src="${t.logo}" alt="${t.abbr}" />
      <span class="team-name">${t.name}</span>
      ${pct !== null ? `<span class="fan-pct">${pct}%</span>` : ''}
      ${wins !== null ? `<span class="series-wins ${isW ? 'wins-lead' : ''}">${wins}</span>` : ''}
      ${isW ? '<span class="win-mark">✓</span>' : ''}
    </div>`;
  }

  let footer = '';
  if (winner && ag) {
    footer = `<div class="card-footer footer-winner">${TEAMS[winner].abbr} wins in ${ag} games</div>`;
  } else if (rec || (!winner && isSeriesAvailable(sid))) {
    const t1w = rec?.t1Wins ?? 0, t2w = rec?.t2Wins ?? 0;
    const total = t1w + t2w;
    if (total === 0) {
      footer = `<div class="card-footer footer-record">Tied 0–0</div>`;
    } else {
      const leader = t1w > t2w ? TEAMS[t1] : t2w > t1w ? TEAMS[t2] : null;
      const status = leader
        ? `<span style="color:${leader.color}">${leader.abbr} leads</span> ${Math.max(t1w,t2w)}–${Math.min(t1w,t2w)}`
        : `Tied ${t1w}–${t2w}`;
      footer = `<div class="card-footer footer-record">${status}</div>`;
    }
  }

  return `<div class="matchup-card" data-series="${sid}">
    ${row(t1)}<div class="series-divider"></div>${row(t2)}${footer}
  </div>`;
}

// ---- Picks card (current user's bet, interactive) ----
function cardPicks(sid, t1, t2, pid) {
  const pick     = getPick(pid, sid);
  const editable = canPickSeries(pid, sid);
  const locked   = isSeriesLocked(sid);
  const actual   = state.results[sid] || null;
  const ag       = getActualGames(sid);

  function row(key) {
    const t        = TEAMS[key];
    const isPicked = pick.winner === key;
    const isOk     = isPicked && actual && actual === key;
    const isBad    = isPicked && actual && actual !== key;
    const cls      = isPicked ? (isBad ? 'is-wrong-pick' : 'is-winner') : '';
    const mark     = isPicked ? (isOk ? '✓' : isBad ? '✗' : '') : '';
    const pct      = getWinPct(sid, key);
    const basePts  = ROUND_POINTS[SERIES_MAP[sid].r];
    const bonus    = getUpsetBonus(sid, key, basePts);
    const push     = pct === null ? 'pot-pts-push' : '';
    const ptsBadge = bonus > 0
      ? `<span class="pot-pts ${push}"><span class="pot-base">${basePts}</span><span class="pot-bonus"> +${bonus}</span></span>`
      : `<span class="pot-pts ${push}"><span class="pot-base">${basePts}</span></span>`;
    return `<div class="team-row ${cls} ${editable ? 'is-clickable' : ''}"
                 data-ps="${sid}" data-pt="${key}">
      <span class="seed-num">${t.seed ?? ''}</span>
      <img class="team-logo" src="${t.logo}" alt="${t.abbr}" />
      <span class="team-name">${t.name}</span>
      ${pct !== null ? `<span class="fan-pct">${pct}%</span>` : ''}
      ${ptsBadge}
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

  const gt = getGameTime(sid);
  const lockTs = gt ? new Date(gt).getTime() : null;
  const ptsEarned = seriesPoints(pid, sid);
  let footer;
  if (actual && pick.winner) {
    const correct = pick.winner === actual;
    footer = `<div class="card-footer ${correct ? 'footer-correct' : 'footer-wrong'}">
      ${correct ? '✓' : '✗'} <span class="pts-badge">${ptsEarned} pts</span>
    </div>`;
  } else if (locked) {
    footer = `<div class="card-footer footer-locked">🔒 Locked</div>`;
  } else if (lockTs) {
    footer = `<div class="card-footer footer-countdown" data-lock-ts="${lockTs}" data-game-ts="${lockTs}">${formatCountdown(lockTs, lockTs)}</div>`;
  } else {
    footer = '';
  }

  const gapRow = sid === 'FINALS' ? (() => {
    const val = state.finalsGap[pid] ?? '';
    if (editable) return `<div class="gap-input-row">
      <label class="gap-label">Game 1 gap (pts)</label>
      <input type="number" class="gap-input" min="1" max="50" value="${val}" placeholder="?" data-gap-pid="${pid}" />
    </div>`;
    if (val !== '') return `<div class="gap-input-row gap-readonly"><span class="gap-label">Game 1 gap:</span> <strong>${val} pts</strong></div>`;
    return '';
  })() : '';

  return `<div class="matchup-card ${locked && !pick.winner ? 'card-inactive' : ''}"
               data-series="${sid}">
    ${row(t1)}<div class="series-divider"></div>${row(t2)}${gamesRow}${gapRow}${footer}
  </div>`;
}

// ---- View card (another user's picks, read-only) ----
function cardView(sid, t1, t2, pid) {
  const locked = isSeriesLocked(sid);

  const isOwnPicks = pid === currentUserId;

  // Picks are hidden until the series locks (starts), except for the admin or the user viewing their own picks
  if (!locked && !isAdmin() && !isOwnPicks) {
    function rowHidden(key) {
      const t = TEAMS[key];
      const pct = getWinPct(sid, key);
      return `<div class="team-row no-pointer">
        <span class="seed-num">${t.seed ?? ''}</span>
        <img class="team-logo" src="${t.logo}" alt="${t.abbr}" />
        <span class="team-name">${t.name}</span>
        ${pct !== null ? `<span class="fan-pct">${pct}%</span>` : ''}
      </div>`;
    }
    const gt = getGameTime(sid);
    const defaultGt = DEFAULT_GAME_TIMES[sid];
    const lockTs = gt && defaultGt
      ? Math.min(new Date(gt).getTime(), new Date(defaultGt).getTime())
      : gt ? new Date(gt).getTime()
      : defaultGt ? new Date(defaultGt).getTime()
      : null;
    return `<div class="matchup-card card-hidden-picks" data-series="${sid}">
      ${rowHidden(t1)}<div class="series-divider"></div>${rowHidden(t2)}
      <div class="card-footer footer-hidden"${lockTs ? ` data-lock-ts="${lockTs}"` : ''}>🔒 Picks hidden until series starts</div>
    </div>`;
  }

  const pick   = getPick(pid, sid);
  const actual = state.results[sid] || null;

  function row(key) {
    const t        = TEAMS[key];
    const isPicked = pick.winner === key;
    const isOk     = isPicked && actual && actual === key;
    const isBad    = isPicked && actual && actual !== key;
    const cls      = isPicked ? (isBad ? 'is-wrong-pick' : 'is-winner') : '';
    const mark     = isOk ? '✓' : isBad ? '✗' : '';
    const pct = getWinPct(sid, key);
    return `<div class="team-row no-pointer ${cls}">
      <span class="seed-num">${t.seed ?? ''}</span>
      <img class="team-logo" src="${t.logo}" alt="${t.abbr}" />
      <span class="team-name">${t.name}</span>
      ${pct !== null ? `<span class="fan-pct">${pct}%</span>` : ''}
      ${mark ? `<span class="win-mark">${mark}</span>` : ''}
    </div>`;
  }

  const ag2    = getActualGames(sid);
  const gOk    = pick.games && ag2 && pick.games === ag2;
  const gBad   = pick.games && ag2 && pick.games !== ag2;
  const ptsEarned = seriesPoints(pid, sid);
  const footer = pick.games
    ? `<div class="card-footer ${gOk ? 'footer-correct' : gBad ? 'footer-wrong' : ''}">
         ${pick.games} games${gOk ? ' ✓' : gBad ? ` ✗ (actual ${ag2})` : ''}${ptsEarned ? ` · <span class="pts-badge">${ptsEarned} pts</span>` : ''}
       </div>`
    : ptsEarned
      ? `<div class="card-footer footer-correct"><span class="pts-badge">${ptsEarned} pts</span></div>`
      : '';

  const gapRow = sid === 'FINALS' && state.finalsGap[pid] != null
    ? `<div class="gap-input-row gap-readonly"><span class="gap-label">Game 1 gap:</span> <strong>${state.finalsGap[pid]} pts</strong></div>`
    : '';

  return `<div class="matchup-card" data-series="${sid}">
    ${row(t1)}<div class="series-divider"></div>${row(t2)}${gapRow}${footer}
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
      if (games  < avail.length) missing.push(`${avail.length - games} game count${avail.length - games > 1 ? 's' : ''}`);
      if (r === 4 && state.finalsGap[pid] == null) missing.push('Game 1 gap');
      const canSave = !(r === 4 && state.finalsGap[pid] == null);
      badge  = `<span class="rc-badge rc-open">Open</span>`;
      action = canSave
        ? `<button class="save-round-btn btn-primary" data-round="${r}">Save ${ROUND_NAMES[r]}${missing.length ? ` (${missing.join(' · ')})` : ''}</button>`
        : `<button class="save-round-btn btn-primary btn-disabled" disabled data-round="${r}" title="Still missing: ${missing.join(', ')}">
             Missing: ${missing.join(' · ')}
           </button>`;
    }

    const gapWarn = r === 4 ? `<span class="gap-warn" style="display:none"></span>` : '';
    return [`<div class="round-control-row">
      <span class="rc-name">${ROUND_NAMES[r]}</span>
      <div class="rc-right">${badge}${action}${gapWarn}</div>
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
    if (r === 4 && state.finalsGap[currentUserId] == null) {
      const warn = saveBtn.closest('.round-col, .blist-round')?.querySelector('.gap-warn');
      if (warn) { warn.textContent = '⚠ Add a Game 1 gap for the tiebreaker!'; warn.style.display = 'block'; }
      setTimeout(() => { if (warn) warn.style.display = 'none'; }, 4000);
      return; // block submission until gap is filled
    }
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
// RESULTS TAB
// ============================================================

function renderResults() {
  const el = document.getElementById('tab-participants');

  const gapDisplay = state.finalsGame1ActualGap != null
    ? `<div class="game1-gap-ctrl">
        <span class="gap-label">Finals Game 1 actual gap:</span>
        <strong>${state.finalsGame1ActualGap} pts</strong>
       </div>`
    : '';

  el.innerHTML = `
    <div class="bracket-instructions">
      Actual results — updated automatically from the NBA API every hour.
      ${scoresData
        ? `<span class="scores-updated">Last sync: ${new Date(scoresData.updated).toLocaleString('en-GB', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} (IST)</span>`
        : ''}
    </div>
    ${gapDisplay}
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
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.correct !== a.correct) return b.correct - a.correct;
      const actual = state.finalsGame1ActualGap;
      if (actual == null) return 0;
      const hasA = state.finalsGap[a.id] != null;
      const hasB = state.finalsGap[b.id] != null;
      if (!hasA && !hasB) return 0;
      if (!hasA) return 1;
      if (!hasB) return -1;
      return Math.abs(state.finalsGap[a.id] - actual) - Math.abs(state.finalsGap[b.id] - actual);
    });

  el.innerHTML = `
    <div class="leaderboard-wrap">
      <h2>Leaderboard</h2>
      <table class="leaderboard-table">
        <thead>
          <tr><th>#</th><th>Name</th><th>R1</th><th>SF</th><th>CF</th><th>Finals</th><th>Total</th></tr>
        </thead>
        <tbody>
          ${rows.map((p, i) => {
            const rs = [0, 0, 0, 0];
            for (const def of SERIES) rs[def.r - 1] += seriesPoints(p.id, def.id);
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
  const adminView = isAdmin();
  let html = '<div class="pick-breakdown"><h3>Pick Details</h3>';

  for (const r of [1, 2, 3, 4]) {
    const series = SERIES.filter(s => s.r === r && isSeriesAvailable(s.id));
    if (!series.length) continue;
    html += `<div class="breakdown-round"><h4>${ROUND_NAMES[r]}</h4><div class="breakdown-grid">`;
    for (const def of series) {
      const actual = state.results[def.id];
      const [t1k, t2k] = resolveTeams(def.id);
      const t1 = t1k ? TEAMS[t1k] : null;
      const t2 = t2k ? TEAMS[t2k] : null;
      const ag = getActualGames(def.id);
      const seriesLocked = isSeriesLocked(def.id);

      const teamsHeader = `<div class="bd-teams">
        <div class="bd-team">
          ${t1 ? `<img src="${t1.logo}" alt="${t1.abbr}" /><span>${t1.abbr}</span>` : '<span>?</span>'}
        </div>
        <span class="bd-vs">vs</span>
        <div class="bd-team">
          ${t2 ? `<img src="${t2.logo}" alt="${t2.abbr}" /><span>${t2.abbr}</span>` : '<span>?</span>'}
        </div>
      </div>`;

      const resultBar = `<div class="bd-result">${actual
        ? `<strong style="color:${TEAMS[actual].color}">${TEAMS[actual].abbr}</strong> wins${ag ? ` in ${ag}` : ''}`
        : 'Pending'}</div>`;

      let pickRows = '';
      if (seriesLocked || adminView) {
        pickRows = rows.map(p => {
          const pick = getPick(p.id, def.id);
          const pt = pick.winner ? TEAMS[pick.winner] : null;
          const ok  = actual && pick.winner && actual === pick.winner;
          const bad = actual && pick.winner && actual !== pick.winner;
          const gok = ok && ag && pick.games && ag === pick.games;
          const gbad = actual && ag && pick.games && ag !== pick.games;
          const isMe = p.id === currentUserId;
          const teamCls = ok ? 'bd-team-ok' : bad ? 'bd-team-bad' : '';
          const gamesCls = gok ? 'bd-games-ok' : gbad ? 'bd-games-bad' : '';
          const ptsEarned = seriesPoints(p.id, def.id);
          return `<div class="bd-pick-row${isMe ? ' my-row' : ''}">
            <span class="bd-pick-name">${p.name.split(' ')[0]}</span>
            <span class="bd-pick-team ${teamCls}">
              ${pt ? `<img src="${pt.logo}" alt="${pt.abbr}" /><span class="bd-pick-abbr" style="color:${pt.color}">${pt.abbr}</span>` : '<span class="bd-pick-abbr">?</span>'}
              ${ok ? '<span class="bd-pick-mark ok">✓</span>' : bad ? '<span class="bd-pick-mark bad">✗</span>' : ''}
              ${pick.games ? `<span class="bd-pick-games ${gamesCls}">in ${pick.games}${gok ? ' ✓' : gbad ? ` ✗(${ag})` : ''}</span>` : ''}
            </span>
            ${ptsEarned ? `<span class="bd-pts-earned">${ptsEarned} pts</span>` : ''}
          </div>`;
        }).join('');
      } else {
        pickRows = `<div class="bd-hidden">🔒 Hidden until series starts</div>`;
      }

      html += `<div class="breakdown-series">${teamsHeader}${resultBar}<div class="bd-picks">${pickRows}</div></div>`;
    }
    html += '</div></div>';
  }

  // Finals Game 1 gap — only show when at least one user has submitted a gap
  const anyGap = rows.some(p => state.finalsGap[p.id] != null);
  if (anyGap || state.finalsGame1ActualGap != null) {
    const actualGap = state.finalsGame1ActualGap;
    html += '<div class="breakdown-round"><h4>Game 1 Finals Gap (Tiebreaker)</h4><div class="breakdown-grid">';
    html += '<div class="breakdown-series"><div class="bd-picks">';
    for (const p of rows) {
      const gap = state.finalsGap[p.id];
      const isMe = p.id === currentUserId;
      let diffStr = '';
      if (gap != null && actualGap != null) {
        const diff = Math.abs(gap - actualGap);
        diffStr = `<span class="bd-pick-games">(diff: ${diff})</span>`;
      }
      html += `<div class="bd-gap-row${isMe ? ' my-row' : ''}">
        <span class="bd-pick-name">${p.name.split(' ')[0]}</span>
        <span class="bd-pick-abbr">${gap != null ? `${gap} pts` : '–'}</span>
        ${diffStr}
      </div>`;
    }
    if (actualGap != null) {
      html += `<div class="bd-gap-actual">Actual: <strong>${actualGap} pts</strong></div>`;
    }
    html += '</div></div></div></div>';
  }

  return html + '</div>';
}

// ============================================================
// RULES TAB
// ============================================================

function renderInfo() {
  const el = document.getElementById('tab-info');

  const pointsRows = ROUND_NAMES.slice(1).map((name, i) => {
    const r = i + 1;
    return `<tr><td>${name}</td><td>${ROUND_POINTS[r]} pts</td></tr>`;
  }).join('');

  // Build deadlines for R1 series (have known game times)
  const r1Series = SERIES.filter(s => s.r === 1);
  const deadlineRows = r1Series.map(s => {
    const t1 = TEAMS[s.t1];
    const t2key = s.t2 || null;
    const t2 = t2key ? TEAMS[t2key] : null;
    const teamCell = (t) => t
      ? `<span class="info-team"><img src="${t.logo}" alt="${t.abbr}" class="info-team-logo" />${t.name}</span>`
      : `<span class="info-team">TBD</span>`;
    const matchup = `${teamCell(t1)} <span class="info-vs">vs</span> ${teamCell(t2)}`;
    const gameTs = getGameTime(s.id);
    let deadlineStr = '—';
    if (gameTs) {
      deadlineStr = new Date(gameTs).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' });
    }
    return `<tr><td><div class="info-matchup-cell">${matchup}</div></td><td>${deadlineStr}</td></tr>`;
  }).join('');

  el.innerHTML = `
    <div class="info-tab">
      <section class="info-section">
        <h2>Points System</h2>
        <table class="info-table">
          <thead><tr><th>Round</th><th>Points</th></tr></thead>
          <tbody>
            ${pointsRows}
            <tr><td>Correct series length</td><td>+${GAMES_BONUS} pts</td></tr>
            <tr class="upset-row"><td>Upset bonus <span class="info-note">(picking the underdog correctly)</span></td><td>see table below</td></tr>
          </tbody>
        </table>
        <p class="info-detail"><strong>Tiebreaker:</strong> If scores are equal, the player whose predicted Game 1 NBA Finals score margin is closest to the actual margin wins the higher place. Equal distance = shared place.</p>
      </section>

      <section class="info-section">
        <h2>Upset Bonus</h2>
        <p class="info-detail">Based on fan pick % from picks.nba.com, floored to the nearest 10%. Minimum gap 5% when fav% is below 60%. Formula: <strong>2 × pts × (floor10(fav%) − 50%) / 100</strong>.</p>
        <p class="info-detail">Underdog potential pts = <span style="color:var(--text-dim)">base</span> + <span style="color:var(--green)">bonus</span>:</p>
        <table class="info-table">
          <thead><tr><th>Fav% range</th><th>R1</th><th>SF</th><th>CF</th><th>Finals</th></tr></thead>
          <tbody>
            <tr><td>50–59%</td><td><span class="pot-base">10</span> <span class="pot-bonus">+1</span></td><td><span class="pot-base">20</span> <span class="pot-bonus">+2</span></td><td><span class="pot-base">40</span> <span class="pot-bonus">+4</span></td><td><span class="pot-base">80</span> <span class="pot-bonus">+8</span></td></tr>
            <tr><td>60–69%</td><td><span class="pot-base">10</span> <span class="pot-bonus">+2</span></td><td><span class="pot-base">20</span> <span class="pot-bonus">+4</span></td><td><span class="pot-base">40</span> <span class="pot-bonus">+8</span></td><td><span class="pot-base">80</span> <span class="pot-bonus">+16</span></td></tr>
            <tr><td>70–79%</td><td><span class="pot-base">10</span> <span class="pot-bonus">+4</span></td><td><span class="pot-base">20</span> <span class="pot-bonus">+8</span></td><td><span class="pot-base">40</span> <span class="pot-bonus">+16</span></td><td><span class="pot-base">80</span> <span class="pot-bonus">+32</span></td></tr>
            <tr><td>80–89%</td><td><span class="pot-base">10</span> <span class="pot-bonus">+6</span></td><td><span class="pot-base">20</span> <span class="pot-bonus">+12</span></td><td><span class="pot-base">40</span> <span class="pot-bonus">+24</span></td><td><span class="pot-base">80</span> <span class="pot-bonus">+48</span></td></tr>
            <tr><td>90–99%</td><td><span class="pot-base">10</span> <span class="pot-bonus">+8</span></td><td><span class="pot-base">20</span> <span class="pot-bonus">+16</span></td><td><span class="pot-base">40</span> <span class="pot-bonus">+32</span></td><td><span class="pot-base">80</span> <span class="pot-bonus">+64</span></td></tr>
          </tbody>
        </table>
      </section>

      <section class="info-section">
        <h2>Prizes</h2>
        <p class="info-detail">Buy-in: <strong>100 ₪</strong> per player.</p>
        <table class="info-table">
          <thead><tr><th>Place</th><th>Prize</th></tr></thead>
          <tbody>
            <tr><td>🥇 1st place</td><td>70% of the pot</td></tr>
            <tr><td>🥈 2nd place</td><td>30% of the pot</td></tr>
            <tr><td>🥉 3rd place</td><td>Buy-in back</td></tr>
          </tbody>
        </table>
      </section>

      <section class="info-section">
        <h2>Pick Deadlines</h2>
        <p class="info-detail">Picking opens when both teams are known. Picks close when the series' first game begins.</p>
        <table class="info-table">
          <thead><tr><th>Matchup</th><th>Game 1 Tip-off</th></tr></thead>
          <tbody>${deadlineRows}</tbody>
        </table>
        <p class="info-detail">SF, CF &amp; Finals deadlines shown once the NBA announces the schedule. All times in Israel Standard Time (IST).</p>
      </section>
    </div>
  `;
}

// ============================================================
// TAB NAVIGATION
// ============================================================

const RENDERERS = {
  bracket:      renderBracket,
  picks:        renderPicksTab,
  participants: renderResults,
  leaderboard:  renderLeaderboard,
  info:         renderInfo,
};

let activeTab = 'bracket';

function switchTab(tab) {
  activeTab = tab;
  sessionStorage.setItem('nba-active-tab', tab);
  document.querySelectorAll('.tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(el =>
    el.classList.toggle('active', el.id === `tab-${tab}`));
  RENDERERS[tab]();
  // Refresh shared picks when switching to All Picks or Leaderboard
  if (tab === 'picks' || tab === 'leaderboard') {
    fetchPicks().then(() => RENDERERS[tab]());
  }
}

// ============================================================
// INIT
// ============================================================

async function beginApp() {
  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  document.getElementById('login-btn').addEventListener('click', attemptLogin);
  document.querySelectorAll('.login-tab').forEach(btn =>
    btn.addEventListener('click', () => setLoginMode(btn.dataset.mode)));
  ['login-name', 'login-pass'].forEach(id =>
    document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') attemptLogin(); }));

  document.getElementById('tab-bracket').addEventListener('click', handlePicksClick);
  document.getElementById('tab-bracket').addEventListener('input', e => {
    const inp = e.target.closest('.gap-input[data-gap-pid]');
    if (!inp) return;
    const val = parseInt(inp.value);
    state.finalsGap[currentUserId] = isNaN(val) ? undefined : val;
    if (isNaN(val)) delete state.finalsGap[currentUserId];
    save();
  });

  const loginBtn = document.getElementById('login-btn');
  const loginMsg = document.getElementById('login-msg');
  loginBtn.disabled = true;
  loginMsg.textContent = 'Loading…';
  loginMsg.className = 'login-msg';
  await fetchPicks();
  loginBtn.disabled = false;
  loginMsg.textContent = '';

  const savedTab = sessionStorage.getItem('nba-active-tab');
  if (savedTab && RENDERERS[savedTab]) activeTab = savedTab;

  initLogin();
  fetchScores();
  startCountdownTimer();
  setInterval(() => fetchScores(), 5 * 60 * 1000);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('gate-btn').addEventListener('click', attemptGate);
  document.getElementById('gate-pass').addEventListener('keydown', e => { if (e.key === 'Enter') attemptGate(); });
  document.querySelector('#sync-error .sync-toast-close').addEventListener('click', clearSyncError);

  if (initGate()) beginApp();
});
