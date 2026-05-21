/* MindSpace — AI bridge
   ─────────────────────────────────────────────────────────────
   Provides window.claude.complete using Groq's free API.
   Groq is free: 30 requests/min, 14,400/day — more than enough.

   SETUP (one-time):
   1. Sign up free at console.groq.com
   2. Go to API Keys → Create API key
   3. Copy your key (starts with gsk_...)
   4. Paste it below where it says YOUR_GROQ_KEY_HERE
   5. IMPORTANT: In Groq console → API Keys → restrict the key
      to your domain (anirudhasona30.github.io) so nobody else
      can use it even if they see the source code.
   ─────────────────────────────────────────────────────────────*/

(function () {
  const GROQ_KEY = window.MINDSPACE_GROQ_KEY || 'YOUR_GROQ_KEY_HERE';

  if (!GROQ_KEY || GROQ_KEY === 'YOUR_GROQ_KEY_HERE') {
    /* No key — companion gracefully uses its built-in fallback replies */
    return;
  }

  window.claude = {
    async complete({ messages }) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + GROQ_KEY,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages,
          max_tokens: 280,
          temperature: 0.72,
          stream: false,
        }),
      });

      if (!res.ok) {
        const err = await res.text().catch(() => res.status);
        throw new Error('Groq API error: ' + err);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || '';
    },
  };
})();
