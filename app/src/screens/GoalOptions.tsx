// LP-04 · Goal conflict · 3 options
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Chip, Seg, TopBar } from '../components/ui'
import { planOptions } from '../data/mia'

export default function GoalOptions() {
  const nav = useNavigate()
  const [priority, setPriority] = useState<'Japan' | 'Home' | 'Not sure'>('Not sure')
  const [picked, setPicked] = useState<'A' | 'B' | 'C'>('B')

  return (
    <>
      <TopBar title="Your options" />
      <p className="intro">Money is tighter after the move, so not every goal fits as planned. Here’s what each choice means. Windy won’t pick for you.</p>
      <div className="hstack" style={{ marginBottom: 12 }}>
        <span className="muted">Your priority:</span>
        <Seg options={['Japan', 'Home', 'Not sure']} value={priority} onChange={setPriority} />
      </div>

      {planOptions.map((o) => (
        <Card key={o.id} variant={picked === o.id ? 'selected' : undefined} onClick={() => setPicked(o.id)}>
          <div className="spread">
            <div className="hstack">
              <span className="chip windy">{o.id}</span>
              <h3 style={{ margin: 0 }}>{o.name}</h3>
            </div>
            <input type="radio" readOnly checked={picked === o.id} />
          </div>
          <p style={{ marginTop: 6 }}>{o.summary}</p>
          {o.rows.map((r) => (
            <div key={r.label} className="row"><span>{r.label}</span><Chip tone={r.tone}>{r.value}</Chip></div>
          ))}
          {o.note && <div style={{ color: 'var(--brand)', fontSize: 12, fontWeight: 600, marginTop: 4 }}>{o.note}</div>}
        </Card>
      ))}

      <button className="btn primary block" onClick={() => nav(`/goals/review/${picked}`)}>Review option {picked}</button>
      <p className="small center" style={{ marginTop: 10 }}>Figures from Windy’s calculator using your confirmed rent and 3 months of history.</p>
    </>
  )
}
