(function () {
  'use strict';

  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let animId = null;

  /* Palette — matches the app's CSS variables */
  const palette = [
    [37, 99, 235],   /* accent-blue  #2563eb */
    [22, 101, 52],   /* accent-green #166534 */
    [113, 63, 18],   /* gold         #713f12 */
    [26, 26, 26],    /* text         #1a1a1a */
    [194, 65, 12],   /* orange-red   #c2410c */
  ];

  const shapes = [];
  const COUNT = 30;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b)); }

  /* ── Shape drawers (ctx already translated to origin) ── */
  function drawTriangle(r) {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (2 * Math.PI / 3) * i - Math.PI / 2;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function drawDiamond(r) {
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.58, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.58, 0);
    ctx.closePath();
  }

  function drawHexagon(r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function drawCross(r) {
    const t = r * 0.22;
    ctx.beginPath();
    ctx.rect(-t, -r, t * 2, r * 2);
    ctx.rect(-r, -t, r * 2, t * 2);
  }

  const drawFns = [drawTriangle, drawDiamond, drawHexagon, drawCross];

  /* ── Shape class ── */
  class Shape {
    constructor(initial) {
      this.reset(initial);
    }

    reset(initial) {
      this.x = rand(0, canvas.width);
      this.y = initial
        ? rand(0, canvas.height)
        : rand(-130, canvas.height + 130);
      this.r       = rand(10, 52);
      this.rot     = rand(0, Math.PI * 2);
      this.rotSpd  = rand(-0.005, 0.005);
      this.dx      = rand(-0.28, 0.28);
      this.dy      = rand(-0.14, 0.14);
      this.alpha   = rand(0.022, 0.062);
      this.color   = palette[randInt(0, palette.length)];
      this.drawIdx = randInt(0, drawFns.length);
      this.stroke  = Math.random() > 0.42;
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      const [r, g, b] = this.color;
      const style = `rgba(${r},${g},${b},${this.alpha})`;
      drawFns[this.drawIdx](this.r);
      if (this.stroke) {
        ctx.strokeStyle = style;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else {
        ctx.fillStyle = style;
        ctx.fill();
      }
      ctx.restore();
    }

    tick() {
      this.x   += this.dx;
      this.y   += this.dy;
      this.rot += this.rotSpd;
      const pad = 130;
      if (this.x < -pad)                  this.x = canvas.width  + pad;
      if (this.x > canvas.width  + pad)   this.x = -pad;
      if (this.y < -pad)                  this.y = canvas.height + pad;
      if (this.y > canvas.height + pad)   this.y = -pad;
    }
  }

  /* ── Canvas resize ── */
  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  /* ── Render loop ── */
  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of shapes) { s.tick(); s.draw(); }
    animId = requestAnimationFrame(loop);
  }

  function stop() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
  }

  function renderStatic() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of shapes) s.draw();
  }

  /* ── Init ── */
  function init() {
    resize();
    shapes.length = 0;
    for (let i = 0; i < COUNT; i++) shapes.push(new Shape(true));
  }

  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');

  function start() {
    init();
    mq.matches ? renderStatic() : loop();
  }

  mq.addEventListener('change', () => { stop(); start(); });

  window.addEventListener('resize', () => {
    resize();
    if (mq.matches) renderStatic();
  });

  start();
})();
