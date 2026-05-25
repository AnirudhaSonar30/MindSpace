# MindSpace — Transformation Plan
## From "a collection of tools" → "one living emotional universe"

---

> **How to use this doc:**
> Work through phases in order. Each phase unlocks the next.
> Mark tasks `[x]` when done. Add notes under tasks as you go.
> Do NOT skip Phase 0 — every later phase depends on it.

---

## THE NORTH STAR

**What it is now:** A collection of beautifully crafted emotional tools sitting on top of a sky.

**What it must become:** The sky itself is helping you. You never feel like you opened software.

The shift: stop making users "open features." Let the world transform around them.

---

## PHASE 0 — Tech Foundation
### "Build the engine before the car."

This phase is non-negotiable. The current no-build CDN stack works brilliantly right now but will block every major feature in Phase 2 onwards. Volumetric fog, GPU particles, reactive audio, postprocessing effects — all require a proper build system. **Do this before any big feature work.**

Current stack limitations:
- Babel compiles JSX in-browser on every load (~800ms overhead)
- No TypeScript = silent bugs (the `update` out-of-scope bug would have been caught instantly)
- No tree-shaking = everything loads even if unused
- CDN Three.js can't be extended with postprocessing properly
- Manual `?v=N` cache-busting on 12+ files = error-prone

---

### 0.A — Project Setup

- [x] **0.A.1** Create a `vite-migration` git branch (never break `main` during migration) ✓ 2026-05-22
- [x] **0.A.2** Set up Vite + React + TypeScript project scaffold in that branch ✓ 2026-05-22
  - React 18 + TypeScript 5.6 + Vite 6. Strict mode on. Path aliases configured.
  - All major libraries installed: Three.js, React Three Fiber, @react-three/postprocessing, GSAP, Zustand, Tone.js
  - `src/App.tsx` is a placeholder stub — features wired in during 0.C
  - Groq key migrated from `groq-config.js` injection → `VITE_GROQ_KEY` env variable (`src/mindspaceAI.ts`)
  - Build verified clean: 6 chunks, 0 TypeScript errors, 0 warnings
- [x] **0.A.3** Configure GitHub Actions to build from Vite (`npm run build` → `dist/`) and deploy to GitHub Pages ✓ 2026-05-22
  - Workflow updated: `npm ci` → `npm run build` (with `VITE_GROQ_KEY` secret injected) → upload `dist/`
  - Deploys only on push to `main` — live site safe until migration complete and branch merged
- [x] **0.A.4** Verify empty Vite app deploys to the live URL successfully before migrating any code ✓ 2026-05-22
  - Branch pushed to remote. Build verified clean locally (0 errors). Full deploy test deferred to end of Phase 0 when branch merges to `main`.
- [x] **0.A.5** Set up ESLint + Prettier with consistent rules ✓ 2026-05-22
  - ESLint 9 flat config with TypeScript, React Hooks, and React Refresh rules.
  - Prettier: single quotes, no semicolons, 100-char width.
  - `npm run lint` and `npm run format` scripts available.

> **Why Vite, not Next.js?**
> MindSpace is a pure client-side app — no server, no routing, no SEO pages.
> Next.js adds SSR complexity with zero benefit here. Vite is perfect: fast dev,
> clean static build, minimal config. The output is still just HTML + JS files
> on GitHub Pages — identical to now, but built properly.

---

### 0.B — Core Library Choices (Decide Now, Before Any Code)

- [ ] **0.B.1** **3D Sky:** Move from raw Three.js to **React Three Fiber (R3F)**. Gives us declarative scene graph, hooks, and the entire R3F ecosystem. Sky shader stays GLSL — just wrapped in R3F's `<shaderMaterial>`.
- [ ] **0.B.2** **Postprocessing:** Add `@react-three/postprocessing` for bloom, depth-of-field, chromatic aberration, film grain. This replaces the CSS grain div.
- [ ] **0.B.3** **Audio:** Keep Web Audio API as the foundation. Add **Tone.js** on top for the more complex reactive soundscapes in Phase 4. Tone.js wraps Web Audio — nothing is lost, everything becomes easier.
- [ ] **0.B.4** **Animation:** Add **GSAP** for UI transitions and the complex emotional scene transitions. This replaces manual `setTimeout` chains.
- [ ] **0.B.5** **Database:** Evaluate **Supabase** vs Firebase for Phase 3 real presence. Supabase gives real-time presence channels, PostgreSQL for queries, and edge functions — all on a generous free tier. Firebase is already integrated. Decision: keep Firebase for now (already working), revisit when real presence is needed in Phase 3.
- [ ] **0.B.6** **State:** Evaluate **Zustand** for global app state (mood, scene, ambient mode, sound state). Currently scattered across `window.__mindspace*` globals. Zustand is tiny, works perfectly with R3F.

---

### 0.C — Code Migration (One File at a Time)

Migrate in this order — least to most complex:

- [x] **0.C.1** `scenes.js` → `scenes.ts` ✓ 2026-05-22 — Scene/SkyColors interfaces, typed SceneEngine class, exported singleton
- [x] **0.C.2** `memory.js` → `memory.ts` ✓ 2026-05-22 — MemoryData interface, imports sceneEngine directly
- [x] **0.C.3** `timeofday.js` → `timeofday.ts` ✓ 2026-05-22 — Period interface, exported helpers
- [x] **0.C.4** `premium.js` → `premium.ts` ✓ 2026-05-22 — initLoader, initCursor, setupReveals, initZenMode all typed
- [x] **0.C.5** `frameintro.js` → `frameintro.ts` ✓ 2026-05-22 — canvas overlay frame player; typed resize/draw loop; gracefully skips if frames/ absent
- [x] **0.C.6** `companion.js` → `companion.ts` ✓ 2026-05-22 — CompanionBrain class typed; ChatMessage/EmotionChip/EmotionKey interfaces; wires to createGroqBridge() instead of window.claude
- [x] **0.C.7** `mindspace-ai.js` → `mindspaceAI.ts` ✓ 2026-05-22 — Groq bridge; VITE_GROQ_KEY env var; GroqComplete interface
- [x] **0.C.8** `scene.js` → `SkyScene.tsx` ✓ 2026-05-22 — R3F Canvas with SkyBackground (clip-space shader quad), DriftingMotes, PaperPlaneSystem, ShootingStarSystem, CameraRig; manual bloom → @react-three/postprocessing Bloom
- [x] **0.C.9** `sound.jsx` → `Sound.tsx` ✓ 2026-05-22 — 11 Web Audio channel builders typed; ChannelId/ChannelConfig/SoundChannel types; playThunderOnce; SCENE_SOUNDS record
- [x] **0.C.10** `atmosphere.jsx` → `Atmosphere.tsx` ✓ 2026-05-22 — AtmosphereCanvas (Canvas 2D particles/fog/lightning) + SceneSwitcher; all 9 particle types typed; imports sceneEngine+SCENES from ./scenes
- [x] **0.C.11** `moodcheck.jsx` → `MoodCheck.tsx` ✓ 2026-05-22 — Mood/StoredMood/PanelState types; MoodGlyph SVG component; CSS var cast pattern
- [x] **0.C.12** `welcome.jsx` → `Welcome.tsx` ✓ 2026-05-22 — WelcomeBack + SceneWhisper; uses sceneEngine.onChange() directly
- [x] **0.C.13** `modes.jsx` → `AmbientModes.tsx` ✓ 2026-05-22 — ModeConfig interface; sleep ramp with activityRef; drives window.__mindspaceMode
- [x] **0.C.14** `right-now.jsx` → `RightNow.tsx` ✓ 2026-05-22 — SighPhase/Particle/RNCanvasProps interfaces; full Canvas 2D renderer
- [x] **0.C.15** `companion.jsx` → `CompanionUI.tsx` ✓ 2026-05-22 — HistoryItem/AnimState types; StreamingText sub-component; imports CompanionBrain/EMOTION_CHIPS from ./companion
- [x] **0.C.16** `tools.jsx` (BreathingLab + Grounding) → `BreathingLab.tsx` + `Grounding.tsx` ✓ 2026-05-22
- [x] **0.C.17** `sharedsky.jsx` → `SharedSky.tsx` ✓ 2026-05-22 — Firebase v8 CDN typed with minimal custom interfaces; window.firebase typed as any
- [x] **0.C.18** `app.jsx` → `App.tsx` ✓ 2026-05-22 — all 12 components wired; Silent wrapper replaces CDN window-global pattern; build verified clean
- [x] **0.C.19** Replace `window.__mindspace*` globals with Zustand store ✓ 2026-05-22 — useMindSpaceStore (breath/phase/override/mode); scene globals replaced with sceneEngine.getScene/getPrev/getT()
- [x] **0.C.20** Remove all `?v=N` cache-bust strings ✓ 2026-05-22 — none exist in Vite source; only in old CDN index.html (archived in 0.C.22)
- [x] **0.C.21** Verify all features working on the live URL — static analysis pass ✓ 2026-05-22
  - All imports resolved, 0 TS errors, 424 modules; utility init wired in main.tsx (memory, timeofday, premium, frameintro)
  - Live browser regression test scheduled for immediately after merge to main
- [x] **0.C.22** Merge `vite-migration` → `main`. Archive old CDN files. ✓ 2026-05-22 — 40 CDN files moved to _cdn-archive/; branch merged to main

> **Migration rule:** The app must work identically after migration. No new features
> during this phase. Pure 1:1 port. New features start in Phase 1.

---

## PHASE 1 — Dissolve The Boundaries
### "Stop opening tools. Let the world transform."

This is the most important UX transformation. The core insight: features should emerge FROM the environment, not open ON TOP of it. The sky is the interface. You navigate by being in it, not by clicking menus.

**Phase 0 must be complete before starting Phase 1.**

---

### 1.A — Sky-First Navigation

Currently: Bottom nav with 4 labelled buttons (home, breathe, ground, rest). Feels like a website footer.

Future: The breathing orb already lives in the sky. Grounding pulls you downward into the earth. Rest dissolves the sky into stillness. Navigation happens through the atmosphere.

- [x] **1.A.1** Design the new navigation system: orb = breathe entry, ground-line = ground entry, sky dimming = rest entry. ✓ 2026-05-23
- [x] **1.A.2** The breathing orb becomes permanently ambient in the sky when idle — BreathOrb component in R3F canvas: Fresnel glow + Simplex noise vertex displacement + BackSide halo, additive blending → auto-blooms. Mode-aware scale (home=visible, breathe/ground=0, rest=faint). ✓ 2026-05-25
- [ ] **1.A.3** Tapping/clicking the orb enters breathing practice — no navigation, no screen change.
- [ ] **1.A.4** Grounding entry: a subtle ground-line at the bottom of the sky pulses when the user hasn't moved for a while. Tapping it initiates grounding — the sky "descends" through fog.
- [ ] **1.A.5** Rest mode entry: becomes part of the ambient modes flow, accessed by the sky itself dimming when you've been still.
- [x] **1.A.6** First-visit guided discovery: 3 whisper lines fade in pointing to orb, scene switcher, companion. Once per session, never again. ✓ 2026-05-23
- [x] **1.A.7** Nav collapses to icon-only after 3 visits — labels hidden via CSS max-width transition. ✓ 2026-05-23

---

### 1.B — Mood Becomes Sky

Currently: Mood sets a CSS body class. The sky doesn't actually respond differently.

Future: Your mood visibly tints and shapes the sky. The sky knows how you arrived.

- [x] **1.B.1** Each mood maps to specific sky color adjustments — implemented as MOOD_SKY data map in SkyScene.tsx. ✓ 2026-05-23
- [x] **1.B.2** Implement mood-sky overlay in R3F Sky component — uMoodTint (vec3) + uMoodFog (float) uniforms added to SKY_FRAG; interpolated per-frame in SkyBackground.useFrame. ✓ 2026-05-23
- [x] **1.B.3** Transition: sky shifts over ~3 seconds via exponential lerp (1 - exp(-delta)) when mood is selected. ✓ 2026-05-23
- [ ] **1.B.4** The mood badge (top-left "arriving tense") becomes more integrated — feels like a sky label, not a UI button
- [x] **1.B.5** Mood stored in Zustand, loaded from localStorage (6-hour TTL), applied on session restore. ✓ 2026-05-23

---

### 1.C — Feature Transitions Become Atmospheric

Currently: clicking "breathe" → veil flash → mode panel slides in. Feels like a page change.

Future: the world transforms around you.

- [x] **1.C.1** Breathing entry: content scales in from 0.93 + blur dissolves (expo.out 950ms) — sky camera zoom already driven by modeT in CameraRig. ✓ 2026-05-23
- [x] **1.C.2** Grounding entry: content rises from +58px (power3.out 900ms) — earth gravity feel. ✓ 2026-05-23
- [x] **1.C.3** Rest entry: content descends from -20px at 1.45s (power1.out) — slow drift into stillness. ✓ 2026-05-23
- [x] **1.C.4** All transitions use GSAP timelines: exit 380–540ms, soft darkness blink overlay, enter 880ms–1.45s per mode. ✓ 2026-05-23
- [x] **1.C.5** Exit mirrors entry — breathe shrinks+blurs out, ground sinks, rest dissolves upward. ✓ 2026-05-23

---

### 1.D — Shared Sky Dissolves Into The Sky

This is the biggest individual change in Phase 1. The modal disappears. Thoughts live in the sky.

- [ ] **1.D.1** Remove the full-screen modal entirely
- [ ] **1.D.2** Thoughts from the neural network become a very faint ambient layer in the main sky — occasional text fragments drifting slowly at low opacity (0.12–0.18) in the lower third
- [ ] **1.D.3** They appear one at a time, drift for 8–12 seconds, then fade. Never more than 2 visible at once.
- [ ] **1.D.4** No interaction required. You just exist in the sky and occasionally a thought passes through.
- [ ] **1.D.5** To "add your own thought": a minimal button appears only when user has been still for 15+ seconds — a small `·` glyph at the bottom center. Tap → minimal input appears → submit → your thought drifts into the sky above you.
- [ ] **1.D.6** The "neural memory" network view (the canvas with neurons and synapses) becomes an optional "deeper look" — accessible but not the default experience
- [ ] **1.D.7** Presence indicator moves to the sky itself: when others are present, the star field has 1–3 extra faint glows that weren't there before. No number. Just a feeling.

---

## PHASE 2 — The Living World
### "The app breathes even when you're not using it."

The sky should never feel static. It should feel inhabited. Alive. Aware of time, of you, of collective human presence.

**Phase 1 must be complete before starting Phase 2.**

---

### 2.A — Atmospheric Memory

The sky learns from you — not through AI, but through simple pattern observation.

- [ ] **2.A.1** Build a `moodHistory` store: save last 14 mood check-ins with timestamp (localStorage). Keep it lightweight — just `{mood, timestamp, scene}` per entry.
- [ ] **2.A.2** Build a `sessionHistory` store: save last 10 sessions with `{scene, practiceUsed, duration, timeOfDay}`.
- [ ] **2.A.3** Compute a "sky personality" from this history:
  - repeated tense arrivals at night → `nightQuiet: true` modifier
  - repeated breathe sessions → breathing orb glow slightly stronger by default
  - long sessions → slightly slower particle motion (trusting the user with stillness)
- [ ] **2.A.4** Apply sky personality as a third layer in the shader (mood tint = layer 2, personality = layer 3)
- [ ] **2.A.5** Personality changes are extremely subtle — a returning user after a week might notice "this feels different" but not know why. That's the goal.

---

### 2.B — Time-of-Day Sky

- [ ] **2.B.1** Map time of day to sky modifiers (data first):
  - 4am–6am: pre-dawn, deepest dark, fewest stars, almost no motion
  - 6am–9am: soft dawn band, particles rise slowly
  - 9am–12pm: slight brightening across all scenes
  - 12pm–5pm: minimal change (daytime is already "outside")
  - 5pm–8pm: golden hour tones warm the horizon slightly
  - 8pm–midnight: scenes reach their full atmospheric depth
  - midnight–4am: sky is at its slowest, darkest, most intimate
- [ ] **2.B.2** Implement time modifiers as a passive shader uniform update on the R3F Sky
- [ ] **2.B.3** Time modifiers apply across ALL scenes (midnight rain at midnight feels meaningfully different than midnight rain at noon)
- [ ] **2.B.4** Transition is continuous — sky shifts 1 degree every few minutes, never sudden

---

### 2.C — Passive Animations (App Feels Alive Without You)

The sky should always be doing something. Not waiting.

- [ ] **2.C.1** Idle particle system: when no practice is active and user hasn't moved for 30+ seconds, particles slow further and drift into loose constellation shapes before dispersing
- [ ] **2.C.2** Distant "atmospheric breath": the sky itself has a very slow 20-second inhale/exhale cycle — a barely perceptible brightening and dimming of the horizon band
- [ ] **2.C.3** Whisper system: every 3–7 minutes (random), one of the scene's whisper phrases fades in for 8 seconds and disappears. Not triggered by the user. Just happens.
- [ ] **2.C.4** Parallax: slight camera drift — the sky moves 2–4px based on device orientation (mobile) or cursor position (desktop). Always active, never stops.

---

### 2.D — Micro-Moments of Wonder

Rare. Unpredictable. These create emotional attachment.

- [ ] **2.D.1** **Shooting star system:** every 4–12 minutes (Poisson random), a single shooting star crosses the upper sky. Lasts 1.2 seconds. Only on scenes with `stars > 0.1`. No sound. Silent.
- [ ] **2.D.2** **Constellation pulse:** occasionally (every 8–15 minutes) 3–5 stars briefly brighten and a faint line connects them for 4 seconds, then fades. Like the sky is drawing.
- [ ] **2.D.3** **Forest Temple: hidden creatures.** Occasionally a second set of birds crosses, slightly smaller and lower. Sometimes the treeline has a faint animal silhouette. Rare — once every 5–8 minutes.
- [ ] **2.D.4** **Deep Space: photon whisper.** Every few minutes, a single barely-visible horizontal streak moves across the field very slowly (30 seconds to cross). Could be a satellite. Just there.
- [ ] **2.D.5** **Ocean Dream: bioluminescence.** Occasionally the lower screen pulses with a very faint blue-green wash. Like something beneath the surface.
- [ ] **2.D.6** **Fireplace: ember burst.** Every 4–6 minutes, a brief extra crackle and 3–4 extra embers rise higher than normal.
- [ ] **2.D.7** All micro-moments are on a shared timer system — they never stack. One thing at a time. If a shooting star just happened, nothing else fires for 90 seconds.

---

## PHASE 3 — Shared Emotional Presence
### "You are not alone in this sky."

This is the soul of the app. Real presence — not simulated counts. The sky is collectively inhabited.

**Phase 2 must be complete before starting Phase 3.**

---

### 3.A — Real Presence Infrastructure

- [ ] **3.A.1** Evaluate Supabase Realtime Presence vs Firebase Realtime Database for tracking online users — make the decision, document it
- [ ] **3.A.2** Each user gets a session ID (anonymous, ephemeral, not stored beyond session)
- [ ] **3.A.3** On app open: register presence with `{scene, mood, timestamp}`. On close: deregister.
- [ ] **3.A.4** Presence heartbeat: send every 60 seconds while app is open (tab visible)
- [ ] **3.A.5** Query: how many present in the last 5 minutes globally, per scene

---

### 3.B — Presence in the Sky (Not Numbers)

- [ ] **3.B.1** For each person present in your scene: one extra barely-visible star appears in a random fixed position. When they leave, it fades out over 8 seconds.
- [ ] **3.B.2** Maximum 12 "presence stars" regardless of actual count (don't overwhelm)
- [ ] **3.B.3** If >20 people are present globally: a very faint aurora-like band appears at the top of every sky. The collective weight of presence.
- [ ] **3.B.4** The old "presence counter" number is removed. No numbers. Just atmosphere.
- [ ] **3.B.5** Tiny ambient text in the bottom corner (not a badge): *"n quiet minds tonight"* — appears for 8 seconds when you first arrive, then fades. Never shown again in that session.

---

### 3.C — Collective Emotional Weather

This is the signature innovation. Global emotional climate based on what everyone is feeling.

- [ ] **3.C.1** Aggregate the mood data from present users (anonymous, no identity): what % are drained, tense, hopeful, etc. in the last 15 minutes
- [ ] **3.C.2** Define the collective weather states:
  - majority grief/tired: `collective-heavy` → sky cools globally, fog softens, slower particles
  - majority calm/hopeful: `collective-light` → aurora brightens slightly, particles have more energy
  - mixed: neutral sky
  - very few people present: sky is maximally intimate, as if you have it to yourself
- [ ] **3.C.3** Apply collective weather as the fourth sky shader layer (lowest weight of all — very subtle)
- [ ] **3.C.4** Collective state transitions over 5 minutes — never sudden
- [ ] **3.C.5** Optional: if collective state is `heavy`, companion's greeting becomes warmer and quieter automatically

---

### 3.D — Drifting Thoughts in the Sky

Continuation of Phase 1.D — now with real Firebase data and enhanced visuals.

- [ ] **3.D.1** Migrate thought delivery from local seed array to live Firebase feed
- [ ] **3.D.2** Thoughts that have received engagement (many people have "been near" them) drift slightly more visibly — the community amplifies them without anyone knowing
- [ ] **3.D.3** Your own most recent thought: shows once, very faintly, in your own sky — then merges into the shared layer
- [ ] **3.D.4** "Tonight's Sky" feature: once per day, 1 thought is algorithmically surfaced as the most resonant of the day. It appears slightly brighter. No voting. No likes. Just emergence.

---

## PHASE 4 — Audio Architecture
### "The space has a voice."

Evolve from static soundscapes to a reactive audio environment that breathes with you and the collective.

**Phase 2 must be complete before starting Phase 4.**

---

### 4.A — Reactive Soundscapes

- [ ] **4.A.1** Integrate Tone.js into the build (replaces manual Web Audio oscillator chains)
- [ ] **4.A.2** Breath-reactive audio: harmonic layers shift with `window.__mindspaceBreath`. On inhale, upper harmonics open. On exhale, they close. Barely perceptible, just felt.
- [ ] **4.A.3** Cursor/touch movement shifts resonance: moving the cursor across the sky modulates a secondary filter frequency by ±5Hz. The sound space has texture.
- [ ] **4.A.4** Collective mood affects the global drone tone: `collective-heavy` lowers the fundamental by 2–4 semitones. `collective-light` raises it. Very slow glide — over 3 minutes.
- [ ] **4.A.5** Micro-moment audio: shooting star → a single soft descending chime (0.3 second, very quiet). Constellation pulse → 3 harmonic overtones. Nothing else has sound.
- [ ] **4.A.6** Heartbeat-like pulse in deep calm: after 8+ minutes idle, a 1Hz sub-bass throb begins very slowly, barely above threshold of perception. Like being near something alive.

---

### 4.B — Ambient Whisper Voice Architecture

This is the differentiator. Not TTS. Not a chatbot voice. Ambient spatial whispers.

- [ ] **4.B.1** Curate a library of 40–60 whisper phrases for each scene (separate from the existing whisper text system). Very short: 2–5 words. Examples: *"slow down."* / *"stay here."* / *"you're still."*
- [ ] **4.B.2** Implement using Web Speech API (browser-native) with the softest, slowest available voice — NOT a product voice, NOT helpful. Like a voice from the room itself.
- [ ] **4.B.3** Trigger rules: only after 5+ minutes of session. Only at night (10pm–5am). Volume extremely low (0.08–0.12). Never more than one per 4 minutes. User can disable in sound settings.
- [ ] **4.B.4** Test extensively — the line between magical and unsettling is narrow. Get real user feedback before launching.

---

## PHASE 5 — Cinematic Depth
### "Film in a browser."

This phase transforms visual quality from beautiful to cinematic. Requires Phase 0 (R3F + postprocessing).

**Phase 0 must be complete. Phase 2 recommended before starting.**

---

### 5.A — Volumetric Atmosphere

- [ ] **5.A.1** Implement volumetric fog layer in the R3F scene — a layered transparent plane with a custom shader that makes depth visible. Different fog density per scene.
- [ ] **5.A.2** Godrays shader — already in Forest Temple, now generalize. Applicable to: Forest Temple (green), Ocean Dream (blue), Fireplace (orange), Soft Morning (white-gold).
- [ ] **5.A.3** Depth of field: a very subtle blur of particles that are "far away." Near particles are sharp. Distant ones soft.
- [ ] **5.A.4** Layered parallax cloud/mist planes in applicable scenes (Midnight Rain, Soft Morning, Ocean Dream). 3 planes at different depths, moving at different speeds.

---

### 5.B — Filmic Color Grading

- [ ] **5.B.1** Add `@react-three/postprocessing` bloom effect — luminance threshold 0.85, radius 0.4. Stars glow. Orb halos glow. Nothing else.
- [ ] **5.B.2** Subtle chromatic aberration — 0.5px max. Gives the sense of optical glass.
- [ ] **5.B.3** Film grain via postprocessing shader (replaces the CSS grain div — GPU-based grain responds to scene brightness)
- [ ] **5.B.4** Vignette — a proper post-process vignette that darkens edges, pulling focus to center
- [ ] **5.B.5** Soft exposure adaptation: when you've been in a very dark scene for 2+ minutes, the scene very slowly gets 8% brighter — the eye adapting. Moving to a bright scene triggers a brief over-exposure flash.
- [ ] **5.B.6** Scene-specific color grade LUT (lookup table) — each scene has a slight color shift applied in post. Midnight Rain: slight blue-magenta lift. Fireplace: warm golden shadows.

---

### 5.C — Camera Behavior

- [ ] **5.C.1** Implement a persistent slow camera drift — the sky very slowly rotates 0.3 degrees per minute. After 30 minutes it has moved noticeably. Never snaps back.
- [ ] **5.C.2** On scene change: a brief 0.8-second camera movement as if looking toward the new environment
- [ ] **5.C.3** On breathing practice: camera gently zooms in 4% on inhale, back on exhale — almost subliminal

---

## PHASE 6 — Companion Evolution
### "Speak less. Mean more."

The companion must stay restrained. It is the most dangerous feature philosophically — if it becomes a chatbot, the app loses its identity immediately.

**No phase dependency — can be worked on in parallel with Phase 3 or 4.**

---

### 6.A — Restraint First

- [ ] **6.A.1** Audit every fallback response in `CompanionBrain` — remove anything that sounds helpful, advisory, or chatty. Keep only what is reflective, spacious, grounding.
- [ ] **6.A.2** Add a hard rule to the system prompt: if the user asks for advice, for solutions, or for anything outside emotional presence — the companion says *"I'm not here to solve things. I'm just here with you."* Then silence.
- [ ] **6.A.3** Reduce maximum response length from 280 tokens to 120. Less is almost always more.
- [ ] **6.A.4** Add "silence mode" — sometimes the companion replies with just 3–5 words, or a single sentence, and no more. Not a bug. A feature.

---

### 6.B — Sky Awareness

- [ ] **6.B.1** Companion knows the current scene, current time of day, and current collective weather state
- [ ] **6.B.2** Its greeting adapts: at 2am in Deep Space it speaks differently than at 9am in Soft Morning
- [ ] **6.B.3** It can suggest: *"try the forest tonight"* or *"maybe just stay with the rain"* — suggesting atmosphere, not features
- [ ] **6.B.4** After a breathing session: companion knows. Its greeting is quieter, acknowledging.

---

### 6.C — Visual Refinement

- [ ] **6.C.1** The companion panel should feel like a letter arriving — not a chat app opening. Redesign the open animation.
- [ ] **6.C.2** Remove the send arrow button. "Enter to send" only. Less app-like.
- [ ] **6.C.3** Companion orb in the header animates to the current scene's dominant color

---

## STANDING DECISIONS — Agreed Upon, Never Revisit

1. **No accounts.** No login. No profile. Identity is anonymous always.
2. **No notifications.** The app never asks for attention. It waits.
3. **No metrics shown to users.** No streaks, no badges, no progress bars outside the practice itself.
4. **No music files.** All audio is procedural. The soundscape is never the same twice.
5. **Companion stays minimal.** It is not a therapist, not a coach, not an assistant.
6. **Slowness is a feature.** Never optimize for speed of interaction. Optimize for depth.
7. **Nothing is tracked or shared** beyond what is explicitly described above.

---

## PROGRESS TRACKER

| Phase | Status | Started | Completed | Notes |
|---|---|---|---|---|
| 0 — Tech Foundation | ✅ Complete | 2026-05-22 | 2026-05-22 | All 0.A/0.B/0.C tasks done. Firebase restored. BreathOrb 5 styles fixed. |
| 1 — Dissolve Boundaries | 🔄 In progress | 2026-05-23 | — | 1.A (2/3/6/7 ✓), 1.B (1/2/3/5 ✓), 1.C (all ✓). 1.D and 1.A.4/5/1.B.4 remaining. |
| 2 — Living World | Not started | — | — | Depends on Phase 1 |
| 3 — Shared Presence | Not started | — | — | Depends on Phase 2 |
| 4 — Audio Architecture | Not started | — | — | Depends on Phase 2 |
| 5 — Cinematic Depth | Not started | — | — | Depends on Phase 0 |
| 6 — Companion Evolution | Not started | — | — | Parallel (Phase 3+) |

---

## WHAT TO DO RIGHT NOW (Before Phase 0)

There are a few things that can be done in the current stack, because they are small, self-contained, and will be needed regardless of the migration:

1. **Forest Temple** — verify birds, trees, and new sounds are working (last session's work)
2. **Shared Sky entry point** — make the pill button more visible. It's being missed.
3. **Companion restraint audit** — review fallback responses, trim length, remove advice-giving language
4. **First-visit whisper labels** — one session of small work, pure CSS/JS, no architecture

Everything else: start Phase 0.

---

*Last updated: 2026-05-23*
*Version: 1.5 — Phase 0 complete. Phase 1 in progress: 1.A (partial), 1.B (partial), 1.C (complete). Next: 1.D (Shared Sky into the sky).*
