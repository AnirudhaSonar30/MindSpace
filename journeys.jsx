/* MindSpace — Guided Journeys v3
   Four protocol-specific breathing experiences.
   Each opens a fullscreen story → guided timed session.
*/

const { useState, useEffect, useRef } = React;

/* ═══════════════════════════════════════════════════════════════
   Data
═══════════════════════════════════════════════════════════════ */
const JOURNEYS = [
  {
    id: 'anxiety-reset',
    eyebrow: '01 · anxiety',
    title: 'Anxiety Reset',
    duration: '6 min',
    protocol: 'Physiological Sigh',
    blurb: "When the chest gets tight and the breath gets shallow — a short, evidence-based descent back into the body.",
    story: "Anxiety lives in the future. Right now, your nervous system is running a simulation — one that feels very real. This journey doesn't ask you to stop that simulation. It asks you to breathe differently inside it.\n\nThe physiological sigh — two short inhales through the nose, one long exhale — is the fastest known way to reduce physiological stress. A 2023 Stanford study found five minutes daily outperformed meditation for mood improvement over 28 days. It takes ninety seconds. Then you do it again.",
    science: [
      "A 2023 Stanford study found that cyclic sighing for 5 minutes daily reduced anxiety faster and more effectively than mindfulness meditation over 28 days.",
      "The double inhale reinflates collapsed alveoli, maximising oxygen absorption and directly activating the vagus nerve — the body's own calming signal.",
      "The effect begins within 90 seconds: stress markers drop after just 1–3 physiological sighs.",
    ],
    stages: [
      'Notice the tightness without naming it',
      'First inhale — fill the lungs fully',
      'Second short inhale — top them off',
      'Long exhale through soft lips — release everything',
    ],
    suggest: 'sigh',
    palette: { a: 'oklch(0.62 0.10 250)', b: 'oklch(0.45 0.06 280)' },
    glyph: 'j-anxiety',
  },
  {
    id: 'burnout-recovery',
    eyebrow: '02 · burnout',
    title: 'Burnout Recovery',
    duration: '12 min',
    protocol: 'Heart Coherence',
    blurb: "For when the gas tank is somewhere below empty. Restorative coherent breathing with long exhales.",
    story: "Burnout is not tiredness. You can sleep through tiredness. Burnout is something the nervous system accumulates over months of spending more than it earns.\n\nThis journey runs slow. Five and a half breaths per minute — the resonant frequency of the human cardiovascular system. At this rate, heart rate variability peaks, the autonomic nervous system begins to rebalance. Sit. Do nothing for a minute first. That minute counts.",
    science: [
      "At exactly 0.1 Hz — 5.5 breaths per minute — heart, respiratory and nervous systems lock into harmonic resonance, visible as a sharp peak in heart rate variability.",
      "HeartMath Institute's 30 years of research show that coherence states measurably improve emotional regulation, cognitive clarity, and recovery from chronic stress.",
      "Combining slow breathing with a moment of appreciation or calm amplifies the coherence effect and accelerates the shift out of burnout.",
    ],
    stages: [
      'Sit. Don\'t do anything for sixty seconds',
      'Five and a half breaths a minute — equal in and out',
      'Let the exhale be a little longer than the inhale',
      'Notice the body recover without being asked',
    ],
    suggest: 'coherent',
    palette: { a: 'oklch(0.55 0.07 30)', b: 'oklch(0.35 0.05 50)' },
    glyph: 'j-burnout',
  },
  {
    id: 'overthinking',
    eyebrow: '03 · mind',
    title: 'Overthinking Detox',
    duration: '8 min',
    protocol: 'Box Breathing',
    blurb: "The brain in a loop. Box breathing slows the loop down to a square the loop has to walk around.",
    story: "The default mode network — the brain's resting thought engine — doesn't have an off switch. But it has a geometry.\n\nBox breathing imposes a structure on time: four counts in, four counts held, four counts out, four counts held. The loop has to wait. It can't sprint through a square. Somewhere in the third or fourth box, the thought that seemed urgent starts to look smaller than it did.",
    science: [
      "The post-exhale hold in box breathing activates the prefrontal cortex, which directly dampens amygdala fear signals — allowing calm, rational processing to resume.",
      "Used by US Navy SEALs under operational stress, box breathing is the only cognitive technique shown to maintain decision-making quality under extreme pressure.",
      "Equal-ratio breathing prevents CO₂ dysregulation, eliminating the physical sensations of anxiety that often amplify overthinking loops.",
    ],
    stages: [
      'Four counts in — through the nose',
      'Four counts hold — the first pause',
      'Four counts out — through soft lips',
      'Four counts hold — begin the next box',
    ],
    suggest: 'box',
    palette: { a: 'oklch(0.55 0.09 290)', b: 'oklch(0.40 0.06 320)' },
    glyph: 'j-mind',
  },
  {
    id: 'sleep-recovery',
    eyebrow: '04 · night',
    title: 'Sleep Recovery',
    duration: '14 min',
    protocol: '4 · 7 · 8',
    blurb: "For nights the day won't let go of. The 4·7·8 cadence — a sedating count borrowed from older traditions.",
    story: "The 4·7·8 cadence was formalised by Andrew Weil, but the proportions are older — borrowed from pranayama, where breath retention at the top of the inhale is thought to shift the nervous system state.\n\nThe count is long enough that the mind has to do nothing but track it. Four counts in through the nose. Seven counts held, gently. Eight counts out through soft lips. After four cycles, sleep finds you — not the other way around.",
    science: [
      "The extended 8-count exhale deeply activates the parasympathetic nervous system, triggering what Dr. Andrew Weil calls a 'natural tranquiliser' — the fastest non-pharmacological sedation known.",
      "The 7-count hold oxygenates the blood more completely than normal breathing, lowering heart rate and releasing muscular tension built up during the day.",
      "This pattern originates in pranayama traditions over 3,000 years old — the same breath ratio appears independently in Tibetan tummo and ancient Vedic texts.",
    ],
    stages: [
      'Four counts in through the nose',
      'Seven counts held, gently — let the oxygen settle',
      'Eight counts out through soft lips',
      'Four cycles — then let sleep find you',
    ],
    suggest: '478',
    palette: { a: 'oklch(0.40 0.06 270)', b: 'oklch(0.22 0.03 290)' },
    glyph: 'j-sleep',
  },
];

const PROTOCOLS = {
  sigh: {
    totalDuration: 360,
    phases: [
      { id: 'inhale1', label: 'First inhale',  sub: 'through the nose',   duration: 2   },
      { id: 'inhale2', label: 'Top off',        sub: 'a second short sip',  duration: 1.5 },
      { id: 'exhale',  label: 'Sigh out',       sub: 'long and complete',   duration: 6   },
    ],
  },
  coherent: {
    totalDuration: 720,
    phases: [
      { id: 'inhale', label: 'Breathe in',  sub: 'slow and even',    duration: 5.5 },
      { id: 'exhale', label: 'Breathe out', sub: 'a touch longer',   duration: 5.5 },
    ],
  },
  box: {
    totalDuration: 480,
    phases: [
      { id: 'inhale',  label: 'In',    sub: 'four counts',  duration: 4 },
      { id: 'holdIn',  label: 'Hold',  sub: 'four counts',  duration: 4 },
      { id: 'exhale',  label: 'Out',   sub: 'four counts',  duration: 4 },
      { id: 'holdOut', label: 'Hold',  sub: 'four counts',  duration: 4 },
    ],
  },
  '478': {
    totalDuration: 840,
    phases: [
      { id: 'inhale', label: 'In',     sub: 'four counts',   duration: 4 },
      { id: 'hold',   label: 'Hold',   sub: 'seven counts',  duration: 7 },
      { id: 'exhale', label: 'Out',    sub: 'eight counts',  duration: 8 },
    ],
  },
};

/* ═══════════════════════════════════════════════════════════════
   Canvas visualisations — one draw function per protocol
═══════════════════════════════════════════════════════════════ */
function drawSigh(ctx, W, H, phaseId, progress, totalProgress) {
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) * 0.26;
  const t = Date.now() / 1000;

  // Orb radius per phase
  let orbR;
  if      (phaseId === 'inhale1') orbR = R * (0.42 + progress * 0.36);
  else if (phaseId === 'inhale2') orbR = R * (0.78 + progress * 0.18);
  else                            orbR = R * (0.96 - progress * 0.54);

  // Atmospheric halo
  const halo = ctx.createRadialGradient(cx, cy, orbR * 0.8, cx, cy, orbR * 2.8);
  halo.addColorStop(0, `rgba(140, 180, 255, ${0.18 * (orbR / R)})`);
  halo.addColorStop(1, 'rgba(140, 180, 255, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(cx, cy, orbR * 2.8, 0, Math.PI * 2); ctx.fill();

  // Orb body
  const body = ctx.createRadialGradient(cx - orbR * 0.28, cy - orbR * 0.28, 0, cx, cy, orbR);
  body.addColorStop(0,   'rgba(220, 235, 255, 0.92)');
  body.addColorStop(0.45,'rgba(130, 175, 240, 0.75)');
  body.addColorStop(1,   'rgba(70,  110, 210, 0.18)');
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.arc(cx, cy, orbR, 0, Math.PI * 2); ctx.fill();

  // Specular highlight
  const spec = ctx.createRadialGradient(cx - orbR * 0.35, cy - orbR * 0.3, 0, cx - orbR * 0.35, cy - orbR * 0.3, orbR * 0.5);
  spec.addColorStop(0, 'rgba(255, 255, 255, 0.30)');
  spec.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = spec;
  ctx.beginPath(); ctx.arc(cx, cy, orbR, 0, Math.PI * 2); ctx.fill();

  // Second pulse ring on inhale2
  if (phaseId === 'inhale2' && progress > 0) {
    const pr = orbR * (1 + progress * 0.35);
    ctx.strokeStyle = `rgba(180, 210, 255, ${(1 - progress) * 0.5})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, pr, 0, Math.PI * 2); ctx.stroke();
  }

  // Session progress ring
  const pR = Math.min(W, H) * 0.42;
  ctx.strokeStyle = 'rgba(140, 180, 255, 0.12)';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(cx, cy, pR, 0, Math.PI * 2); ctx.stroke();

  ctx.strokeStyle = `rgba(170, 210, 255, ${0.45 + totalProgress * 0.40})`;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, pR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * totalProgress);
  ctx.stroke();
}

function drawCoherent(ctx, W, H, phaseId, progress, totalProgress) {
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2;
  const t = Date.now() / 1000;
  const amp = H * 0.12 * (phaseId === 'inhale' ? (0.2 + progress * 0.8) : (1.0 - progress * 0.8));
  const waveColor = 'rgba(210, 148, 88, ';

  // Three wave layers
  [[0.80, 1.5, 0], [0.40, 1.0, Math.PI * 0.3], [0.18, 0.5, Math.PI * 0.6]].forEach(([op, lw, ph]) => {
    ctx.strokeStyle = waveColor + op + ')';
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let x = 0; x <= W; x += 3) {
      const y = cy + amp * Math.sin((x / W) * Math.PI * 3 + t * 0.85 + ph);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  });

  // Center coherence circle
  const r = Math.min(W, H) * 0.08;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.5);
  glow.addColorStop(0, `rgba(220, 155, 80, ${0.55 + amp / (H * 0.12) * 0.30})`);
  glow.addColorStop(1, 'rgba(220, 155, 80, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, cy, r * 2.5, 0, Math.PI * 2); ctx.fill();

  // Session progress ring
  const pR = Math.min(W, H) * 0.42;
  ctx.strokeStyle = 'rgba(210, 148, 88, 0.12)';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(cx, cy, pR, 0, Math.PI * 2); ctx.stroke();

  ctx.strokeStyle = `rgba(220, 160, 90, ${0.45 + totalProgress * 0.45})`;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, pR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * totalProgress);
  ctx.stroke();
}

function drawBox(ctx, W, H, phaseId, progress, totalProgress) {
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2;
  const hs = Math.min(W, H) * 0.22; // half-size of square

  const corners = [
    [cx - hs, cy + hs], // 0 bottom-left  → starts inhale
    [cx + hs, cy + hs], // 1 bottom-right → starts holdIn
    [cx + hs, cy - hs], // 2 top-right    → starts exhale
    [cx - hs, cy - hs], // 3 top-left     → starts holdOut
  ];

  const sideMap = { inhale: 0, holdIn: 1, exhale: 2, holdOut: 3 };
  const side = sideMap[phaseId] ?? 0;
  const pathFrac = (side + progress) / 4; // 0..1 around the square

  // Square outline
  ctx.strokeStyle = 'rgba(180, 140, 230, 0.18)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(...corners[0]);
  corners.forEach(c => ctx.lineTo(...c));
  ctx.closePath();
  ctx.stroke();

  // Corner dots
  corners.forEach((c, i) => {
    ctx.fillStyle = i < side + 1 ? 'rgba(200, 165, 255, 0.75)' : 'rgba(180, 140, 230, 0.22)';
    ctx.shadowColor = 'rgba(200, 165, 255, 0.5)';
    ctx.shadowBlur = i < side + 1 ? 8 : 0;
    ctx.beginPath(); ctx.arc(...c, 3.5, 0, Math.PI * 2); ctx.fill();
  });
  ctx.shadowBlur = 0;

  // Traced path
  const totalPoints = pathFrac * 4;
  ctx.strokeStyle = 'rgba(200, 165, 255, 0.80)';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(200, 165, 255, 0.55)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(...corners[0]);
  for (let s = 0; s < 4 && s < totalPoints; s++) {
    const [fx, fy] = corners[s % 4];
    const [tx, ty] = corners[(s + 1) % 4];
    const frac = s < Math.floor(totalPoints) ? 1 : (totalPoints - s);
    ctx.lineTo(fx + (tx - fx) * frac, fy + (ty - fy) * frac);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Moving dot
  const dotSide = Math.floor(totalPoints % 4);
  const dotT = totalPoints % 1;
  const [dx1, dy1] = corners[dotSide % 4];
  const [dx2, dy2] = corners[(dotSide + 1) % 4];
  const dotX = dx1 + (dx2 - dx1) * dotT;
  const dotY = dy1 + (dy2 - dy1) * dotT;

  ctx.fillStyle = 'rgba(230, 210, 255, 1)';
  ctx.shadowColor = 'rgba(200, 165, 255, 0.9)';
  ctx.shadowBlur = 20;
  ctx.beginPath(); ctx.arc(dotX, dotY, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  // Session progress ring
  const pR = Math.min(W, H) * 0.42;
  ctx.strokeStyle = 'rgba(180, 140, 230, 0.12)';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(cx, cy, pR, 0, Math.PI * 2); ctx.stroke();

  ctx.strokeStyle = `rgba(200, 165, 255, ${0.40 + totalProgress * 0.45})`;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, pR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * totalProgress);
  ctx.stroke();
}

function draw478(ctx, W, H, phaseId, progress, totalProgress, cycleCount) {
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2;
  const t = Date.now() / 1000;

  // Per-cycle arc: inhale fills 0→4/19, hold 4/19→11/19, exhale 11/19→1
  const arcStarts = { inhale: 0, hold: 4 / 19, exhale: 11 / 19 };
  const arcLens   = { inhale: 4 / 19, hold: 7 / 19, exhale: 8 / 19 };
  const arcProgress = (arcStarts[phaseId] ?? 0) + (arcLens[phaseId] ?? 0) * progress;

  const r = Math.min(W, H) * 0.34;

  // Ambient glow
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.8);
  glow.addColorStop(0, `rgba(90, 120, 200, ${0.10 + arcProgress * 0.08})`);
  glow.addColorStop(1, 'rgba(90, 120, 200, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.8, 0, Math.PI * 2); ctx.fill();

  // Base ring
  ctx.strokeStyle = 'rgba(100, 130, 210, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

  // Phase arc (fills this cycle)
  if (arcProgress > 0) {
    ctx.strokeStyle = 'rgba(130, 165, 255, 0.78)';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(130, 165, 255, 0.45)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * arcProgress);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Glow dot at arc tip
    const tipAngle = -Math.PI / 2 + Math.PI * 2 * arcProgress;
    const tx = cx + r * Math.cos(tipAngle);
    const ty = cy + r * Math.sin(tipAngle);
    const tipGlow = ctx.createRadialGradient(tx, ty, 0, tx, ty, 14);
    tipGlow.addColorStop(0, 'rgba(180, 210, 255, 0.9)');
    tipGlow.addColorStop(1, 'rgba(180, 210, 255, 0)');
    ctx.fillStyle = tipGlow;
    ctx.beginPath(); ctx.arc(tx, ty, 14, 0, Math.PI * 2); ctx.fill();
  }

  // Stars — one per completed cycle, distributed with golden angle
  const maxStars = Math.min(cycleCount, 22);
  const goldenAngle = 2.39996;
  for (let i = 0; i < maxStars; i++) {
    const angle = i * goldenAngle;
    const starR = r * (0.35 + 0.28 * (((i * 7919) % 100) / 100));
    const sx = cx + starR * Math.cos(angle);
    const sy = cy + starR * Math.sin(angle);
    const twinkle = 0.25 + 0.45 * Math.sin(t * 1.2 + i * 0.9);
    ctx.fillStyle = `rgba(200, 225, 255, ${twinkle})`;
    ctx.beginPath(); ctx.arc(sx, sy, 1.4, 0, Math.PI * 2); ctx.fill();
  }

  // Session progress ring (outer)
  const pR = r + 26;
  ctx.strokeStyle = 'rgba(100, 130, 210, 0.10)';
  ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.arc(cx, cy, pR, 0, Math.PI * 2); ctx.stroke();

  ctx.strokeStyle = `rgba(130, 165, 255, ${0.38 + totalProgress * 0.45})`;
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, pR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * totalProgress);
  ctx.stroke();
}

const DRAW = { sigh: drawSigh, coherent: drawCoherent, box: drawBox, '478': draw478 };

/* ═══════════════════════════════════════════════════════════════
   GuidedSession — full-screen timed breathing
═══════════════════════════════════════════════════════════════ */
function GuidedSession({ j, onClose }) {
  const protocol  = PROTOCOLS[j.suggest];
  const phases    = protocol.phases;
  const totalDur  = protocol.totalDuration;
  const drawFn    = DRAW[j.suggest];

  const sRef = useRef({
    phaseIdx: 0, phaseTime: 0, cycleCount: 0,
    totalElapsed: 0, paused: false, lastTs: null,
  });
  const lastUiAt = useRef(0);

  const [done,   setDone]   = useState(false);
  const [paused, setPaused] = useState(false);
  const [ui, setUi]         = useState({
    phaseIdx: 0, phaseProgress: 0,
    cycleCount: 0, totalElapsed: 0,
  });

  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = 1, H = 1;

    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      const d = window.devicePixelRatio || 1;
      W = p.offsetWidth; H = p.offsetHeight;
      canvas.width  = W * d; canvas.height = H * d;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);

    const tick = (ts) => {
      const s = sRef.current;

      if (!s.paused) {
        const dt = s.lastTs ? Math.min((ts - s.lastTs) / 1000, 0.05) : 0;
        s.lastTs = ts;
        s.totalElapsed += dt;

        if (s.totalElapsed >= totalDur) {
          setDone(true);
          return;
        }

        const phase = phases[s.phaseIdx];
        s.phaseTime += dt;
        const pp = Math.min(1, s.phaseTime / phase.duration);

        if (s.phaseTime >= phase.duration) {
          s.phaseTime -= phase.duration;
          s.phaseIdx = (s.phaseIdx + 1) % phases.length;
          if (s.phaseIdx === 0) s.cycleCount++;
        }

        const totalP = s.totalElapsed / totalDur;
        drawFn(ctx, W, H, phases[s.phaseIdx].id, pp, totalP, s.cycleCount);

        // Update UI at ~10fps
        if (ts - lastUiAt.current > 100) {
          lastUiAt.current = ts;
          setUi({ phaseIdx: s.phaseIdx, phaseProgress: pp, cycleCount: s.cycleCount, totalElapsed: s.totalElapsed });
        }
      } else {
        s.lastTs = ts;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, []);

  const togglePause = () => {
    sRef.current.paused = !sRef.current.paused;
    sRef.current.lastTs = null;
    setPaused(p => !p);
  };

  const forceEnd = () => { setDone(true); };

  if (done) {
    const totalCycles = Math.floor(ui.totalElapsed / phases.reduce((a, p) => a + p.duration, 0));
    return (
      <div className="js-complete">
        <div className="js-complete-glow" style={{ '--a': j.palette.a }}/>
        <div className="js-complete-eyebrow">{j.eyebrow}</div>
        <h2 className="js-complete-title">Session complete.</h2>
        <p className="js-complete-sub">{j.duration} of {j.protocol}</p>
        <div className="js-complete-stats">
          <div className="js-stat">
            <span className="js-stat-n">{ui.cycleCount || totalCycles}</span>
            <span className="js-stat-l">cycles</span>
          </div>
          <div className="js-stat-div"/>
          <div className="js-stat">
            <span className="js-stat-n">{j.duration}</span>
            <span className="js-stat-l">practice</span>
          </div>
        </div>
        <p className="js-complete-note">
          Stay here a moment. Let the breath settle back to normal.
        </p>
        <button className="j-begin" onClick={onClose}>
          <span>Return</span>
          <span className="arrow">→</span>
        </button>
      </div>
    );
  }

  const remaining = Math.max(0, totalDur - ui.totalElapsed);
  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  const currentPhase = phases[ui.phaseIdx];
  const phaseRemaining = currentPhase
    ? Math.ceil(currentPhase.duration * (1 - ui.phaseProgress))
    : 0;

  return (
    <div className="js-session">
      <div className="js-session-top">
        <span className="js-session-title">{j.title}</span>
        <span className="js-session-time">{mins}:{String(secs).padStart(2, '0')}</span>
      </div>
      <div className="js-session-viz">
        <canvas ref={canvasRef} className="js-breath-viz" aria-hidden="true"/>
      </div>
      <div className="js-session-cue">
        <div className={'js-cue-phase' + (paused ? ' paused' : '')}>
          {paused ? 'paused' : (currentPhase?.label ?? '')}
        </div>
        {!paused && <div className="js-cue-sub">{currentPhase?.sub ?? ''}</div>}
        {!paused && <div className="js-cue-count">{phaseRemaining}</div>}
      </div>
      <div className="js-session-controls">
        <button className="js-ctrl-btn" onClick={togglePause}>
          {paused ? 'resume' : 'pause'}
        </button>
        <button className="js-ctrl-btn js-ctrl-end" onClick={forceEnd}>
          end
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Science card strip
═══════════════════════════════════════════════════════════════ */
function SciencePanel({ j, visible }) {
  return (
    <section className="js-science" data-reveal-stage="science">
      <div className={'js-science-inner' + (visible ? ' in' : '')}>
        <div className="js-science-label">the science</div>
        <div className="js-science-grid">
          {j.science.map((fact, i) => (
            <div key={i} className="js-sci-card" style={{ transitionDelay: (0.10 + i * 0.16) + 's' }}>
              <span className="js-sci-n">{String(i + 1).padStart(2, '0')}</span>
              <p className="js-sci-text">{fact}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Fullscreen Story Overlay
═══════════════════════════════════════════════════════════════ */
function JourneyStory({ j, onClose, onBegin }) {
  const scrollRef = useRef(null);
  const [visible, setVisible] = useState(new Set(['hero']));
  const [sessionActive, setSessionActive] = useState(false);

  useEffect(() => {
    document.body.classList.add('has-journey-open');
    return () => document.body.classList.remove('has-journey-open');
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const targets = el.querySelectorAll('[data-reveal-stage]');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          setVisible((v) => new Set([...v, en.target.dataset.revealStage]));
        }
      });
    }, { root: el, threshold: 0.15 });
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  const paragraphs = j.story.split('\n\n');

  const overlay = (
    <div className="js-overlay" style={{ '--a': j.palette.a, '--b': j.palette.b }}>
      <div className="js-overlay-bg"/>
      <div className="js-grain-overlay"/>

      {/* Guided session — replaces story content when active */}
      {/* Keep mounted until user clicks Return so the completion screen stays visible */}
      {sessionActive && (
        <GuidedSession j={j} onClose={onClose}/>
      )}

      {!sessionActive && (
        <>
          <button className="js-close-btn" onClick={onClose} aria-label="Close">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1 1l11 11M12 1L1 12" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/>
            </svg>
            <span>close</span>
          </button>

          <div className="js-scroll" ref={scrollRef}>

            {/* Hero */}
            <section className="js-hero" data-reveal-stage="hero">
              <div className={'js-hero-inner' + (visible.has('hero') ? ' in' : '')}>
                <div className="js-hero-eyebrow">{j.eyebrow}</div>
                <h1 className="js-hero-title">{j.title}</h1>
                <div className="js-hero-meta">{j.duration} · {j.protocol}</div>
                <p className="js-hero-blurb">{j.blurb}</p>
              </div>
              <div className="js-scroll-cue">
                <span>scroll</span>
                <span className="js-scroll-line"/>
              </div>
            </section>

            {/* Narrative */}
            <section className="js-narrative" data-reveal-stage="narrative">
              <div className={'js-narrative-inner' + (visible.has('narrative') ? ' in' : '')}>
                {paragraphs.map((p, i) => (
                  <p key={i} className="js-story-para" style={{ transitionDelay: (i * 0.14) + 's' }}>{p}</p>
                ))}
              </div>
            </section>

            {/* Science */}
            <SciencePanel j={j} visible={visible.has('science')} />

            {/* Stages */}
            <section className="js-path">
              <div className="js-path-label">the path</div>
              {j.stages.map((s, i) => (
                <div
                  key={i}
                  className={'js-stage-row' + (visible.has(`s${i}`) ? ' in' : '')}
                  data-reveal-stage={`s${i}`}
                  style={{ transitionDelay: (i * 0.14) + 's' }}
                >
                  <span className="js-stage-n">{String(i + 1).padStart(2, '0')}</span>
                  <div className="js-stage-body">
                    <div className="js-stage-bar"/>
                    <p className="js-stage-t">{s}</p>
                  </div>
                </div>
              ))}
            </section>

            {/* Begin session */}
            <section
              className={'js-breathe-section' + (visible.has('breathe') ? ' active' : '')}
              data-reveal-stage="breathe"
            >
              <div className={'js-breathe-inner' + (visible.has('breathe') ? ' in' : '')}>
                <div className="js-breathe-orb">
                  <div className="js-orb-ring r1"/>
                  <div className="js-orb-ring r2"/>
                  <div className="js-orb-core"/>
                </div>
                <div className="js-breathe-label">ready when you are</div>
                <div className="js-breathe-protocol">{j.protocol}</div>
                <div className="js-breathe-dur">{j.duration} guided session</div>
                <div className="js-story-actions">
                  <button className="j-begin" onClick={() => setSessionActive(true)}>
                    <span>start the session</span>
                    <span className="arrow">→</span>
                  </button>
                  <button className="j-back" onClick={onClose}>not now</button>
                </div>
              </div>
            </section>

          </div>
        </>
      )}
    </div>
  );
  return ReactDOM.createPortal(overlay, document.body);
}

/* ═══════════════════════════════════════════════════════════════
   Journey glyph SVG (unchanged from v2)
═══════════════════════════════════════════════════════════════ */
function JourneyGlyph({ kind }) {
  return (
    <svg className={'jglyph ' + kind} viewBox="0 0 200 200" fill="none" aria-hidden="true">
      {kind === 'j-anxiety' && (
        <>
          <circle cx="100" cy="100" r="72" stroke="currentColor" strokeWidth="0.5" opacity="0.30"/>
          <circle cx="100" cy="100" r="56" stroke="currentColor" strokeWidth="0.7" opacity="0.50"/>
          <circle cx="100" cy="100" r="38" stroke="currentColor" strokeWidth="0.7" opacity="0.70"/>
          <circle cx="100" cy="100" r="20" stroke="currentColor" strokeWidth="0.9"/>
          <circle cx="100" cy="100" r="4" fill="currentColor"/>
          <path d="M36 100h-10 M174 100h-10 M100 36v-10 M100 174v-10" stroke="currentColor" strokeWidth="0.8"/>
        </>
      )}
      {kind === 'j-burnout' && (
        <>
          <path d="M30 136 Q65 66 100 100 Q135 134 170 66" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
          <path d="M30 152 Q65 82 100 116 Q135 150 170 82" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" opacity="0.55"/>
          <path d="M30 168 Q65 98 100 132 Q135 166 170 98" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" opacity="0.25"/>
          <circle cx="100" cy="44" r="4" fill="currentColor"/>
          <path d="M94 56 Q100 44 106 56" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.7"/>
        </>
      )}
      {kind === 'j-mind' && (
        <>
          <rect x="50" y="50" width="100" height="100" stroke="currentColor" strokeWidth="0.9"/>
          <rect x="66" y="66" width="68" height="68" stroke="currentColor" strokeWidth="0.7" opacity="0.60"/>
          <rect x="82" y="82" width="36" height="36" stroke="currentColor" strokeWidth="0.7" opacity="0.35"/>
          <rect x="95" y="95" width="10" height="10" fill="currentColor" opacity="0.40"/>
          <circle cx="50" cy="50" r="2.5" fill="currentColor"/>
          <circle cx="150" cy="50" r="2.5" fill="currentColor"/>
          <circle cx="50" cy="150" r="2.5" fill="currentColor"/>
          <circle cx="150" cy="150" r="2.5" fill="currentColor"/>
        </>
      )}
      {kind === 'j-sleep' && (
        <>
          <path d="M60 76 Q100 64 140 76 L140 92 Q100 80 60 92 Z" fill="currentColor" opacity="0.25"/>
          <path d="M44 112 Q100 96 156 112" stroke="currentColor" strokeWidth="0.9" opacity="0.70"/>
          <path d="M44 128 Q100 112 156 128" stroke="currentColor" strokeWidth="0.7" opacity="0.45"/>
          <path d="M44 144 Q100 128 156 144" stroke="currentColor" strokeWidth="0.5" opacity="0.22"/>
          <circle cx="74" cy="56" r="2" fill="currentColor"/>
          <circle cx="100" cy="46" r="2.2" fill="currentColor"/>
          <circle cx="126" cy="52" r="1.8" fill="currentColor"/>
          <circle cx="114" cy="62" r="1.2" fill="currentColor" opacity="0.5"/>
        </>
      )}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Journey card — 3-layer parallax (unchanged from v2)
═══════════════════════════════════════════════════════════════ */
function JourneyCard({ j, index, onOpen }) {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, mx: 50, my: 50 });
  const [hovered, setHovered] = useState(false);

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    setTilt({ rx: (y - 0.5) * -12, ry: (x - 0.5) * 12, mx: x * 100, my: y * 100 });
  };
  const onLeave = () => { setTilt({ rx: 0, ry: 0, mx: 50, my: 50 }); setHovered(false); };

  return (
    <article
      ref={ref}
      className={'j-card' + (hovered ? ' hovered' : '')}
      style={{
        '--a': j.palette.a, '--b': j.palette.b,
        '--rx': tilt.rx + 'deg', '--ry': tilt.ry + 'deg',
        '--mx': tilt.mx + '%',  '--my': tilt.my + '%',
        '--i': index,
      }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onMouseEnter={() => setHovered(true)}
      onClick={() => onOpen(j)}
    >
      <div className="j-layer j-layer-0"><div className="j-bg-spot"/></div>
      <div className="j-layer j-layer-1"><JourneyGlyph kind={j.glyph}/></div>
      <div className="j-layer j-layer-2">
        <div className="j-eyebrow">{j.eyebrow}</div>
        <h3 className="j-title">{j.title}</h3>
        <div className="j-dur">{j.duration} · {j.protocol}</div>
        <p className="j-blurb">{j.blurb}</p>
        <div className="j-open-hint">
          <span>open journey</span>
          <span className="j-hint-arrow">→</span>
        </div>
      </div>
    </article>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Journeys section
═══════════════════════════════════════════════════════════════ */
function Journeys() {
  const [story, setStory] = useState(null);

  const onBegin = (j) => {
    window.dispatchEvent(new CustomEvent('mindspace:cadence', { detail: j.suggest }));
    setStory(null);
    setTimeout(() => {
      const el = document.getElementById('breathe');
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 40, behavior: 'smooth' });
    }, 360);
  };

  return (
    <>
      <div className="journeys">
        <header className="j-head">
          <div className="eyebrow reveal d1" style={{ justifyContent: 'center' }}>IV — journeys</div>
          <h2 className="reveal d2" data-reveal-text>
            Four <span className="it">paths</span><br/>
            back to yourself.
          </h2>
          <p className="j-lede reveal d3">
            Each journey is short. Each one ends with the same instruction:
            breathe like this for a few minutes, and let the body do what it knows how to do.
          </p>
        </header>
        <div className="j-grid">
          {JOURNEYS.map((j, i) => (
            <JourneyCard key={j.id} j={j} index={i} onOpen={setStory}/>
          ))}
        </div>
      </div>

      {story && (
        <JourneyStory j={story} onClose={() => setStory(null)} onBegin={onBegin}/>
      )}
    </>
  );
}

window.MindSpaceJourneys = Journeys;
