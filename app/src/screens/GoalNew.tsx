// Add a savings goal yourself: name, target, an optional date and how much goes in each payday.
// Same path as every other change: guardrails -> engine -> review (shows what it does to Everyday) -> approve.
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Card, Lock, TopBar } from '../components/ui'
import { money } from '../format'
import { useApp, useSnap } from '../store'

const DAY = 864e5
const NAME_OK = /^[A-Za-z0-9][A-Za-z0-9 &'.-]*$/

export default function GoalNew() {
  const nav = useNavigate()
  const s = useSnap()
  const { propose, busy } = useApp()
  // Dream Nudge can open this form with a name, target and amount already filled in
  const start = (useLocation().state ?? {}) as { name?: string; target?: number; amount?: number }
  const [name, setName] = useState(start.name ?? '')
  const [target, setTarget] = useState(start.target ? String(start.target) : '')
  const [when, setWhen] = useState('')
  const [amount, setAmount] = useState(String(start.amount ?? 50))

  const n = Number(amount)
  const t = Number(target)
  const cleanName = name.trim()
  const okName = cleanName.length >= 1 && cleanName.length <= 30 && NAME_OK.test(cleanName)
  const okTarget = target !== '' && Number.isFinite(t) && t >= 50 && t <= 1000000
  const okAmount = amount !== '' && Number.isFinite(n) && n >= 0 && n <= 2000
  const okWhen = when === '' || when > s.today
  const valid = okName && okTarget && okAmount && okWhen
  const step = (d: number) => setAmount(String(Math.min(2000, Math.max(0, (okAmount ? n : 0) + d))))

  // Rough guide only: paydays are fortnightly from the next payday. The engine works out the real date.
  const paydays = when && okWhen ? Math.floor((Date.parse(when) - Date.parse(s.everyday.next_payday)) / (14 * DAY)) + 1 : 0
  const needed = paydays > 0 && okTarget ? Math.ceil(t / paydays) : null

  const review = async () => {
    const params: Record<string, unknown> = { name: cleanName, target: t, per_payday: n }
    if (when) params.goal_date = when
    const p = await propose('goal_create', params)
    if (p) nav(`/review/${p.id}`)
  }

  return (
    <>
      <TopBar title="New goal" fallback="/goals" />
      <Card variant="selected">
        <div className="stack" style={{ gap: 10 }}>
          <label className="spread" style={{ gap: 8 }}>
            <span>What are you saving for?</span>
            <input className="field" style={{ width: 170 }} maxLength={30} placeholder="e.g. New laptop" value={name} onChange={(e) => setName(e.target.value)} aria-label="Goal name" />
          </label>
          {name !== '' && !okName && <div className="small" style={{ color: 'var(--bad)' }}>Use letters, numbers and spaces (up to 30).</div>}
          <label className="spread" style={{ gap: 8 }}>
            <span>Target amount ($)</span>
            <input className="field" style={{ width: 130, textAlign: 'right' }} type="number" min={50} max={1000000} placeholder="2000" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Target amount" />
          </label>
          {target !== '' && !okTarget && <div className="small" style={{ color: 'var(--bad)' }}>Enter a target from $50 to $1,000,000.</div>}
          <label className="spread" style={{ gap: 8 }}>
            <span>Target date <span className="muted">(optional)</span></span>
            <input className="field" style={{ width: 160 }} type="date" min={s.today} value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Target date" />
          </label>
          {!okWhen && <div className="small" style={{ color: 'var(--bad)' }}>Pick a date in the future.</div>}
          <div>
            <div style={{ marginBottom: 6 }}>You add each payday ($)</div>
            <div className="hstack" style={{ flexWrap: 'nowrap' }}>
              <button className="btn outline step" onClick={() => step(-10)} aria-label="Less">−</button>
              <input className="field" style={{ textAlign: 'center', fontWeight: 700 }} type="number" min={0} max={2000} value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount each payday" />
              <button className="btn outline step" onClick={() => step(10)} aria-label="More">+</button>
            </div>
            {!okAmount && <div className="small" style={{ color: 'var(--bad)', marginTop: 6 }}>Enter an amount from $0 to $2,000.</div>}
          </div>
          {needed !== null && (
            <div className="small">
              To reach {money(t)} by your date you need about <b>{money(needed)}</b> a payday ({paydays} paydays).{' '}
              {needed !== n && needed <= 2000 && <button className="link" onClick={() => setAmount(String(needed))}>Use {money(needed)}</button>}
            </div>
          )}
        </div>
        <button className="btn primary block" style={{ marginTop: 12 }} disabled={!valid || busy} onClick={review}>Review new goal</button>
        <button className="btn ghost block" onClick={() => nav('/goals')}>Cancel</button>
      </Card>
      <Lock>The review shows what this does to your Everyday money before anything changes. You can undo it later.</Lock>
    </>
  )
}
