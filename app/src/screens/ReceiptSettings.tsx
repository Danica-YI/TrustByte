// Receipt Lens settings: the "Connected merchant receipts" switch (Idea 10).
// Pitch (docs/share/LifePilot-Connected-Receipts): we don't build a connector. Receipts come through
// receipt networks that already exist (e.g. Slyp, card-network digital receipts); in this demo they are
// synthetic receipts linked to Mia's card payments by transaction.
// The switch is a consent setting (off by default) saved on the backend and checked by the input guardrails.
import { useNavigate } from 'react-router-dom'
import { Card, Lock, Toggle, TopBar } from '../components/ui'
import { receipts, transactions } from '../data/bank'
import { useConnectedReceipts, useSetConnectedReceipts } from '../data/settings'
import { useApp } from '../store'

const STEPS = [
  { title: 'Store checkout', note: 'You pay with your Westpac card' },
  { title: 'Receipt network', note: 'Matches the itemised receipt to the card payment' },
  { title: 'Westpac', note: 'Only with your consent' },
  { title: 'Windy', note: 'Groups items by money and checks the total' },
]

export default function ReceiptSettings() {
  const nav = useNavigate()
  const on = useConnectedReceipts()
  const setConnectedReceipts = useSetConnectedReceipts()
  const { busy } = useApp()
  const merchants = [...new Set(receipts.map((r) => r.merchant))]
  const linked = transactions.filter((t) => t.receipt_id).length

  return (
    <>
      <TopBar title="Receipt Lens" fallback="/" />

      <Card variant={on ? 'windy' : undefined}>
        <div className="spread" style={{ alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h3>Connected merchant receipts</h3>
            <p style={{ margin: 0 }}>
              When you pay with your Westpac card at a connected store, the itemised receipt comes to the app on its own.
              No photo needed.
            </p>
          </div>
          <Toggle on={on} onChange={(v) => !busy && setConnectedReceipts(v)} />
        </div>
        <div className="small" style={{ marginTop: 10 }}>
          {on ? `On · ${linked} receipts linked to your card payments` : 'Off · you can still scan a receipt or tick what you bought'}
        </div>
      </Card>

      <Card>
        <h3>Connected stores</h3>
        {merchants.map((m) => (
          <div key={m} className="row">
            <span>{m}</span>
            <span className={on ? '' : 'muted'} style={on ? { color: 'var(--good)', fontWeight: 600 } : undefined}>{on ? '✓ Connected' : 'Available'}</span>
          </div>
        ))}
        <p className="small" style={{ marginTop: 6 }}>Other stores: scan the paper receipt, or tick what you bought.</p>
      </Card>

      <Card>
        <h3>How it works</h3>
        <div className="stack" style={{ gap: 4, marginTop: 6 }}>
          {STEPS.map((s, i) => (
            <div key={s.title}>
              <div className="hstack" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                <span className="chip windy" style={{ minWidth: 24, textAlign: 'center' }}>{i + 1}</span>
                <div><b style={{ fontSize: 14 }}>{s.title}</b><div className="muted">{s.note}</div></div>
              </div>
              {i < STEPS.length - 1 && <div style={{ marginLeft: 11, color: 'var(--ink-3)' }}>↓</div>}
            </div>
          ))}
        </div>
        <p className="small" style={{ marginTop: 8 }}>
          Westpac doesn’t connect to each store one by one. Receipts come through receipt networks that banks already use.
        </p>
      </Card>

      <Card>
        <h3>What Windy will and won’t do</h3>
        <p style={{ margin: 0 }}>
          ✓ Group items by money: essentials, extras, household<br />
          ✓ Check the groups add up to what you paid<br />
          ✗ Comment on health, diet or what you choose to buy<br />
          ✗ Share receipts outside Westpac
        </p>
      </Card>

      {on
        ? <button className="btn primary block" onClick={() => nav('/receipt')}>See my latest receipt</button>
        : <button className="btn primary block" disabled={busy} onClick={() => setConnectedReceipts(true)}>Turn on connected receipts</button>}
      <Lock>Off by default. Off means off: receipts stop arriving and Windy stops reading them. You can delete any receipt.</Lock>
    </>
  )
}
