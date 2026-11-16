// One savings goal on its own page: see the plan and change the amount yourself.
// The change goes through the same path as Windy's suggestions: guardrails -> engine -> review -> approve.
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Card, Lock, Progress, TopBar } from '../components/ui'
import { money, monthYear } from '../format'
import { useApp, useSnap } from '../store'

export default function GoalDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const s = useSnap()
  const { propose, busy } = useApp()
  const g = s.goals.find((x) => x.id === id)
  // The trade-off screen only matters while a confirmed rent rise still has to be covered
  const needsChoice = s.life_event.status === 'confirmed' && !s.tradeoff.no_conflict && s.plan_choice?.kind !== 'goal_plan'
  const [amount, setAmount] = useState(g ? String(g.per_payday) : '0')

  if (!g) {
    return (
      <>
        <TopBar title="Goal" fallback="/" />
        <Card><p>This goal doesn’t exist.</p><button className="btn primary" onClick={() => nav('/')}>Back to home</button></Card>
      </>
    )
  }

  const n = Number(amount)
  const valid = amount !== '' && Number.isFinite(n) && n >= 0 && n <= 2000
  const changed = valid && n !== g.per_payday
  const left = Math.max(0, g.target - g.saved)
  const step = (d: number) => setAmount(String(Math.min(2000, Math.max(0, (valid ? n : g.per_payday) + d))))

  const review = async () => {
    const p = await propose('goal_edit', { goal: g.id, per_payday: n })
    if (p) nav(`/review/${p.id}`)
  }

  return (
    <>
      <TopBar title={g.name} fallback="/" />

      <Card>
        <div className="spread"><h3>{money(g.saved)}</h3><span className="muted">of {money(g.target)}</span></div>
        <Progress value={g.saved} max={g.target} color={g.color} />
        <div className="row"><span>Still to save</span><b>{money(left)}</b></div>
        <div className="row"><span>You add</span><b>{g.per_payday > 0 ? `${money(g.per_payday)} a payday` : 'No auto-save'}</b></div>
        {g.partner_per_payday > 0 && <div className="row"><span>Others add</span><b>{money(g.partner_per_payday)} a payday</b></div>}
        <div className="row"><span>On this plan</span><b>{g.reached ? `Reached ${monthYear(g.reached)}` : g.reached_label}</b></div>
      </Card>

      <Card>
        <h3>Change your amount</h3>
        <p style={{ marginTop: 4 }}>Set what goes into this goal each payday. You’ll see what it does to the date and to Everyday before anything changes.</p>
        <div className="hstack" style={{ flexWrap: 'nowrap', marginTop: 8 }}>
          <button className="btn outline" onClick={() => step(-10)} aria-label="Less">−</button>
          <input className="field" style={{ textAlign: 'center', fontWeight: 700 }} type="number" min={0} max={2000} value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount each payday" />
          <button className="btn outline" onClick={() => step(10)} aria-label="More">+</button>
        </div>
        {!valid && <div className="small" style={{ color: 'var(--bad)', marginTop: 6 }}>Enter an amount from $0 to $2,000.</div>}
        <button className="btn primary block" style={{ marginTop: 10 }} disabled={!changed || busy} onClick={review}>Review change</button>
      </Card>

      <Card>
        <Link to={`/goals/share/${g.id}`} className="row"><span>{g.members.length ? `Saving with ${g.members.map((m) => m.name).join(', ')}` : 'Save together with someone'}</span><span>›</span></Link>
        {needsChoice && <Link to="/goals/options" className="row"><span>Your rent went up: compare options</span><span>›</span></Link>}
        <Link to="/plan" className="row"><span>Plan history and undo</span><span>›</span></Link>
      </Card>

      <Lock>Only your plan changes. No money moves until the payday it is due, and you can undo it.</Lock>
    </>
  )
}
