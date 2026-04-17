// ============================================================
// TEAMS
// ============================================================
const TEAMS = {
  // Eastern Conference — seeds 1–7 confirmed
  E1: { name: 'Detroit Pistons',           abbr: 'DET', seed: 1, conf: 'East', color: '#C8102E' },
  E2: { name: 'Boston Celtics',            abbr: 'BOS', seed: 2, conf: 'East', color: '#007A33' },
  E3: { name: 'New York Knicks',           abbr: 'NYK', seed: 3, conf: 'East', color: '#006BB6' },
  E4: { name: 'Cleveland Cavaliers',       abbr: 'CLE', seed: 4, conf: 'East', color: '#6F263D' },
  E5: { name: 'Toronto Raptors',           abbr: 'TOR', seed: 5, conf: 'East', color: '#CE1141' },
  E6: { name: 'Atlanta Hawks',             abbr: 'ATL', seed: 6, conf: 'East', color: '#E03A3E' },
  E7: { name: 'Philadelphia 76ers',        abbr: 'PHI', seed: 7, conf: 'East', color: '#006BB6' },
  // Western Conference — seeds 1–7 confirmed
  W1: { name: 'Oklahoma City Thunder',     abbr: 'OKC', seed: 1, conf: 'West', color: '#007AC1' },
  W2: { name: 'San Antonio Spurs',         abbr: 'SAS', seed: 2, conf: 'West', color: '#000000' },
  W3: { name: 'Denver Nuggets',            abbr: 'DEN', seed: 3, conf: 'West', color: '#0E2240' },
  W4: { name: 'Los Angeles Lakers',        abbr: 'LAL', seed: 4, conf: 'West', color: '#552583' },
  W5: { name: 'Houston Rockets',           abbr: 'HOU', seed: 5, conf: 'West', color: '#CE1141' },
  W6: { name: 'Minnesota Timberwolves',    abbr: 'MIN', seed: 6, conf: 'West', color: '#236192' },
  W7: { name: 'Portland Trail Blazers',    abbr: 'POR', seed: 7, conf: 'West', color: '#E03A3E' },
  // Play-In candidates for 8-seeds (Apr 17 games)
  ORL: { name: 'Orlando Magic',            abbr: 'ORL', conf: 'East', color: '#0077C0' },
  CHA: { name: 'Charlotte Hornets',        abbr: 'CHA', conf: 'East', color: '#00788C' },
  GSW: { name: 'Golden State Warriors',    abbr: 'GSW', conf: 'West', color: '#1D428A' },
  PHX: { name: 'Phoenix Suns',             abbr: 'PHX', conf: 'West', color: '#E56020' },
};

const PLAYIN = {
  E8: { label: 'East #8 Seed', teamA: 'ORL', teamB: 'CHA', game: 'Charlotte @ Orlando — 7:30 PM ET' },
  W8: { label: 'West #8 Seed', teamA: 'GSW', teamB: 'PHX', game: 'Golden State @ Phoenix — 10:00 PM ET' },
};

// ============================================================
// BRACKET STRUCTURE
// ============================================================
const SERIES = [
  // Round 1 – East
  { id: 'E1v8', r: 1, conf: 'East', t1: 'E1', t2Slot: 'E8' },
  { id: 'E4v5', r: 1, conf: 'East', t1: 'E4', t2: 'E5' },
  { id: 'E2v7', r: 1, conf: 'East', t1: 'E2', t2: 'E7' },
  { id: 'E3v6', r: 1, conf: 'East', t1: 'E3', t2: 'E6' },
  // Round 1 – West
  { id: 'W1v8', r: 1, conf: 'West', t1: 'W1', t2Slot: 'W8' },
  { id: 'W4v5', r: 1, conf: 'West', t1: 'W4', t2: 'W5' },
  { id: 'W2v7', r: 1, conf: 'West', t1: 'W2', t2: 'W7' },
  { id: 'W3v6', r: 1, conf: 'West', t1: 'W3', t2: 'W6' },
  // Round 2 – East Semifinals
  { id: 'EQ1',  r: 2, conf: 'East', from: ['E1v8', 'E4v5'] },
  { id: 'EQ2',  r: 2, conf: 'East', from: ['E2v7', 'E3v6'] },
  // Round 2 – West Semifinals
  { id: 'WQ1',  r: 2, conf: 'West', from: ['W1v8', 'W4v5'] },
  { id: 'WQ2',  r: 2, conf: 'West', from: ['W2v7', 'W3v6'] },
  // Round 3 – Conference Finals
  { id: 'ECF',    r: 3, conf: 'East', from: ['EQ1', 'EQ2'] },
  { id: 'WCF',    r: 3, conf: 'West', from: ['WQ1', 'WQ2'] },
  // Round 4 – NBA Finals
  { id: 'FINALS', r: 4, conf: null,  from: ['ECF', 'WCF'] },
];

const SERIES_MAP   = Object.fromEntries(SERIES.map(s => [s.id, s]));
const ROUND_NAMES  = ['', 'First Round', 'Conf. Semifinals', 'Conf. Finals', 'NBA Finals'];
const ROUND_POINTS = [0, 1, 2, 4, 8];

// Default first-game times per series (ISO UTC).
// Deadline for each series = first game time - 8 hours.
// The GitHub Action populates real times in scores.json; these are fallbacks.
const DEFAULT_GAME_TIMES = {
  // Round 1 – all first games April 19–20
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
const STORAGE_KEY = 'nba-bracket-2026';
const USER_KEY    = 'nba-bracket-2026-user';

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (!s.picksSubmitted) s.picksSubmitted = {};
      if (!s.playIn) s.playIn = { E8: null, W8: null };
      return s;
    }
  } catch (_) {}
  return { results: {}, participants: [], picks: {}, playIn: { E8: null, W8: null }, picksSubmitted: {} };
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ============================================================
// LOGIN SYSTEM
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
  setTimeout(() => document.getElementById('login-input').focus(), 60);
}

function loginUser() {
  const input = document.getElementById('login-input');
  const name  = input.value.trim();
  const msg   = document.getElementById('login-msg');
  if (!name) return;

  let p = state.participants.find(p => p.name.toLowerCase() === name.toLowerCase());
  const isNew = !p;
  if (isNew) {
    p = { id: 'p_' + Date.now(), name };
    state.participants.push(p);
    state.picks[p.id] = {};
    save();
    msg.textContent = `Welcome, ${p.name}! Account created.`;
    msg.className = 'login-msg msg-welcome';
  } else {
    msg.textContent = `Welcome back, ${p.name}!`;
    msg.className = 'login-msg msg-welcome';
  }

  currentUserId = p.id;
  localStorage.setItem(USER_KEY, p.id);

  setTimeout(() => {
    document.getElementById('login-overlay').classList.add('hidden');
    startApp();
  }, 600);
}

function switchUser() {
  currentUserId = null;
  localStorage.removeItem(USER_KEY);
  editingState = { pid: null, round: null };
  document.getElementById('login-input').value = '';
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
    <button class="btn-switch-user" onclick="switchUser()">Switch</button>`;
}

// ============================================================
// LIVE SCORES  (data/scores.json, updated hourly by GitHub Actions)
// ============================================================
let scoresData = null;

// Runtime edit-unlock state — resets on page load or user switch.
let editingState = { pid: null, round: null };

// Return the first-game ISO timestamp for a series (from scores.json or defaults).
function getGameTime(sid) {
  return scoresData?.gameTimes?.[sid] ?? DEFAULT_GAME_TIMES[sid] ?? null;
}

// A series is locked 8 hours before its first game.
function isSeriesLocked(sid) {
  const gt = getGameTime(sid);
  if (!gt) return false;
  return Date.now() > new Date(gt).getTime() - 8 * 60 * 60 * 1000;
}

// Format deadline for display.
function formatSeriesDeadline(sid) {
  const gt = getGameTime(sid);
  if (!gt) return null;
  const deadline = new Date(new Date(gt).getTime() - 8 * 60 * 60 * 1000);
  return deadline.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
    timeZone: 'America/New_York', timeZoneName: 'short',
  });
}

// A series is available to pick when both teams are confirmed.
function isSeriesAvailable(sid) {
  const def = SERIES_MAP[sid];
  if (def.t1) {
    const t2 = def.t2 || (def.t2Slot ? state.playIn[def.t2Slot] : null);
    return !!t2;
  }
  return !!state.results[def.from[0]] && !!state.results[def.from[1]];
}

// Can this user currently edit picks for a specific series?
function canPickSeries(pid, sid) {
  if (!isSeriesAvailable(sid)) return false;
  if (isSeriesLocked(sid)) return false;
  const round = SERIES_MAP[sid].r;
  if (state.picksSubmitted[pid]?.[round]) {
    return editingState.pid === pid && editingState.round === round;
  }
  return true;
}

// Is every available series in a round locked?
function isRoundFullyLocked(round) {
  return SERIES
    .filter(s => s.r === round && isSeriesAvailable(s.id))
    .every(s => isSeriesLocked(s.id));
}

async function fetchScores() {
  try {
    const resp = await fetch('data/scores.json?_=' + Date.now());
    if (!resp.ok) return;
    scoresData = await resp.json();
    if (RENDERERS[activeTab]) RENDERERS[activeTab]();
  } catch (_) {}
}

function getRecord(sid) {
  if (!scoresData?.records) return null;
  const [t1, t2] = resolveTeams(sid, state.results);
  if (!t1 || !t2) return null;
  const a1 = TEAMS[t1]?.abbr, a2 = TEAMS[t2]?.abbr;
  if (!a1 || !a2) return null;
  const key = [a1, a2].sort().join('-');
  const rec = scoresData.records[key];
  if (!rec) return null;
  return { t1Wins: rec[a1] ?? 0, t2Wins: rec[a2] ?? 0 };
}

// ============================================================
// CORE LOGIC
// ============================================================

function resolveTeams(seriesId, src) {
  const def = SERIES_MAP[seriesId];
  if (def.t1) {
    const t2 = def.t2 || (def.t2Slot ? state.playIn[def.t2Slot] : null);
    return [def.t1, t2];
  }
  return [src[def.from[0]] || null, src[def.from[1]] || null];
}

function computeScore(pid) {
  const picks = state.picks[pid] || {};
  let score = 0, correct = 0, possible = 0;
  for (const def of SERIES) {
    const actual = state.results[def.id];
    const picked = picks[def.id];
    if (picked) possible++;
    if (actual && picked && actual === picked) {
      score += ROUND_POINTS[def.r];
      correct++;
    }
  }
  return { score, correct, possible };
}

function clearDownstream(sid, src) {
  delete src[sid];
  propagateClear(sid, src);
}

function propagateClear(changedSid, src) {
  for (const def of SERIES) {
    if (def.from && def.from.includes(changedSid)) {
      const [t1, t2] = resolveTeams(def.id, src);
      const cur = src[def.id];
      if (cur && cur !== t1 && cur !== t2) {
        delete src[def.id];
        propagateClear(def.id, src);
      }
    }
  }
}

// ============================================================
// PLAY-IN BANNER  (commissioner only, shown on Results tab)
// ============================================================

function renderPlayInBanner() {
  if (state.playIn.E8 && state.playIn.W8) return '';

  function slotHtml(slotKey) {
    const pi = PLAYIN[slotKey];
    const winner = state.playIn[slotKey];
    const tA = TEAMS[pi.teamA], tB = TEAMS[pi.teamB];
    return `
      <div class="playin-slot">
        <div class="playin-slot-label">${pi.label}</div>
        <div class="playin-game-note">${pi.game}</div>
        <div class="playin-choices">
          <button class="playin-btn ${winner === pi.teamA ? 'selected' : ''}"
                  data-slot="${slotKey}" data-team="${pi.teamA}"
                  style="--tc:${tA.color}">${tA.name}</button>
          <span class="playin-vs">vs</span>
          <button class="playin-btn ${winner === pi.teamB ? 'selected' : ''}"
                  data-slot="${slotKey}" data-team="${pi.teamB}"
                  style="--tc:${tB.color}">${tB.name}</button>
        </div>
        ${winner ? `<div class="playin-set">✓ ${TEAMS[winner].name} set as #8 seed</div>` : ''}
      </div>`;
  }

  return `
    <div class="playin-banner">
      <div class="playin-banner-title">⏳ Play-In Tournament — Set 8-Seeds</div>
      <div class="playin-banner-sub">Click the winner of each play-in game to unlock their first-round series.</div>
      <div class="playin-slots">${slotHtml('E8')}${slotHtml('W8')}</div>
    </div>`;
}

// ============================================================
// BRACKET TAB — MY PICKS
// Current user picks round by round. Save/Edit per round.
// ============================================================

function renderBracket() {
  const el = document.getElementById('tab-bracket');
  if (!currentUserId) return;

  el.innerHTML = `
    <div class="picks-rounds">
      ${[1, 2, 3, 4].map(r => renderMyPicksRound(currentUserId, r)).join('')}
    </div>`;

  el.querySelectorAll('.pick-team-row[data-series][data-team]').forEach(row => {
    row.addEventListener('click', () => {
      const sid = row.dataset.series;
      if (!canPickSeries(currentUserId, sid)) return;
      handlePickClick(currentUserId, sid, row.dataset.team);
    });
  });

  el.querySelectorAll('.save-round-btn[data-round]').forEach(btn => {
    btn.addEventListener('click', () => {
      const round = parseInt(btn.dataset.round);
      if (!state.picksSubmitted[currentUserId]) state.picksSubmitted[currentUserId] = {};
      state.picksSubmitted[currentUserId][round] = true;
      editingState = { pid: null, round: null };
      save();
      renderBracket();
      renderLeaderboard();
    });
  });

  el.querySelectorAll('.edit-round-btn[data-round]').forEach(btn => {
    btn.addEventListener('click', () => {
      editingState = { pid: currentUserId, round: parseInt(btn.dataset.round) };
      renderBracket();
    });
  });
}

function renderMyPicksRound(pid, round) {
  const seriesInRound = SERIES.filter(s => s.r === round);
  const available     = seriesInRound.filter(s => isSeriesAvailable(s.id));

  // Round not yet available — show collapsed placeholder
  if (available.length === 0) {
    const prev = round === 2 ? 'Round 1' : round === 3 ? 'Semifinals' : 'Conf. Finals';
    return `
      <div class="picks-round-section picks-round-future">
        <div class="picks-round-header">
          <h3>${ROUND_NAMES[round]}</h3>
          <span class="round-status status-waiting">Available once ${prev} matchups are set</span>
        </div>
      </div>`;
  }

  const picks        = state.picks[pid] || {};
  const submitted    = !!state.picksSubmitted[pid]?.[round];
  const roundLocked  = isRoundFullyLocked(round);
  const isEditing    = editingState.pid === pid && editingState.round === round;
  const picksMade    = available.filter(s => picks[s.id]).length;

  // Status badge
  let statusHtml;
  if (roundLocked) {
    statusHtml = `<span class="round-status status-locked">🔒 Locked</span>`;
  } else if (submitted && !isEditing) {
    statusHtml = `
      <span class="round-status status-submitted">✓ Saved</span>
      <button class="edit-round-btn btn-outline-sm" data-round="${round}">Edit</button>`;
  } else {
    statusHtml = `<span class="round-status status-open">Open</span>`;
  }

  const cards = available.map(def => {
    const [t1, t2] = resolveTeams(def.id, state.results);
    const pick      = picks[def.id];
    const locked    = isSeriesLocked(def.id) || (submitted && !isEditing);
    const dl        = formatSeriesDeadline(def.id);

    function pickRow(key) {
      if (!key) return `<div class="pick-team-row tbd-row"><span class="team-name">TBD</span></div>`;
      const t = TEAMS[key];
      const isPicked = pick === key;
      return `<div class="pick-team-row ${isPicked ? 'is-picked' : ''} ${locked ? 'no-pointer' : ''}"
                   data-series="${def.id}" data-team="${key}"
                   style="--tc:${t.color}">
        <span class="seed-num">${t.seed ?? ''}</span>
        <span class="team-name">${t.name}</span>
        ${isPicked ? '<span class="pick-check">✓</span>' : ''}
      </div>`;
    }

    return `
      <div class="pick-card ${locked ? 'pick-card-locked' : ''}">
        ${pickRow(t1)}
        <div class="series-divider"></div>
        ${pickRow(t2)}
        ${dl && !isSeriesLocked(def.id) ? `<div class="series-deadline">Locks ${dl}</div>` : ''}
      </div>`;
  }).join('');

  const saveBtn = (!roundLocked && (!submitted || isEditing))
    ? `<button class="save-round-btn btn-primary" data-round="${round}">
         Save ${ROUND_NAMES[round]} Picks&nbsp;(${picksMade} / ${available.length})
       </button>`
    : '';

  return `
    <div class="picks-round-section">
      <div class="picks-round-header">
        <h3>${ROUND_NAMES[round]}</h3>
        <div class="round-status-area">${statusHtml}</div>
      </div>
      <div class="picks-cards-grid">${cards}</div>
      ${saveBtn}
    </div>`;
}

function handlePickClick(pid, sid, tid) {
  if (!state.picks[pid]) state.picks[pid] = {};
  const picks = state.picks[pid];
  if (picks[sid] === tid) {
    delete picks[sid];
  } else {
    picks[sid] = tid;
  }
  save();
  renderBracket();
  renderLeaderboard();
}

// ============================================================
// PICKS TAB — ALL PICKS  (read-only view of any user)
// ============================================================
let viewingPid = null;

function renderPicksTab() {
  const el = document.getElementById('tab-picks');

  if (state.participants.length === 0) {
    el.innerHTML = `<div class="empty-state">No participants yet.</div>`;
    return;
  }

  if (!viewingPid || !state.participants.find(p => p.id === viewingPid)) {
    viewingPid = currentUserId || state.participants[0].id;
  }

  el.innerHTML = `
    <div class="picks-header">
      <label for="view-picks-select">Viewing picks for:</label>
      <select id="view-picks-select">
        ${state.participants.map(p =>
          `<option value="${p.id}" ${p.id === viewingPid ? 'selected' : ''}>${p.name}</option>`
        ).join('')}
      </select>
      <button class="btn-primary" id="download-excel-btn">⬇ Download Excel</button>
    </div>
    <div class="picks-rounds">
      ${[1, 2, 3, 4].map(r => renderViewPicksRound(viewingPid, r)).join('')}
    </div>`;

  el.querySelector('#view-picks-select').addEventListener('change', e => {
    viewingPid = e.target.value;
    renderPicksTab();
  });

  el.querySelector('#download-excel-btn').addEventListener('click', downloadExcel);
}

function renderViewPicksRound(pid, round) {
  const available = SERIES.filter(s => s.r === round && isSeriesAvailable(s.id));
  if (available.length === 0) return '';

  const picks     = state.picks[pid] || {};
  const submitted = !!state.picksSubmitted[pid]?.[round];

  const cards = available.map(def => {
    const [t1, t2] = resolveTeams(def.id, state.results);
    const pick   = picks[def.id];
    const actual = state.results[def.id];

    function viewRow(key) {
      if (!key) return `<div class="pick-team-row tbd-row no-pointer"><span class="team-name">TBD</span></div>`;
      const t = TEAMS[key];
      const isPicked   = pick === key;
      const isCorrect  = isPicked && actual && actual === key;
      const isWrong    = isPicked && actual && actual !== key;
      return `<div class="pick-team-row no-pointer
                   ${isPicked ? (isCorrect ? 'is-correct' : isWrong ? 'is-wrong' : 'is-picked') : ''}"
                   style="--tc:${t.color}">
        <span class="seed-num">${t.seed ?? ''}</span>
        <span class="team-name">${t.name}</span>
        ${isPicked ? `<span class="pick-check">${isCorrect ? '✓' : isWrong ? '✗' : '•'}</span>` : ''}
      </div>`;
    }

    return `<div class="pick-card pick-card-locked">
      ${viewRow(t1)}
      <div class="series-divider"></div>
      ${viewRow(t2)}
    </div>`;
  }).join('');

  const statusBadge = submitted
    ? `<span class="round-status status-submitted">✓ Saved</span>`
    : `<span class="round-status status-pending">Not saved</span>`;

  return `
    <div class="picks-round-section">
      <div class="picks-round-header">
        <h3>${ROUND_NAMES[round]}</h3>
        <div class="round-status-area">${statusBadge}</div>
      </div>
      <div class="picks-cards-grid">${cards}</div>
    </div>`;
}

// ============================================================
// RESULTS TAB — COMMISSIONER
// Sets actual series winners. Previously the Bracket tab.
// ============================================================

function renderResults() {
  const el = document.getElementById('tab-participants');

  el.innerHTML = `
    ${renderPlayInBanner()}
    <div class="bracket-instructions">
      <strong>Commissioner view</strong> — click a team to set the actual series winner. Click again to clear.
      ${scoresData ? `<span class="scores-updated">Records updated ${scoresData.updated.replace('T',' ').replace('Z',' UTC')}</span>` : ''}
    </div>
    <div class="bracket-wrap">
      <div class="conf-label east-label">EASTERN CONFERENCE</div>
      <div class="conf-label west-label">WESTERN CONFERENCE</div>
      <div class="bracket">
        <div class="half east">
          ${renderColumn(['E1v8','E4v5','E2v7','E3v6'], 1, 'east', state.results)}
          ${renderColumn(['EQ1','EQ2'], 2, 'east', state.results)}
          ${renderColumn(['ECF'], 3, 'east', state.results)}
        </div>
        <div class="finals-col">
          <div class="round-label">NBA Finals</div>
          ${renderSeries('FINALS', state.results, 'results')}
          <div class="champion-slot">
            ${state.results['FINALS']
              ? `<div class="champion-badge" style="--team-color:${TEAMS[state.results['FINALS']].color}">
                   🏆 ${TEAMS[state.results['FINALS']].name}
                 </div>`
              : '<div class="champion-tbd">🏆 Champion TBD</div>'}
          </div>
        </div>
        <div class="half west">
          ${renderColumn(['ECF_mirror'], 3, 'west', state.results, 'WCF')}
          ${renderColumn(['WQ1','WQ2'], 2, 'west', state.results)}
          ${renderColumn(['W1v8','W4v5','W2v7','W3v6'], 1, 'west', state.results)}
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

  el.querySelectorAll('.matchup-card[data-series]').forEach(card => {
    card.querySelectorAll('.team-row[data-team]').forEach(row => {
      row.addEventListener('click', () => {
        if (card.dataset.mode !== 'results') return;
        const sid = card.dataset.series;
        const tid = row.dataset.team;
        if (state.results[sid] === tid) {
          clearDownstream(sid, state.results);
        } else {
          state.results[sid] = tid;
          propagateClear(sid, state.results);
        }
        save();
        renderResults();
        renderLeaderboard();
        // Re-render My Picks if open so new series unlock immediately
        if (activeTab === 'bracket') renderBracket();
      });
    });
  });

  el.querySelectorAll('.playin-btn[data-slot]').forEach(btn => {
    btn.addEventListener('click', () => {
      const slot = btn.dataset.slot;
      const team = btn.dataset.team;
      if (state.playIn[slot] === team) {
        state.playIn[slot] = null;
        clearDownstream(slot === 'E8' ? 'E1v8' : 'W1v8', state.results);
      } else {
        state.playIn[slot] = team;
      }
      save();
      renderResults();
      if (activeTab === 'bracket') renderBracket();
    });
  });
}

// ============================================================
// RESULTS BRACKET HELPERS
// ============================================================

function renderColumn(ids, round, side, src, overrideId) {
  const label = round === 1 ? 'First Round' : round === 2 ? 'Semifinals' : 'Conf. Finals';
  const realIds = overrideId ? [overrideId] : ids;
  return `
    <div class="bracket-col r${round} ${side}">
      <div class="round-label">${label}</div>
      <div class="col-series">
        ${realIds.map(id => renderSeries(id, src, 'results')).join('')}
      </div>
    </div>`;
}

function renderSeries(sid, src, mode) {
  const [t1, t2] = resolveTeams(sid, src);
  const winner   = src[sid] || null;
  const rec      = mode === 'results' ? getRecord(sid) : null;

  function teamRow(key, wins) {
    if (!key) return `<div class="team-row tbd-row"><span class="seed-num">?</span><span class="team-name">TBD</span></div>`;
    const t = TEAMS[key];
    const isW = winner === key;
    const isE = winner && winner !== key;
    const leading = rec && !winner && wins > (key === t1 ? rec.t2Wins : rec.t1Wins);
    return `<div class="team-row ${isW ? 'is-winner' : ''} ${isE ? 'is-elim' : ''}"
                 data-team="${key}" style="--tc:${t.color}">
      <span class="seed-num">${t.seed ?? ''}</span>
      <span class="team-name">${t.name}</span>
      ${rec ? `<span class="series-wins ${leading || isW ? 'wins-lead' : ''}">${wins}</span>` : ''}
      ${isW ? '<span class="win-mark">✓</span>' : ''}
    </div>`;
  }

  const t1Wins = rec ? rec.t1Wins : 0;
  const t2Wins = rec ? rec.t2Wins : 0;

  return `
    <div class="matchup-card" data-series="${sid}" data-mode="${mode}">
      ${teamRow(t1, t1Wins)}
      <div class="series-divider"></div>
      ${teamRow(t2, t2Wins)}
    </div>`;
}

// ============================================================
// LEADERBOARD TAB
// ============================================================

function renderLeaderboard() {
  const el = document.getElementById('tab-leaderboard');

  if (state.participants.length === 0) {
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
        ${[1,2,3,4].map(r =>
          `<span>${ROUND_NAMES[r]}: <strong>${ROUND_POINTS[r]} pt${ROUND_POINTS[r] > 1 ? 's' : ''}</strong></span>`
        ).join(' · ')}
      </div>
      <table class="leaderboard-table">
        <thead>
          <tr><th>#</th><th>Name</th><th>R1</th><th>R2</th><th>CF</th><th>Finals</th><th>Total</th></tr>
        </thead>
        <tbody>
          ${rows.map((p, i) => {
            const picks = state.picks[p.id] || {};
            const rs = [0, 0, 0, 0];
            for (const def of SERIES) {
              const actual = state.results[def.id];
              const picked = picks[def.id];
              if (actual && picked && actual === picked) rs[def.r - 1] += ROUND_POINTS[def.r];
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
      <div class="pick-breakdown">
        <h3>Pick Details</h3>
        ${renderPickBreakdown(rows)}
      </div>
    </div>`;
}

function renderPickBreakdown(rows) {
  if (!rows.length) return '';
  let html = '';
  for (const r of [1, 2, 3, 4]) {
    const series = SERIES.filter(s => s.r === r && isSeriesAvailable(s.id));
    if (!series.length) continue;
    html += `<div class="breakdown-round"><h4>${ROUND_NAMES[r]}</h4><div class="breakdown-grid">`;
    for (const def of series) {
      const actual = state.results[def.id];
      const [t1, t2] = resolveTeams(def.id, state.results);
      const t1Name = t1 ? TEAMS[t1].abbr : 'TBD';
      const t2Name = t2 ? TEAMS[t2].abbr : 'TBD';
      html += `<div class="breakdown-series">
        <div class="series-title">${t1Name} vs ${t2Name}</div>
        <div class="actual-result">Result: ${actual
          ? `<strong style="color:${TEAMS[actual].color}">${TEAMS[actual].abbr}</strong>`
          : 'Pending'}</div>
        <div class="picks-list">
          ${rows.map(p => {
            const pick  = (state.picks[p.id] || {})[def.id];
            const ok    = actual && pick && actual === pick;
            const wrong = actual && pick && actual !== pick;
            return `<span class="pick-chip ${ok ? 'pick-correct' : wrong ? 'pick-wrong' : 'pick-pending'}" title="${p.name}">
              ${p.name.split(' ')[0]}: ${pick ? TEAMS[pick]?.abbr || pick : '?'}
            </span>`;
          }).join('')}
        </div>
      </div>`;
    }
    html += '</div></div>';
  }
  return html;
}

// ============================================================
// EXCEL EXPORT  (client-side via SheetJS)
// ============================================================

function downloadExcel() {
  if (typeof XLSX === 'undefined') {
    alert('Excel library not loaded. Check your internet connection and try again.');
    return;
  }

  const wb = XLSX.utils.book_new();

  // --- Summary sheet: series as rows, users as columns ---
  const headers = ['Round', 'Series', ...state.participants.map(p => p.name), 'Actual Winner'];
  const summaryRows = SERIES
    .filter(s => isSeriesAvailable(s.id))
    .map(def => {
      const [t1, t2] = resolveTeams(def.id, state.results);
      const label  = `${t1 ? TEAMS[t1].abbr : 'TBD'} vs ${t2 ? TEAMS[t2].abbr : 'TBD'}`;
      const actual = state.results[def.id];
      return [
        ROUND_NAMES[def.r],
        label,
        ...state.participants.map(p => {
          const pick = (state.picks[p.id] || {})[def.id];
          return pick ? (TEAMS[pick]?.abbr || pick) : '';
        }),
        actual ? (TEAMS[actual]?.abbr || actual) : '',
      ];
    });

  const summarySheet = XLSX.utils.aoa_to_sheet([headers, ...summaryRows]);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // --- One sheet per participant ---
  for (const p of state.participants) {
    const sheetRows = [['Round', 'Series', 'Pick', 'Actual Result', 'Points']];
    for (const def of SERIES) {
      if (!isSeriesAvailable(def.id)) continue;
      const [t1, t2] = resolveTeams(def.id, state.results);
      const pick   = (state.picks[p.id] || {})[def.id];
      const actual = state.results[def.id];
      const pts    = actual && pick && actual === pick ? ROUND_POINTS[def.r] : '';
      sheetRows.push([
        ROUND_NAMES[def.r],
        `${t1 ? TEAMS[t1].abbr : 'TBD'} vs ${t2 ? TEAMS[t2].abbr : 'TBD'}`,
        pick ? (TEAMS[pick]?.abbr || pick) : '',
        actual ? (TEAMS[actual]?.abbr || actual) : '',
        pts,
      ]);
    }
    // Add totals row
    const { score, correct } = computeScore(p.id);
    sheetRows.push(['', 'TOTAL', '', `${correct} correct`, score]);

    const sheet = XLSX.utils.aoa_to_sheet(sheetRows);
    const safeName = p.name.replace(/[\\/*?[\]:]/g, '_').slice(0, 31);
    XLSX.utils.book_append_sheet(wb, sheet, safeName);
  }

  XLSX.writeFile(wb, `NBA_Bracket_2026_${new Date().toISOString().slice(0,10)}.xlsx`);
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
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Login form
  document.getElementById('login-btn').addEventListener('click', loginUser);
  document.getElementById('login-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') loginUser();
  });

  // Check if already logged in, else show overlay
  initLogin();

  // Fetch live scores in background (non-blocking)
  fetchScores();
});
