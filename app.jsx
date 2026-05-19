/* MindSpace — content overlay
   Minimal chrome: the 3D brain is the star. */

const { useEffect, useRef, useState } = React;

/* Reads the global breath value posted by scene.js
   Throttled to ~12Hz with hysteresis so consumers don't re-render every frame. */
function useBreath() {
  const [b, setB] = useState({ v: 0, phase: 'inhale' });
  useEffect(() => {
    let raf;
    let lastV = -1;
    let lastPhase = '';
    let lastUpdate = 0;
    const tick = (now) => {
      const v = window.__mindspaceBreath || 0;
      const phase = window.__mindspacePhase || 'inhale';
      if ((now - lastUpdate > 80) &&
          (Math.abs(v - lastV) > 0.012 || phase !== lastPhase)) {
        setB({ v, phase });
        lastV = v;
        lastPhase = phase;
        lastUpdate = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return b;
}

/* Smoothed scroll progress, 0..1 */
function useScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const max = Math.max(1, document.body.scrollHeight - window.innerHeight);
      setP(Math.min(1, window.scrollY / max));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  return p;
}

/* ---------- Nav (top) ---------- */
function Nav() {
  return (
    <nav className="nav">
      <div className="brand">
        <svg className="brand-mark" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="8.2" stroke="currentColor" strokeWidth="0.8" opacity="0.45"/>
          <circle cx="10" cy="10" r="2.0" fill="currentColor"/>
          <path d="M4.8 10 C6.2 7.2 7.4 12.8 10 10 C12.6 7.2 13.8 12.8 15.2 10"
                stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" fill="none" opacity="0.40"/>
        </svg>
        <span>MindSpace</span>
      </div>
      <div className="nav-meta">
        <span className="meta-text">breathing · rest · space</span>
        <a className="pill" href="#breathe" data-magnetic>Start here →</a>
      </div>
    </nav>
  );
}

/* ---------- Side index ---------- */
function Rail({ active }) {
  const items = [
    { id: 'arrival',   label: 'I · Arrival' },
    { id: 'anatomy',   label: 'II · Anatomy' },
    { id: 'breathe',   label: 'III · Breathe' },
    { id: 'practices', label: 'IV · Journeys' },
    { id: 'ground',    label: 'V · Ground' },
    { id: 'drift',     label: 'VI · Drift' },
    { id: 'sky',       label: 'VII · Your Sky' },
    { id: 'begin',     label: 'VIII · Begin' },
  ];
  return (
    <aside className="rail">
      {items.map((it) => (
        <a key={it.id} href={`#${it.id}`} className={active === it.id ? 'active' : ''}>
          <span className="tick"></span>
          <span>{it.label}</span>
        </a>
      ))}
    </aside>
  );
}

/* ---------- Live counter (bottom-left chrome) ---------- */
function Counter() {
  const breath = useBreath();
  // pretend live "synapses firing" — pseudo-random walk that visibly changes
  const [n, setN] = useState(842913);
  useEffect(() => {
    const id = setInterval(() => {
      setN((v) => v + ((Math.random() * 80) | 0) - 30);
    }, 720);
    return () => clearInterval(id);
  }, []);
  const phase = breath.phase === 'inhale' ? 'inhale  ◐'
              : breath.phase === 'hold'   ? 'hold    ●'
              : 'exhale  ◑';
  // A live "phase angle" — cosmetic HUD detail, tied to breath
  const ang = (breath.v * 360).toFixed(1).padStart(5, '0');
  return (
    <div className="counter">
      <div className="counter-row">
        <span className="lbl">signals / sec</span>
        <span className="val">{n.toLocaleString()}</span>
      </div>
      <div className="counter-row">
        <span className="lbl">breath</span>
        <span className="val">{phase}</span>
      </div>
      <div className="counter-row coord">
        <span className="lbl">phase ∠</span>
        <span className="val">{ang}°</span>
      </div>
      <div className="counter-row">
        <span className="lbl">network</span>
        <span className="val val-ok">stable · listening</span>
      </div>
    </div>
  );
}

/* ---------- Act 1 — Arrival ---------- */
function Arrival() {
  const Rain = window.MindSpaceRain;
  const Wind = window.MindSpaceWind;
  return (
    <section className="act arrival" id="arrival" data-screen-label="01 Arrival">
      {Rain ? <Rain intensity={0.55} /> : null}
      {Wind ? <Wind intensity={0.7} /> : null}
      <div className="arrival-lower">
        <div className="arrival-title">
          <div className="eyebrow reveal d1">A calm space for your busy mind</div>
          <h1>
            <span className="line" data-reveal-text>One quiet</span>
            <span className="line" data-reveal-text><span className="it">hour.</span></span>
          </h1>
          <p className="arrival-sub reveal d3">
            Breathing exercises, ambient worlds, and guided stillness —
            built around how your brain actually works.
          </p>
        </div>
        <div className="arrival-meta reveal d4">
          <div className="scroll-hint">
            <span>Scroll to begin</span>
            <span className="line-mark"></span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Act 2 — Anatomy of a quiet mind ---------- */
const ANATOMY = [
  { tag: '01', name: 'Cortex',       desc: 'The thinking surface. We don\'t silence it — we let it run at half speed.' },
  { tag: '02', name: 'Default Mode', desc: 'The wandering self. The part that drafts tomorrow while you brush your teeth.' },
  { tag: '03', name: 'Vagal Loop',   desc: 'The breath circuit. The shortest line between body and stillness.' },
  { tag: '04', name: 'Night Mind',   desc: 'The slow tide. The brain at rest is the brain rehearsing what mattered.' },
];

function Anatomy() {
  return (
    <section className="act anatomy" id="anatomy" data-screen-label="02 Anatomy">
      <div className="anatomy-grid">
        <div className="anatomy-copy">
          <div className="eyebrow reveal d1">II — anatomy</div>
          <h2 data-reveal-text>
            <span className="it">Four circuits.</span><br/>
            One small room.
          </h2>
          <p className="reveal d3">
            MindSpace is built around the parts of your brain that already
            know how to rest. We don't add anything. We turn down the volume
            on the rest, and let these four come forward.
          </p>
        </div>
        <ol className="anatomy-list">
          {ANATOMY.map((c, i) => (
            <li key={c.tag} className={`anatomy-item reveal d${Math.min(4, i + 1)}`}>
              <span className="tag">— {c.tag}</span>
              <div className="anatomy-text">
                <h4>{c.name}</h4>
                <p>{c.desc}</p>
              </div>
              <span className="dotted"></span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------- Act 3 — Breathing Lab ---------- */
function Breathe() {
  const Lab = window.MindSpaceBreathingLab;
  return (
    <section className="act breathe-sec" id="breathe" data-screen-label="03 Breathe">
      <header className="reset-head">
        <div className="eyebrow reveal d1" style={{ justifyContent: 'center' }}>III — breathe</div>
        <h2 data-reveal-text>
          A small <span className="it">lab</span><br/>
          for the breath.
        </h2>
        <p className="reset-lede reveal d3">
          Four protocols, each one with its own research. The orb keeps your time.
          The sky around you will breathe with you while it runs.
        </p>
      </header>
      <div className="reset-body reveal d4">
        {Lab ? <Lab/> : null}
      </div>
    </section>
  );
}

/* ---------- Act 5 — Ground (5-4-3-2-1) ---------- */
function Ground() {
  const G = window.MindSpaceGrounding;
  return (
    <section className="act ground-sec" id="ground" data-screen-label="05 Ground">
      <header className="reset-head">
        <div className="eyebrow reveal d1" style={{ justifyContent: 'center' }}>V — ground</div>
        <h2 data-reveal-text>
          When the mind sprints,<br/>
          <span className="it">the senses can catch it.</span>
        </h2>
        <p className="reset-lede reveal d3">
          A short ritual borrowed from clinical anxiety practice. Walk down through your
          five senses, one at a time. There is no wrong way to do this.
        </p>
      </header>
      <div className="reset-body reveal d4">
        {G ? <G/> : null}
      </div>
    </section>
  );
}

/* ---------- Act 4 — Journeys (replaces old Practices grid) ---------- */
function Practices() {
  const J = window.MindSpaceJourneys;
  return (
    <section className="act" id="practices" data-screen-label="04 Journeys">
      {J ? <J/> : null}
    </section>
  );
}

/* ---------- Act 7 — Your Sky (constellation) ---------- */
function Sky() {
  const C = window.MindSpaceConstellation;
  return (
    <section className="act" id="sky" data-screen-label="07 Your Sky">
      {C ? <C/> : null}
    </section>
  );
}

/* ---------- Act 5 — Drift quote ---------- */
function Drift() {
  const Rain = window.MindSpaceRain;
  const Wind = window.MindSpaceWind;
  return (
    <section className="act" id="drift" data-screen-label="06 Drift">
      {Rain ? <Rain intensity={0.85} /> : null}
      {Wind ? <Wind intensity={1.0} /> : null}
      <div className="drift">
        <div className="eyebrow reveal d1" style={{ justifyContent: 'center' }}>VI — drift</div>
        <blockquote data-reveal-text>
          The mind is not <span style={{ fontStyle: 'normal' }}>elsewhere.</span>
          It is the room you are sitting in,
          with the lights <span style={{ fontStyle: 'normal' }}>turned down</span>
          until the small bright wires inside <span style={{ fontStyle: 'normal' }}>come back</span>.
        </blockquote>
        <div className="attrib reveal d3">— a note left for you</div>
      </div>
    </section>
  );
}

/* ---------- Act 6 — Begin ---------- */
function Begin() {
  const Rain = window.MindSpaceRain;
  return (
    <section className="act" id="begin" data-screen-label="07 Begin">
      {Rain ? <Rain intensity={0.65} /> : null}
      <div className="begin">
        <div className="eyebrow reveal d1" style={{ justifyContent: 'center' }}>VII — begin</div>
        <h2 data-reveal-text>
          Twelve minutes,<br/>
          a <span className="it">whole quiet sky.</span>
        </h2>
        <a href="#arrival" className="cta reveal d3" data-magnetic>
          <span>Enter MindSpace</span>
          <span className="arrow">→</span>
        </a>
        <div className="footnote reveal d4">
          Free · iOS &amp; Android · no streaks, no badges, no noise
        </div>
      </div>
    </section>
  );
}

function Foot() {
  return (
    <footer className="foot">
      <div className="mark">MindSpace</div>
      <div className="cols">
        <a href="#">About</a>
        <a href="#">Library</a>
        <a href="#">Letters</a>
        <a href="#">Contact</a>
      </div>
      <div>© MMXXVI · made slowly</div>
    </footer>
  );
}

/* ---------- Scene Switcher ---------- */
function SceneSwitcher() {
  const eng = window.MindSpaceSceneEngine;
  const SCENES = eng ? eng.SCENES : {};
  const ids = eng ? eng.getIds() : [];

  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState('midnight-rain');

  React.useEffect(() => {
    if (!eng) return;
    return eng.onChange((s) => setActive(s.id));
  }, []);

  const pick = (id) => { if (eng) eng.setScene(id); setActive(id); setOpen(false); };
  const cur = SCENES[active] || { glyph: '✦', label: 'Atmosphere' };

  return (
    <div className="scene-sw">
      {open && (
        <div className="scene-panel">
          <div className="scene-panel-label">atmosphere</div>
          {ids.map(id => {
            const s = SCENES[id];
            return (
              <button key={id} className={'scene-opt' + (active === id ? ' on' : '')} onClick={() => pick(id)}>
                <span className="scene-opt-glyph">{s.glyph}</span>
                <span className="scene-opt-name">{s.label}</span>
              </button>
            );
          })}
        </div>
      )}
      <button className="scene-toggle" onClick={() => setOpen(o => !o)} title="Change atmosphere">
        <span className="scene-toggle-glyph">{cur.glyph}</span>
        <span className="scene-toggle-label">{cur.label}</span>
      </button>
    </div>
  );
}

/* ---------- App shell ---------- */
function App() {
  const [active, setActive] = useState('arrival');
  const sp = useScrollProgress();
  useEffect(() => {
    const ids = ['arrival', 'anatomy', 'breathe', 'practices', 'ground', 'drift', 'sky', 'begin'];
    const onScroll = () => {
      const vh = window.innerHeight || 800;
      let bestId = ids[0];
      let bestDist = Infinity;
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const r = el.getBoundingClientRect();
        const center = r.top + r.height / 2;
        const dist = Math.abs(center - vh / 2);
        if (dist < bestDist) { bestDist = dist; bestId = id; }
      });
      setActive(bestId);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <React.Fragment>
      <Nav />
      <Rail active={active} />
      <Counter />
      <div className="progress-bar" style={{ transform: `scaleX(${sp})` }}></div>
      <main className="stage">
        <Arrival />
        <Anatomy />
        <Breathe />
        <Practices />
        <Ground />
        <Drift />
        <Sky />
        <Begin />
        <Foot />
      </main>
      {window.MindSpaceAtmosphere      ? <window.MindSpaceAtmosphere      /> : null}
      {window.MindSpaceSound           ? <window.MindSpaceSound           /> : null}
      {window.MindSpaceCompanionToggle ? <window.MindSpaceCompanionToggle /> : null}
      {window.MindSpaceMoodCheck       ? <window.MindSpaceMoodCheck       /> : null}
      {window.MindSpaceRightNow        ? <window.MindSpaceRightNow        /> : null}
      <SceneSwitcher />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
