/* MindSpace — Welcome Back + Scene Whisper
   --------------------------------------------------------------
   Two small adaptive surfaces:
   1. Welcome Back banner — fires once for returning visitors,
      reads the scene they were in, drops away after 8s.
   2. Scene Whisper — every scene change shows a one-line story.
      Rare and quiet. Also fades after a few seconds.
*/

const { useState, useEffect, useRef } = React;

function WelcomeBack() {
  const [info, setInfo] = useState(null);
  const dismissT = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      setInfo(e.detail);
      clearTimeout(dismissT.current);
      dismissT.current = setTimeout(() => setInfo(null), 9000);
    };
    window.addEventListener('mindspace:welcome-back', handler);
    return () => {
      window.removeEventListener('mindspace:welcome-back', handler);
      clearTimeout(dismissT.current);
    };
  }, []);

  if (!info) return null;

  return (
    <div className="wb-card" role="status">
      <div className="wb-card-inner">
        <div className="wb-eyebrow">welcome back</div>
        <div className="wb-line">
          you were in <span className="wb-scene">{info.sceneLabel}</span>
          <span className="wb-when"> {info.when}</span>
        </div>
        <button className="wb-close" onClick={() => setInfo(null)} aria-label="dismiss">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ── Scene Whisper ──
   Listens to scene engine. On change, picks one phrase from the scene's
   whispers/story. Renders a small line at the bottom-centre, above the
   mode nav, that fades after ~7s. Suppressed if a heavy overlay is open. */
function SceneWhisper() {
  const [text, setText] = useState(null);
  const dismissT = useRef(null);
  const firstRef = useRef(true);

  useEffect(() => {
    const eng = window.MindSpaceSceneEngine;
    if (!eng) return;
    /* on initial mount, show the current scene's story once */
    const initial = eng.getScene();
    if (initial) {
      const phrase = initial.story || (initial.whispers && initial.whispers[0]);
      if (phrase) {
        setTimeout(() => {
          if (firstRef.current) {
            setText(phrase);
            clearTimeout(dismissT.current);
            dismissT.current = setTimeout(() => setText(null), 8000);
            firstRef.current = false;
          }
        }, 3600);
      }
    }
    const off = eng.onChange((scene) => {
      firstRef.current = false;
      const pool = [];
      if (scene.story)    pool.push(scene.story);
      if (scene.whispers) pool.push(...scene.whispers);
      if (!pool.length) return;
      const phrase = pool[Math.floor(Math.random() * pool.length)];
      setText(phrase);
      clearTimeout(dismissT.current);
      dismissT.current = setTimeout(() => setText(null), 7400);
    });
    return () => { off && off(); clearTimeout(dismissT.current); };
  }, []);

  if (!text) return null;
  return (
    <div className="whisper" key={text} role="status">
      <span className="whisper-glyph">·</span>
      <span className="whisper-text">{text}</span>
    </div>
  );
}

window.MindSpaceWelcomeBack = WelcomeBack;
window.MindSpaceWhisper     = SceneWhisper;
