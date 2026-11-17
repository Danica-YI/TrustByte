// Insights tab: a home for every Windy feature, so each one is a real page you can come back to,
// not only a card that appears on Home. The Home cards still surface what needs attention now.
import { Link, NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import { CategoryIcon, Chip, TopBar } from '../components/ui'
import { receipts } from '../data/bank'
import { money, shortDate } from '../format'
import { useSnap } from '../store'

function Tile({ to, icon, label, value, note, flag }: { to: string; icon: string; label: string; value?: string; note: string; flag?: ReactNode }) {
  return (
    <Link to={to} className="tile">
      <div className="spread"><CategoryIcon name={icon} />{flag}</div>
      <div className="tile-label">{label}</div>
      {value && <div className="tile-value">{value}</div>}
      <div className="small">{note}</div>
    </Link>
  )
}

// The Insights tab has two views with tabs on top: Spending first, then Tools (a home for every feature)
export function InsightsTabs() {
  return (
    <>
      <TopBar title="Insights" back={false} />
      <div className="utabs">
        <NavLink to="/insights" end className={({ isActive }) => (isActive ? 'on' : '')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
          </svg>
          Spending
        </NavLink>
        <NavLink to="/insights/tools" className={({ isActive }) => (isActive ? 'on' : '')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
          Tools
        </NavLink>
      </div>
    </>
  )
}

export default function InsightsHub() {
  const s = useSnap()
  const fc = s.forecast
  const c = s.commitments
  const ins = s.insights
  const ev = s.life_event
  const saved = s.goals.reduce((t, g) => t + g.saved, 0)
  const changes = s.history.filter((h) => h.changes.length).length
  const toCheck = c.found.length + (c.yearly.insurance && !c.yearly.insurance.reviewed ? 1 : 0)

  return (
    <>
      <InsightsTabs />

      <div className="section-head"><h3>Money tools</h3></div>
      <div className="tiles">
        <Tile to="/forecast" icon="Cash flow" label="Cash flow forecast" value={money(fc.low.balance)}
          note={`Lowest point, around ${shortDate(fc.low.date)}`} flag={fc.low.balance < 0 ? <Chip tone="bad">Heads up</Chip> : <Chip tone="good">Fine</Chip>} />
        <Tile to="/insights" icon="Shopping" label="Spending" value={money(ins.spent)}
          note={`This month so far. ${ins.vs_same_days > 0 ? '+' : ''}${money(ins.vs_same_days)} vs usual`} />
        <Tile to="/payments" icon="Subscriptions" label="Regular payments" value={money(c.per_fortnight)}
          note={`A fortnight, ${c.count} payments`} flag={toCheck > 0 ? <Chip tone="windy">{toCheck} to check</Chip> : undefined} />
        <Tile to="/goals" icon="Goals" label="Goals" value={money(saved)} note={`Saved across ${s.goals.length} goals`} />
      </div>

      <div className="section-head" style={{ marginTop: 18 }}><h3>Windy tools</h3></div>
      <div className="tiles">
        <Tile to="/life-event" icon="Life events" label="Life events"
          note={ev.status === 'detected' ? 'Looks like you moved home. Check it.' : ev.status === 'confirmed' ? `Move confirmed. Rent ${ev.rent_frequency ?? ''}.` : 'Nothing to check right now.'}
          flag={ev.status === 'detected' ? <Chip tone="windy">New</Chip> : undefined} />
        <Tile to="/dream" icon="Dream" label="Dream Nudge" note="No plan yet? See what a small weekly amount adds up to." />
        <Tile to="/receipt" icon="Receipts" label="Receipt Lens" note={`${receipts.length} receipts. See what a shop was made of.`} />
        <Tile to="/pay-later" icon="Pay later" label="Pay-later plans" note={`${c.pay_later.active.length} plans. ${money(c.pay_later.next_payday_total)} next payday.`} />
        <Tile to="/plan" icon="History" label="Plan history" note={changes ? `${changes} change${changes === 1 ? '' : 's'} saved. Undo any time.` : 'No changes yet.'} />
      </div>

      <p className="small center" style={{ marginTop: 14 }}>Every Windy feature lives here.</p>
    </>
  )
}
