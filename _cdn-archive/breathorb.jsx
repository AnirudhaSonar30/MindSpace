/* MindSpace — Breath Orb v2
   --------------------------------------------------------------
   Three hero-level orb styles, switchable. Each implements the
   same breath contract (window.__mindspaceBreath + Phase), the
   same color-psychology palette (indigo inhale → emerald hold →
   amber exhale), and a peripheral glow that pushes light into
   the whole field beyond the orb itself.

   Styles:
     nebula      — gravitational nebula. cosmic, dense stellar core.
     jellyfish   — bioluminescent membrane with drifting tendrils.
     wireframe   — generative low-poly mesh with vertex noise.
*/

const { useEffect: useEffectB, useRef: useRefB } = React;

/* ── COLOR PSYCHOLOGY ──
   "linen" palette: soft pastels on warm alabaster.
   indigo → emerald → amber kept as cosmic backup. */
const BO_COLOR = {
  inhale: [260, 50, 64],   // indigo
  hold:   [165, 55, 62],   // emerald
  exhale: [38,  68, 65],   // amber
  rest:   [220, 28, 60],
};

/* Linen palette — soft pastel RGB triplets, matched to the reference */
const LINEN_COL = {
  inhale: [162, 210, 214],   // linen teal
  hold:   [180, 220, 200],   // matcha mint
  exhale: [242, 195, 177],   // rose gold
  rest:   [210, 195, 222],   // lavender
};
const BO_PHASE_MAP = { inhale: 'inhale', hold: 'hold', exhale: 'exhale', rest: 'rest' };

/* ───────────────────────────────────────────────────────────────
   Shared helpers
─────────────────────────────────────────────────────────────── */
function hslA(H, S, L, a) { return `hsla(${H|0},${S|0}%,${L|0}%,${a.toFixed(3)})`; }

/* ───────────────────────────────────────────────────────────────
   1. NEBULA STYLE  — gravitational dust + stellar core
─────────────────────────────────────────────────────────────── */
function makeNebulaState() {
  return {
    rings: [],          // expanding phase rings
    prevPhase: 'inhale',
    cH: BO_COLOR.inhale[0], cS: BO_COLOR.inhale[1], cL: BO_COLOR.inhale[2],
    pulse: 0,           // smooth on-phase scale pulse
  };
}
function drawNebula(ctx, st, env) {
  const { W, H, CX, CY, HALF, frame, breath, phase, kind, cp } = env;
  const f = frame;

  /* color psychology lerp */
  const tc = BO_COLOR[kind] || BO_COLOR.inhale;
  st.cH += (tc[0] - st.cH) * 0.024;
  st.cS += (tc[1] - st.cS) * 0.024;
  st.cL += (tc[2] - st.cL) * 0.024;
  const H_ = st.cH, S_ = st.cS, L_ = st.cL;

  /* one ring emitted per phase boundary */
  if (phase !== st.prevPhase) {
    st.rings.push({ r: HALF * 0.34, op: 0.95, w: 2.4 });
    st.pulse = 1;
    st.prevPhase = phase;
  }
  st.pulse *= 0.94;

  /* aperture: a single clean ring at ~30-40% of half — breathes wider with breath */
  const baseR = HALF * (0.30 + breath * 0.12);
  const lineW = 3.2 + breath * 3.6 + st.pulse * 3.0;

  /* expanding rings — clean single circle outlines */
  st.rings = st.rings.filter(r => r.op > 0.02);
  st.rings.forEach(r => {
    ctx.beginPath();
    ctx.arc(CX, CY, r.r, 0, Math.PI * 2);
    ctx.strokeStyle = hslA(H_, S_, Math.min(86, L_ + 8), r.op);
    ctx.lineWidth = r.w * (1 - r.r / (HALF * 1.6));
    ctx.stroke();
    r.r += 4.6;
    r.op *= 0.964;
  });

  /* THE APERTURE */
  /* outer atmospheric halo */
  const halo = ctx.createRadialGradient(CX, CY, baseR * 0.65, CX, CY, baseR * 1.55);
  halo.addColorStop(0, hslA(H_, S_, L_, 0));
  halo.addColorStop(0.45, hslA(H_, S_, L_, 0.26));
  halo.addColorStop(1, hslA(H_, S_, L_, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(CX, CY, baseR * 1.55, 0, Math.PI * 2);
  ctx.fill();

  /* secondary inner ring — very faint, at 0.72 of baseR */
  ctx.beginPath();
  ctx.arc(CX, CY, baseR * 0.72, 0, Math.PI * 2);
  ctx.strokeStyle = hslA(H_, S_, L_, 0.18);
  ctx.lineWidth = 0.8;
  ctx.stroke();

  /* main ring — thick + bloom */
  ctx.save();
  ctx.shadowColor = hslA(H_, S_, Math.min(90, L_ + 18), 0.85);
  ctx.shadowBlur = 32 + breath * 22;
  ctx.beginPath();
  ctx.arc(CX, CY, baseR, 0, Math.PI * 2);
  ctx.strokeStyle = hslA(H_, S_, Math.min(94, L_ + 22), 0.94);
  ctx.lineWidth = lineW;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  /* center disc — the still point */
  const discR = 8 + breath * 7;
  /* deeper inner glow */
  const discG = ctx.createRadialGradient(CX, CY, 0, CX, CY, discR * 2.2);
  discG.addColorStop(0, 'rgba(255,255,255,0.96)');
  discG.addColorStop(0.4, hslA(H_, Math.min(100, S_ + 30), Math.min(96, L_ + 26), 0.86));
  discG.addColorStop(1, hslA(H_, S_, L_, 0));
  ctx.fillStyle = discG;
  ctx.beginPath();
  ctx.arc(CX, CY, discR * 2.2, 0, Math.PI * 2);
  ctx.fill();

  /* the disc itself — solid white with phase tint */
  ctx.save();
  ctx.shadowColor = hslA(H_, S_, Math.min(96, L_ + 28), 0.95);
  ctx.shadowBlur = 28;
  ctx.beginPath();
  ctx.arc(CX, CY, discR, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.fill();
  ctx.restore();

  /* hold-phase: subtle outward pulse from disc edge */
  if (kind === 'hold') {
    const p = 0.4 + 0.6 * Math.sin(f * 0.16);
    ctx.beginPath();
    ctx.arc(CX, CY, discR + 6 + p * 8, 0, Math.PI * 2);
    ctx.strokeStyle = hslA(H_, S_, Math.min(94, L_ + 22), 0.40 * p);
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }

  /* progress arc — sits on a SLIGHTLY larger track outside the aperture */
  if (cp > 0.004) {
    const ringR = HALF * 0.58;
    const arcEnd = -Math.PI / 2 + cp * Math.PI * 2;
    ctx.save();
    ctx.shadowColor = hslA(H_, S_, L_, 0.55);
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(CX, CY, ringR, -Math.PI / 2, arcEnd);
    ctx.strokeStyle = hslA(H_, S_, Math.min(88, L_ + 12), 0.68);
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(
      CX + Math.cos(arcEnd) * ringR,
      CY + Math.sin(arcEnd) * ringR,
      3.0, 0, Math.PI * 2,
    );
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.fill();
  }
}

/* ───────────────────────────────────────────────────────────────
   2. JELLYFISH STYLE  — bioluminescent membrane + tendrils
─────────────────────────────────────────────────────────────── */
function makeJellyState() {
  return {
    tendrils: Array.from({ length: 14 }, (_, i) => {
      const baseA = (i / 14) * Math.PI * 2;
      return {
        baseA,
        len: 0.20 + Math.random() * 0.18,
        wavePhase: Math.random() * Math.PI * 2,
        waveSpeed: 0.015 + Math.random() * 0.018,
        amp: 0.04 + Math.random() * 0.06,
        thickness: 0.7 + Math.random() * 1.3,
      };
    }),
    micro: [], // exhale-emitted micro-particles
    prevPhase: 'inhale',
    cH: BO_COLOR.inhale[0], cS: BO_COLOR.inhale[1], cL: BO_COLOR.inhale[2],
  };
}
function drawJellyfish(ctx, st, env) {
  const { W, H, CX, CY, HALF, frame, breath, phase, kind, cp } = env;
  const f = frame;
  const orbR = HALF * (0.18 + breath * 0.10);

  const tc = BO_COLOR[kind] || BO_COLOR.inhale;
  st.cH += (tc[0] - st.cH) * 0.026;
  st.cS += (tc[1] - st.cS) * 0.026;
  st.cL += (tc[2] - st.cL) * 0.026;
  const H_ = st.cH, S_ = st.cS, L_ = st.cL;

  /* on exhale, emit a small trail of micro-particles */
  if (phase !== st.prevPhase) {
    if (st.prevPhase === 'hold' || phase === 'exhale') {
      for (let i = 0; i < 24; i++) {
        const a = Math.random() * Math.PI * 2;
        st.micro.push({
          x: CX + Math.cos(a) * orbR * 0.85,
          y: CY + Math.sin(a) * orbR * 0.85,
          vx: Math.cos(a) * (0.6 + Math.random() * 1.2),
          vy: Math.sin(a) * (0.6 + Math.random() * 1.2) - 0.15,
          life: 1.0,
          size: 0.6 + Math.random() * 1.1,
        });
      }
    }
    st.prevPhase = phase;
  }

  /* gentle backdrop */
  const bg = ctx.createRadialGradient(CX, CY, orbR * 0.4, CX, CY, HALF * 1.2);
  bg.addColorStop(0,   hslA(H_, S_, L_, 0.10));
  bg.addColorStop(0.55,hslA(H_, S_, L_, 0.03));
  bg.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  /* progress arc on outer ring */
  if (cp > 0.004) {
    const ringR = HALF * 0.86;
    const arcEnd = -Math.PI / 2 + cp * Math.PI * 2;
    ctx.save();
    ctx.shadowColor = hslA(H_, S_, L_, 0.55);
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(CX, CY, ringR, -Math.PI / 2, arcEnd);
    ctx.strokeStyle = hslA(H_, S_, Math.min(86, L_ + 10), 0.78);
    ctx.lineWidth = 1.7;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(
      CX + Math.cos(arcEnd) * ringR,
      CY + Math.sin(arcEnd) * ringR,
      3.4, 0, Math.PI * 2,
    );
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fill();
  }

  /* TENTACLES — fibrous threads from the bell, swaying.
     drawn behind the body so they appear to emerge. */
  ctx.save();
  ctx.lineCap = 'round';
  st.tendrils.forEach(t => {
    const len = HALF * t.len * (1 - breath * 0.25);
    const startA = t.baseA;
    const startR = orbR * 0.78;
    const segments = 12;
    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const tt = i / segments;
      const wave = Math.sin(f * t.waveSpeed + t.wavePhase + tt * 4) * t.amp * len * tt;
      const ang = startA + wave / Math.max(0.1, (startR + len * tt));
      const r = startR + len * tt;
      const x = CX + Math.cos(ang) * r;
      const y = CY + Math.sin(ang) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = hslA(H_, S_, Math.min(86, L_ + 14), 0.34);
    ctx.lineWidth = t.thickness * (1 - breath * 0.3);
    ctx.stroke();
  });
  ctx.restore();

  /* JELLY BODY — translucent bell with inner glow */
  /* outer membrane glow */
  const halo = ctx.createRadialGradient(CX, CY, orbR * 0.5, CX, CY, orbR * 2.3);
  halo.addColorStop(0,   hslA(H_, S_, L_, 0.32));
  halo.addColorStop(0.5, hslA(H_, S_, L_, 0.08));
  halo.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(CX, CY, orbR * 2.3, 0, Math.PI * 2); ctx.fill();

  /* draw bell with subtle ripples — slightly oval */
  ctx.save();
  ctx.translate(CX, CY);
  /* hold ripple: a wave traveling across the surface */
  const holdRipple = kind === 'hold' ? Math.sin(f * 0.16) * 0.08 : 0;
  const rX = orbR * (1 + 0.04 * Math.sin(f * 0.02));
  const rY = orbR * (1 - 0.06 + holdRipple);
  /* gradient bell */
  const bell = ctx.createRadialGradient(0, -orbR * 0.18, 0, 0, 0, orbR * 1.05);
  bell.addColorStop(0,    'rgba(255,255,255,0.46)');
  bell.addColorStop(0.16, hslA(H_, Math.min(90, S_ + 10), Math.min(92, L_ + 18), 0.66));
  bell.addColorStop(0.55, hslA(H_, S_, L_, 0.36));
  bell.addColorStop(1,    hslA(H_, S_, Math.max(20, L_ - 16), 0.05));
  ctx.fillStyle = bell;
  ctx.beginPath();
  ctx.ellipse(0, 0, rX, rY, 0, 0, Math.PI * 2);
  ctx.fill();

  /* inner nucleus — pulses with breath */
  const nucR = orbR * (0.20 + breath * 0.08);
  const nucG = ctx.createRadialGradient(0, 0, 0, 0, 0, nucR);
  nucG.addColorStop(0, 'rgba(255,255,255,0.85)');
  nucG.addColorStop(0.5, hslA(H_, Math.min(90, S_ + 20), Math.min(94, L_ + 28), 0.66));
  nucG.addColorStop(1, hslA(H_, S_, L_, 0));
  ctx.fillStyle = nucG;
  ctx.beginPath(); ctx.arc(0, 0, nucR, 0, Math.PI * 2); ctx.fill();

  /* outer membrane stroke */
  ctx.beginPath();
  ctx.ellipse(0, 0, rX, rY, 0, 0, Math.PI * 2);
  ctx.strokeStyle = hslA(H_, S_, Math.min(90, L_ + 12), 0.38);
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.restore();

  /* MICRO-PARTICLES — emitted on exhale, drift then dissolve */
  ctx.save();
  st.micro = st.micro.filter(m => m.life > 0.02);
  st.micro.forEach(m => {
    m.x += m.vx; m.y += m.vy;
    m.vy += 0.012;
    m.life *= 0.972;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.size * m.life, 0, Math.PI * 2);
    ctx.fillStyle = hslA(H_, Math.min(90, S_ + 18), Math.min(92, L_ + 22), m.life * 0.85);
    ctx.fill();
  });
  ctx.restore();
}

/* ───────────────────────────────────────────────────────────────
   3. WIREFRAME STYLE  — generative low-poly mesh
─────────────────────────────────────────────────────────────── */
function makeWireState() {
  /* generate a deterministic icosahedron-ish point set + edge list */
  const N = 56;            // ~vertices on a fibonacci sphere
  const verts = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = phi * i;
    verts.push({
      base: [Math.cos(theta) * radius, y, Math.sin(theta) * radius],
      px: 0, py: 0, pz: 0,
      noisePh: Math.random() * Math.PI * 2,
    });
  }
  /* edges: each vertex connects to its 3 nearest neighbours */
  const edges = [];
  for (let i = 0; i < N; i++) {
    const dists = [];
    for (let j = 0; j < N; j++) {
      if (i === j) continue;
      const dx = verts[i].base[0] - verts[j].base[0];
      const dy = verts[i].base[1] - verts[j].base[1];
      const dz = verts[i].base[2] - verts[j].base[2];
      dists.push({ j, d: dx * dx + dy * dy + dz * dz });
    }
    dists.sort((a, b) => a.d - b.d);
    for (let k = 0; k < 3; k++) {
      if (i < dists[k].j) edges.push([i, dists[k].j]);
    }
  }
  return {
    verts, edges,
    prevPhase: 'inhale',
    cH: BO_COLOR.inhale[0], cS: BO_COLOR.inhale[1], cL: BO_COLOR.inhale[2],
    explode: 0,
  };
}
function drawWireframe(ctx, st, env) {
  const { W, H, CX, CY, HALF, frame, breath, phase, kind, cp } = env;
  const f = frame;
  const orbR = HALF * (0.20 + breath * 0.12);

  const tc = BO_COLOR[kind] || BO_COLOR.inhale;
  st.cH += (tc[0] - st.cH) * 0.030;
  st.cS += (tc[1] - st.cS) * 0.030;
  st.cL += (tc[2] - st.cL) * 0.030;
  const H_ = st.cH, S_ = st.cS, L_ = st.cL;

  /* explode factor — rises on exhale */
  const explodeTarget = kind === 'exhale' ? 0.45 : kind === 'inhale' ? 0 : 0.10;
  st.explode += (explodeTarget - st.explode) * 0.04;

  /* background */
  const bg = ctx.createRadialGradient(CX, CY, orbR * 0.3, CX, CY, HALF * 1.1);
  bg.addColorStop(0,   hslA(H_, S_, L_, 0.06));
  bg.addColorStop(0.6, hslA(H_, S_, L_, 0.020));
  bg.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  /* progress arc */
  if (cp > 0.004) {
    const ringR = HALF * 0.86;
    const arcEnd = -Math.PI / 2 + cp * Math.PI * 2;
    ctx.save();
    ctx.shadowColor = hslA(H_, S_, L_, 0.6);
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(CX, CY, ringR, -Math.PI / 2, arcEnd);
    ctx.strokeStyle = hslA(H_, S_, Math.min(86, L_ + 12), 0.80);
    ctx.lineWidth = 1.7;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(
      CX + Math.cos(arcEnd) * ringR,
      CY + Math.sin(arcEnd) * ringR,
      3.4, 0, Math.PI * 2,
    );
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.fill();
  }

  /* halo */
  const halo = ctx.createRadialGradient(CX, CY, orbR * 0.7, CX, CY, orbR * 2.2);
  halo.addColorStop(0,   hslA(H_, S_, L_, 0.20));
  halo.addColorStop(0.5, hslA(H_, S_, L_, 0.06));
  halo.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(CX, CY, orbR * 2.2, 0, Math.PI * 2); ctx.fill();

  /* rotation matrix — slow on inhale, faster on hold */
  const rotY = f * 0.005 * (0.5 + breath * 0.6);
  const rotX = f * 0.003;
  const cY = Math.cos(rotY), sY = Math.sin(rotY);
  const cX_ = Math.cos(rotX), sX = Math.sin(rotX);

  /* project verts */
  st.verts.forEach(v => {
    /* perlin-ish noise displacement */
    const n = 1 + 0.08 * Math.sin(f * 0.022 + v.noisePh * 3) * (0.5 + breath * 0.5);
    const e = 1 + st.explode * 0.8;
    let x = v.base[0] * n * e;
    let y = v.base[1] * n * e;
    let z = v.base[2] * n * e;
    /* rotate Y */
    let nx = x * cY + z * sY;
    let nz = -x * sY + z * cY;
    /* rotate X */
    let ny = y * cX_ - nz * sX;
    nz =     y * sX  + nz * cX_;
    /* project */
    const persp = 1 / (1 + nz * 0.35);
    v.px = CX + nx * orbR * persp;
    v.py = CY + ny * orbR * persp;
    v.pz = nz; // depth for ordering / alpha
  });

  /* edges */
  ctx.save();
  ctx.lineWidth = 0.75;
  for (let i = 0; i < st.edges.length; i++) {
    const [a, b] = st.edges[i];
    const va = st.verts[a], vb = st.verts[b];
    const depth = (va.pz + vb.pz) * 0.5;
    const al = 0.40 + 0.45 * (1 - (depth + 1) / 2);
    ctx.strokeStyle = hslA(H_, S_, Math.min(86, L_ + 10), al * (1 - st.explode * 0.6));
    ctx.beginPath();
    ctx.moveTo(va.px, va.py);
    ctx.lineTo(vb.px, vb.py);
    ctx.stroke();
  }
  ctx.restore();

  /* vertices */
  st.verts.forEach(v => {
    const depth = v.pz;
    const al = 0.55 + 0.45 * (1 - (depth + 1) / 2);
    /* glow */
    ctx.beginPath();
    ctx.arc(v.px, v.py, 4 + (1 - depth) * 1.4, 0, Math.PI * 2);
    ctx.fillStyle = hslA(H_, Math.min(90, S_ + 20), Math.min(92, L_ + 22), al * 0.16);
    ctx.fill();
    /* core */
    ctx.beginPath();
    ctx.arc(v.px, v.py, 1.4 + (1 - depth) * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = hslA(H_, Math.min(90, S_ + 30), Math.min(96, L_ + 30), al);
    ctx.fill();
  });

  /* center nucleus */
  ctx.beginPath();
  ctx.arc(CX, CY, 3.0, 0, Math.PI * 2);
  ctx.shadowColor = 'rgba(255,255,255,0.85)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fill();
  ctx.shadowBlur = 0;
}

/* ───────────────────────────────────────────────────────────────
   4. GLASS STYLE  — luminous liquid-crystal sphere
─────────────────────────────────────────────────────────────── */
function makeGlassState() {
  return {
    caustics: Array.from({ length: 12 }, (_, i) => ({
      angle:  (i / 12) * Math.PI * 2 + Math.random() * 0.5,
      r:      0.14 + Math.random() * 0.48,
      speed:  (0.0014 + Math.random() * 0.003) * (Math.random() > 0.5 ? 1 : -1),
      rSpeed: 0.0007 + Math.random() * 0.0014,
      size:   3 + Math.random() * 7,
      op:     0.22 + Math.random() * 0.44,
      rPhase: Math.random() * Math.PI * 2,
    })),
    prevPhase: 'inhale',
    cH: BO_COLOR.inhale[0], cS: BO_COLOR.inhale[1], cL: BO_COLOR.inhale[2],
    shimRot: 0,
    ripples: [],
  };
}
function drawGlass(ctx, st, env) {
  const { W, H, CX, CY, HALF, frame, breath, phase, kind, cp } = env;
  const f = frame;

  const tc = BO_COLOR[kind] || BO_COLOR.inhale;
  st.cH += (tc[0] - st.cH) * 0.030;
  st.cS += (tc[1] - st.cS) * 0.030;
  st.cL += (tc[2] - st.cL) * 0.030;
  const H_ = st.cH, S_ = st.cS, L_ = st.cL;

  if (phase !== st.prevPhase) {
    st.ripples.push({ r: HALF * 0.08, op: 0.90, w: 2.2 });
    st.ripples.push({ r: HALF * 0.04, op: 0.44, w: 0.9, slow: true });
    st.prevPhase = phase;
  }

  const orbR = HALF * (0.22 + breath * 0.13);
  st.shimRot += 0.0044;

  /* outer atmospheric glow */
  const aura = ctx.createRadialGradient(CX, CY, orbR * 0.6, CX, CY, orbR * 2.9);
  aura.addColorStop(0,   hslA(H_, S_, L_, 0.30));
  aura.addColorStop(0.4, hslA(H_, S_, L_, 0.08));
  aura.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = aura;
  ctx.beginPath(); ctx.arc(CX, CY, orbR * 2.9, 0, Math.PI * 2); ctx.fill();

  /* expanding ripple rings on phase change */
  st.ripples = st.ripples.filter(r => r.op > 0.015);
  st.ripples.forEach(r => {
    ctx.beginPath();
    ctx.arc(CX, CY, r.r, 0, Math.PI * 2);
    ctx.strokeStyle = hslA(H_, S_, Math.min(90, L_ + 12), r.op * (r.slow ? 0.5 : 1));
    ctx.lineWidth = r.w;
    ctx.stroke();
    r.r  += r.slow ? 1.9 : 4.0;
    r.op *= r.slow ? 0.974 : 0.943;
  });

  /* sphere body — clipped to circle */
  ctx.save();
  ctx.beginPath(); ctx.arc(CX, CY, orbR, 0, Math.PI * 2); ctx.clip();

  /* deep gradient: off-centre so it feels three-dimensional */
  const body = ctx.createRadialGradient(
    CX - orbR * 0.28, CY - orbR * 0.28, 0,
    CX, CY, orbR * 1.18,
  );
  body.addColorStop(0,    hslA(H_, S_, Math.min(96, L_ + 34), 0.72));
  body.addColorStop(0.28, hslA(H_, S_, L_,                    0.60));
  body.addColorStop(0.68, hslA(H_, S_, Math.max(22, L_ - 18), 0.44));
  body.addColorStop(1,    hslA(H_, S_, Math.max(10, L_ - 28), 0.28));
  ctx.fillStyle = body;
  ctx.fillRect(CX - orbR * 1.25, CY - orbR * 1.25, orbR * 2.5, orbR * 2.5);

  /* rotating internal shimmer — figure-8 lissajous path */
  const sX = CX + Math.cos(st.shimRot)       * orbR * 0.30;
  const sY = CY + Math.sin(st.shimRot * 2.0) * orbR * 0.18;
  const shim = ctx.createRadialGradient(sX, sY, 0, sX, sY, orbR * 0.65);
  shim.addColorStop(0,   'rgba(255,255,255,0.34)');
  shim.addColorStop(0.44,'rgba(255,255,255,0.08)');
  shim.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = shim;
  ctx.fillRect(CX - orbR * 1.25, CY - orbR * 1.25, orbR * 2.5, orbR * 2.5);

  /* caustic light flecks drifting inside */
  st.caustics.forEach(c => {
    c.angle += c.speed;
    c.r += Math.sin(f * c.rSpeed + c.rPhase) * 0.002;
    c.r = Math.max(0.05, Math.min(0.60, c.r));
    const px = CX + Math.cos(c.angle)        * orbR * c.r;
    const py = CY + Math.sin(c.angle * 1.27) * orbR * c.r * 0.85;
    const tw = 0.55 + 0.45 * Math.sin(f * 0.055 + c.angle * 2.3);
    const cg = ctx.createRadialGradient(px, py, 0, px, py, c.size * tw);
    cg.addColorStop(0, `rgba(255,255,255,${(c.op * tw * 0.55).toFixed(3)})`);
    cg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(px, py, c.size * tw, 0, Math.PI * 2); ctx.fill();
  });

  ctx.restore(); /* end clip */

  /* specular crescent — bright white highlight top-left */
  const specX = CX - orbR * 0.37;
  const specY = CY - orbR * 0.42;
  const spec = ctx.createRadialGradient(specX, specY, 0, specX, specY, orbR * 0.54);
  spec.addColorStop(0,    'rgba(255,255,255,0.72)');
  spec.addColorStop(0.30, 'rgba(255,255,255,0.28)');
  spec.addColorStop(0.68, 'rgba(255,255,255,0.05)');
  spec.addColorStop(1,    'rgba(255,255,255,0)');
  ctx.fillStyle = spec;
  ctx.beginPath(); ctx.arc(CX, CY, orbR, 0, Math.PI * 2); ctx.fill();

  /* outer glow bloom — pulses with breath */
  ctx.save();
  ctx.shadowColor = hslA(H_, S_, L_, 1.0);
  ctx.shadowBlur  = 34 + breath * 30;
  ctx.beginPath(); ctx.arc(CX, CY, orbR, 0, Math.PI * 2);
  ctx.strokeStyle = hslA(H_, S_, Math.min(92, L_ + 22), 0.28);
  ctx.lineWidth = 9 + breath * 7;
  ctx.stroke();
  ctx.restore();

  /* crisp rim edge */
  ctx.beginPath(); ctx.arc(CX, CY, orbR, 0, Math.PI * 2);
  ctx.strokeStyle = hslA(H_, S_, Math.min(90, L_ + 20), 0.56 + breath * 0.24);
  ctx.lineWidth = 1.3 + breath * 1.7;
  ctx.stroke();

  /* progress arc */
  if (cp > 0.004) {
    const ringR  = HALF * 0.62;
    const arcEnd = -Math.PI / 2 + cp * Math.PI * 2;
    ctx.save();
    ctx.shadowColor = hslA(H_, S_, L_, 0.65);
    ctx.shadowBlur  = 13;
    ctx.beginPath();
    ctx.arc(CX, CY, ringR, -Math.PI / 2, arcEnd);
    ctx.strokeStyle = hslA(H_, S_, Math.min(88, L_ + 12), 0.74);
    ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(
      CX + Math.cos(arcEnd) * ringR,
      CY + Math.sin(arcEnd) * ringR,
      3.2, 0, Math.PI * 2,
    );
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.fill();
  }
}

/* ───────────────────────────────────────────────────────────────
   5. REACTOR STYLE  — 3-D particle sphere + segmented orbital rings
─────────────────────────────────────────────────────────────── */
function makeReactorState() {
  const N = 220;
  const particles = [];
  for (let i = 0; i < N; i++) {
    const theta = Math.acos(1 - 2 * (i / N));
    const phi   = Math.sqrt(N * Math.PI) * theta;
    particles.push({
      bx: Math.sin(theta) * Math.cos(phi),
      by: Math.sin(theta) * Math.sin(phi),
      bz: Math.cos(theta),
      speed: 0.4 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
      size:  0.9 + Math.random() * 1.8,
    });
  }
  return {
    particles,
    rings: Array.from({ length: 6 }, (_, i) => ({
      baseR:    0.13 + i * 0.090,
      rot:      (i / 6) * Math.PI * 2,
      speed:    (0.0028 + i * 0.0012) * (i % 2 === 0 ? 1 : -1),
      width:    2.8 - i * 0.26,
      opacity:  0.82 - i * 0.09,
      segments: 3 + i * 2,
    })),
    pulses: [],
    prevPhase: 'inhale',
    cH: BO_COLOR.inhale[0], cS: BO_COLOR.inhale[1], cL: BO_COLOR.inhale[2],
    rx: 0, ry: 0,
  };
}
function drawReactor(ctx, st, env) {
  const { W, H, CX, CY, HALF, frame, breath, phase, kind, cp } = env;
  const f = frame;

  const tc = BO_COLOR[kind] || BO_COLOR.inhale;
  st.cH += (tc[0] - st.cH) * 0.030;
  st.cS += (tc[1] - st.cS) * 0.030;
  st.cL += (tc[2] - st.cL) * 0.030;
  const H_ = st.cH, S_ = st.cS, L_ = st.cL;

  if (phase !== st.prevPhase) {
    st.pulses.push({ r: HALF * 0.10, op: 1.0, speed: 5.2 });
    st.prevPhase = phase;
  }

  const orbR = HALF * (0.16 + breath * 0.14);
  st.rx += 0.004; st.ry += 0.006;

  /* atmospheric glow */
  const bg = ctx.createRadialGradient(CX, CY, orbR * 0.4, CX, CY, orbR * 2.6);
  bg.addColorStop(0,   hslA(H_, S_, L_, 0.24));
  bg.addColorStop(0.5, hslA(H_, S_, L_, 0.06));
  bg.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(CX, CY, orbR * 2.6, 0, Math.PI * 2); ctx.fill();

  /* 3-D fibonacci-sphere particles — rotated on two axes */
  const fov = 500;
  const coX = Math.cos(st.rx), siX = Math.sin(st.rx);
  const coY = Math.cos(st.ry), siY = Math.sin(st.ry);

  ctx.save();
  ctx.shadowBlur  = 10;
  ctx.shadowColor = hslA(H_, S_, L_, 0.6);
  st.particles.forEach(p => {
    /* rotate Y then X */
    const y1 = p.by * coX - p.bz * siX;
    const z1 = p.by * siX + p.bz * coX;
    const x2 = p.bx * coY + z1  * siY;
    const z2 = -p.bx * siY + z1 * coY;
    const persp = fov / (fov + z2 * orbR);
    const px = x2 * orbR * persp + CX;
    const py = y1 * orbR * persp + CY;
    const depth = (z2 + 1) * 0.5;
    const al = depth * 0.65 * (0.38 + breath * 0.55);
    ctx.beginPath();
    ctx.arc(px, py, p.size * persp, 0, Math.PI * 2);
    ctx.fillStyle = hslA(H_, S_, Math.min(90, L_ + 15), al);
    ctx.fill();
  });
  ctx.shadowBlur = 0;
  ctx.restore();

  /* segmented orbital rings — rotating at different speeds/directions */
  st.rings.forEach(ring => {
    ring.rot += ring.speed;
    const r = HALF * (ring.baseR + breath * 0.08);
    const circ = r * Math.PI * 2;
    const dashLen = (circ / ring.segments) * 0.62;
    const gapLen  = (circ / ring.segments) * 0.38;
    ctx.save();
    ctx.shadowColor = hslA(H_, S_, L_, 0.70);
    ctx.shadowBlur  = 8 + breath * 10;
    ctx.setLineDash([dashLen, gapLen]);
    ctx.lineDashOffset = ring.rot * 80;
    ctx.beginPath(); ctx.arc(CX, CY, r, 0, Math.PI * 2);
    ctx.strokeStyle = hslA(H_, S_, Math.min(90, L_ + 14),
                           ring.opacity * (0.55 + breath * 0.40));
    ctx.lineWidth = ring.width * (0.70 + breath * 0.35);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  });

  /* pulse rings on phase change */
  st.pulses = st.pulses.filter(p => p.op > 0.015);
  st.pulses.forEach(p => {
    ctx.beginPath(); ctx.arc(CX, CY, p.r, 0, Math.PI * 2);
    ctx.strokeStyle = hslA(H_, S_, Math.min(92, L_ + 18), p.op * 0.75);
    ctx.lineWidth = 1.8;
    ctx.stroke();
    p.r  += p.speed;
    p.op *= 0.947;
  });

  /* center nucleus */
  const nucR = 5 + breath * 7;
  ctx.save();
  ctx.shadowColor = hslA(H_, S_, L_, 1.0);
  ctx.shadowBlur  = 26 + breath * 22;
  const nucG = ctx.createRadialGradient(CX, CY, 0, CX, CY, nucR * 2.5);
  nucG.addColorStop(0,   'rgba(255,255,255,0.97)');
  nucG.addColorStop(0.4, hslA(H_, Math.min(90, S_ + 20), Math.min(94, L_ + 28), 0.80));
  nucG.addColorStop(1,   hslA(H_, S_, L_, 0));
  ctx.fillStyle = nucG;
  ctx.beginPath(); ctx.arc(CX, CY, nucR * 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(CX, CY, nucR * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.98)';
  ctx.fill();
  ctx.restore();

  /* progress arc beyond outermost ring */
  if (cp > 0.004) {
    const ringR  = HALF * (st.rings[5].baseR + 0.11 + breath * 0.08);
    const arcEnd = -Math.PI / 2 + cp * Math.PI * 2;
    ctx.save();
    ctx.shadowColor = hslA(H_, S_, L_, 0.65);
    ctx.shadowBlur  = 12;
    ctx.beginPath();
    ctx.arc(CX, CY, ringR, -Math.PI / 2, arcEnd);
    ctx.strokeStyle = hslA(H_, S_, Math.min(88, L_ + 12), 0.74);
    ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(
      CX + Math.cos(arcEnd) * ringR,
      CY + Math.sin(arcEnd) * ringR,
      3.2, 0, Math.PI * 2,
    );
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.fill();
  }
}

/* ───────────────────────────────────────────────────────────────
   BreathOrb component — switches drawer based on `style` prop.
─────────────────────────────────────────────────────────────── */
function BreathOrbV2({ runningRef, cadenceRef, cpRef, style }) {
  /* 3D WebGL globe — completely separate render path */
  if (style === 'globe') {
    return <GlobeOrb cadenceRef={cadenceRef} cpRef={cpRef} />;
  }

  const canvasRef = useRefB(null);
  const styleRef  = useRefB(style || 'nebula');

  useEffectB(() => { styleRef.current = style || 'nebula'; }, [style]);

  useEffectB(() => {
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

    /* per-style state */
    const states = {
      nebula:    makeNebulaState(),
      jellyfish: makeJellyState(),
      wireframe: makeWireState(),
      glass:     makeGlassState(),
      reactor:   makeReactorState(),
    };

    let raf, frame = 0;
    const tick = () => {
      frame++;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const W = canvas.width / dpr;
      const H = canvas.height / dpr;
      ctx.clearRect(0, 0, W, H);

      const breath  = window.__mindspaceBreath || 0;
      const phase   = window.__mindspacePhase  || 'inhale';
      const cadence = cadenceRef ? cadenceRef.current : null;
      const cp      = cpRef      ? cpRef.current      : 0;
      const kind    = BO_PHASE_MAP[phase] || 'inhale';

      const env = {
        W, H, CX: W * 0.5, CY: H * 0.5,
        HALF: Math.min(W, H) * 0.5,
        frame, breath, phase, kind,
        cadence, cp,
      };

      const curStyle = styleRef.current;
      if      (curStyle === 'jellyfish') drawJellyfish(ctx, states.jellyfish, env);
      else if (curStyle === 'wireframe') drawWireframe(ctx, states.wireframe, env);
      else if (curStyle === 'glass')     drawGlass(ctx, states.glass, env);
      else if (curStyle === 'reactor')   drawReactor(ctx, states.reactor, env);
      else                               drawNebula(ctx, states.nebula, env);

      /* peripheral glow that bleeds light out beyond the orb —
         updates a CSS variable read by an outer .lab-aura DOM layer */
      const aura = document.getElementById('__breath-aura');
      if (aura) {
        const state = curStyle === 'jellyfish' ? states.jellyfish :
                      curStyle === 'wireframe' ? states.wireframe :
                      curStyle === 'glass'     ? states.glass     :
                      curStyle === 'reactor'   ? states.reactor   :
                      states.nebula;
        aura.style.setProperty('--aura-h', String(state.cH | 0));
        aura.style.setProperty('--aura-s', String(state.cS | 0) + '%');
        aura.style.setProperty('--aura-l', String(state.cL | 0) + '%');
        aura.style.setProperty('--aura-b', (0.5 + breath * 0.6).toFixed(3));
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  return (
    <canvas
      ref={canvasRef}
      className="lab-canvas"
      aria-label="Breathing visualisation"
    />
  );
}

/* Peripheral glow layer — a full-screen radial that picks up the
   orb's current color and pulses with breath. Sits behind the lab
   focus overlay but above the scene canvas. Pure CSS positioning;
   the orb writes `--aura-h/-s/-l/-b` onto it. */
function BreathAura() {
  return <div id="__breath-aura" className="lab-aura" aria-hidden="true"/>;
}

/* ───────────────────────────────────────────────────────────────
   GLOBE ORB — Three.js WebGL sphere with Fresnel / iridescent shader
   A breathing 3D orb: pulsing scale, phase-reactive colour, orbiting
   particle ring, inner glow. Replaces the 2D canvas when style='globe'.
─────────────────────────────────────────────────────────────── */
function GlobeOrb({ cadenceRef, cpRef }) {
  const mountRef = useRefB(null);

  useEffectB(() => {
    const mount = mountRef.current;
    if (!mount || typeof THREE === 'undefined') return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W0  = mount.clientWidth  || 400;
    const H0  = mount.clientHeight || 400;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(dpr);
    renderer.setSize(W0, H0);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, W0 / H0, 0.1, 80);
    camera.position.set(0, 0, 4.5);

    /* ── Sphere: iridescent Fresnel shader ── */
    const sGeo = new THREE.SphereGeometry(1.0, 72, 72);
    const sMat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uTime:    { value: 0 },
        uBreath:  { value: 0 },
        uColA:    { value: new THREE.Color(0.63, 0.82, 0.84) },
        uColB:    { value: new THREE.Color(0.75, 0.85, 1.00) },
        uBlend:   { value: 0 },
      },
      vertexShader: /* glsl */`
        uniform float uTime;
        uniform float uBreath;
        varying vec3 vN;
        varying vec3 vV;
        void main(){
          float w = sin(position.x*6.0+uTime*1.8)*cos(position.y*6.0+uTime*1.4)*0.022;
          vec3 p = position + normal * w * (0.2 + uBreath * 0.8);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */`
        precision highp float;
        uniform float uTime;
        uniform float uBreath;
        uniform vec3  uColA;
        uniform vec3  uColB;
        uniform float uBlend;
        varying vec3  vN;
        varying vec3  vV;
        void main(){
          float f = pow(1.0 - max(0.0, dot(vV, vN)), 2.6);
          float ir = sin(f*5.2 + uTime*0.65)*0.5+0.5;
          vec3 irid = mix(vec3(0.72,0.88,1.0), vec3(1.0,0.78,0.92), ir);
          vec3 base = mix(uColA, uColB, uBlend);
          vec3 col  = mix(base, irid, f*0.60);
          float core = (1.0-f)*(1.0-f)*0.25*(0.4+uBreath*0.8);
          col += vec3(0.38,0.52,0.82)*core;
          float alpha = clamp(f*0.78 + (1.0-f)*0.16*(0.5+uBreath*0.6), 0.0, 1.0);
          gl_FragColor = vec4(col*(0.65+f*1.55), alpha);
        }
      `,
    });
    const sphere = new THREE.Mesh(sGeo, sMat);
    scene.add(sphere);

    /* ── Inner glow shell (back-face, additive) ── */
    const iMat = new THREE.ShaderMaterial({
      transparent: true, side: THREE.BackSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
      uniforms: { uBreath:{value:0}, uColA:{value:new THREE.Color(0.63,0.82,0.84)}, uBlend:{value:0}, uColB:{value:new THREE.Color(0.95,0.76,0.69)} },
      vertexShader: /* glsl */`varying vec3 vN,vV; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: /* glsl */`precision mediump float; uniform float uBreath; uniform vec3 uColA,uColB; uniform float uBlend; varying vec3 vN,vV; void main(){ float f=pow(1.0-max(0.0,dot(vV,vN)),1.4); vec3 c=mix(uColA,uColB,uBlend); gl_FragColor=vec4(c*1.6, f*0.42*(0.35+uBreath*0.80)); }`,
    });
    const inner = new THREE.Mesh(sGeo, iMat);
    inner.scale.setScalar(1.07);
    scene.add(inner);

    /* ── Orbiting particle ring ── */
    const RING_N = 90;
    const rGeo = new THREE.BufferGeometry();
    const rPos = new Float32Array(RING_N * 3);
    const rOp  = new Float32Array(RING_N);
    for (let i = 0; i < RING_N; i++) {
      const a = (i / RING_N) * Math.PI * 2;
      rPos[3*i]   = Math.cos(a) * 1.52;
      rPos[3*i+1] = 0;
      rPos[3*i+2] = Math.sin(a) * 1.52;
      rOp[i] = 0.35 + Math.random() * 0.65;
    }
    rGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
    rGeo.setAttribute('aOp', new THREE.BufferAttribute(rOp, 1));
    const rMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uBreath:{value:0}, uCol:{value:new THREE.Color(0.63,0.82,0.84)}, uPR:{value:dpr} },
      vertexShader: /* glsl */`attribute float aOp; uniform float uBreath,uPR; varying float vOp; void main(){ vOp=aOp; gl_PointSize=(2.8+uBreath*3.8)*uPR; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: /* glsl */`precision mediump float; uniform vec3 uCol; uniform float uBreath; varying float vOp; void main(){ vec2 c=gl_PointCoord-0.5; if(length(c)>0.5)discard; float a=smoothstep(0.5,0.0,length(c))*vOp*(0.28+uBreath*0.55); gl_FragColor=vec4(uCol,a); }`,
    });
    const ring = new THREE.Points(rGeo, rMat);
    scene.add(ring);

    /* ── Second outer ring — slower, tilted ── */
    const r2Geo = new THREE.BufferGeometry();
    const r2Pos = new Float32Array(RING_N * 3);
    for (let i = 0; i < RING_N; i++) {
      const a = (i / RING_N) * Math.PI * 2;
      r2Pos[3*i]   = Math.cos(a) * 1.82;
      r2Pos[3*i+1] = Math.sin(a) * 0.22;
      r2Pos[3*i+2] = Math.sin(a) * 1.82;
      rOp[i] = 0.20 + Math.random() * 0.45;
    }
    r2Geo.setAttribute('position', new THREE.BufferAttribute(r2Pos, 3));
    r2Geo.setAttribute('aOp', new THREE.BufferAttribute(new Float32Array(rOp), 1));
    const r2Mat = rMat.clone();
    r2Mat.uniforms.uCol = { value: new THREE.Color(0.82, 0.76, 0.87) };
    r2Mat.uniforms.uPR  = { value: dpr };
    const ring2 = new THREE.Points(r2Geo, r2Mat);
    scene.add(ring2);

    /* ── Lights ── */
    scene.add(new THREE.AmbientLight(0x223355, 0.5));
    const pL = new THREE.PointLight(0x88aaff, 2.2, 10);
    pL.position.set(2.5, 2, 2);
    scene.add(pL);
    const pL2 = new THREE.PointLight(0xffbbdd, 1.2, 8);
    pL2.position.set(-2, -1, 2);
    scene.add(pL2);

    /* Phase → color tables (matches LINEN_COL above) */
    const CA = { inhale:[0.63,0.82,0.84], hold:[0.70,0.86,0.78], exhale:[0.95,0.76,0.69], rest:[0.82,0.76,0.87] };
    const CB = { inhale:[0.75,0.85,1.00], hold:[0.72,0.96,0.88], exhale:[1.00,0.65,0.55], rest:[0.90,0.85,1.00] };
    const auraH = { inhale:200, hold:155, exhale:15, rest:270 };

    const curA = new THREE.Color(...CA.inhale);
    const curB = new THREE.Color(...CB.inhale);
    let blend = 0;
    let rafId;
    const t0 = performance.now();

    const animate = (now) => {
      const t       = (now - t0) / 1000;
      const breath  = window.__mindspaceBreath || 0;
      const phase   = window.__mindspacePhase  || 'inhale';

      /* lerp colours to current phase */
      const tA = CA[phase] || CA.inhale;
      const tB = CB[phase] || CB.inhale;
      curA.lerp(new THREE.Color(...tA), 0.022);
      curB.lerp(new THREE.Color(...tB), 0.022);
      blend += (breath - blend) * 0.038;

      /* orb scale breathes */
      const sc = 1.0 + breath * 0.20;
      sphere.scale.setScalar(sc);
      inner.scale.setScalar(sc * 1.07);

      /* rotate rings */
      ring.rotation.y  =  t * 0.38;
      ring.rotation.x  =  Math.sin(t * 0.11) * 0.28 + breath * 0.12;
      ring2.rotation.y = -t * 0.20;
      ring2.rotation.z =  t * 0.06;

      /* light pulse */
      pL.intensity  = 2.2 + breath * 1.4 + Math.sin(t * 1.2) * 0.3;
      pL2.intensity = 1.2 + breath * 0.8;

      /* update uniforms */
      sMat.uniforms.uTime.value  = t;
      sMat.uniforms.uBreath.value = breath;
      sMat.uniforms.uColA.value.copy(curA);
      sMat.uniforms.uColB.value.copy(curB);
      sMat.uniforms.uBlend.value = blend;
      iMat.uniforms.uBreath.value = breath;
      iMat.uniforms.uColA.value.copy(curA);
      iMat.uniforms.uColB.value.copy(curB);
      iMat.uniforms.uBlend.value = blend;
      rMat.uniforms.uBreath.value = breath;
      rMat.uniforms.uCol.value.copy(curA);
      r2Mat.uniforms.uBreath.value = breath;

      /* camera drift */
      camera.position.x = Math.sin(t * 0.07) * 0.14;
      camera.position.y = Math.sin(t * 0.05) * 0.10;
      camera.lookAt(0, 0, 0);

      /* write aura for peripheral glow */
      const aura = document.getElementById('__breath-aura');
      if (aura) {
        const h = auraH[phase] || 200;
        aura.style.setProperty('--aura-h', h);
        aura.style.setProperty('--aura-s', '55%');
        aura.style.setProperty('--aura-l', '72%');
        aura.style.setProperty('--aura-b', (0.5 + breath * 0.6).toFixed(3));
      }

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="lab-canvas globe-orb-mount" aria-label="Breathing visualisation" />;
}

window.MindSpaceBreathOrbV2 = BreathOrbV2;
window.MindSpaceBreathAura  = BreathAura;
window.MindSpaceBreathStyles = ['glass', 'globe', 'reactor', 'nebula', 'jellyfish', 'wireframe'];
