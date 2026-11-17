// Home (LP-01 / RL-01 + shortfall and commitments cards). Windy shows every card that still needs Mia;
// once she deals with one (confirms the move, fixes the shortfall, saves the receipt) it goes away for good.
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Card, Logo, Mark, Progress, UserAvatar, WindyPill } from '../components/ui'
import type { Card as HomeCard } from '../api'
import { money, monthYear, shortDate } from '../format'
import { useApp, useSnap } from '../store'
import { ComingUpCard, GroceryCard } from '../components/MoneyCards'

export default function Home() {
  const s = useSnap()
  const nav = useNavigate()
  const [ask, setAsk] = useState('')
  const last = s.history.find((h) => h.undoable && h.changes.length)

  return (
    <>
      <div className="hero">
        <div className="spread"><div className="brand"><Logo /> Westpac</div><Link to="/profile" aria-label="Your profile" style={{ display: 'flex' }}><UserAvatar size={40} /></Link></div>
        <div className="greet">Good evening, {s.user.first_name}</div>
        <div className="balance">{money(s.everyday.balance, true)}</div>
        <div className="sub">Everyday · Safe to spend <b>{money(s.everyday.safe)}</b> until payday {shortDate(s.everyday.next_payday)}</div>
        <form className="ask-windy" onSubmit={(e) => { e.preventDefault(); nav('/chat', { state: { q: ask.trim() } }) }}>
          <Mark />
          <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Ask Windy anything…" aria-label="Ask Windy" />
          <button type="submit">Ask</button>
        </form>
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
            <Link to="/goals" className="link">See all ›</Link>
          </div>
          {s.goals.map((g) => (
            <div key={g.id}>
              <div className="row" style={{ padding: 0 }}>
                <Link to={`/goals/${g.id}`} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>{g.name} ›</Link>
                <span className="muted">{money(g.saved)} / {money(g.target)}</span>
              </div>
              <Progress value={g.saved} max={g.target} color={g.color} />
              <div className="goal-meta">
                <span>{g.per_payday > 0 ? `${money(g.per_payday)} a payday` : 'No auto-save'}</span>
                <span>{g.reached ? `Reached ${monthYear(g.reached)}` : g.reached_label}</span>
              </div>
              <div className="goal-meta">
                <span>{g.members.length ? `With ${g.members.map((m) => m.name).join(', ')}` : 'Just you'}</span>
                <Link to={`/goals/share/${g.id}`} className="link" style={{ fontSize: 12 }}>{g.members.length ? 'Manage ›' : 'Save together ›'}</Link>
              </div>
            </div>
          ))}
        </Card>

        <ComingUpCard />
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
          <p>A {money(card.bond)} bond and a new rent payee this week. Check what it means for your goals?</p>
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
              <p>Everyday could dip to <b>{money(card.low.balance)}</b> around {shortDate(card.low.date)}.</p>
              <Link to="/forecast" className="link">See forecast and fixes ›</Link>
            </div>
          </div>
        </Card>
      )
    case 'commitments':
      return (
        <Card variant="windy">
          <WindyPill label="Commitments" time="Today" />
          <h2>{card.found.length ? `Found ${card.found.length} new regular payment${card.found.length > 1 ? 's' : ''}` : 'Your car insurance went up'}</h2>
          <p>
            {card.found.length > 0 && <>New: {card.found.join(', ')}. </>}
            {card.insurance && !card.insurance.reviewed && <>Car insurance is up {card.insurance.pct}%. </>}
            Pay-later takes {money(card.pay_later.next)} next payday.
          </p>
          <div className="hstack">
            <button className="btn primary" style={{ flex: 1 }} onClick={() => nav('/payments')}>Review</button>
            <button className="btn outline" onClick={() => nav('/pay-later')}>Pay-later</button>
          </div>
        </Card>
      )
    case 'grocery-check':
      return <GroceryCard shop={card.shop} usual={card.usual} />
    case 'dream-nudge':
      return (
        <Card variant="windy">
          <WindyPill label="See what’s possible" />
          <h2>{money(card.weekly)} a week could take you somewhere</h2>
          <p>No plan yet? Start small and see what it adds up to.</p>
          <div className="hstack">
            <button className="btn primary" style={{ flex: 1 }} onClick={() => nav('/dream')}>Show me</button>
            <button className="btn outline" onClick={() => act('dismiss_card', { card: 'dream-nudge' }, 'Hidden. It stays under Insights, Tools.')}>Not now</button>
          </div>
        </Card>
      )
  }
}
