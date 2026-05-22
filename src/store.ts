// MindSpace — global reactive state (replaces window.__mindspace* globals)
import { create } from 'zustand'

interface MindSpaceStore {
  breath:   number    // 0–1 breath position
  phase:    string    // 'inhale' | 'hold' | 'exhale' | 'rest'
  override: boolean   // true: external component (BreathingLab/Companion/RightNow) owns breath
  mode:     string    // practice: 'home'|'breathe'|'ground'|'rest'  ambient: 'present'|…

  setBreath:   (breath: number, phase: string) => void
  setOverride: (val: boolean) => void
  setMode:     (mode: string) => void
}

export const useMindSpaceStore = create<MindSpaceStore>(set => ({
  breath:   0,
  phase:    'inhale',
  override: false,
  mode:     'home',

  setBreath:   (breath, phase) => set({ breath, phase }),
  setOverride: (override)      => set({ override }),
  setMode:     (mode)          => set({ mode }),
}))
