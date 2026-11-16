// PA-01 · Home loan · Pre-filled application
import { useState } from 'react'
import { Card, Chip, Lock, Seg, TopBar } from '../components/ui'

// Standard amortised repayment, 30 years at 6.2% p.a. (matches the wireframe: $160k ≈ $980/month)
const monthly = (p: number, rate = 0.062, years = 30) => {
  const r = rate / 12, n = years * 12
  return Math.round((p * r) / (1 - Math.pow(1 + r, -n)))
}

export default function HomeLoanApply() {
  const [amt, setAmt] = useState<'$160k' | '$200k' | '$240k'>('$160k')
  const principal = Number(amt.replace(/\D/g, '')) * 1000

  return (
    <>
      <TopBar title="Home loan application" />
      <p className="intro">We’ve filled in what Westpac already knows. Check it, then add the one thing we can’t see.</p>

      <Card>
        <h3>Already filled in for you</h3>
        <div className="row"><div><div>✓ Income and regular bills</div><div className="muted">From 3 months of transactions</div></div><Chip tone="good">Filled</Chip></div>
        <div className="row"><div><div>✓ Identity and address</div><div className="muted">Verified when you joined</div></div><Chip tone="good">Filled</Chip></div>
      </Card>

      <Card variant="windy">
        <span className="pill">Needs your input</span>
        <h3 style={{ marginTop: 8 }}>How much do you want to borrow?</h3>
        <p>This is the only part we can’t fill in. Pick an amount to see your repayments.</p>
        <Seg options={['$160k', '$200k', '$240k']} value={amt} onChange={setAmt} />
        <div className="row" style={{ marginTop: 10 }}><span>Repayment</span><b>${monthly(principal).toLocaleString()} a month</b></div>
        <div className="small">Example at 6.2% p.a. over 30 years. Not an offer.</div>
      </Card>

      <Card><div className="row"><span>Documents to upload</span><span><b>None</b> <span className="link">Why?</span></span></div></Card>

      <button className="btn primary block">Review and submit</button>
      <Lock>Nothing is sent until you submit. A Westpac lender makes the decision, not Windy.</Lock>
    </>
  )
}
