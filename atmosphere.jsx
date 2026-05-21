/* MindSpace — Atmosphere Layer
   Full-viewport canvas sitting above the Three.js sky.
   Renders scene-specific particles, fog, glow, and effects.
   Uses mix-blend-mode: screen so particles glow additively on the dark sky.
*/

const { useEffect, useRef, useState } = React;
const REDUCED_ATM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ═══════════════════════════════════════════════════════════════
   Lerp helpers
═══════════════════════════════════════════════════════════════ */
const lerp  = (a, b, t) => a + (b - a) * t;
const lerpC = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)));
const easeInOut = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

/* ═══════════════════════════════════════════════════════════════
   Particle pool initializers
═══════════════════════════════════════════════════════════════ */
function makeRainDrop(W, H, init = false) {
  return {
    x: Math.random() * (W + 100) - 50,
    y: init ? Math.random() * H : -(10 + Math.random() * 60),
    speed: 280 + Math.random() * 220,
    len: 8 + Math.random() * 18,
    op: 0.03 + Math.random() * 0.09,
    w: 0.25 + Math.random() * 0.4,
  };
}
function makeMistPuff(W, H) {
  return {
    x: Math.random() * W, y: Math.random() * H,
    rx: 80 + Math.random() * 200, ry: 30 + Math.random() * 80,
    op: 0.025 + Math.random() * 0.045,
    vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 4,
    life: 0, maxLife: 6 + Math.random() * 8,
  };
}
function makePollenDot(W, H) {
  return {
    x: Math.random() * W, y: Math.random() * H,
    r: 0.8 + Math.random() * 1.8,
    op: 0.18 + Math.random() * 0.45,
    vx: (Math.random() - 0.5) * 10,
    vy: -(2 + Math.random() * 8),
    phase: Math.random() * Math.PI * 2,
  };
}
function makeDriftDot(W, H) {
  return {
    x: Math.random() * W, y: Math.random() * H,
    r: 0.6 + Math.random() * 2.2,
    op: 0.10 + Math.random() * 0.35,
    vx: (Math.random() - 0.5) * 6,
    vy: (Math.random() - 0.5) * 3,
    phase: Math.random() * Math.PI * 2,
    waveAmp: 8 + Math.random() * 20,
  };
}
function makeEmber(W, H, init = false) {
  return {
    x: W * 0.3 + Math.random() * W * 0.4,
    y: init ? Math.random() * H : H + 5,
    r: 0.8 + Math.random() * 2.4,
    op: 0.4 + Math.random() * 0.5,
    vx: (Math.random() - 0.5) * 22,
    vy: -(30 + Math.random() * 55),
    phase: Math.random() * Math.PI * 2,
  };
}
function makeStar(W, H) {
  return {
    x: Math.random() * W, y: Math.random() * H,
    r: 0.25 + Math.random() * 1.1,
    op: 0.15 + Math.random() * 0.70,
    twinklePhase: Math.random() * Math.PI * 2,
    twinkleSpeed: 0.3 + Math.random() * 1.2,
    px: 0, py: 0,
  };
}
function makeStreak(W, H, init = false) {
  return {
    x: init ? Math.random() * W * 1.3 - W * 0.15 : -(60 + Math.random() * 160),
    y: Math.random() * H,
    len: 60 + Math.random() * 180,
    speed: 200 + Math.random() * 280,
    op: 0.04 + Math.random() * 0.10,
    w: 0.3 + Math.random() * 1.0,
  };
}
const CITY_LIGHT_COLORS = [
  [255, 220, 140], // warm amber
  [180, 210, 255], // cool blue-white
  [255, 240, 180], // pale yellow
  [200, 225, 255], // ice white
  [255, 200, 120], // orange-amber
];
function makeCityLight(W, H) {
  const side = Math.random() < 0.5 ? 'left' : 'right';
  const col = CITY_LIGHT_COLORS[Math.floor(Math.random() * CITY_LIGHT_COLORS.length)];
  return {
    x: side === 'left' ? Math.random() * W * 0.25 : W * 0.75 + Math.random() * W * 0.25,
    y: H * 0.2 + Math.random() * H * 0.65,
    r: 1.2 + Math.random() * 2.5,
    op: 0, maxOp: 0.18 + Math.random() * 0.22,
    col,
    life: 0, maxLife: 0.8 + Math.random() * 2.0,
    state: 'in',
  };
}

/* ═══════════════════════════════════════════════════════════════
   Main Atmosphere Canvas
═══════════════════════════════════════════════════════════════ */
function AtmosphereCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (REDUCED_ATM) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = window.innerWidth, H = window.innerHeight;
    let animId;

    const resize = () => {
      const d = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width  = W * d; canvas.height = H * d;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(d, 0, 0, d, 0, 0);
      initPools();
    };

    /* ── particle pools ── */
    let rain = [], mist = [], pollen = [], drift = [], embers = [], stars = [], streaks = [], cityLights = [];

    /* Forest tree configs — regenerated on resize */
    let forestTrees = [];
    function buildForestTrees() {
      const rng = (a, b) => a + Math.random() * (b - a);

      /* Each foliage circle: offset from canopy centre, radius, individual wind response */
      function makeCanopyCircles(canopyR, n) {
        return Array.from({ length: n }, () => ({
          offX:      rng(-canopyR * 0.60, canopyR * 0.60),
          offY:      rng(-canopyR * 0.45, canopyR * 0.18), // bias upward
          r:         canopyR * rng(0.42, 0.82),
          phase:     rng(0, Math.PI * 2),
          swayMul:   rng(0.5, 1.5),  // circle-level wind response variation
        }));
      }

      function makeTree(layer, x, h, color, opRange, maxSwayPx) {
        const trunkH  = h * rng(0.28, 0.42);
        const canopyR = h * rng(0.26, 0.36);
        const n       = 5 + Math.floor(Math.random() * 4); // 5-8 circles per canopy
        return {
          layer, x, h, color,
          op:       rng(...opRange),
          phase:    rng(0, Math.PI * 2),
          windMul:  rng(0.80, 1.20),
          maxSwayPx,
          trunkH,
          trunkW:   h * 0.036,
          canopyY:  -(trunkH + canopyR * 0.48), // canopy centre above trunk
          canopyR,
          circles:  makeCanopyCircles(canopyR, n),
        };
      }

      forestTrees = [];
      for (let i = 0; i < 13; i++)
        forestTrees.push(makeTree(0, rng(0, W), H*rng(0.07,0.13), 'rgba(5,28,11,1)', [0.58,0.78], H*0.006));
      for (let i = 0; i < 10; i++)
        forestTrees.push(makeTree(1, rng(0, W), H*rng(0.14,0.22), 'rgba(3,19,8,1)',  [0.72,0.90], H*0.010));
      const fgXs = [
        rng(0,W*0.10), rng(W*0.06,W*0.22), rng(W*0.17,W*0.30),
        rng(W*0.38,W*0.54),
        rng(W*0.68,W*0.82), rng(W*0.79,W*0.92), rng(W*0.88,W),
      ];
      for (const x of fgXs)
        forestTrees.push(makeTree(2, x, H*rng(0.23,0.34), 'rgba(2,12,5,1)', [0.86,1.0], H*0.016));

      forestTrees.sort((a, b) => a.layer - b.layer);
    }

    function initPools() {
      rain     = Array.from({ length: 55  }, () => makeRainDrop(W, H, true));
      mist     = Array.from({ length: 18  }, () => makeMistPuff(W, H));
      pollen   = Array.from({ length: 55  }, () => makePollenDot(W, H));
      drift    = Array.from({ length: 45  }, () => makeDriftDot(W, H));
      embers   = Array.from({ length: 35  }, () => makeEmber(W, H, true));
      stars    = Array.from({ length: 190 }, () => makeStar(W, H));
      streaks  = Array.from({ length: 28  }, () => makeStreak(W, H, true));
      cityLights = Array.from({ length: 12 }, () => makeCityLight(W, H));
      buildForestTrees();
    }

    let lastTs = 0;
    let flashT = 0;
    let boltPath = null;

    function generateBolt() {
      const startX = W * (0.15 + Math.random() * 0.70);
      const steps  = 10 + Math.floor(Math.random() * 6);
      const segs   = [[startX, 0]];
      let x = startX;
      for (let i = 1; i <= steps; i++) {
        x += (Math.random() - 0.5) * W * 0.18;
        x = Math.max(W * 0.05, Math.min(W * 0.95, x));
        segs.push([x, H * 0.82 * (i / steps)]);
      }
      const bi = Math.floor(steps * 0.3 + Math.random() * steps * 0.35);
      const branch = [segs[bi]];
      let bx = segs[bi][0], by = segs[bi][1];
      const bsteps = 3 + Math.floor(Math.random() * 3);
      for (let i = 1; i < bsteps; i++) {
        bx += (Math.random() - 0.45) * W * 0.14;
        by += H * 0.28 / bsteps;
        branch.push([bx, by]);
      }
      return { segs, branch };
    }

    /* ── draw helpers ── */
    function drawSceneGlow(scene, alpha) {
      const [r, g, b] = scene.glow;
      const grad = ctx.createRadialGradient(W * 0.5, H * 0.55, 0, W * 0.5, H * 0.55, Math.max(W, H) * 0.75);
      grad.addColorStop(0, `rgba(${r},${g},${b},${(0.08 + scene.fogDensity * 0.08) * alpha})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    function drawFog(scene, t, alpha) {
      const [r, g, b] = scene.fog;
      const d = scene.fogDensity;
      for (let i = 0; i < 4; i++) {
        const ox = Math.sin(t * 0.07 + i * 1.3) * W * 0.22;
        const oy = Math.cos(t * 0.05 + i * 0.9) * H * 0.18;
        const cx2 = W * (0.15 + i * 0.22) + ox;
        const cy2 = H * (0.3  + (i % 2) * 0.4) + oy;
        const rx = W * (0.30 + i * 0.08);
        const ry = H * (0.22 + i * 0.04);
        const op = d * (0.10 + i * 0.025) * alpha;
        const g2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, rx);
        g2.addColorStop(0, `rgba(${r},${g},${b},${op})`);
        g2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.ellipse(cx2, cy2, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawColorGrade(scene, alpha) {
      const [r, g, b] = scene.tint;
      ctx.fillStyle = `rgba(${r},${g},${b},${scene.tintOpacity * alpha})`;
      ctx.fillRect(0, 0, W, H);
    }

    function drawRain(dt, scene, alpha) {
      const SIN = Math.sin(76 * Math.PI / 180);
      const COS = Math.cos(76 * Math.PI / 180);
      const ms = scene.motionSpeed;
      for (let i = 0; i < rain.length; i++) {
        const d = rain[i];
        d.x += d.speed * ms * dt * COS;
        d.y += d.speed * ms * dt * SIN;
        if (d.y > H + 20) { rain[i] = makeRainDrop(W, H, false); continue; }
        ctx.save();
        ctx.globalAlpha = d.op * alpha;
        ctx.strokeStyle = 'rgba(140,185,255,1)';
        ctx.lineWidth = d.w;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(d.x - d.len * COS, d.y - d.len * SIN);
        ctx.lineTo(d.x, d.y);
        ctx.stroke();
        ctx.restore();
      }
    }

    function drawMist(dt, t, scene, alpha) {
      const ms = scene.motionSpeed;
      for (let i = 0; i < mist.length; i++) {
        const p = mist[i];
        p.x += p.vx * ms * dt;
        p.y += p.vy * ms * dt;
        p.life += dt;
        if (p.life > p.maxLife || p.x < -300 || p.x > W + 300) { mist[i] = makeMistPuff(W, H); continue; }
        const fade = Math.sin((p.life / p.maxLife) * Math.PI);
        const g2 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.rx);
        g2.addColorStop(0, `rgba(160,170,210,${p.op * fade * alpha})`);
        g2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawPollen(dt, t, scene, alpha) {
      const ms = scene.motionSpeed;
      for (let i = 0; i < pollen.length; i++) {
        const p = pollen[i];
        p.x += (p.vx + Math.sin(t * 0.4 + p.phase) * 12) * ms * dt;
        p.y += p.vy * ms * dt;
        if (p.y < -20) { pollen[i] = makePollenDot(W, H); pollen[i].y = H + 5; continue; }
        if (p.x < -20 || p.x > W + 20) p.x = p.x < 0 ? W + 10 : -10;
        const twinkle = 0.65 + 0.35 * Math.sin(t * 1.1 + p.phase);
        ctx.save();
        ctx.globalAlpha = p.op * twinkle * alpha;
        ctx.fillStyle = 'rgba(220, 200, 140, 1)';
        ctx.shadowColor = 'rgba(220, 195, 100, 0.5)';
        ctx.shadowBlur = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawLightRays(t, alpha) {
      for (let i = 0; i < 3; i++) {
        const angle = (15 + i * 20) * Math.PI / 180;
        const ox = W * (0.22 + i * 0.28);
        const len = H * 1.3;
        const w2 = 70 + i * 45;
        const op = (0.055 + i * 0.01) * (0.65 + 0.35 * Math.sin(t * 0.12 + i)) * alpha;
        ctx.save();
        /* Blur kills all hard edges — shapes become pure ambient light */
        ctx.filter = 'blur(18px)';
        ctx.translate(ox, -H * 0.08);
        ctx.rotate(angle);
        const g2 = ctx.createLinearGradient(0, 0, 0, len);
        g2.addColorStop(0,    `rgba(190, 225, 145, 0)`);
        g2.addColorStop(0.04, `rgba(190, 225, 145, ${op})`);
        g2.addColorStop(0.55, `rgba(180, 215, 130, ${op * 0.35})`);
        g2.addColorStop(1,    'rgba(0,0,0,0)');
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(8, 0);
        ctx.lineTo(w2, len);
        ctx.lineTo(-w2, len);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    /* ── Forest edge — circle-cluster canopy trees with natural wind sway ── */
    function drawForestEdge(t, alpha) {
      if (!forestTrees.length) return;

      /* Layered wind: slow base pulse + faster gust overtone */
      const wind = 0.42 + 0.50 * Math.sin(t * 0.14)
                 + 0.08 * Math.sin(t * 0.47 + 0.8);

      /* ── Drifting mist bands between tree layers ── */
      for (let i = 0; i < 3; i++) {
        const speed  = 5 + i * 3.5;
        const mCx    = W * 0.5 + Math.sin(t * speed * 0.01 + i * 2.1) * W * 0.55;
        const mCy    = H * (0.62 + i * 0.08);
        const mRx    = W  * (0.55 + i * 0.12);
        const mRy    = H  * (0.055 + i * 0.018);
        const mOp    = (0.055 + i * 0.025) * alpha * (0.7 + 0.3 * Math.sin(t * 0.22 + i));
        const mg     = ctx.createRadialGradient(mCx, mCy, 0, mCx, mCy, mRx);
        mg.addColorStop(0, `rgba(18,55,22,${mOp})`);
        mg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.ellipse(mCx, mCy, mRx, mRy, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      /* ── Ground fog ── */
      const fogH = H * 0.26;
      const fogG = ctx.createLinearGradient(0, H - fogH, 0, H);
      fogG.addColorStop(0,    'rgba(0,0,0,0)');
      fogG.addColorStop(0.40, `rgba(3,15,6,${0.32 * alpha})`);
      fogG.addColorStop(1,    `rgba(2,10,4,${0.60 * alpha})`);
      ctx.fillStyle = fogG;
      ctx.fillRect(0, H - fogH, W, fogH);

      /* ── Trees back → front ── */
      for (const tr of forestTrees) {
        const bx = tr.x, by = H + 2;

        /* Two-harmonic trunk sway for organic feel */
        const mainSway =
          (Math.sin(t * 0.55 * tr.windMul + tr.phase)       * 0.78
         + Math.sin(t * 1.30 * tr.windMul + tr.phase + 1.3) * 0.22)
          * tr.maxSwayPx * wind;

        ctx.save();
        ctx.globalAlpha = alpha * tr.op;
        ctx.fillStyle   = tr.color;

        /* Tapered trunk curves in wind direction */
        const tw   = tr.trunkW;
        const tipX = bx + mainSway;
        const tipY = by - tr.trunkH;
        ctx.beginPath();
        ctx.moveTo(bx - tw, by);
        ctx.quadraticCurveTo(bx + mainSway * 0.42 - tw * 0.3, by - tr.trunkH * 0.52, tipX - tw * 0.1, tipY);
        ctx.quadraticCurveTo(tipX, tipY - 1, tipX + tw * 0.1, tipY);
        ctx.quadraticCurveTo(bx + mainSway * 0.42 + tw * 0.3, by - tr.trunkH * 0.52, bx + tw, by);
        ctx.closePath();
        ctx.fill();

        /* Canopy centre follows trunk tip */
        const canopyCX = tipX + mainSway * 0.25;
        const canopyCY = by + tr.canopyY;

        /* Foreground glow pass */
        if (tr.layer === 2) {
          ctx.save();
          ctx.filter = 'blur(7px)';
          ctx.globalAlpha = alpha * tr.op * 0.20;
          ctx.fillStyle = 'rgba(30,92,40,1)';
          ctx.beginPath();
          for (const c of tr.circles) {
            const cs = Math.sin(t * 0.88 * tr.windMul + c.phase) * c.swayMul * tr.maxSwayPx * 0.45 * wind;
            ctx.moveTo(canopyCX + c.offX + cs + c.r * 1.15, canopyCY + c.offY);
            ctx.arc(canopyCX + c.offX + cs, canopyCY + c.offY, c.r * 1.15, 0, Math.PI * 2);
          }
          ctx.fill();
          ctx.restore();
          ctx.globalAlpha = alpha * tr.op;
          ctx.fillStyle   = tr.color;
        }

        /* Main canopy — all circles batched in one fill for performance */
        ctx.beginPath();
        for (const c of tr.circles) {
          /* Each circle sways independently — produces "leaves rustling" feel */
          const cs = Math.sin(t * 0.88 * tr.windMul + c.phase) * c.swayMul * tr.maxSwayPx * 0.45 * wind;
          const cx2 = canopyCX + c.offX + cs;
          const cy2 = canopyCY + c.offY;
          ctx.moveTo(cx2 + c.r, cy2);
          ctx.arc(cx2, cy2, c.r, 0, Math.PI * 2);
        }
        ctx.fill();

        ctx.restore();
      }
    }

    function drawDrift(dt, t, scene, alpha) {
      const ms = scene.motionSpeed;
      for (let i = 0; i < drift.length; i++) {
        const p = drift[i];
        p.x += (p.vx + Math.cos(t * 0.3 + p.phase) * p.waveAmp * 0.5) * ms * dt;
        p.y += (p.vy + Math.sin(t * 0.25 + p.phase) * 8) * ms * dt;
        if (p.x < -20) p.x = W + 10;
        if (p.x > W + 20) p.x = -10;
        if (p.y < -20) p.y = H + 10;
        if (p.y > H + 20) p.y = -10;
        const twinkle = 0.60 + 0.40 * Math.sin(t * 0.8 + p.phase);
        ctx.save();
        ctx.globalAlpha = p.op * twinkle * alpha;
        ctx.fillStyle = 'rgba(80, 190, 200, 1)';
        ctx.shadowColor = 'rgba(60, 180, 200, 0.4)';
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawCaustics(t, alpha) {
      for (let i = 0; i < 5; i++) {
        const cx2 = W * (0.1 + i * 0.2) + Math.sin(t * 0.22 + i) * 80;
        const cy2 = H * (0.55 + Math.cos(t * 0.18 + i * 0.7) * 0.25);
        const r2 = 80 + Math.sin(t * 0.3 + i) * 40;
        const op = (0.022 + 0.012 * Math.sin(t * 0.55 + i)) * alpha;
        const g2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, r2);
        g2.addColorStop(0, `rgba(60, 180, 220, ${op})`);
        g2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(cx2, cy2, r2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawEmbers(dt, t, scene, alpha) {
      const ms = scene.motionSpeed;
      for (let i = 0; i < embers.length; i++) {
        const p = embers[i];
        p.x += (p.vx + Math.sin(t * 1.2 + p.phase) * 18) * ms * dt;
        p.y += p.vy * ms * dt;
        p.op -= dt * 0.06;
        if (p.y < -10 || p.op <= 0) { embers[i] = makeEmber(W, H, false); continue; }
        const flick = 0.5 + 0.5 * Math.sin(t * 8 + p.phase);
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.op) * flick * alpha;
        ctx.fillStyle = `rgba(${220 + Math.random() * 35 | 0}, ${60 + Math.random() * 60 | 0}, 15, 1)`;
        ctx.shadowColor = 'rgba(255, 120, 30, 0.7)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawFireFlicker(t, alpha) {
      const fl = 0.04 * (0.5 + 0.5 * Math.sin(t * 7.3)) +
                 0.03 * (0.5 + 0.5 * Math.sin(t * 11.7)) +
                 0.02 * (0.5 + 0.5 * Math.sin(t * 19.1));
      const g2 = ctx.createRadialGradient(W * 0.5, H * 0.88, 0, W * 0.5, H * 0.88, W * 0.6);
      g2.addColorStop(0, `rgba(200, 70, 10, ${fl * alpha})`);
      g2.addColorStop(0.4, `rgba(160, 45, 5, ${fl * 0.5 * alpha})`);
      g2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, H);
    }

    function drawStars(dt, t, scene, alpha) {
      const ms = scene.motionSpeed;
      const scrollY = window.scrollY || 0;
      for (let i = 0; i < stars.length; i++) {
        const p = stars[i];
        const parallax = (i % 3) * 0.003;
        const sx = p.x - scrollY * parallax;
        const sy = p.y - scrollY * parallax * 0.5;
        const twinkle = 0.3 + 0.7 * Math.sin(t * p.twinkleSpeed + p.twinklePhase);
        ctx.save();
        ctx.globalAlpha = p.op * twinkle * alpha;
        ctx.fillStyle = 'rgba(220, 225, 255, 1)';
        if (p.r > 0.8) {
          ctx.shadowColor = 'rgba(200, 215, 255, 0.6)';
          ctx.shadowBlur = 4;
        }
        ctx.beginPath();
        ctx.arc(sx, sy, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawStreaks(dt, t, scene, alpha) {
      const ms = scene.motionSpeed;
      for (let i = 0; i < streaks.length; i++) {
        const p = streaks[i];
        p.x += p.speed * ms * dt;
        if (p.x - p.len > W + 20) { streaks[i] = makeStreak(W, H, false); continue; }
        const g2 = ctx.createLinearGradient(p.x - p.len, p.y, p.x, p.y);
        g2.addColorStop(0, 'rgba(140,160,220,0)');
        g2.addColorStop(0.3, `rgba(140,160,220,${p.op * alpha})`);
        g2.addColorStop(0.7, `rgba(140,160,220,${p.op * alpha})`);
        g2.addColorStop(1, 'rgba(140,160,220,0)');
        ctx.save();
        ctx.strokeStyle = g2;
        ctx.lineWidth = p.w;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x - p.len, p.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.restore();
      }
    }

    function drawCityLights(dt, t, alpha) {
      for (let i = 0; i < cityLights.length; i++) {
        const p = cityLights[i];
        p.life += dt;
        const progress = p.life / p.maxLife;
        if (p.state === 'in')  p.op = Math.min(p.maxOp, p.op + dt * 1.5);
        if (p.state === 'out') p.op = Math.max(0, p.op - dt * 2.0);
        if (p.op >= p.maxOp && p.state === 'in') { p.state = 'hold'; }
        if (p.state === 'hold' && p.life > p.maxLife * 0.6) p.state = 'out';
        if (p.state === 'out' && p.op <= 0) { cityLights[i] = makeCityLight(W, H); continue; }
        const [cr, cg, cb] = p.col;
        ctx.save();
        ctx.globalAlpha = p.op * alpha;
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
        ctx.shadowColor = `rgba(${cr},${cg},${cb},0.5)`;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawLightning(t, flashT2, alpha) {
      if (flashT2 <= 0) return;
      // Distant lightning behind clouds — diffuse sky brightening only, no bolt
      const cx = boltPath ? boltPath.segs[0][0] : W * 0.5;
      const grd = ctx.createRadialGradient(cx, H * 0.12, 0, cx, H * 0.12, W * 0.65);
      grd.addColorStop(0,   `rgba(215, 228, 255, ${flashT2 * 0.09 * alpha})`);
      grd.addColorStop(0.45,`rgba(195, 215, 255, ${flashT2 * 0.03 * alpha})`);
      grd.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
    }

    /* ── main tick ── */
    let nextFlash = 4 + Math.random() * 12;

    const tick = (ts) => {
      const dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;

      /* skip heavy atmosphere render when an immersive view is up */
      const body = document.body;
      if (document.hidden ||
          body.classList.contains('breath-focus') ||
          body.classList.contains('has-journey-open') ||
          body.classList.contains('amb-sleep')) {
        ctx.clearRect(0, 0, W, H);
        animId = requestAnimationFrame(tick);
        return;
      }
      const t = ts / 1000;

      const scene     = window.__mindspaceScene || { id:'midnight-rain', tint:[8,14,48], tintOpacity:0.22, glow:[55,95,210], fog:[12,25,72], fogDensity:0.55, particles:'rain', lightning:true, rays:false, caustics:false, flicker:false, cityLights:false, motionSpeed:0.8 };
      const prevScene = window.__mindspaceScenePrev;
      const sceneT    = window.__mindspaceSceneT !== undefined ? window.__mindspaceSceneT : 1;
      const eT        = easeInOut(sceneT);

      ctx.clearRect(0, 0, W, H);

      /* Color grade — blend prev→current */
      if (prevScene && eT < 1) {
        drawColorGrade(prevScene, 1 - eT);
        drawColorGrade(scene, eT);
        drawSceneGlow(prevScene, 1 - eT);
        drawSceneGlow(scene, eT);
        drawFog(prevScene, t, 1 - eT);
        drawFog(scene, t, eT);
      } else {
        drawColorGrade(scene, 1);
        drawSceneGlow(scene, 1);
        drawFog(scene, t, 1);
      }

      /* Scene-specific effects */
      const pAlpha = prevScene && eT < 1 ? 1 : 1; // particles always full alpha

      const pid = scene.particles;
      const pAlpha2 = eT;
      const pAlphaPrev = prevScene ? 1 - eT : 0;

      /* Draw previous scene particles fading out */
      if (prevScene && pAlphaPrev > 0.01) {
        drawParticles(prevScene.particles, dt, t, prevScene, pAlphaPrev, false);
      }
      /* Draw current scene particles fading in */
      drawParticles(pid, dt, t, scene, pAlpha2 > 0.01 ? pAlpha2 : 1, true);

      /* Special effects */
      if (scene.caustics)                    { drawCaustics(t, eT); }
      if (scene.flicker)                     { drawFireFlicker(t, eT); }
      if (scene.cityLights)                  { drawCityLights(dt, t, eT); }

      /* Lightning (midnight rain) — one event fires canvas bolt + CSS veil + sound */
      if (scene.lightning) {
        nextFlash -= dt;
        if (nextFlash <= 0) {
          flashT = 1;
          boltPath = generateBolt();
          nextFlash = 6 + Math.random() * 18;
          if (window.MindSpaceTriggerLightning) window.MindSpaceTriggerLightning();
        }
      }
      if (flashT > 0) {
        flashT = Math.max(0, flashT - dt * 6);
        drawLightning(t, flashT, eT);
      }

      animId = requestAnimationFrame(tick);
    };

    function drawParticles(type, dt, t, scene, alpha, update) {
      if (alpha < 0.01) return;
      switch (type) {
        case 'rain':    drawRain(update ? dt : 0, scene, alpha); break;
        case 'mist':    drawMist(update ? dt : 0, t, scene, alpha); break;
        case 'pollen':  drawPollen(update ? dt : 0, t, scene, alpha); break;
        case 'drift':   drawDrift(update ? dt : 0, t, scene, alpha); break;
        case 'embers':  drawEmbers(update ? dt : 0, t, scene, alpha); break;
        case 'stars':   drawStars(update ? dt : 0, t, scene, alpha); break;
        case 'streaks': drawStreaks(update ? dt : 0, t, scene, alpha); break;
        default: break;
      }
    }

    window.addEventListener('resize', resize);
    resize();
    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  if (REDUCED_ATM) return null;
  return <canvas ref={canvasRef} className="atm-canvas" aria-hidden="true" />;
}

/* ═══════════════════════════════════════════════════════════════
   Scene Switcher UI
═══════════════════════════════════════════════════════════════ */
function SceneSwitcher() {
  const engine = window.MindSpaceSceneEngine;
  const allScenes = engine ? engine.getAll() : {};
  const ids = engine ? engine.getIds() : [];

  const [open, setOpen]     = useState(false);
  const [active, setActive] = useState('midnight-rain');
  const [pulse, setPulse]   = useState(false);

  useEffect(() => {
    if (!engine) return;
    const off = engine.onChange((s) => setActive(s.id));

    /* One-time pulse to draw attention to the switcher on first visit */
    const seen = localStorage.getItem('mindspace.scenePulsed');
    if (!seen) {
      const t1 = setTimeout(() => {
        setPulse(true);
        const t2 = setTimeout(() => {
          setPulse(false);
          localStorage.setItem('mindspace.scenePulsed', '1');
        }, 5200);
        return () => clearTimeout(t2);
      }, 3200);
      return () => { off(); clearTimeout(t1); };
    }
    return off;
  }, []);

  const pick = (id) => {
    if (engine) engine.setScene(id);
    setActive(id);
    setOpen(false);
    setPulse(false);
  };

  if (!engine || ids.length === 0) return null;

  const cur = allScenes[active] || {};

  return (
    <div className={`scene-sw${open ? ' open' : ''}`}>
      {open && (
        <div className="scene-panel">
          <div className="scene-panel-label">atmosphere</div>
          {ids.map(id => {
            const s = allScenes[id];
            return (
              <button
                key={id}
                className={`scene-opt${active === id ? ' on' : ''}`}
                onClick={() => pick(id)}
              >
                <span className="scene-opt-glyph">{s.glyph}</span>
                <span className="scene-opt-body">
                  <span className="scene-opt-name">{s.label}</span>
                  {s.story && <span className="scene-opt-story">{s.story}</span>}
                </span>
                {active === id && <span className="scene-opt-tick">·</span>}
              </button>
            );
          })}
        </div>
      )}
      <button
        className={`scene-toggle${pulse ? ' pulse' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="Switch scene"
        title="Change atmosphere"
      >
        <span className="scene-toggle-glyph">{cur.glyph || '✦'}</span>
        <span className="scene-toggle-label">{cur.label || 'Scene'}</span>
      </button>
    </div>
  );
}

window.MindSpaceAtmosphere    = AtmosphereCanvas;
window.MindSpaceSceneSwitcher = SceneSwitcher;
