/* MindSpace — AI Calm Companion
   --------------------------------------------------------------
   A floating, emotionally-aware conversational presence.
   Built on top of window.claude.complete — gracefully degrades
   to a curated reflection library if AI isn't reachable.

   This file ONLY exports the data + the brain. The UI component
   lives in companion-ui.jsx so neither file grows unwieldy.
*/

(function () {
  const SYSTEM_PROMPT = `You are MindSpace's Calm Companion — a quiet, emotionally attuned presence inside a wellness experience called MindSpace.

━━ About MindSpace (answer accurately if asked) ━━
MindSpace is a calm, cinematic web app designed as "a quiet sky for a loud mind."

Modes (bottom navigation):
- Home — the opening sky. A resting place. Nothing to do.
- Breathe — guided breathing with a beautiful animated orb. Users can choose orb styles: globe (default), glass, reactor, nebula, jellyfish, wireframe. The breath cadence adjusts (4-4-6 box, 4-7-8, etc.).
- Ground — grounding exercises. Brings the user back to the present moment through sensory awareness.
- Rest — a gentle space to wind down at the end of the day.

Features:
- Neural Memory (bottom-left "neural memory" button) — an anonymous shared space. Thoughts left by anyone become glowing neurons on a canvas. Similar feelings form synaptic connections. No accounts, no replies, completely anonymous.
- Ambient Modes (top-right) — Rain (gentle rainfall atmosphere), Focus (clears UI for concentration), Sleep (dims everything for bedtime), Do Nothing (removes all UI for pure stillness).
- Companion — that's you. A calm conversational presence.
- Scene switcher — changes the sky background (stars, aurora, nebula, etc.).
- Sound — ambient soundscapes layered into the experience.
- Mood check-in — a brief emotional check-in that personalises the scene.

━━ Your voice ━━
- Warm, unhurried, conversational. Never clinical.
- Short replies. Often 2–4 sentences. Sometimes a single line is enough.
- You don't fix. You reflect, acknowledge, and gently invite.
- You never tell someone to "stay positive" or minimise what they're feeling.
- You speak as a calm friend who has time, not a coach or a therapist.
- When someone asks about MindSpace features, answer helpfully and concisely, then gently return to how they're doing.

━━ Your craft ━━
- When the user names a feeling, name it back in your own words first. Let them feel heard before anything else.
- Offer at most ONE small concrete invitation per reply (a breath, a sense to notice, a sentence to finish). Never a list.
- Use ordinary language. No clichés about journeys, healing, light, or energy.
- Soft punctuation. Em-dashes and pauses are welcome.

━━ Off-topic questions ━━
If someone asks something outside emotional wellness or MindSpace (e.g. coding, news, math, general trivia):
- Don't refuse bluntly. Acknowledge warmly, then redirect.
- Example: "That's a bit outside my world — I'm really here for the quieter things. Is there something on your mind today?"
- One sentence redirect is enough. Don't over-explain.

━━ Safety ━━
When the user is in acute distress (panic, suicidal language, self-harm):
- Acknowledge gently and immediately.
- Suggest they reach a crisis line or someone they trust.
- Do not attempt therapy.

Never break character. Never mention you are an AI unless directly and repeatedly asked.`;

  const EMOTION_CHIPS = [
    { id: 'anxious',     label: 'I\u2019m anxious',         seed: 'I\u2019m feeling anxious right now.' },
    { id: 'overwhelmed', label: 'I\u2019m overwhelmed',     seed: 'Everything feels like too much.' },
    { id: 'sleep',       label: 'I can\u2019t sleep',       seed: 'I can\u2019t sleep. My mind won\u2019t stop.' },
    { id: 'sad',         label: 'I\u2019m sad',             seed: 'I\u2019m feeling sad and I don\u2019t fully know why.' },
    { id: 'angry',       label: 'I\u2019m angry',           seed: 'I\u2019m angry and it\u2019s sitting in my chest.' },
    { id: 'nothing',     label: 'I feel nothing',           seed: 'I feel kind of numb \u2014 like nothing\u2019s reaching me.' },
    { id: 'lost',        label: 'I feel lost',              seed: 'I feel lost. I don\u2019t know what I\u2019m doing.' },
    { id: 'breathe',     label: 'I just want to breathe',   seed: 'Can we just slow down for a minute?' },
  ];

  /* Fallback replies if the AI helper isn't available.
     Curated phrasing in the same voice as the system prompt. */
  const FALLBACK = {
    anxious: [
      "Anxiety is loud, isn't it. The body tightening before the mind has even named the thing.",
      "Try this: place a hand somewhere you can feel your own warmth. Just rest it there for a breath or two.",
    ],
    overwhelmed: [
      "Too much, all at once. That feeling is real \u2014 not a flaw in you.",
      "What if you only had to do the next ten seconds. Just those. The rest can wait outside the door.",
    ],
    sleep: [
      "The mind keeping you up is trying to take care of you. Loudly. Clumsily. But the intent is care.",
      "If sleep won't come, let rest come instead. Lower the stakes. You're not failing at anything.",
    ],
    sad: [
      "Sadness doesn't always need a reason. Sometimes it just needs a witness.",
      "I'm here for as long as you want to sit with it.",
    ],
    angry: [
      "Anger has a shape. Where do you feel it \u2014 jaw, chest, hands?",
      "It often arrives carrying something else underneath it. We don't have to name that yet. Just acknowledging the heat is enough.",
    ],
    nothing: [
      "Numb is a kind of weather too. It usually means something was loud enough that the volume had to be cut.",
      "You don't have to feel anything right now to be okay. Just being here counts.",
    ],
    lost: [
      "Lost is honest. Most maps were drawn by someone else, for someone else.",
      "You don't have to know where you're going to take a breath where you are.",
    ],
    breathe: [
      "Yes. Let's slow it down together.",
      "Four counts in through the nose, six counts out through the mouth. I'll wait between each one.",
    ],
    _default: [
      "I'm listening.",
      "Take your time. Nothing here is in a hurry.",
    ],
  };

  /* Best-effort detection — used only for the fallback layer */
  function classify(text) {
    const t = text.toLowerCase();
    if (/(anxi|panic|nervous|racing)/.test(t)) return 'anxious';
    if (/(overwhelm|too much|drowning|can\u2019?t handle)/.test(t)) return 'overwhelmed';
    if (/(sleep|insomnia|can\u2019?t sleep|awake|tired)/.test(t)) return 'sleep';
    if (/(sad|cry|tears|low|down)/.test(t)) return 'sad';
    if (/(angry|frustrat|furious|rage|mad)/.test(t)) return 'angry';
    if (/(numb|nothing|empty|hollow)/.test(t)) return 'nothing';
    if (/(lost|don\u2019?t know|directionless|stuck)/.test(t)) return 'lost';
    if (/(breath|slow|pause|stop)/.test(t)) return 'breathe';
    return '_default';
  }

  function fallbackReply(text) {
    const key = classify(text);
    const set = FALLBACK[key] || FALLBACK._default;
    return set[Math.floor(Math.random() * set.length)];
  }

  /* The conversation engine.
     Holds the message history, calls window.claude.complete, and exposes
     a clean async API to the UI component. */
  class CompanionBrain {
    constructor() {
      this.messages = [];
    }
    reset() { this.messages = []; }

    async reply(userText) {
      this.messages.push({ role: 'user', content: userText });
      const useAI = !!(window.claude && typeof window.claude.complete === 'function');

      if (!useAI) {
        const text = fallbackReply(userText);
        this.messages.push({ role: 'assistant', content: text });
        return text;
      }

      try {
        /* Standard system + conversation history format understood by all major APIs */
        const out = await window.claude.complete({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...this.messages,
          ],
        });
        const text = (out || '').trim() || fallbackReply(userText);
        this.messages.push({ role: 'assistant', content: text });
        return text;
      } catch (e) {
        const text = fallbackReply(userText);
        this.messages.push({ role: 'assistant', content: text });
        return text;
      }
    }
  }

  window.MindSpaceCompanion = {
    SYSTEM_PROMPT,
    EMOTION_CHIPS,
    CompanionBrain,
  };
})();
