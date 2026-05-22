// MindSpace — Welcome Back + Scene Whisper
// WelcomeBack: fires once for returning visitors, shows their last scene.
// SceneWhisper: shows a one-line story on each scene change.

import { useState, useEffect, useRef } from 'react'
import { sceneEngine } from './scenes'

interface WelcomeBackDetail {
  sceneLabel: string
  sceneId:    string
  when:       string
  visits:     number
}

export function WelcomeBack() {
  const [info, setInfo] = useState<WelcomeBackDetail | null>(null)
  const dismissT = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      setInfo((e as CustomEvent<WelcomeBackDetail>).detail)
      if (dismissT.current) clearTimeout(dismissT.current)
      dismissT.current = setTimeout(() => setInfo(null), 9000)
    }
    window.addEventListener('mindspace:welcome-back', handler)
    return () => {
      window.removeEventListener('mindspace:welcome-back', handler)
      if (dismissT.current) clearTimeout(dismissT.current)
    }
  }, [])

  if (!info) return null

  return (
    <div className="wb-card" role="status">
      <div className="wb-card-inner">
        <div className="wb-eyebrow">welcome back</div>
        <div className="wb-line">
          you were in <span className="wb-scene">{info.sceneLabel}</span>
          <span className="wb-when"> {info.when}</span>
        </div>
        <button className="wb-close" onClick={() => setInfo(null)} aria-label="dismiss">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

export function SceneWhisper() {
  const [text, setText] = useState<string | null>(null)
  const dismissT = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstRef = useRef(true)

  useEffect(() => {
    // Show the current scene's story once on mount, after a brief delay
    const initial = sceneEngine.getScene()
    const phrase = initial.story || initial.whispers[0]
    if (phrase) {
      const id = setTimeout(() => {
        if (!firstRef.current) return
        setText(phrase)
        if (dismissT.current) clearTimeout(dismissT.current)
        dismissT.current = setTimeout(() => setText(null), 8000)
        firstRef.current = false
      }, 3600)
      return () => clearTimeout(id)
    }
  }, [])

  useEffect(() => {
    const off = sceneEngine.onChange((scene) => {
      firstRef.current = false
      const pool: string[] = []
      if (scene.story)    pool.push(scene.story)
      if (scene.whispers) pool.push(...scene.whispers)
      if (!pool.length) return
      const pick = pool[Math.floor(Math.random() * pool.length)]
      setText(pick)
      if (dismissT.current) clearTimeout(dismissT.current)
      dismissT.current = setTimeout(() => setText(null), 7400)
    })
    return () => {
      off()
      if (dismissT.current) clearTimeout(dismissT.current)
    }
  }, [])

  if (!text) return null
  return (
    <div className="whisper" key={text} role="status">
      <span className="whisper-glyph">·</span>
      <span className="whisper-text">{text}</span>
    </div>
  )
}
