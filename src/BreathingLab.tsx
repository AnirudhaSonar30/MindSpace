// MindSpace — Breathing Lab
// BreathOrb: full Canvas 2D renderer with particles, ripples, wisps,
// phase-color transitions and a 5-layer gradient sphere.
// BreathingLab: cadence picker + focus overlay.

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useMindSpaceStore } from './store'

const easeInOutSine = (t: number) => -(Math.cos(Math.PI * Math.max(0, Math.min(1, t))) - 1) / 2

/* ============================================================
   Cadence types and data
   ============================================================ */
interface CadencePhase {
  kind: 'in' | 'out' | 'hold' | 'rest'
  label: string
  dur: number
}
interface Cadence {
  id: string; nums: string; name: string; desc: string; source: string
  phases: CadencePhase[]
}

const CADENCES: Cadence[] = [
  {
    id: '478', nums: '4 · 7 · 8', name: 'before sleep',
    desc: 'A sedating count. Use when the day will not let go of you.',
    source: 'Andrew Weil — relaxation response',
    phases: [
      { kind: 'in',   label: 'inhale', dur: 4 },
      { kind: 'hold', label: 'hold',   dur: 7 },
      { kind: 'out',  label: 'exhale', dur: 8 },
    ],
  },
  {
    id: 'box', nums: '4 · 4 · 4 · 4', name: 'steady focus',
    desc: 'An even square. Calms without sedating. Used by Navy operators and emergency clinicians.',
    source: 'Box breathing — tactical / first responder',
    phases: [
      { kind: 'in',   label: 'inhale', dur: 4 },
      { kind: 'hold', label: 'hold',   dur: 4 },
      { kind: 'out',  label: 'exhale', dur: 4 },
      { kind: 'hold', label: 'hold',   dur: 4 },
    ],
  },
  {
    id: 'sigh', nums: 'sigh · sigh · out', name: 'fastest reset',
    desc: 'Two short inhales through the nose, then one long exhale through the mouth. Drops autonomic arousal in seconds.',
    source: 'Huberman Lab — Stanford, 2023',
    phases: [
      { kind: 'in',   label: 'inhale',   dur: 1.5 },
      { kind: 'in',   label: 'top up',   dur: 0.9 },
      { kind: 'out',  label: 'long out', dur: 5.5 },
      { kind: 'rest', label: 'rest',     dur: 1.4 },
    ],
  },
  {
    id: 'coherent', nums: '5.5 / min', name: 'heart coherence',
    desc: 'Five and a half breaths a minute. Tunes heart-rate variability toward its resonance frequency.',
    source: 'HeartMath — resonance-frequency breathing',
    phases: [
      { kind: 'in',  label: 'inhale', dur: 5.45 },
      { kind: 'out', label: 'exhale', dur: 5.45 },
    ],
  },
]

const ORB_STYLES = ['glass', 'reactor', 'nebula', 'jellyfish', 'wireframe']

/* ── orb color palette ── */
const BO_COLOR: Record<string, [number, number, number]> = {
  inhale: [260, 50, 64],
  hold:   [165, 55, 62],
  exhale: [38,  68, 65],
  rest:   [220, 28, 60],
}
function boHslA(H: number, S: number, L: number, a: number) {
  return `hsla(${H|0},${S|0}%,${L|0}%,${a.toFixed(3)})`
}

/* ── style state initializers ── */
function makeNebulaState() {
  return { rings: [] as {r:number;op:number;w:number}[], prevPhase: 'inhale',
           cH: BO_COLOR.inhale[0], cS: BO_COLOR.inhale[1], cL: BO_COLOR.inhale[2], pulse: 0 }
}
function makeJellyState() {
  return {
    tendrils: Array.from({ length: 14 }, (_, i) => ({
      baseA: (i / 14) * Math.PI * 2, len: 0.20 + Math.random() * 0.18,
      wavePhase: Math.random() * Math.PI * 2, waveSpeed: 0.015 + Math.random() * 0.018,
      amp: 0.04 + Math.random() * 0.06, thickness: 0.7 + Math.random() * 1.3,
    })),
    micro: [] as {x:number;y:number;vx:number;vy:number;life:number;size:number}[],
    prevPhase: 'inhale',
    cH: BO_COLOR.inhale[0], cS: BO_COLOR.inhale[1], cL: BO_COLOR.inhale[2],
  }
}
function makeWireState() {
  const N = 56
  const phi2 = Math.PI * (3 - Math.sqrt(5))
  const verts = Array.from({ length: N }, (_, i) => {
    const y = 1 - (i / (N - 1)) * 2
    const radius = Math.sqrt(1 - y * y)
    const theta = phi2 * i
    return { base: [Math.cos(theta) * radius, y, Math.sin(theta) * radius] as [number,number,number],
             px: 0, py: 0, pz: 0, noisePh: Math.random() * Math.PI * 2 }
  })
  const edges: [number, number][] = []
  for (let i = 0; i < N; i++) {
    const dists: {j:number;d:number}[] = []
    for (let j = 0; j < N; j++) {
      if (i === j) continue
      const dx = verts[i].base[0] - verts[j].base[0]
      const dy = verts[i].base[1] - verts[j].base[1]
      const dz = verts[i].base[2] - verts[j].base[2]
      dists.push({ j, d: dx*dx + dy*dy + dz*dz })
    }
    dists.sort((a, b) => a.d - b.d)
    for (let k = 0; k < 3; k++) if (i < dists[k].j) edges.push([i, dists[k].j])
  }
  return { verts, edges, prevPhase: 'inhale',
           cH: BO_COLOR.inhale[0], cS: BO_COLOR.inhale[1], cL: BO_COLOR.inhale[2], explode: 0 }
}
function makeGlassState() {
  return {
    caustics: Array.from({ length: 12 }, (_, i) => ({
      angle: (i / 12) * Math.PI * 2 + Math.random() * 0.5,
      r: 0.14 + Math.random() * 0.48, speed: (0.0014 + Math.random() * 0.003) * (Math.random() > 0.5 ? 1 : -1),
      rSpeed: 0.0007 + Math.random() * 0.0014, size: 3 + Math.random() * 7,
      op: 0.22 + Math.random() * 0.44, rPhase: Math.random() * Math.PI * 2,
    })),
    prevPhase: 'inhale',
    cH: BO_COLOR.inhale[0], cS: BO_COLOR.inhale[1], cL: BO_COLOR.inhale[2],
    shimRot: 0,
    ripples: [] as {r:number;op:number;w:number;slow?:boolean}[],
  }
}
function makeReactorState() {
  const N = 220
  const particles = Array.from({ length: N }, (_, i) => {
    const theta = Math.acos(1 - 2 * (i / N))
    const phi3  = Math.sqrt(N * Math.PI) * theta
    return { bx: Math.sin(theta)*Math.cos(phi3), by: Math.sin(theta)*Math.sin(phi3), bz: Math.cos(theta),
             speed: 0.4 + Math.random() * 1.6, phase: Math.random() * Math.PI * 2, size: 0.9 + Math.random() * 1.8 }
  })
  return {
    particles,
    rings: Array.from({ length: 6 }, (_, i) => ({
      baseR: 0.13 + i * 0.090, rot: (i / 6) * Math.PI * 2,
      speed: (0.0028 + i * 0.0012) * (i % 2 === 0 ? 1 : -1),
      width: 2.8 - i * 0.26, opacity: 0.82 - i * 0.09, segments: 3 + i * 2,
    })),
    pulses: [] as {r:number;op:number;speed:number}[],
    prevPhase: 'inhale',
    cH: BO_COLOR.inhale[0], cS: BO_COLOR.inhale[1], cL: BO_COLOR.inhale[2],
    rx: 0, ry: 0,
  }
}

/* ── orb draw functions ── */
type Ctx2D = CanvasRenderingContext2D
function drawNebula(ctx: Ctx2D, st: ReturnType<typeof makeNebulaState>,
                    CX: number, CY: number, HALF: number, f: number, breath: number, phase: string, kind: string, cp: number) {
  const tc = BO_COLOR[kind] || BO_COLOR.inhale
  st.cH += (tc[0] - st.cH) * 0.024; st.cS += (tc[1] - st.cS) * 0.024; st.cL += (tc[2] - st.cL) * 0.024
  const H_ = st.cH, S_ = st.cS, L_ = st.cL
  if (phase !== st.prevPhase) { st.rings.push({ r: HALF * 0.34, op: 0.95, w: 2.4 }); st.pulse = 1; st.prevPhase = phase }
  st.pulse *= 0.94
  const baseR = HALF * (0.30 + breath * 0.12)
  const lineW = 3.2 + breath * 3.6 + st.pulse * 3.0
  st.rings = st.rings.filter(r => r.op > 0.02)
  st.rings.forEach(r => {
    ctx.beginPath(); ctx.arc(CX, CY, r.r, 0, Math.PI * 2)
    ctx.strokeStyle = boHslA(H_, S_, Math.min(86, L_ + 8), r.op)
    ctx.lineWidth = r.w * (1 - r.r / (HALF * 1.6)); ctx.stroke()
    r.r += 4.6; r.op *= 0.964
  })
  const halo = ctx.createRadialGradient(CX, CY, baseR * 0.65, CX, CY, baseR * 1.55)
  halo.addColorStop(0, boHslA(H_, S_, L_, 0)); halo.addColorStop(0.45, boHslA(H_, S_, L_, 0.26)); halo.addColorStop(1, boHslA(H_, S_, L_, 0))
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(CX, CY, baseR * 1.55, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(CX, CY, baseR * 0.72, 0, Math.PI * 2)
  ctx.strokeStyle = boHslA(H_, S_, L_, 0.18); ctx.lineWidth = 0.8; ctx.stroke()
  ctx.save()
  ctx.shadowColor = boHslA(H_, S_, Math.min(90, L_ + 18), 0.85); ctx.shadowBlur = 32 + breath * 22
  ctx.beginPath(); ctx.arc(CX, CY, baseR, 0, Math.PI * 2)
  ctx.strokeStyle = boHslA(H_, S_, Math.min(94, L_ + 22), 0.94); ctx.lineWidth = lineW; ctx.lineCap = 'round'; ctx.stroke()
  ctx.restore()
  const discR = 8 + breath * 7
  const discG = ctx.createRadialGradient(CX, CY, 0, CX, CY, discR * 2.2)
  discG.addColorStop(0, 'rgba(255,255,255,0.96)'); discG.addColorStop(0.4, boHslA(H_, Math.min(100, S_ + 30), Math.min(96, L_ + 26), 0.86)); discG.addColorStop(1, boHslA(H_, S_, L_, 0))
  ctx.fillStyle = discG; ctx.beginPath(); ctx.arc(CX, CY, discR * 2.2, 0, Math.PI * 2); ctx.fill()
  ctx.save(); ctx.shadowColor = boHslA(H_, S_, Math.min(96, L_ + 28), 0.95); ctx.shadowBlur = 28
  ctx.beginPath(); ctx.arc(CX, CY, discR, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.fill(); ctx.restore()
  if (kind === 'hold') {
    const p2 = 0.4 + 0.6 * Math.sin(f * 0.16)
    ctx.beginPath(); ctx.arc(CX, CY, discR + 6 + p2 * 8, 0, Math.PI * 2)
    ctx.strokeStyle = boHslA(H_, S_, Math.min(94, L_ + 22), 0.40 * p2); ctx.lineWidth = 0.9; ctx.stroke()
  }
  if (cp > 0.004) {
    const ringR = HALF * 0.58; const arcEnd = -Math.PI / 2 + cp * Math.PI * 2
    ctx.save(); ctx.shadowColor = boHslA(H_, S_, L_, 0.55); ctx.shadowBlur = 14
    ctx.beginPath(); ctx.arc(CX, CY, ringR, -Math.PI / 2, arcEnd)
    ctx.strokeStyle = boHslA(H_, S_, Math.min(88, L_ + 12), 0.68); ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore()
    ctx.beginPath(); ctx.arc(CX + Math.cos(arcEnd) * ringR, CY + Math.sin(arcEnd) * ringR, 3.0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.94)'; ctx.fill()
  }
}

function drawJellyfish(ctx: Ctx2D, st: ReturnType<typeof makeJellyState>,
                       W: number, H_px: number, CX: number, CY: number, HALF: number, f: number, breath: number, phase: string, kind: string, cp: number) {
  const orbR = HALF * (0.18 + breath * 0.10)
  const tc = BO_COLOR[kind] || BO_COLOR.inhale
  st.cH += (tc[0] - st.cH) * 0.026; st.cS += (tc[1] - st.cS) * 0.026; st.cL += (tc[2] - st.cL) * 0.026
  const H_ = st.cH, S_ = st.cS, L_ = st.cL
  if (phase !== st.prevPhase) {
    if (st.prevPhase === 'hold' || phase === 'exhale') {
      for (let i = 0; i < 24; i++) {
        const a = Math.random() * Math.PI * 2
        st.micro.push({ x: CX + Math.cos(a) * orbR * 0.85, y: CY + Math.sin(a) * orbR * 0.85,
          vx: Math.cos(a) * (0.6 + Math.random() * 1.2), vy: Math.sin(a) * (0.6 + Math.random() * 1.2) - 0.15,
          life: 1.0, size: 0.6 + Math.random() * 1.1 })
      }
    }
    st.prevPhase = phase
  }
  const bg = ctx.createRadialGradient(CX, CY, orbR * 0.4, CX, CY, HALF * 1.2)
  bg.addColorStop(0, boHslA(H_, S_, L_, 0.10)); bg.addColorStop(0.55, boHslA(H_, S_, L_, 0.03)); bg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H_px)
  if (cp > 0.004) {
    const ringR = HALF * 0.86; const arcEnd = -Math.PI / 2 + cp * Math.PI * 2
    ctx.save(); ctx.shadowColor = boHslA(H_, S_, L_, 0.55); ctx.shadowBlur = 16
    ctx.beginPath(); ctx.arc(CX, CY, ringR, -Math.PI / 2, arcEnd)
    ctx.strokeStyle = boHslA(H_, S_, Math.min(86, L_ + 10), 0.78); ctx.lineWidth = 1.7; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore()
    ctx.beginPath(); ctx.arc(CX + Math.cos(arcEnd) * ringR, CY + Math.sin(arcEnd) * ringR, 3.4, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fill()
  }
  ctx.save(); ctx.lineCap = 'round'
  st.tendrils.forEach(t => {
    const len = HALF * t.len * (1 - breath * 0.25); const startR = orbR * 0.78; const segments = 12
    ctx.beginPath()
    for (let i = 0; i <= segments; i++) {
      const tt = i / segments
      const wave = Math.sin(f * t.waveSpeed + t.wavePhase + tt * 4) * t.amp * len * tt
      const ang = t.baseA + wave / Math.max(0.1, startR + len * tt)
      const r = startR + len * tt
      i === 0 ? ctx.moveTo(CX + Math.cos(ang) * r, CY + Math.sin(ang) * r)
              : ctx.lineTo(CX + Math.cos(ang) * r, CY + Math.sin(ang) * r)
    }
    ctx.strokeStyle = boHslA(H_, S_, Math.min(86, L_ + 14), 0.34); ctx.lineWidth = t.thickness * (1 - breath * 0.3); ctx.stroke()
  }); ctx.restore()
  const halo = ctx.createRadialGradient(CX, CY, orbR * 0.5, CX, CY, orbR * 2.3)
  halo.addColorStop(0, boHslA(H_, S_, L_, 0.32)); halo.addColorStop(0.5, boHslA(H_, S_, L_, 0.08)); halo.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(CX, CY, orbR * 2.3, 0, Math.PI * 2); ctx.fill()
  ctx.save(); ctx.translate(CX, CY)
  const holdRipple = kind === 'hold' ? Math.sin(f * 0.16) * 0.08 : 0
  const rX2 = orbR * (1 + 0.04 * Math.sin(f * 0.02)); const rY2 = orbR * (1 - 0.06 + holdRipple)
  const bell = ctx.createRadialGradient(0, -orbR * 0.18, 0, 0, 0, orbR * 1.05)
  bell.addColorStop(0, 'rgba(255,255,255,0.46)'); bell.addColorStop(0.16, boHslA(H_, Math.min(90, S_ + 10), Math.min(92, L_ + 18), 0.66))
  bell.addColorStop(0.55, boHslA(H_, S_, L_, 0.36)); bell.addColorStop(1, boHslA(H_, S_, Math.max(20, L_ - 16), 0.05))
  ctx.fillStyle = bell; ctx.beginPath(); ctx.ellipse(0, 0, rX2, rY2, 0, 0, Math.PI * 2); ctx.fill()
  const nucR = orbR * (0.20 + breath * 0.08)
  const nucG = ctx.createRadialGradient(0, 0, 0, 0, 0, nucR)
  nucG.addColorStop(0, 'rgba(255,255,255,0.85)'); nucG.addColorStop(0.5, boHslA(H_, Math.min(90, S_ + 20), Math.min(94, L_ + 28), 0.66)); nucG.addColorStop(1, boHslA(H_, S_, L_, 0))
  ctx.fillStyle = nucG; ctx.beginPath(); ctx.arc(0, 0, nucR, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse(0, 0, rX2, rY2, 0, 0, Math.PI * 2)
  ctx.strokeStyle = boHslA(H_, S_, Math.min(90, L_ + 12), 0.38); ctx.lineWidth = 0.9; ctx.stroke(); ctx.restore()
  ctx.save(); st.micro = st.micro.filter(m => m.life > 0.02)
  st.micro.forEach(m => {
    m.x += m.vx; m.y += m.vy; m.vy += 0.012; m.life *= 0.972
    ctx.beginPath(); ctx.arc(m.x, m.y, m.size * m.life, 0, Math.PI * 2)
    ctx.fillStyle = boHslA(H_, Math.min(90, S_ + 18), Math.min(92, L_ + 22), m.life * 0.85); ctx.fill()
  }); ctx.restore()
}

function drawWireframe(ctx: Ctx2D, st: ReturnType<typeof makeWireState>,
                       W: number, H_px: number, CX: number, CY: number, HALF: number, f: number, breath: number, _phase: string, kind: string, cp: number) {
  const orbR = HALF * (0.20 + breath * 0.12)
  const tc = BO_COLOR[kind] || BO_COLOR.inhale
  st.cH += (tc[0] - st.cH) * 0.030; st.cS += (tc[1] - st.cS) * 0.030; st.cL += (tc[2] - st.cL) * 0.030
  const H_ = st.cH, S_ = st.cS, L_ = st.cL
  const explodeTarget = kind === 'exhale' ? 0.45 : kind === 'inhale' ? 0 : 0.10
  st.explode += (explodeTarget - st.explode) * 0.04
  const bg = ctx.createRadialGradient(CX, CY, orbR * 0.3, CX, CY, HALF * 1.1)
  bg.addColorStop(0, boHslA(H_, S_, L_, 0.06)); bg.addColorStop(0.6, boHslA(H_, S_, L_, 0.020)); bg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H_px)
  if (cp > 0.004) {
    const ringR = HALF * 0.86; const arcEnd = -Math.PI / 2 + cp * Math.PI * 2
    ctx.save(); ctx.shadowColor = boHslA(H_, S_, L_, 0.6); ctx.shadowBlur = 16
    ctx.beginPath(); ctx.arc(CX, CY, ringR, -Math.PI / 2, arcEnd)
    ctx.strokeStyle = boHslA(H_, S_, Math.min(86, L_ + 12), 0.80); ctx.lineWidth = 1.7; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore()
    ctx.beginPath(); ctx.arc(CX + Math.cos(arcEnd) * ringR, CY + Math.sin(arcEnd) * ringR, 3.4, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.94)'; ctx.fill()
  }
  const halo = ctx.createRadialGradient(CX, CY, orbR * 0.7, CX, CY, orbR * 2.2)
  halo.addColorStop(0, boHslA(H_, S_, L_, 0.20)); halo.addColorStop(0.5, boHslA(H_, S_, L_, 0.06)); halo.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(CX, CY, orbR * 2.2, 0, Math.PI * 2); ctx.fill()
  const rotY = f * 0.005 * (0.5 + breath * 0.6); const rotX2 = f * 0.003
  const cY2 = Math.cos(rotY), sY2 = Math.sin(rotY); const cX2 = Math.cos(rotX2), sX2 = Math.sin(rotX2)
  st.verts.forEach(v => {
    const n2 = 1 + 0.08 * Math.sin(f * 0.022 + v.noisePh * 3) * (0.5 + breath * 0.5)
    const e2 = 1 + st.explode * 0.8
    let x2 = v.base[0] * n2 * e2, y2 = v.base[1] * n2 * e2, z2 = v.base[2] * n2 * e2
    const nx2 = x2 * cY2 + z2 * sY2; let nz2 = -x2 * sY2 + z2 * cY2
    const ny2 = y2 * cX2 - nz2 * sX2; nz2 = y2 * sX2 + nz2 * cX2
    const persp = 1 / (1 + nz2 * 0.35)
    v.px = CX + nx2 * orbR * persp; v.py = CY + ny2 * orbR * persp; v.pz = nz2
  })
  ctx.save(); ctx.lineWidth = 0.75
  for (let i = 0; i < st.edges.length; i++) {
    const [a2, b2] = st.edges[i]; const va = st.verts[a2], vb = st.verts[b2]
    const depth = (va.pz + vb.pz) * 0.5; const al = 0.40 + 0.45 * (1 - (depth + 1) / 2)
    ctx.strokeStyle = boHslA(H_, S_, Math.min(86, L_ + 10), al * (1 - st.explode * 0.6))
    ctx.beginPath(); ctx.moveTo(va.px, va.py); ctx.lineTo(vb.px, vb.py); ctx.stroke()
  }; ctx.restore()
  st.verts.forEach(v => {
    const depth = v.pz; const al = 0.55 + 0.45 * (1 - (depth + 1) / 2)
    ctx.beginPath(); ctx.arc(v.px, v.py, 4 + (1 - depth) * 1.4, 0, Math.PI * 2)
    ctx.fillStyle = boHslA(H_, Math.min(90, S_ + 20), Math.min(92, L_ + 22), al * 0.16); ctx.fill()
    ctx.beginPath(); ctx.arc(v.px, v.py, 1.4 + (1 - depth) * 0.6, 0, Math.PI * 2)
    ctx.fillStyle = boHslA(H_, Math.min(90, S_ + 30), Math.min(96, L_ + 30), al); ctx.fill()
  })
  ctx.beginPath(); ctx.arc(CX, CY, 3.0, 0, Math.PI * 2)
  ctx.shadowColor = 'rgba(255,255,255,0.85)'; ctx.shadowBlur = 14
  ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fill(); ctx.shadowBlur = 0
}

function drawGlass(ctx: Ctx2D, st: ReturnType<typeof makeGlassState>,
                   CX: number, CY: number, HALF: number, f: number, breath: number, phase: string, kind: string, cp: number) {
  const tc = BO_COLOR[kind] || BO_COLOR.inhale
  st.cH += (tc[0] - st.cH) * 0.030; st.cS += (tc[1] - st.cS) * 0.030; st.cL += (tc[2] - st.cL) * 0.030
  const H_ = st.cH, S_ = st.cS, L_ = st.cL
  if (phase !== st.prevPhase) {
    st.ripples.push({ r: HALF * 0.08, op: 0.90, w: 2.2 }); st.ripples.push({ r: HALF * 0.04, op: 0.44, w: 0.9, slow: true }); st.prevPhase = phase
  }
  const orbR = HALF * (0.22 + breath * 0.13); st.shimRot += 0.0044
  const aura = ctx.createRadialGradient(CX, CY, orbR * 0.6, CX, CY, orbR * 2.9)
  aura.addColorStop(0, boHslA(H_, S_, L_, 0.30)); aura.addColorStop(0.4, boHslA(H_, S_, L_, 0.08)); aura.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(CX, CY, orbR * 2.9, 0, Math.PI * 2); ctx.fill()
  st.ripples = st.ripples.filter(r => r.op > 0.015)
  st.ripples.forEach(r => {
    ctx.beginPath(); ctx.arc(CX, CY, r.r, 0, Math.PI * 2)
    ctx.strokeStyle = boHslA(H_, S_, Math.min(90, L_ + 12), r.op * (r.slow ? 0.5 : 1)); ctx.lineWidth = r.w; ctx.stroke()
    r.r += r.slow ? 1.9 : 4.0; r.op *= r.slow ? 0.974 : 0.943
  })
  ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, orbR, 0, Math.PI * 2); ctx.clip()
  const body = ctx.createRadialGradient(CX - orbR * 0.28, CY - orbR * 0.28, 0, CX, CY, orbR * 1.18)
  body.addColorStop(0, boHslA(H_, S_, Math.min(96, L_ + 34), 0.72)); body.addColorStop(0.28, boHslA(H_, S_, L_, 0.60))
  body.addColorStop(0.68, boHslA(H_, S_, Math.max(22, L_ - 18), 0.44)); body.addColorStop(1, boHslA(H_, S_, Math.max(10, L_ - 28), 0.28))
  ctx.fillStyle = body; ctx.fillRect(CX - orbR * 1.25, CY - orbR * 1.25, orbR * 2.5, orbR * 2.5)
  const sX2 = CX + Math.cos(st.shimRot) * orbR * 0.30; const sY2 = CY + Math.sin(st.shimRot * 2.0) * orbR * 0.18
  const shim = ctx.createRadialGradient(sX2, sY2, 0, sX2, sY2, orbR * 0.65)
  shim.addColorStop(0, 'rgba(255,255,255,0.34)'); shim.addColorStop(0.44, 'rgba(255,255,255,0.08)'); shim.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = shim; ctx.fillRect(CX - orbR * 1.25, CY - orbR * 1.25, orbR * 2.5, orbR * 2.5)
  st.caustics.forEach(c => {
    c.angle += c.speed; c.r += Math.sin(f * c.rSpeed + c.rPhase) * 0.002; c.r = Math.max(0.05, Math.min(0.60, c.r))
    const px = CX + Math.cos(c.angle) * orbR * c.r; const py = CY + Math.sin(c.angle * 1.27) * orbR * c.r * 0.85
    const tw = 0.55 + 0.45 * Math.sin(f * 0.055 + c.angle * 2.3)
    const cg = ctx.createRadialGradient(px, py, 0, px, py, c.size * tw)
    cg.addColorStop(0, `rgba(255,255,255,${(c.op * tw * 0.55).toFixed(3)})`); cg.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(px, py, c.size * tw, 0, Math.PI * 2); ctx.fill()
  }); ctx.restore()
  const specX = CX - orbR * 0.37; const specY = CY - orbR * 0.42
  const spec = ctx.createRadialGradient(specX, specY, 0, specX, specY, orbR * 0.54)
  spec.addColorStop(0, 'rgba(255,255,255,0.72)'); spec.addColorStop(0.30, 'rgba(255,255,255,0.28)')
  spec.addColorStop(0.68, 'rgba(255,255,255,0.05)'); spec.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = spec; ctx.beginPath(); ctx.arc(CX, CY, orbR, 0, Math.PI * 2); ctx.fill()
  ctx.save(); ctx.shadowColor = boHslA(H_, S_, L_, 1.0); ctx.shadowBlur = 34 + breath * 30
  ctx.beginPath(); ctx.arc(CX, CY, orbR, 0, Math.PI * 2)
  ctx.strokeStyle = boHslA(H_, S_, Math.min(92, L_ + 22), 0.28); ctx.lineWidth = 9 + breath * 7; ctx.stroke(); ctx.restore()
  ctx.beginPath(); ctx.arc(CX, CY, orbR, 0, Math.PI * 2)
  ctx.strokeStyle = boHslA(H_, S_, Math.min(90, L_ + 20), 0.56 + breath * 0.24); ctx.lineWidth = 1.3 + breath * 1.7; ctx.stroke()
  if (cp > 0.004) {
    const ringR = HALF * 0.62; const arcEnd = -Math.PI / 2 + cp * Math.PI * 2
    ctx.save(); ctx.shadowColor = boHslA(H_, S_, L_, 0.65); ctx.shadowBlur = 13
    ctx.beginPath(); ctx.arc(CX, CY, ringR, -Math.PI / 2, arcEnd)
    ctx.strokeStyle = boHslA(H_, S_, Math.min(88, L_ + 12), 0.74); ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore()
    ctx.beginPath(); ctx.arc(CX + Math.cos(arcEnd) * ringR, CY + Math.sin(arcEnd) * ringR, 3.2, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.fill()
  }
}

function drawReactor(ctx: Ctx2D, st: ReturnType<typeof makeReactorState>,
                     CX: number, CY: number, HALF: number, _f: number, breath: number, phase: string, kind: string, cp: number) {
  const tc = BO_COLOR[kind] || BO_COLOR.inhale
  st.cH += (tc[0] - st.cH) * 0.030; st.cS += (tc[1] - st.cS) * 0.030; st.cL += (tc[2] - st.cL) * 0.030
  const H_ = st.cH, S_ = st.cS, L_ = st.cL
  if (phase !== st.prevPhase) { st.pulses.push({ r: HALF * 0.10, op: 1.0, speed: 5.2 }); st.prevPhase = phase }
  const orbR = HALF * (0.16 + breath * 0.14); st.rx += 0.004; st.ry += 0.006
  const bg = ctx.createRadialGradient(CX, CY, orbR * 0.4, CX, CY, orbR * 2.6)
  bg.addColorStop(0, boHslA(H_, S_, L_, 0.24)); bg.addColorStop(0.5, boHslA(H_, S_, L_, 0.06)); bg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(CX, CY, orbR * 2.6, 0, Math.PI * 2); ctx.fill()
  const fov = 500; const coX = Math.cos(st.rx), siX = Math.sin(st.rx); const coY2 = Math.cos(st.ry), siY2 = Math.sin(st.ry)
  ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = boHslA(H_, S_, L_, 0.6)
  st.particles.forEach(p => {
    const y1 = p.by * coX - p.bz * siX; const z1 = p.by * siX + p.bz * coX
    const x2 = p.bx * coY2 + z1 * siY2; const z2 = -p.bx * siY2 + z1 * coY2
    const persp = fov / (fov + z2 * orbR)
    const px = x2 * orbR * persp + CX; const py = y1 * orbR * persp + CY
    const depth = (z2 + 1) * 0.5; const al = depth * 0.65 * (0.38 + breath * 0.55)
    ctx.beginPath(); ctx.arc(px, py, p.size * persp, 0, Math.PI * 2)
    ctx.fillStyle = boHslA(H_, S_, Math.min(90, L_ + 15), al); ctx.fill()
  }); ctx.shadowBlur = 0; ctx.restore()
  st.rings.forEach(ring => {
    ring.rot += ring.speed
    const r2 = HALF * (ring.baseR + breath * 0.08)
    const circ = r2 * Math.PI * 2; const dashLen = (circ / ring.segments) * 0.62; const gapLen = (circ / ring.segments) * 0.38
    ctx.save(); ctx.shadowColor = boHslA(H_, S_, L_, 0.70); ctx.shadowBlur = 8 + breath * 10
    ctx.setLineDash([dashLen, gapLen]); ctx.lineDashOffset = ring.rot * 80
    ctx.beginPath(); ctx.arc(CX, CY, r2, 0, Math.PI * 2)
    ctx.strokeStyle = boHslA(H_, S_, Math.min(90, L_ + 14), ring.opacity * (0.55 + breath * 0.40))
    ctx.lineWidth = ring.width * (0.70 + breath * 0.35); ctx.stroke()
    ctx.setLineDash([]); ctx.restore()
  })
  st.pulses = st.pulses.filter(p2 => p2.op > 0.015)
  st.pulses.forEach(p2 => {
    ctx.beginPath(); ctx.arc(CX, CY, p2.r, 0, Math.PI * 2)
    ctx.strokeStyle = boHslA(H_, S_, Math.min(92, L_ + 18), p2.op * 0.75); ctx.lineWidth = 1.8; ctx.stroke()
    p2.r += p2.speed; p2.op *= 0.947
  })
  const nucR = 5 + breath * 7
  ctx.save(); ctx.shadowColor = boHslA(H_, S_, L_, 1.0); ctx.shadowBlur = 26 + breath * 22
  const nucG = ctx.createRadialGradient(CX, CY, 0, CX, CY, nucR * 2.5)
  nucG.addColorStop(0, 'rgba(255,255,255,0.97)'); nucG.addColorStop(0.4, boHslA(H_, Math.min(90, S_ + 20), Math.min(94, L_ + 28), 0.80)); nucG.addColorStop(1, boHslA(H_, S_, L_, 0))
  ctx.fillStyle = nucG; ctx.beginPath(); ctx.arc(CX, CY, nucR * 2.5, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(CX, CY, nucR * 0.45, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.98)'; ctx.fill(); ctx.restore()
  if (cp > 0.004) {
    const ringR = HALF * (st.rings[5].baseR + 0.11 + breath * 0.08); const arcEnd = -Math.PI / 2 + cp * Math.PI * 2
    ctx.save(); ctx.shadowColor = boHslA(H_, S_, L_, 0.65); ctx.shadowBlur = 12
    ctx.beginPath(); ctx.arc(CX, CY, ringR, -Math.PI / 2, arcEnd)
    ctx.strokeStyle = boHslA(H_, S_, Math.min(88, L_ + 12), 0.74); ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore()
    ctx.beginPath(); ctx.arc(CX + Math.cos(arcEnd) * ringR, CY + Math.sin(arcEnd) * ringR, 3.2, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.fill()
  }
}

function phaseScale(kind: CadencePhase['kind'], t: number, prevScale: number): number {
  if (kind === 'in')   return 0.58 + 0.42 * easeInOutSine(t)
  if (kind === 'out')  return 1.00 - 0.42 * easeInOutSine(t)
  if (kind === 'hold') return prevScale
  return 0.58
}
function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60), ss = Math.floor(sec % 60)
  return String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0')
}

/* ============================================================
   BreathOrb — standalone Canvas component
   ============================================================ */
interface OrbProps {
  runningRef: React.MutableRefObject<boolean>
  cadenceRef: React.MutableRefObject<Cadence | undefined>
  cpRef:      React.MutableRefObject<number>
  style?:     string
}

function BreathOrb({ runningRef: _runningRef, cadenceRef: _cadenceRef, cpRef, style }: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const styleRef  = useRef(style || 'glass')
  useEffect(() => { styleRef.current = style || 'glass' }, [style])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width  = Math.round(rect.width)  * dpr
      canvas.height = Math.round(rect.height) * dpr
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas); resize()

    const states = {
      nebula:    makeNebulaState(),
      jellyfish: makeJellyState(),
      wireframe: makeWireState(),
      glass:     makeGlassState(),
      reactor:   makeReactorState(),
    }

    let rafId: number, frame = 0

    const draw = () => {
      frame++
      const f = frame
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const W    = canvas.width / dpr
      const H_px = canvas.height / dpr
      ctx.clearRect(0, 0, W, H_px)
      const CX   = W * 0.5
      const CY   = H_px * 0.5
      const HALF = Math.min(W, H_px) * 0.5

      const { breath, phase } = useMindSpaceStore.getState()
      const cp    = cpRef ? cpRef.current : 0
      const kind  = phase === 'inhale' ? 'inhale' : phase === 'exhale' ? 'exhale' : phase === 'hold' ? 'hold' : 'rest'
      const style2 = styleRef.current

      if      (style2 === 'jellyfish') drawJellyfish(ctx, states.jellyfish, W, H_px, CX, CY, HALF, f, breath, phase, kind, cp)
      else if (style2 === 'wireframe') drawWireframe(ctx, states.wireframe, W, H_px, CX, CY, HALF, f, breath, phase, kind, cp)
      else if (style2 === 'glass')     drawGlass(ctx, states.glass, CX, CY, HALF, f, breath, phase, kind, cp)
      else if (style2 === 'reactor')   drawReactor(ctx, states.reactor, CX, CY, HALF, f, breath, phase, kind, cp)
      else                             drawNebula(ctx, states.nebula, CX, CY, HALF, f, breath, phase, kind, cp)

      rafId = requestAnimationFrame(draw)
    }

    rafId = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(rafId); ro.disconnect() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <canvas ref={canvasRef} className="lab-canvas" aria-label="Breathing visualisation"/>
}

/* ============================================================
   Breathing Lab
   ============================================================ */
interface LabState {
  idx: number; t: number; elapsed: number; cycles: number; prevScale: number
}

interface BreathingLabProps {
  autoFocus?: boolean
  onExit?:    () => void
}

export function BreathingLab({ autoFocus, onExit }: BreathingLabProps) {
  const initFocus = !!autoFocus

  const [cadenceId, setCadenceId] = useState('478')
  const [orbStyle,  setOrbStyle]  = useState(() => {
    try { return localStorage.getItem('mindspace.orbStyle.v3') || 'glass' } catch { return 'glass' }
  })
  const [running, setRunning] = useState(initFocus)
  const [focused, setFocused] = useState(initFocus)
  const [, force]             = useState(0)
  const rerender = useCallback(() => force(v => (v + 1) | 0), [])

  const pickOrb = (id: string) => {
    setOrbStyle(id)
    try { localStorage.setItem('mindspace.orbStyle.v3', id) } catch {}
  }

  const cadence = CADENCES.find(c => c.id === cadenceId) ?? CADENCES[0]
  const stRef   = useRef<LabState>({ idx: 0, t: 0, elapsed: 0, cycles: 0, prevScale: 0.58 })

  const runningRef = useRef(initFocus)
  const cadenceRef = useRef<Cadence | undefined>(cadence)
  const cpRef      = useRef(0)

  useEffect(() => { runningRef.current = running }, [running])
  useEffect(() => { cadenceRef.current = cadence }, [cadence])

  useEffect(() => {
    stRef.current = { idx: 0, t: 0, elapsed: 0, cycles: 0, prevScale: 0.58 }
    rerender()
  }, [cadenceId, rerender])

  useEffect(() => {
    if (initFocus) document.body.classList.add('breath-focus')
    return () => document.body.classList.remove('breath-focus')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const { setOverride, setBreath } = useMindSpaceStore.getState()
    if (!running) { setOverride(false); return }
    setOverride(true)
    let raf: number, prev = performance.now(), lastUI = 0
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - prev) / 1000)
      prev = now
      const s  = stRef.current
      s.elapsed += dt
      const ph  = cadence.phases[s.idx]
      s.t += dt / ph.dur
      while (s.t >= 1) {
        s.t -= 1
        s.prevScale = phaseScale(ph.kind, 1, s.prevScale)
        s.idx = (s.idx + 1) % cadence.phases.length
        if (s.idx === 0) s.cycles++
      }
      const curPh = cadence.phases[s.idx]
      const sc    = phaseScale(curPh.kind, s.t, s.prevScale)
      const norm  = (sc - 0.58) / 0.42
      setBreath(
        Math.max(0, Math.min(1, norm)),
        curPh.kind === 'in'  ? 'inhale' :
        curPh.kind === 'out' ? 'exhale' : 'hold',
      )
      const totalDur = cadence.phases.reduce((a, p) => a + p.dur, 0)
      const elapsedInCycle = cadence.phases.slice(0, s.idx).reduce((a, p) => a + p.dur, 0) + curPh.dur * s.t
      cpRef.current = elapsedInCycle / totalDur
      if (now - lastUI > 125) { rerender(); lastUI = now }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); setOverride(false) }
  }, [running, cadenceId, cadence, rerender])

  const beginSession = () => {
    stRef.current = { idx: 0, t: 0, elapsed: 0, cycles: 0, prevScale: 0.58 }
    setRunning(true); setFocused(true)
    document.body.classList.add('breath-focus')
  }
  const endSession = () => {
    setRunning(false); setFocused(false)
    document.body.classList.remove('breath-focus')
    if (onExit) onExit()
  }

  const s  = stRef.current
  const ph = cadence.phases[s.idx]

  return (
    <>
      {!focused && (
        <div className="lab">
          <div className="lab-picker">
            <div className="lab-picker-label">cadence</div>
            {CADENCES.map(c => (
              <button key={c.id} className={'lab-cad ' + (c.id === cadenceId ? 'active' : '')}
                onClick={() => setCadenceId(c.id)}>
                <span className="lab-cad-nums">{c.nums}</span>
                <span className="lab-cad-name">{c.name}</span>
              </button>
            ))}
          </div>

          <div className="lab-stage">
            <BreathOrb runningRef={runningRef} cadenceRef={cadenceRef} cpRef={cpRef} style={orbStyle}/>
            <div className="lab-label">
              <div className="lab-phase">{ph.label}</div>
              <div className="lab-phase-dur">{ph.dur.toFixed(1)} s</div>
            </div>
            <div className="lab-orb-styles">
              {ORB_STYLES.map(id => (
                <button key={id} className={'lab-orb-style' + (orbStyle === id ? ' on' : '')}
                  onClick={() => pickOrb(id)}>{id}</button>
              ))}
            </div>
          </div>

          <div className="lab-side">
            <div className="lab-desc">{cadence.desc}</div>
            <div className="lab-source">— {cadence.source}</div>
            <div className="lab-stats">
              <div><span className="rk">elapsed</span><span className="rv">{fmtTime(s.elapsed)}</span></div>
              <div><span className="rk">cycles</span><span className="rv">{String(s.cycles).padStart(2, '0')}</span></div>
            </div>
            <button className="lab-btn" onClick={beginSession}>
              <span className="lab-btn-dot"/><span>begin</span>
            </button>
          </div>
        </div>
      )}

      {focused && createPortal(
        <div className="lab-focus" onClick={endSession}>
          <div className="lab-focus-inner" onClick={e => e.stopPropagation()}>
            <div className="lab-focus-orb">
              <BreathOrb runningRef={runningRef} cadenceRef={cadenceRef} cpRef={cpRef} style={orbStyle}/>
            </div>
            <div className="lab-focus-phase">{ph.label}</div>
            <div className="lab-focus-dur">{ph.dur.toFixed(1)} s</div>
            <div className="lab-focus-meta">
              <span className="rk">elapsed</span>
              <span className="rv">&nbsp;{fmtTime(s.elapsed)}</span>
              <span className="rk">&nbsp;·&nbsp;</span>
              <span className="rk">cycles</span>
              <span className="rv">&nbsp;{String(s.cycles).padStart(2, '0')}</span>
            </div>
            <div className="lab-focus-cads">
              {CADENCES.map(c => (
                <button key={c.id} className={'lab-focus-cad' + (c.id === cadenceId ? ' on' : '')}
                  onClick={() => setCadenceId(c.id)}>{c.name}</button>
              ))}
            </div>
            <div className="lab-focus-styles">
              {ORB_STYLES.map(id => (
                <button key={id} className={'lab-focus-style' + (orbStyle === id ? ' on' : '')}
                  onClick={() => pickOrb(id)}>{id}</button>
              ))}
            </div>
            <button className="lab-focus-exit" onClick={endSession}>end session</button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
