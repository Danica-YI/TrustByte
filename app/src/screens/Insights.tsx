// Harbour 02 · Insights
import { useState } from 'react'
import { Card, Chip, Seg, TopBar, WindyPill } from '../components/ui'
import { insights, money } from '../data/mia'

export default function Insights() {
  const [range, setRange] = useState<'This month' | '6 months' | 'Year'>('6 months')
  const max = Math.max(...insights.months.map((m) => m.v))

  return (
    <>
      <TopBar title="Insights" fallback="/" />
      <Seg options={['This month', '6 months', 'Year']} value={range} onChange={setRange} />

      <Card>
        <div className="muted" style={{ marginTop: 4 }}>Spent in November so far</div>
        <div className="spread">
          <div style={{ fontSize: 28, fontWeight: 800 }}>{money(insights.spentThisMonth)}</div>
          <Chip tone="bad">+{money(insights.vsAverage)} vs average</Chip>
        </div>
        <div className="bars">
          {insights.months.map((m, i) => (
            <div key={m.m}>
              <div className={`bar ${i === insights.months.length - 1 ? 'now' : ''}`} style={{ height: `${(m.v / max) * 90}px` }} />
              {m.m}
            </div>
          ))}
        </div>
        <div className="small">avg {money(insights.average)}</div>
      </Card>

      <Card variant="windy">
        <WindyPill label="Money Coach" />
        <p style={{ marginTop: 8 }}>Eating out (+$176) and Shopping (+$130) drive the jump. 14 food delivery orders this month, your usual is 8. Groceries and bills are under average.</p>
        <button className="btn outline">Set an Eating out budget</button>
      </Card>

      <Card>
        <h3>By category vs your average</h3>
        {insights.categories.map((c) => {
          const pct = Math.round(((c.spent - c.avg) / c.avg) * 100)
          return (
            <div key={c.name} className="row">
              <div><div>{c.name}</div><div className="muted">{money(c.spent)} · avg {money(c.avg)}</div></div>
              <Chip tone={pct > 20 ? 'bad' : pct > 0 ? 'warn' : 'good'}>{pct === 0 ? 'On track' : `${pct > 0 ? '+' : '−'}${Math.abs(pct)}%`}</Chip>
            </div>
          )
        })}
        <p className="small" style={{ marginTop: 8 }}>Transactions are recorded and categorised automatically. Tap a category to fix one.</p>
      </Card>
    </>
  )
}
