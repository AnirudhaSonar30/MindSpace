// MindSpace — App shell
// All features wired together. Sky always visible. No scrolling.

import React, { useState, useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { useMindSpaceStore } from './store'
import { SkyScene }        from './SkyScene'
import { AtmosphereCanvas, SceneSwitcher } from './Atmosphere'
import { SoundToggle }     from './Sound'
import { CompanionToggle } from './CompanionUI'
import { MoodCheckIn }     from './MoodCheck'
import { RightNow }        from './RightNow'
import { SharedSky }       from './SharedSky'
import { AmbientModes }    from './AmbientModes'
import { WelcomeBack, SceneWhisper } from './Welcome'
import { BreathingLab }    from './BreathingLab'
import { Grounding }       from './Grounding'

/* ── Nav ── */
function Nav() {
  return (
    <nav className="nav">
      <div className="brand">
        <svg className="brand-mark" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="8.2" stroke="currentColor" strokeWidth="0.8" opacity="0.45"/>
          <circle cx="10" cy="10" r="2.0" fill="currentColor"/>
          <path d="M4.8 10 C6.2 7.2 7.4 12.8 10 10 C12.6 7.2 13.8 12.8 15.2 10"
                stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" fill="none" opacity="0.40"/>
        </svg>
        <span>MindSpace</span>
      </div>
      <div className="nav-meta">
        <span className="meta-text">breathing · rest · space</span>
      </div>
    </nav>
  )
}

/* ── Home screen ── */
function HomeScreen() {
  return (
    <div className="hs">
      <h1 className="hs-quiet">a quiet sky<br/>for a loud mind.</h1>
      <div className="hs-hint">choose a practice below</div>
    </div>
  )
}

/* ── Rest screen ── */
function RestScreen() {
  return (
    <div className="rest-screen">
      <div className="rest-eyebrow">let the room come back</div>
      <blockquote className="rest-quote">
        The mind is not <em>elsewhere.</em><br/>
        It is the room you are sitting in,<br/>
        with the lights <em>turned down</em><br/>
        until the small bright wires inside <em>come back.</em>
      </blockquote>
      <div className="rest-attr">— a note left for you</div>
      <p className="rest-hint">
        use the <span>Right Now</span> button — bottom right — for a 60-second reset
      </p>
    </div>
  )
}

/* ── Error boundary ── */
interface FeatureBoundaryProps {
  children?:  React.ReactNode
  fallback?:  React.ReactNode
  onReset?:   () => void
}
interface FeatureBoundaryState { err: Error | null }

class FeatureBoundary extends React.Component<FeatureBoundaryProps, FeatureBoundaryState> {
  constructor(p: FeatureBoundaryProps) { super(p); this.state = { err: null } }
  static getDerivedStateFromError(err: Error) { return { err } }
  componentDidCatch(err: Error, info: React.ErrorInfo) { console.warn('[MindSpace] feature crashed:', err, info) }
  render() {
    if (this.state.err) {
      if (this.props.fallback !== undefined) return this.props.fallback
      return (
        <div className="mode-panel">
          <div style={{
            textAlign: 'center', maxWidth: 460, padding: '0 32px',
            fontFamily: 'var(--serif)', fontStyle: 'italic',
            fontSize: 22, color: 'rgba(243,239,230,0.78)', lineHeight: 1.55,
          }}>
            this practice stumbled. the sky is still here.
            <div style={{
              marginTop: 22, fontFamily: 'var(--mono)', fontSize: 11,
              letterSpacing: '0.26em', textTransform: 'uppercase',
              color: 'rgba(243,239,230,0.45)',
            }}>
              <button
                onClick={() => { this.setState({ err: null }); this.props.onReset?.() }}
                style={{
                  background: 'rgba(243,239,230,0.05)',
                  border: '1px solid rgba(243,239,230,0.20)',
                  color: 'inherit', padding: '10px 20px', borderRadius: 999,
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit',
                  letterSpacing: 'inherit', textTransform: 'inherit',
                }}
              >back home</button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

/* Silently drops any crash — used for ambient/overlay components */
function Silent({ children }: { children: React.ReactNode }) {
  return <FeatureBoundary fallback={null}>{children}</FeatureBoundary>
}

/* ── Mode panel ── */
interface ModePanelProps { mode: string; onExit: () => void }

function ModePanel({ mode, onExit }: ModePanelProps) {
  return (
    <FeatureBoundary onReset={onExit}>
      <div className="mode-panel">
        {mode === 'breathe' && <BreathingLab autoFocus onExit={onExit}/>}
        {mode === 'ground'  && <Grounding/>}
        {mode === 'rest'    && <RestScreen/>}
      </div>
    </FeatureBoundary>
  )
}

/* ── First-visit discovery hints (1.A.6) ── */
function FirstVisitHints() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const key = 'mindspace.hints.v1'
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    const t1 = setTimeout(() => setStep(1), 3200)
    const t2 = setTimeout(() => setStep(2), 5400)
    const t3 = setTimeout(() => setStep(3), 7600)
    const t4 = setTimeout(() => setStep(0), 15000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [])

  if (!step) return null
  return (
    <div className="fv-hints" aria-hidden="true">
      <div className={'fv-hint fv-hint-orb'        + (step >= 1 ? ' fv-on' : '')}>breathe · tap the light</div>
      <div className={'fv-hint fv-hint-scene'       + (step >= 2 ? ' fv-on' : '')}>← change the sky</div>
      <div className={'fv-hint fv-hint-companion'   + (step >= 3 ? ' fv-on' : '')}>reflect with it →</div>
    </div>
  )
}

/* ── Bottom mode navigation ── */
interface ModeNavProps { mode: string; onMode: (id: string) => void; iconOnly: boolean }

function ModeNav({ mode, onMode, iconOnly }: ModeNavProps) {
  const items = [
    { id: 'home',    label: 'home',    glyph: '⌂' },
    { id: 'breathe', label: 'breathe', glyph: '◯' },
    { id: 'ground',  label: 'ground',  glyph: '⬡' },
    { id: 'rest',    label: 'rest',    glyph: '∿' },
  ]
  return (
    <nav className={'mode-nav' + (iconOnly ? ' nav-icons' : '')} aria-label="Practice navigation">
      {items.map(it => (
        <button
          key={it.id}
          className={'mode-btn' + (mode === it.id ? ' active' : '')}
          onClick={() => onMode(it.id)}
        >
          <span className="mode-btn-glyph">{it.glyph}</span>
          <span className="mode-btn-label">{it.label}</span>
        </button>
      ))}
    </nav>
  )
}

// ── Per-mode transition personalities ──────────────────────────────────────
// exit: how the CURRENT mode's content leaves the screen
const EXIT_BY_MODE: Record<string, gsap.TweenVars> = {
  home:    { opacity: 0.05, scale: 0.98, filter: 'blur(2px)',  y:  -6, duration: 0.34, ease: 'power2.in' },
  breathe: { opacity: 0.05, scale: 0.96, filter: 'blur(2px)',  y:   0, duration: 0.36, ease: 'power2.in' },
  ground:  { opacity: 0.05, scale: 1.00, filter: 'blur(0px)',  y:  28, duration: 0.34, ease: 'power2.in' },
  rest:    { opacity: 0.05, scale: 1.00, filter: 'blur(2px)',  y:  -8, duration: 0.40, ease: 'power1.in' },
}
// enter-start: initial state of the NEXT mode's content (pre-positioned before React commits)
const ENTER_START: Record<string, gsap.TweenVars> = {
  home:    { opacity: 0, scale: 0.97, filter: 'blur(2px)',  y:   8 },
  breathe: { opacity: 0, scale: 0.96, filter: 'blur(2px)',  y:   0 },
  ground:  { opacity: 0, scale: 1.00, filter: 'blur(0px)',  y:  42 },
  rest:    { opacity: 0, scale: 1.01, filter: 'blur(2px)',  y: -14 },
}
// enter-end: final state + duration/ease for the NEXT mode's content arriving
const ENTER_END: Record<string, gsap.TweenVars> = {
  home:    { opacity: 1, scale: 1, filter: 'blur(0px)', y: 0, duration: 0.72, ease: 'power3.out' },
  breathe: { opacity: 1, scale: 1, filter: 'blur(0px)', y: 0, duration: 0.80, ease: 'expo.out'   },
  ground:  { opacity: 1, scale: 1, filter: 'blur(0px)', y: 0, duration: 0.75, ease: 'power3.out' },
  rest:    { opacity: 1, scale: 1, filter: 'blur(0px)', y: 0, duration: 1.10, ease: 'power1.out' },
}

/* ── App shell ── */
export default function App() {
  const [mode, setMode]       = useState('home')
  const [iconOnly, setIconOnly] = useState(false)
  const inFlightRef           = useRef(false)
  const pendingRef            = useRef<string | null>(null)

  useEffect(() => {
    const key = 'mindspace.visits'
    const v   = parseInt(localStorage.getItem(key) || '0') + 1
    localStorage.setItem(key, String(v))
    if (v > 3) setIconOnly(true)
  }, [])

  const goMode = (next: string) => {
    if (next === mode) return
    pendingRef.current = next
    if (inFlightRef.current) return

    inFlightRef.current = true
    const exitCfg  = EXIT_BY_MODE[mode]  ?? EXIT_BY_MODE.home
    const startCfg = ENTER_START[next]   ?? ENTER_START.home
    const endCfg   = ENTER_END[next]     ?? ENTER_END.home
    const exitDur  = exitCfg.duration as number
    const enterDur = endCfg.duration as number

    // GSAP timeline: exit current → soft darkness blink → enter next
    const tl = gsap.timeline()
    tl.to('.stage',            exitCfg,                                                         0)
    tl.to('.transition-blink', { opacity: 0.12, duration: exitDur * 0.75, ease: 'power1.in' }, 0)
    tl.to('.transition-blink', { opacity: 0,    duration: enterDur * 0.6, ease: 'power2.out'}, exitDur + 0.04)

    // At peak darkness: swap content and pre-position new panel
    tl.call(() => {
      const m = pendingRef.current ?? 'home'
      gsap.set('.stage', startCfg)
      setMode(m)
      useMindSpaceStore.getState().setMode(m)
      // Give React ~20 ms to commit new children, then animate them in
      // (setTimeout beats requestAnimationFrame in headless/backgrounded tabs)
      setTimeout(() => {
        gsap.to('.stage', {
          ...endCfg,
          clearProps: 'filter',
          onComplete: () => { inFlightRef.current = false },
        })
      }, 20)
    }, [], exitDur)
  }

  return (
    <>
      <SkyScene/>
      <div className="veil"/>
      <div className="grain"/>
      <div className="scene-veil-flash"/>
      {/* soft darkness blink between mode transitions — z-index 4, above stage(3), below nav(60) */}
      <div className="transition-blink" style={{
        position: 'fixed', inset: 0, zIndex: 4,
        background: '#06061a', opacity: 0, pointerEvents: 'none',
      }}/>
      <Nav/>
      <main className="stage">
        {mode === 'home'
          ? <HomeScreen key="home"/>
          : <ModePanel key={mode} mode={mode} onExit={() => goMode('home')}/>
        }
      </main>
      <ModeNav mode={mode} onMode={goMode} iconOnly={iconOnly}/>
      <FirstVisitHints/>

      <Silent><AtmosphereCanvas/></Silent>
      <Silent><SoundToggle/></Silent>
      <Silent><CompanionToggle/></Silent>
      <Silent><MoodCheckIn/></Silent>
      <Silent><RightNow/></Silent>
      <Silent><SharedSky/></Silent>
      <Silent><AmbientModes/></Silent>
      <Silent><WelcomeBack/></Silent>
      <Silent><SceneWhisper/></Silent>
      <Silent><SceneSwitcher/></Silent>
    </>
  )
}
