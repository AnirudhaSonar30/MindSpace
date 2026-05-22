/* MindSpace — Ambient Modes
   --------------------------------------------------------------
   One small affordance that opens four states:
     · present  — the normal app
     · nothing  — no UI, no tasks. just atmosphere + breath
     · focus    — minimal chrome, brown noise, soft dim
     · sleep    — screen slowly fades, audio deepens, world slows

   Each mode applies a body class that other components read.
   Sleep ramps over ~3 minutes. Any motion exits sleep.
*/

const { useState, useEffect, useRef, useCallback } = React;

const MODES = [
  {
    id: 'present',
    glyph: '◉',
    label: 'present',
    blurb: 'the room as it is.',
  },
  {
    id: 'nothing',
    glyph: '◌',
    label: 'do nothing',
    blurb: 'no tasks. no goals. just the room. tap to come back.',
  },
  {
    id: 'focus',
    glyph: '◧',
    label: 'focus',
    blurb: 'brown noise, dimmed chrome, one task in front of you.',
  },
  {
    id: 'sleep',
    glyph: '☾',
    label: 'sleep',
    blurb: 'the screen dims, sound deepens, motion slows toward zero.',
  },
];

const STORE_KEY = 'mindspace.mode.v1';

function loadMode() {
  try {
    const v = localStorage.getItem(STORE_KEY);
    if (v && MODES.find(m => m.id === v)) return v;
  } catch {}
  return 'present';
}
function saveMode(id) {
  try { localStorage.setItem(STORE_KEY, id); } catch {}
}

function AmbientModes() {
  const [mode, setMode]   = useState(loadMode);
  const [open, setOpen]   = useState(false);
  const [sleepP, setSleepP] = useState(0); // 0..1 — sleep ramp progress
  const sleepRaf = useRef(null);
  const sleepStart = useRef(0);
  const activityRef = useRef(0);

  /* Apply body classes */
  useEffect(() => {
    MODES.forEach(m => document.body.classList.remove('amb-' + m.id));
    document.body.classList.add('amb-' + mode);
    saveMode(mode);
  }, [mode]);

  /* Close picker when entering an immersive mode */
  useEffect(() => {
    if (mode !== 'present') setOpen(false);
  }, [mode]);

  /* Sleep ramp — over ~3 minutes, screen dims & motion slows */
  useEffect(() => {
    if (mode !== 'sleep') {
      cancelAnimationFrame(sleepRaf.current);
      setSleepP(0);
      document.documentElement.style.setProperty('--sleep-p', '0');
      return;
    }
    sleepStart.current = performance.now();
    activityRef.current = performance.now();
    const RAMP = 180 * 1000;
    const loop = (t) => {
      const sinceActivity = t - activityRef.current;
      // any activity in the last 1.2s sets the floor back a bit
      const p = Math.min(1, sinceActivity / RAMP);
      setSleepP(p);
      document.documentElement.style.setProperty('--sleep-p', p.toFixed(3));
      sleepRaf.current = requestAnimationFrame(loop);
    };
    sleepRaf.current = requestAnimationFrame(loop);
    const bump = () => { activityRef.current = performance.now(); };
    ['mousemove', 'keydown', 'touchstart', 'wheel'].forEach(ev =>
      window.addEventListener(ev, bump, { passive: true })
    );
    return () => {
      cancelAnimationFrame(sleepRaf.current);
      ['mousemove', 'keydown', 'touchstart', 'wheel'].forEach(ev =>
        window.removeEventListener(ev, bump)
      );
    };
  }, [mode]);

  /* In Do Nothing mode, the world keeps drawing but the only UI is
     a faint hint that tap-anywhere returns. Capture taps with a
     transparent layer so the click doesn't accidentally hit other UI. */
  const exitImmersive = useCallback(() => setMode('present'), []);

  /* Esc anywhere → present */
  useEffect(() => {
    if (mode === 'present') return;
    const onKey = (e) => { if (e.key === 'Escape') setMode('present'); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  /* The trigger button — always visible (very small + low contrast) */
  const cur = MODES.find(m => m.id === mode) || MODES[0];

  return (
    <React.Fragment>
      {/* Trigger */}
      <div className={'amb-trigger-wrap' + (open ? ' open' : '')}>
        {open && (
          <div className="amb-picker" onClick={(e) => e.stopPropagation()}>
            <div className="amb-picker-eyebrow">a softer state</div>
            {MODES.map(m => (
              <button
                key={m.id}
                className={'amb-opt' + (m.id === mode ? ' on' : '')}
                onClick={() => { setMode(m.id); }}
              >
                <span className="amb-opt-glyph">{m.glyph}</span>
                <div className="amb-opt-body">
                  <span className="amb-opt-name">{m.label}</span>
                  <span className="amb-opt-blurb">{m.blurb}</span>
                </div>
              </button>
            ))}
          </div>
        )}
        <button
          className="amb-trigger"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-label="Change state"
          title="State"
        >
          <span className="amb-trigger-glyph">{cur.glyph}</span>
          <span className="amb-trigger-label">{cur.label}</span>
        </button>
      </div>

      {/* Do-Nothing capture layer — sits over chrome, lets sky through */}
      {mode === 'nothing' && (
        <div
          className="amb-nothing-veil"
          role="button"
          aria-label="Exit do-nothing mode"
          onClick={exitImmersive}
        >
          <div className="amb-nothing-hint">tap anywhere to come back</div>
        </div>
      )}

      {/* Sleep ramp — black wash that strengthens over time */}
      {mode === 'sleep' && (
        <div
          className="amb-sleep-veil"
          style={{ opacity: 0.10 + sleepP * 0.78 }}
          onClick={exitImmersive}
        >
          <div className="amb-sleep-hint" style={{ opacity: 1 - sleepP * 0.85 }}>
            {sleepP < 0.05 ? 'sleep mode · the screen will soften'
              : sleepP < 0.55 ? 'rest. nothing here needs you.'
              : sleepP < 0.94 ? 'sleep, if it wants to come.'
              : ''}
          </div>
        </div>
      )}

      {/* Focus banner — top-left, small, only when in focus */}
      {mode === 'focus' && (
        <div className="amb-focus-band">
          <span className="amb-focus-dot"/>
          <span>focus · brown noise · one thing</span>
          <button className="amb-focus-leave" onClick={exitImmersive}>leave</button>
        </div>
      )}
    </React.Fragment>
  );
}

window.MindSpaceAmbientModes = AmbientModes;
