/* MindSpace — interactive practices v2
   BreathOrb: full Canvas 2D renderer with particles, ripples, wisps,
   phase-color transitions and a 5-layer gradient sphere.
*/

const { useState, useEffect, useRef, useCallback } = React;

const easeInOutSine = (t) => -(Math.cos(Math.PI * Math.max(0, Math.min(1, t))) - 1) / 2;

/* ============================================================
   Breathing Lab cadences
   ============================================================ */
const CADENCES = [
  {
    id: '478',
    nums: '4 · 7 · 8',
    name: 'before sleep',
    desc: 'A sedating count. Use when the day will not let go of you.',
    source: 'Andrew Weil — relaxation response',
    phases: [
      { kind: 'in',   label: 'inhale', dur: 4 },
      { kind: 'hold', label: 'hold',   dur: 7 },
      { kind: 'out',  label: 'exhale', dur: 8 },
    ],
  },
  {
    id: 'box',
    nums: '4 · 4 · 4 · 4',
    name: 'steady focus',
    desc: 'An even square. Calms without sedating. Used by Navy operators and emergency clinicians.',
    source: 'Box breathing — tactical / first responder',
    phases: [
      { kind: 'in',   label: 'inhale', dur: 4 },
      { kind: 'hold', label: 'hold',   dur: 4 },
      { kind: 'out',  label: 'exhale', dur: 4 },
      { kind: 'hold', label: 'hold',   dur: 4 },
    ],
  },
  {
    id: 'sigh',
    nums: 'sigh · sigh · out',
    name: 'fastest reset',
    desc: 'Two short inhales through the nose, then one long exhale through the mouth. Drops autonomic arousal in seconds.',
    source: 'Huberman Lab — Stanford, 2023',
    phases: [
      { kind: 'in',   label: 'inhale',   dur: 1.5 },
      { kind: 'in',   label: 'top up',   dur: 0.9 },
      { kind: 'out',  label: 'long out', dur: 5.5 },
      { kind: 'rest', label: 'rest',     dur: 1.4 },
    ],
  },
  {
    id: 'coherent',
    nums: '5.5 / min',
    name: 'heart coherence',
    desc: 'Five and a half breaths a minute. Tunes heart-rate variability toward its resonance frequency.',
    source: 'HeartMath — resonance-frequency breathing',
    phases: [
      { kind: 'in',  label: 'inhale', dur: 5.45 },
      { kind: 'out', label: 'exhale', dur: 5.45 },
    ],
  },
];

function phaseScale(kind, t, prevScale) {
  if (kind === 'in')   return 0.58 + 0.42 * easeInOutSine(t);
  if (kind === 'out')  return 1.00 - 0.42 * easeInOutSine(t);
  if (kind === 'hold') return prevScale ?? 1.0;
  return 0.58;
}
function fmtTime(sec) {
  const m = Math.floor(sec / 60), ss = Math.floor(sec % 60);
  return String(m).padStart(2,'0') + ':' + String(ss).padStart(2,'0');
}

/* ============================================================
   Phase colour palette (H S L)
   ============================================================ */
const PHASE_COL = {
  inhale: [192, 72, 66],   // soft cyan-blue
  hold:   [44,  80, 70],   // warm gold
  exhale: [266, 54, 62],   // deep violet
  rest:   [220, 36, 54],   // cool grey
};
const KIND_FROM_PHASE = { inhale: 'inhale', hold: 'hold', exhale: 'exhale', rest: 'rest' };

/* ============================================================
   BreathOrb — standalone Canvas component
   Reads from globals + refs; useEffect runs once.
   ============================================================ */
function BreathOrb({ runningRef, cadenceRef, cpRef }) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, on: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const sideW = Math.round(rect.width);
      const sideH = Math.round(rect.height);
      canvas.width  = sideW * dpr;
      canvas.height = sideH * dpr;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    /* Mouse position relative to canvas (parallax + sigil reactivity) */
    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - r.left) / r.width  - 0.5;
      mouseRef.current.y = (e.clientY - r.top)  / r.height - 0.5;
      mouseRef.current.on = true;
    };
    const onLeave = () => { mouseRef.current.on = false; };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseleave', onLeave);

    /* ── three orbital layers — outer / mid / inner — each with its
       own count, base radius and direction. all particles carry
       a 4-point trail. ── */
    const LAYERS = [
      { count: 28, baseR: 0.62, speed:  0.0034, sizeMin: 0.6, sizeMax: 1.5, dir:  1 },
      { count: 22, baseR: 0.48, speed: -0.0050, sizeMin: 0.7, sizeMax: 1.7, dir: -1 },
      { count: 18, baseR: 0.34, speed:  0.0075, sizeMin: 0.5, sizeMax: 1.3, dir:  1 },
    ];
    const particles = [];
    LAYERS.forEach((L, li) => {
      for (let i = 0; i < L.count; i++) {
        particles.push({
          layer: li,
          angle: Math.random() * Math.PI * 2,
          baseR: L.baseR + (Math.random() - 0.5) * 0.04,
          rFrac: L.baseR,
          speed: L.speed * (0.85 + Math.random() * 0.4),
          size:  L.sizeMin + Math.random() * (L.sizeMax - L.sizeMin),
          op:    0.40 + Math.random() * 0.45,
          twink: Math.random() * Math.PI * 2,
          tx: [0, 0, 0, 0],   // trail positions x
          ty: [0, 0, 0, 0],   // trail positions y
        });
      }
    });

    /* Wisps (3 nebula arcs) */
    const wisps = [0, 1, 2].map((i) => ({
      baseAngle: (i / 3) * Math.PI * 2,
      speed: 0.0022 * (i === 1 ? -1 : 1),
      rFrac: 0.78 + i * 0.06,
      spread: Math.PI * (0.55 + i * 0.08),
      width: 7 - i * 1.2,
    }));

    /* Floating outer glyphs (sigil orbit) — slow, drift around outermost ring */
    const GLYPHS = ['·', '✦', '·', '◇', '·', '·', '✧', '·'];
    const sigils = GLYPHS.map((g, i) => ({
      glyph: g,
      angle: (i / GLYPHS.length) * Math.PI * 2,
      speed: 0.00045 * (i % 2 === 0 ? 1 : -0.85),
      rFrac: 1.00,
      op:    g === '·' ? 0.30 : 0.55,
      size:  g === '·' ? 12 : 16,
    }));

    /* Per-frame state */
    const st = {
      frame:    0,
      ripples:  [],
      prevPhase:'inhale',
      curH: PHASE_COL.inhale[0],
      curS: PHASE_COL.inhale[1],
      curL: PHASE_COL.inhale[2],
      mx: 0, my: 0,
    };

    let rafId;

    const draw = () => {
      const f = ++st.frame;
      const breath  = window.__mindspaceBreath || 0;
      const phase   = window.__mindspacePhase  || 'inhale';
      const cp      = cpRef      ? cpRef.current      : 0;
      const running = runningRef ? runningRef.current : false;
      const cadence = cadenceRef ? cadenceRef.current : null;

      /* mouse parallax (lerp toward target) */
      const mTarget = mouseRef.current;
      st.mx += ((mTarget.on ? mTarget.x : 0) - st.mx) * 0.06;
      st.my += ((mTarget.on ? mTarget.y : 0) - st.my) * 0.06;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const W = canvas.width / dpr;
      const H_PX = canvas.height / dpr;
      ctx.clearRect(0, 0, W, H_PX);
      const CX = W * 0.5 + st.mx * 14;
      const CY = H_PX * 0.5 + st.my * 14;
      const HALF = Math.min(W, H_PX) * 0.5;

      /* Phase kind → colour */
      const kind = KIND_FROM_PHASE[phase] || 'inhale';
      const tc   = PHASE_COL[kind] || PHASE_COL.inhale;

      /* Emit a ring on phase change — dramatic, screen-wide */
      if (phase !== st.prevPhase) {
        st.ripples.push({
          r:    HALF * 0.08,
          maxR: HALF * 1.10,
          op:   0.95,
          H:    tc[0], S: tc[1], L: tc[2],
          /* a slower, second shockwave */
        });
        st.ripples.push({
          r:    HALF * 0.04,
          maxR: HALF * 1.30,
          op:   0.55,
          H:    tc[0], S: tc[1], L: tc[2],
          slow: true,
        });
        st.prevPhase = phase;
      }

      /* Lerp colour */
      st.curH += (tc[0] - st.curH) * 0.038;
      st.curS += (tc[1] - st.curS) * 0.038;
      st.curL += (tc[2] - st.curL) * 0.038;
      const CH = st.curH, CS = st.curS, CL = st.curL;
      const hsl  = `hsl(${CH|0},${CS|0}%,${CL|0}%)`;
      const hslA = (a) => `hsla(${CH|0},${CS|0}%,${CL|0}%,${a.toFixed(3)})`;
      const hslP = (H,S,L,a) => `hsla(${H|0},${S|0}%,${L|0}%,${a.toFixed(3)})`;

      /* Orb radius: breathes 14% → 28% of half (slightly larger than before) */
      const orbR  = HALF * (0.14 + breath * 0.14);
      const ringR = HALF * 0.86;
      const innerSanctumR = orbR * 0.42;

      /* ── 0. Backdrop — soft atmospheric noise vignette ─────── */
      const bgG = ctx.createRadialGradient(CX, CY, orbR * 0.5, CX, CY, HALF * 1.05);
      bgG.addColorStop(0,    hslA(0.07));
      bgG.addColorStop(0.55, hslA(0.020));
      bgG.addColorStop(1,    'rgba(0,0,0,0)');
      ctx.fillStyle = bgG;
      ctx.fillRect(0, 0, W, H_PX);

      /* ── 1. Outermost cadence ring + dotted track ─────────── */
      ctx.save();
      ctx.setLineDash([1, 4]);
      ctx.beginPath();
      ctx.arc(CX, CY, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(243,239,230,0.10)';
      ctx.lineWidth = 0.7;
      ctx.stroke();
      ctx.restore();

      /* Three faint orbital tracks (matching particle layers) */
      LAYERS.forEach((L) => {
        ctx.save();
        ctx.setLineDash([0.6, 5]);
        ctx.beginPath();
        ctx.arc(CX, CY, HALF * L.baseR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(243,239,230,0.045)';
        ctx.lineWidth = 0.6;
        ctx.stroke();
        ctx.restore();
      });

      /* Cadence-coloured arcs around the outer ring */
      if (cadence) {
        const total = cadence.phases.reduce((a, p) => a + p.dur, 0);
        let acc = 0;
        cadence.phases.forEach((ph) => {
          const phKind = ph.kind === 'in' ? 'inhale' : ph.kind === 'out' ? 'exhale' : ph.kind;
          const c2 = PHASE_COL[phKind] || PHASE_COL.inhale;
          const a0 = -Math.PI/2 + (acc / total) * Math.PI * 2;
          const a1 = -Math.PI/2 + ((acc + ph.dur) / total) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(CX, CY, ringR, a0 + 0.020, a1 - 0.020);
          ctx.strokeStyle = hslP(c2[0], c2[1], c2[2], 0.18);
          ctx.lineWidth = 2.6;
          ctx.stroke();
          /* boundary tick */
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(CX + Math.cos(a0) * (ringR - 6), CY + Math.sin(a0) * (ringR - 6));
          ctx.lineTo(CX + Math.cos(a0) * (ringR + 6), CY + Math.sin(a0) * (ringR + 6));
          ctx.strokeStyle = hslP(c2[0], c2[1], c2[2], 0.38);
          ctx.lineWidth = 0.9;
          ctx.stroke();
          ctx.restore();
          acc += ph.dur;
        });
      }

      /* Cardinal markers — 8 little ticks beyond the outer ring,
         pulsing with breath */
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const inner = ringR + 9;
        const outer = inner + 5 + breath * 6;
        const op = 0.18 + breath * 0.25;
        ctx.beginPath();
        ctx.moveTo(CX + Math.cos(a) * inner, CY + Math.sin(a) * inner);
        ctx.lineTo(CX + Math.cos(a) * outer, CY + Math.sin(a) * outer);
        ctx.strokeStyle = hslA(op);
        ctx.lineWidth = i % 2 === 0 ? 0.9 : 0.5;
        ctx.stroke();
      }

      /* ── 2. Progress arc — ring colour pulled from current phase ─ */
      if (cp > 0.004) {
        const arcEnd = -Math.PI / 2 + cp * Math.PI * 2;
        ctx.save();
        ctx.shadowColor = hsl;
        ctx.shadowBlur  = 16;
        ctx.beginPath();
        ctx.arc(CX, CY, ringR, -Math.PI / 2, arcEnd);
        ctx.strokeStyle = hslA(0.86);
        ctx.lineWidth   = 1.8;
        ctx.lineCap     = 'round';
        ctx.stroke();
        ctx.restore();

        /* leading dot */
        ctx.save();
        ctx.shadowColor = hsl;
        ctx.shadowBlur  = 22;
        ctx.beginPath();
        ctx.arc(
          CX + Math.cos(arcEnd) * ringR,
          CY + Math.sin(arcEnd) * ringR,
          3.4, 0, Math.PI * 2,
        );
        ctx.fillStyle = 'rgba(255,255,255,0.96)';
        ctx.fill();
        ctx.restore();
      }

      /* ── 3. Phase rings — expanding shockwaves on each phase ── */
      st.ripples = st.ripples.filter(r => r.op > 0.02);
      st.ripples.forEach(r => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(CX, CY, r.r, 0, Math.PI * 2);
        ctx.strokeStyle = hslP(r.H, r.S, r.L, r.op * (r.slow ? 0.55 : 1));
        ctx.lineWidth   = r.slow ? 0.7 : 1.6;
        ctx.stroke();
        ctx.restore();
        r.r  += r.slow ? 1.6 : 3.4;
        r.op *= r.slow ? 0.972 : 0.940;
      });

      /* ── 4. Nebula wisps — sweeping curves outside the orb ──── */
      wisps.forEach((w, wi) => {
        const rot = f * w.speed + w.baseAngle;
        const wr  = HALF * w.rFrac * (0.96 + breath * 0.06);
        ctx.save();
        ctx.shadowColor = hslA(0.55);
        ctx.shadowBlur  = 18;
        ctx.beginPath();
        ctx.moveTo(
          CX + Math.cos(rot) * wr,
          CY + Math.sin(rot) * wr,
        );
        ctx.bezierCurveTo(
          CX + Math.cos(rot + w.spread * 0.35) * wr * 1.18,
          CY + Math.sin(rot + w.spread * 0.35) * wr * 1.18,
          CX + Math.cos(rot + w.spread * 0.72) * wr * 0.88,
          CY + Math.sin(rot + w.spread * 0.72) * wr * 0.88,
          CX + Math.cos(rot + w.spread) * wr * 1.08,
          CY + Math.sin(rot + w.spread) * wr * 1.08,
        );
        ctx.strokeStyle = hslA(0.07 + wi * 0.025);
        ctx.lineWidth   = w.width;
        ctx.lineCap     = 'round';
        ctx.stroke();
        ctx.restore();
      });

      /* ── 5. Particle pass — update positions, draw trails first
         then cores. trails are 4-segment fades, drawn as simple lines
         (cheap). ──────────────────────────────────────────────── */
      const partPositions = []; // for constellation pass next

      particles.forEach(p => {
        const L = LAYERS[p.layer];
        const tgt = kind === 'inhale' ? p.baseR + 0.05
                  : kind === 'exhale' ? Math.max(orbR / HALF + 0.045, p.baseR - 0.035)
                  : p.baseR;
        p.rFrac += (tgt - p.rFrac) * 0.030;
        p.angle += p.speed;

        const pr = HALF * p.rFrac;
        if (pr < orbR + 4) return;

        const px = CX + Math.cos(p.angle) * pr;
        const py = CY + Math.sin(p.angle) * pr;

        /* shift trail back one slot, write head */
        for (let i = p.tx.length - 1; i > 0; i--) {
          p.tx[i] = p.tx[i - 1];
          p.ty[i] = p.ty[i - 1];
        }
        p.tx[0] = px; p.ty[0] = py;

        const tw = 0.5 + 0.5 * Math.sin(f * 0.038 + p.twink);
        const al = p.op * tw * (running ? 0.90 : 0.42);

        /* trail */
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineWidth = p.size * 0.55;
        for (let i = 1; i < p.tx.length; i++) {
          if (p.tx[i] === 0 && p.ty[i] === 0) continue;
          ctx.beginPath();
          ctx.moveTo(p.tx[i - 1], p.ty[i - 1]);
          ctx.lineTo(p.tx[i],     p.ty[i]);
          ctx.strokeStyle = hslA(al * (1 - i / p.tx.length) * 0.55);
          ctx.stroke();
        }
        ctx.restore();

        /* halo */
        ctx.beginPath();
        ctx.arc(px, py, p.size * 2.6, 0, Math.PI * 2);
        ctx.fillStyle = hslA(al * 0.18);
        ctx.fill();

        /* core */
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${(CH + 18)|0},88%,93%,${al.toFixed(3)})`;
        ctx.fill();

        partPositions.push({ x: px, y: py, al });
      });

      /* constellation lines between near particles — windowed
         (each particle checks only the next ~6 in the list,
         keeping the cost linear). */
      const LINK_MAX = 32;
      const LINK_MAX_SQ = LINK_MAX * LINK_MAX;
      ctx.save();
      ctx.lineWidth = 0.45;
      for (let i = 0; i < partPositions.length; i++) {
        const a = partPositions[i];
        const end = Math.min(partPositions.length, i + 7);
        for (let j = i + 1; j < end; j++) {
          const b = partPositions[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dsq = dx * dx + dy * dy;
          if (dsq < LINK_MAX_SQ) {
            const t = 1 - Math.sqrt(dsq) / LINK_MAX;
            ctx.strokeStyle = hslA(Math.min(a.al, b.al) * t * 0.45);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      /* ── 6. Outer atmospheric halo around the orb ─────────── */
      const haloR = orbR * 2.10;
      const haloG = ctx.createRadialGradient(CX, CY, orbR * 0.65, CX, CY, haloR);
      haloG.addColorStop(0,   hslA(0.30));
      haloG.addColorStop(0.5, hslA(0.10));
      haloG.addColorStop(1,   hslA(0));
      ctx.beginPath();
      ctx.arc(CX, CY, haloR, 0, Math.PI * 2);
      ctx.fillStyle = haloG;
      ctx.fill();

      /* ── 7. Godrays — pulse outward with breath ────────────── */
      const N_RAYS = 24;
      const innerR = orbR * 0.95;
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 0; i < N_RAYS; i++) {
        const rayA   = (i / N_RAYS) * Math.PI * 2 + f * 0.0028;
        const rayLen = HALF * (0.05 + breath * 0.34 + 0.030 * Math.sin(f * 0.04 + i * 1.7));
        ctx.beginPath();
        ctx.moveTo(CX + Math.cos(rayA) * innerR,            CY + Math.sin(rayA) * innerR);
        ctx.lineTo(CX + Math.cos(rayA) * (innerR + rayLen), CY + Math.sin(rayA) * (innerR + rayLen));
        ctx.strokeStyle = hslA(0.04 + breath * 0.13);
        ctx.lineWidth   = i % 4 === 0 ? 0.95 : 0.50;
        ctx.stroke();
      }
      ctx.restore();

      /* ── 8. Core orb — morphing organic shape + layers ────── */
      const MORPH_N = 36;
      const drawOrbPath = (rScale) => {
        const r = orbR * (rScale || 1);
        ctx.beginPath();
        for (let i = 0; i <= MORPH_N; i++) {
          const a = (i / MORPH_N) * Math.PI * 2;
          const wobble = 1
            + 0.046 * Math.sin(f * 0.018 + a * 3.1) * (0.4 + breath * 0.6)
            + 0.028 * Math.cos(f * 0.024 + a * 5.3) * (0.4 + breath * 0.6);
          const pr2 = r * wobble;
          const x = CX + Math.cos(a) * pr2;
          const y = CY + Math.sin(a) * pr2;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
      };

      /* deep atmospheric glow */
      const deepG = ctx.createRadialGradient(CX, CY, 0, CX, CY, orbR * 1.40);
      deepG.addColorStop(0,    hslA(0.40));
      deepG.addColorStop(0.55, hslA(0.16));
      deepG.addColorStop(1,    hslA(0));
      drawOrbPath(1.40);
      ctx.fillStyle = deepG;
      ctx.fill();

      /* body gradient */
      const bodyG = ctx.createRadialGradient(
        CX - orbR * 0.32, CY - orbR * 0.30, 0,
        CX, CY, orbR * 1.04,
      );
      bodyG.addColorStop(0,    'rgba(255,255,255,0.38)');
      bodyG.addColorStop(0.18, hslA(0.88));
      bodyG.addColorStop(0.62, hslA(0.55));
      bodyG.addColorStop(1,    hslA(0.10));
      drawOrbPath(1.0);
      ctx.fillStyle = bodyG;
      ctx.fill();

      /* rotating shimmer wash */
      const shimAng = f * 0.0068;
      const sX = CX + Math.cos(shimAng) * orbR * 0.36;
      const sY = CY + Math.sin(shimAng) * orbR * 0.27;
      const shimG = ctx.createRadialGradient(sX, sY, 0, sX, sY, orbR * 0.68);
      shimG.addColorStop(0, 'rgba(255,255,255,0.24)');
      shimG.addColorStop(1, 'rgba(255,255,255,0)');
      drawOrbPath(1.0);
      ctx.fillStyle = shimG;
      ctx.fill();

      /* plasma threads — bezier curves clipped to orb */
      ctx.save();
      drawOrbPath(0.96);
      ctx.clip();
      for (let i = 0; i < 5; i++) {
        const pa  = f * 0.0046 * (i % 2 === 0 ? 1 : -0.8) + (i / 5) * Math.PI * 2;
        const ir  = orbR * 0.22;
        const or2 = orbR * 0.78;
        ctx.beginPath();
        ctx.moveTo(CX + Math.cos(pa) * ir,         CY + Math.sin(pa) * ir);
        ctx.bezierCurveTo(
          CX + Math.cos(pa + 1.1) * or2,           CY + Math.sin(pa + 1.1) * or2,
          CX + Math.cos(pa + 2.2) * or2 * 0.75,    CY + Math.sin(pa + 2.2) * or2 * 0.75,
          CX + Math.cos(pa + Math.PI) * ir * 0.85, CY + Math.sin(pa + Math.PI) * ir * 0.85,
        );
        ctx.strokeStyle = hslA(0.20);
        ctx.lineWidth   = 1.2;
        ctx.lineCap     = 'round';
        ctx.stroke();
      }
      ctx.restore();

      /* specular highlight */
      const specG = ctx.createRadialGradient(
        CX - orbR * 0.34, CY - orbR * 0.40, 0,
        CX - orbR * 0.34, CY - orbR * 0.40, orbR * 0.54,
      );
      specG.addColorStop(0,    'rgba(255,255,255,0.50)');
      specG.addColorStop(0.50, 'rgba(255,255,255,0.10)');
      specG.addColorStop(1,    'rgba(255,255,255,0)');
      drawOrbPath(1.0);
      ctx.fillStyle = specG;
      ctx.fill();

      /* outer edge stroke — gives the orb a definite silhouette */
      drawOrbPath(1.0);
      ctx.strokeStyle = hslA(0.40);
      ctx.lineWidth = 0.9;
      ctx.stroke();

      /* ── 9. Inner sanctum — small concentric ring + dot,
         counter-rotating, very subtle ─────────────────────── */
      ctx.save();
      const sancAng = -f * 0.012;
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) {
        const a = sancAng + (i / 24) * Math.PI * 2;
        const wobble = 1 + 0.06 * Math.sin(f * 0.04 + a * 4);
        const pr2 = innerSanctumR * wobble;
        const x = CX + Math.cos(a) * pr2;
        const y = CY + Math.sin(a) * pr2;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255,255,255,0.50)';
      ctx.lineWidth = 0.7;
      ctx.stroke();
      /* center dot */
      ctx.beginPath();
      ctx.arc(CX, CY, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.shadowColor = 'rgba(255,255,255,0.8)';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();

      /* ── 10. Floating outer glyph ring — sigils orbit slowly ─ */
      ctx.save();
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      sigils.forEach(s => {
        s.angle += s.speed;
        const r = HALF * (s.rFrac + 0.02 * Math.sin(f * 0.008 + s.angle * 3));
        const x = CX + Math.cos(s.angle) * r;
        const y = CY + Math.sin(s.angle) * r;
        ctx.font = `${s.size}px "JetBrains Mono", monospace`;
        ctx.fillStyle = hslA(s.op);
        ctx.fillText(s.glyph, x, y);
      });
      ctx.restore();

      /* ── 11. Phase flash overlay on transition ─────────────── */
      if (st.ripples.length > 0) {
        const newest = st.ripples[0];
        const flashAl = (newest.op - 0.62) * 0.20;
        if (flashAl > 0) {
          const flashG = ctx.createRadialGradient(CX, CY, 0, CX, CY, orbR * 1.4);
          flashG.addColorStop(0, `rgba(255,255,255,${flashAl.toFixed(3)})`);
          flashG.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.beginPath();
          ctx.arc(CX, CY, orbR * 1.4, 0, Math.PI * 2);
          ctx.fillStyle = flashG;
          ctx.fill();
        }
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <canvas
      ref={canvasRef}
      className="lab-canvas"
      aria-label="Breathing visualisation"
    />
  );
}

/* ============================================================
   Breathing Lab
   ============================================================ */
function BreathingLab({ autoFocus, onExit }) {
  const initFocus  = !!autoFocus;
  const [cadenceId, setCadenceId]  = useState('478');
  const [orbStyle, setOrbStyle] = useState(() => {
    try { return localStorage.getItem('mindspace.orbStyle.v3') || 'globe'; } catch { return 'globe'; }
  });
  const [running,   setRunning]    = useState(initFocus);
  const [focused,   setFocused]    = useState(initFocus);
  const [, force]                  = useState(0);
  const rerender = useCallback(() => force((v) => (v + 1) | 0), []);

  const pickOrb = (id) => {
    setOrbStyle(id);
    try { localStorage.setItem('mindspace.orbStyle.v3', id); } catch {}
  };

  const cadence = CADENCES.find((c) => c.id === cadenceId);
  const stRef   = useRef({ idx: 0, t: 0, elapsed: 0, cycles: 0, prevScale: 0.58 });

  /* Use the v2 orb if it loaded, else fall back to the original */
  const OrbComp = window.MindSpaceBreathOrbV2 || BreathOrb;
  const AuraComp = window.MindSpaceBreathAura;

  /* Refs passed into the canvas — initialise runningRef to match initial state */
  const runningRef = useRef(initFocus);
  const cadenceRef = useRef(cadence);
  const cpRef      = useRef(0);

  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { cadenceRef.current = cadence; }, [cadence]);

  /* Reset on cadence change */
  useEffect(() => {
    stRef.current = { idx: 0, t: 0, elapsed: 0, cycles: 0, prevScale: 0.58 };
    rerender();
  }, [cadenceId, rerender]);

  /* Manage body class for focus mode */
  useEffect(() => {
    if (initFocus) document.body.classList.add('breath-focus');
    return () => document.body.classList.remove('breath-focus');
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  /* Breath loop — writes globals + cpRef.
     Canvas reads globals at 60fps; React UI re-renders throttled to ~8fps. */
  useEffect(() => {
    if (!running) {
      window.__mindspaceOverride = false;
      return;
    }
    window.__mindspaceOverride = true;
    let raf, prev = performance.now(), lastUI = 0;
    const loop = (now) => {
      const dt = Math.min(0.1, (now - prev) / 1000);
      prev = now;
      const s  = stRef.current;
      s.elapsed += dt;
      const ph  = cadence.phases[s.idx];
      s.t += dt / ph.dur;
      while (s.t >= 1) {
        s.t -= 1;
        s.prevScale = phaseScale(ph.kind, 1, s.prevScale);
        s.idx = (s.idx + 1) % cadence.phases.length;
        if (s.idx === 0) s.cycles++;
      }
      const curPh = cadence.phases[s.idx];
      const sc    = phaseScale(curPh.kind, s.t, s.prevScale);
      const norm  = (sc - 0.58) / 0.42;
      window.__mindspaceBreath = Math.max(0, Math.min(1, norm));
      window.__mindspacePhase  =
        curPh.kind === 'in'  ? 'inhale' :
        curPh.kind === 'out' ? 'exhale' : 'hold';

      const totalDur = cadence.phases.reduce((a, p) => a + p.dur, 0);
      const elapsedInCycle = cadence.phases.slice(0, s.idx).reduce((a, p) => a + p.dur, 0) + curPh.dur * s.t;
      cpRef.current = elapsedInCycle / totalDur;

      /* Throttle React re-renders to ~8 fps — canvas runs at full 60 fps */
      if (now - lastUI > 125) { rerender(); lastUI = now; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.__mindspaceOverride = false; };
  }, [running, cadenceId, cadence, rerender]);

  const beginSession = () => {
    stRef.current = { idx: 0, t: 0, elapsed: 0, cycles: 0, prevScale: 0.58 };
    setRunning(true);
    setFocused(true);
    document.body.classList.add('breath-focus');
  };

  const endSession = () => {
    setRunning(false);
    setFocused(false);
    document.body.classList.remove('breath-focus');
    if (onExit) onExit();
  };

  const s   = stRef.current;
  const ph  = cadence.phases[s.idx];

  return (
    <React.Fragment>
      {/* Normal lab — hidden when focus overlay is active */}
      {!focused && (
        <div className="lab">
          {/* Cadence picker */}
          <div className="lab-picker">
            <div className="lab-picker-label">cadence</div>
            {CADENCES.map((c) => (
              <button
                key={c.id}
                className={'lab-cad ' + (c.id === cadenceId ? 'active' : '')}
                onClick={() => setCadenceId(c.id)}
              >
                <span className="lab-cad-nums">{c.nums}</span>
                <span className="lab-cad-name">{c.name}</span>
              </button>
            ))}
          </div>

          {/* Orb stage */}
          <div className="lab-stage">
            {AuraComp ? <AuraComp/> : null}
            <OrbComp
              runningRef={runningRef}
              cadenceRef={cadenceRef}
              cpRef={cpRef}
              style={orbStyle}
            />
            <div className="lab-label">
              <div className="lab-phase">{ph.label}</div>
              <div className="lab-phase-dur">{ph.dur.toFixed(1)} s</div>
            </div>
            {/* Inline style picker */}
            <div className="lab-orb-styles">
              {(window.MindSpaceBreathStyles || ['glass','reactor','nebula','jellyfish','wireframe']).map(id => (
                <button
                  key={id}
                  className={'lab-orb-style' + (orbStyle === id ? ' on' : '')}
                  onClick={() => pickOrb(id)}
                >{id}</button>
              ))}
            </div>
          </div>

          {/* Side panel */}
          <div className="lab-side">
            <div className="lab-desc">{cadence.desc}</div>
            <div className="lab-source">— {cadence.source}</div>
            <div className="lab-stats">
              <div>
                <span className="rk">elapsed</span>
                <span className="rv">{fmtTime(s.elapsed)}</span>
              </div>
              <div>
                <span className="rk">cycles</span>
                <span className="rv">{String(s.cycles).padStart(2, '0')}</span>
              </div>
            </div>
            <button className="lab-btn" onClick={beginSession}>
              <span className="lab-btn-dot"/>
              <span>begin</span>
            </button>
          </div>
        </div>
      )}

      {/* Immersive focus overlay — portaled to body to escape .mode-panel clip-path */}
      {focused && ReactDOM.createPortal(
        <div className="lab-focus" onClick={endSession}>
          {AuraComp ? <AuraComp/> : null}
          <div className="lab-focus-inner" onClick={(e) => e.stopPropagation()}>
            <div className="lab-focus-orb">
              <OrbComp
                runningRef={runningRef}
                cadenceRef={cadenceRef}
                cpRef={cpRef}
                style={orbStyle}
              />
            </div>
            <div className="lab-focus-phase">{ph.label}</div>
            <div className="lab-focus-dur">{ph.dur.toFixed(1)} s</div>
            <div className="lab-focus-meta">
              <span className="rk">elapsed</span>
              <span className="rv">&nbsp;{fmtTime(s.elapsed)}</span>
              <span className="rk">&nbsp;·&nbsp;</span>
              <span className="rk">cycles</span>
              <span className="rv">&nbsp;{String(s.cycles).padStart(2, '0')}</span>
            </div>
            <div className="lab-focus-cads">
              {CADENCES.map(c => (
                <button
                  key={c.id}
                  className={'lab-focus-cad' + (c.id === cadenceId ? ' on' : '')}
                  onClick={() => setCadenceId(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <div className="lab-focus-styles">
              {(window.MindSpaceBreathStyles || ['glass','reactor','nebula','jellyfish','wireframe']).map(id => (
                <button
                  key={id}
                  className={'lab-focus-style' + (orbStyle === id ? ' on' : '')}
                  onClick={() => pickOrb(id)}
                >{id}</button>
              ))}
            </div>
            <button className="lab-focus-exit" onClick={endSession}>end session</button>
          </div>
        </div>,
        document.body
      )}
    </React.Fragment>
  );
}

/* ============================================================
   5-4-3-2-1 Grounding — cinematic rewrite
   ============================================================ */
const GROUND_STEPS = [
  {
    n: 5, sense: 'see',   word: 'five',
    hint: 'look around. let your eyes settle on each one in turn.',
    color: [192, 56, 70],   // cool cyan
    glyph: 'eye',
  },
  {
    n: 4, sense: 'hear',  word: 'four',
    hint: 'close your eyes if you like. listen further than the room.',
    color: [220, 36, 64],   // soft indigo
    glyph: 'ear',
  },
  {
    n: 3, sense: 'touch', word: 'three',
    hint: 'the chair under you. the floor. your own hands.',
    color: [40,  70, 70],   // amber
    glyph: 'hand',
  },
  {
    n: 2, sense: 'smell', word: 'two',
    hint: 'breathe in slowly. notice what the air carries.',
    color: [320, 40, 68],   // dusk rose
    glyph: 'air',
  },
  {
    n: 1, sense: 'taste', word: 'one',
    hint: 'your mouth, your tongue. whatever is there.',
    color: [10,  60, 68],   // ember red
    glyph: 'drop',
  },
];

/* Sense SVG glyphs — minimal, line-based, large */
function SenseGlyph({ kind, breath }) {
  const s = 220;
  const breathK = (typeof breath === 'number' ? breath : 0.5);
  const expand = 1 + breathK * 0.04;
  const op = 0.55 + breathK * 0.25;
  const common = { stroke: 'currentColor', fill: 'none', strokeWidth: 0.9, strokeLinecap: 'round' };
  return (
    <svg
      className="ground-sense-glyph"
      width={s} height={s} viewBox="0 0 100 100"
      style={{ opacity: op, transform: `scale(${expand})` }}
      aria-hidden="true"
    >
      {kind === 'eye' && (
        <g {...common}>
          <path d="M10 50 Q50 18 90 50 Q50 82 10 50 Z"/>
          <circle cx="50" cy="50" r="12"/>
          <circle cx="50" cy="50" r="4.5" fill="currentColor" stroke="none"/>
          <circle cx="50" cy="50" r="22" opacity="0.35"/>
        </g>
      )}
      {kind === 'ear' && (
        <g {...common}>
          <path d="M50 22 Q70 22 70 48 Q70 64 56 64 Q50 64 50 72 Q50 80 42 80 Q34 80 32 70"/>
          <path d="M50 36 Q60 36 60 48 Q60 56 52 56" opacity="0.6"/>
          <path d="M22 50 Q14 50 14 60" opacity="0.45"/>
          <path d="M16 38 Q8 42 8 50" opacity="0.30"/>
        </g>
      )}
      {kind === 'hand' && (
        <g {...common}>
          <path d="M36 78 L36 44 Q36 40 40 40 Q44 40 44 44 L44 30 Q44 26 48 26 Q52 26 52 30 L52 44 Q52 28 56 28 Q60 28 60 32 L60 46 Q60 34 64 34 Q68 34 68 38 L68 60 Q68 78 56 78 Z"/>
          <path d="M36 70 Q30 68 28 62" opacity="0.5"/>
        </g>
      )}
      {kind === 'air' && (
        <g {...common}>
          <path d="M14 36 Q40 30 60 36 Q78 40 86 32"/>
          <path d="M14 50 Q40 44 60 50 Q78 54 86 46" opacity="0.7"/>
          <path d="M14 64 Q40 58 60 64 Q78 68 86 60" opacity="0.45"/>
          <circle cx="74" cy="34" r="1.3" fill="currentColor" stroke="none"/>
          <circle cx="68" cy="48" r="1.0" fill="currentColor" stroke="none"/>
        </g>
      )}
      {kind === 'drop' && (
        <g {...common}>
          <path d="M50 22 Q66 50 66 64 Q66 78 50 78 Q34 78 34 64 Q34 50 50 22 Z"/>
          <path d="M50 50 Q56 56 56 64" opacity="0.45"/>
        </g>
      )}
    </svg>
  );
}

function Grounding() {
  const [idx, setIdx] = useState(0);
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [ripples, setRipples] = useState([]);
  const [breath, setBreath] = useState(0);
  const canvasRef = useRef(null);

  const step = GROUND_STEPS[idx];

  /* Atmospheric canvas behind the grounding UI — pulsing particles
     tinted by the current sense colour. Updates ripples when user taps. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width  = Math.round(r.width)  * dpr;
      canvas.height = Math.round(r.height) * dpr;
    };
    const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

    /* drifting particles tinted by sense */
    const N = 60;
    const particles = Array.from({ length: N }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.5 + Math.random() * 1.6,
      vx: (Math.random() - 0.5) * 0.0006,
      vy: (Math.random() - 0.5) * 0.0006,
      op: 0.10 + Math.random() * 0.40,
      ph: Math.random() * Math.PI * 2,
    }));

    /* sense colour, lerped */
    let curH = 200, curS = 50, curL = 70;
    let raf;
    let frame = 0;
    let bx = 0;

    const draw = () => {
      frame++;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const W = canvas.width / dpr, H = canvas.height / dpr;
      ctx.clearRect(0, 0, W, H);

      const tc = GROUND_STEPS[idx]?.color || GROUND_STEPS[0].color;
      curH += (tc[0] - curH) * 0.020;
      curS += (tc[1] - curS) * 0.020;
      curL += (tc[2] - curL) * 0.020;
      const hslA = (a) => `hsla(${curH|0},${curS|0}%,${curL|0}%,${a.toFixed(3)})`;

      /* slow synthetic breath for the SVG to ride */
      bx += 0.01;
      const sineBreath = 0.5 + 0.5 * Math.sin(bx);
      setBreath(prev => prev + (sineBreath - prev) * 0.05);

      /* atmospheric bloom */
      const bloom = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.7);
      bloom.addColorStop(0,   hslA(0.16));
      bloom.addColorStop(0.5, hslA(0.06));
      bloom.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, W, H);

      /* drifting motes */
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;
        const tw = 0.5 + 0.5 * Math.sin(frame * 0.018 + p.ph);
        const px = p.x * W, py = p.y * H;
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fillStyle = hslA(p.op * tw * 0.6);
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [idx]); /* re-init colour lerp on step change */

  const addRipple = useCallback((x, y) => {
    const id = Date.now() + Math.random();
    setRipples(r => [...r.slice(-6), { id, x, y, born: performance.now() }]);
    setTimeout(() => setRipples(r => r.filter(x => x.id !== id)), 1300);
  }, []);

  const tap = useCallback((e) => {
    if (done || transitioning) return;
    /* extract tap position relative to the tap-zone */
    let x = 0.5, y = 0.5;
    const target = e?.currentTarget;
    if (e && target && e.clientX != null) {
      const r = target.getBoundingClientRect();
      x = (e.clientX - r.left) / r.width;
      y = (e.clientY - r.top)  / r.height;
    }
    addRipple(x, y);
    setCount((c) => {
      const next = c + 1;
      if (next >= step.n) {
        setTransitioning(true);
        setTimeout(() => {
          if (idx + 1 >= GROUND_STEPS.length) {
            setDone(true); setTransitioning(false);
          } else {
            setIdx(idx + 1); setCount(0); setTransitioning(false);
          }
        }, 1300);
      }
      return next;
    });
  }, [done, transitioning, idx, step.n, addRipple]);

  const reset = () => {
    setIdx(0); setCount(0); setDone(false);
    setTransitioning(false); setRipples([]);
  };

  /* total noticed for completion screen */
  const totalNoticed = 5 + 4 + 3 + 2 + 1;

  return (
    <div className={'ground ground-rich ground-step-' + (step?.glyph || 'eye') + (done ? ' is-done' : '')}>
      <canvas ref={canvasRef} className="ground-canvas" aria-hidden="true"/>

      {/* Progress lozenge — five sense labels */}
      <div className="ground-progress-rich">
        {GROUND_STEPS.map((g, i) => (
          <div
            key={i}
            className={
              'ground-step-tag' +
              ((done || i < idx) ? ' done'   : '') +
              ((!done && i === idx) ? ' active' : '')
            }
          >
            <span className="ground-step-n">{g.n}</span>
            <span className="ground-step-sense">{g.sense}</span>
          </div>
        ))}
      </div>

      {done ? (
        <div className="ground-done-rich">
          <div className="ground-done-eyebrow">{totalNoticed} small returns</div>
          <h2 className="ground-done-title">
            You're <span className="it">back.</span>
          </h2>
          <p className="ground-done-sub">
            sit with this for a moment.<br/>
            notice how the room feels different than it did.
          </p>
          <div className="ground-done-constellation" aria-hidden="true">
            {GROUND_STEPS.flatMap((g, gi) =>
              Array.from({ length: g.n }, (_, i) => (
                <span
                  key={gi + '-' + i}
                  className="ground-done-star"
                  style={{
                    animationDelay: (gi * 0.18 + i * 0.06) + 's',
                    background: `hsl(${g.color[0]},${g.color[1]}%,80%)`,
                  }}
                />
              ))
            )}
          </div>
          <button className="ground-cta" onClick={reset}>
            <span>begin again</span><span className="arrow">→</span>
          </button>
        </div>
      ) : (
        <div className="ground-stage-rich">
          <SenseGlyph kind={step.glyph} breath={breath}/>

          <div className={'ground-headline' + (transitioning ? ' fading' : '')} key={'h' + idx}>
            <span className="ground-num-big">{step.word}</span>
            <span className="ground-sub">things you can</span>
            <span className="ground-sense-big it">{step.sense}</span>
          </div>

          <div
            className="ground-tap-zone-rich"
            onClick={tap}
            role="button"
            tabIndex={0}
            onKeyDown={e => (e.key === ' ' || e.key === 'Enter') && tap(e)}
          >
            <div className="ground-dots-rich">
              {Array.from({ length: step.n }, (_, i) => (
                <div key={i} className={'ground-dot-rich ' + (i < count ? 'filled' : '')}>
                  <span className="ground-dot-n">{step.n - i}</span>
                </div>
              ))}
            </div>
            {ripples.map(r => (
              <div
                key={r.id}
                className="ground-ripple-rich"
                style={{ left: (r.x * 100) + '%', top: (r.y * 100) + '%' }}
                aria-hidden="true"
              />
            ))}
            <div className="ground-tap-hint">tap each time you notice one</div>
          </div>

          <p className={'ground-hint-rich' + (transitioning ? ' fading' : '')} key={'p' + idx}>
            {step.hint}
          </p>
        </div>
      )}
    </div>
  );
}

window.MindSpaceBreathingLab = BreathingLab;
window.MindSpaceGrounding    = Grounding;
