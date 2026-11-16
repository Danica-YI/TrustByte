// Review & approve (LP-05 / JP-02), used by every plan change.
// The proposal came through: input guardrails -> engine -> output checks -> AI explanation -> safe-text checks.
// Nothing changes until Mia taps Approve; then only her simulated plan is updated (and she can undo it).
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, Chip, Lock, TopBar } from '../components/ui'
import { useApp } from '../store'

export default function Review() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { proposals, approve, busy, snap, undo } = useApp()
  const p = proposals[id]
  const [done, setDone] = useState(false)

  if (!p) {
    return (
      <>
        <TopBar title="Review" fallback="/" />
        <Card><p>This review has expired (the page was refreshed). Start again from the screen you came from.</p>
          <button className="btn primary" onClick={() => nav('/')}>Back to home</button></Card>
      </>
    )
  }

  const passed = p.checks.filter((c) => c.ok).length
  const lastEntry = snap?.history[0]

  if (done) {
    return (
      <>
        <TopBar title="Plan updated" fallback="/" />
        <Card>
          <div className="success-tick">✓</div>
          <h2 className="center">{p.title} is now your plan</h2>
          <p className="center">No money has moved. Your goals, forecast and home screen already use the new numbers.</p>
          <div className="change-list">
            {p.changes.map((c) => <div key={c.label} className="row"><span>{c.label}</span><b><span className="from">{c.from}</span>{c.to}</b></div>)}
          </div>
          <button className="btn primary block" style={{ marginTop: 12 }} onClick={() => nav('/')}>Back to home</button>
          <button className="btn ghost block" onClick={() => nav('/forecast')}>See my forecast</button>
          {lastEntry && <button className="btn ghost block small" onClick={async () => { await undo(lastEntry.id); nav('/') }}>Undo this change</button>}
        </Card>
      </>
    )
  }

  return (
    <>
      <TopBar title="Review and approve" />
      <span className="chip windy">{p.title}</span>
      <p className="intro" style={{ marginTop: 8 }}>{p.subtitle}</p>

      <Card>
        <h3>What changes</h3>
        <div className="change-list">
          {p.changes.map((c) => <div key={c.label} className="row"><span>{c.label}</span><b><span className="from">{c.from}</span>{c.to}</b></div>)}
        </div>
      </Card>

      {p.unchanged.length > 0 && (
        <Card>
          <h3>Stays the same</h3>
          <p>{p.unchanged.map((u) => <span key={u.label}>✓ {u.label}: {u.value}<br /></span>)}✓ Rent and bills are covered first</p>
        </Card>
      )}

      <Card variant="windy">
        <div className="spread"><h3>Why Windy suggests this</h3><Chip tone="windy">{p.explanation_source === 'claude' ? '✦ AI explained' : '✦ Windy template'}</Chip></div>
        <p style={{ marginTop: 6 }}>{p.explanation}</p>
        <div className="pipeline">
          <Chip tone="good">✓ {passed} of {p.checks.length} checks passed</Chip>
          <Chip tone="plain">Calculator did the maths</Chip>
        </div>
        <details>
          <summary className="small" style={{ cursor: 'pointer' }}>See the checks</summary>
          {p.checks.map((c, i) => (
            <div key={i} className="row small" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: c.ok ? 'var(--good)' : 'var(--bad)' }}>{c.ok ? '✓' : '✗'} {c.name}</span>
              <span style={{ textAlign: 'right', maxWidth: '55%' }}>{c.detail}</span>
            </div>
          ))}
        </details>
      </Card>

      <button className="btn primary block" disabled={busy} onClick={async () => { if (await approve(p.id)) setDone(true) }}>{busy ? 'Saving…' : 'Approve plan'}</button>
      <button className="btn ghost block" onClick={() => nav(-1)}>Not now</button>
      <Lock>Approving updates your plan only. No money moves unless you do it, and you can undo it.</Lock>
    </>
  )
}
