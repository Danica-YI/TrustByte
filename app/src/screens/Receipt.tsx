// RL-02 · Receipt breakdown
// TODO: groups are hard-coded. With real AI: upload receipt photo → backend multimodal model extracts items → code sums groups and checks the total.
import { Card, Lock, TopBar, useWindy } from '../components/ui'
import { money, receipt } from '../data/mia'

export default function Receipt() {
  const summary = useWindy('receipt-summary')
  const sum = receipt.groups.reduce((s, g) => s + g.amount, 0)
  const matches = Math.abs(sum - receipt.total) < 0.01

  return (
    <>
      <TopBar title="Receipt breakdown" />
      <Card>
        <div className="spread"><h3>{receipt.merchant}</h3><span className="muted">{receipt.date} · {money(receipt.total, true)}</span></div>
        {receipt.groups.map((g) => (
          <div key={g.name} className="row"><span>{g.name}</span><b>{money(g.amount, true)}</b></div>
        ))}
        <hr className="sep" />
        <div className="row">
          <span>{matches ? 'Total matches your payment' : 'Total does not match'}</span>
          <b style={{ color: matches ? 'var(--good)' : 'var(--bad)' }}>{matches ? '✓' : '✗'} {money(sum, true)}</b>
        </div>
      </Card>

      <Card variant="windy">
        <h3>This month so far</h3>
        <p>{summary}</p>
      </Card>

      <Card>
        <h3>How this was worked out</h3>
        <p>Windy read your receipt photo and grouped each item. A calculator checked that the groups add up to what you paid.</p>
        <h3>What this is not</h3>
        <p>Groups are about money, not health or diet. Nothing here is shared outside Westpac.</p>
        <div className="small">Receipt linked to payment · You can delete it</div>
      </Card>

      <button className="btn primary block">Save breakdown</button>
      <button className="btn ghost block">Add receipt to tax folder</button>
      <Lock>Alerts are set to big shops only. Change or turn off in Settings.</Lock>
    </>
  )
}
