let state = { activeGame: false, mode:'flip7', players:[], round:1, history:[], current:[], active:0, editingRound: null, allowNegatives: false };

function saveToCache() { localStorage.setItem('flip7_state', JSON.stringify(state)); }
function loadFromCache() {
  const saved = localStorage.getItem('flip7_state');
  if (saved) { state = JSON.parse(saved); if (state.activeGame) showGame(); }
}

function setMode(m) {
  state.mode = m;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById(m==='flip7'?'m-f7':(m==='vengeance'?'m-vg':'m-bo')).classList.add('selected');
  document.getElementById('neg-toggle-container').style.display = (m !== 'flip7') ? 'block' : 'none';
}

function addPlayerRow() {
  const container = document.getElementById('player-list');
  const div = document.createElement('div');
  div.className = 'player-row';
  div.innerHTML = `<input type="text" value="Player ${container.children.length + 1}"><button class="del-btn" onclick="this.parentElement.remove()">🗑️</button>`;
  container.appendChild(div);
}

function start() {
  state.players = Array.from(document.querySelectorAll('#player-list input')).map(i => i.value || "Unnamed");
  state.allowNegatives = document.getElementById('opt-negatives').checked;
  state.history = state.players.map(() => []);
  state.round = 1;
  state.activeGame = true;
  resetCurrent();
  showGame();
  saveToCache();
}

function showGame() {
  const titles = { flip7:'FLIP 7', vengeance:'VENGEANCE', combo:'COMBO' };
  document.getElementById('mode-title').innerText = titles[state.mode];
  document.getElementById('setup-screen').style.display='none';
  document.getElementById('game-screen').style.display='flex';
  render();
}

function resetCurrent() {
  state.current = state.players.map(() => ({ cards:[], mods:[], state:'playing' }));
  state.active = 0;
  state.editingRound = null;
}

function countUniqueCards(data) {
  const u = new Set(data.cards);
  let c = u.size;
  if (data.cards.filter(x => x===13).length === 2) c += 1;
  return c;
}

function getBaseScore(data) {
  if (data.state === 'bust') return 0;
  let s = data.cards.reduce((a, b) => a + b, 0);
  data.mods.forEach(m => {
    if (m==='×2') s*=2; if (m==='÷2') s=Math.floor(s/2);
    if (m.includes('+')) s+=parseInt(m.replace('+',''));
    if (m.includes('-')) s-=parseInt(m.replace('-',''));
  });
  return (!state.allowNegatives) ? Math.max(0, s) : s;
}

function calcTotalScore(data) {
  let s = getBaseScore(data);
  if (data.state !== 'bust' && countUniqueCards(data) >= 7) s += 15;
  return (!state.allowNegatives) ? Math.max(0, s) : s;
}

function getDisplayCell(data) {
  if (data.state === 'bust') return '0💥';
  const b = getBaseScore(data), isF7 = countUniqueCards(data) >= 7;
  const stay = data.state === 'stay' ? ' ✓' : '';
  return isF7 ? `${b} <span class="f7-tag">(+15)✨</span>` : `${b}${stay}`;
}

function toggleNum(n) {
  const data = (state.editingRound === null) ? state.current[state.active] : state.history[state.active][state.editingRound];

  if (countUniqueCards(data) >= 7 && !data.cards.includes(n)) return;

  const wasF7 = countUniqueCards(data) >= 7;

  if (n === 13) {
    if (state.mode === 'flip7') return;
    const c = data.cards.filter(x => x === 13).length;
    if (c < 2) data.cards.push(13); else data.cards = data.cards.filter(x => x !== 13);
  } else {
    data.cards.includes(n) ? data.cards = data.cards.filter(x => x !== n) : data.cards.push(n);
  }

  if (countUniqueCards(data) >= 7) {
    data.state = 'stay';
    if (!wasF7) showFlip7Overlay();
  } else if (data.state === 'stay' && countUniqueCards(data) < 7) {
    data.state = 'playing';
  }

  saveToCache(); render();
}

function showFlip7Overlay() {
  const el = document.getElementById('f7-overlay');
  if (!el) return;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 2400);
}

function toggleMod(m) {
  const data = (state.editingRound === null) ? state.current[state.active] : state.history[state.active][state.editingRound];
  data.mods.includes(m) ? data.mods = data.mods.filter(x => x !== m) : data.mods.push(m);
  saveToCache(); render();
}

function doAction(t) {
  const data = (state.editingRound === null) ? state.current[state.active] : state.history[state.active][state.editingRound];
  data.state = t;
  saveToCache(); render();
}

function editHistorical(p, r) { state.active = p; state.editingRound = r; render(); }
function selectPlayer(p) { state.active = p; state.editingRound = null; render(); }

function render() {
  const activeData = (state.editingRound === null) ? state.current[state.active] : state.history[state.active][state.editingRound];
  const uC = countUniqueCards(activeData);

  document.getElementById('display-name').innerText = state.players[state.active];
  document.getElementById('edit-context').innerText = state.editingRound === null ? 'Live Round' : `Editing Round ${state.editingRound + 1}`;
  document.getElementById('display-score').innerText = activeData.state === 'playing' ? calcTotalScore(activeData) : (activeData.state === 'bust' ? 'BUST 💥' : 'STAY ✓');
  document.getElementById('rd-num').innerText = state.round;

  let head = `<th>Player</th>`;
  for(let i=1; i<=state.round; i++) head += `<th>R${i}</th>`;
  head += `<th>Total</th>`;
  document.getElementById('th-row').innerHTML = head;

  let totals = state.players.map((_, i) => state.history[i].reduce((sum, h) => sum + calcTotalScore(h), 0) + calcTotalScore(state.current[i]));
  let maxScore = Math.max(...totals);
  let winningIdx = (maxScore >= 200) ? totals.indexOf(maxScore) : -1;

  document.body.classList.toggle('has-winner', winningIdx !== -1);
  const saveBtn = document.getElementById('live-save-btn');
  saveBtn.innerText = (winningIdx !== -1) ? "FINISH GAME 🎉" : "SAVE ROUND & RESET";
  saveBtn.classList.toggle('winner-state', winningIdx !== -1);

  let bodyHtml = '';
  state.players.forEach((name, pIdx) => {
    let roundCells = '';
    state.history[pIdx].forEach((h, r) => {
      roundCells += `<td class="${(state.active===pIdx && state.editingRound===r)?'cell-editing':''}" onclick="editHistorical(${pIdx}, ${r})">${getDisplayCell(h)}</td>`;
    });
    roundCells += `<td class="${(state.active===pIdx && state.editingRound===null)?'cell-editing':''}" onclick="selectPlayer(${pIdx})">${getDisplayCell(state.current[pIdx])}</td>`;
    for(let j=state.history[pIdx].length+1; j<state.round; j++) roundCells += `<td>-</td>`;

    const f7 = state.history[pIdx].filter(h => countUniqueCards(h) >= 7).length + (countUniqueCards(state.current[pIdx]) >= 7 ? 1 : 0);

    bodyHtml += `<tr class="${pIdx===state.active?'row-active':''} ${pIdx===winningIdx?'winner-row':''}">
      <td style="text-align:left; padding-left:10px;">${pIdx===winningIdx?'🎆 ':''}${name}${f7>0?`<span class="f7-count">F7: ${f7}</span>`:''}</td>
      ${roundCells}
      <td style="color:var(--gold); font-weight:bold;">${totals[pIdx]}</td>
    </tr>`;
  });
  document.getElementById('tb-body').innerHTML = bodyHtml;

  let gridHtml = '';
  for(let i=0; i<=12; i++) {
    const sel = activeData.cards.includes(i);
    const locked = (uC >= 7 && !sel);
    gridHtml += `<button class="btn-num ${sel?'selected':''} ${locked?'disabled':''}" data-n="${i}" onclick="toggleNum(${i})">${i}</button>`;
  }
  if (state.mode !== 'flip7') {
    const c13 = activeData.cards.filter(x => x===13).length;
    const locked = (uC >= 7);
    gridHtml += `<button class="btn-num ${c13>=1?'selected':''} ${(!c13 && locked)?'disabled':''}" data-n="13" onclick="toggleNum(13)">13</button>`;
    gridHtml += `<button class="btn-num ${c13>=2?'selected':''} ${(c13<2 && locked)?'disabled':''}" data-n="13" onclick="toggleNum(13)">13</button>`;
  }
  document.getElementById('num-grid').innerHTML = gridHtml;

  const pos = ['×2','+2','+4','+6','+8','+10'], neg = ['÷2','-2','-4','-6','-8','-10'];
  const rowHtml = (list) => `<div class="mods-row">${list.map(m=>`<button class="btn-mod ${(state.editingRound === null ? state.current[state.active] : state.history[state.active][state.editingRound]).mods.includes(m)?'active':''}" onclick="toggleMod('${m}')">${m}</button>`).join('')}</div>`;
  document.getElementById('mod-container').innerHTML = (state.mode==='flip7'?rowHtml(pos):(state.mode==='vengeance'?rowHtml(neg):rowHtml(pos)+rowHtml(neg)));
}

function endRound() {
  const totals = state.players.map((_, i) => state.history[i].reduce((sum, h) => sum + calcTotalScore(h), 0) + calcTotalScore(state.current[i]));
  if (Math.max(...totals) >= 200) { if(confirm("Restart game with these players?")) restartGame(false); return; }
  state.players.forEach((_, i) => state.history[i].push({ ...state.current[i], cards: [...state.current[i].cards], mods: [...state.current[i].mods] }));
  state.round++; resetCurrent(); saveToCache(); render();
}

function goHome() { document.getElementById('game-screen').style.display='none'; document.getElementById('setup-screen').style.display='flex'; }
function restartGame(ask) { if(!ask || confirm("Wipe scores?")) { state.history = state.players.map(() => []); state.round = 1; resetCurrent(); saveToCache(); render(); } }

window.onload = loadFromCache;
