// RL-02 · Receipt breakdown (Idea 10 · Receipt Lens). /receipt/:id, default the big Coles shop.
// Groups are summed by the engine from the itemised receipt, and checked against the card payment.
// "Save breakdown" is saved to Mia's plan, so the home card goes away and the receipt shows as saved.
// Source: a connected merchant (consent switch in /receipt/settings, off by default) or a scanned photo (?source=scan).
// With real AI, a photo goes to a multimodal model that extracts items; the same engine code sums and checks.
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Card, Chip, Lock, TopBar } from '../components/ui'
import { money, shortDate } from '../format'
import { useApp, useSnap } from '../store'
import { useConnectedReceipts } from '../data/settings'

export default function Receipt() {
  const s = useSnap()
  const nav = useNavigate()
  const { act, busy } = useApp()
  const { id = s.grocery.shop.receipt_id } = useParams()
  const r = s.receipts.find((x) => x.receipt.id === id) ?? s.receipts[0]
  const month = s.grocery.month
  const [params] = useSearchParams()
  const connected = useConnectedReceipts()
  const scanned = params.get('source') === 'scan'

  if (!s.consent.receipts) {
    return <><TopBar title="Receipt breakdown" fallback="/" /><Card><p>Reading receipts is off in Your data and consent.</p></Card></>
  }

  if (!connected && !scanned) {
    return (
      <>
        <TopBar title="Receipt breakdown" fallback="/" />
        <Card>
          <h3>{r.paid_merchant ?? r.receipt.merchant} · {money(r.receipt.total, true)}</h3>
          <p>Connected receipts are off, so Windy can’t see what was in this shop.</p>
          <div className="stack">
            <button className="btn primary" onClick={() => nav('/receipt/settings')}>Turn on connected receipts</button>
            <button className="btn outline" onClick={() => nav(`/receipt/${r.receipt.id}?source=scan`)}>Scan the paper receipt instead</button>
            <button className="btn ghost" onClick={() => nav('/receipt/quick-split')}>Tick what you bought</button>
          </div>
        </Card>
        <Lock>Off means off: nothing is read until you choose one of these.</Lock>
      </>
    )
  }

  return (
    <>
      <TopBar title="Receipt breakdown" fallback="/" />
      <Card>
        <div className="spread"><h3>{r.receipt.store}</h3><span className="muted">{shortDate(r.receipt.date)} · {money(r.receipt.total, true)}</span></div>
        <div style={{ margin: '2px 0 8px' }}>
          {scanned
            ? <span className="chip plain">📷 Read from your receipt photo</span>
            : <span className="chip good">✓ Sent by {r.receipt.merchant} · connected receipts</span>}
        </div>
        {Object.entries(r.groups).map(([g, v]) => <div key={g} className="row"><span>{g}</span><b>{money(v, true)}</b></div>)}
        <hr className="sep" />
        <div className="row">
          <span>{r.matches ? 'Total matches your payment' : 'Total does not match'}</span>
          <b style={{ color: r.matches ? 'var(--good)' : 'var(--bad)' }}>{r.matches ? '✓' : '✗'} {money(r.sum, true)}</b>
        </div>
        <details style={{ marginTop: 6 }}>
          <summary className="small" style={{ cursor: 'pointer' }}>{r.receipt.items.length} items</summary>
          {r.receipt.items.map((i, k) => <div key={k} className="row small"><span>{i.name} <span className="muted">· {i.group}</span></span><span>{money(i.price, true)}</span></div>)}
        </details>
      </Card>

      <Card variant="windy">
        <h3>This month so far</h3>
        <p>
          • Groceries: {money(month.total)}<br />
          • Extras and snacks were about {Math.round(month.extras_share * 100)}% of your itemised shops, so roughly {money(month.extras_estimate)}<br />
          • Halving extras would free about {money(month.extras_estimate / 2)} for your goals
        </p>
      </Card>

      <Card>
        <h3>Other receipts</h3>
        {s.receipts.filter((x) => x.receipt.id !== r.receipt.id).map((x) => (
          <Link key={x.receipt.id} to={`/receipt/${x.receipt.id}${scanned ? '?source=scan' : ''}`} className="row">
            <span>{x.receipt.store} <span className="muted">· {shortDate(x.receipt.date)}</span> {x.reviewed && <Chip tone="good">saved</Chip>}</span>
            <b>{money(x.receipt.total, true)}</b>
          </Link>
        ))}
      </Card>

      <Card>
        <h3>How this was worked out</h3>
        <p>{scanned ? 'Windy read your receipt photo' : `${r.receipt.merchant} sent the itemised receipt through a receipt network, matched to your card payment`}, then grouped each item. A calculator checked that the groups add up to what you paid.</p>
        <h3>What this is not</h3>
        <p>Groups are about money, not health or diet. Nothing here is shared outside Westpac.</p>
        <div className="small">Linked to your {r.paid_merchant} payment on {shortDate(r.receipt.date)}</div>
      </Card>

      {r.reviewed
        ? <div className="plan-strip">✓ Breakdown saved to your records</div>
        : <button className="btn primary block" disabled={busy} onClick={async () => { if (await act('receipt_save', { receipt_id: r.receipt.id }, 'Breakdown saved')) nav('/') }}>Save breakdown</button>}
      <Lock>Only you can see this. You can delete a receipt any time.</Lock>
    </>
  )
}
