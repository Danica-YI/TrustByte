// Dream Nudge (LP-07): for people with no plan yet. It starts from inspiration, not from their data:
// pick a small weekly amount and see what it adds up to. Windy does not read spending for this page,
// so it never guesses what someone "should" want. The examples are round figures, not quotes.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Lock, Seg, TopBar, WindyPill } from '../components/ui'
import { money } from '../format'
import { useSnap } from '../store'

const AMOUNTS = ['$10', '$20', '$30', '$50', '$100'] as const
const IDEAS = [
  { name: 'Weekend away', target: 600 },
  { name: 'Rainy day buffer', target: 1000 },
  { name: 'New laptop', target: 1800 },
  { name: 'A week in Bali', target: 2500 },
  { name: 'Japan trip', target: 3500 },
]

export default function DreamNudge() {
  const nav = useNavigate()
  const s = useSnap()
  const [pick, setPick] = useState<typeof AMOUNTS[number]>('$30')
  const weekly = Number(pick.slice(1))
  const months = (target: number) => Math.ceil(target / weekly / (52 / 12))
  const start = (name?: string, target?: number) => nav('/goals/new', { state: { name, target, amount: weekly * 2 } })

  if (!s.consent.goals) {
    return <><TopBar title="Dream Nudge" fallback="/insights" /><Card><p>Goal planning is off in Your data and consent.</p></Card></>
  }

  return (
    <>
      <TopBar title="Dream Nudge" fallback="/insights" />

      <Card variant="windy">
        <WindyPill label="See what’s possible" />
        <h2 style={{ marginTop: 8 }}>{pick} a week could take you somewhere</h2>
        <p>No plan yet? Start small. Pick an amount and see what it adds up to.</p>
        <Seg options={[...AMOUNTS]} value={pick} onChange={setPick} />
        <div className="row" style={{ marginTop: 10 }}><span>In 6 months</span><b>{money(weekly * 26)}</b></div>
        <div className="row"><span>In 1 year</span><b>{money(weekly * 52)}</b></div>
        <div className="row"><span>In 2 years</span><b>{money(weekly * 104)}</b></div>
      </Card>

      <Card>
        <h3>What that could be</h3>
        <p className="small" style={{ margin: '2px 0 6px' }}>Round example figures, not quotes. Change the target to suit you.</p>
        {IDEAS.map((i) => (
          <div key={i.name} className="row">
            <div><div>{i.name}</div><div className="muted">About {money(i.target)} · {months(i.target)} months at {pick} a week</div></div>
            <button className="link" onClick={() => start(i.name, i.target)}>Start ›</button>
          </div>
        ))}
        <button className="btn primary block" style={{ marginTop: 12 }} onClick={() => start()}>Start my own goal with {pick} a week</button>
      </Card>

      <Lock>Windy did not look at your spending for this page. These are ideas, and you choose what matters.</Lock>
    </>
  )
}
