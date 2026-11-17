// Goal battle: race a friend to a savings amount. A playful take on Save together.
// The friend is pretend in this demo. In real use each person would only see the other's percentage.
import { useState } from 'react'
import { Card, Lock, Progress, Seg, StepIcon, TopBar, WindyPill } from '../components/ui'
import { money, shortDate } from '../format'
import { useSnap } from '../store'

const RACES = ['$500', '$1,000', '$2,000'] as const
const DAY = 864e5

export default function GoalBattle() {
  const s = useSnap()
  const racers = s.goals.filter((g) => g.per_payday > 0)
  const [goalId, setGoalId] = useState(racers[0]?.id ?? '')
  const [race, setRace] = useState<typeof RACES[number]>('$1,000')
  const [friend, setFriend] = useState('Sam')
  const [theirs, setTheirs] = useState(100)
  const g = racers.find((x) => x.id === goalId) ?? racers[0]

  if (!g) {
    return <><TopBar title="Goal battle" fallback="/insights/tools" /><Card><p>Set an auto-save on a goal first, then come back to race.</p></Card></>
  }

  const target = Number(race.replace(/[$,]/g, ''))
  const mine = g.per_payday
  const myPaydays = Math.ceil(target / mine)
  const theirPaydays = theirs > 0 ? Math.ceil(target / theirs) : Infinity
  const finish = Math.min(myPaydays, theirPaydays)
  const when = (n: number) => shortDate(new Date(Date.parse(s.everyday.next_payday) + (n - 1) * 14 * DAY).toISOString().slice(0, 10))
  const name = friend.trim() || 'Your friend'
  const tie = myPaydays === theirPaydays
  const iWin = myPaydays < theirPaydays

  return (
    <>
      <TopBar title="Goal battle" fallback="/insights/tools" />

      <Card variant="windy">
        <WindyPill label="Referee" />
        <h2 style={{ marginTop: 8 }}>{tie ? 'It’s a tie' : iWin ? `${name} buys dinner` : 'You buy dinner'}</h2>
        <p>First to save {race} from today.</p>
        <div className="spread"><span>You · {money(mine)} a payday</span><b>{Math.min(100, Math.round((finish * mine * 100) / target))}%</b></div>
        <Progress value={Math.min(target, finish * mine)} max={target} color="var(--brand)" />
        <div className="spread"><span>{name} · {money(theirs)} a payday</span><b>{Math.min(100, Math.round((finish * theirs * 100) / target))}%</b></div>
        <Progress value={Math.min(target, finish * theirs)} max={target} color="#0e7490" />
        <p className="small" style={{ marginTop: 6 }}>
          You get there on payday {myPaydays} ({when(myPaydays)}). {theirs > 0 ? `${name} on payday ${theirPaydays} (${when(theirPaydays)}).` : `${name} is not saving yet.`}
        </p>
      </Card>

      <Card>
        <h3>Set up the race</h3>
        <div className="stack" style={{ gap: 10, marginTop: 8 }}>
          <label className="spread" style={{ gap: 8 }}>
            <span>Your goal</span>
            <select className="field" style={{ width: 190 }} value={g.id} onChange={(e) => setGoalId(e.target.value)} aria-label="Your goal">
              {racers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </label>
          <div className="spread"><span>Race to</span><Seg options={[...RACES]} value={race} onChange={setRace} /></div>
          <label className="spread" style={{ gap: 8 }}>
            <span>Friend</span>
            <input className="field" style={{ width: 190 }} value={friend} onChange={(e) => setFriend(e.target.value)} maxLength={20} aria-label="Friend’s name" />
          </label>
          <div>
            <div style={{ marginBottom: 6 }}>They save each payday ($)</div>
            <div className="hstack" style={{ flexWrap: 'nowrap' }}>
              <button className="btn outline step" onClick={() => setTheirs(Math.max(0, theirs - 10))} aria-label="Less"><StepIcon /></button>
              <input className="field" style={{ textAlign: 'center', fontWeight: 700 }} type="number" min={0} max={2000} value={theirs}
                onChange={(e) => setTheirs(Math.min(2000, Math.max(0, Math.round(Number(e.target.value) || 0))))} aria-label="Friend’s amount each payday" />
              <button className="btn outline step" onClick={() => setTheirs(Math.min(2000, theirs + 10))} aria-label="More"><StepIcon plus /></button>
            </div>
          </div>
        </div>
      </Card>

      <Lock>Demo: the friend is pretend. In a real race each person would only see the other’s percentage, never amounts or accounts.</Lock>
    </>
  )
}
