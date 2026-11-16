// Windy (AI) entry point. Everything returns scripted copy for now, so recording and live demos never depend on the network.
//
// To plug in a real LLM later:
//   1. Add a small backend (e.g. /server, Node or Python) that holds the API key and calls the model.
//      Never put the key in frontend code: Vite bundles any VITE_* variable into the browser.
//   2. Set VITE_WINDY_API=http://localhost:8787 in .env.local
//   3. askWindy below then calls the backend, and falls back to the scripted copy on any failure (safe if the venue Wi-Fi drops).
//
// Team principle (from the board): deterministic code does the maths, the LLM only explains; send summaries only, never account numbers or raw transactions.

const API = import.meta.env.VITE_WINDY_API as string | undefined

export type WindyTopic = 'plan-reason' | 'feature-finder' | 'receipt-summary'

const fallback: Record<WindyTopic, string> = {
  'plan-reason':
    'You set Japan and your home as goals. Option B keeps both close to their dates while rent goes up by $80 a week.',
  'feature-finder':
    'Home loans are under More › All services › Loans. I can take you straight there. Your ID, income and statements are already on file, so there is nothing to gather.',
  'receipt-summary':
    'Groceries: about $700 this month. Extras are about $180 of that. Halving extras frees about $90 a month for your goals.',
}

export async function askWindy(topic: WindyTopic, context: Record<string, unknown> = {}): Promise<string> {
  if (!API) return fallback[topic]
  try {
    const res = await fetch(`${API}/windy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, context }),
    })
    if (!res.ok) throw new Error(String(res.status))
    const data = (await res.json()) as { text: string }
    return data.text
  } catch {
    return fallback[topic]
  }
}

export const windyFallback = fallback
