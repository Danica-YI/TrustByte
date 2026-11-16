// Ask Windy: live chat with Claude through the backend (server/main.py).
// Answers come from tools that compute over Mia's data; each tool Windy used is shown under its reply.
import { useEffect, useRef, useState } from 'react'
import { TopBar } from '../components/ui'

type ToolCall = { name: string; input: Record<string, unknown> }
type Msg = { role: 'user' | 'assistant'; text: string; tools: ToolCall[]; error?: string }

const TOOL_LABELS: Record<string, string> = {
  get_accounts: 'Balances',
  spending_by_category: 'Spending by category',
  compare_month: 'Compared months',
  search_transactions: 'Searched transactions',
  recurring_payments: 'Regular payments',
  cash_flow_forecast: 'Cash flow forecast',
  goal_projection: 'Goal projection',
  life_events: 'Life event signals',
  get_receipt: 'Receipt',
}

const SUGGESTIONS = [
  'How much did I spend on food delivery this month?',
  'Will I run short before payday?',
  'What subscriptions am I paying for?',
  'If I save $160 a payday, when do I reach my Japan goal?',
]

type Health = { ok: boolean; has_credentials: boolean; model: string } | null

export default function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [cid, setCid] = useState<string | null>(null)
  const [health, setHealth] = useState<Health | 'offline'>(null)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/health').then((r) => (r.ok ? r.json() : Promise.reject())).then(setHealth).catch(() => setHealth('offline'))
  }, [])
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [msgs])

  const patchLast = (f: (m: Msg) => Msg) => setMsgs((all) => [...all.slice(0, -1), f(all[all.length - 1])])

  async function send(text: string) {
    if (!text.trim() || busy) return
    setInput('')
    setBusy(true)
    setMsgs((all) => [...all, { role: 'user', text, tools: [] }, { role: 'assistant', text: '', tools: [] }])
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversation_id: cid }),
      })
      if (res.status === 404) setCid(null)
      if (!res.ok || !res.body) throw new Error(`Server returned ${res.status}`)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''
        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          const ev = JSON.parse(part.slice(6))
          if (ev.type === 'start') setCid(ev.conversation_id)
          else if (ev.type === 'text') patchLast((m) => ({ ...m, text: m.text + ev.text }))
          else if (ev.type === 'tool') patchLast((m) => ({ ...m, tools: [...m.tools, { name: ev.name, input: ev.input }] }))
          else if (ev.type === 'error') patchLast((m) => ({ ...m, error: ev.message }))
        }
      }
    } catch (e) {
      patchLast((m) => ({ ...m, error: `Can't reach Windy (${(e as Error).message}). Is the backend running?` }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <TopBar title="Ask Windy" right={<button className="link" onClick={() => { setMsgs([]); setCid(null) }}>New</button>} />

      {health === 'offline' && (
        <div className="card" style={{ background: 'var(--warn-soft)' }}>
          <p style={{ margin: 0 }}>Windy’s backend isn’t running. Start it with <code>npm run server</code> (see README).</p>
        </div>
      )}
      {health && health !== 'offline' && !health.has_credentials && (
        <div className="card" style={{ background: 'var(--warn-soft)' }}>
          <p style={{ margin: 0 }}>The backend has no API key. Add ANTHROPIC_API_KEY to server/.env and restart it.</p>
        </div>
      )}

      {msgs.length === 0 && (
        <>
          <div className="bubble ai">
            <div className="pill" style={{ marginBottom: 6 }}>✦ Windy</div>
            Hi Mia. Ask me about your spending, bills, balances or goals. I work from your own transactions and
            show you what I looked at.
          </div>
          <div className="stack" style={{ marginTop: 8 }}>
            {SUGGESTIONS.map((s) => (
              <button key={s} className="btn outline" style={{ textAlign: 'left', fontWeight: 600 }} onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        </>
      )}

      {msgs.map((m, i) =>
        m.role === 'user' ? (
          <div key={i} className="bubble me">{m.text}</div>
        ) : (
          <div key={i} className="bubble ai" style={{ whiteSpace: 'pre-wrap' }}>
            {m.tools.length > 0 && (
              <div className="hstack" style={{ gap: 4, marginBottom: 6 }}>
                {m.tools.map((t, j) => (
                  <span key={j} className="chip windy" title={JSON.stringify(t.input)}>✦ {TOOL_LABELS[t.name] ?? t.name}</span>
                ))}
              </div>
            )}
            {m.text}
            {!m.text && !m.error && busy && i === msgs.length - 1 && <span className="muted">Windy is looking…</span>}
            {m.error && <div style={{ color: 'var(--bad)' }}>{m.error}</div>}
          </div>
        ),
      )}
      <p className="lock">🔒 Windy reads your accounts with your consent and can’t move money.</p>
      <div ref={end} style={{ height: 70 }} />

      <form className="composer" onSubmit={(e) => { e.preventDefault(); send(input) }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your money" disabled={busy} />
        <button className="btn primary" type="submit" disabled={busy || !input.trim()}>➤</button>
      </form>
    </>
  )
}
