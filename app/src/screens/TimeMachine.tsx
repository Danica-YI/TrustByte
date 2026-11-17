// Time machine. Two parts:
// 1. Notes to future you: write a question or a wish, pick the year, and it is sealed until then.
//    Only you can open and answer it. When it opens, you say whether it happened, and Windy offers to help plan it.
// 2. A message from future you about the rent trade-off, using the engine's figures (same as Your options).
// In the demo a sealed note can be opened early so the flow can be shown.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Capsule } from '../api'
import { Card, Chip, Lock, Seg, TopBar, WindyPill } from '../components/ui'
import { money } from '../format'
import { useApp, useSnap } from '../store'

const OPENERS: Record<string, string> = {
  A: 'I went. Two weeks, too much ramen, zero regrets.',
  B: 'I did not pick a favourite, and honestly both goals are still alive.',
  C: 'I am writing this from a flat inspection. It has a balcony.',
}
const CLOSERS: Record<string, string> = {
  A: 'The home deposit took longer. I knew that when I chose it.',
  B: 'Nothing moved far. It was the calm option and it felt like it.',
  C: 'Japan had to wait. It is still on the list, just later.',
}
const ANSWERS = { done: 'I did it', not_yet: 'Not yet', dropped: 'I don’t want this any more' } as const

export default function TimeMachine() {
  const nav = useNavigate()
  const s = useSnap()
  const { act, busy } = useApp()
  const years = [1, 2, 3, 5, 10].map((n) => s.this_year + n)
  const [year, setYear] = useState(String(s.this_year + 5))
  const [text, setText] = useState('')
  const [open, setOpen] = useState<number | null>(null)
  const [justSealed, setJustSealed] = useState<string | null>(null)
  const byYear = [...new Set(s.capsules.map((c) => c.year))].sort()
  const opts = s.tradeoff.options
  const [pick, setPick] = useState(opts[0]?.name ?? '')
  const o = opts.find((x) => x.name === pick) ?? opts[0]

  const seal = async () => {
    const t = text.trim()
    if (await act('capsule_write', { year: Number(year), text: t }, `Sealed until ${year}`)) { setJustSealed(t); setText(''); setOpen(Number(year)) }
  }
  const plan = (c: Pick<Capsule, 'text'>) => nav('/chat', { state: { q: `I wrote this to my future self: "${c.text}". Can you help me plan for it?` } })

  return (
    <>
      <TopBar title="Time machine" fallback="/insights/tools" />

      <Card variant="windy">
        <WindyPill label="Note to future you" />
        <h2 style={{ marginTop: 8 }}>Ask yourself in a few years</h2>
        <p>Write a wish or a question. It stays sealed until that year, and only you can open and answer it.</p>
        <textarea className="field" rows={3} maxLength={280} value={text} onChange={(e) => setText(e.target.value)}
          placeholder="I want my own place in five years. Will I have made it?" aria-label="Your note" />
        <div className="spread" style={{ marginTop: 8 }}>
          <span>Open it in</span>
          <Seg options={years.map(String)} value={year} onChange={setYear} />
        </div>
        <button className="btn primary block" style={{ marginTop: 10 }} disabled={busy || text.trim().length < 3} onClick={seal}>Seal it</button>
      </Card>

      {justSealed && (
        <Card>
          <h3>Sealed. Want a head start?</h3>
          <p className="small" style={{ margin: '2px 0 8px' }}>Windy can help you plan for it now, so future you has a better answer.</p>
          <div className="hstack">
            <button className="btn primary" style={{ flex: 1 }} onClick={() => plan({ text: justSealed })}>Help me plan it</button>
            <button className="btn outline" onClick={() => nav('/goals/new')}>Start a goal</button>
            <button className="btn ghost" onClick={() => setJustSealed(null)}>Not now</button>
          </div>
        </Card>
      )}

      {byYear.length > 0 && (
        <>
          <div className="section-head" style={{ marginTop: 16 }}><h3>Your years</h3></div>
          <div className="year-row">
            {byYear.map((y) => {
              const list = s.capsules.filter((c) => c.year === y)
              const sealed = list.some((c) => !c.opened)
              return (
                <button key={y} className={`year-tile ${open === y ? 'on' : ''}`} onClick={() => setOpen(open === y ? null : y)}>
                  <b>{y}</b>
                  <span>{list.length} note{list.length === 1 ? '' : 's'} · {sealed ? 'sealed' : 'opened'}</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {open !== null && s.capsules.filter((c) => c.year === open).map((c) => (
        <Card key={c.id} variant={c.opened ? 'selected' : undefined}>
          <div className="spread"><h3>To me, in {c.year}</h3><Chip tone={c.opened ? 'good' : 'warn'}>{c.opened ? 'Opened' : 'Sealed'}</Chip></div>
          {!c.opened ? (
            <>
              <p className="small" style={{ margin: '4px 0 8px' }}>Written in {c.written.slice(0, 4)}. Opens in {c.year}. Only you can read it then.</p>
              <button className="btn outline block" disabled={busy} onClick={() => act('capsule_open', { id: c.id }, `It is ${c.year}. Your note is open.`)}>Demo: jump to {c.year} and open it</button>
            </>
          ) : (
            <>
              <p style={{ marginTop: 8 }}>“{c.text}”</p>
              <p className="small">You wrote this in {c.written.slice(0, 4)}.</p>
              {c.answer === null ? (
                <>
                  <div style={{ margin: '8px 0 6px', fontWeight: 600 }}>So, did it happen?</div>
                  <div className="stack" style={{ gap: 6 }}>
                    {(Object.keys(ANSWERS) as (keyof typeof ANSWERS)[]).map((a) => (
                      <button key={a} className="btn outline block" disabled={busy} onClick={() => act('capsule_answer', { id: c.id, answer: a })}>{ANSWERS[a]}</button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="row"><span>Your answer</span><b>{ANSWERS[c.answer]}</b></div>
                  {c.answer === 'done' && <p style={{ marginBottom: 0 }}>You told yourself you would, and you did. Windy has nothing to add.</p>}
                  {c.answer === 'dropped' && <p style={{ marginBottom: 0 }}>That is fine. Plans change, and you get to decide what still matters.</p>}
                  {c.answer === 'not_yet' && (
                    <>
                      <p>Not yet is not never. Want Windy to help you make a plan for it?</p>
                      <div className="hstack">
                        <button className="btn primary" style={{ flex: 1 }} onClick={() => plan(c)}>Help me plan it</button>
                        <button className="btn outline" onClick={() => nav('/goals/new')}>Start a goal</button>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </Card>
      ))}

      {!s.tradeoff.no_conflict && o && (
        <>
          <div className="section-head" style={{ marginTop: 18 }}><h3>A message from 2028</h3></div>
          <div style={{ marginBottom: 12 }}><Seg options={opts.map((x) => x.name)} value={o.name} onChange={setPick} /></div>
          <Card>
            <WindyPill label={`From you, 2028 · ${o.name}`} />
            <p style={{ marginTop: 10 }}>Hi {s.user.first_name}. It’s me. {OPENERS[o.id]}</p>
            <p>Back in 2026 the rent went up {money(s.tradeoff.rent_rise_per_fortnight)} a fortnight and I chose “{o.name}”. {o.summary}</p>
            {o.rows.map((r) => <div key={r.label} className="row"><span>{r.label}</span><b style={{ color: r.tone === 'good' ? 'var(--good)' : r.tone === 'warn' ? 'var(--warn)' : 'var(--bad)' }}>{r.value}</b></div>)}
            <p style={{ marginTop: 10, marginBottom: 0 }}>{CLOSERS[o.id]}</p>
            <button className="link" style={{ marginTop: 8 }} onClick={() => nav('/goals/options')}>Compare the plans side by side ›</button>
          </Card>
        </>
      )}

      <Lock>Your notes are private to you. Numbers in the 2028 message come from the calculator. The voice is Windy having fun.</Lock>
    </>
  )
}
