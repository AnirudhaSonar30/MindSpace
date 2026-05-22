// MindSpace — App shell
// All features wired together. Sky always visible. No scrolling.

import React, { useState, useRef } from 'react'
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

/* ── Sacred geometry mandala ── */
function Mandala() {
  const dots12 = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2
    return <circle key={i} cx={100 + 88 * Math.cos(a)} cy={100 + 88 * Math.sin(a)} r="1.8" fill="currentColor" opacity="0.55"/>
  })
  const spokes = Array.from({ length: 6 }, (_, i) => {
    const a1 = (i / 6) * Math.PI * 2, a2 = a1 + Math.PI
    return <line key={i} x1={100+88*Math.cos(a1)} y1={100+88*Math.sin(a1)} x2={100+88*Math.cos(a2)} y2={100+88*Math.sin(a2)} stroke="currentColor" strokeWidth="0.4" opacity="0.20"/>
  })
  const vesicaPetals = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2
    return <circle key={i} cx={100+56*Math.cos(a)} cy={100+56*Math.sin(a)} r="24" fill="none" stroke="currentColor" strokeWidth="0.45" opacity="0.18"/>
  })
  const innerPetals = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2
    return <circle key={i} cx={100+26*Math.cos(a)} cy={100+26*Math.sin(a)} r="13" fill="none" stroke="currentColor" strokeWidth="0.45" opacity="0.28"/>
  })
  return (
    <svg className="hs-mandala" viewBox="0 0 200 200" aria-hidden="true">
      <g className="mandala-outer">{dots12}{spokes}
        <circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.38"/>
      </g>
      <g className="mandala-mid">{vesicaPetals}
        <circle cx="100" cy="100" r="56" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.30"/>
      </g>
      <g className="mandala-inner">{innerPetals}
        <circle cx="100" cy="100" r="26" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.42"/>
      </g>
      <circle cx="100" cy="100" r="2.8" fill="currentColor" opacity="0.55"/>
    </svg>
  )
}

/* ── Home screen ── */
function HomeScreen() {
  return (
    <div className="hs">
      <Mandala/>
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

/* ── Bottom mode navigation ── */
interface ModeNavProps { mode: string; onMode: (id: string) => void }

function ModeNav({ mode, onMode }: ModeNavProps) {
  const items = [
    { id: 'home',    label: 'home',    glyph: '⌂' },
    { id: 'breathe', label: 'breathe', glyph: '◯' },
    { id: 'ground',  label: 'ground',  glyph: '⬡' },
    { id: 'rest',    label: 'rest',    glyph: '∿' },
  ]
  return (
    <nav className="mode-nav" aria-label="Practice navigation">
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

/* ── App shell ── */
export default function App() {
  const [mode,    setMode]    = useState('home')
  const [leaving, setLeaving] = useState(false)
  const pendingRef = useRef<string | null>(null)

  const goMode = (next: string) => {
    if (next === mode) return
    if (leaving) { pendingRef.current = next; return }
    pendingRef.current = next
    setLeaving(true)
    const veil = document.querySelector('.veil') as HTMLElement | null
    if (veil) { veil.classList.remove('mode-flash'); void veil.offsetWidth; veil.classList.add('mode-flash') }
    setTimeout(() => {
      const m = pendingRef.current ?? 'home'
      setMode(m); setLeaving(false)
      useMindSpaceStore.getState().setMode(m)
    }, 420)
  }

  return (
    <>
      <SkyScene/>
      <Nav/>
      <main className={'stage' + (leaving ? ' stage-leaving' : '')}>
        {mode === 'home'
          ? <HomeScreen key="home"/>
          : <ModePanel key={mode} mode={mode} onExit={() => goMode('home')}/>
        }
      </main>
      <ModeNav mode={mode} onMode={goMode}/>

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
