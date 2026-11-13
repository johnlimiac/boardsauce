(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }

  /* ── Pointer (mouse or finger) ─────────────────────────────── */
  const pointer = { x: -9999, y: -9999, active: false };

  function setPointer(x, y) { pointer.x = x; pointer.y = y; pointer.active = true; }
  function clearPointer() { pointer.active = false; }

  window.addEventListener('pointermove', e => setPointer(e.clientX, e.clientY), { passive: true });
  window.addEventListener('pointerdown', e => setPointer(e.clientX, e.clientY), { passive: true });
  window.addEventListener('touchmove', e => {
    const t = e.touches[0];
    if (t) setPointer(t.clientX, t.clientY);
  }, { passive: true });
  window.addEventListener('touchend', clearPointer, { passive: true });
  document.addEventListener('mouseleave', clearPointer);

  /* ── Spotlight ─────────────────────────────────────────────── */
  const spot = document.querySelector('.spotlight');
  const spotPos = { x: window.innerWidth * 0.7, y: window.innerHeight * 0.2 };

  function tickSpotlight() {
    if (!pointer.active) return;
    spotPos.x += (pointer.x - spotPos.x) * 0.12;
    spotPos.y += (pointer.y - spotPos.y) * 0.12;
    spot.style.setProperty('--sx', spotPos.x + 'px');
    spot.style.setProperty('--sy', spotPos.y + 'px');
  }

  /* ── Hero letters scatter from the pointer (and the flying dot) ── */
  const letters = [];

  document.querySelectorAll('.hero-line').forEach(line => {
    const text = line.firstChild;
    if (!text || text.nodeType !== Node.TEXT_NODE) return;
    const frag = document.createDocumentFragment();
    for (const c of text.textContent.trim()) {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = c;
      frag.appendChild(s);
      letters.push({ el: s, x: 0, y: 0, r: 0 });
    }
    line.replaceChild(frag, text);
  });

  const REACH = 150;
  const PUSH = 70;

  function repel(l, cx, cy, px, py, acc) {
    const dx = cx - px, dy = cy - py;
    const d = Math.hypot(dx, dy) || 1;
    if (d > REACH) return;
    const f = Math.pow(1 - d / REACH, 2) * PUSH;
    acc.x += (dx / d) * f;
    acc.y += (dy / d) * f;
  }

  function tickLetters() {
    for (const l of letters) {
      const rect = l.el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2 - l.x;
      const cy = rect.top + rect.height / 2 - l.y;
      const target = { x: 0, y: 0 };
      if (pointer.active && !dot.held) repel(l, cx, cy, pointer.x, pointer.y, target);
      if (dot.flying || dot.held) repel(l, cx, cy, dot.cx, dot.cy, target);
      l.x += (target.x - l.x) * 0.16;
      l.y += (target.y - l.y) * 0.16;
      l.r += (target.x * 0.25 - l.r) * 0.16;
      l.el.style.transform = `translate(${l.x.toFixed(2)}px, ${l.y.toFixed(2)}px) rotate(${l.r.toFixed(2)}deg)`;
    }
  }

  /* ── The mango period: grab, flick, watch it come home ──────── */
  const dotEl = document.querySelector('.hero-dot');
  const hint = document.querySelector('.hero-hint');
  const dot = { px: 0, py: 0, vx: 0, vy: 0, held: false, flying: false, returning: false, t: 0, rest: 0, cx: 0, cy: 0, last: null };

  function dotHome() {
    const r = dotEl.getBoundingClientRect();
    return { x: r.left + r.width / 2 - dot.px, y: r.top + r.height / 2 - dot.py, rad: r.width / 2 };
  }

  if (dotEl && !reduced) {
    dotEl.addEventListener('pointerdown', e => {
      e.preventDefault();
      dotEl.setPointerCapture(e.pointerId);
      dot.held = true;
      dot.flying = dot.returning = false;
      dot.last = { x: e.clientX, y: e.clientY, t: performance.now() };
      dot.vx = dot.vy = 0;
      dotEl.classList.add('is-held');
    });

    dotEl.addEventListener('pointermove', e => {
      if (!dot.held) return;
      const home = dotHome();
      const now = performance.now();
      const dt = Math.max(now - dot.last.t, 1) / 16.67;
      dot.vx = (e.clientX - dot.last.x) / dt;
      dot.vy = (e.clientY - dot.last.y) / dt;
      dot.last = { x: e.clientX, y: e.clientY, t: now };
      dot.px = e.clientX - home.x;
      dot.py = e.clientY - home.y;
    });

    const release = () => {
      if (!dot.held) return;
      dot.held = false;
      dot.flying = true;
      dot.t = 0;
      dot.rest = 0;
      // A tap with no drag still gets a little hop
      if (Math.hypot(dot.vx, dot.vy) < 2) { dot.vx = rand(-9, 9); dot.vy = -18; }
      dot.vx = Math.max(-60, Math.min(60, dot.vx));
      dot.vy = Math.max(-60, Math.min(60, dot.vy));
      dotEl.classList.remove('is-held');
      if (hint) hint.classList.add('is-done');
    };
    dotEl.addEventListener('pointerup', release);
    dotEl.addEventListener('pointercancel', release);
  }

  function tickDot() {
    if (!dotEl) return;
    const home = dotHome();

    if (dot.flying) {
      dot.t++;
      dot.vy += 0.9;
      dot.px += dot.vx;
      dot.py += dot.vy;

      const navH = (document.querySelector('.tl-nav') || {}).offsetHeight || 0;
      const minX = home.rad, maxX = window.innerWidth - home.rad;
      const minY = navH + home.rad, maxY = window.innerHeight - home.rad;
      let x = home.x + dot.px, y = home.y + dot.py;

      if (x < minX) { x = minX; dot.vx = Math.abs(dot.vx) * 0.75; }
      if (x > maxX) { x = maxX; dot.vx = -Math.abs(dot.vx) * 0.75; }
      if (y < minY) { y = minY; dot.vy = Math.abs(dot.vy) * 0.75; }
      if (y > maxY) {
        y = maxY;
        dot.vy = -Math.abs(dot.vy) * 0.72;
        dot.vx *= 0.94;
        if (Math.abs(dot.vy) < 2.5) dot.rest++;
      }
      dot.px = x - home.x;
      dot.py = y - home.y;

      if (dot.rest > 25 || dot.t > 260) { dot.flying = false; dot.returning = true; }
    } else if (dot.returning) {
      dot.vx = (dot.vx - dot.px * 0.05) * 0.8;
      dot.vy = (dot.vy - dot.py * 0.05) * 0.8;
      dot.px += dot.vx;
      dot.py += dot.vy;
      if (Math.hypot(dot.px, dot.py) < 0.5 && Math.hypot(dot.vx, dot.vy) < 0.5) {
        dot.returning = false;
        dot.px = dot.py = dot.vx = dot.vy = 0;
      }
    }

    dot.cx = home.x + dot.px;
    dot.cy = home.y + dot.py;
    const stretch = dot.flying ? Math.min(Math.hypot(dot.vx, dot.vy) / 60, 0.35) : 0;
    const angle = Math.atan2(dot.vy, dot.vx);
    dotEl.style.transform = (dot.px || dot.py)
      ? `translate(${dot.px.toFixed(1)}px, ${dot.py.toFixed(1)}px) rotate(${angle}rad) scale(${1 + stretch}, ${1 - stretch * 0.6})`
      : '';
  }

  /* ── Main loop ─────────────────────────────────────────────── */
  if (!reduced) {
    (function loop() {
      tickSpotlight();
      tickDot();
      tickLetters();
      requestAnimationFrame(loop);
    })();
  }

  /* ── Dice ──────────────────────────────────────────────────── */
  const FACES = {
    1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
  };

  function makeDie() {
    const pos = document.createElement('div');
    pos.className = 'die-pos';
    const die = document.createElement('div');
    die.className = 'die';
    for (let i = 0; i < 9; i++) {
      const p = document.createElement('span');
      p.className = 'pip';
      die.appendChild(p);
    }
    pos.appendChild(die);
    return pos;
  }

  function setFace(die, v) {
    const on = FACES[v];
    die.querySelectorAll('.pip').forEach((p, i) => p.classList.toggle('on', on.includes(i)));
    die.dataset.v = v;
  }

  function scatter(set, animate) {
    const box = set.getBoundingClientRect();
    const d = set.querySelector('.die-pos').offsetWidth;
    const slots = [];
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        slots.push({
          x: box.width / 2 + (col - 1) * d * 1.85 + (row ? d * 0.4 : -d * 0.25) - d / 2,
          y: box.height * 0.58 + (row - 0.5) * d * 1.45 - d / 2,
        });
      }
    }
    slots.sort(() => Math.random() - 0.5);
    set.querySelectorAll('.die-pos').forEach((pos, i) => {
      if (!animate) pos.style.transition = 'none';
      const s = slots[i];
      pos.style.transform = `translate(${s.x + rand(-8, 8)}px, ${s.y + rand(-6, 6)}px) rotate(${rand(-28, 28)}deg)`;
      if (!animate) { pos.offsetWidth; pos.style.transition = ''; }
    });
  }

  function finalFaces(mode, n) {
    if (mode === 'yahtzee') return Array(n).fill(6);
    const faces = Array.from({ length: n }, () => randInt(1, 6));
    if (!faces.some(v => v === 1 || v === 5)) faces[randInt(0, n - 1)] = Math.random() < 0.5 ? 1 : 5;
    return faces;
  }

  function markScores(set, mode) {
    if (mode !== 'farkle') return;
    set.querySelectorAll('.die').forEach(die => {
      die.classList.toggle('is-score', die.dataset.v === '1' || die.dataset.v === '5');
    });
  }

  document.querySelectorAll('.dice').forEach(set => {
    const n = +set.dataset.count;
    const mode = set.dataset.mode;
    for (let i = 0; i < n; i++) set.appendChild(makeDie());
    const start = mode === 'yahtzee' ? [1, 3, 6, 2, 5] : [1, 4, 2, 5, 3, 6];
    set.querySelectorAll('.die').forEach((die, i) => setFace(die, start[i]));
    markScores(set, mode);
    if (set.classList.contains('dice--scatter')) {
      requestAnimationFrame(() => scatter(set, false));
      window.addEventListener('resize', () => scatter(set, false));
    }
  });

  function roll(card) {
    const set = card.querySelector('.dice');
    if (!set || set.dataset.rolling) return;
    const mode = set.dataset.mode;
    const dice = [...set.querySelectorAll('.die')];
    const faces = finalFaces(mode, dice.length);

    if (reduced) {
      dice.forEach((die, i) => setFace(die, faces[i]));
      markScores(set, mode);
      card.classList.toggle('is-yahtzee', mode === 'yahtzee');
      return;
    }

    set.dataset.rolling = '1';
    card.classList.remove('is-yahtzee');
    dice.forEach(die => die.classList.remove('is-score'));
    if (set.classList.contains('dice--scatter')) scatter(set, true);

    let landed = 0;
    dice.forEach((die, i) => {
      const delay = i * 70;
      setTimeout(() => {
        die.classList.remove('is-rolling');
        void die.offsetWidth;
        die.classList.add('is-rolling');
        const shuffle = setInterval(() => setFace(die, randInt(1, 6)), 80);
        setTimeout(() => {
          clearInterval(shuffle);
          setFace(die, faces[i]);
          if (++landed === dice.length) {
            markScores(set, mode);
            if (mode === 'yahtzee') card.classList.add('is-yahtzee');
            delete set.dataset.rolling;
          }
        }, 680);
      }, delay);
    });
  }

  function play(card, on) {
    if (card.classList.contains('game-card--flip')) {
      card.classList.toggle('is-on', on === undefined ? !card.classList.contains('is-on') : on);
    } else {
      roll(card);
    }
  }

  /* ── Cards: tilt + sheen on desktop, auto-play on phones ───── */
  const cards = document.querySelectorAll('.game-card');

  cards.forEach(card => {
    if (canHover && !reduced) {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.classList.add('is-tilting');
        card.style.setProperty('--rx', ((0.5 - py) * 9).toFixed(2) + 'deg');
        card.style.setProperty('--ry', ((px - 0.5) * 11).toFixed(2) + 'deg');
        card.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('is-tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
        if (card.classList.contains('game-card--flip')) play(card, false);
      });
    }
    if (canHover) card.addEventListener('pointerenter', () => play(card, true));
  });

  // Play each card as it scrolls into view; on touch screens keep it going
  const timers = new Map();
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const card = entry.target;
      if (entry.isIntersecting) {
        setTimeout(() => play(card, true), 250);
        if (!canHover && !reduced && !timers.has(card)) {
          timers.set(card, setInterval(() => play(card), 3200));
        }
      } else if (timers.has(card)) {
        clearInterval(timers.get(card));
        timers.delete(card);
      }
    });
  }, { threshold: 0.6 });

  cards.forEach(card => io.observe(card));
})();
