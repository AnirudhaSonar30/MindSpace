/* MindSpace — Ambient Soundscape v4
   Scene-reactive: switching environments auto-loads the right sounds.
   Channels: Rain · Wind · Chimes · Drone · Fire · Ocean
   Thunder: triggered by atmosphere.jsx lightning flashes.
   All pure Web Audio — no external files.
*/

const { useState, useEffect, useRef, useCallback } = React;

const PREF_KEY = 'mindspace.sound.v4';
const loadP = () => { try { return JSON.parse(localStorage.getItem(PREF_KEY)) || {}; } catch { return {}; } };
const saveP = (p) => { try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch {} };

/* ═══════════════════════════════════════════════════════════════
   Noise buffers
═══════════════════════════════════════════════════════════════ */
function makeWhite(ctx, secs = 6) {
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

/* Rain — layered downpour */
function buildRain(ctx) {
  const gain = ctx.createGain(); gain.gain.value = 0;
  const srcA = ctx.createBufferSource(); srcA.buffer = makeWhite(ctx, 10); srcA.loop = true;
  const hpA = ctx.createBiquadFilter(); hpA.type = 'highpass'; hpA.frequency.value = 600; hpA.Q.value = 0.5;
  const pkA = ctx.createBiquadFilter(); pkA.type = 'peaking';  pkA.frequency.value = 1100; pkA.Q.value = 3.0; pkA.gain.value = 7;
  const lpA = ctx.createBiquadFilter(); lpA.type = 'lowpass';  lpA.frequency.value = 6000; lpA.Q.value = 0.4;
  const gA  = ctx.createGain(); gA.gain.value = 0.65;
  const srcB = ctx.createBufferSource(); srcB.buffer = makeBrown(ctx, 8); srcB.loop = true;
  const lpB = ctx.createBiquadFilter(); lpB.type = 'lowpass'; lpB.frequency.value = 280; lpB.Q.value = 0.4;
  const gB  = ctx.createGain(); gB.gain.value = 0.30;
  const srcC = ctx.createBufferSource(); srcC.buffer = makeWhite(ctx, 6); srcC.loop = true;
  const bpC = ctx.createBiquadFilter(); bpC.type = 'bandpass'; bpC.frequency.value = 1200; bpC.Q.value = 1.8;
  const gC  = ctx.createGain(); gC.gain.value = 0.20;
  const lfoD = ctx.createOscillator(); lfoD.type = 'sine'; lfoD.frequency.value = 11;
  const lfoGD = ctx.createGain(); lfoGD.gain.value = 0.12;
  lfoD.connect(lfoGD); lfoGD.connect(gC.gain);
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

/* Drizzle — light pink-noise rain */
function buildRainSoft(ctx) {
  const gain = ctx.createGain(); gain.gain.value = 0;
  const src  = ctx.createBufferSource(); src.buffer = makePink(ctx, 10); src.loop = true;
  const hp   = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1100; hp.Q.value = 0.4;
  const pk   = ctx.createBiquadFilter(); pk.type = 'peaking';  pk.frequency.value = 2200; pk.Q.value = 2.5; pk.gain.value = 5;
  const lp   = ctx.createBiquadFilter(); lp.type = 'lowpass';  lp.frequency.value = 8000; lp.Q.value = 0.3;
  const gA   = ctx.createGain(); gA.gain.value = 0.52;
  const srcB = ctx.createBufferSource(); srcB.buffer = makeBrown(ctx, 6); srcB.loop = true;
  const lpB  = ctx.createBiquadFilter(); lpB.type = 'lowpass'; lpB.frequency.value = 200; lpB.Q.value = 0.5;
  const gB   = ctx.createGain(); gB.gain.value = 0.12;
  const lfo  = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.14;
  const lfoG = ctx.createGain(); lfoG.gain.value = 0.10;
  lfo.connect(lfoG); lfoG.connect(gA.gain);
  src.connect(hp); hp.connect(pk); pk.connect(lp); lp.connect(gA); gA.connect(gain);
  srcB.connect(lpB); lpB.connect(gB); gB.connect(gain);
  [src, srcB].forEach(s => s.start());
  lfo.start();
  gain.connect(ctx.destination);
  return { gain, type: 'rainSoft' };
}

/* Storm — heavy rain + low rumble */
function buildRainStorm(ctx) {
  const gain = ctx.createGain(); gain.gain.value = 0;
  const srcA  = ctx.createBufferSource(); srcA.buffer = makeWhite(ctx, 10); srcA.loop = true;
  const hpA   = ctx.createBiquadFilter(); hpA.type = 'highpass'; hpA.frequency.value = 400; hpA.Q.value = 0.5;
  const pkA   = ctx.createBiquadFilter(); pkA.type = 'peaking';  pkA.frequency.value = 800; pkA.Q.value = 2.5; pkA.gain.value = 8;
  const lpA   = ctx.createBiquadFilter(); lpA.type = 'lowpass';  lpA.frequency.value = 7000; lpA.Q.value = 0.4;
  const gA    = ctx.createGain(); gA.gain.value = 0.68;
  const srcB  = ctx.createBufferSource(); srcB.buffer = makeBrown(ctx, 8); srcB.loop = true;
  const hpB   = ctx.createBiquadFilter(); hpB.type = 'highpass'; hpB.frequency.value = 30; hpB.Q.value = 0.5;
  const lpB   = ctx.createBiquadFilter(); lpB.type = 'lowpass';  lpB.frequency.value = 180; lpB.Q.value = 0.6;
  const gB    = ctx.createGain(); gB.gain.value = 0.38;
  const lfoA  = ctx.createOscillator(); lfoA.type = 'sine'; lfoA.frequency.value = 0.18;
  const lfoGA = ctx.createGain(); lfoGA.gain.value = 0.22;
  lfoA.connect(lfoGA); lfoGA.connect(gA.gain);
  const lfoB  = ctx.createOscillator(); lfoB.type = 'sine'; lfoB.frequency.value = 0.08;
  const lfoGB = ctx.createGain(); lfoGB.gain.value = 0.16;
  lfoB.connect(lfoGB); lfoGB.connect(gB.gain);
  srcA.connect(hpA); hpA.connect(pkA); pkA.connect(lpA); lpA.connect(gA); gA.connect(gain);
  srcB.connect(hpB); hpB.connect(lpB); lpB.connect(gB); gB.connect(gain);
  [srcA, srcB].forEach(s => s.start());
  [lfoA, lfoB].forEach(l => l.start());
  gain.connect(ctx.destination);
  return { gain, type: 'rainStorm' };
}

/* Wind — breath-synced pink noise */
function buildWind(ctx) {
  const gain = ctx.createGain(); gain.gain.value = 0;
  const src = ctx.createBufferSource(); src.buffer = makePink(ctx, 10); src.loop = true;
  const hp  = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 90;  hp.Q.value = 0.25;
  const lp  = ctx.createBiquadFilter(); lp.type = 'lowpass';  lp.frequency.value = 720; lp.Q.value = 0.40;
  src.connect(hp); hp.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
  src.start();
  return { gain, filter: lp, type: 'wind' };
}

/* Chimes — random pentatonic bells */
function buildChimes(ctx) {
  const gain = ctx.createGain(); gain.gain.value = 0;
  gain.connect(ctx.destination);
  const NOTES = [523.25, 587.33, 659.25, 783.99, 1046.50, 1174.66, 1318.51];
  let nextAt = ctx.currentTime + 1.5 + Math.random() * 3;
  let stopped = false;
  const schedule = () => {
    if (stopped) return;
    if (ctx.currentTime >= nextAt - 0.05) {
      const v = gain.gain.value;
      if (v > 0.01) {
        const freq = NOTES[Math.floor(Math.random() * NOTES.length)];
        const when = Math.max(ctx.currentTime + 0.015, nextAt);
        const makePartial = (f, amp, decay) => {
          const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, when);
          g.gain.linearRampToValueAtTime(v * amp, when + 0.004);
          g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
          o.connect(g); g.connect(gain);
          o.start(when); o.stop(when + decay + 0.1);
        };
        makePartial(freq, 0.45, 3.8 + Math.random() * 1.5);
        makePartial(freq * 2.756, 0.20, 2.0 + Math.random() * 0.8);
        makePartial(freq * 0.5, 0.15, 4.5 + Math.random() * 2.0);
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

/* Drone — warm detuned pad with reverb tail */
function buildDrone(ctx) {
  const gain = ctx.createGain(); gain.gain.value = 0;
  const lp   = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 0.7;
  const lfo  = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.13;
  const lfoG = ctx.createGain(); lfoG.gain.value = 6;
  lfo.connect(lfoG);
  const BASE = [55, 110, 130.81, 146.83, 164.81, 196.00, 220, 261.63, 293.66, 329.63, 392.00];
  BASE.forEach((f, i) => {
    const type = i < 2 ? 'triangle' : 'sine';
    const detune = (Math.random() - 0.5) * 14;
    const amp    = i < 2 ? 0.28 : (i < 5 ? 0.14 : 0.08);
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.value = f; o.detune.value = detune;
    const g = ctx.createGain(); g.gain.value = amp;
    lfoG.connect(o.detune);
    o.connect(g); g.connect(lp);
    o.start();
  });
  // Simple reverb simulation with two delay taps
  const d1 = ctx.createDelay(2.0); d1.delayTime.value = 0.72;
  const d2 = ctx.createDelay(2.0); d2.delayTime.value = 1.18;
  const fb1 = ctx.createGain(); fb1.gain.value = 0.28;
  const fb2 = ctx.createGain(); fb2.gain.value = 0.18;
  const wet = ctx.createGain(); wet.gain.value = 0.32;
  lp.connect(d1); d1.connect(fb1); fb1.connect(d1);
  lp.connect(d2); d2.connect(fb2); fb2.connect(d2);
  d1.connect(wet); d2.connect(wet);
  lp.connect(gain); wet.connect(gain);
  gain.connect(ctx.destination);
  lfo.start();
  return { gain, type: 'drone' };
}

/* Fire — warm crackling */
function buildFire(ctx) {
  const gain = ctx.createGain(); gain.gain.value = 0;
  // Base fire body
  const src = ctx.createBufferSource(); src.buffer = makeBrown(ctx, 8); src.loop = true;
  const hp  = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 140; hp.Q.value = 0.5;
  const lp  = ctx.createBiquadFilter(); lp.type = 'lowpass';  lp.frequency.value = 2000; lp.Q.value = 0.4;
  const gBase = ctx.createGain(); gBase.gain.value = 0.50;
  // Crackle layer
  const srcC = ctx.createBufferSource(); srcC.buffer = makeWhite(ctx, 6); srcC.loop = true;
  const bpC  = ctx.createBiquadFilter(); bpC.type = 'bandpass'; bpC.frequency.value = 2400; bpC.Q.value = 2.5;
  const gC   = ctx.createGain(); gC.gain.value = 0.16;
  // Crackle LFO (random pops)
  const lfoC = ctx.createOscillator(); lfoC.type = 'sine'; lfoC.frequency.value = 19;
  const lfoGC = ctx.createGain(); lfoGC.gain.value = 0.14;
  lfoC.connect(lfoGC); lfoGC.connect(gC.gain);
  // Slow flame breathe
  const lfoF = ctx.createOscillator(); lfoF.type = 'sine'; lfoF.frequency.value = 0.30;
  const lfoGF = ctx.createGain(); lfoGF.gain.value = 0.18;
  lfoF.connect(lfoGF); lfoGF.connect(gBase.gain);
  src.connect(hp); hp.connect(lp); lp.connect(gBase); gBase.connect(gain);
  srcC.connect(bpC); bpC.connect(gC); gC.connect(gain);
  [src, srcC].forEach(s => s.start());
  lfoC.start(); lfoF.start();
  gain.connect(ctx.destination);
  return { gain, type: 'fire' };
}

/* Ocean — slow wave surge */
function buildOcean(ctx) {
  const gain = ctx.createGain(); gain.gain.value = 0;
  // Deep wave body
  const src = ctx.createBufferSource(); src.buffer = makeBrown(ctx, 10); src.loop = true;
  const hp  = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 70; hp.Q.value = 0.4;
  const lp  = ctx.createBiquadFilter(); lp.type = 'lowpass';  lp.frequency.value = 950; lp.Q.value = 0.5;
  const gBase = ctx.createGain(); gBase.gain.value = 0.52;
  // Wave surge LFOs — two slightly offset for natural feel
  const lfo1 = ctx.createOscillator(); lfo1.type = 'sine'; lfo1.frequency.value = 0.065;
  const lfoG1 = ctx.createGain(); lfoG1.gain.value = 0.26;
  lfo1.connect(lfoG1); lfoG1.connect(gBase.gain);
  const lfo2 = ctx.createOscillator(); lfo2.type = 'sine'; lfo2.frequency.value = 0.11;
  const lfoG2 = ctx.createGain(); lfoG2.gain.value = 0.10;
  lfo2.connect(lfoG2); lfoG2.connect(gBase.gain);
  // Surf foam hiss
  const srcS = ctx.createBufferSource(); srcS.buffer = makePink(ctx, 8); srcS.loop = true;
  const hpS  = ctx.createBiquadFilter(); hpS.type = 'highpass'; hpS.frequency.value = 3200; hpS.Q.value = 0.3;
  const gS   = ctx.createGain(); gS.gain.value = 0.10;
  const lfo3 = ctx.createOscillator(); lfo3.type = 'sine'; lfo3.frequency.value = 0.075;
  const lfoG3 = ctx.createGain(); lfoG3.gain.value = 0.08;
  lfo3.connect(lfoG3); lfoG3.connect(gS.gain);
  src.connect(hp); hp.connect(lp); lp.connect(gBase); gBase.connect(gain);
  srcS.connect(hpS); hpS.connect(gS); gS.connect(gain);
  [src, srcS].forEach(s => s.start());
  [lfo1, lfo2, lfo3].forEach(l => l.start());
  gain.connect(ctx.destination);
  return { gain, type: 'ocean' };
}

/* Alpha binaural — 10 Hz beat (200 Hz left, 210 Hz right)
   Promotes relaxed, open awareness. Use headphones for full effect. */
function buildAlpha(ctx) {
  const gain = ctx.createGain(); gain.gain.value = 0;
  const oL = ctx.createOscillator(); oL.type = 'sine'; oL.frequency.value = 200;
  const oR = ctx.createOscillator(); oR.type = 'sine'; oR.frequency.value = 210;
  const panL = ctx.createStereoPanner(); panL.pan.value = -1;
  const panR = ctx.createStereoPanner(); panR.pan.value =  1;
  const gL = ctx.createGain(); gL.gain.value = 0.32;
  const gR = ctx.createGain(); gR.gain.value = 0.32;
  oL.connect(gL); gL.connect(panL); panL.connect(gain);
  oR.connect(gR); gR.connect(panR); panR.connect(gain);
  oL.start(); oR.start();
  gain.connect(ctx.destination);
  return { gain, type: 'alpha' };
}

/* Theta binaural — 4 Hz beat (180 Hz left, 184 Hz right)
   Deep rest, insight, drowsy meditation. Use headphones. */
function buildTheta(ctx) {
  const gain = ctx.createGain(); gain.gain.value = 0;
  const oL = ctx.createOscillator(); oL.type = 'sine'; oL.frequency.value = 180;
  const oR = ctx.createOscillator(); oR.type = 'sine'; oR.frequency.value = 184;
  const panL = ctx.createStereoPanner(); panL.pan.value = -1;
  const panR = ctx.createStereoPanner(); panR.pan.value =  1;
  const gL = ctx.createGain(); gL.gain.value = 0.28;
  const gR = ctx.createGain(); gR.gain.value = 0.28;
  oL.connect(gL); gL.connect(panL); panL.connect(gain);
  oR.connect(gR); gR.connect(panR); panR.connect(gain);
  oL.start(); oR.start();
  gain.connect(ctx.destination);
  return { gain, type: 'theta' };
}

/* Thunder — one-shot crack + low rumble */
function playThunderOnce(ctx) {
  if (!ctx || ctx.state === 'suspended') return;
  const g = ctx.createGain();
  const now = ctx.currentTime;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.24, now + 0.022);
  g.gain.setTargetAtTime(0.001, now + 0.08, 0.55);

  const rumble = ctx.createBufferSource(); rumble.buffer = makeBrown(ctx, 3);
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 28;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';  lp.frequency.value = 380;

  const crack = ctx.createBufferSource(); crack.buffer = makeWhite(ctx, 0.2);
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 240; bp.Q.value = 0.7;
  const gCrack = ctx.createGain(); gCrack.gain.value = 1.1;

  rumble.connect(hp); hp.connect(lp); lp.connect(g);
  crack.connect(bp); bp.connect(gCrack); gCrack.connect(g);
  g.connect(ctx.destination);

  rumble.start(now); rumble.stop(now + 3.5);
  crack.start(now);  crack.stop(now + 0.25);
}

/* Forest — crickets · jungle hum · distant birds */
function buildForest(ctx) {
  const gain = ctx.createGain(); gain.gain.value = 0;

  /* ── Cricket layer: AM-modulated bandpass white noise ── */
  const srcC = ctx.createBufferSource(); srcC.buffer = makeWhite(ctx, 8); srcC.loop = true;
  const hp1  = ctx.createBiquadFilter(); hp1.type = 'highpass';  hp1.frequency.value = 3400; hp1.Q.value = 0.6;
  const bp1  = ctx.createBiquadFilter(); bp1.type = 'bandpass';  bp1.frequency.value = 5200; bp1.Q.value = 1.8;
  const hp2  = ctx.createBiquadFilter(); hp2.type = 'highpass';  hp2.frequency.value = 4200; hp2.Q.value = 0.5;
  const gC   = ctx.createGain(); gC.gain.value = 0.58;
  /* AM chirp modulator — 14 Hz ≈ natural cricket rhythm */
  const amOsc = ctx.createOscillator(); amOsc.type = 'sine'; amOsc.frequency.value = 14;
  const amG   = ctx.createGain(); amG.gain.value = 0.38;
  amOsc.connect(amG); amG.connect(gC.gain); /* oscillates 0.20–0.96 */
  srcC.connect(hp1); hp1.connect(bp1); bp1.connect(hp2); hp2.connect(gC); gC.connect(gain);

  /* ── Second cricket colony at slightly different pitch/rate ── */
  const srcC2 = ctx.createBufferSource(); srcC2.buffer = makeWhite(ctx, 10); srcC2.loop = true;
  const bp2   = ctx.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 6100; bp2.Q.value = 2.2;
  const gC2   = ctx.createGain(); gC2.gain.value = 0.32;
  const amOsc2 = ctx.createOscillator(); amOsc2.type = 'sine'; amOsc2.frequency.value = 17.5;
  const amG2   = ctx.createGain(); amG2.gain.value = 0.28;
  amOsc2.connect(amG2); amG2.connect(gC2.gain);
  srcC2.connect(bp2); bp2.connect(gC2); gC2.connect(gain);

  /* ── Jungle ambience: deep brown rumble + slow swell ── */
  const srcJ  = ctx.createBufferSource(); srcJ.buffer = makeBrown(ctx, 12); srcJ.loop = true;
  const lpJ   = ctx.createBiquadFilter(); lpJ.type = 'lowpass'; lpJ.frequency.value = 140; lpJ.Q.value = 0.5;
  const gJ    = ctx.createGain(); gJ.gain.value = 0.14;
  const swellOsc = ctx.createOscillator(); swellOsc.type = 'sine'; swellOsc.frequency.value = 0.07;
  const swellG   = ctx.createGain(); swellG.gain.value = 0.06;
  swellOsc.connect(swellG); swellG.connect(gJ.gain);
  srcJ.connect(lpJ); lpJ.connect(gJ); gJ.connect(gain);

  /* ── Distant bird — slow tremolo oscillator ── */
  const birdOsc  = ctx.createOscillator(); birdOsc.type = 'sine'; birdOsc.frequency.value = 1340;
  const birdLFO  = ctx.createOscillator(); birdLFO.type = 'sine'; birdLFO.frequency.value = 0.09;
  const birdLFOG = ctx.createGain(); birdLFOG.gain.value = 180; /* ±180 Hz drift */
  birdLFO.connect(birdLFOG); birdLFOG.connect(birdOsc.frequency);
  const birdTrem = ctx.createOscillator(); birdTrem.type = 'sine'; birdTrem.frequency.value = 0.22;
  const birdTremG = ctx.createGain(); birdTremG.gain.value = 0.03;
  const birdG     = ctx.createGain(); birdG.gain.value = 0.03;
  birdTrem.connect(birdTremG); birdTremG.connect(birdG.gain);
  const birdHP = ctx.createBiquadFilter(); birdHP.type = 'bandpass'; birdHP.frequency.value = 1400; birdHP.Q.value = 8;
  birdOsc.connect(birdHP); birdHP.connect(birdG); birdG.connect(gain);

  [srcC, srcC2, srcJ].forEach(s => s.start());
  [amOsc, amOsc2, swellOsc, birdOsc, birdLFO, birdTrem].forEach(o => o.start());
  gain.connect(ctx.destination);
  return { gain, type: 'forest' };
}

/* ═══════════════════════════════════════════════════════════════
   Scene → sound defaults
═══════════════════════════════════════════════════════════════ */
const SCENE_SOUNDS = {
  'midnight-rain':  { rainSoft: false, rain: true,  rainStorm: false, wind: false, chime: false, drone: false, fire: false, ocean: false, alpha: false, theta: false, forest: false },
  'soft-morning':   { rainSoft: true,  rain: false, rainStorm: false, wind: true,  chime: true,  drone: false, fire: false, ocean: false, alpha: true,  theta: false, forest: false },
  'forest-temple':  { rainSoft: false, rain: false, rainStorm: false, wind: false, chime: false, drone: false, fire: false, ocean: false, alpha: false, theta: false, forest: true  },
  'ocean-dream':    { rainSoft: false, rain: false, rainStorm: false, wind: false, chime: false, drone: true,  fire: false, ocean: true,  alpha: true,  theta: false, forest: false },
  'fireplace-cabin':{ rainSoft: false, rain: false, rainStorm: false, wind: false, chime: false, drone: false, fire: true,  ocean: false, alpha: false, theta: false, forest: false },
  'deep-space':     { rainSoft: false, rain: false, rainStorm: false, wind: false, chime: false, drone: true,  fire: false, ocean: false, alpha: false, theta: true,  forest: false },
  'night-train':    { rainSoft: false, rain: false, rainStorm: true,  wind: true,  chime: false, drone: true,  fire: false, ocean: false, alpha: false, theta: false, forest: false },
};

/* ═══════════════════════════════════════════════════════════════
   Channel config
═══════════════════════════════════════════════════════════════ */
const CHANNELS = [
  { id: 'rainSoft',  label: 'Drizzle',  sub: 'light rain',        defOn: false, defVol: 0.55 },
  { id: 'rain',      label: 'Rain',     sub: 'steady downpour',   defOn: true,  defVol: 0.62 },
  { id: 'rainStorm', label: 'Storm',    sub: 'heavy rain',        defOn: false, defVol: 0.58 },
  { id: 'wind',      label: 'Wind',     sub: 'breath-synced',     defOn: false, defVol: 0.48 },
  { id: 'chime',     label: 'Chimes',   sub: 'pentatonic bells',  defOn: false, defVol: 0.38 },
  { id: 'drone',     label: 'Drone',    sub: 'ambient pad',       defOn: false, defVol: 0.36 },
  { id: 'fire',      label: 'Fire',     sub: 'warm crackle',      defOn: false, defVol: 0.55 },
  { id: 'ocean',     label: 'Ocean',    sub: 'wave surge',        defOn: false, defVol: 0.58 },
  { id: 'alpha',     label: 'Alpha',    sub: '10 Hz · relaxed',   defOn: false, defVol: 0.42 },
  { id: 'theta',     label: 'Theta',    sub: '4 Hz · deep rest',  defOn: false, defVol: 0.38 },
  { id: 'forest',    label: 'Forest',   sub: 'crickets · birds',  defOn: false, defVol: 0.52 },
];

/* ═══════════════════════════════════════════════════════════════
   SoundToggle component
═══════════════════════════════════════════════════════════════ */
function SoundToggle() {
  const prefs = loadP();
  const [masterOn,  setMasterOn]  = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [chOn,  setChOn]  = useState(() =>
    Object.fromEntries(CHANNELS.map(c => [c.id, prefs[c.id]?.on  ?? c.defOn])));
  const [chVol, setChVol] = useState(() =>
    Object.fromEntries(CHANNELS.map(c => [c.id, prefs[c.id]?.vol ?? c.defVol])));

  const ctxRef = useRef(null);
  const chRef  = useRef({});
  const rafRef = useRef(null);

  /* Persist prefs */
  useEffect(() => {
    const p = {};
    CHANNELS.forEach(c => { p[c.id] = { on: chOn[c.id], vol: chVol[c.id] }; });
    saveP(p);
  }, [chOn, chVol]);

  useEffect(() => { if (!masterOn) setPanelOpen(false); }, [masterOn]);

  const ensureCtx = useCallback(() => {
    if (ctxRef.current) return ctxRef.current;
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    ctxRef.current = ctx;
    chRef.current.rainSoft  = buildRainSoft(ctx);
    chRef.current.rain      = buildRain(ctx);
    chRef.current.rainStorm = buildRainStorm(ctx);
    chRef.current.wind      = buildWind(ctx);
    chRef.current.chime     = buildChimes(ctx);
    chRef.current.drone     = buildDrone(ctx);
    chRef.current.fire      = buildFire(ctx);
    chRef.current.ocean     = buildOcean(ctx);
    chRef.current.alpha     = buildAlpha(ctx);
    chRef.current.theta     = buildTheta(ctx);
    chRef.current.forest    = buildForest(ctx);
    return ctx;
  }, []);

  /* Gain management + breath-sync wind */
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

  /* Scene-reactive: auto-switch sounds when scene changes */
  useEffect(() => {
    const eng = window.MindSpaceSceneEngine;
    if (!eng || !masterOn) return;
    const off = eng.onChange((scene) => {
      const defaults = SCENE_SOUNDS[scene.id];
      if (defaults) setChOn({ ...defaults });
    });
    // Apply current scene immediately
    const cur = eng.getScene();
    if (cur && SCENE_SOUNDS[cur.id]) setChOn({ ...SCENE_SOUNDS[cur.id] });
    return off;
  }, [masterOn]);

  /* Expose thunder so atmosphere.jsx can trigger it */
  useEffect(() => {
    window.MindSpacePlayThunder = () => {
      if (!masterOn) return;
      const ctx = ctxRef.current;
      if (ctx) playThunderOnce(ctx);
    };
    return () => { window.MindSpacePlayThunder = null; };
  }, [masterOn]);

  const toggleCh = (id) => setChOn(v => ({ ...v, [id]: !v[id] }));
  const setVol   = (id, val) => setChVol(v => ({ ...v, [id]: parseFloat(val) }));
  const activeChs = CHANNELS.filter(c => chOn[c.id] && masterOn);

  return (
    <div className={'snd-widget' + (masterOn ? ' snd-on' : '') + (panelOpen ? ' snd-panel-open' : '')}>
      {masterOn && panelOpen && (
        <div className="snd-panel">
          <div className="snd-panel-head">ambience</div>
          {CHANNELS.map(c => (
            <div key={c.id} className={'snd-ch' + (chOn[c.id] ? ' active' : '')}>
              <button className="snd-ch-btn" onClick={() => toggleCh(c.id)} aria-pressed={chOn[c.id]}>
                <span className="snd-ch-dot"/>
                <span className="snd-ch-name">{c.label}</span>
                <span className="snd-ch-sub">{c.sub}</span>
              </button>
              <div className="snd-ch-vol-wrap">
                <input type="range" className="snd-vol-slider"
                  min="0" max="1" step="0.01" value={chVol[c.id]}
                  onChange={e => setVol(c.id, e.target.value)}
                  aria-label={c.label + ' volume'}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="snd-bar">
        <button className="snd-master-btn"
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
              ? (activeChs.length ? activeChs.map(c => c.label).join(' · ') : 'silence')
              : 'sound'}
          </span>
          {masterOn && (
            <span className="snd-bars">
              {[0,1,2].map(i => <span key={i} className={'snd-bar b' + i}/>)}
            </span>
          )}
        </button>
        {masterOn && (
          <button className={'snd-expand-btn' + (panelOpen ? ' open' : '')}
            onClick={() => setPanelOpen(v => !v)}
            aria-label="Toggle sound channels"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d={panelOpen ? 'M1 7l4-4 4 4' : 'M1 3l4 4 4-4'}
                stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

window.MindSpaceSound = SoundToggle;
