// Dream Nudge (LP-07): for people with no plan yet. It starts from inspiration, not from their data:
// pick a small weekly amount and see what it adds up to. Windy does not read spending for this page,
// so it never guesses what someone "should" want. The examples are round figures, not quotes.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Lock, Seg, TopBar, WindyPill } from '../components/ui'
import { money } from '../format'
import { useSnap } from '../store'
import { transactions } from '../data/bank'

// "Surprise me": truly random, nothing to do with the customer
const SURPRISES = [
  { name: 'Learn to scuba dive', target: 900 }, { name: 'Festival weekend', target: 700 }, { name: 'Hot air balloon ride', target: 450 },
  { name: 'A proper espresso machine', target: 1200 }, { name: 'Road trip up the coast', target: 1500 }, { name: 'Pottery course', target: 400 },
  { name: 'New Zealand ski week', target: 3000 }, { name: 'A really good bike', target: 1600 },
]
// "Based on what I like": opt-in guesses from where she spends most often, always shown with the reason
const LIKES: Record<string, { name: string; target: number }> = {
  'Eating out': { name: 'A food trip', target: 2000 },
  Entertainment: { name: 'Front row tickets', target: 500 },
  Transport: { name: 'Road trip up the coast', target: 1500 },
  Home: { name: 'Do up your new place', target: 1200 },
  Shopping: { name: 'A no-guilt shopping day', target: 600 },
}

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
  const [idea, setIdea] = useState<{ name: string; target: number; why: string } | null>(null)
  const surprise = () => { const x = SURPRISES[Math.floor(Math.random() * SURPRISES.length)]; setIdea({ ...x, why: 'Picked at random. Nothing to do with your spending.' }) }
  const fromLikes = () => {
    // The place she went to most often this year, in a category we have an idea for
    const counts = new Map<string, { n: number; category: string }>()
    for (const t of transactions) {
      if (t.account !== 'everyday' || t.amount >= 0 || !(t.category in LIKES)) continue
      const row = counts.get(t.merchant) ?? { n: 0, category: t.category }
      row.n += 1
      counts.set(t.merchant, row)
    }
    const top = [...counts.entries()].sort((a, b) => b[1].n - a[1].n)
    const [merchant, row] = top[Math.floor(Math.random() * Math.min(4, top.length))] ?? []
    if (merchant && row) setIdea({ ...LIKES[row.category], why: `A guess, because you went to ${merchant} ${row.n} times this year. It may be wrong.` })
  }
  const weekly = Number(pick.slice(1))
  const months = (target: number) => Math.ceil(target / weekly / (52 / 12))
  const start = (name?: string, target?: number) => nav('/goals/new', { state: { name, target, amount: weekly * 2 } })

  if (!s.consent.goals) {
    return <><TopBar title="Dream Nudge" fallback="/insights/tools" /><Card><p>Goal planning is off in Your data and consent.</p></Card></>
  }

  return (
    <>
      <TopBar title="Dream Nudge" fallback="/insights/tools" />

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
        <h3>Not sure what you want?</h3>
        <div className="hstack" style={{ marginTop: 8 }}>
          <button className="btn outline" style={{ flex: 1 }} onClick={surprise}>Surprise me</button>
          {s.consent.spending_insights && <button className="btn outline" style={{ flex: 1 }} onClick={fromLikes}>Based on what I like</button>}
        </div>
        {idea && (
          <div className="row" style={{ marginTop: 6 }}>
            <div><div><b>{idea.name}</b></div><div className="muted">About {money(idea.target)} · {months(idea.target)} months at {pick} a week</div><div className="small">{idea.why}</div></div>
            <button className="link" onClick={() => start(idea.name, idea.target)}>Start ›</button>
          </div>
        )}
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

      <Lock>Windy only looks at your spending here if you tap “Based on what I like”. These are ideas, and you choose what matters.</Lock>
    </>
  )
}
