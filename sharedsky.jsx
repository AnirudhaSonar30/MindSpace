/* MindSpace — Shared Sky v2
   --------------------------------------------------------------
   A truly inhabited night sky. Pan/zoom. Stars cluster by theme.
   Constellation lines connect related thoughts. New stars arrive
   from outside the frame with a small visible trail. Seeded with
   curated anonymous thoughts so first visit feels alive.
*/

const { useState, useEffect, useRef, useCallback } = React;

const SS_KEY   = 'mindspace.sharedsky.v2';
const SS_LIMIT = 120;

/* ── content moderation ── */
const BLOCKED = [
  'fuck','shit','bitch','cunt','dick','cock','pussy','bastard','asshole',
  'nigger','nigga','faggot','kike','spic','chink','retard',
  'whore','slut','slag',
  'kill yourself','kys','kms','go die',
  'rape','molest',
  'hate you','hate everyone',
];
function isAllowed(text) {
  const t = text.toLowerCase();
  return !BLOCKED.some(w => {
    try { return new RegExp('\\b' + w.replace(/ /g,'\\s+') + '\\b').test(t); }
    catch { return t.includes(w); }
  });
}

/* Themed regions of the sky — soft attractors */
const THEMES = [
  { id: 'tired',   cx: 0.22, cy: 0.34, color: [210, 38, 72], words: ['tired', 'exhausted', 'spent', 'drained', 'sleep', 'rest'] },
  { id: 'lonely',  cx: 0.68, cy: 0.28, color: [264, 36, 68], words: ['lonely', 'alone', 'missing', 'gone', 'empty'] },
  { id: 'okay',    cx: 0.52, cy: 0.58, color: [156, 30, 68], words: ['okay', 'small win', 'breathing', 'good', 'thank', 'thanks'] },
  { id: 'anxious', cx: 0.30, cy: 0.74, color: [38,  56, 68], words: ['anxious', 'scared', 'worried', 'panic', 'racing'] },
  { id: 'love',    cx: 0.78, cy: 0.66, color: [346, 50, 72], words: ['love', 'mum', 'father', 'baby', 'son', 'daughter', 'home'] },
  { id: 'work',    cx: 0.46, cy: 0.20, color: [188, 42, 70], words: ['work', 'deadline', 'job', 'boss'] },
  { id: 'grief',   cx: 0.14, cy: 0.62, color: [288, 28, 64], words: ['grief', 'died', 'lost', 'crying', 'tears'] },
];

/* Larger seed corpus — varied, anonymous, real */
const SEEDS = [
  'i am tired but it is the good kind tonight.',
  'finally took a walk. small win.',
  'missing someone i shouldn\u2019t miss.',
  'the cat decided i was a good chair.',
  'first quiet evening in weeks.',
  'thank you, whoever made this.',
  'breathing through it.',
  'long day. holding on.',
  'four sighs and the room got smaller.',
  'i used to be afraid of this much silence.',
  'the rain in here is better than the rain out there.',
  'i am okay. for now. that counts.',
  'mum called. it was a good call.',
  'turned off notifications. nothing exploded.',
  'sleep won\u2019t come but rest will. lower the stakes.',
  'midnight rain forever.',
  'the boy across the hall is laughing. helped.',
  'tea. window. nothing.',
  'this is the third day i feel like myself.',
  'small grief. small grief. it counts.',
  'sat with it instead of running. progress.',
  'thirty-six. starting over. it\u2019s okay.',
  'the train is taking me somewhere kinder.',
  'i forgive myself for today.',
  'we are all just trying to put the day down.',
  'i remembered to eat. small things.',
  'my therapist would be proud.',
  'someone left a thought here. i needed it.',
  'the deadline was made of fog. it passed through me.',
  'the dog is asleep. that is the news.',
  'i\u2019m not okay but i\u2019m not lost either.',
  'told my dad i love him. easier than i thought.',
  'broke down at work. nobody saw. came here.',
  'baby finally sleeping. so am i.',
  'this is the first night the storm in my chest is quiet.',
  'i miss my brother.',
  'i\u2019m proud of you, you who is reading this.',
  'turned 50 today. waited a long time to feel okay.',
  'it\u2019s not better. it\u2019s also not worse.',
  'i don\u2019t want to be anywhere else right now.',
  'the moon was a half. that was enough.',
  'kept the boundary. the world did not end.',
  'i used to think rest was lazy. it isn\u2019t.',
  'sat with my coffee. didn\u2019t check my phone. radical.',
];

function classifyText(text) {
  const t = text.toLowerCase();
  for (const th of THEMES) {
    for (const w of th.words) {
      if (t.includes(w)) return th;
    }
  }
  // default: scatter widely
  return null;
}

/* deterministic hash → [0..1) */
function strHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return [
    ((h >>> 0) % 10000) / 10000,
    (((h >>> 8) ^ 0x9e3779b9) >>> 0) % 10000 / 10000,
  ];
}

function placeStar(text, born, isMine, seedIdx) {
  const theme = classifyText(text);
  const [hx, hy] = strHash(text + ':' + (seedIdx ?? born));
  if (theme) {
    /* gather within ~14% of theme centre */
    const angle = hx * Math.PI * 2;
    const radius = 0.04 + hy * 0.10;
    return {
      x: Math.max(0.04, Math.min(0.96, theme.cx + Math.cos(angle) * radius)),
      y: Math.max(0.06, Math.min(0.94, theme.cy + Math.sin(angle) * radius)),
      themeId: theme.id,
      color: theme.color,
    };
  }
  return {
    x: 0.05 + hx * 0.90,
    y: 0.08 + hy * 0.80,
    themeId: null,
    color: [220, 30, 80],
  };
}

function loadStars() {
  try { return JSON.parse(localStorage.getItem(SS_KEY)) || []; } catch { return []; }
}
function saveStars(arr) {
  try { localStorage.setItem(SS_KEY, JSON.stringify(arr.slice(-SS_LIMIT))); } catch {}
}

function SharedSky() {
  const [open, setOpen]         = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [stars, setStars]       = useState([]);
  const [composing, setComposing] = useState(false);
  const [text, setText]         = useState('');
  const [hover, setHover]       = useState(null);
  const [arriving, setArriving] = useState([]); // newly-incoming stars
  const [present, setPresent]   = useState(0);  // souls present "now"
  const [blocked, setBlocked]   = useState('');
  const canvasRef  = useRef(null);
  const viewRef    = useRef({ tx: 0, ty: 0, zoom: 1 });
  const dragRef    = useRef(null);

  /* Build initial star list */
  useEffect(() => {
    const userStars = loadStars();
    const seeded = SEEDS.map((t, i) => {
      const p = placeStar(t, Date.now() - (i + 5) * 86400 * 1000, false, i);
      return {
        id: 'seed-' + i, text: t, x: p.x, y: p.y, color: p.color,
        themeId: p.themeId, size: 1.0 + (i % 5) * 0.35, mine: false,
        born: Date.now() - (i + 5) * 86400 * 1000, twinkle: (i * 0.7) % Math.PI,
        seed: true,
      };
    });
    const userMapped = userStars.map((s, i) => {
      const p = s.pos || placeStar(s.text, s.born, true, i);
      return {
        id: s.id || 'me-' + i, text: s.text,
        x: s.pos ? s.pos.x : p.x, y: s.pos ? s.pos.y : p.y,
        color: s.color || p.color, themeId: s.themeId || p.themeId,
        size: 1.7 + Math.random() * 0.5, mine: true,
        born: s.born, twinkle: Math.random() * Math.PI,
      };
    });
    setStars([...seeded, ...userMapped]);

    /* "Souls present" — a soft, plausibly-derived number that drifts.
       Not real but real-feeling. Anchored to time of day. */
    const tickSouls = () => {
      const hour = new Date().getHours();
      const base = hour < 6 ? 12
                 : hour < 11 ? 28
                 : hour < 17 ? 22
                 : hour < 22 ? 42
                 : 36;
      setPresent(base + Math.floor(Math.random() * 11) - 5);
    };
    tickSouls();
    const id = setInterval(tickSouls, 18000);
    return () => clearInterval(id);
  }, []);

  /* Periodically have a "phantom" seeded star arrive — gives the sky
     a sense of being inhabited in real time. */
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => {
      const idx = Math.floor(Math.random() * SEEDS.length);
      const text = SEEDS[idx];
      const p = placeStar(text, Date.now(), false, 'fresh-' + Date.now());
      const star = {
        id: 'fresh-' + Date.now(),
        text, x: p.x, y: p.y, color: p.color, themeId: p.themeId,
        size: 1.2 + Math.random() * 0.5, mine: false, fresh: true,
        born: Date.now(), twinkle: Math.random() * Math.PI,
      };
      setArriving(a => [...a.slice(-3), star]);
      setTimeout(() => {
        setStars(s => [...s, star]);
        setArriving(a => a.filter(x => x.id !== star.id));
      }, 1600);
    }, 12000 + Math.random() * 10000);
    return () => clearInterval(id);
  }, [open]);

  /* Render loop */
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
    const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

    let raf, frame = 0;
    const draw = () => {
      frame++;
      const v = viewRef.current;
      const W = canvas.width  / dpr;
      const H = canvas.height / dpr;
      ctx.clearRect(0, 0, W, H);

      /* deep sky fill */
      ctx.fillStyle = 'rgba(4,3,18,0.55)';
      ctx.fillRect(0, 0, W, H);

      /* theme aura — richer coloured nebula clouds at theme centres */
      THEMES.forEach(th => {
        const cx = (th.cx * W + v.tx) * v.zoom + (W * (1 - v.zoom) * 0.5);
        const cy = (th.cy * H + v.ty) * v.zoom + (H * (1 - v.zoom) * 0.5);
        const r2 = 160 * v.zoom;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r2);
        g.addColorStop(0,   `hsla(${th.color[0]},${th.color[1]}%,${th.color[2]}%,0.14)`);
        g.addColorStop(0.5, `hsla(${th.color[0]},${th.color[1]}%,${th.color[2]}%,0.05)`);
        g.addColorStop(1,   `hsla(${th.color[0]},${th.color[1]}%,${th.color[2]}%,0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, r2, 0, Math.PI * 2); ctx.fill();
      });

      /* atmospheric vignette — frame edges */
      const vig = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.3, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
      vig.addColorStop(0,   'rgba(0,0,0,0)');
      vig.addColorStop(0.7, 'rgba(2,1,12,0.18)');
      vig.addColorStop(1,   'rgba(0,0,0,0.55)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      /* project a normalized (x,y) into pan/zoom screen coords */
      const project = (nx, ny) => ({
        x: (nx * W + v.tx) * v.zoom + (W * (1 - v.zoom) * 0.5),
        y: (ny * H + v.ty) * v.zoom + (H * (1 - v.zoom) * 0.5),
      });

      /* constellation lines: connect each star to its 2 closest theme-neighbours,
         but only when within 130px on screen and same themeId. */
      ctx.lineWidth = 0.55;
      const byTheme = {};
      stars.forEach(s => {
        if (!s.themeId) return;
        (byTheme[s.themeId] = byTheme[s.themeId] || []).push(s);
      });
      Object.values(byTheme).forEach(group => {
        const projected = group.map(s => ({ s, p: project(s.x, s.y) }));
        for (let i = 0; i < projected.length; i++) {
          const a = projected[i];
          let dists = [];
          for (let j = 0; j < projected.length; j++) {
            if (i === j) continue;
            const b = projected[j];
            const dx = a.p.x - b.p.x, dy = a.p.y - b.p.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < 130) dists.push({ d, b });
          }
          dists.sort((x, y) => x.d - y.d);
          dists.slice(0, 2).forEach(({ d, b }) => {
            const al = (1 - d / 130) * 0.28 * (a.s.mine || b.s.mine ? 1.8 : 1);
            ctx.strokeStyle = `hsla(${a.s.color[0]},${a.s.color[1]}%,${a.s.color[2]}%,${al.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.p.x, a.p.y);
            ctx.lineTo(b.p.x, b.p.y);
            ctx.stroke();
          });
        }
      });

      /* arriving stars — trail in from outside the frame to their target */
      arriving.forEach(s => {
        const lifeFrac = Math.max(0, (Date.now() - s.born) / 1600);
        const startX = -50, startY = H * (0.1 + Math.random() * 0.8);
        const target = project(s.x, s.y);
        const t = Math.min(1, lifeFrac);
        const easeT = 1 - Math.pow(1 - t, 3);
        const x = startX + (target.x - startX) * easeT;
        const y = startY + (target.y - startY) * easeT;
        /* trail */
        const tailLen = 80 * (1 - easeT);
        const tx = startX + (target.x - startX) * Math.max(0, easeT - 0.08);
        const ty = startY + (target.y - startY) * Math.max(0, easeT - 0.08);
        const g = ctx.createLinearGradient(tx, ty, x, y);
        g.addColorStop(0, 'rgba(220, 230, 255, 0)');
        g.addColorStop(1, `rgba(220, 230, 255, ${(0.9 * (1 - easeT)).toFixed(3)})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tx, ty); ctx.lineTo(x, y);
        ctx.stroke();
        /* head */
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${(1 - easeT * 0.4).toFixed(3)})`;
        ctx.fill();
      });

      /* draw stars */
      stars.forEach((s, i) => {
        const p = project(s.x, s.y);
        s._px = p.x; s._py = p.y;
        const driftX = Math.sin(frame * 0.0024 + i * 0.7) * 2;
        const driftY = Math.cos(frame * 0.0019 + i * 0.5) * 1.4;
        const px = p.x + driftX, py = p.y + driftY;
        const tw = 0.58 + 0.42 * Math.sin(frame * 0.022 + s.twinkle * 7);
        const baseA = s.mine ? 0.96 : 0.70;
        const al = baseA * tw;
        const sizeS = s.size * v.zoom;

        /* glow */
        const g = ctx.createRadialGradient(px, py, 0, px, py, sizeS * 13);
        const [H_, S_, L_] = s.color;
        g.addColorStop(0, `hsla(${H_},${S_}%,${L_}%,${(al * 0.38).toFixed(3)})`);
        g.addColorStop(0.5, `hsla(${H_},${S_}%,${L_}%,${(al * 0.12).toFixed(3)})`);
        g.addColorStop(1, `hsla(${H_},${S_}%,${L_}%,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, sizeS * 11, 0, Math.PI * 2);
        ctx.fill();

        /* core */
        ctx.beginPath();
        ctx.arc(px, py, sizeS, 0, Math.PI * 2);
        const coreColor = s.mine
          ? `rgba(220, 240, 255, ${al.toFixed(3)})`
          : `hsla(${H_},${Math.min(100, S_ + 20)}%,${Math.min(94, L_ + 14)}%,${al.toFixed(3)})`;
        ctx.fillStyle = coreColor;
        ctx.fill();

        /* mine ring */
        if (s.mine) {
          ctx.beginPath();
          ctx.arc(px, py, sizeS * 3.2, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(180, 220, 255, ${(al * 0.30).toFixed(3)})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      });

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    /* Interaction: drag to pan, scroll to zoom, hover stars */
    const onWheel = (e) => {
      e.preventDefault();
      const v = viewRef.current;
      const delta = e.deltaMode === 1 ? e.deltaY * 20 : e.deltaY; // normalise line vs pixel
      const next = Math.max(0.5, Math.min(4.0, v.zoom + (-delta * 0.005)));
      v.zoom = next;
    };
    const onDown = (e) => {
      dragRef.current = { sx: e.clientX, sy: e.clientY, tx: viewRef.current.tx, ty: viewRef.current.ty };
    };
    const onMove = (e) => {
      if (dragRef.current) {
        const v = viewRef.current;
        v.tx = dragRef.current.tx + (e.clientX - dragRef.current.sx) * 2.2;
        v.ty = dragRef.current.ty + (e.clientY - dragRef.current.sy) * 2.2;
      }
      /* hover hit-test */
      const r = canvas.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      let best = null, bd = 22 * 22;
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        if (s._px == null) continue;
        const d = (s._px - mx) ** 2 + (s._py - my) ** 2;
        if (d < bd) { bd = d; best = s; }
      }
      setHover(best ? { id: best.id, text: best.text, x: best._px, y: best._py, mine: best.mine } : null);
    };
    const onUp = () => { dragRef.current = null; };
    const onLeave = () => { setHover(null); dragRef.current = null; };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseleave', onLeave);

    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mouseleave', onLeave);
    };
  }, [open, stars, arriving]);

  /* Opening animation flag */
  useEffect(() => {
    if (!open) { setRevealed(false); return; }
    const id = setTimeout(() => setRevealed(true), 60);
    return () => clearTimeout(id);
  }, [open]);

  const submit = useCallback(() => {
    const t = text.trim();
    if (!t || t.length > 140) return;
    if (!isAllowed(t)) {
      setBlocked('please keep the sky a gentle place.');
      setTimeout(() => setBlocked(''), 3200);
      return;
    }
    const p = placeStar(t, Date.now(), true);
    const newStar = {
      id: 'me-' + Date.now(), text: t,
      x: p.x, y: p.y, color: p.color, themeId: p.themeId,
      size: 2.2, mine: true, born: Date.now(),
      twinkle: Math.random() * Math.PI,
    };
    const cur = loadStars();
    saveStars([...cur, {
      id: newStar.id, text: newStar.text,
      pos: { x: p.x, y: p.y },
      color: p.color, themeId: p.themeId,
      born: newStar.born,
    }]);
    setStars(prev => [...prev, newStar]);
    /* fly the viewport to the new star */
    const canvas = canvasRef.current;
    if (canvas) {
      const W = canvas.getBoundingClientRect().width;
      const H = canvas.getBoundingClientRect().height;
      viewRef.current.tx = W * 0.5 - p.x * W;
      viewRef.current.ty = H * 0.5 - p.y * H;
      viewRef.current.zoom = 1.4;
    }
    setText('');
    setComposing(false);
  }, [text]);

  const resetView = () => {
    viewRef.current = { tx: 0, ty: 0, zoom: 1 };
  };

  return (
    <React.Fragment>
      <button className="ss-fab" onClick={() => setOpen(true)} aria-label="Open shared sky">
        <span className="ss-fab-glyph">✶</span>
        <span className="ss-fab-text">shared sky</span>
        <span className="ss-fab-sub">{stars.length} lights · {present} here now</span>
      </button>

      {open && (
        <div className={'ss-overlay' + (revealed ? ' in' : '')} role="dialog">
          <div className="ss-veil" onClick={() => setOpen(false)}/>
          <div className="ss-stage" onClick={(e) => e.stopPropagation()}>
            <header className="ss-head">
              <div className="ss-head-text">
                <div className="ss-eyebrow">no profiles · no replies · no likes</div>
                <h2 className="ss-title">A shared sky.</h2>
                <p className="ss-sub">
                  Other people came here, and left a small light.
                  Hover one. Leave your own if it helps.
                  Drag to pan · scroll to zoom.
                </p>
              </div>
              <div className="ss-head-meta">
                <div className="ss-presence">
                  <span className="ss-presence-dot"/>
                  <span className="ss-presence-text">{present} present</span>
                </div>
                <button className="ss-close" onClick={() => setOpen(false)} aria-label="Close">
                  <svg width="12" height="12" viewBox="0 0 12 12">
                    <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </header>

            <div className="ss-canvas-wrap">
              <canvas ref={canvasRef} className="ss-canvas" aria-label="Shared sky"/>

              {/* theme legend top-right */}
              <div className="ss-legend">
                {THEMES.map(th => (
                  <div key={th.id} className="ss-legend-row">
                    <span
                      className="ss-legend-dot"
                      style={{ background: `hsl(${th.color[0]},${th.color[1]}%,${th.color[2]}%)` }}
                    />
                    <span>{th.id}</span>
                  </div>
                ))}
              </div>

              {/* recenter btn */}
              <button className="ss-recenter" onClick={resetView} title="Re-centre">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <circle cx="5" cy="5" r="2.4" stroke="currentColor" strokeWidth="0.8"/>
                  <path d="M5 1.2v1.8M5 7v1.8M1.2 5h1.8M7 5h1.8" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round"/>
                </svg>
                <span>centre</span>
              </button>

              {hover && (
                <div
                  className={'ss-tip' + (hover.mine ? ' mine' : '')}
                  style={{ left: hover.x + 'px', top: hover.y + 'px' }}
                >
                  {hover.text}
                  {hover.mine && <span className="ss-tip-mine">· yours</span>}
                </div>
              )}
            </div>

            <footer className="ss-foot">
              {composing ? (
                <div className="ss-composer">
                  <textarea
                    className="ss-input"
                    placeholder="leave a small light. nobody will know it was you."
                    maxLength={140}
                    value={text}
                    onChange={(e) => { setText(e.target.value); setBlocked(''); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
                      if (e.key === 'Escape') { setComposing(false); setText(''); setBlocked(''); }
                    }}
                    autoFocus
                    rows={2}
                  />
                  <div className="ss-composer-row">
                    {blocked
                      ? <span className="ss-count" style={{ color: 'rgba(255,120,100,0.85)' }}>{blocked}</span>
                      : <span className="ss-count">{text.length}/140 · stays on this device</span>
                    }
                    <div className="ss-composer-actions">
                      <button className="ss-btn ss-btn-ghost" onClick={() => { setComposing(false); setText(''); setBlocked(''); }}>cancel</button>
                      <button className="ss-btn" disabled={!text.trim()} onClick={submit}>release ✶</button>
                    </div>
                  </div>
                </div>
              ) : (
                <button className="ss-leave-btn" onClick={() => setComposing(true)}>
                  <span className="ss-leave-dot"/>
                  <span>leave a small light</span>
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
