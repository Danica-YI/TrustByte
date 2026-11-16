// LP-01 / LP-07 / LP-08 / RL-01 / GP-01 (+ Commitments card): one home page, only the top Windy card changes.
// Balances, safe-to-spend, the shortfall warning and goals all come from the generated data.
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { Card, Chip, Logo, Progress, WindyPill } from '../components/ui'
import { features, isEnabled, type HomeCardId } from '../features'
import { money } from '../data/mia'
import { everydayBalance, forecast, goals, groceryCheck, lifeEvent, payLaterPlans, safeToSpend, shortDate, yearlyBills } from '../data/analysis'

const GOAL_COLORS: Record<string, string> = { 'goal-japan': '#6d28d9', 'goal-emergency': '#15803d', 'goal-home': '#d4002a', 'goal-bali': '#0e7490' }

export default function Home() {
  const [params] = useSearchParams()
  const [dismissed, setDismissed] = useState(false)
  const requested = params.get('card') as HomeCardId | null
  const firstEnabled = features.find((f) => f.enabled && f.homeCard)?.homeCard
  const card = requested ?? firstEnabled

  return (
    <>
      <div className="hero">
        <div className="brand"><Logo /> harbour</div>
        <div className="greet">Good evening, Mia</div>
        <div className="balance">{money(everydayBalance, true)}</div>
        <div className="sub">Everyday · Safe to spend <b>{money(safeToSpend().safe)}</b> until payday</div>
      </div>

      <div className="hero-overlap">
        {card && !dismissed && <TopCard id={card} onDismiss={() => setDismissed(true)} />}

        {isEnabled('shortfall') && forecast().low.balance < 0 && (
          <Card>
            <div className="hstack" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
              <div className="alert-icon">!</div>
              <div>
                <h3>Early December looks tight</h3>
                <p>After rent and your auto-saves, Everyday could dip to {money(forecast().low.balance)} around {shortDate(forecast().low.date)}.</p>
                <Link to="/forecast" className="link">See forecast and fixes ›</Link>
              </div>
            </div>
          </Card>
        )}

        <Card>
          <div className="spread" style={{ marginBottom: 8 }}>
            <h3>Your life goals</h3>
            <span className="link">See all ›</span>
          </div>
          {goals.map((g) => (
            <div key={g.id}>
              <div className="row" style={{ padding: 0 }}>
                <span>{g.name}</span>
                <span className="muted">{money(g.closing_balance)} / {money(g.goal_target!)}</span>
              </div>
              <Progress value={g.closing_balance} max={g.goal_target!} color={GOAL_COLORS[g.id] ?? 'var(--windy)'} />
            </div>
          ))}
        </Card>
      </div>
    </>
  )
}

function TopCard({ id, onDismiss }: { id: HomeCardId; onDismiss: () => void }) {
  const nav = useNavigate()
  switch (id) {
    case 'life-event':
      return (
        <Card variant="windy">
          <WindyPill label="Life event" time="Just now" />
          <h2>Looks like you’re moving home</h2>
          <p>We spotted a {money(-lifeEvent().bond.amount)} bond to RTA Queensland and a new rent payee this week. Want me to check how this affects your Japan trip and home deposit?</p>
          <div className="hstack">
            <button className="btn primary" style={{ flex: 1 }} onClick={() => nav('/life-event')}>Yes, check my plan</button>
            <button className="btn outline" onClick={onDismiss}>Not now</button>
          </div>
        </Card>
      )
    case 'dream-nudge':
      return (
        <Card variant="windy">
          <WindyPill label="See what’s possible" />
          <h2>$30 a week could take you somewhere</h2>
          <Chip tone="bad">No plan needed</Chip>
          <p style={{ marginTop: 8 }}>You don’t need a goal to start. Your usual month has room for about $30 a week. Here is what that could become.</p>
          <div className="hstack" style={{ background: '#f6f3f9', borderRadius: 12, padding: 10, justifyContent: 'space-between', marginBottom: 10 }}>
            {[['Weekend away', '6 months'], ['New laptop', '10 months'], ['Overseas trip', '19 months']].map(([k, v]) => (
              <div key={k}><div className="muted">{k}</div><b>{v}</b></div>
            ))}
          </div>
          <p style={{ color: 'var(--good)' }}>Still leaves $180 safe to spend this fortnight.</p>
          <div className="hstack">
            <button className="btn primary">Start with $30 ›</button>
            <button className="btn ghost" onClick={onDismiss}>Not now</button>
          </div>
          <p className="small" style={{ marginTop: 8 }}>Why am I seeing this? You have no savings goal yet and your month usually has room. These ideas are the same for everyone, not based on what you buy.</p>
        </Card>
      )
    case 'money-health':
      return (
        <Card variant="windy">
          <WindyPill label="Money health" />
          <h2>You kept 14% of your pay this month</h2>
          <div className="hstack"><Chip tone="good">Up from 9% last month</Chip><Chip>Goal 15%</Chip></div>
          <div className="stacked">
            <div style={{ flex: 14, background: 'var(--good)' }} />
            <div style={{ flex: 12, background: 'var(--windy)' }} />
            <div style={{ flex: 56, background: '#c9c2d4' }} />
            <div style={{ flex: 18, background: '#f2b14c' }} />
          </div>
          <p className="small">Saved 14% · Builds you 12% · Everyday needs 56% · Worth a look 18%</p>
          <div style={{ background: 'var(--good-soft)', borderRadius: 12, padding: 10, margin: '8px 0' }}>
            <b style={{ fontSize: 13 }}>▲ Keep it up: groceries over takeaway</b>
            <div className="small">3 weeks in a row. That’s about $60 more in savings.</div>
          </div>
          <div style={{ background: 'var(--warn-soft)', borderRadius: 12, padding: 10, marginBottom: 10 }}>
            <b style={{ fontSize: 13 }}>● Worth a look: takeaway is $180 above usual</b>
            <div className="small">Skip 2 orders a week and +$45 goes to your Japan trip.</div>
          </div>
          <div className="hstack">
            <button className="btn primary">Boost my savings ›</button>
            <Link to="/insights" className="link">See breakdown</Link>
          </div>
        </Card>
      )
    case 'grocery-check':
      return (
        <Card variant="windy">
          <WindyPill label="Spending check" time="Just now" />
          <h2>Bigger grocery shop than usual</h2>
          <p>{groceryCheck().shop.merchant} on {shortDate(groceryCheck().shop.date)} was {money(groceryCheck().amount, true)}. Your usual shop is about {money(groceryCheck().usual)}. Want to see where it went? Only you can see this.</p>
          <div className="hstack">
            <button className="btn primary" style={{ flex: 1 }} onClick={() => nav('/receipt')}>Scan receipt</button>
            <button className="btn outline" onClick={() => nav('/receipt/quick-split')}>Quick split</button>
          </div>
        </Card>
      )
    case 'commitments': {
      const pl = payLaterPlans(), yb = yearlyBills()
      const ins = yb.due.find((u) => u.label.includes('insurance'))
      const last = yb.history('Car insurance · AAMI').pop()
      return (
        <Card variant="windy">
          <WindyPill label="Commitments" time="Just now" />
          <h2>{pl.active.length} pay-later plans take {money(pl.nextPaydayTotal)} next payday</h2>
          <p>That’s {money(pl.owed)} still to pay across {pl.active.map((p) => p.merchant).join(', ')}.
            {ins && last && <> Your car insurance renews on {shortDate(ins.date)} at {money(-ins.amount)}, up from {money(-last.amount)}.</>}</p>
          <div className="hstack">
            <button className="btn primary" style={{ flex: 1 }} onClick={() => nav('/pay-later')}>See my plans</button>
            <button className="btn outline" onClick={() => nav('/payments?found=insurance')}>Insurance</button>
          </div>
        </Card>
      )
    }
    case 'goal-pace':
      return (
        <Card variant="windy">
          <WindyPill label="Goal check" time="Just now" />
          <h2>Japan trip is running about 6 weeks late</h2>
          <p>At $118 a payday you’d reach $3,500 in late August 2027, not July. $21 more each payday puts you back on track.</p>
          <div className="hstack">
            <button className="btn primary" style={{ flex: 1 }} onClick={() => nav('/goals/options')}>See my options</button>
            <button className="btn outline" onClick={onDismiss}>Not now</button>
          </div>
        </Card>
      )
  }
}
