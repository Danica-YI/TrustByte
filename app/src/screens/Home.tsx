// LP-01 / LP-07 / LP-08 / RL-01 / GP-01: one home page, only the top Windy card changes.
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { Card, Chip, Logo, Progress, WindyPill } from '../components/ui'
import { features, isEnabled, type HomeCardId } from '../features'
import { goals, lifeEvent, money, receipt, shortfall, user } from '../data/mia'

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
        <div className="greet">Good evening, {user.firstName}</div>
        <div className="balance">{money(user.everydayBalance, true)}</div>
        <div className="sub">Everyday · Safe to spend <b>{money(user.safeToSpend)}</b> until payday</div>
      </div>

      <div className="hero-overlap">
        {card && !dismissed && <TopCard id={card} onDismiss={() => setDismissed(true)} />}

        {isEnabled('shortfall') && (
          <Card>
            <div className="hstack" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
              <div className="alert-icon">!</div>
              <div>
                <h3>{shortfall.title}</h3>
                <p>{shortfall.body}</p>
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
                <span className="muted">{money(g.saved)} / {money(g.target)}</span>
              </div>
              <Progress value={g.saved} max={g.target} color={g.color} />
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
          <h2>{lifeEvent.title}</h2>
          <p>{lifeEvent.body}</p>
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
          <p>{receipt.merchant} today was {money(receipt.total, true)}. Your usual shop is about {money(receipt.usualShop)}. Want to see where it went? Only you can see this.</p>
          <div className="hstack">
            <button className="btn primary" style={{ flex: 1 }} onClick={() => nav('/receipt')}>Scan receipt</button>
            <button className="btn outline">Quick split</button>
          </div>
        </Card>
      )
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
