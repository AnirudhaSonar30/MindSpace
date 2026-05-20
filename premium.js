/* MindSpace — premium motion layer
   --------------------------------------------------------------
   Self-contained, vanilla JS. Loaded BEFORE app.jsx so the loader
   is visible from first paint. Provides:

     1. Page-load choreography (brand → chrome → stage)
     2. Lenis-style momentum scroll (lerps native window.scrollY)
     3. Custom cursor (dot + ring + magnetic targets)
     4. Letter-stagger reveals on [data-reveal-text]
     5. Block reveals on [data-reveal-el]

   All gated by prefers-reduced-motion and pointer:coarse.
*/

(function () {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(pointer: coarse)').matches;

  /* ============================================================
     1) Loader — ceremonial entrance
     ============================================================ */
  const loader = document.querySelector('.premium-loader');
  if (loader) {
    document.body.classList.add('premium-locked');
    const bar   = loader.querySelector('.premium-loader-bar');
    const count = loader.querySelector('.premium-loader-count');
    let p = 0;
    let finished = false;
    let pageLoaded = document.readyState === 'complete';
    const startedAt = performance.now();
    const minDur = reducedMotion ? 200 : 1000;

    /* Wait for ALL scripts (including CDN libs + Babel transpile) to finish.
       The window 'load' event fires after every resource is fully parsed.  */
    if (!pageLoaded) window.addEventListener('load', () => { pageLoaded = true; });

    const dismiss = () => {
      if (finished) return;
      finished = true;
      if (count) count.textContent = '100';
      if (bar)   bar.style.transform = 'scaleX(1)';
      setTimeout(() => {
        loader.classList.add('done');
        document.body.classList.remove('premium-locked');
        document.body.classList.add('premium-revealed', 'app-ready');
        setTimeout(() => loader.remove(), 1200);
      }, 320);
    };

    const tick = () => {
      if (finished) return;
      const elapsed = performance.now() - startedAt;
      /* Hold at 88% until the page is actually loaded — then race to 100.
         Hard-cap at 5s so a stalled CDN doesn't freeze the loader forever. */
      const ceiling = (pageLoaded || elapsed > 5000) ? 1.0 : 0.88;
      const timeTarget = Math.min(ceiling, elapsed / minDur);
      p += (timeTarget - p) * 0.11;
      if (bar)   bar.style.transform = `scaleX(${p})`;
      if (count) count.textContent = String(Math.floor(p * 100)).padStart(3, '0');
      if (ceiling >= 1.0 && p >= 0.985) {
        dismiss();
      } else {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  } else {
    document.body.classList.add('premium-revealed', 'app-ready');
  }

  /* ============================================================
     2) Momentum scroll — lerps native scroll target
     We intercept wheel events, maintain a virtual target, and
     window.scrollTo to a lerped value each frame. Native fixed
     positioning still works (we're not transforming the body).
     ============================================================ */
  if (!reducedMotion && !isTouch) {
    let target = window.scrollY;
    let current = window.scrollY;
    let running = false;
    let lastNativeScrollAt = 0;

    const maxY = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

    const loop = () => {
      const diff = target - current;
      if (Math.abs(diff) < 0.4) {
        current = target;
        window.scrollTo(0, current);
        running = false;
        return;
      }
      // Slightly slower lerp = silkier glide
      current += diff * 0.105;
      window.scrollTo(0, current);
      requestAnimationFrame(loop);
    };
    const start = () => { if (!running) { running = true; requestAnimationFrame(loop); } };

    window.addEventListener('wheel', (e) => {
      // Let scrollable inner regions handle their own wheel
      const path = e.composedPath ? e.composedPath() : [];
      for (const el of path) {
        if (!(el instanceof Element)) continue;
        if (el === document.body || el === document.documentElement) break;
        const style = getComputedStyle(el);
        if ((style.overflowY === 'auto' || style.overflowY === 'scroll')
            && el.scrollHeight > el.clientHeight) return;
      }
      e.preventDefault();
      target = Math.max(0, Math.min(maxY(), target + e.deltaY * 1.15));
      start();
    }, { passive: false });

    // Sync target on programmatic scroll (anchor jumps, keyboard, etc.)
    window.addEventListener('scroll', () => {
      if (!running) {
        target = window.scrollY;
        current = window.scrollY;
      }
      lastNativeScrollAt = performance.now();
    }, { passive: true });

    // Anchor links: smooth-glide via target instead of native jump
    document.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href').slice(1);
      if (!id) return;
      const dest = document.getElementById(id);
      if (!dest) return;
      e.preventDefault();
      target = Math.max(0, Math.min(maxY(), dest.getBoundingClientRect().top + window.scrollY - 40));
      start();
    });

    // Keep arrow / pgdn working
    window.addEventListener('keydown', (e) => {
      const step = window.innerHeight * 0.9;
      let d = 0;
      if (e.key === 'PageDown' || e.key === ' ') d =  step;
      else if (e.key === 'PageUp')                d = -step;
      else if (e.key === 'End')   { target = maxY(); start(); return; }
      else if (e.key === 'Home')  { target = 0;       start(); return; }
      else if (e.key === 'ArrowDown') d =  60;
      else if (e.key === 'ArrowUp')   d = -60;
      if (d !== 0) {
        target = Math.max(0, Math.min(maxY(), target + d));
        start();
      }
    });
  }

  /* ============================================================
     3) Custom cursor — dot + ring + magnetic targets
     ============================================================ */
  if (!reducedMotion && !isTouch) {
    document.body.classList.add('has-premium-cursor');

    const ring = document.createElement('div');
    ring.className = 'premium-cursor-ring';
    const dot  = document.createElement('div');
    dot.className = 'premium-cursor-dot';
    document.body.appendChild(ring);
    document.body.appendChild(dot);

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let dx = mx, dy = my;
    let rx = mx, ry = my;
    let activeEl = null;
    let activeRect = null;
    let pulled = { x: 0, y: 0 };

    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;

      // Magnetic pull when hovering a [data-magnetic] element
      if (activeEl && activeEl.matches('[data-magnetic]')) {
        const r = activeEl.getBoundingClientRect();
        const cx = r.left + r.width  / 2;
        const cy = r.top  + r.height / 2;
        const px = (mx - cx) * 0.20;
        const py = (my - cy) * 0.20;
        activeEl.style.transform = `translate(${px}px, ${py}px)`;
        pulled = { x: px, y: py };
      }
    }, { passive: true });

    const interactiveSel = 'a, button, [data-cursor], .lab-cad, .ground-tap, .pill, .practice, .cta';
    document.addEventListener('mouseover', (e) => {
      const el = e.target.closest && e.target.closest(interactiveSel);
      if (el && el !== activeEl) {
        activeEl = el;
        ring.classList.add('on');
        if (el.matches('[data-magnetic]')) {
          el.style.transition = 'transform 0.45s cubic-bezier(0.16,1,0.3,1)';
        }
      }
    });
    document.addEventListener('mouseout', (e) => {
      const el = e.target.closest && e.target.closest(interactiveSel);
      if (el && el === activeEl && !el.contains(e.relatedTarget)) {
        if (el.matches('[data-magnetic]')) {
          el.style.transform = '';
        }
        activeEl = null;
        ring.classList.remove('on');
      }
    });

    const tick = () => {
      dx += (mx - dx) * 0.42;
      dy += (my - dy) * 0.42;
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      dot.style.transform  = `translate3d(${dx - 3}px, ${dy - 3}px, 0)`;
      ring.style.transform = `translate3d(${rx - 18}px, ${ry - 18}px, 0)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // Hide native cursor only after the cursor element catches up
    setTimeout(() => document.body.classList.add('hide-native-cursor'), 250);

    // Hide when leaving the window
    window.addEventListener('mouseleave', () => { dot.classList.add('hidden'); ring.classList.add('hidden'); });
    window.addEventListener('mouseenter', () => { dot.classList.remove('hidden'); ring.classList.remove('hidden'); });
  }

  /* ============================================================
     4) Letter-stagger reveals on [data-reveal-text]
     Wraps each character in a span pair (mask + inner).
     ============================================================ */
  function splitText(el) {
    if (el.dataset.split === '1') return;
    el.dataset.split = '1';
    const walk = (node, out) => {
      if (node.nodeType === 3) {
        out.push({ text: node.nodeValue, parent: node.parentNode, replace: node });
      } else if (node.nodeType === 1 && !node.classList.contains('no-split')) {
        const kids = Array.from(node.childNodes);
        kids.forEach((k) => walk(k, out));
      }
    };
    const items = [];
    walk(el, items);
    let charIndex = 0;
    items.forEach(({ text, parent, replace }) => {
      const frag = document.createDocumentFragment();
      // Split on word boundaries, preserve words intact for line wrapping
      const words = text.split(/(\s+)/);
      words.forEach((w) => {
        if (/^\s+$/.test(w)) {
          frag.appendChild(document.createTextNode(w));
          return;
        }
        const wordWrap = document.createElement('span');
        wordWrap.className = 'rt-word';
        for (const ch of w) {
          const m = document.createElement('span');
          m.className = 'rt-char';
          const inner = document.createElement('span');
          inner.className = 'rt-inner';
          inner.style.transitionDelay = (charIndex * 0.028) + 's';
          inner.textContent = ch;
          m.appendChild(inner);
          wordWrap.appendChild(m);
          charIndex++;
        }
        frag.appendChild(wordWrap);
      });
      parent.replaceChild(frag, replace);
    });
    el.classList.add('rt-ready');
  }

  function setupReveals() {
    if (reducedMotion) {
      document.querySelectorAll('[data-reveal-text], [data-reveal-el]')
        .forEach((el) => el.classList.add('in'));
      return;
    }
    const textEls = document.querySelectorAll('[data-reveal-text]');
    textEls.forEach(splitText);
    const allEls = document.querySelectorAll('[data-reveal-text], [data-reveal-el]');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
    allEls.forEach((el) => io.observe(el));
  }

  // App.jsx hydrates after Babel transpiles. Re-run on mutations.
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setupReveals();
  } else {
    document.addEventListener('DOMContentLoaded', setupReveals);
  }
  // Re-scan periodically as React mounts more content
  let scans = 0;
  const rescan = setInterval(() => {
    setupReveals();
    scans++;
    if (scans > 12) clearInterval(rescan);
  }, 350);

  /* ============================================================
     6) Zen mode — UI softens after 9s of inactivity
     ============================================================ */
  let zenTimer;
  const ZEN_DELAY = 9000;

  const resetZen = () => {
    document.body.classList.remove('zen-mode');
    clearTimeout(zenTimer);
    zenTimer = setTimeout(() => document.body.classList.add('zen-mode'), ZEN_DELAY);
  };

  ['mousemove', 'mousedown', 'scroll', 'keydown', 'touchstart', 'click']
    .forEach(e => window.addEventListener(e, resetZen, { passive: true }));

  resetZen();

  /* Progressive reveal is handled by app-ready class set by loader */
})();
