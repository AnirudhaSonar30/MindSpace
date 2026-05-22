// MindSpace — Frame intro player
// Plays a pre-rendered frame sequence as a cinematic sky awakening when the
// loader exits, bridging it to the live Three.js scene.
// If no frames/ folder exists next to the app, silently skips.

const FRAME_DIR = 'frames/'
const framePath = (n: number) => FRAME_DIR + 'frame_' + String(n).padStart(3, '0') + '.jpg'
const FPS = 24
const FADE_MS = 800

function initFrameIntro() {
  const probe = new Image()
  probe.onload  = () => loadSequence()
  probe.onerror = () => { /* no frames — silent skip */ }
  probe.src = framePath(1)
}

function loadSequence() {
  const images: HTMLImageElement[] = []
  let total = 0
  let loaded = 0
  let started = false

  const canvas = document.createElement('canvas')
  canvas.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:9998',
    'width:100vw', 'height:100vh',
    'pointer-events:none', 'opacity:0',
    `transition:opacity ${FADE_MS}ms ease`, 'background:#000',
  ].join(';')
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')!

  let frameIdx = 0
  let lastFrameAt = 0
  let rafId = 0
  const frameDur = 1000 / FPS

  function tryLoad(n: number) {
    if (n > 300) return
    const img = new Image()
    img.onload = () => {
      images[n - 1] = img
      loaded++
      total = Math.max(total, n)
      tryLoad(n + 1)
      if (loaded >= 2) maybeStart()
    }
    img.onerror = () => { /* sequence ended */ }
    img.src = framePath(n)
  }

  function maybeStart() {
    if (started) return
    const waitForReady = setInterval(() => {
      if (document.body.classList.contains('premium-revealed')) {
        clearInterval(waitForReady)
        startPlay()
      }
    }, 50)
  }

  function startPlay() {
    started = true
    canvas.style.opacity = '1'
    resize()
    window.addEventListener('resize', resize)
    rafId = requestAnimationFrame(draw)
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width  = window.innerWidth  * dpr
    canvas.height = window.innerHeight * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function draw(now: number) {
    if (now - lastFrameAt >= frameDur) {
      lastFrameAt = now
      const img = images[frameIdx]
      if (img) {
        const cw = window.innerWidth, ch = window.innerHeight
        const iw = img.naturalWidth  || img.width
        const ih = img.naturalHeight || img.height
        const scale = Math.max(cw / iw, ch / ih)
        const sw = iw * scale, sh = ih * scale
        ctx.clearRect(0, 0, cw, ch)
        ctx.drawImage(img, (cw - sw) / 2, (ch - sh) / 2, sw, sh)
      }
      frameIdx++
      if (frameIdx >= total && total > 0) { fadeOut(); return }
    }
    rafId = requestAnimationFrame(draw)
  }

  function fadeOut() {
    cancelAnimationFrame(rafId)
    canvas.style.opacity = '0'
    setTimeout(() => {
      canvas.remove()
      window.removeEventListener('resize', resize)
    }, FADE_MS + 100)
  }

  tryLoad(1)
}

export { initFrameIntro }
