// Your plan: every change Mia approved or confirmed, newest first, with undo.
// This is the Plan State box in the architecture (saved on the server, survives refreshes).
import { Link } from 'react-router-dom'
import { Card, Lock, TopBar } from '../components/ui'
import { money, monthYear } from '../format'
import { useApp, useSnap } from '../store'

export default function Plan() {
  const s = useSnap()
  const { undo, busy } = useApp()

  return (
    <>
      <TopBar title="Your plan" fallback="/" />
      <p className="intro">Everything you’ve approved or told Windy. Undo any change; later changes are undone with it.</p>

      <Card>
        <h3>Goals on your current plan</h3>
        {s.goals.map((g) => (
          <div key={g.id} className="row">
            <div><div>{g.name}</div><div className="muted">{money(g.saved)} of {money(g.target)} · {g.per_payday > 0 ? `${money(g.per_payday)} a payday` : 'no auto-save'}</div></div>
            <b>{g.reached ? monthYear(g.reached) : '—'}</b>
          </div>
        ))}
        <div className="row"><span>Everyday lowest point (5 weeks)</span><b style={{ color: s.forecast.low.balance < 0 ? 'var(--bad)' : 'var(--good)' }}>{money(s.forecast.low.balance)}</b></div>
        {Object.entries(s.budgets).map(([k, v]) => <div key={k} className="row"><span>{k} limit</span><b>{money(v)} a week</b></div>)}
      </Card>

      {s.history.length === 0 && (
        <Card><p>No changes yet. Start from the Windy cards on <Link to="/" className="link">Home</Link>.</p></Card>
      )}
      {s.history.map((h) => (
        <Card key={h.id}>
          <div className="spread">
            <div><h3 style={{ margin: 0 }}>{h.title}</h3><div className="muted">{new Date(h.time).toLocaleString('en-AU', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</div></div>
            {h.undoable && <button className="link" disabled={busy} onClick={() => undo(h.id)}>Undo</button>}
          </div>
          {h.changes.length > 0 && (
            <div className="change-list" style={{ marginTop: 6 }}>
              {h.changes.map((c) => <div key={c.label} className="row small"><span>{c.label}</span><b><span className="from">{c.from}</span>{c.to}</b></div>)}
            </div>
          )}
        </Card>
      ))}
      <Lock>Only your simulated plan changes. No money has moved.</Lock>
    </>
  )
}
