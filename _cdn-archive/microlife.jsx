/* MindSpace — Micro Life
   --------------------------------------------------------------
   Tiny details that make the world feel inhabited.
     · shooting stars (rare, beautiful — every 40–90 s)
     · fireflies (forest / fireplace only)
     · distant city blink (night-train / midnight-rain)
     · drifting dust motes (any scene, very subtle)
     · window condensation streaks (rainy scenes only)
   Sits above .atm-canvas, below the UI chrome.
   Respects prefers-reduced-motion.
*/

const { useEffect, useRef } = React;

const REDUCED_ML = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function MicroLife() {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (REDUCED_ML) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = window.innerWidth, H = window.innerHeight, raf;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width  = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    window.addEventListener('resize', resize);
    resize();

    /* ── pools — sparse on purpose; atmosphere.jsx already handles
       rain, mist, ember, drift, stars, streaks, city lights. micro-life
       layers in ONLY shooting stars + fireflies, things atmosphere
       doesn't do, plus a tiny dust pass. Drop everything else. ── */
    const shootingStars = [];   // active only when triggered
    const fireflies = Array.from({ length: 14 }, () => ({
      x: Math.random() * W, y: H * 0.4 + Math.random() * H * 0.55,
      r: 0.7 + Math.random() * 1.2,
      ph: Math.random() * Math.PI * 2,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 6,
      blinkPh: Math.random() * Math.PI * 2,
      blinkSpeed: 0.4 + Math.random() * 0.8,
    }));
    const dustMotes = Array.from({ length: 14 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: 0.30 + Math.random() * 0.55,
      op: 0.08 + Math.random() * 0.16,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 2,
      ph: Math.random() * Math.PI * 2,
    }));

    /* timing */
    let lastTs = 0;
    let nextShoot = 8 + Math.random() * 30;

    function spawnShooting() {
      const startX = -120 + Math.random() * (W * 0.5);
      const startY = H * (0.05 + Math.random() * 0.30);
      const angle  = 0.18 + Math.random() * 0.12; // descending right
      const speed  = 900 + Math.random() * 600;
      shootingStars.push({
        x: startX, y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0, maxLife: 0.95 + Math.random() * 0.65,
      });
    }

    function drawShooting(dt) {
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        s.life += dt;
        const t = s.life / s.maxLife;
        if (t >= 1) { shootingStars.splice(i, 1); continue; }
        s.x += s.vx * dt; s.y += s.vy * dt;

        const fade = (t < 0.15 ? t / 0.15 : (1 - (t - 0.15) / 0.85));
        const alpha = Math.max(0, fade) * 0.95;
        const tailLen = 180 + 220 * fade;
        const tx = s.x - (s.vx / Math.hypot(s.vx, s.vy)) * tailLen;
        const ty = s.y - (s.vy / Math.hypot(s.vx, s.vy)) * tailLen;

        const g = ctx.createLinearGradient(tx, ty, s.x, s.y);
        g.addColorStop(0,    'rgba(220,230,255,0)');
        g.addColorStop(0.45, `rgba(220,230,255,${(alpha * 0.18).toFixed(3)})`);
        g.addColorStop(1,    `rgba(255,255,255,${alpha.toFixed(3)})`);
        ctx.save();
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
        // head
        ctx.shadowColor = 'rgba(220,235,255,0.85)';
        ctx.shadowBlur  = 8;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx.fill();
        ctx.restore();
      }
    }

    function drawFireflies(dt, scene) {
      const ms = scene.motionSpeed * 0.6;
      for (let i = 0; i < fireflies.length; i++) {
        const f = fireflies[i];
        f.x += f.vx * ms * dt + Math.sin(performance.now() / 1000 * 0.7 + f.ph) * 0.35;
        f.y += f.vy * ms * dt + Math.cos(performance.now() / 1000 * 0.5 + f.ph) * 0.25;
        if (f.x < -20) f.x = W + 10;
        if (f.x > W + 20) f.x = -10;
        if (f.y < H * 0.3) f.vy = Math.abs(f.vy);
        if (f.y > H + 20)  f.vy = -Math.abs(f.vy);

        const tw = 0.5 + 0.5 * Math.sin(performance.now() / 1000 * f.blinkSpeed + f.blinkPh);
        const al = (0.40 + 0.55 * tw) * 0.85;
        const col = scene.id === 'fireplace-cabin' ? '255, 180, 110' : '200, 220, 140';

        ctx.save();
        ctx.shadowColor = `rgba(${col}, 0.8)`;
        ctx.shadowBlur  = 8 + tw * 6;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col}, ${al.toFixed(3)})`;
        ctx.fill();
        ctx.restore();
      }
    }

    function drawDust(dt, scene) {
      const t = performance.now() / 1000;
      const ms = scene.motionSpeed * 0.4;
      for (let i = 0; i < dustMotes.length; i++) {
        const m = dustMotes[i];
        m.x += (m.vx + Math.sin(t * 0.3 + m.ph) * 3) * ms * dt;
        m.y += (m.vy + Math.cos(t * 0.25 + m.ph) * 2) * ms * dt;
        if (m.x < -10) m.x = W + 5;
        if (m.x > W + 10) m.x = -5;
        if (m.y < -10) m.y = H + 5;
        if (m.y > H + 10) m.y = -5;
        const tw = 0.6 + 0.4 * Math.sin(t * 0.9 + m.ph);
        ctx.save();
        ctx.globalAlpha = m.op * tw;
        ctx.fillStyle = 'rgba(243,239,230,1)';
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawCityBlink(dt) {
      for (let i = 0; i < cityBlinks.length; i++) {
        const p = cityBlinks[i];
        p.life += dt;
        if (p.state === 'in')  p.op = Math.min(p.maxOp, p.op + dt * 0.9);
        if (p.state === 'out') p.op = Math.max(0,        p.op - dt * 1.4);
        if (p.op >= p.maxOp && p.state === 'in') p.state = 'hold';
        if (p.state === 'hold' && p.life > p.maxLife * 0.5) p.state = 'out';
        if (p.state === 'out' && p.op <= 0) {
          // respawn elsewhere
          p.x = Math.random() * W;
          p.y = H * 0.62 + Math.random() * H * 0.34;
          p.maxOp = 0.18 + Math.random() * 0.26;
          p.op = 0; p.life = 0;
          p.maxLife = 1.4 + Math.random() * 3.2;
          p.col = Math.random() < 0.5 ? [255, 210, 140] : [200, 220, 255];
          p.state = 'in';
        }
        const [r, g, b] = p.col;
        ctx.save();
        ctx.globalAlpha = p.op;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.shadowColor = `rgba(${r},${g},${b},0.55)`;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawCondensation(dt) {
      // fade in, drift down slowly. each streak respawns at top after running off.
      for (let i = 0; i < conds.length; i++) {
        const c = conds[i];
        c.op = Math.min(c.maxOp, c.op + dt * 0.04);
        c.y += c.drip * dt * 0.06;
        if (c.y > H + 40) {
          c.x = Math.random() * W;
          c.y = -20;
          c.len = 60 + Math.random() * 220;
          c.op = 0;
        }
        const g = ctx.createLinearGradient(c.x, c.y, c.x, c.y + c.len);
        g.addColorStop(0, 'rgba(180, 200, 230, 0)');
        g.addColorStop(0.5, `rgba(180, 200, 230, ${c.op.toFixed(3)})`);
        g.addColorStop(1, 'rgba(180, 200, 230, 0)');
        ctx.save();
        ctx.strokeStyle = g;
        ctx.lineWidth = 0.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x + Math.sin(c.seed + c.y * 0.01) * 4, c.y + c.len);
        ctx.stroke();
        ctx.restore();
      }
    }

    function tick(ts) {
      const dt = Math.min((ts - lastTs) / 1000, 0.05);
      /* throttle to ~30 fps to lighten load */
      if (ts - lastTs < 32) { raf = requestAnimationFrame(tick); return; }

      /* pause completely when an immersive mode is up or page hidden — saves a whole canvas's worth of work */
      const body = document.body;
      if (document.hidden ||
          body.classList.contains('breath-focus') ||
          body.classList.contains('has-journey-open') ||
          body.classList.contains('amb-sleep') ||
          body.classList.contains('amb-nothing')) {
        ctx.clearRect(0, 0, W, H);
        lastTs = ts;
        raf = requestAnimationFrame(tick);
        return;
      }
      lastTs = ts;
      ctx.clearRect(0, 0, W, H);

      const scene = window.__mindspaceScene || { id:'midnight-rain', motionSpeed: 0.8 };

      /* dust everywhere, soft */
      drawDust(dt, scene);

      /* fireflies in forest + fireplace */
      if (scene.id === 'forest-temple' || scene.id === 'fireplace-cabin') {
        drawFireflies(dt, scene);
      }

      /* shooting stars for star-rich scenes */
      const canShoot = scene.id === 'deep-space' || scene.id === 'midnight-rain' || scene.id === 'ocean-dream';
      if (canShoot) {
        nextShoot -= dt;
        if (nextShoot <= 0) {
          spawnShooting();
          nextShoot = (scene.id === 'deep-space' ? 16 : 40) + Math.random() * 60;
        }
      }
      drawShooting(dt);

      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  if (REDUCED_ML) return null;
  return <canvas ref={canvasRef} className="microlife-canvas" aria-hidden="true"/>;
}

window.MindSpaceMicroLife = MicroLife;
