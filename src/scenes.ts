// MindSpace — Scene Engine
// Seven emotional environments. Each drives the Three.js sky shader.

export interface SkyColors {
  floor: [number, number, number]
  horizon: [number, number, number]
  mid: [number, number, number]
  deep: [number, number, number]
  band: [number, number, number]
  stars: number
}

export interface Scene {
  id: string
  label: string
  glyph: string
  story: string
  whispers: string[]
  sky: SkyColors
  tint: [number, number, number]
  tintOpacity: number
  glow: [number, number, number]
  fog: [number, number, number]
  fogDensity: number
  particles: 'rain' | 'mist' | 'pollen' | 'drift' | 'embers' | 'stars' | 'streaks'
  lightning: boolean
  rays: boolean
  caustics: boolean
  flicker: boolean
  cityLights: boolean
  motionSpeed: number
  companion: string[]
}

export const SCENES: Record<string, Scene> = {
  'midnight-rain': {
    id: 'midnight-rain', label: 'Midnight Rain', glyph: '⋮',
    story: 'an apartment, four floors up. nobody is waiting for anything.',
    whispers: [
      'the rain has been here longer than the building.',
      'somewhere a kettle is on. not yours.',
      'the windows know each other.',
    ],
    sky: {
      floor:   [0.010, 0.012, 0.042],
      horizon: [0.450, 0.240, 0.340],
      mid:     [0.040, 0.048, 0.148],
      deep:    [0.006, 0.008, 0.045],
      band:    [0.300, 0.155, 0.360],
      stars:   0.38,
    },
    tint: [8, 14, 48], tintOpacity: 0.22,
    glow: [55, 95, 210], fog: [12, 25, 72], fogDensity: 0.55,
    particles: 'rain', lightning: true, rays: false,
    caustics: false, flicker: false, cityLights: false,
    motionSpeed: 0.80,
    companion: [
      'The rain feels softer tonight.',
      'Let the sound carry you.',
      'Nothing needs to happen right now.',
      'Stay here a little longer.',
      'The room is quiet.',
      'Breathe out slowly. The rain is doing the same.',
    ],
  },
  'soft-morning': {
    id: 'soft-morning', label: 'Soft Morning', glyph: '◌',
    story: 'the first light is borrowed. the day hasn’t decided what it is yet.',
    whispers: [
      'a sparrow is the only one awake.',
      'tea steam climbs into the curtain.',
      'the floor is cool. that’s the news.',
    ],
    sky: {
      floor:   [0.018, 0.016, 0.065],
      horizon: [0.480, 0.220, 0.155],
      mid:     [0.058, 0.052, 0.140],
      deep:    [0.010, 0.012, 0.068],
      band:    [0.300, 0.170, 0.120],
      stars:   0.22,
    },
    tint: [48, 56, 90], tintOpacity: 0.12,
    glow: [90, 110, 175], fog: [60, 70, 120], fogDensity: 0.28,
    particles: 'mist', lightning: false, rays: false,
    caustics: false, flicker: false, cityLights: false,
    motionSpeed: 0.40,
    companion: [
      'Morning comes without asking.',
      'Soft light, soft breath.',
      'The world is still waking.',
      'Take your time. All of it.',
      'Something quiet is beginning.',
    ],
  },
  'forest-temple': {
    id: 'forest-temple', label: 'Forest Temple', glyph: '⟡',
    story: 'a clearing nobody named. moss took the bench back two summers ago.',
    whispers: [
      'something old is breathing nearby.',
      'a single pine cone has decided.',
      'the trees are taller than your week.',
    ],
    sky: {
      floor:   [0.004, 0.018, 0.006],
      horizon: [0.028, 0.220, 0.048],
      mid:     [0.007, 0.032, 0.010],
      deep:    [0.002, 0.008, 0.003],
      band:    [0.038, 0.380, 0.075],
      stars:   0.06,
    },
    tint: [6, 32, 12], tintOpacity: 0.25,
    glow: [25, 110, 42], fog: [10, 55, 20], fogDensity: 0.42,
    particles: 'pollen', lightning: false, rays: true,
    caustics: false, flicker: false, cityLights: false,
    motionSpeed: 0.32,
    companion: [
      'The trees remember stillness.',
      'Roots run deeper than thought.',
      'You are grounded here.',
      'Let the forest hold you.',
      'Something ancient is breathing nearby.',
      'Be as still as the oldest thing here.',
    ],
  },
  'ocean-dream': {
    id: 'ocean-dream', label: 'Ocean Dream', glyph: '∿',
    story: 'a small boat between two larger silences. the moon has lost interest in you, kindly.',
    whispers: [
      'the salt knows the shape of your shoulders.',
      'somewhere a whale is also resting.',
      'the surface is far away.',
    ],
    sky: {
      floor:   [0.002, 0.008, 0.040],
      horizon: [0.012, 0.095, 0.440],
      mid:     [0.005, 0.022, 0.118],
      deep:    [0.001, 0.004, 0.035],
      band:    [0.010, 0.145, 0.480],
      stars:   0.16,
    },
    tint: [3, 14, 52], tintOpacity: 0.26,
    glow: [10, 65, 155], fog: [5, 22, 80], fogDensity: 0.65,
    particles: 'drift', lightning: false, rays: false,
    caustics: true, flicker: false, cityLights: false,
    motionSpeed: 0.22,
    companion: [
      'The ocean asks nothing of you.',
      'Drift a little.',
      'You are deep now.',
      'Let the current decide.',
      'Somewhere below, everything is quiet.',
      'The surface is far away.',
    ],
  },
  'fireplace-cabin': {
    id: 'fireplace-cabin', label: 'Fireplace', glyph: '◈',
    story: 'a cabin somebody left for you. the kettle is still warm. you do not have to be anywhere.',
    whispers: [
      'the wood has been burning a long time.',
      'a draft moves the curtain. that’s all.',
      'the chair you are in remembers you.',
    ],
    sky: {
      floor:   [0.042, 0.010, 0.002],
      horizon: [0.480, 0.090, 0.012],
      mid:     [0.068, 0.018, 0.004],
      deep:    [0.014, 0.004, 0.001],
      band:    [0.580, 0.148, 0.020],
      stars:   0.04,
    },
    tint: [52, 16, 4], tintOpacity: 0.22,
    glow: [185, 70, 12], fog: [65, 24, 6], fogDensity: 0.24,
    particles: 'embers', lightning: false, rays: false,
    caustics: false, flicker: true, cityLights: false,
    motionSpeed: 0.48,
    companion: [
      'The fire holds steady.',
      'You don’t need to be anywhere else.',
      'Warmth is enough.',
      'Let the hours disappear.',
      'This is the whole evening.',
      'The wood has been burning a long time.',
    ],
  },
  'deep-space': {
    id: 'deep-space', label: 'Deep Space', glyph: '✦',
    story: 'three hundred and eighty thousand kilometres above the inbox. nothing is close enough to want anything from you.',
    whispers: [
      'a photon from 1962 just arrived.',
      'your thoughts are just light, travelling.',
      'the silence here has weight.',
    ],
    sky: {
      floor:   [0.001, 0.001, 0.008],
      horizon: [0.008, 0.004, 0.055],
      mid:     [0.003, 0.002, 0.022],
      deep:    [0.000, 0.000, 0.005],
      band:    [0.022, 0.010, 0.160],
      stars:   1.90,
    },
    tint: [6, 3, 24], tintOpacity: 0.18,
    glow: [42, 22, 120], fog: [10, 6, 44], fogDensity: 0.16,
    particles: 'stars', lightning: false, rays: false,
    caustics: false, flicker: false, cityLights: false,
    motionSpeed: 0.10,
    companion: [
      'You are very small. That is a relief.',
      'Silence has weight out here.',
      'The distance is the point.',
      'Nothing is close enough to worry about.',
      'Float.',
      'Your thoughts are just light, travelling.',
    ],
  },
  'night-train': {
    id: 'night-train', label: 'Night Train', glyph: '⟶',
    story: 'a sleeper car between two cities you don’t live in. the world is happening outside your jurisdiction.',
    whispers: [
      'the city passes without needing you.',
      'a stranger is reading two carriages down.',
      'somewhere up ahead, rest.',
    ],
    sky: {
      floor:   [0.008, 0.010, 0.035],
      horizon: [0.155, 0.180, 0.500],
      mid:     [0.016, 0.020, 0.098],
      deep:    [0.004, 0.006, 0.030],
      band:    [0.148, 0.185, 0.560],
      stars:   0.48,
    },
    tint: [8, 10, 34], tintOpacity: 0.18,
    glow: [60, 80, 160], fog: [10, 14, 42], fogDensity: 0.36,
    particles: 'streaks', lightning: false, rays: false,
    caustics: false, flicker: false, cityLights: true,
    motionSpeed: 0.68,
    companion: [
      'The city passes without needing you.',
      'Movement without effort.',
      'Watch the lights go by.',
      'The night train runs on its own time.',
      'Somewhere up ahead, rest.',
      'You are between things. That is allowed.',
    ],
  },
}

export const SCENE_IDS = Object.keys(SCENES) as (keyof typeof SCENES)[]
export const DEFAULT_SCENE_ID = 'midnight-rain'

// Scene engine state — will be replaced with Zustand in task 0.C.19
type SceneChangeListener = (current: Scene, prev: Scene | null) => void

class SceneEngine {
  private current: Scene = SCENES[DEFAULT_SCENE_ID]
  private prev: Scene | null = null
  private transT = 1.0
  private listeners: SceneChangeListener[] = []

  getScene(): Scene { return this.current }
  getPrev(): Scene | null { return this.prev }
  getT(): number { return this.transT }
  getIds(): string[] { return SCENE_IDS }

  setScene(id: string): void {
    if (!SCENES[id] || id === this.current.id) return
    this.prev = this.current
    this.current = SCENES[id]
    this.transT = 0
    this.listeners.forEach((cb) => cb(this.current, this.prev))
  }

  onChange(cb: SceneChangeListener): () => void {
    this.listeners.push(cb)
    return () => { this.listeners = this.listeners.filter((l) => l !== cb) }
  }

  setT(t: number): void { this.transT = t }
}

export const sceneEngine = new SceneEngine()
