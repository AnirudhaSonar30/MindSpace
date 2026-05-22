// MindSpace — Memory
// Quietly remembers what mattered last time.
// Tracks last scene, last cadence, visit count, and last-seen timestamp.
// Fires 'mindspace:welcome-back' once for returning visitors.

import { sceneEngine } from './scenes'

const KEY       = 'mindspace.memory.v1'
const VISIT_KEY = 'mindspace.memory.visits'
const LAST_KEY  = 'mindspace.memory.lastSeen'

interface MemoryData {
  sceneId?: string
  sceneLabel?: string
  cadenceId?: string
  updatedAt?: number
  [key: string]: unknown
}

function load(): MemoryData {
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') ?? {} }
  catch { return {} }
}

function save(patch: Partial<MemoryData>): MemoryData {
  const next = { ...load(), ...patch, updatedAt: Date.now() }
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
  return next
}

// Visit counter
let visits = 0
let lastSeen = 0
try {
  visits  = parseInt(localStorage.getItem(VISIT_KEY) ?? '0', 10) || 0
  lastSeen = parseInt(localStorage.getItem(LAST_KEY)  ?? '0', 10) || 0
} catch {}

const isReturning = visits > 0 && (Date.now() - lastSeen) > 6 * 60 * 1000
visits++
try {
  localStorage.setItem(VISIT_KEY, String(visits))
  localStorage.setItem(LAST_KEY,  String(Date.now()))
} catch {}

const mem = load()

// Restore remembered scene on startup
function applyScene() {
  if (mem.sceneId && mem.sceneId !== 'midnight-rain') {
    sceneEngine.setScene(mem.sceneId)
  }
  sceneEngine.onChange((scene) => save({ sceneId: scene.id, sceneLabel: scene.label }))
}
applyScene()

// Fire welcome-back event once after first paint
function fireWelcome() {
  if (!isReturning) return
  if (!mem.sceneId && !mem.cadenceId) return

  const sceneLabel = mem.sceneLabel ?? 'this room'
  const elapsed = Date.now() - (mem.updatedAt ?? lastSeen ?? Date.now())

  let when = 'earlier'
  if (elapsed < 90 * 60 * 1000)       when = 'not long ago'
  if (elapsed < 12 * 3600 * 1000)     when = 'a few hours ago'
  if (elapsed < 36 * 3600 * 1000)     when = 'yesterday'
  if (elapsed > 48 * 3600 * 1000)     when = 'a couple of days ago'
  if (elapsed > 7 * 24 * 3600 * 1000) when = 'last week'

  window.dispatchEvent(new CustomEvent('mindspace:welcome-back', {
    detail: { sceneLabel, sceneId: mem.sceneId, when, visits },
  }))
}
setTimeout(fireWelcome, 3000)

export const memory = { visits, isReturning, last: mem, save, load }
