// Живая сеть на первом экране: сетка точек, два узла, от узлов идут лучи, по лучам бегут импульсы.
(function () {
  const canvas = document.getElementById('net');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STEP = 30;
  let W, H, dpr, cols, rows, hubs = [], rays = [], pulses = [], mx = 0, my = 0;

  function build() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(W / STEP) + 1; rows = Math.ceil(H / STEP) + 1;
    const narrow = W < 700;
    // узлы справа сверху, чтобы не спорить с текстом снизу слева
    hubs = narrow
      ? [{ c: Math.round(cols * 0.68), r: Math.round(rows * 0.22) }]
      : [{ c: Math.round(cols * 0.56), r: Math.round(rows * 0.32) }, { c: Math.round(cols * 0.8), r: Math.round(rows * 0.2) }];
    rays = [];
    hubs.forEach((h, hi) => {
      const n = narrow ? 9 : 11;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + hi * 0.4 + Math.random() * 0.3;
        const len = 3 + Math.floor(Math.random() * 5);
        const c = h.c + Math.round(Math.cos(a) * len), r = h.r + Math.round(Math.sin(a) * len);
        if (c >= 0 && r >= 0 && c < cols && r < rows) rays.push({ h, c, r });
      }
    });
    pulses = [];
  }

  const P = (c, r) => [c * STEP + 0.5, r * STEP + 0.5];

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    const ox = mx * 8, oy = my * 8;
    // фон: мелкие точки, ярче возле узлов
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        let near = 0;
        hubs.forEach((h) => { const d = Math.hypot(c - h.c, r - h.r); near = Math.max(near, 1 - d / 9); });
        const a = 0.07 + Math.max(near, 0) * 0.35;
        ctx.fillStyle = 'rgba(244,244,245,' + a + ')';
        const [x, y] = P(c, r);
        const s = near > 0.4 ? 3 : 2;
        ctx.fillRect(x - s / 2 + ox * near, y - s / 2 + oy * near, s, s);
      }
    }
    // лучи
    ctx.lineWidth = 1;
    rays.forEach((ray) => {
      const [x1, y1] = P(ray.h.c, ray.h.r), [x2, y2] = P(ray.c, ray.r);
      ctx.strokeStyle = 'rgba(244,244,245,.18)';
      ctx.beginPath(); ctx.moveTo(x1 + ox, y1 + oy); ctx.lineTo(x2 + ox * .6, y2 + oy * .6); ctx.stroke();
      ctx.fillStyle = 'rgba(244,244,245,.55)';
      ctx.fillRect(x2 - 3 + ox * .6, y2 - 3 + oy * .6, 6, 6);
    });
    // импульсы бегут от узла к концу луча
    if (!calm && Math.random() < 0.06 && rays.length) pulses.push({ ray: rays[Math.floor(Math.random() * rays.length)], k: 0, v: 0.008 + Math.random() * 0.01 });
    pulses = pulses.filter((p) => (p.k += p.v) < 1);
    pulses.forEach((p) => {
      const [x1, y1] = P(p.ray.h.c, p.ray.h.r), [x2, y2] = P(p.ray.c, p.ray.r);
      const x = x1 + (x2 - x1) * p.k + ox * (1 - p.k * .4), y = y1 + (y2 - y1) * p.k + oy * (1 - p.k * .4);
      ctx.fillStyle = 'rgba(255,255,255,' + (1 - p.k) + ')';
      ctx.fillRect(x - 2, y - 2, 4, 4);
    });
    // узлы
    hubs.forEach((h, i) => {
      const [x, y] = P(h.c, h.r);
      const s = 12 + Math.sin(t / 700 + i) * 1.5;
      ctx.fillStyle = '#f4f4f5';
      ctx.fillRect(x - s / 2 + ox, y - s / 2 + oy, s, s);
      ctx.strokeStyle = 'rgba(244,244,245,.25)';
      ctx.strokeRect(x - s + ox, y - s + oy, s * 2, s * 2);
    });
  }

  let running = false;
  function loop(t) { if (!running) return; draw(t); requestAnimationFrame(loop); }
  function start() { if (!running && !calm) { running = true; requestAnimationFrame(loop); } }

  build(); draw(0);
  addEventListener('resize', () => { build(); draw(0); });
  addEventListener('mousemove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  new IntersectionObserver((e) => { e[0].isIntersecting ? start() : (running = false); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { document.hidden ? (running = false) : start(); });
})();
