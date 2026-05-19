/* MindSpace — "Right Now"
   --------------------------------------------------------------
   A persistent floating button that opens a 60-second physiological-sigh
   reset overlay. While the overlay is open it overrides the global
   breath signal so the sky/curl-noise field breathes with the user.
*/

const { useState, useEffect } = React;

const _ease = (t) => -(Math.cos(Math.PI * Math.max(0, Math.min(1, t))) - 1) / 2;

const SIGH_PHASES = [
  { kind: 'in',   label: 'inhale',    dur: 1.5, s0: 0.55, s1: 0.88 },
  { kind: 'in',   label: 'top up',    dur: 0.9, s0: 0.88, s1: 1.00 },
  { kind: 'out',  label: 'long out',  dur: 5.5, s0: 1.00, s1: 0.55 },
  { kind: 'rest', label: 'rest',      dur: 1.5, s0: 0.55, s1: 0.55 },
];
const SIGH_CYCLE = SIGH_PHASES.reduce((a, p) => a + p.dur, 0);

function RightNow() {
  const [state, setState] = useState('idle');   // idle | opening | open | closing
  const [phaseLabel, setPhaseLabel] = useState('inhale');
  const [scale, setScale] = useState(0.55);
  const [remaining, setRemaining] = useState(60);

  const isOverlay = state === 'opening' || state === 'open' || state === 'closing';

  useEffect(() => {
    if (state !== 'open') {
      if (state === 'idle') window.__mindspaceOverride = false;
      return;
    }
    window.__mindspaceOverride = true;
    let raf;
    const start = performance.now();
    const loop = (now) => {
      const elapsed = (now - start) / 1000;
      const rem = 60 - elapsed;
      setRemaining(Math.max(0, rem));
      if (rem <= 0) {
        setState('closing');
        setTimeout(() => setState('idle'), 700);
        return;
      }
      const t = elapsed % SIGH_CYCLE;
      let acc = 0;
      for (let i = 0; i < SIGH_PHASES.length; i++) {
        const p = SIGH_PHASES[i];
        if (t < acc + p.dur) {
          const lt = (t - acc) / p.dur;
          const e = _ease(lt);
          const sc = p.s0 + (p.s1 - p.s0) * e;
          setScale(sc);
          setPhaseLabel(p.label);
          const norm = (sc - 0.55) / 0.45;
          window.__mindspaceBreath = Math.max(0, Math.min(1, norm));
          window.__mindspacePhase =
            p.kind === 'in'  ? 'inhale' :
            p.kind === 'out' ? 'exhale' : 'hold';
          break;
        }
        acc += p.dur;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.__mindspaceOverride = false;
    };
  }, [state]);

  const open = () => {
    setRemaining(60);
    setScale(0.55);
    setPhaseLabel('inhale');
    setState('opening');
    requestAnimationFrame(() => setState('open'));
  };
  const close = () => {
    setState('closing');
    setTimeout(() => setState('idle'), 700);
  };

  return (
    <>
      <button className="rn-fab" onClick={open} aria-label="60-second reset">
        <span className="rn-fab-dot"/>
        <span className="rn-fab-text">Right Now</span>
        <span className="rn-fab-sub">60 s</span>
      </button>

      {isOverlay && (
        <div
          className={'rn-overlay rn-' + state}
          onClick={close}
          role="dialog"
          aria-label="60-second physiological sigh reset"
        >
          <div className="rn-stage" onClick={(e) => e.stopPropagation()}>
            <div className="rn-eyebrow">a sixty-second reset · physiological sigh</div>
            <div className="rn-orb-wrap">
              <div className="rn-orb-glow" style={{ transform: `scale(${(scale * 1.55).toFixed(4)})` }}/>
              <div className="rn-orb" style={{ transform: `scale(${scale.toFixed(4)})` }}/>
              <div className="rn-orb-core"/>
            </div>
            <div className="rn-phase">{phaseLabel}</div>
            <div className="rn-time">{Math.ceil(remaining)} seconds remaining</div>
            <div className="rn-hint">
              two short inhales through the nose,
              then one long exhale through the mouth.<br/>
              tap anywhere to release.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

window.MindSpaceRightNow = RightNow;
