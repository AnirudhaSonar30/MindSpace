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

/* ── Home screen — tagline only, mode-nav is the navigation entry point ── */
function HomeScreen() {
  return (
    <div className="hs">
      <div className="hs-eyebrow">a calm space for your busy mind</div>
      <h1 className="hs-title">
        One quiet<br/><span className="hs-it">moment.</span>
      </h1>
      <p className="hs-sub">
        Breathing exercises, ambient worlds, and guided stillness —
        made for minds that won't slow down on their own.
      </p>
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

/* ── Mode panel ── */
function ModePanel({ mode, onExit }) {
  const Lab = window.MindSpaceBreathingLab;
  const G   = window.MindSpaceGrounding;
  return (
    <div className="mode-panel">
      {mode === 'breathe' && (Lab ? <Lab autoFocus={true} onExit={onExit} /> : <p className="mode-loading">Loading…</p>)}
      {mode === 'ground'  && (G   ? <G  /> : <p className="mode-loading">Loading…</p>)}
      {mode === 'rest'    && <RestScreen />}
    </div>
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
    setTimeout(() => {
      setMode(pendingRef.current);
      setLeaving(false);
    }, 300);
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
