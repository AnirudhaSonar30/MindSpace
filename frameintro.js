/* MindSpace — Frame intro player
   --------------------------------------------------------------
   Plays a pre-rendered frame sequence as a cinematic sky awakening
   when the loader exits, bridging it to the live Three.js scene.

   HOW TO USE:
     1. Generate a 3-5 second AI sky video (Kling AI / Runway / Luma)
        Prompt: "Cinematic deep space sky awakening. Void dissolves
        into a field of stars. Purple-blue nebula blooms. No camera
        movement. Dark, meditative. 4 seconds."
     2. Extract frames:
        ffmpeg -i video.mp4 -r 24 -q:v 3 public/frames/frame_%03d.jpg
     3. Drop the frames/ folder next to index.html.
     4. This script auto-detects them and plays on first load.
        If no frames are found it silently skips.

   The player creates a full-screen canvas overlay that fades out
   once the sequence ends, revealing the live Three.js sky beneath.
*/

(function () {
  const FRAME_DIR   = 'frames/';
  const FRAME_FMT   = (n) => FRAME_DIR + 'frame_' + String(n).padStart(3, '0') + '.jpg';
  const FPS         = 24;
  const FADE_MS     = 800;  // crossfade duration at end

  /* ── 1. Probe: check if frames exist ── */
  const probe = new Image();
  probe.onload  = () => init();
  probe.onerror = () => { /* no frames — silent skip */ };
  probe.src = FRAME_FMT(1);

  function init() {
    /* Count frames by loading until one fails (max 300) */
    let total = 0;
    const images = [];
    let loaded = 0;
    let failed = false;

    const tryLoad = (n) => {
      if (n > 300 || failed) return;
      const img = new Image();
      img.onload = () => {
        images[n - 1] = img;
        loaded++;
        total = Math.max(total, n);
        tryLoad(n + 1);
        if (loaded >= 2) maybeStart();  /* start playing once a few frames are ready */
      };
      img.onerror = () => {
        if (n === 1) { failed = true; return; }
        /* sequence ended */
      };
      img.src = FRAME_FMT(n);
    };
    tryLoad(1);

    /* ── 2. Canvas overlay ── */
    const canvas = document.createElement('canvas');
    canvas.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:9998',
      'width:100vw', 'height:100vh',
      'pointer-events:none',
      'opacity:0',
      'transition:opacity ' + FADE_MS + 'ms ease',
      'background:#000',
    ].join(';');
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    let started = false;
    let frameIdx = 0;
    let lastFrameAt = 0;
    let rafId;
    const frameDur = 1000 / FPS;

    function maybeStart() {
      if (started) return;
      /* Wait until the premium loader has exited */
      const waitForReady = setInterval(() => {
        if (document.body.classList.contains('premium-revealed')) {
          clearInterval(waitForReady);
          startPlay();
        }
      }, 50);
    }

    function startPlay() {
      started = true;
      canvas.style.opacity = '1';
      resize();
      window.addEventListener('resize', resize);
      rafId = requestAnimationFrame(draw);
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = window.innerWidth  * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    }

    function draw(now) {
      if (now - lastFrameAt >= frameDur) {
        lastFrameAt = now;
        const img = images[frameIdx];
        if (img) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          /* object-fit: cover */
          const cw = window.innerWidth;
          const ch = window.innerHeight;
          const iw = img.naturalWidth  || img.width;
          const ih = img.naturalHeight || img.height;
          const scale = Math.max(cw / iw, ch / ih);
          const sw = iw * scale, sh = ih * scale;
          ctx.drawImage(img, (cw - sw) / 2, (ch - sh) / 2, sw, sh);
        }
        frameIdx++;
        if (frameIdx >= total && total > 0) {
          fadeOut();
          return;
        }
      }
      rafId = requestAnimationFrame(draw);
    }

    function fadeOut() {
      cancelAnimationFrame(rafId);
      canvas.style.transition = 'opacity ' + FADE_MS + 'ms ease';
      canvas.style.opacity = '0';
      setTimeout(() => {
        canvas.remove();
        window.removeEventListener('resize', resize);
      }, FADE_MS + 100);
    }
  }
})();
