// Cards shown on more than one page, so the numbers and buttons are always the same:
// - ComingUpCard: the next payments out of Everyday as a list (Home; Payments draws them as a timeline)
// - GroceryCard: Windy's "bigger grocery shop than usual" nudge (Home)
// - ReceiptsToSortCard: every receipt not sorted yet (Insights)
import { Link, useNavigate } from 'react-router-dom'
import { Card, WindyPill } from './ui'
import { money, shortDate } from '../format'
import { useSnap } from '../store'
import { useConnectedReceipts } from '../data/settings'

export function ComingUpCard({ count = 4 }: { count?: number }) {
  const s = useSnap()
  return (
    <Card>
      <div className="spread"><h3>Coming up on Everyday</h3><Link to="/forecast" className="link">Forecast ›</Link></div>
      {s.upcoming.slice(0, count).map((u, i) => (
        <div key={i} className="row">
          <div><div>{u.label}</div><div className="muted">{shortDate(u.date)} · {u.source}</div></div>
          <b style={{ color: u.amount > 0 ? 'var(--good)' : undefined, whiteSpace: 'nowrap' }}>{money(u.amount, true)}</b>
        </div>
      ))}
    </Card>
  )
}

// Every receipt Mia hasn't sorted yet (breakdown not saved), newest first. Tap one to sort it.
// The shop Windy flagged as bigger than usual is marked. Hidden once everything is sorted.
export function ReceiptsToSortCard() {
  const s = useSnap()
  const nav = useNavigate()
  const connected = useConnectedReceipts()
  const todo = s.receipts.filter((r) => !r.reviewed).sort((a, b) => b.receipt.date.localeCompare(a.receipt.date))
  if (todo.length === 0) return null
  const open = (id: string) => nav(`/receipt/${id}${connected ? '' : '?source=scan'}`)
  return (
    <Card variant="windy">
      <WindyPill label={`Receipts to sort · ${todo.length}`} />
      <p className="small" style={{ margin: '6px 0 4px' }}>See where each shop went, grouped by money (never health or diet).</p>
      {todo.map((r) => (
        <button key={r.receipt.id} className="row" onClick={() => open(r.receipt.id)}
          style={{ width: '100%', background: 'none', border: 'none', padding: '8px 0', cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'inherit' }}>
          <div>
            <div>{r.receipt.store} {r.receipt.id === s.grocery.shop.receipt_id && <span className="chip warn">Bigger than usual</span>}</div>
            <div className="muted">{shortDate(r.receipt.date)} · {r.receipt.items.length} items</div>
          </div>
          <span style={{ whiteSpace: 'nowrap' }}><b>{money(r.receipt.total, true)}</b> <span className="link">›</span></span>
        </button>
      ))}
      <div className="spread" style={{ marginTop: 6 }}>
        <button className="link" onClick={() => nav('/receipt/quick-split')}>No receipt? Quick split ›</button>
        {!connected && <button className="link" onClick={() => nav('/receipt/settings')}>Get receipts automatically ›</button>}
      </div>
    </Card>
  )
}

type Shop = { merchant: string; date: string; amount: number }

export function GroceryCard({ shop, usual }: { shop: Shop; usual: number }) {
  const nav = useNavigate()
  const connected = useConnectedReceipts()
  const rid = useSnap().grocery.shop.receipt_id
  return (
    <Card variant="windy">
      <WindyPill label="Spending check" time="Just now" />
      <h2>Bigger grocery shop than usual</h2>
      <p>{shop.merchant} on {shortDate(shop.date)} was {money(shop.amount, true)}, usually about {money(usual)}.
        {connected ? <> The itemised receipt is ready.</> : <> See where it went?</>}</p>
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
