import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '../_cdn-archive/styles.css'
import '../_cdn-archive/atmosphere.css'
import '../_cdn-archive/ground.css'
import '../_cdn-archive/tools.css'
import '../_cdn-archive/companion.css'
import '../_cdn-archive/moodcheck.css'
import '../_cdn-archive/premium.css'
import '../_cdn-archive/mobile.css'
import './memory'           // side-effect: restores last scene, fires welcome-back event
import './timeofday'        // side-effect: applies time-of-day CSS vars, updates every minute
import { initLoader, initCursor, setupReveals } from './premium'
import { initFrameIntro } from './frameintro'
import App from './App.tsx'

initLoader()
initCursor()
setupReveals()
initFrameIntro()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
