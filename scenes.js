/* MindSpace — Scene Engine
   Seven emotional environments. Exposes window.MindSpaceSceneEngine.
   Loaded before everything else so all components can read scene state.
*/
(function () {
  'use strict';

  const SCENES = {
    'midnight-rain': {
      id: 'midnight-rain',
      label: 'Midnight Rain',
      glyph: '⋮',
      tint: [8, 14, 48],
      tintOpacity: 0.22,
      glow: [55, 95, 210],
      fog:  [12, 25, 72],
      fogDensity: 0.55,
      particles: 'rain',
      lightning: true,
      rays: false,
      caustics: false,
      flicker: false,
      cityLights: false,
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
      id: 'soft-morning',
      label: 'Soft Morning',
      glyph: '◌',
      tint: [48, 56, 90],
      tintOpacity: 0.12,
      glow: [90, 110, 175],
      fog:  [60, 70, 120],
      fogDensity: 0.28,
      particles: 'mist',
      lightning: false,
      rays: false,
      caustics: false,
      flicker: false,
      cityLights: false,
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
      id: 'forest-temple',
      label: 'Forest Temple',
      glyph: '⟡',
      tint: [6, 32, 12],
      tintOpacity: 0.22,
      glow: [25, 90, 42],
      fog:  [10, 48, 18],
      fogDensity: 0.38,
      particles: 'pollen',
      lightning: false,
      rays: true,
      caustics: false,
      flicker: false,
      cityLights: false,
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
      id: 'ocean-dream',
      label: 'Ocean Dream',
      glyph: '∿',
      tint: [3, 14, 52],
      tintOpacity: 0.24,
      glow: [10, 60, 145],
      fog:  [5, 18, 72],
      fogDensity: 0.62,
      particles: 'drift',
      lightning: false,
      rays: false,
      caustics: true,
      flicker: false,
      cityLights: false,
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
      id: 'fireplace-cabin',
      label: 'Fireplace',
      glyph: '◈',
      tint: [52, 16, 4],
      tintOpacity: 0.20,
      glow: [175, 65, 12],
      fog:  [62, 22, 6],
      fogDensity: 0.22,
      particles: 'embers',
      lightning: false,
      rays: false,
      caustics: false,
      flicker: true,
      cityLights: false,
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
      id: 'deep-space',
      label: 'Deep Space',
      glyph: '✦',
      tint: [6, 3, 24],
      tintOpacity: 0.18,
      glow: [42, 20, 110],
      fog:  [10, 6, 42],
      fogDensity: 0.16,
      particles: 'stars',
      lightning: false,
      rays: false,
      caustics: false,
      flicker: false,
      cityLights: false,
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
      id: 'night-train',
      label: 'Night Train',
      glyph: '⟶',
      tint: [8, 10, 34],
      tintOpacity: 0.18,
      glow: [60, 78, 155],
      fog:  [10, 12, 40],
      fogDensity: 0.36,
      particles: 'streaks',
      lightning: false,
      rays: false,
      caustics: false,
      flicker: false,
      cityLights: true,
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
  let transitioning = false;
  let transitionT = 1;
  let listeners = [];

  function setScene(id) {
    if (!SCENES[id] || id === current.id) return;
    const prev = current;
    current = SCENES[id];
    transitioning = true;
    transitionT = 0;
    window.__mindspaceScene = current;
    window.__mindspaceScenePrev = prev;
    window.__mindspaceSceneT = 0;
    listeners.forEach(cb => cb(current, prev));

    /* Animate transitionT 0→1 over 2.4s */
    const start = performance.now();
    const dur = 2400;
    const step = (now) => {
      transitionT = Math.min(1, (now - start) / dur);
      window.__mindspaceSceneT = transitionT;
      if (transitionT < 1) requestAnimationFrame(step);
      else transitioning = false;
    };
    requestAnimationFrame(step);
  }

  function getScene()  { return current; }
  function getAll()    { return SCENES; }
  function getIds()    { return IDS; }
  function isTransitioning() { return transitioning; }
  function getT()      { return transitionT; }

  function onChange(cb) {
    listeners.push(cb);
    return () => { listeners = listeners.filter(l => l !== cb); };
  }

  window.__mindspaceScene   = current;
  window.__mindspaceScenePrev = null;
  window.__mindspaceSceneT  = 1;

  window.MindSpaceSceneEngine = {
    setScene, getScene, getAll, getIds,
    onChange, isTransitioning, getT, SCENES,
  };
})();
