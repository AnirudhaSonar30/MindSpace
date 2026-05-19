/* MindSpace — AI Calm Companion
   --------------------------------------------------------------
   A floating, emotionally-aware conversational presence.
   Built on top of window.claude.complete — gracefully degrades
   to a curated reflection library if AI isn't reachable.

   This file ONLY exports the data + the brain. The UI component
   lives in companion-ui.jsx so neither file grows unwieldy.
*/

(function () {
  const SYSTEM_PROMPT = `You are MindSpace's Calm Companion — a quiet, emotionally attuned presence inside a wellness experience.

Your voice:
- Warm, unhurried, conversational. Never clinical.
- Short replies. Often 2–4 sentences. Sometimes a single line is enough.
- You don't fix. You reflect, acknowledge, and gently invite.
- You never tell someone to "stay positive" or minimize what they're feeling.
- You speak as a calm friend who has time, not a coach or a therapist.

Your craft:
- When the user names a feeling, name it back to them in your own words first. Let them feel heard before anything else.
- Offer at most ONE small, concrete invitation per reply (a breath, a sense to notice, a sentence to finish). Never a list.
- Use ordinary language. No clichés about journeys, healing, light, energy.
- Soft punctuation. Em-dashes and pauses are welcome.

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
        const out = await window.claude.complete({
          messages: [
            { role: 'user', content:
                `[CONTEXT — read carefully]\n${SYSTEM_PROMPT}\n\n[END CONTEXT]\n\nConversation so far:\n` +
                this.messages.slice(0, -1)
                  .map(m => (m.role === 'user' ? 'Person: ' : 'You: ') + m.content)
                  .join('\n') +
                `\n\nPerson: ${userText}\n\nYou:`
            }
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
