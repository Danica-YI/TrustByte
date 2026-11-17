// One savings goal on its own page: see the plan, then tap Edit goal to change the target, the date
// or the amount yourself. The change goes through the same path as Windy's suggestions:
// guardrails -> engine -> review -> approve.
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Card, Chip, Lock, Progress, StepIcon, TopBar } from '../components/ui'
import { money, monthYear, shortDate } from '../format'
import { useApp, useSnap } from '../store'

const DAY = 864e5

export default function GoalDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const s = useSnap()
  const { propose, busy } = useApp()
  const g = s.goals.find((x) => x.id === id)
  const [editing, setEditing] = useState(false)
  const [amount, setAmount] = useState(g ? String(g.per_payday) : '0')
  const [target, setTarget] = useState(g ? String(g.target) : '0')
  const [when, setWhen] = useState(g?.goal_date ?? '')
  // The trade-off screen only matters while a confirmed rent rise still has to be covered
  const needsChoice = s.life_event.status === 'confirmed' && !s.tradeoff.no_conflict && s.plan_choice?.kind !== 'goal_plan'

  if (!g) {
    return (
      <>
        <TopBar title="Goal" fallback="/" />
        <Card><p>This goal doesn’t exist.</p><button className="btn primary" onClick={() => nav('/')}>Back to home</button></Card>
      </>
    )
  }

  const n = Number(amount)
  const t = Number(target)
  const okAmount = amount !== '' && Number.isFinite(n) && n >= 0 && n <= 2000
  const okTarget = target !== '' && Number.isFinite(t) && t >= 50 && t <= 1000000
  const okWhen = when === '' || when > s.today
  const valid = okAmount && okTarget && okWhen
  const changed = n !== g.per_payday || t !== g.target || when !== (g.goal_date ?? '')
  const step = (d: number) => setAmount(String(Math.min(2000, Math.max(0, (okAmount ? n : g.per_payday) + d))))

  // Rough guide only: paydays are fortnightly, counted from the next payday up to the chosen date.
  // The engine works out the real date on the review screen.
  const paydays = when && okWhen ? Math.floor((Date.parse(when) - Date.parse(s.everyday.next_payday)) / (14 * DAY)) + 1 : 0
  const needed = paydays > 0 && okTarget ? Math.max(0, Math.ceil(Math.max(0, t - g.saved) / paydays - g.partner_per_payday)) : null

  const start = () => { setAmount(String(g.per_payday)); setTarget(String(g.target)); setWhen(g.goal_date ?? ''); setEditing(true) }
  const review = async () => {
    const params: Record<string, unknown> = { goal: g.id, per_payday: n }
    if (t !== g.target) params.target = t
    if (when && when !== (g.goal_date ?? '')) params.goal_date = when
    const p = await propose('goal_edit', params)
    if (p) nav(`/review/${p.id}`)
  }

  return (
    <>
      <TopBar title={g.name} fallback="/goals" />

      <Card>
        <div className="spread"><h3>{money(g.saved)}</h3><span className="muted">of {money(g.target)}</span></div>
        <Progress value={g.saved} max={g.target} color={g.color} />
        <div className="row"><span>Target</span><b>{money(g.target)}</b></div>
        <div className="row"><span>Target date</span><b>{g.goal_date ? shortDate(g.goal_date) + ' ' + g.goal_date.slice(0, 4) : 'No date set'}</b></div>
        <div className="row"><span>You add</span><b>{g.per_payday > 0 ? `${money(g.per_payday)} a payday` : 'No auto-save'}</b></div>
        {g.partner_per_payday > 0 && <div className="row"><span>Others add</span><b>{money(g.partner_per_payday)} a payday</b></div>}
        <div className="row">
          <span>On this plan</span>
          <b>{g.reached ? `Reached ${monthYear(g.reached)}` : g.reached_label} {g.on_track !== null && <Chip tone={g.on_track ? 'good' : 'warn'}>{g.on_track ? 'In time' : 'After your date'}</Chip>}</b>
        </div>
        {!editing && <button className="btn outline block" style={{ marginTop: 10 }} onClick={start}>Edit goal</button>}
      </Card>

      {editing && (
        <Card variant="selected">
          <h3>Edit goal</h3>
          <div className="stack" style={{ gap: 10, marginTop: 8 }}>
            <label className="spread" style={{ gap: 8 }}>
              <span>Target amount ($)</span>
              <input className="field" style={{ width: 130, textAlign: 'right' }} type="number" min={50} max={1000000} value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Target amount" />
            </label>
            {!okTarget && <div className="small" style={{ color: 'var(--bad)' }}>Enter a target from $50 to $1,000,000.</div>}
            <label className="spread" style={{ gap: 8 }}>
              <span>Target date</span>
              <input className="field" style={{ width: 160 }} type="date" min={s.today} value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Target date" />
            </label>
            {!okWhen && <div className="small" style={{ color: 'var(--bad)' }}>Pick a date in the future.</div>}
            <div>
              <div style={{ marginBottom: 6 }}>You add each payday ($)</div>
              <div className="hstack" style={{ flexWrap: 'nowrap' }}>
                <button className="btn outline step" onClick={() => step(-10)} aria-label="Less"><StepIcon /></button>
                <input className="field" style={{ textAlign: 'center', fontWeight: 700 }} type="number" min={0} max={2000} value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount each payday" />
                <button className="btn outline step" onClick={() => step(10)} aria-label="More"><StepIcon plus /></button>
              </div>
              {!okAmount && <div className="small" style={{ color: 'var(--bad)', marginTop: 6 }}>Enter an amount from $0 to $2,000.</div>}
            </div>
            {needed !== null && (
              <div className="small">
                To reach {money(t)} by your date you need about <b>{money(needed)}</b> a payday ({paydays} paydays left).{' '}
                {needed !== n && needed <= 2000 && <button className="link" onClick={() => setAmount(String(needed))}>Use {money(needed)}</button>}
              </div>
            )}
          </div>
          <button className="btn primary block" style={{ marginTop: 12 }} disabled={!valid || !changed || busy} onClick={review}>Review change</button>
          <button className="btn ghost block" onClick={() => setEditing(false)}>Cancel</button>
        </Card>
      )}

      <Card>
        <Link to={`/goals/share/${g.id}`} className="row"><span>{g.members.length ? `Saving with ${g.members.map((m) => m.name).join(', ')}` : 'Save together with someone'}</span><span>›</span></Link>
        {needsChoice && <Link to="/goals/options" className="row"><span>Your rent went up: compare options</span><span>›</span></Link>}
        <Link to="/plan" className="row"><span>Plan history and undo</span><span>›</span></Link>
      </Card>

      <Lock>Only your plan changes. No money moves until the payday it is due, and you can undo it.</Lock>
    </>
  )
}
