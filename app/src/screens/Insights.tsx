// Harbour 02 · Insights (Ideas 5+6 · Spending Behaviour Coach). Real figures from 12 months of history,
// compared fairly (same days of earlier months). Setting a limit goes through review and approve,
// and then lowers the usual spending the forecast plans for.
import { useNavigate } from 'react-router-dom'
import { Card, CategoryIcon, Chip, WindyPill } from '../components/ui'
import { money } from '../format'
import { useApp, useSnap } from '../store'
import { InsightsTabs } from './InsightsHub'

export default function Insights() {
  const s = useSnap()
  const nav = useNavigate()
  const { propose, busy } = useApp()
  const ins = s.insights
  const max = Math.max(...ins.months.map((m) => m.v))
  const limit = ins.budgets['Eating out']

  if (!s.consent.spending_insights) {
    return <><InsightsTabs /><Card><p>Spending coaching is off in Your data and consent.</p></Card></>
  }

  return (
    <>
      <InsightsTabs />
      <Card>
        <div className="muted" style={{ marginTop: 4 }}>Spent in November so far ({ins.days_counted} days)</div>
        <div className="spread" style={{ marginTop: 2 }}>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{money(ins.spent)}</div>
          <Chip tone={ins.vs_same_days > 0 ? 'bad' : 'good'}>{ins.vs_same_days > 0 ? '+' : ''}{money(ins.vs_same_days)} vs usual by now</Chip>
        </div>
        <div className="bars">
          {ins.months.map((m) => (
            <div key={m.m}><div className={`bar ${m.partial ? 'now' : ''}`} style={{ height: `${(m.v / max) * 84}px` }} />{m.m}</div>
          ))}
        </div>
        <div className="small" style={{ marginTop: 4 }}>Usual full month: {money(ins.avg_full)}</div>
      </Card>

      <Card variant="windy">
        <WindyPill label="Money Coach" />
        <p style={{ marginTop: 10, marginBottom: 12 }}>{ins.coach}</p>
        {limit
          ? <div className="plan-strip" style={{ marginBottom: 0 }}>✓ Eating out limit: {money(limit)} a week. Your forecast plans for it.</div>
          : <button className="btn outline" disabled={busy} onClick={async () => { const p = await propose('budget', { category: 'Eating out', weekly: 60 }); if (p) nav(`/review/${p.id}`) }}>
              Set a {money(60)} a week Eating out limit
            </button>}
      </Card>

      <Card>
        <h3>By category vs the same days of earlier months</h3>
        {ins.categories.map((c) => {
          const pct = Math.round((c.diff_vs_same_days / c.avg_same_days) * 100)
          return (
            <div key={c.category} className="row">
              <div className="hstack" style={{ flexWrap: 'nowrap', gap: 10 }}>
                <CategoryIcon name={c.category} />
                <div><div>{c.category}</div><div className="muted">{money(c.this_month)} · usual by now {money(c.avg_same_days)}</div></div>
              </div>
              <Chip tone={pct > 20 ? 'bad' : pct > 0 ? 'warn' : 'good'}>{Math.abs(pct) < 3 ? 'On track' : `${pct > 0 ? '+' : '−'}${Math.abs(pct)}%`}</Chip>
            </div>
          )
        })}
        <p className="small" style={{ marginTop: 8 }}>Compared with days 1 to {ins.days_counted} of earlier months.</p>
      </Card>
    </>
  )
}
