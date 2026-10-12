// Пар над супом на первом экране и наклон фото за мышкой.
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.getElementById('steam');
  const img = canvas && canvas.previousElementSibling;
  const tilt = document.getElementById('tilt');
  if (!canvas || !img) return;
  const ctx = canvas.getContext('2d');

  // центр тарелки на исходном фото (доли ширины и высоты)
  const BOWL = { x: 0.52, y: 0.55, r: 0.2 };
  let W = 0, H = 0, cx = 0, cy = 0, br = 0, dpr = 1;

  function layout() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // пересчёт с учётом object-fit: cover
    const iw = img.naturalWidth || 900, ih = img.naturalHeight || 600;
    const k = Math.max(W / iw, H / ih);
    const ox = (W - iw * k) / 2, oy = (H - ih * k) / 2;
    cx = ox + BOWL.x * iw * k; cy = oy + BOWL.y * ih * k; br = BOWL.r * iw * k;
  }

  const puffs = [];
  function spawn(t) {
    const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * br * 0.75;
    return {
      x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * 0.6,
      vy: -(0.25 + Math.random() * 0.35), size: 18 + Math.random() * 22,
      grow: 0.18 + Math.random() * 0.2, life: 0, max: 260 + Math.random() * 200,
      seed: Math.random() * 1000, peak: 0.2 + Math.random() * 0.14, born: t
    };
  }

  let running = false, last = 0;
  function frame(t) {
    if (!running) return;
    const dt = Math.min((t - last) / 16.7 || 1, 3); last = t;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'screen';
    if (puffs.length < 46 && Math.random() < 0.5 * dt) puffs.push(spawn(t));
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i];
      p.life += dt;
      const k = p.life / p.max;
      if (k >= 1) { puffs.splice(i, 1); continue; }
      // завиток: боковое покачивание растёт по мере подъёма
      p.y += p.vy * dt;
      p.x += Math.sin(p.seed + p.life * 0.022) * 0.35 * k * dt + Math.sin(t * 0.0004) * 0.08 * dt;
      p.size += p.grow * dt;
      const alpha = p.peak * Math.sin(Math.PI * k);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      g.addColorStop(0, 'rgba(255,255,255,' + alpha + ')');
      g.addColorStop(0.5, 'rgba(255,255,255,' + alpha * 0.45 + ')');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    requestAnimationFrame(frame);
  }
  function start() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
  function stop() { running = false; }

  layout();
  if (!img.complete) img.addEventListener('load', layout);
  addEventListener('resize', layout);

  // рисуем, только когда фото видно и вкладка открыта
  let visible = true;
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; visible && !document.hidden ? start() : stop(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden || !visible ? stop() : start()));
  // прогреваем, чтобы пар был с первой секунды
  for (let i = 0; i < 160; i++) { puffs.length < 46 && Math.random() < 0.5 && puffs.push(spawn(0)); puffs.forEach((p) => { p.life += 1; p.y += p.vy; p.size += p.grow; }); }
  start();

  // наклон за мышкой, только на компьютере
  if (tilt && matchMedia('(hover: hover) and (min-width: 981px)').matches) {
    const box = tilt.parentElement;
    box.addEventListener('mousemove', (e) => {
      const r = box.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.transform = 'rotateY(' + x * 10 + 'deg) rotateX(' + -y * 10 + 'deg)';
    });
    box.addEventListener('mouseleave', () => { tilt.style.transform = ''; });
  }
})();
