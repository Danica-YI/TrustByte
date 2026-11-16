// JP-02 · Review & approve · Japan in 3 months (Idea 2). ?variant=bali | home
import { Fragment, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, Lock, TopBar } from '../components/ui'
import { japanSooner, monthYear, safeToSpend } from '../data/analysis'
import { money } from '../data/mia'

export default function JapanReview() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const variant = params.get('variant') === 'home' ? 'home' : 'bali'
  const p = japanSooner(variant)
  const [approved, setApproved] = useState(false)

  const changes = [
    { label: 'Japan trip date', from: p.japanBefore ? monthYear(p.japanBefore) : '—', to: monthYear(p.tripBy) },
    ...(p.fromBali > 0 ? [{ label: 'Bali 2027 fund', from: money(p.baliBefore), to: money(p.baliAfter) }] : []),
    { label: 'Home deposit each payday', from: money(p.homePerNormal), to: money(p.homePerNormal - p.fromHomePer) },
    ...(p.homeBefore && p.homeAfter ? [{ label: 'Home deposit date', from: monthYear(p.homeBefore), to: monthYear(p.homeAfter) }] : []),
    ...(p.fromEverydayPer > 0 ? [{ label: 'From Everyday each payday', from: money(0), to: money(p.fromEverydayPer) }] : []),
  ]

  if (approved) {
    return (
      <>
        <TopBar title="Plan updated" />
        <Card>
          <h2>✓ Japan by {monthYear(p.tripBy)} is now your plan</h2>
          <p>No money has moved yet. Each change happens on payday, and you can undo it before then.</p>
          <button className="btn primary block" onClick={() => nav('/')}>Back to home</button>
        </Card>
      </>
    )
  }

  return (
    <>
      <TopBar title="Review Japan plan" />
      <span className="chip windy">{p.paydays} paydays · {variant === 'bali' ? 'uses Bali fund' : 'Bali fund untouched'}</span>

      <Card>
        <h3>What changes</h3>
        <div className="compare">
          {changes.map((c) => (
            <Fragment key={c.label}>
              <span>{c.label}</span><span className="old">{c.from}</span><span>→</span><span className="new">{c.to}</span>
            </Fragment>
          ))}
        </div>
      </Card>

      <Card>
        <h3>Stays the same</h3>
        <p>
          ✓ Emergency fund keeps its 3-month minimum ({money(p.emergency)} now)<br />
          ✓ Rent and bills are covered first
          {p.fromEverydayPer === 0 && <><br />✓ Safe to spend stays at {money(safeToSpend().safe)}</>}
        </p>
      </Card>

      <Card variant="windy">
        <h3>Why Windy suggests this</h3>
        <p>You asked to go to Japan within 3 months. You need {money(p.needed)} more, so Windy used money set aside for plans that aren’t due soon before touching your everyday money.</p>
        <h3>What’s estimated</h3>
        <p>The trip cost is your own goal amount and flight prices can change. After the trip, Home deposit goes back to {money(p.homePerNormal)} a payday.</p>
        <div className="small">Calculated from your goal balances and auto-saves · {p.paydays} paydays</div>
      </Card>

      <button className="btn primary block" onClick={() => setApproved(true)}>Approve plan</button>
      <button className="btn ghost block" onClick={() => nav('/goals/japan-sooner')}>Change something</button>
      <Lock>Approving updates your plan only. No money moves unless you do it.</Lock>
    </>
  )
}
