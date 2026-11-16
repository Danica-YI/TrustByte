// Home (LP-01 / RL-01 + shortfall and commitments cards). Windy shows every card that still needs Mia;
// once she deals with one (confirms the move, fixes the shortfall, saves the receipt) it goes away for good.
import { Link, useNavigate } from 'react-router-dom'
import { Card, Logo, Progress, WindyPill } from '../components/ui'
import type { Card as HomeCard } from '../api'
import { money, monthYear, shortDate } from '../format'
import { useApp, useSnap } from '../store'
import { useConnectedReceipts } from '../data/settings'

export default function Home() {
  const s = useSnap()
  const last = s.history.find((h) => h.undoable && h.changes.length)

  return (
    <>
      <div className="hero">
        <div className="brand"><Logo /> harbour</div>
        <div className="greet">Good evening, {s.user.first_name}</div>
        <div className="balance">{money(s.everyday.balance, true)}</div>
        <div className="sub">Everyday · Safe to spend <b>{money(s.everyday.safe)}</b> until payday {shortDate(s.everyday.next_payday)}</div>
      </div>

      <div className="hero-overlap">
        {s.cards.map((c) => <TopCard key={c.id} card={c} />)}

        {s.cards.length === 0 && (
          <Card variant="windy">
            <WindyPill label="All caught up" />
            <h2>Nothing needs you right now</h2>
            <p>Everyday stays above $0 until {shortDate(s.forecast.points[s.forecast.points.length - 1].date)}. Windy will check again on payday.</p>
          </Card>
        )}

        {last && (
          <Link to="/plan" className="plan-strip">
            <span>✓ <b>{s.plan_choice?.name ?? last.title}</b> · {s.history.filter((h) => h.changes.length).length} plan change{s.history.filter((h) => h.changes.length).length === 1 ? '' : 's'} saved</span>
            <span className="link">Your plan ›</span>
          </Link>
        )}

        <Card>
          <div className="spread" style={{ marginBottom: 8 }}>
            <h3>Your life goals</h3>
            <Link to="/goals/options" className="link">Plan ›</Link>
          </div>
          {s.goals.map((g) => (
            <div key={g.id}>
              <div className="row" style={{ padding: 0 }}>
                <span>{g.name}</span>
                <span className="muted">{money(g.saved)} / {money(g.target)}</span>
              </div>
              <Progress value={g.saved} max={g.target} color={g.color} />
              <div className="goal-meta">
                <span>{g.per_payday > 0 ? `${money(g.per_payday)} a payday` : 'No auto-save'}</span>
                <span>{g.reached ? `Reached ${monthYear(g.reached)}` : g.reached_label}</span>
              </div>
            </div>
          ))}
        </Card>

        <Card>
          <div className="spread"><h3>Coming up on Everyday</h3><Link to="/forecast" className="link">Forecast ›</Link></div>
          {s.upcoming.slice(0, 4).map((u, i) => (
            <div key={i} className="row">
              <div><div>{u.label}</div><div className="muted">{shortDate(u.date)} · {u.source}</div></div>
              <b style={{ color: u.amount > 0 ? 'var(--good)' : undefined }}>{money(u.amount, true)}</b>
            </div>
          ))}
        </Card>
      </div>
    </>
  )
}

function TopCard({ card }: { card: HomeCard }) {
  const nav = useNavigate()
  const { act } = useApp()
  switch (card.id) {
    case 'life-event':
      return (
        <Card variant="windy">
          <WindyPill label="Life event" time="Just now" />
          <h2>Looks like you’re moving home</h2>
          <p>We spotted a {money(card.bond)} bond to RTA Queensland and a new rent payee this week. Want me to check how this affects your Japan trip and home deposit?</p>
          <div className="hstack">
            <button className="btn primary" style={{ flex: 1 }} onClick={() => nav('/life-event')}>Yes, check my plan</button>
            <button className="btn outline" onClick={() => act('dismiss_card', { card: 'life-event' }, 'Hidden. You can still plan from Your life goals.')}>Not now</button>
          </div>
        </Card>
      )
    case 'shortfall':
      return (
        <Card>
          <div className="hstack" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            <div className="alert-icon">!</div>
            <div>
              <h3>Early December looks tight</h3>
              <p>After rent and your auto-saves, Everyday could dip to <b>{money(card.low.balance)}</b> around {shortDate(card.low.date)}.</p>
              <Link to="/forecast" className="link">See forecast and fixes ›</Link>
            </div>
          </div>
        </Card>
      )
    case 'commitments':
      return (
        <Card variant="windy">
          <WindyPill label="Commitments" time="Today" />
          <h2>{card.found.length ? `Windy found ${card.found.length} new regular payment${card.found.length > 1 ? 's' : ''}` : 'Your car insurance went up'}</h2>
          <p>
            {card.found.length > 0 && <>{card.found.join(' and ')} {card.found.length > 1 ? 'look like subscriptions' : 'looks like a subscription'} you started recently. </>}
            {card.insurance && !card.insurance.reviewed && <>Car insurance renews {shortDate(card.insurance.due)} at {money(card.insurance.now)}, up {card.insurance.pct}%. </>}
            {card.pay_later.count} pay-later plans take {money(card.pay_later.next)} next payday.
          </p>
          <div className="hstack">
            <button className="btn primary" style={{ flex: 1 }} onClick={() => nav('/payments')}>Review</button>
            <button className="btn outline" onClick={() => nav('/pay-later')}>Pay-later</button>
          </div>
        </Card>
      )
    case 'grocery-check':
      return <GroceryCard card={card} />
  }
}

function GroceryCard({ card }: { card: Extract<HomeCard, { id: 'grocery-check' }> }) {
  const nav = useNavigate()
  const connected = useConnectedReceipts()
  const rid = useSnap().grocery.shop.receipt_id
  return (
        <Card variant="windy">
          <WindyPill label="Spending check" time="Just now" />
          <h2>Bigger grocery shop than usual</h2>
          <p>{card.shop.merchant} on {shortDate(card.shop.date)} was {money(card.shop.amount, true)}. Your usual shop is about {money(card.usual)}.
            {connected ? <> {card.shop.merchant} sent the itemised receipt, so I can show you where it went.</> : <> Want to see where it went?</>} Only you can see this.</p>
          <div className="hstack">
            {connected
              ? <button className="btn primary" style={{ flex: 1 }} onClick={() => nav(`/receipt/${rid}`)}>See what was in it</button>
              : <button className="btn primary" style={{ flex: 1 }} onClick={() => nav(`/receipt/${rid}?source=scan`)}>Scan receipt</button>}
            <button className="btn outline" onClick={() => nav('/receipt/quick-split')}>Quick split</button>
          </div>
          {!connected && <button className="link" style={{ marginTop: 10 }} onClick={() => nav('/receipt/settings')}>Get receipts automatically ›</button>}
        </Card>
  )
}
