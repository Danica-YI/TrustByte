// Your goals: the everyday view. Each goal opens its own page where Mia can change it herself.
// The trade-off screen (Your options) is not shown here by default: it only appears as a prompt
// while a confirmed rent rise still has to be covered, which starts from the life event card on Home.
import { Link } from 'react-router-dom'
import { Card, Mark, Progress, TopBar } from '../components/ui'
import { money, monthYear } from '../format'
import { useSnap } from '../store'

export default function Goals() {
  const s = useSnap()
  const needsChoice = s.life_event.status === 'confirmed' && !s.tradeoff.no_conflict && s.plan_choice?.kind !== 'goal_plan'
  const saved = s.goals.reduce((t, g) => t + g.saved, 0)
  const perPayday = s.goals.reduce((t, g) => t + g.per_payday, 0)

  return (
    <>
      <TopBar title="Your goals" fallback="/" />

      {needsChoice && (
        <Card variant="windy">
          <span className="pill"><Mark /> Windy · Goal check</span>
          <h3 style={{ marginTop: 8 }}>Your rent went up {money(s.tradeoff.rent_rise_per_fortnight)} a fortnight</h3>
          <p>Your auto-saves need to cover it. See what each choice means for your goals.</p>
          <Link to="/goals/options" className="btn primary block" style={{ textAlign: 'center', textDecoration: 'none' }}>See my options</Link>
        </Card>
      )}

      <Card>
        <div className="row"><span>Saved across your goals</span><b>{money(saved)}</b></div>
        <div className="row"><span>Going in each payday</span><b>{money(perPayday)}</b></div>
      </Card>

      {s.goals.map((g) => (
        <Link key={g.id} to={`/goals/${g.id}`} style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>
          <Card>
            <div className="spread"><h3>{g.name}</h3><span className="muted">{money(g.saved)} / {money(g.target)}</span></div>
            <Progress value={g.saved} max={g.target} color={g.color} />
            <div className="goal-meta">
              <span>{g.per_payday > 0 ? `${money(g.per_payday)} a payday` : 'No auto-save'}{g.members.length ? ` · with ${g.members.map((m) => m.name).join(', ')}` : ''}</span>
              <span>{g.reached ? `Reached ${monthYear(g.reached)}` : g.reached_label} ›</span>
            </div>
          </Card>
        </Link>
      ))}

      <p className="small center">Tap a goal to see its plan and change it.</p>
    </>
  )
}
