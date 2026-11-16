// DC-01 · Your data and consent (the trust layer)
import { useState } from 'react'
import { Card, Lock, Toggle, TopBar } from '../components/ui'
import { consentDefaults } from '../data/mia'

export default function Consent() {
  const [items, setItems] = useState(consentDefaults)
  const set = (id: string, on: boolean) => setItems(items.map((i) => (i.id === id ? { ...i, on } : i)))

  return (
    <>
      <TopBar title="Your data and consent" />
      <p className="intro">You choose what Windy may use.</p>

      <Card>
        <h3>What Windy may use</h3>
        {items.map((i) => (
          <div key={i.id} className="row"><span>{i.label}</span><Toggle on={i.on} onChange={(v) => set(i.id, v)} /></div>
        ))}
      </Card>

      <Card>
        <h3>Where your data goes</h3>
        <p>✓ Processed inside Westpac<br />✓ Never shared with insurers, advertisers or any third party<br />✓ Never used for credit or lending decisions</p>
        <h3>What the AI model sees</h3>
        <p>Only summaries, such as totals by category. It does not see account numbers or your raw transaction list.</p>
      </Card>

      <Card>
        <h3>Your record</h3>
        <p>Every time Windy uses your data, it is logged here for you to check.</p>
        <div className="spread"><span className="muted">Used 6 times this month</span><span className="link">See what was used ›</span></div>
      </Card>

      <button className="btn outline block" onClick={() => setItems(items.map((i) => ({ ...i, on: false })))}>Turn everything off</button>
      <Lock>Off means off. Turning a feature off stops its analysis straight away.</Lock>
    </>
  )
}
