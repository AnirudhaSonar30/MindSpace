/* MindSpace — Memory
   --------------------------------------------------------------
   Quietly remembers what mattered last time.
   - last scene, last cadence, last sound profile, last mood
   - visit count + last-seen timestamp
   Exposes `window.MindSpaceMemory` and fires `mindspace:welcome-back`
   once when a returning visitor arrives, so the React layer can
   render a soft greeting.
*/
(function () {
  'use strict';

  const KEY        = 'mindspace.memory.v1';
  const VISIT_KEY  = 'mindspace.memory.visits';
  const LAST_KEY   = 'mindspace.memory.lastSeen';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch { return {}; }
  }
  function save(patch) {
    const cur = load();
    const next = Object.assign({}, cur, patch, { updatedAt: Date.now() });
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    return next;
  }

  /* ── visit counter ── */
  let visits = 0;
  let lastSeen = 0;
  try {
    visits = parseInt(localStorage.getItem(VISIT_KEY) || '0', 10) || 0;
    lastSeen = parseInt(localStorage.getItem(LAST_KEY)  || '0', 10) || 0;
  } catch {}
  const isReturning = visits > 0 && (Date.now() - lastSeen) > 6 * 60 * 1000; // 6 min
  visits++;
  try {
    localStorage.setItem(VISIT_KEY, String(visits));
    localStorage.setItem(LAST_KEY,  String(Date.now()));
  } catch {}

  const mem = load();

  /* ── apply remembered state ── */
  function applyScene() {
    const eng = window.MindSpaceSceneEngine;
    if (!eng) return setTimeout(applyScene, 80);
    if (mem.sceneId && eng.SCENES[mem.sceneId] && mem.sceneId !== 'midnight-rain') {
      eng.setScene(mem.sceneId);
    }
    eng.onChange((scene) => save({ sceneId: scene.id, sceneLabel: scene.label }));
  }
  applyScene();

  /* ── welcome-back beacon, fired once after first paint ── */
  function fireWelcome() {
    if (!isReturning) return;
    if (!mem.sceneId && !mem.cadenceId) return;
    const eng = window.MindSpaceSceneEngine;
    const sceneLabel =
      mem.sceneLabel ||
      (eng && eng.SCENES[mem.sceneId] && eng.SCENES[mem.sceneId].label) ||
      'this room';

    const elapsed = Date.now() - (mem.updatedAt || lastSeen || Date.now());
    let when = 'earlier';
    if (elapsed < 36 * 3600 * 1000)  when = 'yesterday';
    if (elapsed < 12 * 3600 * 1000)  when = 'a few hours ago';
    if (elapsed < 90 * 60   * 1000)  when = 'not long ago';
    if (elapsed > 48 * 3600 * 1000)  when = 'a couple of days ago';
    if (elapsed > 7  * 24*3600*1000) when = 'last week';

    window.dispatchEvent(new CustomEvent('mindspace:welcome-back', {
      detail: { sceneLabel, sceneId: mem.sceneId, when, visits },
    }));
  }
  // Wait for loader + react mount + scene engine to settle
  setTimeout(fireWelcome, 3000);

  window.MindSpaceMemory = {
    get visits()      { return visits; },
    get isReturning() { return isReturning; },
    get last()        { return mem; },
    save, load,
  };
})();
