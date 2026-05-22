// MindSpace — 5-4-3-2-1 Grounding practice
// Cinematic sense-by-sense grounding with atmospheric canvas.

import { useState, useEffect, useRef, useCallback } from 'react'

interface GroundStep {
  n: number; sense: string; word: string; hint: string
  color: [number, number, number]; glyph: string
}

const GROUND_STEPS: GroundStep[] = [
  { n: 5, sense: 'see',   word: 'five',  hint: 'look around. let your eyes settle on each one in turn.', color: [192, 56, 70], glyph: 'eye'  },
  { n: 4, sense: 'hear',  word: 'four',  hint: 'close your eyes if you like. listen further than the room.', color: [220, 36, 64], glyph: 'ear'  },
  { n: 3, sense: 'touch', word: 'three', hint: 'the chair under you. the floor. your own hands.', color: [40,  70, 70], glyph: 'hand' },
  { n: 2, sense: 'smell', word: 'two',   hint: 'breathe in slowly. notice what the air carries.', color: [320, 40, 68], glyph: 'air'  },
  { n: 1, sense: 'taste', word: 'one',   hint: 'your mouth, your tongue. whatever is there.', color: [10,  60, 68], glyph: 'drop' },
]

/* ============================================================
   Sense SVG glyphs
   ============================================================ */
interface SenseGlyphProps { kind: string; breath: number }

function SenseGlyph({ kind, breath }: SenseGlyphProps) {
  const s       = 220
  const expand  = 1 + breath * 0.04
  const op      = 0.55 + breath * 0.25
  const common: React.SVGProps<SVGGElement> = {
    stroke: 'currentColor', fill: 'none',
    strokeWidth: 0.9, strokeLinecap: 'round',
  }
  return (
    <svg
      className="ground-sense-glyph"
      width={s} height={s} viewBox="0 0 100 100"
      style={{ opacity: op, transform: `scale(${expand})` }}
      aria-hidden="true"
    >
      {kind === 'eye' && (
        <g {...common}>
          <path d="M10 50 Q50 18 90 50 Q50 82 10 50 Z"/>
          <circle cx="50" cy="50" r="12"/>
          <circle cx="50" cy="50" r="4.5" fill="currentColor" stroke="none"/>
          <circle cx="50" cy="50" r="22" opacity="0.35"/>
        </g>
      )}
      {kind === 'ear' && (
        <g {...common}>
          <path d="M50 22 Q70 22 70 48 Q70 64 56 64 Q50 64 50 72 Q50 80 42 80 Q34 80 32 70"/>
          <path d="M50 36 Q60 36 60 48 Q60 56 52 56" opacity="0.6"/>
          <path d="M22 50 Q14 50 14 60" opacity="0.45"/>
          <path d="M16 38 Q8 42 8 50" opacity="0.30"/>
        </g>
      )}
      {kind === 'hand' && (
        <g {...common}>
          <path d="M36 78 L36 44 Q36 40 40 40 Q44 40 44 44 L44 30 Q44 26 48 26 Q52 26 52 30 L52 44 Q52 28 56 28 Q60 28 60 32 L60 46 Q60 34 64 34 Q68 34 68 38 L68 60 Q68 78 56 78 Z"/>
          <path d="M36 70 Q30 68 28 62" opacity="0.5"/>
        </g>
      )}
      {kind === 'air' && (
        <g {...common}>
          <path d="M14 36 Q40 30 60 36 Q78 40 86 32"/>
          <path d="M14 50 Q40 44 60 50 Q78 54 86 46" opacity="0.7"/>
          <path d="M14 64 Q40 58 60 64 Q78 68 86 60" opacity="0.45"/>
          <circle cx="74" cy="34" r="1.3" fill="currentColor" stroke="none"/>
          <circle cx="68" cy="48" r="1.0" fill="currentColor" stroke="none"/>
        </g>
      )}
      {kind === 'drop' && (
        <g {...common}>
          <path d="M50 22 Q66 50 66 64 Q66 78 50 78 Q34 78 34 64 Q34 50 50 22 Z"/>
          <path d="M50 50 Q56 56 56 64" opacity="0.45"/>
        </g>
      )}
    </svg>
  )
}

/* ============================================================
   Grounding
   ============================================================ */
interface RippleItem { id: number; x: number; y: number; born: number }

interface GParticle {
  x: number; y: number; r: number
  vx: number; vy: number; op: number; ph: number
}

export function Grounding() {
  const [idx,          setIdx]          = useState(0)
  const [count,        setCount]        = useState(0)
  const [done,         setDone]         = useState(false)
  const [transitioning,setTransitioning]= useState(false)
  const [ripples,      setRipples]      = useState<RippleItem[]>([])
  const [breath,       setBreath]       = useState(0)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const step = GROUND_STEPS[idx]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      canvas.width  = Math.round(r.width)  * dpr
      canvas.height = Math.round(r.height) * dpr
    }
    const ro = new ResizeObserver(resize); ro.observe(canvas); resize()

    const N = 60
    const particles: GParticle[] = Array.from({ length: N }, () => ({
      x:  Math.random(), y:  Math.random(),
      r:  0.5 + Math.random() * 1.6,
      vx: (Math.random() - 0.5) * 0.0006,
      vy: (Math.random() - 0.5) * 0.0006,
      op: 0.10 + Math.random() * 0.40,
      ph: Math.random() * Math.PI * 2,
    }))

    let curH = 200, curS = 50, curL = 70
    let raf: number
    let frame = 0
    let bx = 0

    const draw = () => {
      frame++
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const W = canvas.width / dpr, H = canvas.height / dpr
      ctx.clearRect(0, 0, W, H)

      const tc  = GROUND_STEPS[idx]?.color ?? GROUND_STEPS[0].color
      curH += (tc[0] - curH) * 0.020
      curS += (tc[1] - curS) * 0.020
      curL += (tc[2] - curL) * 0.020
      const hslA = (a: number) => `hsla(${curH|0},${curS|0}%,${curL|0}%,${a.toFixed(3)})`

      bx += 0.01
      const sineBreath = 0.5 + 0.5 * Math.sin(bx)
      setBreath(prev => prev + (sineBreath - prev) * 0.05)

      const bloom = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.7)
      bloom.addColorStop(0,   hslA(0.16)); bloom.addColorStop(0.5, hslA(0.06)); bloom.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = bloom; ctx.fillRect(0, 0, W, H)

      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0
        if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0
        const tw = 0.5 + 0.5 * Math.sin(frame * 0.018 + p.ph)
        ctx.beginPath()
        ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2)
        ctx.fillStyle = hslA(p.op * tw * 0.6); ctx.fill()
      })

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [idx]) // eslint-disable-line react-hooks/exhaustive-deps

  const addRipple = useCallback((x: number, y: number) => {
    const id = Date.now() + Math.random()
    setRipples(r => [...r.slice(-6), { id, x, y, born: performance.now() }])
    setTimeout(() => setRipples(r => r.filter(item => item.id !== id)), 1300)
  }, [])

  const tap = useCallback((e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement> | null) => {
    if (done || transitioning) return
    let x = 0.5, y = 0.5
    const target = e?.currentTarget
    if (e && target && 'clientX' in e) {
      const r = target.getBoundingClientRect()
      x = (e.clientX - r.left) / r.width
      y = (e.clientY - r.top)  / r.height
    }
    addRipple(x, y)
    setCount(c => {
      const next = c + 1
      if (next >= step.n) {
        setTransitioning(true)
        setTimeout(() => {
          if (idx + 1 >= GROUND_STEPS.length) {
            setDone(true); setTransitioning(false)
          } else {
            setIdx(idx + 1); setCount(0); setTransitioning(false)
          }
        }, 1300)
      }
      return next
    })
  }, [done, transitioning, idx, step.n, addRipple])

  const reset = () => {
    setIdx(0); setCount(0); setDone(false)
    setTransitioning(false); setRipples([])
  }

  const totalNoticed = 5 + 4 + 3 + 2 + 1

  return (
    <div className={'ground ground-rich ground-step-' + (step?.glyph ?? 'eye') + (done ? ' is-done' : '')}>
      <canvas ref={canvasRef} className="ground-canvas" aria-hidden="true"/>

      <div className="ground-progress-rich">
        {GROUND_STEPS.map((g, i) => (
          <div key={i} className={
            'ground-step-tag' +
            ((done || i < idx)     ? ' done'   : '') +
            ((!done && i === idx)  ? ' active' : '')
          }>
            <span className="ground-step-n">{g.n}</span>
            <span className="ground-step-sense">{g.sense}</span>
          </div>
        ))}
      </div>

      {done ? (
        <div className="ground-done-rich">
          <div className="ground-done-eyebrow">{totalNoticed} small returns</div>
          <h2 className="ground-done-title">You're <span className="it">back.</span></h2>
          <p className="ground-done-sub">
            sit with this for a moment.<br/>
            notice how the room feels different than it did.
          </p>
          <div className="ground-done-constellation" aria-hidden="true">
            {GROUND_STEPS.flatMap((g, gi) =>
              Array.from({ length: g.n }, (_, i) => (
                <span
                  key={gi + '-' + i}
                  className="ground-done-star"
                  style={{
                    animationDelay: (gi * 0.18 + i * 0.06) + 's',
                    background: `hsl(${g.color[0]},${g.color[1]}%,80%)`,
                  }}
                />
              ))
            )}
          </div>
          <button className="ground-cta" onClick={reset}>
            <span>begin again</span><span className="arrow">→</span>
          </button>
        </div>
      ) : (
        <div className="ground-stage-rich">
          <SenseGlyph kind={step.glyph} breath={breath}/>

          <div className={'ground-headline' + (transitioning ? ' fading' : '')} key={'h' + idx}>
            <span className="ground-num-big">{step.word}</span>
            <span className="ground-sub">things you can</span>
            <span className="ground-sense-big it">{step.sense}</span>
          </div>

          <div
            className="ground-tap-zone-rich"
            onClick={tap}
            role="button"
            tabIndex={0}
            onKeyDown={e => (e.key === ' ' || e.key === 'Enter') && tap(e)}
          >
            <div className="ground-dots-rich">
              {Array.from({ length: step.n }, (_, i) => (
                <div key={i} className={'ground-dot-rich ' + (i < count ? 'filled' : '')}>
                  <span className="ground-dot-n">{step.n - i}</span>
                </div>
              ))}
            </div>
            {ripples.map(r => (
              <div
                key={r.id}
                className="ground-ripple-rich"
                style={{ left: (r.x * 100) + '%', top: (r.y * 100) + '%' }}
                aria-hidden="true"
              />
            ))}
            <div className="ground-tap-hint">tap each time you notice one</div>
          </div>

          <p className={'ground-hint-rich' + (transitioning ? ' fading' : '')} key={'p' + idx}>
            {step.hint}
          </p>
        </div>
      )}
    </div>
  )
}
