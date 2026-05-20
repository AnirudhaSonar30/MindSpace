/* MindSpace — Scene Engine
   Seven emotional environments. Each drives the Three.js sky shader.
   Exposes window.MindSpaceSceneEngine.
*/
(function () {
  'use strict';

  /* Sky colors: [floor, horizon, mid, deep, band, starBrightness]
     All RGB values 0-1 matching the GLSL shader uniforms.          */
  const SCENES = {
    'midnight-rain': {
      id: 'midnight-rain', label: 'Midnight Rain', glyph: '⋮',
      sky: {
        floor:   [0.026, 0.030, 0.082],
        horizon: [0.295, 0.215, 0.255],
        mid:     [0.092, 0.098, 0.190],
        deep:    [0.030, 0.038, 0.095],
        band:    [0.200, 0.140, 0.220],
        stars:   0.20,
      },
      tint: [8, 14, 48], tintOpacity: 0.22,
      glow: [55, 95, 210], fog: [12, 25, 72], fogDensity: 0.55,
      particles: 'rain', lightning: true, rays: false,
      caustics: false, flicker: false, cityLights: false,
      motionSpeed: 0.80,
      companion: [
        "The rain feels softer tonight.",
        "Let the sound carry you.",
        "Nothing needs to happen right now.",
        "Stay here a little longer.",
        "The room is quiet.",
        "Breathe out slowly. The rain is doing the same.",
      ],
    },
    'soft-morning': {
      id: 'soft-morning', label: 'Soft Morning', glyph: '◌',
      sky: {
        floor:   [0.045, 0.048, 0.110],
        horizon: [0.260, 0.230, 0.310],
        mid:     [0.085, 0.090, 0.185],
        deep:    [0.028, 0.032, 0.095],
        band:    [0.180, 0.160, 0.260],
        stars:   0.10,
      },
      tint: [48, 56, 90], tintOpacity: 0.12,
      glow: [90, 110, 175], fog: [60, 70, 120], fogDensity: 0.28,
      particles: 'mist', lightning: false, rays: false,
      caustics: false, flicker: false, cityLights: false,
      motionSpeed: 0.40,
      companion: [
        "Morning comes without asking.",
        "Soft light, soft breath.",
        "The world is still waking.",
        "Take your time. All of it.",
        "Something quiet is beginning.",
      ],
    },
    'forest-temple': {
      id: 'forest-temple', label: 'Forest Temple', glyph: '⟡',
      sky: {
        floor:   [0.008, 0.028, 0.010],
        horizon: [0.045, 0.140, 0.055],
        mid:     [0.014, 0.052, 0.018],
        deep:    [0.005, 0.018, 0.007],
        band:    [0.040, 0.180, 0.060],
        stars:   0.08,
      },
      tint: [6, 32, 12], tintOpacity: 0.25,
      glow: [25, 110, 42], fog: [10, 55, 20], fogDensity: 0.42,
      particles: 'pollen', lightning: false, rays: true,
      caustics: false, flicker: false, cityLights: false,
      motionSpeed: 0.32,
      companion: [
        "The trees remember stillness.",
        "Roots run deeper than thought.",
        "You are grounded here.",
        "Let the forest hold you.",
        "Something ancient is breathing nearby.",
        "Be as still as the oldest thing here.",
      ],
    },
    'ocean-dream': {
      id: 'ocean-dream', label: 'Ocean Dream', glyph: '∿',
      sky: {
        floor:   [0.004, 0.012, 0.048],
        horizon: [0.018, 0.072, 0.195],
        mid:     [0.008, 0.032, 0.115],
        deep:    [0.002, 0.008, 0.042],
        band:    [0.015, 0.090, 0.280],
        stars:   0.10,
      },
      tint: [3, 14, 52], tintOpacity: 0.26,
      glow: [10, 65, 155], fog: [5, 22, 80], fogDensity: 0.65,
      particles: 'drift', lightning: false, rays: false,
      caustics: true, flicker: false, cityLights: false,
      motionSpeed: 0.22,
      companion: [
        "The ocean asks nothing of you.",
        "Drift a little.",
        "You are deep now.",
        "Let the current decide.",
        "Somewhere below, everything is quiet.",
        "The surface is far away.",
      ],
    },
    'fireplace-cabin': {
      id: 'fireplace-cabin', label: 'Fireplace', glyph: '◈',
      sky: {
        floor:   [0.055, 0.014, 0.004],
        horizon: [0.260, 0.075, 0.015],
        mid:     [0.075, 0.025, 0.006],
        deep:    [0.020, 0.007, 0.002],
        band:    [0.380, 0.110, 0.018],
        stars:   0.05,
      },
      tint: [52, 16, 4], tintOpacity: 0.22,
      glow: [185, 70, 12], fog: [65, 24, 6], fogDensity: 0.24,
      particles: 'embers', lightning: false, rays: false,
      caustics: false, flicker: true, cityLights: false,
      motionSpeed: 0.48,
      companion: [
        "The fire holds steady.",
        "You don't need to be anywhere else.",
        "Warmth is enough.",
        "Let the hours disappear.",
        "This is the whole evening.",
        "The wood has been burning a long time.",
      ],
    },
    'deep-space': {
      id: 'deep-space', label: 'Deep Space', glyph: '✦',
      sky: {
        floor:   [0.002, 0.001, 0.010],
        horizon: [0.012, 0.007, 0.048],
        mid:     [0.005, 0.003, 0.024],
        deep:    [0.001, 0.001, 0.006],
        band:    [0.035, 0.018, 0.130],
        stars:   1.40,
      },
      tint: [6, 3, 24], tintOpacity: 0.18,
      glow: [42, 22, 120], fog: [10, 6, 44], fogDensity: 0.16,
      particles: 'stars', lightning: false, rays: false,
      caustics: false, flicker: false, cityLights: false,
      motionSpeed: 0.10,
      companion: [
        "You are very small. That is a relief.",
        "Silence has weight out here.",
        "The distance is the point.",
        "Nothing is close enough to worry about.",
        "Float.",
        "Your thoughts are just light, travelling.",
      ],
    },
    'night-train': {
      id: 'night-train', label: 'Night Train', glyph: '⟶',
      sky: {
        floor:   [0.012, 0.014, 0.042],
        horizon: [0.095, 0.105, 0.240],
        mid:     [0.026, 0.030, 0.105],
        deep:    [0.008, 0.010, 0.038],
        band:    [0.110, 0.130, 0.295],
        stars:   0.30,
      },
      tint: [8, 10, 34], tintOpacity: 0.18,
      glow: [60, 80, 160], fog: [10, 14, 42], fogDensity: 0.36,
      particles: 'streaks', lightning: false, rays: false,
      caustics: false, flicker: false, cityLights: true,
      motionSpeed: 0.68,
      companion: [
        "The city passes without needing you.",
        "Movement without effort.",
        "Watch the lights go by.",
        "The night train runs on its own time.",
        "Somewhere up ahead, rest.",
        "You are between things. That is allowed.",
      ],
    },
  };

  const IDS = Object.keys(SCENES);
  let current = SCENES['midnight-rain'];
  let prev    = null;
  let transT  = 1.0;
  let listeners = [];

  /* ── Sky lerp loop ── drives the Three.js shader uniforms */
  const fromSky = { ...SCENES['midnight-rain'].sky };
  const toSky   = { ...SCENES['midnight-rain'].sky };

  function lerpV(a, b, t) {
    return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
  }

  function pushSkyUniforms(mat, sky) {
    const u = mat.uniforms;
    u.uFloor.value.set(...sky.floor);
    u.uHorizon.value.set(...sky.horizon);
    u.uMid.value.set(...sky.mid);
    u.uDeep.value.set(...sky.deep);
    u.uBand.value.set(...sky.band);
    u.uStarBrightness.value = sky.stars;
  }

  let lastTs = 0;
  function skyTick(ts) {
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;

    if (transT < 1.0) {
      transT = Math.min(1.0, transT + dt / 2.4); // 2.4s transition
      const ease = transT < 0.5
        ? 2 * transT * transT
        : -1 + (4 - 2 * transT) * transT;

      const mat = window.__mindspaceSkyMat;
      if (mat) {
        const sky = {
          floor:   lerpV(fromSky.floor,   toSky.floor,   ease),
          horizon: lerpV(fromSky.horizon, toSky.horizon, ease),
          mid:     lerpV(fromSky.mid,     toSky.mid,     ease),
          deep:    lerpV(fromSky.deep,    toSky.deep,    ease),
          band:    lerpV(fromSky.band,    toSky.band,    ease),
          stars:   fromSky.stars + (toSky.stars - fromSky.stars) * ease,
        };
        pushSkyUniforms(mat, sky);
      }

      window.__mindspaceSceneT = ease;
    }

    requestAnimationFrame(skyTick);
  }
  requestAnimationFrame(skyTick);

  /* ── setScene ── */
  function setScene(id) {
    if (!SCENES[id] || id === current.id) return;
    prev = current;
    current = SCENES[id];

    /* snapshot where we are right now (mid-transition is OK) */
    const mat = window.__mindspaceSkyMat;
    if (mat) {
      const u = mat.uniforms;
      fromSky.floor   = [u.uFloor.value.x,   u.uFloor.value.y,   u.uFloor.value.z];
      fromSky.horizon = [u.uHorizon.value.x,  u.uHorizon.value.y, u.uHorizon.value.z];
      fromSky.mid     = [u.uMid.value.x,      u.uMid.value.y,     u.uMid.value.z];
      fromSky.deep    = [u.uDeep.value.x,     u.uDeep.value.y,    u.uDeep.value.z];
      fromSky.band    = [u.uBand.value.x,     u.uBand.value.y,    u.uBand.value.z];
      fromSky.stars   = u.uStarBrightness.value;
    } else {
      Object.assign(fromSky, prev.sky);
    }
    Object.assign(toSky, current.sky);
    transT = 0;

    window.__mindspaceScene     = current;
    window.__mindspaceScenePrev = prev;
    window.__mindspaceSceneT    = 0;

    /* Atmospheric veil flash — brief threshold crossing */
    document.body.classList.add('scene-transitioning');
    setTimeout(() => document.body.classList.remove('scene-transitioning'), 900);

    listeners.forEach(cb => cb(current, prev));
  }

  function getScene()  { return current; }
  function getAll()    { return SCENES; }
  function getIds()    { return IDS; }
  function getT()      { return transT; }
  function onChange(cb) {
    listeners.push(cb);
    return () => { listeners = listeners.filter(l => l !== cb); };
  }

  window.__mindspaceScene     = current;
  window.__mindspaceScenePrev = null;
  window.__mindspaceSceneT    = 1;

  window.MindSpaceSceneEngine = {
    setScene, getScene, getAll, getIds, onChange, getT, SCENES,
  };
})();
