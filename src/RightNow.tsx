// MindSpace — "Right Now" 60-second physiological-sigh reset
// Full Canvas visualization: sacred geometry, orbital particles, countdown arc, phase-colored orb.

import { useState, useEffect, useRef } from 'react'
import { useMindSpaceStore } from './store'

const ease = (t: number) => -(Math.cos(Math.PI * Math.max(0, Math.min(1, t))) - 1) / 2

interface SighPhase { kind: 'in' | 'out' | 'rest'; label: string; dur: number; s0: number; s1: number }
const SIGH_PHASES: SighPhase[] = [
  { kind: 'in',   label: 'inhale',   dur: 1.5, s0: 0.42, s1: 0.78 },
  { kind: 'in',   label: 'top up',   dur: 0.9, s0: 0.78, s1: 1.00 },
  { kind: 'out',  label: 'long out', dur: 5.5, s0: 1.00, s1: 0.42 },
  { kind: 'rest', label: 'rest',     dur: 1.5, s0: 0.42, s1: 0.42 },
]
const SIGH_CYCLE = SIGH_PHASES.reduce((a, p) => a + p.dur, 0)

const PHASE_COL: Record<string, [number, number, number]> = {
  'inhale':   [192, 70, 65],
  'top up':   [192, 70, 65],
  'long out': [266, 52, 62],
  'rest':     [220, 34, 52],
}

interface RNCanvasProps {
  stateRef:      React.MutableRefObject<string>
  scaleRef:      React.MutableRefObject<number>
  phaseLabelRef: React.MutableRefObject<string>
  remainingRef:  React.MutableRefObject<number>
}

interface Particle {
  angle: number; rFrac: number; baseFrac: number
  speed: number; size: number; op: number; twink: number
}

function RightNowCanvas({ stateRef, scaleRef, phaseLabelRef, remainingRef }: RNCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx2 = canvas.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      canvas.width  = Math.round(r.width)  * dpr
      canvas.height = Math.round(r.height) * dpr
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas); resize()

    const N = 48
    const parts: Particle[] = Array.from({ length: N }, (_, i) => {
      const base = 0.30 + Math.random() * 0.25
      return {
        angle:    (i / N) * Math.PI * 2 + Math.random() * 0.6,
        rFrac:    base, baseFrac: base,
        speed:    (0.0035 + Math.random() * 0.005) * (Math.random() < 0.5 ? 1 : -1),
        size:     0.8 + Math.random() * 1.3,
        op:       0.32 + Math.random() * 0.45,
        twink:    Math.random() * Math.PI * 2,
      }
    })

    let curH = 192, curS = 70, curL = 65
    let frame = 0, rafId: number

    const draw = () => {
      frame++
      const sc    = scaleRef.current
      const label = phaseLabelRef.current
      const rem   = remainingRef.current
      const alive = stateRef.current === 'open'

      ctx2.setTransform(dpr, 0, 0, dpr, 0, 0)
      const W = canvas.width / dpr, H = canvas.height / dpr
      ctx2.clearRect(0, 0, W, H)

      if (!alive) { rafId = requestAnimationFrame(draw); return }

      const CX = W * 0.5, CY = H * 0.5
      const HALF = Math.min(W, H) * 0.44
      const tc = PHASE_COL[label] ?? PHASE_COL['inhale']
      curH += (tc[0] - curH) * 0.045
      curS += (tc[1] - curS) * 0.045
      curL += (tc[2] - curL) * 0.045
      const hslA = (a: number) => `hsla(${curH|0},${curS|0}%,${curL|0}%,${a.toFixed(3)})`

      const orbR = HALF * (0.22 + sc * 0.20)

      // Background atmospheric bloom
      const bloomG = ctx2.createRadialGradient(CX, CY, orbR * 0.5, CX, CY, HALF * 0.95)
      bloomG.addColorStop(0, hslA(0.18)); bloomG.addColorStop(0.5, hslA(0.07)); bloomG.addColorStop(1, hslA(0))
      ctx2.beginPath(); ctx2.arc(CX, CY, HALF * 0.95, 0, Math.PI * 2)
      ctx2.fillStyle = bloomG; ctx2.fill()

      // Sacred geometry — two counter-rotating hexagons
      const drawHex = (r: number, rot: number, alpha: number, lw: number) => {
        ctx2.save(); ctx2.globalAlpha = alpha; ctx2.beginPath()
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + rot
          const x = CX + Math.cos(a) * r, y = CY + Math.sin(a) * r
          i === 0 ? ctx2.moveTo(x, y) : ctx2.lineTo(x, y)
        }
        ctx2.closePath(); ctx2.strokeStyle = hslA(1); ctx2.lineWidth = lw; ctx2.stroke(); ctx2.restore()
      }
      drawHex(HALF * 0.72,  frame * 0.0008,  0.055, 0.6)
      drawHex(HALF * 0.44, -frame * 0.0012,  0.070, 0.5)
      drawHex(HALF * 0.28,  frame * 0.0018,  0.055, 0.4)
      ctx2.save(); ctx2.globalAlpha = 0.028
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + frame * 0.0008
        ctx2.beginPath(); ctx2.moveTo(CX, CY)
        ctx2.lineTo(CX + Math.cos(a) * HALF * 0.72, CY + Math.sin(a) * HALF * 0.72)
        ctx2.strokeStyle = hslA(1); ctx2.lineWidth = 0.5; ctx2.stroke()
      }
      ctx2.restore()

      // Countdown arc
      const ringR = HALF * 0.90
      ctx2.beginPath(); ctx2.arc(CX, CY, ringR, 0, Math.PI * 2)
      ctx2.strokeStyle = 'rgba(243,239,230,0.05)'; ctx2.lineWidth = 1; ctx2.stroke()
      if (rem > 0.5) {
        const arcEnd = -Math.PI / 2 + (rem / 60) * Math.PI * 2
        ctx2.save(); ctx2.shadowColor = hslA(0.7); ctx2.shadowBlur = 10
        ctx2.beginPath(); ctx2.arc(CX, CY, ringR, -Math.PI / 2, arcEnd)
        ctx2.strokeStyle = hslA(0.55); ctx2.lineWidth = 1.6; ctx2.stroke(); ctx2.restore()
        ctx2.save(); ctx2.shadowColor = hslA(0.9); ctx2.shadowBlur = 16
        ctx2.beginPath(); ctx2.arc(CX + Math.cos(arcEnd)*ringR, CY + Math.sin(arcEnd)*ringR, 2.8, 0, Math.PI*2)
        ctx2.fillStyle = 'rgba(255,255,255,0.92)'; ctx2.fill(); ctx2.restore()
      }

      // Orbital particles
      const kind = label === 'inhale' || label === 'top up' ? 'in' : label === 'long out' ? 'out' : 'rest'
      parts.forEach(p => {
        const tgt = kind === 'in'  ? p.baseFrac + 0.16
                  : kind === 'out' ? Math.max(orbR / HALF + 0.05, p.baseFrac - 0.09)
                  : p.baseFrac
        p.rFrac += (tgt - p.rFrac) * 0.025; p.angle += p.speed
        const pr = HALF * p.rFrac
        if (pr < orbR + 3) return
        const px = CX + Math.cos(p.angle) * pr, py = CY + Math.sin(p.angle) * pr
        const tw = 0.5 + 0.5 * Math.sin(frame * 0.038 + p.twink)
        const al = p.op * tw
        ctx2.beginPath(); ctx2.arc(px, py, p.size * 3.2, 0, Math.PI * 2)
        ctx2.fillStyle = hslA(al * 0.16); ctx2.fill()
        ctx2.beginPath(); ctx2.arc(px, py, p.size, 0, Math.PI * 2)
        ctx2.fillStyle = `hsla(${(curH+20)|0},88%,91%,${al.toFixed(3)})`; ctx2.fill()
      })

      // Orb halo
      const haloG = ctx2.createRadialGradient(CX, CY, orbR * 0.6, CX, CY, orbR * 2.0)
      haloG.addColorStop(0, hslA(0.30)); haloG.addColorStop(0.5, hslA(0.11)); haloG.addColorStop(1, hslA(0))
      ctx2.beginPath(); ctx2.arc(CX, CY, orbR * 2.0, 0, Math.PI * 2); ctx2.fillStyle = haloG; ctx2.fill()

      // Orb body
      const deepG = ctx2.createRadialGradient(CX, CY, 0, CX, CY, orbR * 1.28)
      deepG.addColorStop(0, hslA(0.35)); deepG.addColorStop(0.55, hslA(0.15)); deepG.addColorStop(1, hslA(0))
      ctx2.beginPath(); ctx2.arc(CX, CY, orbR * 1.28, 0, Math.PI * 2); ctx2.fillStyle = deepG; ctx2.fill()
      const bodyG = ctx2.createRadialGradient(CX - orbR*0.28, CY - orbR*0.28, 0, CX, CY, orbR)
      bodyG.addColorStop(0,    'rgba(255,255,255,0.28)')
      bodyG.addColorStop(0.18, hslA(0.82)); bodyG.addColorStop(0.60, hslA(0.52)); bodyG.addColorStop(1, hslA(0.08))
      ctx2.beginPath(); ctx2.arc(CX, CY, orbR, 0, Math.PI * 2); ctx2.fillStyle = bodyG; ctx2.fill()
      const shimAng = frame * 0.007
      const sX = CX + Math.cos(shimAng) * orbR * 0.32, sY = CY + Math.sin(shimAng) * orbR * 0.24
      const shimG = ctx2.createRadialGradient(sX, sY, 0, sX, sY, orbR * 0.58)
      shimG.addColorStop(0, 'rgba(255,255,255,0.18)'); shimG.addColorStop(1, 'rgba(255,255,255,0)')
      ctx2.beginPath(); ctx2.arc(CX, CY, orbR, 0, Math.PI * 2); ctx2.fillStyle = shimG; ctx2.fill()
      ctx2.save(); ctx2.shadowColor = hslA(0.8); ctx2.shadowBlur = 22
      ctx2.beginPath(); ctx2.arc(CX, CY, orbR, 0, Math.PI * 2)
      ctx2.strokeStyle = hslA(0.42); ctx2.lineWidth = 1.8; ctx2.stroke(); ctx2.restore()

      // Center dot
      ctx2.save(); ctx2.shadowColor = 'rgba(243,239,230,0.8)'; ctx2.shadowBlur = 12
      ctx2.beginPath(); ctx2.arc(CX, CY, 3.2, 0, Math.PI * 2)
      ctx2.fillStyle = 'rgba(243,239,230,0.92)'; ctx2.fill(); ctx2.restore()

      rafId = requestAnimationFrame(draw)
    }
    rafId = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(rafId); ro.disconnect() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <canvas ref={canvasRef} className="rn-canvas" aria-hidden="true"/>
}

export function RightNow() {
  const [state,      setState]      = useState('idle')
  const [phaseLabel, setPhaseLabel] = useState('inhale')
  const [remaining,  setRemaining]  = useState(60)
  const scaleRef      = useRef(0.42)
  const phaseLabelRef = useRef('inhale')
  const remainingRef  = useRef(60)
  const stateRef      = useRef('idle')

  useEffect(() => { stateRef.current = state }, [state])

  const isOverlay = state === 'opening' || state === 'open' || state === 'closing'

  // Breath loop
  useEffect(() => {
    const { setOverride, setBreath } = useMindSpaceStore.getState()
    if (state !== 'open') {
      if (state === 'idle') setOverride(false)
      return
    }
    setOverride(true)
    let raf: number
    const start = performance.now()
    const loop = (now: number) => {
      const elapsed = (now - start) / 1000
      const rem = 60 - elapsed
      remainingRef.current = Math.max(0, rem)
      setRemaining(Math.max(0, rem))
      if (rem <= 0) { setState('closing'); setTimeout(() => setState('idle'), 700); return }
      let acc = 0
      for (const p of SIGH_PHASES) {
        const t = elapsed % SIGH_CYCLE
        if (t < acc + p.dur) {
          const lt = (t - acc) / p.dur
          const sc = p.s0 + (p.s1 - p.s0) * ease(lt)
          scaleRef.current = sc; phaseLabelRef.current = p.label; setPhaseLabel(p.label)
          const norm = (sc - 0.42) / 0.58
          setBreath(
            Math.max(0, Math.min(1, norm)),
            p.kind === 'in' ? 'inhale' : p.kind === 'out' ? 'exhale' : 'hold',
          )
          break
        }
        acc += p.dur
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); setOverride(false) }
  }, [state])

  const open = () => {
    remainingRef.current = 60; scaleRef.current = 0.42; phaseLabelRef.current = 'inhale'
    setRemaining(60); setPhaseLabel('inhale'); setState('opening')
    requestAnimationFrame(() => setState('open'))
  }
  const close = () => { setState('closing'); setTimeout(() => setState('idle'), 700) }

  return (
    <>
      <button className="rn-fab" onClick={open} aria-label="60-second reset">
        <span className="rn-fab-dot"/>
        <span className="rn-fab-text">Right Now</span>
        <span className="rn-fab-sub">60 s</span>
      </button>

      {isOverlay && (
        <div className={'rn-overlay rn-' + state} onClick={close}
          role="dialog" aria-label="60-second physiological sigh reset">
          <div className="rn-stage" onClick={e => e.stopPropagation()}>
            <div className="rn-eyebrow">a sixty-second reset · physiological sigh</div>
            <div className="rn-canvas-wrap">
              <RightNowCanvas
                stateRef={stateRef} scaleRef={scaleRef}
                phaseLabelRef={phaseLabelRef} remainingRef={remainingRef}
              />
            </div>
            <div className="rn-phase">{phaseLabel}</div>
            <div className="rn-time">{Math.ceil(remaining)} seconds remaining</div>
            <div className="rn-hint">
              two short inhales through the nose,<br/>
              then one long exhale through the mouth.<br/>
              <span className="rn-hint-tap">tap anywhere to release</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
