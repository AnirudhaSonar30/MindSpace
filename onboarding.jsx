/* MindSpace — Cinematic intro  (pure vanilla JS, no React, no Babel)
   Injects .ob-intro overlay, plays ~5 s, then fires mindspace:open-mood. */
(function () {
  /* Build DOM */
  var overlay = document.createElement('div');
  overlay.className = 'ob-intro';
  overlay.setAttribute('aria-hidden', 'true');

  var glow = document.createElement('div');
  glow.className = 'ob-glow';

  var text = document.createElement('div');
  text.className = 'ob-text';

  var t1 = document.createElement('span');
  t1.className = 'ob-t1';
  t1.textContent = 'a quiet sky';

  var t2 = document.createElement('span');
  t2.className = 'ob-t2';
  t2.textContent = 'for a loud mind.';

  text.appendChild(t1);
  text.appendChild(t2);
  overlay.appendChild(glow);
  overlay.appendChild(text);

  /* Insert as first child of body so it sits above everything */
  document.body.insertBefore(overlay, document.body.firstChild);

  /* Timeline
     0 ms      — overlay appears (CSS animations begin immediately)
     1700 ms   — ob-t1 starts fading in  (CSS delay)
     1950 ms   — ob-t2 starts fading in  (CSS delay)
     5300 ms   — start overlay fade-out  (1700 + 4000 - 400 overlap)
     6000 ms   — remove overlay, fire mood event                        */
  var tFade   = setTimeout(function () { overlay.classList.add('ob-out'); },   5300);
  var tRemove = setTimeout(function () {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    window.dispatchEvent(new CustomEvent('mindspace:open-mood'));
  }, 6000);

  /* Respect reduced-motion: CSS hides the overlay, but still fire the event */
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    clearTimeout(tFade);
    clearTimeout(tRemove);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    window.dispatchEvent(new CustomEvent('mindspace:open-mood'));
  }
})();
