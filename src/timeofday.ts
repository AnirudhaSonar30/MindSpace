// MindSpace — Adaptive Time-of-Day
// Sets body class + CSS variables based on local clock.
// Updates every minute. Fires 'mindspace:timeofday' event.

interface Period {
  id: string
  hours: number[]
  cssVars: Record<string, string>
  copy: { navDate: string; greeting: string; recommend: string }
}

const PERIODS: Period[] = [
  {
    id: 'dawn',
    hours: [5, 6, 7],
    cssVars: {
      '--tod-hue': '38',
      '--tod-tint': 'rgba(255, 200, 120, 0.08)',
      '--tod-veil': 'rgba(180, 100, 40, 0.06)',
    },
    copy: { navDate: 'early morning', greeting: 'a quiet start', recommend: 'breathe' },
  },
  {
    id: 'day',
    hours: [8, 9, 10, 11, 12, 13, 14, 15, 16],
    cssVars: {
      '--tod-hue': '220',
      '--tod-tint': 'rgba(180, 210, 255, 0.04)',
      '--tod-veil': 'rgba(100, 140, 220, 0.04)',
    },
    copy: { navDate: 'afternoon', greeting: 'mid-day stillness', recommend: 'breathe' },
  },
  {
    id: 'dusk',
    hours: [17, 18, 19],
    cssVars: {
      '--tod-hue': '22',
      '--tod-tint': 'rgba(255, 140, 60, 0.09)',
      '--tod-veil': 'rgba(200, 80, 40, 0.07)',
    },
    copy: { navDate: 'this evening', greeting: 'the day letting go', recommend: 'ground' },
  },
  {
    id: 'night',
    hours: [20, 21, 22, 23, 0, 1, 2, 3, 4],
    cssVars: {
      '--tod-hue': '260',
      '--tod-tint': 'rgba(80, 60, 180, 0.07)',
      '--tod-veil': 'rgba(40, 20, 100, 0.05)',
    },
    copy: { navDate: 'tonight', greeting: 'the quiet hours', recommend: 'drift' },
  },
]

function getCurrentPeriod(): Period {
  const h = new Date().getHours()
  return PERIODS.find((p) => p.hours.includes(h)) ?? PERIODS[1]
}

function applyPeriod(period: Period) {
  PERIODS.forEach((p) => document.body.classList.remove('time-' + p.id))
  document.body.classList.add('time-' + period.id)

  const root = document.documentElement
  Object.entries(period.cssVars).forEach(([k, v]) => root.style.setProperty(k, v))

  const metaEl = document.querySelector('.meta-text')
  if (metaEl) {
    const d = new Date()
    const day   = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year  = String(d.getFullYear()).slice(2)
    metaEl.textContent = `${day} · ${month} · ${year} — ${period.copy.navDate}`
  }

  window.dispatchEvent(new CustomEvent('mindspace:timeofday', { detail: period }))
}

function tick() { applyPeriod(getCurrentPeriod()) }

tick()
setInterval(tick, 60 * 1000)

export { getCurrentPeriod, PERIODS }
export type { Period }
