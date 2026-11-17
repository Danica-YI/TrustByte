// Time machine: the three trade-off options, told as a message from future Mia.
// Every date and amount comes from the engine (the same figures as Your options). Only the voice is new.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Lock, Seg, TopBar, WindyPill } from '../components/ui'
import { money } from '../format'
import { useSnap } from '../store'

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

export default function TimeMachine() {
  const nav = useNavigate()
  const s = useSnap()
  const opts = s.tradeoff.options
  const [pick, setPick] = useState(opts[0]?.name ?? '')
  const o = opts.find((x) => x.name === pick) ?? opts[0]

  if (s.tradeoff.no_conflict || !o) {
    return <><TopBar title="Time machine" fallback="/insights/tools" /><Card><p>There is no trade-off to look at right now, so future you has nothing to report.</p></Card></>
  }

  return (
    <>
      <TopBar title="Time machine" fallback="/insights/tools" />
      <p className="intro">Pick a plan and hear from yourself in 2028.</p>
      <div style={{ marginBottom: 14 }}><Seg options={opts.map((x) => x.name)} value={o.name} onChange={setPick} /></div>

      <Card variant="windy">
        <WindyPill label={`From you, 2028 · ${o.name}`} />
        <p style={{ marginTop: 10 }}>Hi {s.user.first_name}. It’s me.</p>
        <p>{OPENERS[o.id]}</p>
        <p>Back in 2026 the rent went up {money(s.tradeoff.rent_rise_per_fortnight)} a fortnight and I chose “{o.name}”. {o.summary}</p>
        {o.rows.map((r) => <div key={r.label} className="row"><span>{r.label}</span><b style={{ color: r.tone === 'good' ? 'var(--good)' : r.tone === 'warn' ? 'var(--warn)' : 'var(--bad)' }}>{r.value}</b></div>)}
        <div className="row"><span>Lowest Everyday that month</span><b>{money(o.low_after)}</b></div>
        <p style={{ marginTop: 10, marginBottom: 0 }}>{CLOSERS[o.id]}</p>
      </Card>

      <button className="btn primary block" onClick={() => nav('/goals/options')}>Compare the plans side by side</button>
      <Lock>The dates and amounts are from the calculator, the same as Your options. The voice is Windy having fun.</Lock>
    </>
  )
}
