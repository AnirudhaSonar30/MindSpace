/* MindSpace — Emotional Check-in + Adaptive Mood Surface
   --------------------------------------------------------------
   First-visit (or re-open) ritual asking "how are you arriving?".
   Selection persists in localStorage, tints the sky via a body
   class, biases the Companion's first message, and surfaces a
   recommended practice.
*/

const { useState, useEffect, useCallback } = React;

const MOODS = [
  { id: 'drained',   word: 'drained',
    blurb: 'pulled thin. the day asked more than you had.',
    sky:   'mood-drained',
    suggest: { id: 'breathe',  label: 'breathe gently \u2192' },
    glyph: 'm-drained' },

  { id: 'tense',     word: 'tense',
    blurb: 'a held breath, a clenched something. the body is tight.',
    sky:   'mood-tense',
    suggest: { id: 'breathe',  label: 'unclench \u2192' },
    glyph: 'm-tense' },

  { id: 'scattered', word: 'scattered',
    blurb: 'thoughts in twelve directions. nothing finishing.',
    sky:   'mood-scattered',
    suggest: { id: 'ground',   label: 'come back to your senses \u2192' },
    glyph: 'm-scattered' },

  { id: 'tender',    word: 'tender',
    blurb: 'soft around the edges. something close to the surface.',
    sky:   'mood-tender',
    suggest: { id: 'practices', label: 'a small practice \u2192' },
    glyph: 'm-tender' },

  { id: 'hopeful',   word: 'hopeful',
    blurb: 'a small green thing. quiet, but there.',
    sky:   'mood-hopeful',
    suggest: { id: 'drift',    label: 'sit with it \u2192' },
    glyph: 'm-hopeful' },

  { id: 'calm',      word: 'calm',
    blurb: 'already here. let\u2019s not interrupt.',
    sky:   'mood-calm',
    suggest: { id: 'breathe',  label: 'lengthen this \u2192' },
    glyph: 'm-calm' },
];

const STORAGE_KEY = 'mindspace.mood';
const SHOWN_KEY   = 'mindspace.mood.firstShown';

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || !v.id) return null;
    // expire after 6h so the question stays meaningful
    if (Date.now() - (v.at || 0) > 6 * 3600 * 1000) return null;
    return v;
  } catch (e) { return null; }
}

function applySkyClass(moodId) {
  // Remove any prior mood class
  MOODS.forEach((m) => document.body.classList.remove(m.sky));
  if (!moodId) return;
  const m = MOODS.find((x) => x.id === moodId);
  if (m) document.body.classList.add(m.sky);
}

function MoodGlyph({ kind }) {
  // Tiny SVG ideograms — one per mood, ~64px
  return (
    <svg className={'moodm ' + kind} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      {kind === 'm-drained' && (
        <>
          <path d="M14 26 Q32 36 50 26" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" fill="none"/>
          <path d="M14 36 Q32 46 50 36" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" opacity="0.6" fill="none"/>
          <line x1="32" y1="46" x2="32" y2="56" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/>
        </>
      )}
      {kind === 'm-tense' && (
        <>
          <rect x="20" y="20" width="24" height="24" stroke="currentColor" strokeWidth="0.9" fill="none"/>
          <rect x="24" y="24" width="16" height="16" stroke="currentColor" strokeWidth="0.9" fill="none" opacity="0.6"/>
          <rect x="28" y="28" width="8"  height="8"  stroke="currentColor" strokeWidth="0.9" fill="none" opacity="0.3"/>
        </>
      )}
      {kind === 'm-scattered' && (
        <>
          {[[18,22],[32,16],[46,24],[20,38],[44,40],[32,50]].map(([x,y], i) => (
            <circle key={i} cx={x} cy={y} r="1.6" fill="currentColor" opacity={0.4 + (i%3)*0.18}/>
          ))}
        </>
      )}
      {kind === 'm-tender' && (
        <>
          <circle cx="32" cy="32" r="14" stroke="currentColor" strokeWidth="0.9" fill="none"/>
          <circle cx="32" cy="32" r="9"  stroke="currentColor" strokeWidth="0.9" fill="none" opacity="0.7"/>
          <circle cx="32" cy="32" r="2"  fill="currentColor"/>
        </>
      )}
      {kind === 'm-hopeful' && (
        <>
          <line x1="32" y1="56" x2="32" y2="38" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/>
          <path d="M32 38 Q26 32 24 26" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" fill="none"/>
          <path d="M32 38 Q38 32 40 26" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" fill="none"/>
          <circle cx="32" cy="14" r="2.4" fill="currentColor"/>
        </>
      )}
      {kind === 'm-calm' && (
        <>
          <path d="M12 32 Q22 26 32 32 T52 32" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" fill="none"/>
          <path d="M12 40 Q22 34 32 40 T52 40" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" fill="none" opacity="0.55"/>
        </>
      )}
    </svg>
  );
}

function MoodCheckIn() {
  const [open, setOpen]       = useState(false);
  const [state, setState]     = useState('idle');   // idle | opening | open | closing
  const [active, setActive]   = useState(null);
  const [mood, setMood]       = useState(null);
  const [hover, setHover]     = useState(null);

  // Initial mount: load saved mood, otherwise show after a beat
  useEffect(() => {
    const stored = loadStored();
    if (stored) {
      setMood(stored);
      applySkyClass(stored.id);
      return;
    }
    if (sessionStorage.getItem(SHOWN_KEY)) return;
    sessionStorage.setItem(SHOWN_KEY, '1');
    // Wait for loader + a beat of stillness before asking
    const id = setTimeout(() => {
      setOpen(true);
      setState('opening');
      requestAnimationFrame(() => setState('open'));
    }, 2600);
    return () => clearTimeout(id);
  }, []);

  // Listen for external "reopen" requests (from the badge)
  useEffect(() => {
    const reopen = () => {
      setActive(null);
      setOpen(true);
      setState('opening');
      requestAnimationFrame(() => setState('open'));
    };
    window.addEventListener('mindspace:open-mood', reopen);
    return () => window.removeEventListener('mindspace:open-mood', reopen);
  }, []);

  const choose = (m) => {
    setActive(m);
    setTimeout(() => {
      const stored = { id: m.id, at: Date.now() };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stored)); } catch (e) {}
      setMood(stored);
      applySkyClass(m.id);
      window.dispatchEvent(new CustomEvent('mindspace:mood', { detail: m }));
      // hold the confirmation moment for a beat
      setTimeout(() => {
        setState('closing');
        setTimeout(() => { setOpen(false); setState('idle'); setActive(null); }, 720);
      }, 1500);
    }, 480);
  };

  const close = () => {
    setState('closing');
    setTimeout(() => { setOpen(false); setState('idle'); setActive(null); }, 720);
  };

  return (
    <>
      {/* Mood badge — visible at top-left when a mood is set,
          replaces the "brand dot" subtly and gives a way back in */}
      {mood && (
        <button
          className={'mood-badge mood-badge-' + mood.id}
          onClick={() => window.dispatchEvent(new CustomEvent('mindspace:open-mood'))}
          aria-label="change how you're arriving"
        >
          <span className="mood-badge-dot"/>
          <span className="mood-badge-text">
            arriving <span className="it">{MOODS.find(x => x.id === mood.id)?.word}</span>
          </span>
        </button>
      )}

      {open && (
        <div className={'mc-overlay mc-' + state} role="dialog" aria-label="How are you arriving">
          <div className="mc-veil" onClick={close}/>
          <div className="mc-panel">
            <div className="mc-eyebrow">a soft entry \u00b7 nothing tracked, nothing shared</div>
            <h2 className="mc-title">
              How are you <span className="it">arriving</span>?
            </h2>

            <div className="mc-grid">
              {MOODS.map((m, i) => (
                <button
                  key={m.id}
                  className={'mc-card ' + (active && active.id === m.id ? 'is-chosen' : '') +
                                          (active && active.id !== m.id ? ' is-dimmed' : '')}
                  style={{ '--i': i }}
                  onClick={() => choose(m)}
                  onMouseEnter={() => setHover(m.id)}
                  onMouseLeave={() => setHover((h) => h === m.id ? null : h)}
                  disabled={!!active}
                >
                  <MoodGlyph kind={m.glyph}/>
                  <div className="mc-word">{m.word}</div>
                  <div className="mc-blurb">{m.blurb}</div>
                </button>
              ))}
            </div>

            {active && (
              <div className="mc-after">
                <div className="mc-after-line">
                  noted. <span className="it">{active.word}.</span>
                </div>
                <a className="mc-suggest" href={'#' + active.suggest.id} onClick={close}>
                  <span>{active.suggest.label}</span>
                </a>
              </div>
            )}

            {!active && (
              <button className="mc-skip" onClick={close}>
                <span>not now</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

window.MindSpaceMoodCheck = MoodCheckIn;
