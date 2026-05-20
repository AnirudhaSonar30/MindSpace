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
  in:   [192, 72, 66],   // soft cyan-blue
  hold: [44,  80, 70],   // warm gold
  out:  [266, 54, 62],   // deep violet
  rest: [220, 36, 54],   // cool grey
};
const KIND_FROM_PHASE = { inhale: 'in', hold: 'hold', exhale: 'out', rest: 'rest' };

/* ============================================================
   BreathOrb — standalone Canvas component
   Reads from globals + refs; useEffect runs once.
   ============================================================ */
function BreathOrb({ runningRef, cadenceRef, cpRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    /* Resize — called on mount + resize */
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const side = Math.round(rect.width);
      canvas.width  = side * dpr;
      canvas.height = side * dpr;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    /* Particles */
    const N_PART = 88;
    const particles = Array.from({ length: N_PART }, () => {
      const base = 0.22 + Math.random() * 0.14; // fraction of half-width
      return {
        angle:  Math.random() * Math.PI * 2,
        rFrac:  base,
        baseFrac: base,
        speed:  (0.0045 + Math.random() * 0.006) * (Math.random() < 0.5 ? 1 : -1),
        size:   0.5 + Math.random() * 1.2,
        op:     0.28 + Math.random() * 0.48,
        twink:  Math.random() * Math.PI * 2,
      };
    });

    /* Wisps (3 rotating organic arcs) */
    const wisps = [0, 1, 2].map((i) => ({
      baseAngle: (i / 3) * Math.PI * 2,
      speed: 0.0022 * (i === 1 ? -1 : 1),
      rFrac: 0.30 + i * 0.04,
      spread: Math.PI * (0.55 + i * 0.08),
      width: 6 - i * 1.2,
    }));

    /* Per-frame state */
    const st = {
      frame:    0,
      ripples:  [],       // { r, maxR, op, H, S, L }
      prevPhase:'inhale',
      curH: PHASE_COL.in[0],
      curS: PHASE_COL.in[1],
      curL: PHASE_COL.in[2],
    };

    let rafId;

    const draw = () => {
      const f = ++st.frame;
      const breath  = window.__mindspaceBreath || 0;
      const phase   = window.__mindspacePhase  || 'inhale';
      const cp      = cpRef      ? cpRef.current      : 0;
      const running = runningRef ? runningRef.current : false;
      const cadence = cadenceRef ? cadenceRef.current : null;

      /* Logical size (applies dpr internally via setTransform) */
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const W = canvas.width / dpr;
      const H_PX = canvas.height / dpr;
      ctx.clearRect(0, 0, W, H_PX);
      const CX = W * 0.5, CY = H_PX * 0.5;
      const HALF = Math.min(W, H_PX) * 0.5;

      /* Phase kind → colour */
      const kind = KIND_FROM_PHASE[phase] || 'in';
      const tc   = PHASE_COL[kind];

      /* Emit ripple on phase change */
      if (phase !== st.prevPhase) {
        st.ripples.push({
          r:    HALF * (0.12 + breath * 0.14),
          maxR: HALF * 0.88,
          op:   0.72,
          H:    tc[0], S: tc[1], L: tc[2],
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

      /* Orb radius: breathes between 12% and 26% of half-width */
      const orbR = HALF * (0.12 + breath * 0.14);
      const ringR = HALF * 0.88;

      /* ── 1. Background ring + phase segments ─────────────────── */
      ctx.beginPath();
      ctx.arc(CX, CY, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(243,239,230,0.05)';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (cadence) {
        const total = cadence.phases.reduce((a, p) => a + p.dur, 0);
        let acc = 0;
        cadence.phases.forEach((ph) => {
          const c2 = PHASE_COL[ph.kind] || PHASE_COL.in;
          const a0 = -Math.PI/2 + (acc / total) * Math.PI * 2;
          const a1 = -Math.PI/2 + ((acc + ph.dur) / total) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(CX, CY, ringR, a0 + 0.025, a1 - 0.025);
          ctx.strokeStyle = hslP(c2[0], c2[1], c2[2], 0.13);
          ctx.lineWidth = 2.5;
          ctx.stroke();
          /* Tick at boundary */
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(CX + Math.cos(a0) * (ringR - 5), CY + Math.sin(a0) * (ringR - 5));
          ctx.lineTo(CX + Math.cos(a0) * (ringR + 5), CY + Math.sin(a0) * (ringR + 5));
          ctx.strokeStyle = hslP(c2[0], c2[1], c2[2], 0.28);
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.restore();
          acc += ph.dur;
        });
      }

      /* ── 2. Progress arc ─────────────────────────────────────── */
      if (cp > 0.004) {
        const arcEnd = -Math.PI / 2 + cp * Math.PI * 2;
        ctx.save();
        ctx.shadowColor = hsl;
        ctx.shadowBlur  = 14;
        ctx.beginPath();
        ctx.arc(CX, CY, ringR, -Math.PI / 2, arcEnd);
        ctx.strokeStyle = hslA(0.80);
        ctx.lineWidth   = 1.6;
        ctx.stroke();
        ctx.restore();

        /* Leading glow dot */
        ctx.save();
        ctx.shadowColor = hsl;
        ctx.shadowBlur  = 18;
        ctx.beginPath();
        ctx.arc(
          CX + Math.cos(arcEnd) * ringR,
          CY + Math.sin(arcEnd) * ringR,
          3.2, 0, Math.PI * 2,
        );
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.fill();
        ctx.restore();
      }

      /* ── 3. Ripples ──────────────────────────────────────────── */
      st.ripples = st.ripples.filter(r => r.op > 0.02);
      st.ripples.forEach(r => {
        const prog = (r.r - orbR) / (r.maxR - orbR);
        ctx.save();
        ctx.shadowColor = hslP(r.H, r.S, r.L, 0.5);
        ctx.shadowBlur  = 8;
        ctx.beginPath();
        ctx.arc(CX, CY, r.r, 0, Math.PI * 2);
        ctx.strokeStyle = hslP(r.H, r.S, r.L, r.op);
        ctx.lineWidth   = 1.8 * (1 - prog);
        ctx.stroke();
        ctx.restore();
        r.r  += 2.6;
        r.op *= 0.905;
      });

      /* ── 4. Nebula wisps ─────────────────────────────────────── */
      wisps.forEach((w, wi) => {
        const rot = f * w.speed + w.baseAngle;
        const wr  = HALF * w.rFrac;
        ctx.save();
        ctx.shadowColor = hslA(0.6);
        ctx.shadowBlur  = 16;
        ctx.beginPath();
        ctx.moveTo(
          CX + Math.cos(rot) * wr,
          CY + Math.sin(rot) * wr,
        );
        ctx.bezierCurveTo(
          CX + Math.cos(rot + w.spread * 0.35) * wr * 1.22,
          CY + Math.sin(rot + w.spread * 0.35) * wr * 1.22,
          CX + Math.cos(rot + w.spread * 0.72) * wr * 0.88,
          CY + Math.sin(rot + w.spread * 0.72) * wr * 0.88,
          CX + Math.cos(rot + w.spread) * wr * 1.10,
          CY + Math.sin(rot + w.spread) * wr * 1.10,
        );
        ctx.strokeStyle = hslA(0.09 + wi * 0.03);
        ctx.lineWidth   = w.width;
        ctx.lineCap     = 'round';
        ctx.stroke();
        ctx.restore();
      });

      /* ── 5. Particles ────────────────────────────────────────── */
      particles.forEach(p => {
        /* Drift outward on inhale, inward on exhale */
        const tgt = kind === 'in'  ? p.baseFrac + 0.13 :
                    kind === 'out' ? Math.max(orbR / HALF + 0.04, p.baseFrac - 0.06) :
                    p.baseFrac;
        p.rFrac += (tgt - p.rFrac) * 0.022;
        p.angle += p.speed;

        const pr = HALF * p.rFrac;
        if (pr < orbR + 4) return;

        const px  = CX + Math.cos(p.angle) * pr;
        const py  = CY + Math.sin(p.angle) * pr;
        const tw  = 0.5 + 0.5 * Math.sin(f * 0.038 + p.twink);
        const al  = p.op * tw * (running ? 0.90 : 0.28);

        /* Glow halo */
        const grd = ctx.createRadialGradient(px, py, 0, px, py, p.size * 3.8);
        grd.addColorStop(0, hslA(al * 0.55));
        grd.addColorStop(1, hslA(0));
        ctx.beginPath();
        ctx.arc(px, py, p.size * 3.8, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        /* Core */
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${(CH + 18)|0},88%,91%,${al.toFixed(3)})`;
        ctx.fill();
      });

      /* ── 6. Outer atmospheric halo ───────────────────────────── */
      const haloR = orbR * 1.85;
      const haloG = ctx.createRadialGradient(CX, CY, orbR * 0.65, CX, CY, haloR);
      haloG.addColorStop(0,   hslA(0.24));
      haloG.addColorStop(0.5, hslA(0.09));
      haloG.addColorStop(1,   hslA(0));
      ctx.beginPath();
      ctx.arc(CX, CY, haloR, 0, Math.PI * 2);
      ctx.fillStyle = haloG;
      ctx.fill();

      /* ── 7. Core orb — 5 layers ──────────────────────────────── */

      /* a) Deep atmospheric glow */
      const deepG = ctx.createRadialGradient(CX, CY, 0, CX, CY, orbR * 1.32);
      deepG.addColorStop(0,   hslA(0.32));
      deepG.addColorStop(0.55,hslA(0.14));
      deepG.addColorStop(1,   hslA(0));
      ctx.beginPath();
      ctx.arc(CX, CY, orbR * 1.32, 0, Math.PI * 2);
      ctx.fillStyle = deepG;
      ctx.fill();

      /* b) Body gradient (off-centre for 3D depth) */
      const bodyG = ctx.createRadialGradient(
        CX - orbR * 0.30, CY - orbR * 0.30, 0,
        CX, CY, orbR,
      );
      bodyG.addColorStop(0,    'rgba(255,255,255,0.36)');
      bodyG.addColorStop(0.20, hslA(0.78));
      bodyG.addColorStop(0.65, hslA(0.48));
      bodyG.addColorStop(1,    hslA(0.10));
      ctx.beginPath();
      ctx.arc(CX, CY, orbR, 0, Math.PI * 2);
      ctx.fillStyle = bodyG;
      ctx.fill();

      /* c) Rotating shimmer ring (colour wash that orbits surface) */
      const shimAng = f * 0.0065;
      const sX = CX + Math.cos(shimAng) * orbR * 0.38;
      const sY = CY + Math.sin(shimAng) * orbR * 0.28;
      const shimG = ctx.createRadialGradient(sX, sY, 0, sX, sY, orbR * 0.68);
      shimG.addColorStop(0, 'rgba(255,255,255,0.22)');
      shimG.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(CX, CY, orbR, 0, Math.PI * 2);
      ctx.fillStyle = shimG;
      ctx.fill();

      /* d) Inner plasma — 4 thin bezier curves rotating inside orb */
      ctx.save();
      ctx.beginPath(); ctx.arc(CX, CY, orbR * 0.96, 0, Math.PI * 2);
      ctx.clip();
      for (let i = 0; i < 4; i++) {
        const pa  = f * 0.0042 * (i % 2 === 0 ? 1 : -0.8) + (i / 4) * Math.PI * 2;
        const ir  = orbR * 0.22;
        const or2 = orbR * 0.78;
        ctx.save();
        ctx.shadowColor = hslA(0.5);
        ctx.shadowBlur  = 6;
        ctx.beginPath();
        ctx.moveTo(CX + Math.cos(pa) * ir,          CY + Math.sin(pa) * ir);
        ctx.bezierCurveTo(
          CX + Math.cos(pa + 1.1) * or2,            CY + Math.sin(pa + 1.1) * or2,
          CX + Math.cos(pa + 2.2) * or2 * 0.75,     CY + Math.sin(pa + 2.2) * or2 * 0.75,
          CX + Math.cos(pa + Math.PI) * ir * 0.85,  CY + Math.sin(pa + Math.PI) * ir * 0.85,
        );
        ctx.strokeStyle = hslA(0.18);
        ctx.lineWidth   = 1.2;
        ctx.lineCap     = 'round';
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      /* e) Specular highlight (fixed top-left, glass feel) */
      const specG = ctx.createRadialGradient(
        CX - orbR * 0.33, CY - orbR * 0.38, 0,
        CX - orbR * 0.33, CY - orbR * 0.38, orbR * 0.50,
      );
      specG.addColorStop(0,   'rgba(255,255,255,0.52)');
      specG.addColorStop(0.45,'rgba(255,255,255,0.14)');
      specG.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(CX, CY, orbR, 0, Math.PI * 2);
      ctx.fillStyle = specG;
      ctx.fill();

      /* ── 8. Phase flash on transition (brief white pulse) ──────── */
      if (st.ripples.length > 0) {
        const newest = st.ripples[st.ripples.length - 1];
        const flashAl = (newest.op - 0.42) * 0.18;
        if (flashAl > 0) {
          const flashG = ctx.createRadialGradient(CX, CY, 0, CX, CY, orbR);
          flashG.addColorStop(0, `rgba(255,255,255,${flashAl.toFixed(3)})`);
          flashG.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.beginPath();
          ctx.arc(CX, CY, orbR, 0, Math.PI * 2);
          ctx.fillStyle = flashG;
          ctx.fill();
        }
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafId); ro.disconnect(); };
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
function BreathingLab() {
  const [cadenceId, setCadenceId]  = useState('478');
  const [running,   setRunning]    = useState(false);
  const [focused,   setFocused]    = useState(false);
  const [, force]                  = useState(0);
  const rerender = useCallback(() => force((v) => (v + 1) | 0), []);

  const cadence = CADENCES.find((c) => c.id === cadenceId);
  const stRef   = useRef({ idx: 0, t: 0, elapsed: 0, cycles: 0, prevScale: 0.58 });

  /* Refs passed into the canvas */
  const runningRef = useRef(false);
  const cadenceRef = useRef(cadence);
  const cpRef      = useRef(0);

  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { cadenceRef.current = cadence; }, [cadence]);

  /* Reset on cadence change */
  useEffect(() => {
    stRef.current = { idx: 0, t: 0, elapsed: 0, cycles: 0, prevScale: 0.58 };
    rerender();
  }, [cadenceId, rerender]);

  /* Clean up body class on unmount */
  useEffect(() => {
    return () => document.body.classList.remove('breath-focus');
  }, []);

  /* Breath loop — writes globals + cpRef */
  useEffect(() => {
    if (!running) {
      window.__mindspaceOverride = false;
      return;
    }
    window.__mindspaceOverride = true;
    let raf, prev = performance.now();
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

      /* Cycle progress for the ring arc */
      const totalDur = cadence.phases.reduce((a, p) => a + p.dur, 0);
      const elapsed  = cadence.phases.slice(0, s.idx).reduce((a, p) => a + p.dur, 0) + curPh.dur * s.t;
      cpRef.current  = elapsed / totalDur;

      rerender();
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
            <BreathOrb
              runningRef={runningRef}
              cadenceRef={cadenceRef}
              cpRef={cpRef}
            />
            <div className="lab-label">
              <div className="lab-phase">{ph.label}</div>
              <div className="lab-phase-dur">{ph.dur.toFixed(1)} s</div>
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

      {/* Immersive focus overlay */}
      {focused && (
        <div className="lab-focus" onClick={endSession}>
          <div className="lab-focus-inner" onClick={(e) => e.stopPropagation()}>
            <div className="lab-focus-orb">
              <BreathOrb
                runningRef={runningRef}
                cadenceRef={cadenceRef}
                cpRef={cpRef}
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
            <button className="lab-focus-exit" onClick={endSession}>end session</button>
          </div>
        </div>
      )}
    </React.Fragment>
  );
}

/* ============================================================
   5-4-3-2-1 Grounding (unchanged)
   ============================================================ */
const GROUND_STEPS = [
  { n: 5, sense: 'see',   word: 'five',  hint: 'look around. let your eyes settle on each one in turn.' },
  { n: 4, sense: 'hear',  word: 'four',  hint: 'close your eyes if you like. listen further than the room.' },
  { n: 3, sense: 'touch', word: 'three', hint: 'the chair under you. the floor. your own hands.' },
  { n: 2, sense: 'smell', word: 'two',   hint: 'breathe in slowly. notice what the air carries.' },
  { n: 1, sense: 'taste', word: 'one',   hint: 'your mouth, your tongue. whatever is there.' },
];

function Grounding() {
  const [idx, setIdx] = useState(0);
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const step = GROUND_STEPS[idx];

  const tap = useCallback(() => {
    if (done || transitioning) return;
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
        }, 1100);
      }
      return next;
    });
  }, [done, transitioning, idx, step.n]);

  const reset = () => { setIdx(0); setCount(0); setDone(false); setTransitioning(false); };

  return (
    <div className="ground">
      <div className="ground-progress">
        {GROUND_STEPS.map((g, i) => (
          <div
            key={i}
            className={
              'ground-pip' +
              ((done || i < idx)   ? ' done'   : '') +
              ((!done && i === idx) ? ' active' : '')
            }
          >
            <span>{g.n}</span>
          </div>
        ))}
      </div>

      {done ? (
        <div className="ground-done">
          <div className="ground-prompt"><span className="it">You're back.</span></div>
          <div className="ground-hint">
            Sit with this for a moment. Notice how the room feels different than it did.
          </div>
          <button className="ground-tap" onClick={reset}>
            <span>begin again</span><span className="arrow">→</span>
          </button>
        </div>
      ) : (
        <>
          <div key={'p' + idx} className={'ground-prompt ' + (transitioning ? 'fading' : '')}>
            <span className="ground-num">{step.word}</span>
            <span> things you can </span>
            <span className="it">{step.sense}</span>
          </div>
          <div className="ground-dots">
            {Array.from({ length: step.n }, (_, i) => (
              <div key={i} className={'ground-dot ' + (i < count ? 'filled' : '')}/>
            ))}
          </div>
          <div key={'h' + idx} className={'ground-hint ' + (transitioning ? 'fading' : '')}>
            {step.hint}
          </div>
          <button className="ground-tap" onClick={tap} disabled={transitioning}>
            <span>{transitioning ? 'breathe' : 'noticed one'}</span>
            <span className="arrow">→</span>
          </button>
        </>
      )}
    </div>
  );
}

window.MindSpaceBreathingLab = BreathingLab;
window.MindSpaceGrounding    = Grounding;
