/* MindSpace — AI Companion UI
   --------------------------------------------------------------
   Floating "Companion" affordance + cinematic conversational overlay.
   Streams replies character-by-character. Drives the sky's breath
   while open (soft regulation: forces a slow, gentle cycle).
*/

const { useState, useEffect, useRef, useCallback } = React;

function StreamingText({ text, onDone }) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    let i = 0;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (i <= text.length) {
        setShown(text.slice(0, i));
        i++;
        // Tighter, more readable cadence than a plain interval.
        // Slow down on punctuation for natural pacing.
        const last = text[i - 2] || '';
        const delay =
          last === '.' || last === '?' || last === '!' ? 220 :
          last === ',' || last === '\u2014' || last === ';' ? 110 :
          22;
        setTimeout(tick, delay);
      } else {
        if (onDone) onDone();
      }
    };
    tick();
    return () => { cancelled = true; };
  }, [text]); // eslint-disable-line
  return <span className="cm-stream">{shown}<span className="cm-caret"/></span>;
}

function CompanionToggle() {
  const [open, setOpen] = useState(false);
  const [animState, setAnimState] = useState('idle'); // idle | opening | open | closing
  const [brain]    = useState(() => new window.MindSpaceCompanion.CompanionBrain());
  const [history, setHistory] = useState([]);
  const [composing, setComposing] = useState('');
  const [thinking, setThinking] = useState(false);
  const [chipsVisible, setChipsVisible] = useState(true);
  const scrollerRef = useRef(null);
  const inputRef    = useRef(null);

  /* Drive the global breath signal while the overlay is open so the
     sky behind it falls into a slow, regulated cycle (4 in / 6 out). */
  useEffect(() => {
    if (animState !== 'open') {
      if (animState === 'idle') window.__mindspaceOverride = false;
      return;
    }
    window.__mindspaceOverride = true;
    let raf;
    const start = performance.now();
    const loop = (now) => {
      const t = (now - start) / 1000;
      const cycle = 10;
      const u = (t % cycle) / cycle;
      // 4s in, 6s out (smooth sinusoidal)
      let v, phase;
      if (u < 0.4) {
        const x = u / 0.4;
        v = 0.5 - 0.5 * Math.cos(Math.PI * x);
        phase = 'inhale';
      } else {
        const x = (u - 0.4) / 0.6;
        v = 0.5 + 0.5 * Math.cos(Math.PI * x);
        phase = 'exhale';
      }
      window.__mindspaceBreath = v;
      window.__mindspacePhase  = phase;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.__mindspaceOverride = false;
    };
  }, [animState]);

  const open_ = () => {
    setAnimState('opening');
    setOpen(true);
    requestAnimationFrame(() => setAnimState('open'));
    setTimeout(() => inputRef.current && inputRef.current.focus(), 800);
  };
  const close_ = () => {
    setAnimState('closing');
    setTimeout(() => { setOpen(false); setAnimState('idle'); }, 720);
  };

  const send = useCallback(async (raw) => {
    const text = (raw || '').trim();
    if (!text || thinking) return;
    setChipsVisible(false);
    setHistory((h) => [...h, { role: 'user', text }]);
    setComposing('');
    setThinking(true);
    try {
      const reply = await brain.reply(text);
      setHistory((h) => [...h, { role: 'companion', text: reply, streaming: true }]);
    } finally {
      setThinking(false);
    }
  }, [brain, thinking]);

  // Auto-scroll on new message
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [history.length, thinking]);

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(composing);
    }
    if (e.key === 'Escape') close_();
  };

  // Esc to close from anywhere when open
  useEffect(() => {
    if (animState !== 'open') return;
    const onEsc = (e) => { if (e.key === 'Escape') close_(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [animState]);

  const greeting = "I\u2019m here. Take your time. \u2014 You can tap one of these, or just say what\u2019s with you.";

  return (
    <>
      <button
        className="cm-fab"
        onClick={open_}
        aria-label="Open Calm Companion"
        data-magnetic
      >
        <span className="cm-fab-glyph">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.4" stroke="currentColor" strokeWidth="0.9" opacity="0.55"/>
            <circle cx="7" cy="7" r="2.2" fill="currentColor"/>
          </svg>
        </span>
        <span className="cm-fab-text">Companion</span>
        <span className="cm-fab-sub">a calm voice</span>
      </button>

      {open && (
        <div className={'cm-overlay cm-' + animState} role="dialog" aria-label="Calm Companion">
          <div className="cm-veil" onClick={close_}/>
          <div className="cm-panel" onClick={(e) => e.stopPropagation()}>
            <header className="cm-head">
              <div className="cm-head-left">
                <span className="cm-orb"/>
                <div className="cm-head-text">
                  <div className="cm-head-name">Companion</div>
                  <div className="cm-head-status">{thinking ? 'listening\u2026' : 'here with you'}</div>
                </div>
              </div>
              <button className="cm-close" onClick={close_} aria-label="Close">
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                </svg>
              </button>
            </header>

            <div className="cm-scroller" ref={scrollerRef}>
              <div className="cm-msg cm-msg-companion cm-msg-greeting">
                <div className="cm-bubble">
                  {greeting}
                </div>
              </div>

              {chipsVisible && (
                <div className="cm-chips">
                  {window.MindSpaceCompanion.EMOTION_CHIPS.map((c, i) => (
                    <button
                      key={c.id}
                      className="cm-chip"
                      style={{ animationDelay: (0.10 + i * 0.05) + 's' }}
                      onClick={() => send(c.seed)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}

              {history.map((m, i) => (
                <div key={i} className={'cm-msg cm-msg-' + m.role}>
                  <div className="cm-bubble">
                    {m.role === 'companion' && m.streaming
                      ? <StreamingText
                          text={m.text}
                          onDone={() => setHistory((h) =>
                            h.map((x, j) => j === i ? { ...x, streaming: false } : x)
                          )}
                        />
                      : m.text}
                  </div>
                </div>
              ))}

              {thinking && (
                <div className="cm-msg cm-msg-companion">
                  <div className="cm-bubble cm-thinking">
                    <span className="cm-dot"/><span className="cm-dot"/><span className="cm-dot"/>
                  </div>
                </div>
              )}
            </div>

            <footer className="cm-input-wrap">
              <textarea
                ref={inputRef}
                className="cm-input"
                placeholder="what\u2019s with you?"
                value={composing}
                onChange={(e) => setComposing(e.target.value)}
                onKeyDown={onKey}
                rows={1}
              />
              <button
                className="cm-send"
                onClick={() => send(composing)}
                disabled={!composing.trim() || thinking}
                aria-label="Send"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7H12M12 7L8 3M12 7L8 11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div className="cm-foot-note">
                <span className="cm-foot-dot"/>
                <span>conversations stay on this device</span>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

window.MindSpaceCompanionToggle = CompanionToggle;
