// LP-02 · Confirm life event
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Lock, Seg, TopBar } from '../components/ui'
import { lifeEvent, money } from '../data/mia'

export default function LifeEventConfirm() {
  const nav = useNavigate()
  const [freq, setFreq] = useState<'Weekly' | 'Fortnightly' | 'Monthly'>('Weekly')

  return (
    <>
      <TopBar title="Moving home?" />
      <p className="intro">Here’s what Windy noticed. Confirm it so your plan uses the right numbers.</p>

      <Card>
        <div className="muted" style={{ marginBottom: 6 }}>From your transactions</div>
        {lifeEvent.evidence.map((e) => (
          <div key={e.label} className="row">
            <div className="hstack" style={{ flexWrap: 'nowrap' }}>
              <div className="avatar">{e.icon}</div>
              <div><div>{e.label}</div><div className="muted">{e.meta}</div></div>
            </div>
            <b>{money(e.amount, true)}</b>
          </div>
        ))}
      </Card>

      <Card variant="windy">
        <span className="pill">Needs your input</span>
        <h3 style={{ marginTop: 8 }}>How often is your new rent?</h3>
        <p>We only see one payment so far. Rather than guess, we’d like to check before planning.</p>
        <Seg options={['Weekly', 'Fortnightly', 'Monthly']} value={freq} onChange={setFreq} />
        <hr className="sep" />
        <div className="row"><span>Amount</span><b>{money(lifeEvent.newRentPerWeek)} per {freq === 'Weekly' ? 'week' : freq === 'Fortnightly' ? 'fortnight' : 'month'}</b></div>
        <div className="muted">Previous rent: {money(lifeEvent.previousRentPerWeek)} per week</div>
        <div className="row"><span>Moving date</span><span>{lifeEvent.movingDate} <span className="link">Change</span></span></div>
      </Card>

      <button className="btn primary block" onClick={() => nav('/goals/options')}>Confirm and continue</button>
      <Lock>Windy only reads these transactions with your consent. You can turn life event detection off in Settings.</Lock>
    </>
  )
}
