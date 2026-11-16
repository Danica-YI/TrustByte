// LP-09 · Loan readiness
// Note: this wireframe reused the LP-05 template and some numbers don't line up (e.g. "$3,500 → $8,000 of $40,000"). Only the right-hand values are kept here.
import { useNavigate } from 'react-router-dom'
import { Card, Chip, Lock, TopBar } from '../components/ui'

const rows = [
  { label: 'Deposit saved', value: '$8,000 of $40,000' },
  { label: 'Deposit date at $165 a payday', value: 'May 2034' },
  { label: 'Repayment share of income', value: '31%' },
  { label: 'If rates rise 1%', value: '35%' },
]

export default function LoanReadiness() {
  const nav = useNavigate()
  return (
    <>
      <TopBar title="Loan readiness" />
      <Chip tone="warn">Estimate</Chip>

      <Card>
        <h3 style={{ marginTop: 4 }}>Where you stand</h3>
        {rows.map((r) => <div key={r.label} className="row"><span>{r.label}</span><b>{r.value}</b></div>)}
      </Card>

      <Card>
        <h3>From your transactions, not typed in</h3>
        <p>✓ Income: $1,450 a fortnight, averaged over 6 pays<br />✓ Rent and regular bills are already counted<br />✓ Japan trip and emergency fund stay funded</p>
      </Card>

      <Card variant="windy">
        <h3>How this was worked out</h3>
        <p>Westpac’s home loan calculators, filled in with 3 months of your own transactions. A calculator does the maths. Windy only explains it.</p>
        <h3>What’s estimated</h3>
        <p>Example loan of $160,000 over 30 years at 6.2% p.a. This is not an offer.</p>
        <div className="small">Data updated today 11:45 · 3 months of history</div>
      </Card>

      <button className="btn primary block">See what improves it</button>
      <button className="btn ghost block" onClick={() => nav('/home-loan/apply')}>Talk to a home loan specialist</button>
      <Lock>An estimate only. Windy does not approve loans or recommend a product.</Lock>
    </>
  )
}
