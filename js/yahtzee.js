'use strict';

// ── Category definitions ─────────────────────────────────────
const UPPER = [
  { id: 'aces',   label: 'Aces',   face: 1 },
  { id: 'twos',   label: 'Twos',   face: 2 },
  { id: 'threes', label: 'Threes', face: 3 },
  { id: 'fours',  label: 'Fours',  face: 4 },
  { id: 'fives',  label: 'Fives',  face: 5 },
  { id: 'sixes',  label: 'Sixes',  face: 6 },
];

const LOWER = [
  { id: '3ok',    label: '3 of a Kind',  type: 'variable' },
  { id: '4ok',    label: '4 of a Kind',  type: 'variable' },
  { id: 'fh',     label: 'Full House',   type: 'fixed', value: 25 },
  { id: 'ss',     label: 'Sm. Straight', type: 'fixed', value: 30 },
  { id: 'ls',     label: 'Lg. Straight', type: 'fixed', value: 40 },
  { id: 'yah',    label: 'YAHTZEE!',     type: 'fixed', value: 50 },
  { id: 'chance', label: 'Chance',       type: 'variable' },
];

const ALL_CATS = [...UPPER, ...LOWER];
const STORAGE_KEY = 'pip_yahtzee_v1';

// ── State ────────────────────────────────────────────────────
let state = { activeGame: false, players: [], scores: [], bonuses: [] };
let picking = null; // { pIdx, catId }

// ── Persistence ──────────────────────────────────────────────
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s?.activeGame) { state = s; showGame(); return; }
    }
  } catch (_) {}
  showSetup();
}

// ── Setup screen ─────────────────────────────────────────────
function showSetup() {
  document.getElementById('setup-screen').style.display = 'flex';
  document.getElementById('game-screen').style.display  = 'none';
}

function addPlayer() {
  const list = document.getElementById('player-list');
  if (list.children.length >= 8) return;
  const n   = list.children.length + 1;
  const row = document.createElement('div');
  row.className = 'yah-player-row';
  row.innerHTML = `
    <input class="yah-input" type="text" value="Player ${n}" autocomplete="off">
    <button class="yah-del-btn" onclick="this.parentElement.remove()" aria-label="Remove">×</button>
  `;
  list.appendChild(row);
}

function startGame() {
  const inputs = document.querySelectorAll('#player-list .yah-input');
  const players = Array.from(inputs).map(i => i.value.trim() || 'Player');
  if (!players.length) return;

  const blank = Object.fromEntries(ALL_CATS.map(c => [c.id, null]));
  state = {
    activeGame: true,
    players,
    scores:  players.map(() => ({ ...blank })),
    bonuses: players.map(() => 0),
  };
  save();
  showGame();
}

// ── Game screen ───────────────────────────────────────────────
function showGame() {
  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('game-screen').style.display  = 'flex';
  renderTable();
}

function newGame() {
  if (confirm('Start a new game? Current scores will be cleared.')) {
    state.activeGame = false;
    save();
    showSetup();
  }
}

window.showRules = function showRules() {
  const overlay = document.getElementById('rules-overlay');
  if (overlay) overlay.classList.add('visible');
};

window.hideRules = function hideRules() {
  const overlay = document.getElementById('rules-overlay');
  if (overlay) overlay.classList.remove('visible');
};

// ── Score calculations ────────────────────────────────────────
function upperRaw(p)   { return UPPER.reduce((s, c) => s + (state.scores[p][c.id] ?? 0), 0); }
function upperBonus(p) { return upperRaw(p) >= 63 ? 35 : 0; }
function upperTotal(p) { return upperRaw(p) + upperBonus(p); }
function lowerRaw(p)   { return LOWER.reduce((s, c) => s + (state.scores[p][c.id] ?? 0), 0); }
function lowerTotal(p) { return lowerRaw(p) + state.bonuses[p] * 100; }
function grandTotal(p) { return upperTotal(p) + lowerTotal(p); }
function isComplete(p) { return ALL_CATS.every(c => state.scores[p][c.id] !== null); }
function gameOver()    { return state.players.every((_, i) => isComplete(i)); }

// ── Rendering helpers ─────────────────────────────────────────
function esc(s) {
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

function scoreCell(pIdx, catId) {
  const v   = state.scores[pIdx][catId];
  const cls = v === null ? 'cell-empty' : v === 0 ? 'cell-scratched' : 'cell-scored';
  const txt = v === null ? '' : v === 0 ? '—' : v;
  return `<td class="sc ${cls}" onclick="openPicker(${pIdx},'${catId}')" tabindex="0" role="button">${txt}</td>`;
}

// ── Main table render ─────────────────────────────────────────
function renderTable() {
  const tbl = document.getElementById('score-table');
  if (!tbl) return;

  const n = state.players.length;
  const totals  = state.players.map((_, i) => grandTotal(i));
  const winIdx  = gameOver() ? totals.indexOf(Math.max(...totals)) : -1;

  let h = '';

  // THEAD
  h += '<thead><tr class="th-row">';
  h += '<th class="th-cat">Category</th>';
  state.players.forEach((name, i) => {
    h += `<th class="th-pl ${isComplete(i) ? 'th-done' : ''}">${esc(name)}</th>`;
  });
  h += '</tr></thead><tbody>';

  // ── UPPER SECTION ─────────────────────────────────────────
  h += `<tr class="sec-hdr sec-red"><td colspan="${n + 1}"><span>UPPER SECTION</span></td></tr>`;

  UPPER.forEach(cat => {
    h += `<tr class="cat-row"><td class="td-cat">${cat.label}<span class="cat-sub">${cat.face}s only</span></td>`;
    state.players.forEach((_, p) => { h += scoreCell(p, cat.id); });
    h += '</tr>';
  });

  // Progress toward bonus
  h += `<tr class="prog-row"><td class="td-cat td-prog-lbl">Bonus Progress</td>`;
  state.players.forEach((_, p) => {
    const raw  = upperRaw(p);
    const done = raw >= 63;
    const pct  = Math.min(100, Math.round(raw / 63 * 100));
    const need = done ? 0 : 63 - raw;
    h += `<td class="td-prog ${done ? 'prog-done' : ''}">
      <span class="prog-frac">${raw}/63</span>
      <div class="prog-track"><div class="prog-fill" style="width:${pct}%"></div></div>
      <span class="prog-lbl">${done ? '✓ Bonus!' : need + ' away'}</span>
    </td>`;
  });
  h += '</tr>';

  // Bonus row (display only)
  h += `<tr class="bonus-disp-row"><td class="td-cat">+35 Bonus</td>`;
  state.players.forEach((_, p) => {
    const got = upperRaw(p) >= 63;
    h += `<td class="td-bonus-disp ${got ? 'bonus-yes' : 'bonus-no'}">${got ? '+35' : '—'}</td>`;
  });
  h += '</tr>';

  // Upper subtotal
  h += `<tr class="sub-row"><td class="td-cat td-sub-lbl">Upper Total</td>`;
  state.players.forEach((_, p) => {
    h += `<td class="td-sub">${upperTotal(p)}</td>`;
  });
  h += '</tr>';

  // ── LOWER SECTION ─────────────────────────────────────────
  h += `<tr class="sec-hdr sec-navy"><td colspan="${n + 1}"><span>LOWER SECTION</span></td></tr>`;

  LOWER.forEach(cat => {
    const hint = cat.type === 'fixed' ? `<span class="cat-sub">${cat.value} pts</span>` : '';
    h += `<tr class="cat-row"><td class="td-cat">${cat.label}${hint}</td>`;
    state.players.forEach((_, p) => { h += scoreCell(p, cat.id); });
    h += '</tr>';
  });

  // Yahtzee bonus counter row
  h += `<tr class="yb-row"><td class="td-cat">Yahtzee Bonus<span class="cat-sub">+100 each</span></td>`;
  state.players.forEach((_, p) => {
    const cnt = state.bonuses[p];
    h += `<td class="td-yb" onclick="openPicker(${p},'__yb__')" tabindex="0" role="button">
      <span class="yb-x">×${cnt}</span>
      ${cnt > 0 ? `<span class="yb-pts">+${cnt * 100}</span>` : ''}
    </td>`;
  });
  h += '</tr>';

  // Lower subtotal
  h += `<tr class="sub-row"><td class="td-cat td-sub-lbl">Lower Total</td>`;
  state.players.forEach((_, p) => {
    h += `<td class="td-sub">${lowerTotal(p)}</td>`;
  });
  h += '</tr>';

  // Grand total
  h += `<tr class="grand-row"><td class="td-cat td-grand-lbl">GRAND TOTAL</td>`;
  state.players.forEach((_, p) => {
    const isWin = p === winIdx;
    h += `<td class="td-grand ${isWin ? 'td-winner' : ''}">${isWin ? '★ ' : ''}${totals[p]}</td>`;
  });
  h += '</tr></tbody>';

  tbl.innerHTML = h;
}

// ── Picker ────────────────────────────────────────────────────
function openPicker(pIdx, catId) {
  picking = { pIdx, catId };
  renderPicker();
  document.getElementById('picker-overlay').classList.add('vis');
  document.getElementById('picker-panel').classList.add('open');
}

function closePicker() {
  picking = null;
  document.getElementById('picker-overlay').classList.remove('vis');
  document.getElementById('picker-panel').classList.remove('open');
}

function renderPicker() {
  if (!picking) return;
  const { pIdx, catId } = picking;
  const playerName = esc(state.players[pIdx]);
  const content = document.getElementById('picker-content');

  let h = `<div class="pk-header">
    <span class="pk-player">${playerName}</span>
    <button class="pk-close" onclick="closePicker()" aria-label="Close">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    </button>
  </div>`;

  if (catId === '__yb__') {
    // Yahtzee bonus counter
    const cnt = state.bonuses[pIdx];
    h += `<div class="pk-cat">Yahtzee Bonus <span class="pk-hint">+100 each</span></div>
    <div class="pk-ybonus">
      <button class="pk-yb-ctrl pk-sub" onclick="adjBonus(${pIdx},-1)" ${cnt === 0 ? 'disabled' : ''} aria-label="Remove bonus">−</button>
      <div class="pk-yb-mid">
        <div class="pk-yb-n">×${cnt}</div>
        <div class="pk-yb-pts">+${cnt * 100} pts</div>
      </div>
      <button class="pk-yb-ctrl pk-add" onclick="adjBonus(${pIdx},1)" aria-label="Add bonus">+</button>
    </div>`;
  } else {
    const cat = ALL_CATS.find(c => c.id === catId);
    if (!cat) return;
    const cur = state.scores[pIdx][catId];

    h += `<div class="pk-cat">${cat.label}</div>`;

    if (cat.face) {
      // Upper section: scratch + 5 multiples
      h += `<div class="pk-grid">`;
      h += `<button class="pk-btn pk-scratch ${cur === 0 ? 'pk-sel' : ''}" onclick="setScore(${pIdx},'${catId}',0)">Scratch<br><small>0 pts</small></button>`;
      for (let i = 1; i <= 5; i++) {
        const v = i * cat.face;
        h += `<button class="pk-btn ${cur === v ? 'pk-sel' : ''}" onclick="setScore(${pIdx},'${catId}',${v})">${i}×<br><small>${v} pts</small></button>`;
      }
      h += `</div>`;

    } else if (cat.type === 'fixed') {
      // Fixed score: Score or Scratch
      h += `<div class="pk-grid pk-grid-2">
        <button class="pk-btn pk-main ${cur === cat.value ? 'pk-sel' : ''}" onclick="setScore(${pIdx},'${catId}',${cat.value})">Score<br><small>${cat.value} pts</small></button>
        <button class="pk-btn pk-scratch ${cur === 0 ? 'pk-sel' : ''}" onclick="setScore(${pIdx},'${catId}',0)">Scratch<br><small>0 pts</small></button>
      </div>`;

    } else {
      // Variable score: scratch button + scrollable strip
      h += `<div class="pk-var-scratch">
        <button class="pk-btn pk-scratch pk-scratch-full ${cur === 0 ? 'pk-sel' : ''}" onclick="setScore(${pIdx},'${catId}',0)">Scratch (0 pts)</button>
      </div>
      <p class="pk-strip-label">Or select dice sum:</p>
      <div class="pk-strip" role="group" aria-label="Select score">`;
      for (let v = 5; v <= 30; v++) {
        h += `<button class="pk-strip-btn ${cur === v ? 'pk-sel' : ''}" onclick="setScore(${pIdx},'${catId}',${v})">${v}</button>`;
      }
      h += `</div>`;
    }
  }

  content.innerHTML = h;
}

function setScore(pIdx, catId, score) {
  state.scores[pIdx][catId] = score;
  save();
  closePicker();
  if (catId === 'yah' && score === 50) showYahtzeeOverlay();
  renderTable();
}

function adjBonus(pIdx, delta) {
  state.bonuses[pIdx] = Math.max(0, (state.bonuses[pIdx] || 0) + delta);
  save();
  if (delta > 0) showYahtzeeOverlay();
  renderPicker(); // refresh counts in-place
  renderTable();
}

function showYahtzeeOverlay() {
  const el = document.getElementById('yah-overlay');
  if (!el) return;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 2400);
}

// ── Boot ─────────────────────────────────────────────────────
window.addEventListener('load', function() {
  load();

  // Close rules on background click
  const rulesOverlay = document.getElementById('rules-overlay');
  if (rulesOverlay) {
    rulesOverlay.addEventListener('click', function(e) {
      if (e.target === rulesOverlay) hideRules();
    });
  }
});
