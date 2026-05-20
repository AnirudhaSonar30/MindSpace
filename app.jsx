/* MindSpace — single-screen app shell
   No scrolling. Sky always visible. Choose a practice from the bottom nav. */

const { useEffect, useState } = React;

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

/* ── Home screen ── */
function HomeScreen({ onMode }) {
  const modes = [
    { id: 'breathe', glyph: '◯', label: 'Breathe',  sub: '4 protocols' },
    { id: 'ground',  glyph: '⬡', label: 'Ground',   sub: '5 · 4 · 3 · 2 · 1' },
    { id: 'rest',    glyph: '∿', label: 'Rest',      sub: '60 s reset' },
  ];
  return (
    <div className="hs">
      <div className="hs-eyebrow">a calm space for your busy mind</div>
      <h1 className="hs-title">
        One quiet<br/><span className="hs-it">hour.</span>
      </h1>
      <p className="hs-sub">
        Breathing exercises, ambient worlds, and guided stillness —
        made for minds that won't slow down on their own.
      </p>
      <div className="hs-cards">
        {modes.map(m => (
          <button key={m.id} className="hs-card" onClick={() => onMode(m.id)}>
            <span className="hs-card-glyph">{m.glyph}</span>
            <span className="hs-card-label">{m.label}</span>
            <span className="hs-card-sub">{m.sub}</span>
          </button>
        ))}
      </div>
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
function ModePanel({ mode }) {
  const Lab = window.MindSpaceBreathingLab;
  const G   = window.MindSpaceGrounding;
  return (
    <div className="mode-panel">
      {mode === 'breathe' && (Lab ? <Lab /> : <p className="mode-loading">Loading…</p>)}
      {mode === 'ground'  && (G   ? <G  /> : <p className="mode-loading">Loading…</p>)}
      {mode === 'rest'    && <RestScreen />}
    </div>
  );
}

/* ── Bottom mode navigation ── */
function ModeNav({ mode, onMode }) {
  const items = [
    { id: 'home',    label: 'home' },
    { id: 'breathe', label: 'breathe' },
    { id: 'ground',  label: 'ground' },
    { id: 'rest',    label: 'rest' },
  ];
  return (
    <nav className="mode-nav" aria-label="Practice navigation">
      {items.map(it => (
        <button
          key={it.id}
          className={'mode-btn' + (mode === it.id ? ' active' : '')}
          onClick={() => onMode(it.id)}
        >
          {it.label}
        </button>
      ))}
    </nav>
  );
}

/* ── App shell ── */
function App() {
  const [mode, setMode] = useState('home');

  return (
    <React.Fragment>
      <Nav />
      <main className="stage">
        {mode === 'home'
          ? <HomeScreen key="home" onMode={setMode} />
          : <ModePanel key={mode} mode={mode} />
        }
      </main>
      <ModeNav mode={mode} onMode={setMode} />

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
