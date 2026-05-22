/* MindSpace — AI bridge (Groq)
   Key is injected at deploy time via GitHub Actions secret.
   Never stored in source code. Safe to commit as-is.        */

(function () {
  const GROQ_KEY = (window.MINDSPACE_GROQ_KEY || '').trim();

  if (!GROQ_KEY) {
    /* No key injected — companion uses built-in fallback replies */
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
        }),
      });

      if (!res.ok) throw new Error('Groq error ' + res.status);
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || '';
    },
  };
})();
