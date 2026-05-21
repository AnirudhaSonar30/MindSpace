/* MindSpace — Onboarding intro  (auto-play, ~4 s, then mood check) */
(function () {
  if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') return;

  var el = document.getElementById('onboarding');
  if (!el) return;

  /* Skip entirely for returning visitors (v2 key — fresh for all users) */
  if (localStorage.getItem('ms_ob2')) {
    el.remove();
    return;
  }

  /* ── Slides ──────────────────────────────────────────── */
  var SLIDES = [
    {
      lines: [
        { text: 'a quiet sky',          cls: 'ob-line ob-line-lg' },
        { text: 'for a loud mind.',     cls: 'ob-line ob-line-lg' },
      ]
    },
    {
      lines: [
        { text: 'breathe · ground · rest', cls: 'ob-line ob-line-lg' },
        { text: 'your space is ready',    cls: 'ob-line ob-line-sm' },
      ]
    },
  ];

  /* ── Component ───────────────────────────────────────── */
  function Intro() {
    var _React$useState = React.useState(0),
        step = _React$useState[0],
        setStep = _React$useState[1];

    var _React$useState2 = React.useState(false),
        leaving = _React$useState2[0],
        setLeaving = _React$useState2[1];

    React.useEffect(function () {
      /* Slide 1 visible for 1800 ms */
      var t1 = setTimeout(function () { setStep(1); }, 1800);

      /* Slide 2 visible for 1600 ms, then exit */
      var t2 = setTimeout(function () { setLeaving(true); }, 1800 + 1600);

      /* Remove overlay + fire mood check */
      var t3 = setTimeout(function () {
        localStorage.setItem('ms_ob2', '1');
        el.remove();
        window.dispatchEvent(new CustomEvent('mindspace:open-mood'));
      }, 1800 + 1600 + 700);

      return function () { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, []);

    return React.createElement(
      'div',
      { className: 'ob-overlay' + (leaving ? ' ob-overlay-out' : '') },
      /* Static background tint */
      React.createElement('div', { className: 'ob-bg', 'aria-hidden': 'true' }),
      /* Slides */
      SLIDES.map(function (slide, i) {
        var cls = 'ob-slide';
        if (i === step)            cls += ' ob-active';
        else if (i < step)         cls += ' ob-gone';
        return React.createElement(
          'div',
          { key: i, className: cls },
          slide.lines.map(function (line, j) {
            return React.createElement('span', { key: j, className: line.cls }, line.text);
          })
        );
      })
    );
  }

  /* ── Mount after loader finishes ────────────────────── */
  function mount() {
    ReactDOM.createRoot(el).render(React.createElement(Intro));
  }

  if (document.body.classList.contains('app-ready')) {
    mount();
  } else {
    var obs = new MutationObserver(function () {
      if (document.body.classList.contains('app-ready')) {
        obs.disconnect();
        mount();
      }
    });
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    /* Fallback — mount regardless after 3 s */
    setTimeout(function () { obs.disconnect(); mount(); }, 3000);
  }
})();
