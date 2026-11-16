// Pay-later plans (Idea 9+15 · Commitments Watch, the BNPL half). Not in the wireframes yet.
// Board copy: "You have 4 pay-later plans taking $186 each payday." Numbers come from the data.
import { useState } from 'react'
import { Card, Chip, Lock, Seg, TopBar, WindyPill } from '../components/ui'
import { extraPlanImpact, forecast, payLaterPlans, shortDate } from '../data/analysis'
import { money } from '../data/mia'

export default function PayLater() {
  const pl = payLaterPlans()
  const base = forecast()
  const [extra, setExtra] = useState<'$100' | '$200' | '$400'>('$200')
  const impact = extraPlanImpact(Number(extra.slice(1)))

  return (
    <>
      <TopBar title="Pay-later plans" />
      <Card variant="windy">
        <WindyPill label="Commitments" />
        <h2>{pl.active.length} plans take {money(pl.lastPaydayTotal)} each payday</h2>
        <p>{money(pl.owed)} still to pay. Next payday ({shortDate(base.nextPayday)}) {money(pl.nextPaydayTotal)} goes out, on top of rent and bills.</p>
      </Card>

      <Card>
        <h3>Active plans</h3>
        {pl.active.map((p) => (
          <div key={p.id} className="row" style={{ alignItems: 'flex-start' }}>
            <div>
              <div>{p.merchant} <span className="muted">· {money(p.total)}</span></div>
              <div className="hstack" style={{ gap: 3, marginTop: 4 }}>
                {p.dates.map((d, i) => <Chip key={d} tone={i < p.paid ? 'good' : 'plain'}>{i < p.paid ? '✓' : ''} {shortDate(d)}</Chip>)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <b>{money(p.instalment, true)}</b>
              <div className="muted">{p.remaining} left</div>
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <h3>Thinking about another plan?</h3>
        <p>Pick a purchase size to see what it does to your Everyday low.</p>
        <Seg options={['$100', '$200', '$400']} value={extra} onChange={setExtra} />
        <div className="row" style={{ marginTop: 10 }}><span>Extra each payday</span><b>{money(impact.instalment, true)}</b></div>
        <div className="row">
          <span>Lowest point around {shortDate(base.low.date)}</span>
          <span><span className="muted">{money(base.low.balance)} →</span> <b style={{ color: impact.low < 0 ? 'var(--bad)' : 'var(--good)' }}>{money(impact.low)}</b></span>
        </div>
      </Card>

      {pl.done.length > 0 && (
        <Card>
          <h3>Paid off</h3>
          {pl.done.map((p) => (
            <div key={p.id} className="row"><span>{p.merchant}</span><span className="muted">{money(p.total)} · finished {shortDate(p.dates[3])}</span></div>
          ))}
        </Card>
      )}
      <Lock>Windy shows the totals only. It doesn’t block a purchase or recommend a lender.</Lock>
    </>
  )
}
