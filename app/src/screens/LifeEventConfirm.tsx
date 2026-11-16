// LP-02 · Confirm life event (Idea 1). Evidence comes from transactions tagged as life-event signals.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Lock, Seg, TopBar } from '../components/ui'
import { dayDate, lifeEvent, shortDate } from '../data/analysis'
import { money } from '../data/mia'

export default function LifeEventConfirm() {
  const nav = useNavigate()
  const ev = lifeEvent()
  const [freq, setFreq] = useState<'Weekly' | 'Fortnightly' | 'Monthly'>('Weekly')
  const evidence = [ev.mover, ev.bond, ev.newRent].filter(Boolean)

  return (
    <>
      <TopBar title="Moving home?" fallback="/?card=life-event" />
      <p className="intro">Here’s what Windy noticed. Confirm it so your plan uses the right numbers.</p>

      <Card>
        <div className="muted" style={{ marginBottom: 6 }}>From your transactions</div>
        {evidence.map((e) => (
          <div key={e!.id} className="row">
            <div className="hstack" style={{ flexWrap: 'nowrap' }}>
              <div className="avatar">{e!.merchant[0]}</div>
              <div><div>{e!.merchant}</div><div className="muted">{shortDate(e!.date)} · {e!.note ?? e!.category}</div></div>
            </div>
            <b>{money(e!.amount, true)}</b>
          </div>
        ))}
        {ev.fromSavings && (
          <div className="small" style={{ marginTop: 6 }}>Also: {money(ev.fromSavings.amount)} moved from Westpac Life on {shortDate(ev.fromSavings.date)}.</div>
        )}
      </Card>

      <Card variant="windy">
        <span className="pill">Needs your input</span>
        <h3 style={{ marginTop: 8 }}>How often is your new rent?</h3>
        <p>We only see one payment so far. Rather than guess, we’d like to check before planning.</p>
        <Seg options={['Weekly', 'Fortnightly', 'Monthly']} value={freq} onChange={setFreq} />
        <hr className="sep" />
        <div className="row"><span>Amount</span><b>{money(-ev.newRent.amount)} per {freq === 'Weekly' ? 'week' : freq === 'Fortnightly' ? 'fortnight' : 'month'}</b></div>
        <div className="muted">Previous rent: {money(-ev.oldRent.amount)} per week to {ev.oldRent.merchant}, last paid {shortDate(ev.oldRent.date)}</div>
        {ev.mover && <div className="row"><span>Moving date</span><span>{dayDate(ev.mover.date)} <span className="link">Change</span></span></div>}
      </Card>

      <button className="btn primary block" onClick={() => nav('/goals/options')}>Confirm and continue</button>
      <Lock>Windy only reads these transactions with your consent. You can turn life event detection off in Settings.</Lock>
    </>
  )
}
