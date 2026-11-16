// LP-02 · Confirm life event (Idea 1). The rent frequency Mia picks is saved to her plan and changes
// the rent schedule the engine uses everywhere (forecast, regular payments, goal options).
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Lock, Seg, TopBar } from '../components/ui'
import { dayDate, money, shortDate } from '../format'
import { useApp, useSnap } from '../store'

const FREQS = ['Weekly', 'Fortnightly', 'Monthly'] as const

export default function LifeEventConfirm() {
  const nav = useNavigate()
  const s = useSnap()
  const { act, busy } = useApp()
  const ev = s.life_event
  const saved = ev.rent_frequency ? (ev.rent_frequency[0].toUpperCase() + ev.rent_frequency.slice(1)) as typeof FREQS[number] : 'Weekly'
  const [freq, setFreq] = useState<typeof FREQS[number]>(saved)

  if (!s.consent.life_events) {
    return (
      <>
        <TopBar title="Moving home?" fallback="/" />
        <Card><p>Life event detection is off. Turn it on in Your data and consent to use this.</p>
          <button className="btn outline" onClick={() => nav('/consent')}>Open consent settings</button></Card>
      </>
    )
  }

  const confirm = async () => {
    if (await act('life_event_confirm', { rent_frequency: freq.toLowerCase() }, 'Saved. Windy will plan with your new rent.')) nav('/goals/options')
  }

  return (
    <>
      <TopBar title="Moving home?" fallback="/" />
      <p className="intro">Here’s what Windy noticed. Confirm it so your plan uses the right numbers.</p>
      {ev.status === 'confirmed' && <div className="plan-strip">✓ You confirmed this ({ev.rent_frequency} rent). You can change it below.</div>}

      <Card>
        <div className="muted" style={{ marginBottom: 6 }}>From your transactions</div>
        {ev.evidence.map((e) => (
          <div key={e.id} className="row">
            <div className="hstack" style={{ flexWrap: 'nowrap' }}>
              <div className="avatar">{e.merchant[0]}</div>
              <div><div>{e.merchant}</div><div className="muted">{shortDate(e.date)} · {e.note ?? e.category}</div></div>
            </div>
            <b>{money(e.amount, true)}</b>
          </div>
        ))}
        {ev.from_savings && <div className="small" style={{ marginTop: 6 }}>Also: {money(ev.from_savings.amount)} moved from Westpac Life on {shortDate(ev.from_savings.date)}.</div>}
      </Card>

      <Card variant="windy">
        <span className="pill">Needs your input</span>
        <h3 style={{ marginTop: 8 }}>How often is your new rent?</h3>
        <p>We only see one payment so far. Rather than guess, we’d like to check before planning.</p>
        <Seg options={[...FREQS]} value={freq} onChange={setFreq} />
        <hr className="sep" />
        <div className="row"><span>Amount</span><b>{money(-ev.new_rent.amount)} per {freq === 'Weekly' ? 'week' : freq === 'Fortnightly' ? 'fortnight' : 'month'}</b></div>
        <div className="muted">Previous rent: {money(-ev.old_rent.amount)} per week to {ev.old_rent.merchant}, last paid {shortDate(ev.old_rent.date)}</div>
        {ev.moving_date && <div className="row"><span>Moving date</span><span>{dayDate(ev.moving_date)}</span></div>}
      </Card>

      <button className="btn primary block" disabled={busy} onClick={confirm}>Confirm and see my options</button>
      {ev.status === 'detected' && (
        <button className="btn ghost block" onClick={async () => { if (await act('life_event_dismiss', {}, 'Got it. Windy won’t plan around a move.')) nav('/') }}>I’m not moving</button>
      )}
      <Lock>Windy only reads these transactions with your consent. You can turn life event detection off any time.</Lock>
    </>
  )
}
