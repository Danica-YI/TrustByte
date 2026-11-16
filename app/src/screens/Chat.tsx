// Ask Windy: live chat with Claude through the backend (server/main.py).
// Answers come from tools that compute over Mia's data; each tool Windy used is shown under its reply.
// Every chat is saved (server/chats.py): "Past chats" lists them, and opening one carries on that conversation.
// Windy can offer up to 2 next-step buttons (server/suggest.py, already checked by the guardrails); tapping one
// opens the normal review screen. "How did you work this out?" is built from what really happened, not by the AI.
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Check } from '../api'
import { Mark, SendIcon, TopBar, UserAvatar } from '../components/ui'
import { useApp } from '../store'

type ToolCall = { name: string; input: Record<string, unknown> }
type Action = { label: string; kind: string; params: Record<string, unknown> }
type Msg = {
  role: 'user' | 'assistant'; text: string; tools: ToolCall[]; error?: string; actions?: Action[]
  checks?: Check[] // input guardrails, before Windy answered
  outChecks?: Check[] // output guardrails on the answer, e.g. every figure came from the calculator
}

// What each tool reads, for "How did you work this out?"
const TOOL_DATA: Record<string, string> = {
  get_accounts: 'Your account balances and goal progress',
  spending_by_category: 'Your Everyday spending, totalled by category',
  compare_month: 'This month’s spending against your earlier months',
  search_transactions: 'Your Everyday transactions',
  recurring_payments: 'Regular payments found in your history',
  cash_flow_forecast: 'Your scheduled payments and usual spending, projected 5 weeks ahead',
  goal_projection: 'Your goal balance and auto-saves',
  life_events: 'Transactions that may signal a life change',
  get_receipt: 'Itemised receipts linked to your payments',
  pay_later_plans: 'Your Afterpay plans',
  remember: 'Saved a short note you told Windy',
}

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
  pay_later_plans: 'Pay-later plans',
  remember: 'Remembered this',
}

const SUGGESTIONS = [
  'How much did I spend on food delivery this month?',
  'Will I run short before payday?',
  'What subscriptions am I paying for?',
  'If I save $160 a payday, when do I reach my Japan goal?',
]

type Health = { ok: boolean; has_credentials: boolean; model: string } | null
type PastChat = { id: string; title: string; updated_at: string; questions: number }

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

export default function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [cid, setCid] = useState<string | null>(null)
  const [health, setHealth] = useState<Health | 'offline'>(null)
  const [past, setPast] = useState<PastChat[] | null>(null) // null = chat view, list = "Past chats" view
  const [how, setHow] = useState<number | null>(null) // which answer's "How did you work this out?" is open
  const { propose, busy: proposing } = useApp()
  const nav = useNavigate()
  const end = useRef<HTMLDivElement>(null)

  // A next-step button: the backend works out the change and holds it; Mia reviews and approves it there.
  async function review(a: Action) {
    const p = await propose(a.kind, a.params)
    if (p) nav(`/review/${p.id}`)
  }

  useEffect(() => {
    fetch('/api/health').then((r) => (r.ok ? r.json() : Promise.reject())).then(setHealth).catch(() => setHealth('offline'))
  }, [])
  // Also when Windy finishes: that's when the next-step buttons appear
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [msgs, busy])
  // A question typed into the Home "Ask Windy" box arrives in router state: send it once on arrival.
  const loc = useLocation()
  const sentFromHome = useRef(false)
  useEffect(() => {
    const q = (loc.state as { q?: string } | null)?.q
    if (q && !sentFromHome.current) { sentFromHome.current = true; send(q) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function showPast() {
    const res = await fetch('/api/chats')
    setPast(res.ok ? (await res.json()).chats : [])
  }

  async function openChat(id: string) {
    const res = await fetch(`/api/chats/${id}`)
    if (!res.ok) return
    setMsgs((await res.json()).messages)
    setCid(id)
    setPast(null)
  }

  async function deleteChat(id: string) {
    const res = await fetch(`/api/chats/${id}`, { method: 'DELETE' })
    if (res.ok) setPast((await res.json()).chats)
    if (id === cid) { setMsgs([]); setCid(null) }
  }

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
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Server returned ${res.status}`)
      }
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
          if (ev.type === 'start') { setCid(ev.conversation_id); patchLast((m) => ({ ...m, checks: ev.checks ?? [] })) }
          else if (ev.type === 'suggestions') patchLast((m) => ({ ...m, actions: ev.actions }))
          else if (ev.type === 'checks') patchLast((m) => ({ ...m, outChecks: ev.checks }))
          else if (ev.type === 'text') patchLast((m) => ({ ...m, text: m.text + ev.text }))
          else if (ev.type === 'tool') patchLast((m) => ({ ...m, tools: [...m.tools, { name: ev.name, input: ev.input }] }))
          else if (ev.type === 'error') patchLast((m) => ({ ...m, error: ev.message }))
        }
      }
    } catch (e) {
      patchLast((m) => ({ ...m, error: (e as Error).message.includes('fetch') ? 'Can’t reach Windy. Is the backend running?' : (e as Error).message }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <TopBar title="Ask Windy" fallback="/more" right={
        <span className="hstack" style={{ gap: 12 }}>
          <button className="link" onClick={() => (past ? setPast(null) : showPast())}>{past ? 'Back' : 'Past chats'}</button>
          <button className="link" onClick={() => { setMsgs([]); setCid(null); setPast(null) }}>New</button>
        </span>
      } />

      {past && (
        <>
          {past.length === 0 && <div className="card"><p style={{ margin: 0 }}>No past chats yet. Ask Windy something and it’ll show up here.</p></div>}
          {past.map((c) => (
            <div key={c.id} className="card">
              <div className="spread" style={{ alignItems: 'flex-start' }}>
                <button className="link" style={{ textAlign: 'left', flex: 1 }} onClick={() => openChat(c.id)}>
                  <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{c.title}</div>
                  <div className="muted">{when(c.updated_at)} · {c.questions} question{c.questions === 1 ? '' : 's'}{c.id === cid ? ' · open now' : ''}</div>
                </button>
                <button className="link" style={{ color: 'var(--bad)' }} onClick={() => deleteChat(c.id)} aria-label={`Delete chat: ${c.title}`}>Delete</button>
              </div>
            </div>
          ))}
          <p className="lock">🔒 Only you can see your chats. Delete one any time; Reset demo clears them all.</p>
        </>
      )}

      {!past && <>

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
            <div className="pill" style={{ marginBottom: 6 }}><Mark /> Windy</div>
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
          <div key={i} className="me-row"><div className="bubble me">{m.text}</div><UserAvatar /></div>
        ) : (
          <div key={i} className="bubble ai" style={{ whiteSpace: 'pre-wrap' }}>
            {m.tools.length > 0 && (
              <div className="hstack" style={{ gap: 4, marginBottom: 6 }}>
                {m.tools.map((t, j) => (
                  <span key={j} className="chip windy" title={JSON.stringify(t.input)}><Mark /> {TOOL_LABELS[t.name] ?? t.name}</span>
                ))}
              </div>
            )}
            {m.text}
            {!m.text && !m.error && busy && i === msgs.length - 1 && <span className="muted">Windy is looking…</span>}
            {m.error && <div style={{ color: 'var(--bad)' }}>{m.error}</div>}
            {m.outChecks?.filter((c) => !c.ok).map((c) => (
              <div key={c.name} className="small" style={{ marginTop: 8, color: 'var(--warn)', whiteSpace: 'normal' }}>
                ⚠ Not from the calculator: {c.detail.replace('Windy worked these out itself: ', '')}. Windy worked
                this out itself, so double-check it.
              </div>
            ))}

            {i === msgs.length - 1 && !busy && m.actions && m.actions.length > 0 && (
              <div className="stack" style={{ marginTop: 10, whiteSpace: 'normal' }}>
                {m.actions.map((a) => (
                  <button key={a.label} className="btn outline" style={{ textAlign: 'left' }} disabled={proposing} onClick={() => review(a)}>
                    {a.label} <span className="muted">· review</span>
                  </button>
                ))}
                <span className="small">Opens a review screen. Nothing changes until you approve.</span>
              </div>
            )}

            {m.tools.length > 0 && !(busy && i === msgs.length - 1) && (
              <div style={{ marginTop: 8, whiteSpace: 'normal' }}>
                <button className="link small" onClick={() => setHow(how === i ? null : i)}>
                  {how === i ? 'Hide how this was worked out' : 'How did you work this out?'}
                </button>
                {how === i && (
                  <div className="small" style={{ marginTop: 6, background: 'var(--windy-soft)', borderRadius: 10, padding: 10 }}>
                    <b>Data Windy looked at</b>
                    {m.tools.map((t, j) => (
                      <div key={j} style={{ marginTop: 4 }}>
                        • {TOOL_DATA[t.name] ?? TOOL_LABELS[t.name] ?? t.name}
                        {Object.keys(t.input).length > 0 && (
                          <span className="muted"> ({Object.entries(t.input).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${Array.isArray(v) ? v.join(', ') : String(v)}`).join(' · ')})</span>
                        )}
                      </div>
                    ))}
                    <div style={{ marginTop: 8 }}><b>Numbers:</b> worked out by the Python engine. <b>Words:</b> written by Windy (AI).</div>
                    {[['Checks before answering', m.checks], ['Checks on the answer', m.outChecks]].map(([title, list]) =>
                      Array.isArray(list) && list.length > 0 && (
                        <div key={title as string} style={{ marginTop: 8 }}>
                          <b>{title as string}</b>
                          {list.map((c, j) => (
                            <div key={j}>{c.ok ? '✓' : '✗'} {c.name}{c.detail && <span className="muted"> · {c.detail}</span>}</div>
                          ))}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ),
      )}
      <p className="lock">🔒 Windy reads your accounts with your consent and can’t move money.</p>
      <div ref={end} style={{ height: 70 }} />

      <form className="composer" onSubmit={(e) => { e.preventDefault(); send(input) }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your money" disabled={busy} />
        <button className="send" type="submit" aria-label="Send" disabled={busy || !input.trim()}><SendIcon /></button>
      </form>
      </>}
    </>
  )
}
