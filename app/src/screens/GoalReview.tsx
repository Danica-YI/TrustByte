// LP-05 · Review & approve
import { Fragment, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, Lock, TopBar, useWindy } from '../components/ui'
import { planChanges, planOptions } from '../data/mia'

export default function GoalReview() {
  const { option = 'B' } = useParams()
  const nav = useNavigate()
  const [approved, setApproved] = useState(false)
  const plan = planOptions.find((p) => p.id === option) ?? planOptions[1]
  const changes = planChanges[plan.id] ?? planChanges.B // TODO: wireframes only detail option B; A / C not drawn yet
  const reason = useWindy('plan-reason', { option: plan.id })

  if (approved) {
    return (
      <>
        <TopBar title="Plan updated" />
        <Card>
          <h2>✓ Plan {plan.id} · {plan.name} is now your plan</h2>
          <p>No money has moved. Windy will check in on payday.</p>
          <button className="btn primary block" onClick={() => nav('/')}>Back to home</button>
        </Card>
      </>
    )
  }

  return (
    <>
      <TopBar title={`Review plan ${plan.id}`} />
      <span className="chip windy">{plan.name}</span>

      <Card>
        <h3>What changes</h3>
        <div className="compare">
          {changes.map((c) => (
            <Fragment key={c.label}>
              <span>{c.label}</span>
              <span className="old">{c.from}</span>
              <span>→</span>
              <span className="new">{c.to}</span>
            </Fragment>
          ))}
        </div>
      </Card>

      <Card>
        <h3>Stays the same</h3>
        <p>✓ Emergency fund keeps its 3-month minimum ($2,600 now)<br />✓ Rent and bills are covered first</p>
      </Card>

      <Card variant="windy">
        <h3>Why Windy suggests this</h3>
        <p>{reason}</p>
        <h3>What’s estimated</h3>
        <p>Car insurance renewal in Dec ($720, based on last year). We’ll update the plan when the bill arrives.</p>
        <div className="small">Data updated today 11:45 · 3 months of history</div>
      </Card>

      <button className="btn primary block" onClick={() => setApproved(true)}>Approve plan</button>
      <button className="btn ghost block" onClick={() => nav('/goals/options')}>Back to options</button>
      <Lock>Approving updates your plan only. No money moves unless you do it.</Lock>
    </>
  )
}
