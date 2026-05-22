// MindSpace — Premium motion layer
// Loader choreography, custom cursor, letter-stagger reveals, zen mode.
// All gated by prefers-reduced-motion and pointer:coarse.

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const isTouch = window.matchMedia('(pointer: coarse)').matches

// ── 1. Loader ──────────────────────────────────────────────────────────────
export function initLoader() {
  const loader = document.querySelector('.premium-loader')
  if (!loader) {
    document.body.classList.add('premium-revealed', 'app-ready')
    return
  }

  document.body.classList.add('premium-locked')
  const bar   = loader.querySelector<HTMLElement>('.premium-loader-bar')
  const count = loader.querySelector<HTMLElement>('.premium-loader-count')
  let p = 0
  let finished = false
  let appReady = false
  const startedAt = performance.now()
  const minDur = reducedMotion ? 200 : 900

  const rootEl = document.getElementById('root')
  if (rootEl) {
    const mo = new MutationObserver(() => {
      if (rootEl.children.length > 0) { appReady = true; mo.disconnect() }
    })
    mo.observe(rootEl, { childList: true })
  }

  const dismiss = () => {
    if (finished) return
    finished = true
    if (count) count.textContent = '100'
    if (bar)   bar.style.transform = 'scaleX(1)'
    setTimeout(() => {
      loader.classList.add('done')
      document.body.classList.remove('premium-locked')
      document.body.classList.add('premium-revealed', 'app-ready')
      setTimeout(() => loader.remove(), 1200)
    }, 320)
  }

  const tick = () => {
    if (finished) return
    const elapsed = performance.now() - startedAt
    const ready = appReady && elapsed >= minDur
    const ceiling = (ready || elapsed > 8000) ? 1.0 : 0.88
    const timeTarget = Math.min(ceiling, elapsed / minDur)
    p += (timeTarget - p) * 0.11
    if (bar)   bar.style.transform = `scaleX(${p})`
    if (count) count.textContent = String(Math.floor(p * 100)).padStart(3, '0')
    if (ceiling >= 1.0 && p >= 0.985) {
      dismiss()
    } else {
      requestAnimationFrame(tick)
    }
  }
  requestAnimationFrame(tick)
}

// ── 2. Custom cursor ───────────────────────────────────────────────────────
export function initCursor() {
  if (reducedMotion || isTouch) return

  document.body.classList.add('has-premium-cursor')

  const ring = document.createElement('div')
  ring.className = 'premium-cursor-ring'
  const dot = document.createElement('div')
  dot.className = 'premium-cursor-dot'
  document.body.appendChild(ring)
  document.body.appendChild(dot)

  let mx = window.innerWidth / 2, my = window.innerHeight / 2
  let dx = mx, dy = my, rx = mx, ry = my
  let activeEl: Element | null = null

  window.addEventListener('mousemove', (e) => {
    const px = ((e.clientX / window.innerWidth)  - 0.5).toFixed(4)
    const py = ((e.clientY / window.innerHeight) - 0.5).toFixed(4)
    document.body.style.setProperty('--parallax-x', px)
    document.body.style.setProperty('--parallax-y', py)
    mx = e.clientX; my = e.clientY

    if (activeEl?.matches('[data-magnetic]')) {
      const r = activeEl.getBoundingClientRect()
      const cx = r.left + r.width  / 2
      const cy = r.top  + r.height / 2
      ;(activeEl as HTMLElement).style.transform =
        `translate(${(mx - cx) * 0.20}px, ${(my - cy) * 0.20}px)`
    }
  }, { passive: true })

  const sel = 'a, button, [data-cursor], .lab-cad, .ground-tap, .pill, .practice, .cta'
  document.addEventListener('mouseover', (e) => {
    const el = (e.target as Element).closest?.(sel)
    if (el && el !== activeEl) {
      activeEl = el
      ring.classList.add('on')
      if (el.matches('[data-magnetic]')) {
        ;(el as HTMLElement).style.transition = 'transform 0.45s cubic-bezier(0.16,1,0.3,1)'
      }
    }
  })
  document.addEventListener('mouseout', (e) => {
    const el = (e.target as Element).closest?.(sel)
    if (el && el === activeEl && !el.contains(e.relatedTarget as Node)) {
      if (el.matches('[data-magnetic]')) (el as HTMLElement).style.transform = ''
      activeEl = null
      ring.classList.remove('on')
    }
  })

  const tickCursor = () => {
    dx += (mx - dx) * 0.92; dy += (my - dy) * 0.92
    rx += (mx - rx) * 0.30; ry += (my - ry) * 0.30
    dot.style.transform  = `translate3d(${dx - 3}px, ${dy - 3}px, 0)`
    ring.style.transform = `translate3d(${rx - 18}px, ${ry - 18}px, 0)`
    requestAnimationFrame(tickCursor)
  }
  requestAnimationFrame(tickCursor)

  setTimeout(() => document.body.classList.add('hide-native-cursor'), 250)
  window.addEventListener('mouseleave', () => { dot.classList.add('hidden'); ring.classList.add('hidden') })
  window.addEventListener('mouseenter', () => { dot.classList.remove('hidden'); ring.classList.remove('hidden') })
}

// ── 3. Reveal animations ───────────────────────────────────────────────────
function splitText(el: HTMLElement) {
  if (el.dataset['split'] === '1') return
  el.dataset['split'] = '1'

  interface TextItem { text: string; parent: Node; replace: Node }
  const items: TextItem[] = []
  const walk = (node: Node) => {
    if (node.nodeType === 3) {
      items.push({ text: node.nodeValue ?? '', parent: node.parentNode!, replace: node })
    } else if (node.nodeType === 1 && !(node as Element).classList.contains('no-split')) {
      Array.from(node.childNodes).forEach(walk)
    }
  }
  walk(el)

  let charIndex = 0
  items.forEach(({ text, parent, replace }) => {
    const frag = document.createDocumentFragment()
    text.split(/(\s+)/).forEach((w) => {
      if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return }
      const wordWrap = document.createElement('span')
      wordWrap.className = 'rt-word'
      for (const ch of w) {
        const m = document.createElement('span')
        m.className = 'rt-char'
        const inner = document.createElement('span')
        inner.className = 'rt-inner'
        inner.style.transitionDelay = (charIndex * 0.028) + 's'
        inner.textContent = ch
        m.appendChild(inner)
        wordWrap.appendChild(m)
        charIndex++
      }
      frag.appendChild(wordWrap)
    })
    parent.replaceChild(frag, replace)
  })
  el.classList.add('rt-ready')
}

export function setupReveals() {
  if (reducedMotion) {
    document.querySelectorAll('[data-reveal-text], [data-reveal-el]')
      .forEach((el) => el.classList.add('in'))
    return
  }
  document.querySelectorAll<HTMLElement>('[data-reveal-text]').forEach(splitText)
  const all = document.querySelectorAll('[data-reveal-text], [data-reveal-el]')
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target) }
    })
  }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' })
  all.forEach((el) => io.observe(el))
}

// ── 4. Zen mode ────────────────────────────────────────────────────────────
export function initZenMode() {
  let zenTimer: ReturnType<typeof setTimeout>
  const ZEN_DELAY = 9000
  const resetZen = () => {
    document.body.classList.remove('zen-mode')
    clearTimeout(zenTimer)
    zenTimer = setTimeout(() => document.body.classList.add('zen-mode'), ZEN_DELAY)
  }
  ;['mousemove', 'mousedown', 'scroll', 'keydown', 'touchstart', 'click']
    .forEach((ev) => window.addEventListener(ev, resetZen, { passive: true }))
  resetZen()
}
