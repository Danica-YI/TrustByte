// B-05 · Budget created
import { Card, Progress, TopBar, WindyPill } from '../components/ui'

const limits = [
  { name: 'Groceries', spent: 0, limit: 300 },
  { name: 'Eating out', note: 'Set from your average', spent: 0, limit: 180 },
  { name: 'Transport', spent: 0, limit: 120 },
  { name: 'Shopping', spent: 0, limit: 150 },
]

export default function BudgetCreated() {
  return (
    <>
      <TopBar title="Insights & tools" fallback="/budget/income" />
      <div className="hstack" style={{ marginBottom: 12 }}>
        {['Overview', 'Budget', 'Bills', 'Transactions'].map((t) => (
          <span key={t} className={`chip ${t === 'Budget' ? 'windy' : 'plain'}`}>{t}</span>
        ))}
      </div>

      <Card><b style={{ color: 'var(--good)' }}>✓ Your budget is ready.</b> <span className="muted">First cycle starts 27 Nov.</span></Card>

      <Card>
        <div className="muted">Spending limit · 27 Nov – 10 Dec</div>
        <div style={{ fontSize: 30, fontWeight: 800 }}>$1,326 <span className="muted">left of $1,326</span></div>
        <div className="spread small"><span>About $95 a day</span><span>14 days left</span></div>
      </Card>

      <Card>
        <h3>Where your $3,303 goes</h3>
        <div className="stacked">
          <div style={{ flex: 1482, background: 'var(--ink-2)' }} />
          <div style={{ flex: 495, background: 'var(--good)' }} />
          <div style={{ flex: 1326, background: 'var(--brand)' }} />
        </div>
        <div className="row"><span>Bills</span><b>$1,482</b></div>
        <div className="row"><span>Savings</span><b>$495</b></div>
        <div className="row"><span>Spending</span><b>$1,326</b></div>
      </Card>

      <Card>
        <div className="spread"><h3>Category limits</h3><span className="link">Edit</span></div>
        {limits.map((l) => (
          <div key={l.name}>
            <div className="row" style={{ padding: 0 }}>
              <span>{l.name} {l.note && <span className="muted">· {l.note}</span>}</span>
              <span className="muted">${l.spent} / ${l.limit}</span>
            </div>
            <Progress value={l.spent} max={l.limit} color="var(--brand)" />
          </div>
        ))}
      </Card>

      <Card variant="windy">
        <WindyPill label="Budget" />
        <p style={{ marginTop: 8 }}>I’ll nudge you if a category runs hot, and show what a small cut adds to your Japan trip.</p>
        <span className="link">Notification settings ›</span>
      </Card>
    </>
  )
}
