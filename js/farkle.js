'use strict';

const WIN = 10000;
const OPEN = 500;

const COMBOS = [
  { id: 's1',  pts: 100,  dice: 1, label: 'Single 1',      sub: '',        group: 'single' },
  { id: 's5',  pts: 50,   dice: 1, label: 'Single 5',      sub: '',        group: 'single' },
  { id: 't1',  pts: 1000, dice: 3, label: '1 · 1 · 1',     sub: '',        group: 'triple' },
  { id: 't2',  pts: 200,  dice: 3, label: '2 · 2 · 2',     sub: '',        group: 'triple' },
  { id: 't3',  pts: 300,  dice: 3, label: '3 · 3 · 3',     sub: '',        group: 'triple' },
  { id: 't4',  pts: 400,  dice: 3, label: '4 · 4 · 4',     sub: '',        group: 'triple' },
  { id: 't5',  pts: 500,  dice: 3, label: '5 · 5 · 5',     sub: '',        group: 'triple' },
  { id: 't6',  pts: 600,  dice: 3, label: '6 · 6 · 6',     sub: '',        group: 'triple' },
  { id: 'f4',  pts: 1000, dice: 4, label: '4 of a Kind',   sub: '',        group: 'multi'  },
  { id: 'f5',  pts: 2000, dice: 5, label: '5 of a Kind',   sub: '',        group: 'multi'  },
  { id: 'f6',  pts: 3000, dice: 6, label: '6 of a Kind',   sub: '',        group: 'full6'  },
  { id: 'str', pts: 1500, dice: 6, label: 'Straight (1–6)',sub: '',        group: 'full6'  },
  { id: '3pr', pts: 1500, dice: 6, label: '3 Pairs',       sub: '',        group: 'full6'  },
  { id: '2tr', pts: 2500, dice: 6, label: '2 Triplets',    sub: '',        group: 'full6'  },
];

let G = {};
let _toastTimer = null;

window.save = function save() {
  localStorage.setItem('farkle_v1', JSON.stringify(G));
};

window.load = function load() {
  const raw = localStorage.getItem('farkle_v1');
  if (raw) {
    try { G = JSON.parse(raw); } catch (e) { G = {}; }
  }
  if (G && G.players && G.players.length) {
    showGame();
    render();
  } else {
    showSetup();
  }
};

window.showSetup = function showSetup() {
  document.getElementById('setup-screen').style.display = '';
  document.getElementById('game-screen').style.display = 'none';
};

window.showGame = function showGame() {
  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('game-screen').style.display = 'flex';
};

window.addPlayer = function addPlayer() {
  const list = document.getElementById('player-list');
  const row = document.createElement('div');
  row.className = 'fk-player-row';
  row.innerHTML = '<input class="fk-input" type="text" placeholder="Player name" />';
  list.appendChild(row);
};

window.startGame = function startGame() {
  const inputs = document.querySelectorAll('#player-list .fk-input');
  const players = [];
  inputs.forEach(function(inp) {
    const name = inp.value.trim();
    if (name) {
      players.push({ name: name, total: 0, opened: false });
    }
  });
  if (players.length < 1) {
    toast('Add at least one player.');
    return;
  }
  G = {
    players: players,
    activeIdx: 0,
    turnTotal: 0,
    diceLeft: 6,
    finalRound: false,
    finalTurnIdx: null,
    gameOver: false,
    winner: null
  };
  save();
  showGame();
  render();
};

window.goHome = function goHome() {
  showSetup();
};

window.showRules = function showRules() {
  const overlay = document.getElementById('rules-overlay');
  if (overlay) overlay.classList.add('visible');
};

window.hideRules = function hideRules() {
  const overlay = document.getElementById('rules-overlay');
  if (overlay) overlay.classList.remove('visible');
};

window.newGame = function newGame() {
  localStorage.removeItem('farkle_v1');
  G = {};
  const list = document.getElementById('player-list');
  if (list) list.innerHTML = '';
  showSetup();
};

window.score = function score(id) {
  const c = COMBOS.find(function(x) { return x.id === id; });
  if (!c) return;
  if (c.dice > G.diceLeft) return;
  G.turnTotal += c.pts;
  G.diceLeft -= c.dice;
  if (G.diceLeft === 0) {
    triggerHotDice();
    return;
  }
  save();
  render();
};

window.triggerHotDice = function triggerHotDice() {
  const overlay = document.getElementById('hot-dice-overlay');
  if (overlay) overlay.classList.add('visible');
  setTimeout(function() {
    if (overlay) overlay.classList.remove('visible');
    G.diceLeft = 6;
    save();
    render();
  }, 2200);
};

window.bank = function bank() {
  if (G.gameOver || G.turnTotal === 0) return;
  const p = G.players[G.activeIdx];
  if (!p.opened && G.turnTotal < OPEN) {
    const need = OPEN - G.turnTotal;
    toast('Need ' + need.toLocaleString() + ' more pts to open.');
    return;
  }
  p.total += G.turnTotal;
  p.opened = true;
  if (p.total >= WIN && !G.finalRound) {
    G.finalRound = true;
    G.finalTurnIdx = G.activeIdx;
  }
  advance();
};

window.farkle = function farkle() {
  const p = G.players[G.activeIdx];
  toast(esc(p.name) + ' farkled! No points this turn.');
  G.turnTotal = 0;
  advance();
};

window.advance = function advance() {
  const next = (G.activeIdx + 1) % G.players.length;
  if (G.finalRound && next === G.finalTurnIdx) {
    endGame();
    return;
  }
  G.activeIdx = next;
  G.turnTotal = 0;
  G.diceLeft = 6;
  save();
  render();
  setTimeout(function() {
    const card = document.getElementById('pcard-' + next);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
};

window.endGame = function endGame() {
  let topIdx = 0;
  G.players.forEach(function(p, i) {
    if (p.total > G.players[topIdx].total) topIdx = i;
  });
  G.gameOver = true;
  G.winner = topIdx;
  save();
  render();
};

window.render = function render() {
  renderBoard();
  renderTurn();
  renderGrid();
  renderGameOver();
};

window.renderBoard = function renderBoard() {
  const board = document.getElementById('fk-scoreboard');
  if (!board) return;
  let html = '';
  G.players.forEach(function(p, i) {
    const isActive = i === G.activeIdx && !G.gameOver;
    const isWinner = G.gameOver && i === G.winner;
    const isFinalLeader = G.finalRound && i === G.finalTurnIdx;
    let classes = 'fk-pcard';
    if (isActive) classes += ' fk-active';
    if (isWinner) classes += ' fk-winner';
    if (!p.opened) classes += ' fk-locked';
    let badges = '';
    if (!p.opened) badges += '<span class="fk-ptag">locked</span>';
    if (isActive) badges += '<span class="fk-ptag fk-ptag-on">on deck</span>';
    if (isFinalLeader) badges += '<span class="fk-ptag fk-ptag-lead">leader</span>';
    html += '<div class="' + classes + '" id="pcard-' + i + '">';
    html += '<div class="fk-pcard-name">' + esc(p.name) + '</div>';
    html += '<div class="fk-pcard-score">' + p.total.toLocaleString() + '</div>';
    if (badges) html += '<div class="fk-pcard-badges">' + badges + '</div>';
    html += '</div>';
  });
  board.innerHTML = html;
};

window.renderTurn = function renderTurn() {
  const p = G.players[G.activeIdx];

  const nameEl = document.getElementById('fk-player-name');
  if (nameEl) nameEl.textContent = p.name;

  const totalEl = document.getElementById('fk-turn-total');
  if (totalEl) totalEl.textContent = G.turnTotal.toLocaleString();

  const diceEl = document.getElementById('fk-dice-count');
  if (diceEl) diceEl.textContent = G.diceLeft;

  const bankBtn = document.getElementById('fk-bank-btn');
  if (bankBtn) {
    const notOpen = !p.opened && G.turnTotal < OPEN;
    bankBtn.disabled = G.gameOver || G.turnTotal === 0;
    if (notOpen && G.turnTotal > 0) {
      bankBtn.classList.add('fk-bank-warn');
      const need = OPEN - G.turnTotal;
      bankBtn.textContent = 'Need ' + need.toLocaleString() + ' more to open';
    } else {
      bankBtn.classList.remove('fk-bank-warn');
      bankBtn.textContent = G.turnTotal > 0
        ? 'Bank ' + G.turnTotal.toLocaleString() + ' pts'
        : 'Bank';
    }
  }

  const finalNotice = document.getElementById('fk-final-notice');
  if (finalNotice) {
    finalNotice.style.display = G.finalRound && !G.gameOver ? '' : 'none';
  }
};

window.renderGrid = function renderGrid() {
  COMBOS.forEach(function(c) {
    const btn = document.getElementById('combo-' + c.id);
    if (btn) {
      btn.disabled = c.dice > G.diceLeft || G.gameOver;
    }
  });
};

window.renderGameOver = function renderGameOver() {
  const overlay = document.getElementById('gameover-overlay');
  if (!overlay) return;
  if (!G.gameOver) {
    overlay.style.display = 'none';
    return;
  }
  overlay.style.display = '';

  const winnerName = document.getElementById('go-winner-name');
  const winnerScore = document.getElementById('go-winner-score');
  const w = G.players[G.winner];
  if (winnerName) winnerName.textContent = w.name;
  if (winnerScore) winnerScore.textContent = w.total.toLocaleString();

  const list = document.getElementById('go-scores-list');
  if (list) {
    const medals = ['🥇', '🥈', '🥉'];
    const sorted = G.players.map(function(p, i) {
      return { name: p.name, total: p.total, idx: i };
    }).sort(function(a, b) { return b.total - a.total; });
    let html = '';
    sorted.forEach(function(entry, rank) {
      const medal = medals[rank] || '';
      html += '<li class="go-score-row">';
      html += '<span class="go-medal">' + medal + '</span>';
      html += '<span class="go-name">' + esc(entry.name) + '</span>';
      html += '<span class="go-pts">' + entry.total.toLocaleString() + '</span>';
      html += '</li>';
    });
    list.innerHTML = html;
  }
};

window.toast = function toast(msg) {
  const el = document.getElementById('fk-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function() {
    el.classList.remove('visible');
    _toastTimer = null;
  }, 3200);
};

window.esc = function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

window.onload = function() {
  load();

  // Close rules on background click
  const rulesOverlay = document.getElementById('rules-overlay');
  if (rulesOverlay) {
    rulesOverlay.addEventListener('click', function(e) {
      if (e.target === rulesOverlay) hideRules();
    });
  }
};
