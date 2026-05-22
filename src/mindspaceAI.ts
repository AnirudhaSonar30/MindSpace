// MindSpace — Groq AI bridge
// Key is injected via VITE_GROQ_KEY environment variable at build time.
// Never stored in source code.

const GROQ_KEY = (import.meta.env.VITE_GROQ_KEY as string | undefined)?.trim() ?? ''

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface GroqComplete {
  complete: (opts: { messages: Message[] }) => Promise<string>
}

export function createGroqBridge(): GroqComplete | null {
  if (!GROQ_KEY) return null

  return {
    async complete({ messages }) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages,
          max_tokens: 280,
          temperature: 0.72,
        }),
      })

      if (!res.ok) throw new Error(`Groq error ${res.status}`)
      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
      return data.choices?.[0]?.message?.content?.trim() ?? ''
    },
  }
}
