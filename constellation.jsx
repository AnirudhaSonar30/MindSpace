/* MindSpace — Mood Landscape
   A living constellation map. Every mood check-in becomes a star.
   Stars drift slowly. Their positions encode emotional state.
   Abstract and beautiful — not a chart.
*/

const { useEffect, useRef, useState } = React;

const STORAGE_KEY = 'mindspace.stars';
const MAX_STARS = 60;

// Each mood maps to a region of the sky (normalised 0..1)
const MOOD_REGIONS = {
  drained:   { cx: 0.22, cy: 0.72, spread: 0.14 },
  tense:     { cx: 0.74, cy: 0.28, spread: 0.12 },
  scattered: { cx: 0.50, cy: 0.50, spread: 0.28 },
  tender:    { cx: 0.30, cy: 0.42, spread: 0.13 },
  hopeful:   { cx: 0.60, cy: 0.22, spread: 0.15 },
  calm:      { cx: 0.52, cy: 0.55, spread: 0.10 },
};

// Mood → hue in oklch-ish space (used for canvas color)
const MOOD_HUE = {
  drained:   200,
  tense:     260,
  scattered: 290,
  tender:    340,
  hopeful:   55,
  calm:      210,
};

function loadStars() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveStars(stars) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stars.slice(-MAX_STARS)));
  } catch {}
}

function createStar(moodId) {
  const region = MOOD_REGIONS[moodId] || MOOD_REGIONS.calm;
  const angle  = Math.random() * Math.PI * 2;
  const radius = Math.random() * region.spread;
  return {
    id:    Date.now() + Math.random(),
    mood:  moodId,
    // fractional position within canvas (0..1)
    x:     Math.max(0.04, Math.min(0.96, region.cx + Math.cos(angle) * radius)),
    y:     Math.max(0.04, Math.min(0.96, region.cy + Math.sin(angle) * radius)),
    // drift velocity (very slow, reverses on bounds)
    vx:    (Math.random() - 0.5) * 0.00012,
    vy:    (Math.random() - 0.5) * 0.00012,
    size:  1.2 + Math.random() * 1.6,
    alpha: 0.0,        // animates in
    born:  Date.now(),
    // twinkle phase offset
    twinkle: Math.random() * Math.PI * 2,
  };
}

function MoodConstellation() {
  const canvasRef   = useRef(null);
  const starsRef    = useRef(loadStars());
  const rafRef      = useRef(null);
  const [count, setCount] = useState(starsRef.current.length);
  const [empty, setEmpty]  = useState(starsRef.current.length === 0);

  // Listen for new mood events
  useEffect(() => {
    const onMood = (e) => {
      const moodId = e.detail?.id;
      if (!moodId) return;
      const star = createStar(moodId);
      starsRef.current = [...starsRef.current, star];
      saveStars(starsRef.current);
      setCount(starsRef.current.length);
      setEmpty(false);
    };
    window.addEventListener('mindspace:mood', onMood);
    return () => window.removeEventListener('mindspace:mood', onMood);
  }, []);

  // Canvas draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let frame = 0;

    const resize = () => {
      canvas.width  = canvas.offsetWidth  * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      frame++;
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const stars = starsRef.current;
      const now   = Date.now();

      // Draw constellation lines between stars from the same day
      for (let i = 0; i < stars.length - 1; i++) {
        const a = stars[i], b = stars[i + 1];
        const sameDay = (new Date(a.born).toDateString() === new Date(b.born).toDateString());
        if (!sameDay) continue;
        const opacity = Math.min(a.alpha, b.alpha) * 0.14;
        if (opacity < 0.02) continue;
        ctx.beginPath();
        ctx.moveTo(a.x * w, a.y * h);
        ctx.lineTo(b.x * w, b.y * h);
        ctx.strokeStyle = `rgba(243,239,230,${opacity})`;
        ctx.lineWidth   = 0.5;
        ctx.stroke();
      }

      // Draw and drift each star
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        // Fade in over 2s
        const age = (now - s.born) / 1000;
        s.alpha = Math.min(1, age / 2);

        // Twinkle
        const twinkle = 0.55 + 0.45 * Math.sin(frame * 0.025 + s.twinkle);
        const alpha   = s.alpha * twinkle * 0.9;

        // Star age decay (7 days)
        const dayAge = age / (7 * 86400);
        const decay  = Math.max(0, 1 - dayAge);
        if (decay < 0.01) continue;

        // Drift
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0.02 || s.x > 0.98) s.vx *= -1;
        if (s.y < 0.02 || s.y > 0.98) s.vy *= -1;

        const hue = MOOD_HUE[s.mood] || 220;
        const px  = s.x * w;
        const py  = s.y * h;
        const r   = s.size * window.devicePixelRatio;

        // Glow
        const grd = ctx.createRadialGradient(px, py, 0, px, py, r * 4.5);
        grd.addColorStop(0,   `hsla(${hue},60%,80%,${alpha * decay * 0.35})`);
        grd.addColorStop(1,   `hsla(${hue},60%,80%,0)`);
        ctx.beginPath();
        ctx.arc(px, py, r * 4.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue},55%,88%,${alpha * decay})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="const-wrap">
      <div className="const-head">
        <div className="eyebrow reveal d1" style={{ justifyContent: 'center' }}>VII — your sky</div>
        <h2 data-reveal-text className="reveal d2">
          A map of<br/>
          <span className="it">where you've been.</span>
        </h2>
        <p className="const-lede reveal d3">
          Every mood you record becomes a star. Stars in the same region share the same gravity.
          The sky updates as you do.
        </p>
      </div>

      <div className="const-canvas-wrap reveal d4">
        {empty ? (
          <div className="const-empty">
            <canvas ref={canvasRef} className="const-canvas" aria-label="Mood constellation — empty sky"/>
            <div className="const-empty-msg">
              <div className="const-empty-glyph">✦</div>
              <p>No stars yet. Check in with your mood to begin your sky.</p>
              <button
                className="const-seed-btn"
                onClick={() => window.dispatchEvent(new CustomEvent('mindspace:open-mood'))}
              >
                check in now →
              </button>
            </div>
          </div>
        ) : (
          <canvas ref={canvasRef} className="const-canvas" aria-label={`Mood constellation — ${count} stars`}/>
        )}
        <div className="const-legend">
          {Object.entries(MOOD_REGIONS).map(([mood]) => (
            <div key={mood} className="const-legend-item">
              <span
                className="const-legend-dot"
                style={{ background: `hsl(${MOOD_HUE[mood]},50%,72%)` }}
              />
              <span>{mood}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="const-count reveal d5">
        {count > 0 && (
          <span className="const-count-text">
            {count} {count === 1 ? 'star' : 'stars'} · this week's gravity
          </span>
        )}
      </div>
    </div>
  );
}

window.MindSpaceConstellation = MoodConstellation;
