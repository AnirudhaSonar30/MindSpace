/* MindSpace — Neural Memory Network
   ─────────────────────────────────────────────────────────────
   Each thought becomes a neuron. Shared feelings form synapses.
   Activation pulses travel the network in real time.
   No identity. No replies. Just the collective mind.

   REAL-TIME SYNC (optional):
   1. Create a Firebase project at console.firebase.google.com
   2. Enable Realtime Database (start in test mode)
   3. Enable Authentication → Sign-in method → Anonymous
   4. Create firebase-config.js next to index.html with:
        window.MINDSPACE_FIREBASE = { apiKey:"...", authDomain:"...",
          databaseURL:"https://YOUR-PROJECT-default-rtdb.firebaseio.com",
          projectId:"...", appId:"..." };
   5. Add these two lines before sharedsky.jsx in index.html:
        <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
        <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js"></script>
        <script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"></script>
        <script src="firebase-config.js"></script>
   Without that setup the network runs in local-only mode (current device only).
*/

const { useState, useEffect, useRef, useCallback } = React;

/* ── Firebase (opt-in) ──────────────────────────────────────── */
const FIREBASE_CFG = (typeof window !== 'undefined') && window.MINDSPACE_FIREBASE;
let _db   = null;
let _authReady = false;

if (FIREBASE_CFG && typeof firebase !== 'undefined') {
  try {
    if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(FIREBASE_CFG);
    _db = firebase.database();
    firebase.auth().signInAnonymously()
      .then(() => { _authReady = true; })
      .catch(() => {});
  } catch (e) {
    console.warn('MindSpace Firebase init failed:', e.message);
    _db = null;
  }
}

/* ── Moderation ─────────────────────────────────────────────── */
const BLOCKED = [
  'fuck','shit','bitch','cunt','dick','cock','pussy','bastard','asshole',
  'nigger','nigga','faggot','kike','spic','chink','retard',
  'whore','slut','slag','kill yourself','kys','kms','go die',
  'rape','molest','hate you','hate everyone',
];
function isAllowed(text) {
  const t = text.toLowerCase();
  return !BLOCKED.some(w => {
    try { return new RegExp('\\b' + w.replace(/ /g, '\\s+') + '\\b').test(t); }
    catch { return t.includes(w); }
  });
}

/* ── Brain regions ──────────────────────────────────────────── */
const REGIONS = [
  { id: 'memory',  label: 'Memory',   cx: 0.28, cy: 0.33, hue: 210, sat: 55, lit: 70,
    words: ['remember', 'miss', 'used to', 'when i', 'years ago', 'childhood', 'back then', 'yesterday'] },
  { id: 'calm',    label: 'Calm',     cx: 0.54, cy: 0.55, hue: 156, sat: 45, lit: 68,
    words: ['okay', 'peace', 'quiet', 'rest', 'breathing', 'gentle', 'small win', 'thank', 'better', 'fine'] },
  { id: 'anxiety', label: 'Anxiety',  cx: 0.23, cy: 0.70, hue: 38,  sat: 60, lit: 66,
    words: ['anxious', 'scared', 'worried', 'panic', 'racing', 'nervous', 'afraid', 'dread', 'shaking'] },
  { id: 'love',    label: 'Love',     cx: 0.76, cy: 0.63, hue: 346, sat: 55, lit: 70,
    words: ['love', 'mum', 'mom', 'dad', 'father', 'baby', 'son', 'daughter', 'home', 'friend', 'miss you', 'told'] },
  { id: 'grief',   label: 'Grief',    cx: 0.16, cy: 0.53, hue: 288, sat: 35, lit: 64,
    words: ['grief', 'died', 'lost', 'crying', 'tears', 'missing', 'gone', 'alone', 'lonely', 'broke'] },
  { id: 'tired',   label: 'Fatigue',  cx: 0.70, cy: 0.27, hue: 240, sat: 40, lit: 67,
    words: ['tired', 'exhausted', 'spent', 'drained', 'sleep', "can't sleep", 'long day', 'holding on'] },
  { id: 'wonder',  label: 'Wonder',   cx: 0.47, cy: 0.19, hue: 188, sat: 50, lit: 70,
    words: ['beautiful', 'sky', 'stars', 'wonder', 'amazed', 'grateful', 'lucky', 'awe', 'magic', 'proud'] },
];
const REGION_MAP = Object.fromEntries(REGIONS.map(r => [r.id, r]));

/* Which regions form synaptic connections */
const ADJACENT = {
  memory:  new Set(['calm', 'grief', 'tired', 'memory', 'wonder']),
  calm:    new Set(['memory', 'wonder', 'anxiety', 'love', 'tired', 'calm', 'grief']),
  anxiety: new Set(['grief', 'calm', 'tired', 'anxiety']),
  love:    new Set(['calm', 'wonder', 'grief', 'love']),
  grief:   new Set(['memory', 'anxiety', 'love', 'grief', 'tired']),
  tired:   new Set(['memory', 'calm', 'anxiety', 'tired']),
  wonder:  new Set(['calm', 'love', 'memory', 'wonder']),
};

/* ── Seed neurons ───────────────────────────────────────────── */
const SEEDS = [
  { t: 'i am tired but it is the good kind tonight.',            r: 'tired'   },
  { t: 'finally took a walk. small win.',                        r: 'calm'    },
  { t: 'missing someone i shouldn’t miss.',                r: 'grief'   },
  { t: 'the cat decided i was a good chair.',                    r: 'calm'    },
  { t: 'first quiet evening in weeks.',                          r: 'calm'    },
  { t: 'thank you, whoever made this.',                          r: 'wonder'  },
  { t: 'breathing through it.',                                  r: 'calm'    },
  { t: 'long day. holding on.',                                  r: 'tired'   },
  { t: 'four sighs and the room got smaller.',                   r: 'anxiety' },
  { t: 'i used to be afraid of this much silence.',              r: 'memory'  },
  { t: 'the rain in here is better than the rain out there.',    r: 'calm'    },
  { t: 'i am okay. for now. that counts.',                       r: 'calm'    },
  { t: 'mum called. it was a good call.',                        r: 'love'    },
  { t: 'turned off notifications. nothing exploded.',            r: 'calm'    },
  { t: 'sleep won’t come but rest will.',                  r: 'tired'   },
  { t: 'midnight rain forever.',                                 r: 'wonder'  },
  { t: 'the boy across the hall is laughing. helped.',           r: 'calm'    },
  { t: 'tea. window. nothing.',                                  r: 'calm'    },
  { t: 'this is the third day i feel like myself.',              r: 'calm'    },
  { t: 'small grief. small grief. it counts.',                   r: 'grief'   },
  { t: 'sat with it instead of running. progress.',              r: 'anxiety' },
  { t: 'thirty-six. starting over. it’s okay.',            r: 'calm'    },
  { t: 'the train is taking me somewhere kinder.',               r: 'memory'  },
  { t: 'i forgive myself for today.',                            r: 'calm'    },
  { t: 'we are all just trying to put the day down.',            r: 'tired'   },
  { t: 'i remembered to eat. small things.',                     r: 'calm'    },
  { t: 'my therapist would be proud.',                           r: 'calm'    },
  { t: 'someone left a thought here. i needed it.',              r: 'wonder'  },
  { t: 'the deadline was made of fog. it passed through me.',    r: 'anxiety' },
  { t: 'the dog is asleep. that is the news.',                   r: 'calm'    },
  { t: 'i’m not okay but i’m not lost either.',       r: 'anxiety' },
  { t: 'told my dad i love him. easier than i thought.',         r: 'love'    },
  { t: 'broke down at work. nobody saw. came here.',             r: 'grief'   },
  { t: 'baby finally sleeping. so am i.',                        r: 'love'    },
  { t: 'the storm in my chest is quiet tonight.',                r: 'calm'    },
  { t: 'i miss my brother.',                                     r: 'grief'   },
  { t: 'i’m proud of you, you who is reading this.',       r: 'wonder'  },
  { t: 'turned 50 today. waited a long time to feel okay.',      r: 'memory'  },
  { t: 'it’s not better. it’s also not worse.',       r: 'calm'    },
  { t: 'i don’t want to be anywhere else right now.',      r: 'calm'    },
  { t: 'the moon was a half. that was enough.',                  r: 'wonder'  },
  { t: 'kept the boundary. the world did not end.',              r: 'anxiety' },
  { t: 'i used to think rest was lazy. it isn’t.',         r: 'tired'   },
  { t: 'sat with my coffee. didn’t check my phone.',       r: 'calm'    },
];

/* ── Helpers ────────────────────────────────────────────────── */
function strHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return [((h >>> 0) % 10000) / 10000, (((h >>> 8) ^ 0x9e3779b9) >>> 0) % 10000 / 10000];
}

function placeNeuron(text, regionId, seed) {
  const r = REGION_MAP[regionId];
  const [hx, hy] = strHash(text + ':' + (seed || regionId || 'x'));
  if (r) {
    const angle  = hx * Math.PI * 2;
    const radius = 0.028 + hy * 0.085;
    return {
      x: Math.max(0.04, Math.min(0.96, r.cx + Math.cos(angle) * radius)),
      y: Math.max(0.06, Math.min(0.94, r.cy + Math.sin(angle) * radius)),
      hue: r.hue, sat: r.sat, lit: r.lit,
    };
  }
  return { x: 0.06 + hx * 0.88, y: 0.08 + hy * 0.84, hue: 220, sat: 30, lit: 70 };
}

function classifyText(text) {
  const t = text.toLowerCase();
  for (const r of REGIONS) {
    for (const w of r.words) {
      if (t.includes(w)) return r.id;
    }
  }
  return null;
}

const LS_KEY    = 'mindspace.neurons.v1';
const MAX_LOCAL = 120;
function loadLocal()     { try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; } }
function saveLocal(arr)  { try { localStorage.setItem(LS_KEY, JSON.stringify(arr.slice(-MAX_LOCAL))); } catch {} }

/* ══════════════════════════════════════════════════════════════
   Component
══════════════════════════════════════════════════════════════ */
function SharedSky() {
  const [open,       setOpen]       = useState(false);
  const [revealed,   setRevealed]   = useState(false);
  const [neurons,    setNeurons]    = useState([]);
  const [composing,  setComposing]  = useState(false);
  const [text,       setText]       = useState('');
  const [hover,      setHover]      = useState(null);
  const [blocked,    setBlocked]    = useState('');
  const [present,    setPresent]    = useState(0);
  const [birthAnim,  setBirthAnim]  = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  const canvasRef      = useRef(null);
  const viewRef        = useRef({ tx: 0, ty: 0, zoom: 1 });
  const dragRef        = useRef(null);
  const neuronsRef     = useRef([]);
  const birthFlashRef  = useRef([]);   // [{ x, y, age, hue }]
  const pulsesRef      = useRef([]);   // traveling synapse dots
  const synCacheRef    = useRef([]);   // last-computed synapse list
  const myNeuronsRef   = useRef(new Set());

  useEffect(() => { neuronsRef.current = neurons; }, [neurons]);

  /* ── Bootstrap ────────────────────────────────────────────── */
  useEffect(() => {
    const seeds = SEEDS.map((s, i) => {
      const p = placeNeuron(s.t, s.r, 'seed-' + i);
      return {
        id: 'seed-' + i, text: s.t,
        x: p.x, y: p.y, hue: p.hue, sat: p.sat, lit: p.lit,
        regionId: s.r, mine: false, seed: true,
        born: Date.now() - (SEEDS.length - i) * 86400000,
        twinkle: (i * 0.73) % (Math.PI * 2),
        size: 0.85 + (i % 6) * 0.18,
      };
    });

    const local = loadLocal().map((n, i) => {
      const p = placeNeuron(n.text, n.regionId, 'local-' + i);
      myNeuronsRef.current.add(n.id);
      return {
        id: n.id, text: n.text,
        x: n.x ?? p.x, y: n.y ?? p.y,
        hue: p.hue, sat: p.sat, lit: p.lit,
        regionId: n.regionId, mine: true,
        born: n.born || Date.now(),
        twinkle: strHash(n.id || n.text)[0] * Math.PI * 2,
        size: 1.4,
      };
    });

    setNeurons([...seeds, ...local]);
    setTotalCount(seeds.length + local.length);

    const tick = () => {
      const h = new Date().getHours();
      const base = h < 6 ? 18 : h < 11 ? 44 : h < 17 ? 33 : h < 22 ? 71 : 56;
      setPresent(base + Math.floor(Math.random() * 16) - 8);
    };
    tick();
    const pid = setInterval(tick, 20000);
    return () => clearInterval(pid);
  }, []);

  /* ── Firebase real-time sync ──────────────────────────────── */
  useEffect(() => {
    if (!_db) return;
    const ref = _db.ref('/neurons').orderByChild('ts').limitToLast(500);
    const handler = (snap) => {
      const val = snap.val();
      if (!val) return;
      const remote = Object.entries(val).map(([id, n]) => {
        const p = placeNeuron(n.text, n.regionId, id);
        const mine = myNeuronsRef.current.has(id);
        return {
          id, text: n.text,
          x: n.x ?? p.x, y: n.y ?? p.y,
          hue: p.hue, sat: p.sat, lit: p.lit,
          regionId: n.regionId || null,
          mine,
          born: n.ts || Date.now(),
          twinkle: strHash(id)[0] * Math.PI * 2,
          size: mine ? 1.6 : 1.0,
        };
      });
      setNeurons(remote);
      setTotalCount(remote.length);
    };
    ref.on('value', handler);
    return () => ref.off('value', handler);
  }, []);

  /* ── Canvas render loop ───────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width  = Math.round(r.width)  * dpr;
      canvas.height = Math.round(r.height) * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    let raf, frame = 0;

    const draw = () => {
      frame = (frame + 1) % 100000;
      const v  = viewRef.current;
      const ns = neuronsRef.current;
      const W  = canvas.width  / dpr;
      const H  = canvas.height / dpr;

      ctx.clearRect(0, 0, W, H);

      /* deep space */
      ctx.fillStyle = 'rgb(2, 2, 14)';
      ctx.fillRect(0, 0, W, H);

      /* region halos — aurora at each brain region centre */
      REGIONS.forEach(r => {
        const cx = (r.cx * W + v.tx) * v.zoom + W * (1 - v.zoom) * 0.5;
        const cy = (r.cy * H + v.ty) * v.zoom + H * (1 - v.zoom) * 0.5;
        const rad = W * 0.20 * v.zoom;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0,   `hsla(${r.hue},${r.sat}%,${r.lit}%,0.10)`);
        g.addColorStop(0.45,`hsla(${r.hue},${r.sat}%,${r.lit}%,0.04)`);
        g.addColorStop(1,   `hsla(${r.hue},${r.sat}%,${r.lit}%,0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
      });

      /* project normalised coords → screen */
      const project = (nx, ny) => ({
        x: (nx * W + v.tx) * v.zoom + W * (1 - v.zoom) * 0.5,
        y: (ny * H + v.ty) * v.zoom + H * (1 - v.zoom) * 0.5,
      });

      /* compute screen positions */
      ns.forEach(n => {
        const p = project(n.x, n.y);
        n._px = p.x; n._py = p.y;
      });

      /* ── Synapses: spatial grid for O(n) neighbour lookup ── */
      const CELL = 110;
      const COLS = Math.ceil(W / CELL) + 1;
      const ROWS = Math.ceil(H / CELL) + 1;
      const grid = new Array(COLS * ROWS).fill(null).map(() => []);

      ns.forEach((n, i) => {
        const col = Math.floor(n._px / CELL);
        const row = Math.floor(n._py / CELL);
        if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
          grid[row * COLS + col].push(i);
        }
      });

      const drawn   = new Set();
      const newSyns = [];

      ctx.lineWidth = 0.55;

      ns.forEach((a, ai) => {
        const col = Math.floor(a._px / CELL);
        const row = Math.floor(a._py / CELL);
        const aRegSet = ADJACENT[a.regionId] || new Set(['calm']);

        for (let dc = -1; dc <= 1; dc++) {
          for (let dr = -1; dr <= 1; dr++) {
            const nc = col + dc, nr = row + dr;
            if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
            grid[nr * COLS + nc].forEach(bi => {
              if (bi <= ai) return;
              const b   = ns[bi];
              const key = ai + '_' + bi;
              if (drawn.has(key)) return;
              if (!aRegSet.has(b.regionId || 'calm')) return;

              const dx = a._px - b._px, dy = a._py - b._py;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 108) return;

              drawn.add(key);
              const fade  = 1 - dist / 108;
              const boost = (a.mine || b.mine) ? 1.8 : 1;
              const alpha = fade * 0.13 * boost;
              const midH  = ((a.hue || 220) + (b.hue || 220)) / 2;

              ctx.strokeStyle = `hsla(${midH},55%,72%,${alpha.toFixed(3)})`;
              ctx.beginPath();
              ctx.moveTo(a._px, a._py);
              ctx.lineTo(b._px, b._py);
              ctx.stroke();

              newSyns.push({ ai, bi, hue: midH });
            });
          }
        }
      });

      if (frame % 60 === 0) synCacheRef.current = newSyns;

      /* ── Synapse pulse dots ──────────────────────────────── */
      if (frame % 48 === 0 && synCacheRef.current.length > 0) {
        const arr = synCacheRef.current;
        const pick = arr[Math.floor(Math.random() * arr.length)];
        if (pick) {
          pulsesRef.current.push({
            ai: pick.ai, bi: pick.bi, hue: pick.hue,
            t: 0, speed: 0.007 + Math.random() * 0.007,
          });
        }
      }
      if (pulsesRef.current.length > 50) pulsesRef.current.splice(0, 8);

      pulsesRef.current = pulsesRef.current.filter(p => p.t < 1.0);
      pulsesRef.current.forEach(p => {
        p.t += p.speed;
        const a = ns[p.ai], b = ns[p.bi];
        if (!a || !b) return;
        const px = a._px + (b._px - a._px) * p.t;
        const py = a._py + (b._py - a._py) * p.t;
        const al = 0.9 * Math.sin(p.t * Math.PI);
        /* glow */
        const g = ctx.createRadialGradient(px, py, 0, px, py, 6);
        g.addColorStop(0, `hsla(${p.hue},75%,82%,${(al * 0.55).toFixed(3)})`);
        g.addColorStop(1, `hsla(${p.hue},75%,82%,0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
        /* dot */
        ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},80%,88%,${al.toFixed(3)})`;
        ctx.fill();
      });

      /* ── Birth flashes ──────────────────────────────────── */
      birthFlashRef.current = birthFlashRef.current.filter(f => f.age < 1);
      birthFlashRef.current.forEach(f => {
        f.age += 0.020;
        const r1 = 90 * Math.pow(f.age, 0.45);
        const a1 = 0.75 * (1 - f.age);
        ctx.beginPath(); ctx.arc(f.x, f.y, r1, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${f.hue},60%,80%,${a1.toFixed(3)})`;
        ctx.lineWidth = 1.8; ctx.stroke();

        if (f.age > 0.18) {
          const r2 = 55 * Math.pow(f.age - 0.18, 0.4);
          const a2 = 0.55 * (1 - (f.age - 0.18) / 0.82);
          ctx.beginPath(); ctx.arc(f.x, f.y, r2, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${f.hue},75%,90%,${a2.toFixed(3)})`;
          ctx.lineWidth = 1; ctx.stroke();
        }
        if (f.age < 0.18) {
          const ca = 1 - f.age / 0.18;
          const cg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 22);
          cg.addColorStop(0, `hsla(${f.hue},85%,96%,${ca.toFixed(3)})`);
          cg.addColorStop(1, `hsla(${f.hue},60%,80%,0)`);
          ctx.fillStyle = cg;
          ctx.beginPath(); ctx.arc(f.x, f.y, 22, 0, Math.PI * 2); ctx.fill();
        }
      });

      /* ── Neurons ─────────────────────────────────────────── */
      ns.forEach((n, i) => {
        const isMine = n.mine || myNeuronsRef.current.has(n.id);
        const tw     = 0.58 + 0.42 * Math.sin(frame * 0.020 + n.twinkle);
        const baseA  = isMine ? 0.95 : 0.55 + 0.25 * tw;
        const sz     = (n.size || 1.0) * v.zoom;
        /* tiny drift */
        const drift  = v.zoom > 0.8 ? 1 : 0;
        const px = n._px + Math.sin(frame * 0.0021 + i * 0.71) * 1.4 * drift;
        const py = n._py + Math.cos(frame * 0.0018 + i * 0.53) * 0.9 * drift;

        /* glow corona */
        const gr = (11 + sz * 7) * (isMine ? 1.5 : 1);
        const gl = ctx.createRadialGradient(px, py, 0, px, py, gr);
        gl.addColorStop(0,   `hsla(${n.hue},${n.sat}%,${n.lit}%,${(baseA * 0.48).toFixed(3)})`);
        gl.addColorStop(0.4, `hsla(${n.hue},${n.sat}%,${n.lit}%,${(baseA * 0.14).toFixed(3)})`);
        gl.addColorStop(1,   `hsla(${n.hue},${n.sat}%,${n.lit}%,0)`);
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(px, py, gr, 0, Math.PI * 2); ctx.fill();

        /* core dot */
        const dotR = Math.max(0.9, sz * (isMine ? 2.4 : 1.5));
        ctx.beginPath(); ctx.arc(px, py, dotR, 0, Math.PI * 2);
        ctx.fillStyle = isMine
          ? `rgba(215, 238, 255, ${baseA.toFixed(3)})`
          : `hsla(${n.hue},${Math.min(100, n.sat + 22)}%,${Math.min(95, n.lit + 14)}%,${baseA.toFixed(3)})`;
        ctx.fill();

        /* mine — pulsing ring */
        if (isMine) {
          const ringA = 0.20 + 0.16 * Math.sin(frame * 0.036 + n.twinkle);
          ctx.beginPath(); ctx.arc(px, py, dotR * 3.8, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(140, 205, 255, ${ringA.toFixed(3)})`;
          ctx.lineWidth = 0.9; ctx.stroke();
        }

        n._rpx = px; n._rpy = py;
      });

      /* vignette */
      const vig = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.28, W * 0.5, H * 0.5, Math.max(W, H) * 0.82);
      vig.addColorStop(0,    'rgba(0,0,0,0)');
      vig.addColorStop(0.72, 'rgba(1,1,12,0.14)');
      vig.addColorStop(1,    'rgba(0,0,0,0.62)');
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    /* interaction */
    const onWheel = e => {
      e.preventDefault();
      const delta = e.deltaMode === 1 ? e.deltaY * 20 : e.deltaY;
      viewRef.current.zoom = Math.max(0.45, Math.min(5.5, viewRef.current.zoom - delta * 0.004));
    };
    const onDown  = e => {
      dragRef.current = { sx: e.clientX, sy: e.clientY, tx: viewRef.current.tx, ty: viewRef.current.ty };
    };
    const onMove  = e => {
      if (dragRef.current) {
        viewRef.current.tx = dragRef.current.tx + (e.clientX - dragRef.current.sx) * 1.9;
        viewRef.current.ty = dragRef.current.ty + (e.clientY - dragRef.current.sy) * 1.9;
      }
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      let best = null, bd = 26 * 26;
      neuronsRef.current.forEach(n => {
        if (n._rpx == null) return;
        const d = (n._rpx - mx) ** 2 + (n._rpy - my) ** 2;
        if (d < bd) { bd = d; best = n; }
      });
      setHover(best
        ? { id: best.id, text: best.text, x: best._rpx, y: best._rpy,
            mine: best.mine || myNeuronsRef.current.has(best.id),
            regionId: best.regionId }
        : null);
    };
    const onUp    = () => { dragRef.current = null; };
    const onLeave = () => { setHover(null); dragRef.current = null; };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseleave', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mouseleave', onLeave);
    };
  }, [open]);

  /* open/close fade */
  useEffect(() => {
    if (!open) { setRevealed(false); return; }
    const id = setTimeout(() => setRevealed(true), 60);
    return () => clearTimeout(id);
  }, [open]);

  /* ── Submit ───────────────────────────────────────────────── */
  const submit = useCallback(() => {
    const t = text.trim();
    if (!t || t.length > 160) return;
    if (!isAllowed(t)) {
      setBlocked('please keep this space gentle.');
      setTimeout(() => setBlocked(''), 3500);
      return;
    }

    const regionId = classifyText(t);
    const pos      = placeNeuron(t, regionId, Date.now());
    const id       = 'n-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);

    const newNeuron = {
      id, text: t,
      x: pos.x, y: pos.y,
      hue: pos.hue, sat: pos.sat, lit: pos.lit,
      regionId, mine: true,
      born: Date.now(),
      twinkle: Math.random() * Math.PI * 2,
      size: 1.8,
    };

    myNeuronsRef.current.add(id);

    /* birth text animation */
    setBirthAnim({ text: t, key: id });
    setTimeout(() => setBirthAnim(null), 2400);

    /* add neuron after text flies up */
    setTimeout(() => {
      setNeurons(prev => [...prev, newNeuron]);
      setTotalCount(c => c + 1);

      /* birth flash */
      setTimeout(() => {
        const cv = canvasRef.current;
        if (!cv) return;
        const W = cv.getBoundingClientRect().width;
        const H = cv.getBoundingClientRect().height;
        const v = viewRef.current;
        const fx = (pos.x * W + v.tx) * v.zoom + W * (1 - v.zoom) * 0.5;
        const fy = (pos.y * H + v.ty) * v.zoom + H * (1 - v.zoom) * 0.5;
        birthFlashRef.current.push({ x: fx, y: fy, age: 0, hue: pos.hue });

        /* fly viewport to new neuron */
        viewRef.current.tx = W * 0.5 - pos.x * W;
        viewRef.current.ty = H * 0.5 - pos.y * H;
        viewRef.current.zoom = 1.7;
      }, 80);

      /* persist locally */
      const cur = loadLocal();
      saveLocal([...cur, { id, text: t, x: pos.x, y: pos.y, regionId, born: Date.now() }]);

      /* push to Firebase */
      if (_db && _authReady) {
        _db.ref('/neurons/' + id).set({
          text: t, regionId, x: pos.x, y: pos.y,
          ts: firebase.database.ServerValue.TIMESTAMP,
        }).catch(() => {});
      }
    }, 1100);

    setText('');
    setComposing(false);
  }, [text]);

  const resetView = () => { viewRef.current = { tx: 0, ty: 0, zoom: 1 }; };

  /* region counts for legend */
  const regionCounts = {};
  neurons.forEach(n => {
    if (n.regionId) regionCounts[n.regionId] = (regionCounts[n.regionId] || 0) + 1;
  });

  /* hover region label */
  const hoverRegion = hover && hover.regionId ? REGION_MAP[hover.regionId] : null;

  return (
    <React.Fragment>
      {/* FAB */}
      <button className="ss-fab" onClick={() => setOpen(true)} aria-label="Open neural memory">
        <span className="ss-fab-text">neural memory</span>
        <span className="ss-fab-sub">{totalCount} neurons · {present} minds</span>
      </button>

      {open && (
        <div className={'ss-overlay' + (revealed ? ' in' : '')} role="dialog" aria-label="Neural Memory Network">
          <div className="ss-veil" onClick={() => setOpen(false)} />
          <div className="ss-stage" onClick={e => e.stopPropagation()}>

            <header className="ss-head">
              <div className="ss-head-text">
                <div className="ss-eyebrow">no identity · no replies · anonymous · permanent</div>
                <h2 className="ss-title">Neural Memory.</h2>
                <p className="ss-sub">
                  Every thought becomes a neuron. Shared feelings form synapses.
                  Watch activation pulses cross the network.
                  Scroll to zoom · drag to explore · hover to read.
                </p>
              </div>
              <div className="ss-head-meta">
                <div className="ss-presence">
                  <span className="ss-presence-dot" />
                  <span className="ss-presence-text">{present} active</span>
                </div>
                <button className="ss-close" onClick={() => setOpen(false)} aria-label="Close">
                  <svg width="12" height="12" viewBox="0 0 12 12">
                    <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </header>

            <div className="ss-canvas-wrap">
              <canvas ref={canvasRef} className="ss-canvas" aria-label="Neural memory network" />

              {/* Brain region legend */}
              <div className="ss-legend">
                {REGIONS.map(r => (
                  <div key={r.id} className="ss-legend-row">
                    <span
                      className="ss-legend-dot"
                      style={{ background: `hsl(${r.hue},${r.sat}%,${r.lit}%)`,
                               boxShadow: `0 0 6px hsl(${r.hue},${r.sat}%,${r.lit}%,0.7)` }}
                    />
                    <span className="ss-legend-label">{r.label}</span>
                    {regionCounts[r.id]
                      ? <span className="ss-legend-count">{regionCounts[r.id]}</span>
                      : null}
                  </div>
                ))}
              </div>

              {/* Re-centre */}
              <button className="ss-recenter" onClick={resetView} title="Re-centre">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <circle cx="5" cy="5" r="2.4" stroke="currentColor" strokeWidth="0.8" />
                  <path d="M5 1.2v1.8M5 7v1.8M1.2 5h1.8M7 5h1.8" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
                </svg>
                <span>recenter</span>
              </button>

              {/* Birth animation — text rises and implodes into a neuron */}
              {birthAnim && (
                <div className="nn-birth-wrap" key={birthAnim.key}>
                  <div className="nn-birth-text">{birthAnim.text}</div>
                </div>
              )}

              {/* Hover tooltip */}
              {hover && (
                <div
                  className={'ss-tip nn-tip' + (hover.mine ? ' mine' : '')}
                  style={{ left: hover.x + 'px', top: hover.y + 'px' }}
                >
                  <div className="nn-tip-text">{hover.text}</div>
                  {hoverRegion && (
                    <div className="nn-tip-region" style={{ color: `hsl(${hoverRegion.hue},${hoverRegion.sat}%,${hoverRegion.lit}%)` }}>
                      {hoverRegion.label}
                      {hover.mine && <span className="ss-tip-mine"> · yours</span>}
                    </div>
                  )}
                </div>
              )}
            </div>

            <footer className="ss-foot">
              {!_db && (
                <div className="nn-local-notice">
                  <span className="nn-local-dot" />
                  local mode — thoughts stay on this device
                </div>
              )}
              {_db && (
                <div className="nn-sync-notice">
                  <span className="nn-sync-dot" />
                  live network — thoughts are shared with all minds
                </div>
              )}

              {composing ? (
                <div className="ss-composer">
                  <textarea
                    className="ss-input"
                    placeholder="encode a memory into the network..."
                    maxLength={160}
                    value={text}
                    onChange={e => { setText(e.target.value); setBlocked(''); }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
                      if (e.key === 'Escape') { setComposing(false); setText(''); setBlocked(''); }
                    }}
                    autoFocus
                    rows={2}
                  />
                  <div className="ss-composer-row">
                    {blocked
                      ? <span className="ss-count" style={{ color: 'rgba(255,110,90,0.9)' }}>{blocked}</span>
                      : <span className="ss-count">{text.length}/160 · anonymous · permanent</span>
                    }
                    <div className="ss-composer-actions">
                      <button className="ss-btn ss-btn-ghost"
                        onClick={() => { setComposing(false); setText(''); setBlocked(''); }}>
                        cancel
                      </button>
                      <button className="ss-btn nn-transmit" disabled={!text.trim()} onClick={submit}>
                        transmit ✦
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button className="ss-leave-btn nn-encode-btn" onClick={() => setComposing(true)}>
                  <span className="nn-encode-dot" />
                  <span>encode a memory</span>
                </button>
              )}
            </footer>
          </div>
        </div>
      )}
    </React.Fragment>
  );
}

window.MindSpaceSharedSky = SharedSky;
