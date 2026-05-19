/* MindSpace — Ambient Soundscape v3
   Channels: Rain (heavy) · Wind · Chimes · Drone
   Panel opens/closes on click — no hover dependency.
   All pure Web Audio, no external files.
*/

const { useState, useEffect, useRef, useCallback } = React;

const PREF_KEY = 'mindspace.sound.v3';
const loadP = () => { try { return JSON.parse(localStorage.getItem(PREF_KEY)) || {}; } catch { return {}; } };
const saveP = (p) => { try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch {} };

/* ═══════════════════════════════════════════════════════════════
   Noise buffers
═══════════════════════════════════════════════════════════════ */
function makeWhite(ctx, secs = 8) {
  const n = ctx.sampleRate * secs | 0;
  const b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  return b;
}

function makePink(ctx, secs = 10) {
  const n = ctx.sampleRate * secs | 0;
  const b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
      b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
      b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
      d[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.10; b6=w*0.115926;
    }
  }
  return b;
}

function makeBrown(ctx, secs = 8) {
  const n = ctx.sampleRate * secs | 0;
  const b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      d[i] = (last + 0.02 * w) / 1.02;
      last = d[i];
      d[i] *= 3.5;
    }
  }
  return b;
}

/* ═══════════════════════════════════════════════════════════════
   Channel builders
═══════════════════════════════════════════════════════════════ */

/* Heavy Rain — layered white noise + resonant plop peak */
function buildRain(ctx) {
  const gain = ctx.createGain(); gain.gain.value = 0;

  /* Layer A: dense rain hiss (HP 600Hz → peak 1.1kHz → LP 6kHz) */
  const srcA = ctx.createBufferSource();
  srcA.buffer = makeWhite(ctx, 10); srcA.loop = true;
  const hpA = ctx.createBiquadFilter(); hpA.type = 'highpass'; hpA.frequency.value = 600; hpA.Q.value = 0.5;
  const pkA = ctx.createBiquadFilter(); pkA.type = 'peaking';  pkA.frequency.value = 1100; pkA.Q.value = 3.0; pkA.gain.value = 7;
  const lpA = ctx.createBiquadFilter(); lpA.type = 'lowpass';  lpA.frequency.value = 6000; lpA.Q.value = 0.4;
  const gA  = ctx.createGain(); gA.gain.value = 0.65;

  /* Layer B: distant rain rumble (LP 300Hz) */
  const srcB = ctx.createBufferSource();
  srcB.buffer = makeBrown(ctx, 8); srcB.loop = true;
  const lpB = ctx.createBiquadFilter(); lpB.type = 'lowpass'; lpB.frequency.value = 280; lpB.Q.value = 0.4;
  const gB  = ctx.createGain(); gB.gain.value = 0.30;

  /* Layer C: sporadic drip texture (band-pass 800-1800Hz, fast LFO) */
  const srcC = ctx.createBufferSource();
  srcC.buffer = makeWhite(ctx, 6); srcC.loop = true;
  const bpC = ctx.createBiquadFilter(); bpC.type = 'bandpass'; bpC.frequency.value = 1200; bpC.Q.value = 1.8;
  const gC  = ctx.createGain(); gC.gain.value = 0.20;
  /* Fast drip LFO */
  const lfoD = ctx.createOscillator(); lfoD.type = 'sine'; lfoD.frequency.value = 11;
  const lfoGD = ctx.createGain(); lfoGD.gain.value = 0.12;
  lfoD.connect(lfoGD); lfoGD.connect(gC.gain);

  /* Slow gust LFO on main layer */
  const lfoG = ctx.createOscillator(); lfoG.type = 'sine'; lfoG.frequency.value = 0.22;
  const lfoGG = ctx.createGain(); lfoGG.gain.value = 0.18;
  lfoG.connect(lfoGG); lfoGG.connect(gA.gain);

  srcA.connect(hpA); hpA.connect(pkA); pkA.connect(lpA); lpA.connect(gA); gA.connect(gain);
  srcB.connect(lpB); lpB.connect(gB); gB.connect(gain);
  srcC.connect(bpC); bpC.connect(gC); gC.connect(gain);

  [srcA, srcB, srcC].forEach(s => s.start());
  lfoD.start(); lfoG.start();
  gain.connect(ctx.destination);
  return { gain, type: 'rain' };
}

/* Gentle Wind — pink noise, breath-synced */
function buildWind(ctx) {
  const gain = ctx.createGain(); gain.gain.value = 0;
  const src = ctx.createBufferSource(); src.buffer = makePink(ctx, 10); src.loop = true;
  const hp  = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 90;  hp.Q.value = 0.25;
  const lp  = ctx.createBiquadFilter(); lp.type = 'lowpass';  lp.frequency.value = 720; lp.Q.value = 0.40;
  src.connect(hp); hp.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
  src.start();
  return { gain, filter: lp, type: 'wind' };
}

/* Wind Chimes — random pentatonic bell notes with inharmonic partials */
function buildChimes(ctx) {
  const gain = ctx.createGain(); gain.gain.value = 0;
  gain.connect(ctx.destination);

  /* C major pentatonic across 2 octaves */
  const NOTES = [523.25, 587.33, 659.25, 783.99, 1046.50, 1174.66, 1318.51];
  let nextAt = ctx.currentTime + 1.5 + Math.random() * 3;
  let stopped = false;

  const schedule = () => {
    if (stopped) return;
    if (ctx.currentTime >= nextAt - 0.05) {
      const v = gain.gain.value;
      if (v > 0.01) {
        const freq  = NOTES[Math.floor(Math.random() * NOTES.length)];
        const when  = Math.max(ctx.currentTime + 0.015, nextAt);

        /* Bell = fundamental + inharmonic partial (×2.756) */
        const makePartial = (f, amp, decay) => {
          const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, when);
          g.gain.linearRampToValueAtTime(v * amp, when + 0.004);
          g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
          o.connect(g); g.connect(gain);
          o.start(when); o.stop(when + decay + 0.1);
        };
        makePartial(freq,        0.45, 3.8 + Math.random() * 1.5);
        makePartial(freq * 2.756, 0.20, 2.0 + Math.random() * 0.8);
        makePartial(freq * 0.5,   0.15, 4.5 + Math.random() * 2.0);

        nextAt = when + 1.8 + Math.random() * 5.5;
      } else {
        nextAt = ctx.currentTime + 1.0;
      }
    }
    setTimeout(schedule, 400);
  };
  schedule();
  return { gain, type: 'chime', stop: () => { stopped = true; } };
}

/* Meditation Drone — warm detuned pad, A minor pentatonic */
function buildDrone(ctx) {
  const gain = ctx.createGain(); gain.gain.value = 0;
  const lp   = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 0.7;

  /* Slow chorus LFO */
  const lfo  = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.13;
  const lfoG = ctx.createGain(); lfoG.gain.value = 6; /* ±6 cents */
  lfo.connect(lfoG);

  /* A2 pentatonic: A C D E G  ×  2 octaves (+ sub) */
  const BASE = [55, 110, 130.81, 146.83, 164.81, 196.00, 220, 261.63, 293.66, 329.63, 392.00];
  BASE.forEach((f, i) => {
    const type = i < 2 ? 'triangle' : 'sine';
    const detune = (Math.random() - 0.5) * 14;
    const amp    = i < 2 ? 0.28 : (i < 5 ? 0.14 : 0.08);
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.value = f;
    o.detune.value    = detune;
    const g = ctx.createGain(); g.gain.value = amp;
    lfoG.connect(o.detune);
    o.connect(g); g.connect(lp);
    o.start();
  });
  lp.connect(gain); gain.connect(ctx.destination);
  lfo.start();
  return { gain, type: 'drone' };
}

/* ═══════════════════════════════════════════════════════════════
   Channel config
═══════════════════════════════════════════════════════════════ */
const CHANNELS = [
  { id: 'rain',  label: 'Heavy Rain', sub: 'layered downpour',  defOn: true,  defVol: 0.62 },
  { id: 'wind',  label: 'Wind',       sub: 'breath-synced',     defOn: false, defVol: 0.50 },
  { id: 'chime', label: 'Chimes',     sub: 'pentatonic bells',  defOn: false, defVol: 0.40 },
  { id: 'drone', label: 'Drone',      sub: 'meditation pad',    defOn: false, defVol: 0.36 },
];

/* ═══════════════════════════════════════════════════════════════
   SoundToggle component
═══════════════════════════════════════════════════════════════ */
function SoundToggle() {
  const prefs = loadP();
  const [masterOn,   setMasterOn]   = useState(false);
  const [panelOpen,  setPanelOpen]  = useState(false);
  const [chOn,  setChOn]  = useState(() => Object.fromEntries(CHANNELS.map(c => [c.id, prefs[c.id]?.on  ?? c.defOn])));
  const [chVol, setChVol] = useState(() => Object.fromEntries(CHANNELS.map(c => [c.id, prefs[c.id]?.vol ?? c.defVol])));

  const ctxRef = useRef(null);
  const chRef  = useRef({});
  const rafRef = useRef(null);

  /* Persist */
  useEffect(() => {
    const p = {};
    CHANNELS.forEach(c => { p[c.id] = { on: chOn[c.id], vol: chVol[c.id] }; });
    saveP(p);
  }, [chOn, chVol]);

  /* Close panel when master turns off */
  useEffect(() => {
    if (!masterOn) setPanelOpen(false);
  }, [masterOn]);

  const ensureCtx = useCallback(() => {
    if (ctxRef.current) return ctxRef.current;
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    ctxRef.current = ctx;
    chRef.current.rain  = buildRain(ctx);
    chRef.current.wind  = buildWind(ctx);
    chRef.current.chime = buildChimes(ctx);
    chRef.current.drone = buildDrone(ctx);
    return ctx;
  }, []);

  /* Gain management */
  useEffect(() => {
    if (!masterOn) {
      cancelAnimationFrame(rafRef.current);
      if (ctxRef.current) {
        const t = ctxRef.current.currentTime;
        Object.values(chRef.current).forEach(ch => {
          ch.gain.gain.cancelScheduledValues(t);
          ch.gain.gain.setTargetAtTime(0, t, 0.55);
        });
      }
      return;
    }
    const ctx = ensureCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const applyGains = () => {
      const t = ctx.currentTime;
      CHANNELS.forEach(({ id }) => {
        const ch = chRef.current[id];
        if (!ch) return;
        const tgt = chOn[id] ? chVol[id] * 0.55 : 0;
        ch.gain.gain.cancelScheduledValues(t);
        ch.gain.gain.setTargetAtTime(tgt, t, 0.65);
      });
    };
    applyGains();

    /* Breath-sync the wind filter */
    const tick = () => {
      const wch = chRef.current.wind;
      if (wch?.filter) {
        wch.filter.frequency.setTargetAtTime(
          480 + (window.__mindspaceBreath || 0) * 720,
          ctx.currentTime, 0.3,
        );
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [masterOn, chOn, chVol, ensureCtx]);

  const toggleCh = (id) => setChOn(v => ({ ...v, [id]: !v[id] }));
  const setVol   = (id, val) => setChVol(v => ({ ...v, [id]: parseFloat(val) }));

  const activeChs = CHANNELS.filter(c => chOn[c.id] && masterOn);

  return (
    <div className={'snd-widget' + (masterOn ? ' snd-on' : '') + (panelOpen ? ' snd-panel-open' : '')}>

      {/* Channel panel — opens upward */}
      {masterOn && panelOpen && (
        <div className="snd-panel">
          <div className="snd-panel-head">ambience layers</div>
          {CHANNELS.map(c => (
            <div key={c.id} className={'snd-ch' + (chOn[c.id] ? ' active' : '')}>
              <button
                className="snd-ch-btn"
                onClick={() => toggleCh(c.id)}
                aria-pressed={chOn[c.id]}
              >
                <span className="snd-ch-dot"/>
                <span className="snd-ch-name">{c.label}</span>
                <span className="snd-ch-sub">{c.sub}</span>
              </button>
              <div className="snd-ch-vol-wrap">
                <input
                  type="range"
                  className="snd-vol-slider"
                  min="0" max="1" step="0.01"
                  value={chVol[c.id]}
                  onChange={e => setVol(c.id, e.target.value)}
                  aria-label={c.label + ' volume'}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main bar */}
      <div className="snd-bar">
        <button
          className="snd-master-btn"
          onClick={() => setMasterOn(v => !v)}
          aria-label={masterOn ? 'Turn off sound' : 'Turn on sound'}
        >
          <span className="snd-icon">
            {masterOn ? (
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M1.5 4.5H3l2.5-2v8L3 8.5H1.5v-4z" fill="currentColor"/>
                <path d="M8.5 4.5c.8.6 1.3 1.4 1.3 2s-.5 1.4-1.3 2" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" fill="none"/>
                <path d="M10.5 2.5c1.4 1.2 2.2 2.6 2.2 4s-.8 2.8-2.2 4" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" fill="none"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M1.5 4.5H3l2.5-2v8L3 8.5H1.5v-4z" fill="currentColor"/>
                <path d="M9 4l3.5 5M12.5 4L9 9" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/>
              </svg>
            )}
          </span>
          <span className="snd-label">
            {masterOn
              ? (activeChs.length ? activeChs.map(c => c.label.split(' ')[0]).join(' · ') : 'sound on')
              : 'sound'}
          </span>
          {masterOn && (
            <span className="snd-bars">
              {[0,1,2].map(i => <span key={i} className={'snd-bar b' + i}/>)}
            </span>
          )}
        </button>

        {masterOn && (
          <button
            className={'snd-expand-btn' + (panelOpen ? ' open' : '')}
            onClick={() => setPanelOpen(v => !v)}
            aria-label="Toggle sound channels"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d={panelOpen ? 'M1 7l4-4 4 4' : 'M1 3l4 4 4-4'}
                stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

window.MindSpaceSound = SoundToggle;
