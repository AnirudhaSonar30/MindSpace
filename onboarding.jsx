/* MindSpace — Cinematic Onboarding
   4-card deep-space intro sequence.
   Checks localStorage; skips entirely for returning visitors.
   Waits for body.app-ready before appearing (loader must finish first).
*/
(function () {
  if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') return;

  const { useState, useEffect, useRef, useMemo } = React;

  /* ── Deterministic star-shadow generator (LCG RNG, seeded) ── */
  function makeStarShadows(seed, count, spread) {
    let s = seed >>> 0;
    const r = () => {
      s = Math.imul(s, 1664525) + 1013904223 >>> 0;
      return s / 0xFFFFFFFF;
    };
    const shadows = [];
    for (let i = 0; i < count; i++) {
      const x = Math.floor(r() * spread);
      const y = Math.floor(r() * spread);
      const blur = r() > 0.82 ? `${(r() * 1.8).toFixed(1)}px` : '0px';
      const a = (0.35 + r() * 0.65).toFixed(2);
      shadows.push(`${x}px ${y}px ${blur} rgba(255,255,255,${a})`);
    }
    return shadows.join(',');
  }

  /* Generated once, outside component — stable across renders */
  const STARS_SM = makeStarShadows(42,  700, 3000);
  const STARS_MD = makeStarShadows(137, 220, 3000);
  const STARS_LG = makeStarShadows(999,  90, 3000);

  /* ── Per-card nebula backgrounds ── */
  const NEBULAS = [
    /* Card 1 — violet / indigo */
    `radial-gradient(ellipse 65% 52% at 18% 78%, oklch(0.42 0.12 290 / 0.33) 0%, transparent 65%),
     radial-gradient(ellipse 48% 38% at 82% 18%, oklch(0.38 0.10 250 / 0.22) 0%, transparent 60%),
     radial-gradient(ellipse 30% 24% at 58% 68%, oklch(0.35 0.08 305 / 0.13) 0%, transparent 54%)`,
    /* Card 2 — cyan / teal */
    `radial-gradient(ellipse 58% 46% at 78% 28%, oklch(0.52 0.12 220 / 0.26) 0%, transparent 60%),
     radial-gradient(ellipse 42% 36% at 22% 68%, oklch(0.46 0.10 200 / 0.18) 0%, transparent 55%),
     radial-gradient(ellipse 28% 22% at 48% 82%, oklch(0.42 0.08 190 / 0.10) 0%, transparent 50%)`,
    /* Card 3 — purple / violet */
    `radial-gradient(ellipse 54% 44% at 32% 24%, oklch(0.48 0.13 300 / 0.28) 0%, transparent 60%),
     radial-gradient(ellipse 44% 38% at 72% 72%, oklch(0.40 0.11 270 / 0.20) 0%, transparent 55%),
     radial-gradient(ellipse 32% 24% at 84% 34%, oklch(0.36 0.09 310 / 0.12) 0%, transparent 50%)`,
    /* Card 4 — ember / gold portal */
    `radial-gradient(ellipse 72% 72% at 50% 54%, oklch(0.58 0.10 60 / 0.28) 0%, oklch(0.48 0.08 45 / 0.12) 42%, transparent 70%),
     radial-gradient(ellipse 40% 36% at 50% 50%, oklch(0.64 0.12 58 / 0.18) 0%, transparent 50%)`,
  ];

  /* ── Card data ── */
  const CARDS = [
    {
      eyebrow: 'welcome',
      title:   ['A quiet sky', 'for a loud mind.'],
      body:    'A private space for your nervous system. No feeds. No notifications. Just sky, breath, and you.',
    },
    {
      eyebrow: 'the practices',
      title:   ['Four modes.', 'One breath', 'at a time.'],
      body:    null,
    },
    {
      eyebrow: 'neural memory',
      title:   ['You are not', 'alone in here.'],
      body:    'MindSpace remembers your last scene, your mood, your rhythm. The Companion listens — never judges.',
    },
    {
      eyebrow: 'your space is ready',
      title:   ['Enter.'],
      body:    null,
    },
  ];

  /* ── Sub-components ── */

  function StarField() {
    return (
      <div className="ob-starfield" aria-hidden="true">
        <div className="ob-stars ob-stars-sm" style={{ boxShadow: STARS_SM }} />
        <div className="ob-stars ob-stars-md" style={{ boxShadow: STARS_MD }} />
        <div className="ob-stars ob-stars-lg" style={{ boxShadow: STARS_LG }} />
        <div className="ob-shoot" />
      </div>
    );
  }

  function ModeCards() {
    const modes = [
      { glyph: '◯', name: 'breathe', desc: 'box · 4-7-8 · custom' },
      { glyph: '⬡', name: 'ground',  desc: '5 senses, one by one' },
      { glyph: '∿', name: 'rest',    desc: 'a poem waiting for you' },
      { glyph: '·', name: 'companion', desc: 'listens, never judges' },
    ];
    return (
      <div className="ob-modes">
        {modes.map((m, i) => (
          <div key={m.name} className="ob-mode-card" style={{ '--i': i }}>
            <span className="ob-mode-glyph">{m.glyph}</span>
            <span className="ob-mode-name">{m.name}</span>
            <span className="ob-mode-desc">{m.desc}</span>
          </div>
        ))}
      </div>
    );
  }

  function Constellation() {
    const nodes = [
      { x: 50, y: 14 },
      { x: 20, y: 40 },
      { x: 80, y: 40 },
      { x: 32, y: 68 },
      { x: 68, y: 68 },
      { x: 50, y: 88 },
    ];
    const edges = [[0,1],[0,2],[1,3],[2,4],[3,5],[4,5],[1,4],[2,3]];
    return (
      <svg className="ob-constellation" viewBox="0 0 100 100" aria-hidden="true">
        {edges.map(([a, b], i) => (
          <line
            key={i}
            className="ob-const-line"
            style={{ '--li': i }}
            x1={nodes[a].x} y1={nodes[a].y}
            x2={nodes[b].x} y2={nodes[b].y}
          />
        ))}
        {nodes.map((n, i) => (
          <circle
            key={i}
            className="ob-const-dot"
            style={{ '--di': i }}
            cx={n.x} cy={n.y} r="2.4"
          />
        ))}
      </svg>
    );
  }

  function Portal() {
    return (
      <div className="ob-portal" aria-hidden="true">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="ob-portal-ring" style={{ '--ri': i }} />
        ))}
        <div className="ob-portal-core" />
      </div>
    );
  }

  /* ── Main onboarding component ── */
  function Onboarding({ onComplete }) {
    /* visibleStep: what content is SHOWN (delayed vs real step for exit anim) */
    const [visibleStep, setVisibleStep] = useState(0);
    const [phase, setPhase] = useState('enter'); /* enter | idle | exit */
    const [leaving, setLeaving] = useState(false);

    /* First card enter → idle */
    useEffect(() => {
      const t = setTimeout(() => setPhase('idle'), 1100);
      return () => clearTimeout(t);
    }, []);

    const advance = () => {
      if (phase !== 'idle') return;

      if (visibleStep === 3) {
        /* Final card — complete */
        localStorage.setItem('ms_onboarded', '1');
        setLeaving(true);
        setTimeout(onComplete, 850);
        return;
      }

      /* Exit current → enter next */
      setPhase('exit');
      setTimeout(() => {
        setVisibleStep(s => s + 1);
        setPhase('enter');
        setTimeout(() => setPhase('idle'), 1100);
      }, 640);
    };

    const skip = () => {
      if (leaving) return;
      localStorage.setItem('ms_onboarded', '1');
      setLeaving(true);
      setTimeout(onComplete, 820);
    };

    const card = CARDS[visibleStep];

    return (
      <div className={`ob-overlay${leaving ? ' ob-overlay-leaving' : ''}`}>
        <StarField />

        {/* Nebula — transitions between cards */}
        <div
          className="ob-nebula"
          style={{ background: NEBULAS[visibleStep] }}
        />

        {/* Card content — keyed so it remounts on step change after exit */}
        <div
          className={`ob-card-wrap ob-card-${phase}`}
          key={visibleStep}
        >
          {/* Per-card ambient visuals */}
          {visibleStep === 1 && (
            <div className="ob-breathe-orb" aria-hidden="true">
              <div className="ob-breathe-ring" />
              <div className="ob-breathe-ring ob-br2" />
              <div className="ob-breathe-ring ob-br3" />
              <div className="ob-breathe-core" />
            </div>
          )}
          {visibleStep === 2 && (
            <div className="ob-const-wrap">
              <Constellation />
            </div>
          )}
          {visibleStep === 3 && <Portal />}

          {/* Text content */}
          <div className="ob-eyebrow">{card.eyebrow}</div>

          <h2 className="ob-title">
            {card.title.map((line, i) => (
              <span key={i} className="ob-title-line" style={{ '--tl': i }}>
                {line}
              </span>
            ))}
          </h2>

          {card.body && <p className="ob-body">{card.body}</p>}
          {visibleStep === 1 && <ModeCards />}

          {/* CTA */}
          {visibleStep < 3 ? (
            <button className="ob-next" onClick={advance} aria-label="Next card">
              <span className="ob-next-line" />
              <span className="ob-next-label">continue</span>
              <span className="ob-next-glyph">→</span>
            </button>
          ) : (
            <button className="ob-enter" onClick={advance} aria-label="Enter MindSpace">
              <span className="ob-enter-text">Enter</span>
              <span className="ob-enter-glow" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Progress dots */}
        <div className="ob-dots" role="tablist" aria-label="Onboarding progress">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`ob-dot${i === visibleStep ? ' ob-dot-active' : ''}`}
              role="tab"
              aria-selected={i === visibleStep}
            />
          ))}
        </div>

        {/* Skip */}
        {visibleStep < 3 && (
          <button className="ob-skip" onClick={skip}>skip</button>
        )}
      </div>
    );
  }

  /* ── Mount ── */
  const el = document.getElementById('onboarding');
  if (!el) return;

  /* Already onboarded — remove mount point and exit */
  if (localStorage.getItem('ms_onboarded')) {
    el.remove();
    return;
  }

  function mount() {
    ReactDOM.createRoot(el).render(
      <Onboarding
        onComplete={() => {
          el.style.transition = 'opacity 0s';
          el.remove();
        }}
      />
    );
  }

  /* Wait for body.app-ready (loader finished) before appearing */
  if (document.body.classList.contains('app-ready')) {
    mount();
  } else {
    const obs = new MutationObserver(() => {
      if (document.body.classList.contains('app-ready')) {
        obs.disconnect();
        mount();
      }
    });
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    /* Fallback: mount after 2.8s regardless */
    setTimeout(() => { obs.disconnect(); mount(); }, 2800);
  }
})();
