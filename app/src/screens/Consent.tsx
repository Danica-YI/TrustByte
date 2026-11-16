// DC-01 · Your data and consent (the trust layer). Each switch is saved and checked by the input guardrails:
// turn one off and that feature stops straight away (its home card goes, and the backend refuses to run it).
import { Card, Lock, Toggle, TopBar } from '../components/ui'
import { useApp, useSnap } from '../store'

const LABELS: Record<string, string> = {
  life_events: 'Spot life changes (moving, new job)',
  goals: 'Plan my savings goals',
  cash_flow: 'Warn me before I run short',
  regular_payments: 'Track bills, subscriptions and pay-later',
  receipts: 'Read receipts I add',
  spending_insights: 'Coach me on my spending',
  chat: 'Answer my questions in chat',
  connected_receipts: 'Get itemised receipts from connected stores',
}

export default function Consent() {
  const s = useSnap()
  const { act, busy } = useApp()
  const allOff = Object.values(s.consent).every((v) => !v)

  return (
    <>
      <TopBar title="Your data and consent" fallback="/more" />
      <p className="intro">You choose what Windy may use.</p>

      <Card>
        <h3>What Windy may use</h3>
        {Object.entries(LABELS).map(([k, label]) => (
          <div key={k} className="row"><span>{label}</span><Toggle on={s.consent[k]} onChange={(v) => !busy && act('consent', { key: k, on: v }, `${label}: ${v ? 'on' : 'off'}`)} /></div>
        ))}
      </Card>

      <Card>
        <h3>Where your data goes</h3>
        <p>✓ Processed inside Westpac<br />✓ Never shared with insurers, advertisers or any third party<br />✓ Never used for credit or lending decisions</p>
        <h3>What the AI model sees</h3>
        <p>Only summaries, such as totals by category. It does not see account numbers or your raw transaction list. A calculator does every sum; the AI only explains.</p>
      </Card>

      <Card>
        <h3>Your record</h3>
        <p>Every time Windy uses your data, it is logged here.</p>
        <div className="muted" style={{ marginBottom: 6 }}>Used {s.usage_count} time{s.usage_count === 1 ? '' : 's'} so far</div>
        {s.usage.slice(0, 8).map((u, i) => (
          <div key={i} className="row small"><span>{u.what}</span><span>{new Date(u.time).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}</span></div>
        ))}
      </Card>

      <button className="btn outline block" disabled={busy || allOff} onClick={async () => {
        for (const k of Object.keys(LABELS)) if (s.consent[k]) await act('consent', { key: k, on: false })
      }}>Turn everything off</button>
      <Lock>Off means off. Turning a feature off stops its analysis straight away.</Lock>
    </>
  )
}
