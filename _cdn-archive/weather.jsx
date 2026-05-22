/* MindSpace — Atmospheric weather overlays
   Canvas-based rain drops + wind streaks.
   Respects prefers-reduced-motion.
*/

const { useEffect, useRef } = React;

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ═══════════════════════════════════════════════════════════════
   Rain canvas — cool blue diagonal drops
═══════════════════════════════════════════════════════════════ */
function RainCanvas({ intensity = 1 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animId;
    let drops = [];
    let W = 1, H = 1;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const d = window.devicePixelRatio || 1;
      W = parent.offsetWidth;
      H = parent.offsetHeight;
      canvas.width  = W * d;
      canvas.height = H * d;
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };

    const makeDrop = (init = false) => ({
      x:       Math.random() * (W + 120) - 60,
      y:       init ? Math.random() * H : -(10 + Math.random() * 80),
      speed:   320 + Math.random() * 300,
      length:  12 + Math.random() * 26,
      opacity: 0.04 + Math.random() * 0.12,
      width:   0.3 + Math.random() * 0.5,
    });

    const initDrops = () => {
      const count = Math.max(40, Math.round(W * H / 9000 * intensity));
      drops = Array.from({ length: count }, () => makeDrop(true));
    };

    /* 76° from horizontal: drops lean right slightly as they fall */
    const RAD  = 76 * Math.PI / 180;
    const SIN  = Math.sin(RAD);   /* ≈ 0.970 — vertical component */
    const COS  = Math.cos(RAD);   /* ≈ 0.242 — horizontal component */

    let last = 0;
    const draw = (ts) => {
      const dt = Math.min((ts - last) / 1000, 0.032);
      last = ts;

      ctx.clearRect(0, 0, W, H);

      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];
        const dist = d.speed * dt;
        d.x += dist * COS;
        d.y += dist * SIN;

        if (d.y > H + 30) {
          drops[i] = makeDrop(false);
          drops[i].x = Math.random() * (W + 80) - 40;
          continue;
        }

        ctx.save();
        ctx.globalAlpha = d.opacity;
        ctx.strokeStyle = 'rgba(160, 195, 255, 1)';
        ctx.lineWidth = d.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(d.x - d.length * COS, d.y - d.length * SIN);
        ctx.lineTo(d.x, d.y);
        ctx.stroke();
        ctx.restore();
      }

      animId = requestAnimationFrame(draw);
    };

    const ro = new ResizeObserver(() => { resize(); initDrops(); });
    ro.observe(canvas.parentElement);
    resize();
    initDrops();
    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="wx-canvas wx-rain" aria-hidden="true" />;
}

/* ═══════════════════════════════════════════════════════════════
   Wind canvas — horizontal bezier streaks drifting across
═══════════════════════════════════════════════════════════════ */
function WindCanvas({ intensity = 1 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animId;
    let streaks = [];
    let W = 1, H = 1;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const d = window.devicePixelRatio || 1;
      W = parent.offsetWidth;
      H = parent.offsetHeight;
      canvas.width  = W * d;
      canvas.height = H * d;
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };

    const makeStreak = (init = false) => ({
      x:       init ? Math.random() * W * 1.4 - W * 0.2 : -(80 + Math.random() * 200),
      y:       Math.random() * H,
      speed:   80 + Math.random() * 140,
      length:  90 + Math.random() * 220,
      opacity: 0.03 + Math.random() * 0.09,
      curve:   (Math.random() - 0.5) * 44,
      width:   0.4 + Math.random() * 1.4,
    });

    const initStreaks = () => {
      const count = Math.max(14, Math.round(28 * intensity));
      streaks = Array.from({ length: count }, () => makeStreak(true));
    };

    let last = 0;
    const draw = (ts) => {
      const dt = Math.min((ts - last) / 1000, 0.032);
      last = ts;

      ctx.clearRect(0, 0, W, H);

      for (let i = 0; i < streaks.length; i++) {
        const s = streaks[i];
        s.x += s.speed * dt;

        if (s.x - s.length > W + 20) {
          streaks[i] = makeStreak(false);
          continue;
        }

        const x0 = s.x - s.length;
        const y0 = s.y;
        const x1 = s.x;
        const y1 = s.y + s.curve;

        const grad = ctx.createLinearGradient(x0, y0, x1, y1);
        grad.addColorStop(0,    'rgba(140, 190, 255, 0)');
        grad.addColorStop(0.25, 'rgba(140, 190, 255, 0.85)');
        grad.addColorStop(0.75, 'rgba(140, 190, 255, 0.85)');
        grad.addColorStop(1,    'rgba(140, 190, 255, 0)');

        ctx.save();
        ctx.globalAlpha = s.opacity;
        ctx.strokeStyle = grad;
        ctx.lineWidth = s.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.bezierCurveTo(
          x0 + s.length * 0.35, y0 + s.curve * 0.2,
          x0 + s.length * 0.65, y0 + s.curve * 0.7,
          x1, y1,
        );
        ctx.stroke();
        ctx.restore();
      }

      animId = requestAnimationFrame(draw);
    };

    const ro = new ResizeObserver(() => { resize(); initStreaks(); });
    ro.observe(canvas.parentElement);
    resize();
    initStreaks();
    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="wx-canvas wx-wind" aria-hidden="true" />;
}

/* ═══════════════════════════════════════════════════════════════
   Exports — no-ops when reduced motion is preferred
═══════════════════════════════════════════════════════════════ */
if (!REDUCED) {
  window.MindSpaceRain = RainCanvas;
  window.MindSpaceWind = WindCanvas;
} else {
  window.MindSpaceRain = () => null;
  window.MindSpaceWind = () => null;
}
