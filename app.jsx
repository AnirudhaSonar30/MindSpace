/* MindSpace — single-screen app shell v15
   No scrolling. Sky always visible.
   Choose a practice from the bottom nav.
   Breathe → auto-enters immersive focus mode.
*/

const { useEffect, useState, useRef } = React;

/* ── Nav (top) ── */
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
      </div>
    </nav>
  );
}

/* ── Scene Switcher ── */
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

/* ── Sacred geometry mandala — rotating SVG rings, very subtle ── */
function Mandala() {
  const dots12 = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    return <circle key={i} cx={100 + 88 * Math.cos(a)} cy={100 + 88 * Math.sin(a)} r="1.8" fill="currentColor" opacity="0.55" />;
  });
  const spokes = Array.from({ length: 6 }, (_, i) => {
    const a1 = (i / 6) * Math.PI * 2;
    const a2 = a1 + Math.PI;
    return <line key={i} x1={100+88*Math.cos(a1)} y1={100+88*Math.sin(a1)} x2={100+88*Math.cos(a2)} y2={100+88*Math.sin(a2)} stroke="currentColor" strokeWidth="0.4" opacity="0.20" />;
  });
  const vesicaPetals = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return <circle key={i} cx={100+56*Math.cos(a)} cy={100+56*Math.sin(a)} r="24" fill="none" stroke="currentColor" strokeWidth="0.45" opacity="0.18" />;
  });
  const innerPetals = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    return <circle key={i} cx={100+26*Math.cos(a)} cy={100+26*Math.sin(a)} r="13" fill="none" stroke="currentColor" strokeWidth="0.45" opacity="0.28" />;
  });
  return (
    <svg className="hs-mandala" viewBox="0 0 200 200" aria-hidden="true">
      <g className="mandala-outer">{dots12}{spokes}
        <circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.38"/>
      </g>
      <g className="mandala-mid">{vesicaPetals}
        <circle cx="100" cy="100" r="56" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.30"/>
      </g>
      <g className="mandala-inner">{innerPetals}
        <circle cx="100" cy="100" r="26" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.42"/>
      </g>
      <circle cx="100" cy="100" r="2.8" fill="currentColor" opacity="0.55"/>
    </svg>
  );
}

/* ── Home screen — minimal ── */
function HomeScreen() {
  return (
    <div className="hs">
      <Mandala />
      <h1 className="hs-quiet">a quiet sky<br/>for a loud mind.</h1>
      <div className="hs-hint">choose a practice below</div>
    </div>
  );
}

/* ── Rest screen ── */
function RestScreen() {
  return (
    <div className="rest-screen">
      <div className="rest-eyebrow">let the room come back</div>
      <blockquote className="rest-quote">
        The mind is not <em>elsewhere.</em><br/>
        It is the room you are sitting in,<br/>
        with the lights <em>turned down</em><br/>
        until the small bright wires inside <em>come back.</em>
      </blockquote>
      <div className="rest-attr">— a note left for you</div>
      <p className="rest-hint">
        use the <span>Right Now</span> button — bottom right — for a 60-second reset
      </p>
    </div>
  );
}

/* ── Error boundary so a single feature crash doesn't kill the app ── */
class FeatureBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.warn('[MindSpace] feature crashed:', err, info); }
  render() {
    if (this.state.err) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="mode-panel">
          <div style={{
            textAlign: 'center', maxWidth: 460, padding: '0 32px',
            fontFamily: 'var(--serif)', fontStyle: 'italic',
            fontSize: 22, color: 'rgba(243,239,230,0.78)', lineHeight: 1.55,
          }}>
            this practice stumbled. the sky is still here.
            <div style={{
              marginTop: 22, fontFamily: 'var(--mono)', fontSize: 11,
              letterSpacing: '0.26em', textTransform: 'uppercase',
              color: 'rgba(243,239,230,0.45)',
            }}>
              <button
                onClick={() => { this.setState({ err: null }); this.props.onReset && this.props.onReset(); }}
                style={{
                  background: 'rgba(243,239,230,0.05)',
                  border: '1px solid rgba(243,239,230,0.20)',
                  color: 'inherit', padding: '10px 20px', borderRadius: 999,
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit',
                  letterSpacing: 'inherit', textTransform: 'inherit',
                }}
              >back home</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* Silent boundary for FAB-level components so a crash there
   just removes that surface, no banner. */
function silent(Comp) {
  if (!Comp) return null;
  return (
    <FeatureBoundary fallback={null}>
      <Comp />
    </FeatureBoundary>
  );
}

/* ── Mode panel ── */
function ModePanel({ mode, onExit }) {
  const Lab = window.MindSpaceBreathingLab;
  const G   = window.MindSpaceGrounding;
  return (
    <FeatureBoundary onReset={onExit}>
      <div className="mode-panel">
        {mode === 'breathe' && (Lab ? <Lab autoFocus={true} onExit={onExit} /> : <p className="mode-loading">Loading…</p>)}
        {mode === 'ground'  && (G   ? <G  /> : <p className="mode-loading">Loading…</p>)}
        {mode === 'rest'    && <RestScreen />}
      </div>
    </FeatureBoundary>
  );
}

/* ── Bottom mode navigation ── */
function ModeNav({ mode, onMode }) {
  const items = [
    { id: 'home',    label: 'home',    glyph: '⌂' },
    { id: 'breathe', label: 'breathe', glyph: '◯' },
    { id: 'ground',  label: 'ground',  glyph: '⬡' },
    { id: 'rest',    label: 'rest',    glyph: '∿' },
  ];
  return (
    <nav className="mode-nav" aria-label="Practice navigation">
      {items.map(it => (
        <button
          key={it.id}
          className={'mode-btn' + (mode === it.id ? ' active' : '')}
          onClick={() => onMode(it.id)}
        >
          <span className="mode-btn-glyph">{it.glyph}</span>
          <span className="mode-btn-label">{it.label}</span>
        </button>
      ))}
    </nav>
  );
}

/* ── App shell with cinematic mode transitions ── */
function App() {
  const [mode, setMode] = useState('home');
  const [leaving, setLeaving] = useState(false);
  const pendingRef = useRef(null);

  const goMode = (next) => {
    if (next === mode) return;
    if (leaving) {
      pendingRef.current = next;
      return;
    }
    pendingRef.current = next;
    setLeaving(true);
    // Brief veil flash on mode switch
    const veil = document.querySelector('.veil');
    if (veil) { veil.classList.remove('mode-flash'); void veil.offsetWidth; veil.classList.add('mode-flash'); }
    setTimeout(() => {
      const m = pendingRef.current;
      setMode(m);
      setLeaving(false);
      if (window.__mindspaceMode !== undefined) window.__mindspaceMode = m;
    }, 420);
  };

  return (
    <React.Fragment>
      <Nav />
      <main className={'stage' + (leaving ? ' stage-leaving' : '')}>
        {mode === 'home'
          ? <HomeScreen key="home" />
          : <ModePanel key={mode} mode={mode} onExit={() => goMode('home')} />
        }
      </main>
      <ModeNav mode={mode} onMode={goMode} />

      {silent(window.MindSpaceAtmosphere)}
      {silent(window.MindSpaceSound)}
      {silent(window.MindSpaceCompanionToggle)}
      {silent(window.MindSpaceMoodCheck)}
      {silent(window.MindSpaceRightNow)}
      {silent(window.MindSpaceSharedSky)}
      {silent(window.MindSpaceAmbientModes)}
      {silent(window.MindSpaceWelcomeBack)}
      {silent(window.MindSpaceWhisper)}
      <FeatureBoundary fallback={null}><SceneSwitcher /></FeatureBoundary>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <FeatureBoundary fallback={null}><App /></FeatureBoundary>
);
