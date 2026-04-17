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
  // Play-In candidates for 8-seeds (tonight's games, Apr 17)
  ORL: { name: 'Orlando Magic',            abbr: 'ORL', conf: 'East', color: '#0077C0' },
  CHA: { name: 'Charlotte Hornets',        abbr: 'CHA', conf: 'East', color: '#00788C' },
  GSW: { name: 'Golden State Warriors',    abbr: 'GSW', conf: 'West', color: '#1D428A' },
  PHX: { name: 'Phoenix Suns',             abbr: 'PHX', conf: 'West', color: '#E56020' },
};

// Play-in games still in progress — these determine the 8-seeds
// East 8-seed: Charlotte Hornets @ Orlando Magic  (7:30 PM ET, Apr 17)
// West 8-seed: Golden State Warriors @ Phoenix Suns (10:00 PM ET, Apr 17)
const PLAYIN = {
  E8: { label: 'East #8 Seed', teamA: 'ORL', teamB: 'CHA', game: 'Charlotte @ Orlando — 7:30 PM ET' },
  W8: { label: 'West #8 Seed', teamA: 'GSW', teamB: 'PHX', game: 'Golden State @ Phoenix — 10:00 PM ET' },
};

// ============================================================
// BRACKET STRUCTURE
// ============================================================
// Round 1 series use t1/t2 for fixed teams, or t2Slot for a play-in slot (E8/W8).
// Rounds 2–4 use from[] to reference feeder series.
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

const SERIES_MAP = Object.fromEntries(SERIES.map(s => [s.id, s]));
const ROUND_NAMES  = ['', 'First Round', 'Conf. Semifinals', 'Conf. Finals', 'NBA Finals'];
const ROUND_POINTS = [0, 1, 2, 4, 8];

// ============================================================
// STATE
// ============================================================
const STORAGE_KEY = 'nba-bracket-2026';

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return { results: {}, participants: [], picks: {}, playIn: { E8: null, W8: null } };
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ============================================================
// LIVE SCORES (fetched from data/scores.json via GitHub Actions)
// ============================================================

let scoresData = null;

async function fetchScores() {
  try {
    const resp = await fetch('data/scores.json?_=' + Date.now());
    if (!resp.ok) return;
    scoresData = await resp.json();
    // Re-render whichever tab is active so records appear
    if (RENDERERS[activeTab]) RENDERERS[activeTab]();
  } catch (_) {
    // Silently fail — scores are optional display info
  }
}

// Returns { t1Wins, t2Wins } for a series, or null if no data yet.
function getRecord(sid) {
  if (!scoresData?.records) return null;
  const [t1, t2] = resolveTeams(sid, state.results);
  if (!t1 || !t2) return null;
  const a1 = TEAMS[t1]?.abbr;
  const a2 = TEAMS[t2]?.abbr;
  if (!a1 || !a2) return null;
  const key = [a1, a2].sort().join('-');
  const rec = scoresData.records[key];
  if (!rec) return null;
  return { t1Wins: rec[a1] ?? 0, t2Wins: rec[a2] ?? 0 };
}

// ============================================================
// BRACKET LOGIC
// ============================================================

// Get [t1, t2] team keys for a series, resolved through a given winner map.
// For picks mode, `src` is a participant's picks; for results mode, src = state.results.
function resolveTeams(seriesId, src) {
  const def = SERIES_MAP[seriesId];
  if (def.t1) {
    // Round 1 — t2 may be fixed or a play-in slot
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

// ============================================================
// RENDERING HELPERS
// ============================================================

function teamBadge(key, isWinner = false, isEliminated = false) {
  if (!key) return `<span class="team-slot tbd">TBD</span>`;
  const t = TEAMS[key];
  const cls = ['team-slot', isWinner ? 'winner' : '', isEliminated ? 'eliminated' : ''].join(' ').trim();
  return `<span class="${cls}" style="--team-color:${t.color}">
    <span class="seed">${t.seed}</span>
    <span class="name">${t.abbr}</span>
  </span>`;
}

// ============================================================
// PLAY-IN BANNER
// ============================================================

function renderPlayInBanner() {
  const allSet = state.playIn.E8 && state.playIn.W8;
  if (allSet) return ''; // Banner disappears once both are set

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
      </div>
    `;
  }

  return `
    <div class="playin-banner">
      <div class="playin-banner-title">⏳ Play-In Tournament — Tonight, April 17</div>
      <div class="playin-banner-sub">Set the 8-seeds once the games finish to unlock the full bracket.</div>
      <div class="playin-slots">
        ${slotHtml('E8')}
        ${slotHtml('W8')}
      </div>
    </div>
  `;
}

// ============================================================
// BRACKET TAB
// ============================================================

function renderBracket() {
  const el = document.getElementById('tab-bracket');

  // Build bracket groups for display
  // East groups (top half): pairs of R1 → R2 → ECF → Finals
  // West groups (bottom half): pairs of R1 → R2 → WCF → Finals

  el.innerHTML = `
    ${renderPlayInBanner()}
    <div class="bracket-instructions">
      <p>Click a team to set the series winner. Click again to clear.
        ${scoresData
          ? `<span class="scores-updated">Series records updated ${scoresData.updated.replace('T', ' ').replace('Z', ' UTC')}</span>`
          : ''}
      </p>
    </div>
    <div class="bracket-wrap">
      <div class="conf-label east-label">EASTERN CONFERENCE</div>
      <div class="conf-label west-label">WESTERN CONFERENCE</div>

      <div class="bracket">
        <!-- East half -->
        <div class="half east">
          ${renderColumn(['E1v8','E4v5','E2v7','E3v6'], 1, 'east', state.results)}
          ${renderColumn(['EQ1','EQ2'], 2, 'east', state.results)}
          ${renderColumn(['ECF'], 3, 'east', state.results)}
        </div>

        <!-- Finals -->
        <div class="finals-col">
          <div class="round-label">NBA Finals</div>
          ${renderSeries('FINALS', state.results, 'results')}
          <div class="champion-slot" id="champion-slot">
            ${state.results['FINALS']
              ? `<div class="champion-badge" style="--team-color:${TEAMS[state.results['FINALS']].color}">
                   🏆 ${TEAMS[state.results['FINALS']].name}
                 </div>`
              : '<div class="champion-tbd">🏆 Champion TBD</div>'}
          </div>
        </div>

        <!-- West half -->
        <div class="half west">
          ${renderColumn(['ECF_mirror'], 3, 'west', state.results, 'WCF')}
          ${renderColumn(['WQ1','WQ2'], 2, 'west', state.results)}
          ${renderColumn(['W1v8','W4v5','W2v7','W3v6'], 1, 'west', state.results)}
        </div>
      </div>

      <div class="round-labels-row">
        <div class="round-labels east-rounds">
          <span>First Round</span>
          <span>Semifinals</span>
          <span>Conf. Finals</span>
        </div>
        <div class="round-labels-spacer"></div>
        <div class="round-labels west-rounds">
          <span>Conf. Finals</span>
          <span>Semifinals</span>
          <span>First Round</span>
        </div>
      </div>
    </div>
  `;

  el.querySelectorAll('.matchup-card[data-series]').forEach(card => {
    card.querySelectorAll('.team-row[data-team]').forEach(row => {
      row.addEventListener('click', () => {
        const sid = card.dataset.series;
        const tid = row.dataset.team;
        const mode = card.dataset.mode;
        if (mode === 'results') handleResultClick(sid, tid);
      });
    });
  });

  el.querySelectorAll('.playin-btn[data-slot]').forEach(btn => {
    btn.addEventListener('click', () => {
      const slot = btn.dataset.slot;
      const team = btn.dataset.team;
      // Toggle off if already selected
      if (state.playIn[slot] === team) {
        state.playIn[slot] = null;
        // Clear any results that used this 8-seed
        const seriesId = slot === 'E8' ? 'E1v8' : 'W1v8';
        clearDownstream(seriesId, state.results);
      } else {
        state.playIn[slot] = team;
      }
      save();
      renderBracket();
    });
  });
}

function renderColumn(ids, round, side, src, overrideId) {
  // overrideId: render a different series than the id in position (used for WCF mirror)
  const label = round === 1 ? 'First Round' : round === 2 ? 'Semifinals' : 'Conf. Finals';
  const realIds = overrideId ? [overrideId] : ids;
  return `
    <div class="bracket-col r${round} ${side}">
      <div class="round-label">${label}</div>
      <div class="col-series">
        ${realIds.map(id => renderSeries(id, src, 'results')).join('')}
      </div>
    </div>
  `;
}

function renderSeries(sid, src, mode) {
  const [t1, t2] = resolveTeams(sid, src);
  const winner = src[sid] || null;
  const rec = (mode === 'results') ? getRecord(sid) : null;

  function teamRow(key, wins) {
    if (!key) return `<div class="team-row tbd-row"><span class="seed-num">?</span><span class="team-name">TBD</span></div>`;
    const t = TEAMS[key];
    const isW = winner === key;
    const isE = winner && winner !== key;
    const isLeading = rec && !winner && wins > (key === t1 ? rec.t2Wins : rec.t1Wins);
    return `<div class="team-row ${isW ? 'is-winner' : ''} ${isE ? 'is-elim' : ''}"
                 data-team="${key}"
                 style="--tc:${t.color}">
      <span class="seed-num">${t.seed ?? ''}</span>
      <span class="team-name">${t.name}</span>
      ${rec ? `<span class="series-wins ${isLeading || isW ? 'wins-lead' : ''}">${wins}</span>` : ''}
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
    </div>
  `;
}

function handleResultClick(sid, tid) {
  if (state.results[sid] === tid) {
    // Toggle off – clear this result and all downstream
    clearDownstream(sid, state.results);
  } else {
    state.results[sid] = tid;
    // Clear any downstream results that are now invalid
    propagateClear(sid, state.results);
  }
  save();
  renderBracket();
  renderLeaderboard();
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
      // If the current pick is no longer a valid team in this series, clear it
      if (cur && cur !== t1 && cur !== t2) {
        delete src[def.id];
        propagateClear(def.id, src);
      }
    }
  }
}

// ============================================================
// PICKS TAB
// ============================================================

let picksParticipant = null;

function renderPicksTab() {
  const el = document.getElementById('tab-picks');

  if (state.participants.length === 0) {
    el.innerHTML = `<div class="empty-state">Add participants first on the <strong>Participants</strong> tab.</div>`;
    return;
  }

  // Default to first participant if none selected
  if (!picksParticipant || !state.participants.find(p => p.id === picksParticipant)) {
    picksParticipant = state.participants[0].id;
  }

  const participant = state.participants.find(p => p.id === picksParticipant);
  const picks = state.picks[picksParticipant] || {};

  el.innerHTML = `
    <div class="picks-header">
      <label for="picks-select">Editing picks for:</label>
      <select id="picks-select">
        ${state.participants.map(p =>
          `<option value="${p.id}" ${p.id === picksParticipant ? 'selected' : ''}>${p.name}</option>`
        ).join('')}
      </select>
      <button id="clear-picks-btn" class="btn-danger-sm">Clear All Picks</button>
    </div>
    <div class="picks-instructions">Click a team to pick them as series winner. Picks cascade through the bracket.</div>

    <div class="picks-bracket">
      ${renderPicksBracket(picks)}
    </div>
  `;

  el.querySelector('#picks-select').addEventListener('change', e => {
    picksParticipant = e.target.value;
    renderPicksTab();
  });

  el.querySelector('#clear-picks-btn').addEventListener('click', () => {
    if (confirm(`Clear all picks for ${participant.name}?`)) {
      state.picks[picksParticipant] = {};
      save();
      renderPicksTab();
      renderLeaderboard();
    }
  });

  el.querySelectorAll('.matchup-card[data-series]').forEach(card => {
    card.querySelectorAll('.team-row[data-team]').forEach(row => {
      row.addEventListener('click', () => {
        const sid = card.dataset.series;
        const tid = row.dataset.team;
        handlePickClick(sid, tid);
      });
    });
  });
}

function renderPicksBracket(picks) {
  function col(ids, round, side, overrideId) {
    const label = round === 1 ? 'First Round' : round === 2 ? 'Semifinals' : 'Conf. Finals';
    const realIds = overrideId ? [overrideId] : ids;
    return `
      <div class="bracket-col r${round} ${side}">
        <div class="round-label">${label}</div>
        <div class="col-series">
          ${realIds.map(id => renderSeries(id, picks, 'picks')).join('')}
        </div>
      </div>
    `;
  }

  return `
    <div class="bracket-wrap">
      <div class="conf-label east-label">EASTERN CONFERENCE</div>
      <div class="conf-label west-label">WESTERN CONFERENCE</div>
      <div class="bracket">
        <div class="half east">
          ${col(['E1v8','E4v5','E2v7','E3v6'], 1, 'east')}
          ${col(['EQ1','EQ2'], 2, 'east')}
          ${col(['ECF'], 3, 'east')}
        </div>
        <div class="finals-col">
          <div class="round-label">NBA Finals</div>
          ${renderSeries('FINALS', picks, 'picks')}
          <div class="champion-slot">
            ${picks['FINALS']
              ? `<div class="champion-badge" style="--team-color:${TEAMS[picks['FINALS']].color}">🏆 ${TEAMS[picks['FINALS']].name}</div>`
              : '<div class="champion-tbd">🏆 Pick a champion</div>'}
          </div>
        </div>
        <div class="half west">
          ${col([], 3, 'west', 'WCF')}
          ${col(['WQ1','WQ2'], 2, 'west')}
          ${col(['W1v8','W4v5','W2v7','W3v6'], 1, 'west')}
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
    </div>
  `;
}

function handlePickClick(sid, tid) {
  if (!state.picks[picksParticipant]) state.picks[picksParticipant] = {};
  const picks = state.picks[picksParticipant];

  if (picks[sid] === tid) {
    clearDownstream(sid, picks);
  } else {
    picks[sid] = tid;
    propagateClear(sid, picks);
  }
  save();
  renderPicksTab();
  renderLeaderboard();
}

// ============================================================
// PARTICIPANTS TAB
// ============================================================

function renderParticipants() {
  const el = document.getElementById('tab-participants');
  el.innerHTML = `
    <div class="participants-form">
      <h2>Participants</h2>
      <div class="add-form">
        <input id="new-name" type="text" placeholder="Participant name" maxlength="40" />
        <button id="add-btn" class="btn-primary">Add</button>
      </div>
      <ul class="participants-list">
        ${state.participants.length === 0
          ? '<li class="empty-item">No participants yet.</li>'
          : state.participants.map(p => {
              const { score, correct, possible } = computeScore(p.id);
              return `<li>
                <span class="p-name">${p.name}</span>
                <span class="p-stats">${possible} picks · ${correct} correct · ${score} pts</span>
                <button class="btn-danger-sm remove-btn" data-id="${p.id}">Remove</button>
              </li>`;
            }).join('')}
      </ul>
    </div>
  `;

  el.querySelector('#add-btn').addEventListener('click', addParticipant);
  el.querySelector('#new-name').addEventListener('keydown', e => { if (e.key === 'Enter') addParticipant(); });

  el.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => removeParticipant(btn.dataset.id));
  });
}

function addParticipant() {
  const input = document.querySelector('#new-name');
  const name = input.value.trim();
  if (!name) return;
  if (state.participants.find(p => p.name.toLowerCase() === name.toLowerCase())) {
    alert('A participant with that name already exists.');
    return;
  }
  const id = 'p_' + Date.now();
  state.participants.push({ id, name });
  state.picks[id] = {};
  input.value = '';
  save();
  renderParticipants();
  renderLeaderboard();
}

function removeParticipant(id) {
  const p = state.participants.find(p => p.id === id);
  if (!p) return;
  if (!confirm(`Remove ${p.name} and all their picks?`)) return;
  state.participants = state.participants.filter(p => p.id !== id);
  delete state.picks[id];
  save();
  renderParticipants();
  renderLeaderboard();
}

// ============================================================
// LEADERBOARD TAB
// ============================================================

function renderLeaderboard() {
  const el = document.getElementById('tab-leaderboard');

  if (state.participants.length === 0) {
    el.innerHTML = `<div class="empty-state">Add participants on the <strong>Participants</strong> tab to see standings.</div>`;
    return;
  }

  const rows = state.participants
    .map(p => ({ ...p, ...computeScore(p.id) }))
    .sort((a, b) => b.score - a.score || b.correct - a.correct);

  // Per-round breakdown header
  const rounds = [1, 2, 3, 4];

  el.innerHTML = `
    <div class="leaderboard-wrap">
      <h2>Leaderboard</h2>
      <div class="scoring-legend">
        ${rounds.map(r => `<span>${ROUND_NAMES[r]}: <strong>${ROUND_POINTS[r]} pt${ROUND_POINTS[r] > 1 ? 's' : ''}</strong></span>`).join(' · ')}
      </div>
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>R1</th>
            <th>R2</th>
            <th>CF</th>
            <th>Finals</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((p, i) => {
            const picks = state.picks[p.id] || {};
            let roundScores = [0, 0, 0, 0];
            for (const def of SERIES) {
              const actual = state.results[def.id];
              const picked = picks[def.id];
              if (actual && picked && actual === picked) {
                roundScores[def.r - 1] += ROUND_POINTS[def.r];
              }
            }
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
            return `<tr class="${i === 0 && p.score > 0 ? 'leader-row' : ''}">
              <td>${medal || (i + 1)}</td>
              <td class="p-name-cell">${p.name}</td>
              ${roundScores.map(s => `<td>${s > 0 ? s : '–'}</td>`).join('')}
              <td class="total-cell">${p.score}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>

      <div class="pick-breakdown">
        <h3>Pick Details</h3>
        ${renderPickBreakdown(rows)}
      </div>
    </div>
  `;
}

function renderPickBreakdown(rows) {
  if (!rows.length) return '';

  // Show each round's series with who picked what
  const rounds = [1, 2, 3, 4];
  let html = '';

  for (const r of rounds) {
    const seriesInRound = SERIES.filter(s => s.r === r);
    html += `<div class="breakdown-round"><h4>${ROUND_NAMES[r]}</h4><div class="breakdown-grid">`;

    for (const def of seriesInRound) {
      const actual = state.results[def.id];
      const [t1, t2] = resolveTeams(def.id, state.results);

      const t1Name = t1 ? TEAMS[t1].abbr : 'TBD';
      const t2Name = t2 ? TEAMS[t2].abbr : 'TBD';

      html += `<div class="breakdown-series">
        <div class="series-title">${t1Name} vs ${t2Name}</div>
        <div class="actual-result">Result: ${actual ? `<strong style="color:${TEAMS[actual].color}">${TEAMS[actual].abbr}</strong>` : 'Pending'}</div>
        <div class="picks-list">
          ${rows.map(p => {
            const picks = state.picks[p.id] || {};
            const pick = picks[def.id];
            const correct = actual && pick && actual === pick;
            const wrong = actual && pick && actual !== pick;
            return `<span class="pick-chip ${correct ? 'pick-correct' : wrong ? 'pick-wrong' : 'pick-pending'}"
                         title="${p.name}">
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
// TAB NAVIGATION
// ============================================================

const TABS = ['bracket', 'picks', 'participants', 'leaderboard'];
const RENDERERS = {
  bracket: renderBracket,
  picks: renderPicksTab,
  participants: renderParticipants,
  leaderboard: renderLeaderboard,
};

let activeTab = 'bracket';

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(el => el.classList.toggle('active', el.id === `tab-${tab}`));
  RENDERERS[tab]();
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  switchTab('bracket');
  fetchScores();
});
