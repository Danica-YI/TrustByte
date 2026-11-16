// LP-04 · Goal trade-off options (Idea 2). All three options are calculated by the Python engine from
// Mia's confirmed rent and current auto-saves. Reviewing one asks the backend for a full proposal.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Chip, Seg, TopBar } from '../components/ui'
import { money } from '../format'
import { useApp, useSnap } from '../store'

export default function GoalOptions() {
  const nav = useNavigate()
  const s = useSnap()
  const { propose, busy } = useApp()
  const t = s.tradeoff
  const [priority, setPriority] = useState<'Japan' | 'Home' | 'Not sure'>('Not sure')
  const [picked, setPicked] = useState<'A' | 'B' | 'C'>('B')
  const choosePriority = (p: typeof priority) => {
    setPriority(p)
    setPicked(p === 'Japan' ? 'A' : p === 'Home' ? 'C' : 'B')
  }
  const review = async () => {
    const p = await propose('goal_plan', { option: picked })
    if (p) nav(`/review/${p.id}`)
  }

  return (
    <>
      <TopBar title="Your options" fallback="/" />
      {s.plan_choice?.kind === 'goal_plan' && <div className="plan-strip">✓ Current plan: {s.plan_choice.name}. The options below start from it.</div>}

      {t.no_conflict ? (
        <Card variant="windy">
          <h3>No goal needs to change</h3>
          <p>Your rent works out at {money(t.rent_per_fortnight)} a fortnight, which is less than before ({money(t.old_rent_per_fortnight)}). Your current auto-saves still fit.</p>
        </Card>
      ) : (
        <>
          <p className="intro">Rent is up {money(t.rent_rise_per_fortnight)} a fortnight ({money(t.old_rent_per_fortnight)} → {money(t.rent_per_fortnight)}), so your auto-saves have to cover it. Here’s what each choice means. Windy won’t pick for you.</p>
          <div className="hstack" style={{ marginBottom: 12 }}>
            <span className="muted">Your priority:</span>
            <Seg options={['Japan', 'Home', 'Not sure']} value={priority} onChange={choosePriority} />
          </div>
          {t.options.map((o) => (
            <Card key={o.id} variant={picked === o.id ? 'selected' : undefined} onClick={() => setPicked(o.id)}>
              <div className="spread">
                <div className="hstack"><span className="chip windy">{o.id}</span><h3 style={{ margin: 0 }}>{o.name}</h3></div>
                <input type="radio" readOnly checked={picked === o.id} />
              </div>
              <p style={{ marginTop: 6 }}>{o.summary}</p>
              {o.rows.map((r) => <div key={r.label} className="row"><span>{r.label}</span><Chip tone={r.tone}>{r.value}</Chip></div>)}
              <div className="row"><span>Everyday low in Dec</span><span><span className="muted">{money(t.low_now)} →</span> <b>{money(o.low_after)}</b></span></div>
            </Card>
          ))}
          <button className="btn primary block" disabled={busy} onClick={review}>{busy ? 'Windy is working it out…' : `Review option ${picked}`}</button>
        </>
      )}
      <button className="btn ghost block" onClick={() => nav('/goals/japan-sooner')}>Want Japan sooner instead? Ask Windy</button>
      <p className="small center" style={{ marginTop: 10 }}>Figures from Windy’s calculator using your confirmed rent and your current auto-saves.</p>
    </>
  )
}
