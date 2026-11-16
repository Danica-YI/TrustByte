// RL-02 · Receipt breakdown (Idea 10 · Receipt Lens). /receipt/:id, default the big Coles shop.
// Groups are summed from the itemised receipt; a check confirms they add up to the card payment.
// With real AI: receipt photo → multimodal model extracts items → this same code sums and checks.
import { useParams } from 'react-router-dom'
import { Card, Lock, TopBar } from '../components/ui'
import { groceriesThisMonth, receiptGroups, shortDate } from '../data/analysis'
import { transactions } from '../data/bank'
import { money } from '../data/mia'

export default function Receipt() {
  const { id = 'rcpt-coles-20261112' } = useParams()
  const { receipt, groups, sum, matches } = receiptGroups(id)
  const paid = transactions.find((t) => t.receipt_id === id)
  const month = groceriesThisMonth()

  return (
    <>
      <TopBar title="Receipt breakdown" fallback="/?card=grocery-check" />
      <Card>
        <div className="spread"><h3>{receipt.store}</h3><span className="muted">{shortDate(receipt.date)} · {money(receipt.total, true)}</span></div>
        {Object.entries(groups).map(([g, v]) => (
          <div key={g} className="row"><span>{g}</span><b>{money(v, true)}</b></div>
        ))}
        <hr className="sep" />
        <div className="row">
          <span>{matches ? 'Total matches your payment' : 'Total does not match'}</span>
          <b style={{ color: matches ? 'var(--good)' : 'var(--bad)' }}>{matches ? '✓' : '✗'} {money(sum, true)}</b>
        </div>
        <details style={{ marginTop: 6 }}>
          <summary className="small" style={{ cursor: 'pointer' }}>{receipt.items.length} items</summary>
          {receipt.items.map((i) => (
            <div key={i.name} className="row small"><span>{i.name} <span className="muted">· {i.group}</span></span><span>{money(i.price, true)}</span></div>
          ))}
        </details>
      </Card>

      <Card variant="windy">
        <h3>This month so far</h3>
        <p>
          • Groceries: {money(month.total)}<br />
          • Extras and snacks were about {Math.round(month.extrasShare * 100)}% of your itemised shops, so roughly {money(month.extrasEstimate)}<br />
          • Halving extras would free about {money(month.extrasEstimate / 2)} for your goals
        </p>
      </Card>

      <Card>
        <h3>How this was worked out</h3>
        <p>Windy read your receipt and grouped each item. A calculator checked that the groups add up to what you paid.</p>
        <h3>What this is not</h3>
        <p>Groups are about money, not health or diet. Nothing here is shared outside Westpac.</p>
        <div className="small">Receipt linked to your {paid?.merchant} payment on {shortDate(receipt.date)} · You can delete it</div>
      </Card>

      <button className="btn primary block">Save breakdown</button>
      <button className="btn ghost block">Add receipt to tax folder</button>
      <Lock>Alerts are set to big shops only. Change or turn off in Settings.</Lock>
    </>
  )
}
