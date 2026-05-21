/* MindSpace — AI bridge via Cloudflare Worker
   ─────────────────────────────────────────────────────────────
   The Groq API key lives inside a Cloudflare Worker (free tier).
   This file only knows the Worker URL — safe to commit publicly.

   SETUP (one-time, ~10 minutes):
   See instructions at the bottom of this file.
   ─────────────────────────────────────────────────────────────*/

(function () {
  /* Replace with your Cloudflare Worker URL after setup */
  const WORKER_URL = 'YOUR_WORKER_URL_HERE';

  if (!WORKER_URL || WORKER_URL === 'YOUR_WORKER_URL_HERE') {
    /* No worker configured — companion uses built-in fallback replies */
    return;
  }

  window.claude = {
    async complete({ messages }) {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });

      if (!res.ok) throw new Error('Worker error ' + res.status);
      const data = await res.json();
      return data.reply || '';
    },
  };
})();

/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  HOW TO SET UP THE CLOUDFLARE WORKER (free, key stays hidden)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Go to dash.cloudflare.com → sign up free (no card needed)
2. Left sidebar → Workers & Pages → Create → Create Worker
3. Name it "mindspace-ai" → Deploy
4. Click "Edit code" and replace everything with the worker code below
5. Click Deploy
6. Go to Settings → Variables → add Secret:
     Name:  GROQ_API_KEY
     Value: gsk_... (your Groq key)
7. Copy the Worker URL (looks like mindspace-ai.username.workers.dev)
8. Paste it above where it says YOUR_WORKER_URL_HERE

━━ Worker code (paste into Cloudflare editor) ━━━━━━━━━━━━━━

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Not allowed', { status: 405 });
    }

    const { messages } = await request.json();

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + env.GROQ_API_KEY,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 280,
        temperature: 0.72,
      }),
    });

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || '';

    return new Response(JSON.stringify({ reply }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/
