// Joint savings plan: invite other people (a partner, friends) to save for one goal together.
// They only ever see this one goal. Invites are simulated in the demo: no message is sent, and the
// "accepts" button stands in for the other person tapping Join in their own app.
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card, Chip, Lock, Progress, TopBar } from '../components/ui'
import { money, monthYear } from '../format'
import { useApp, useSnap } from '../store'

export default function GoalShare() {
  const { id } = useParams()
  const s = useSnap()
  const { act, busy } = useApp()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('50')
  const g = s.goals.find((x) => x.id === id) ?? s.goals[0]
  const joined = g.members.filter((m) => m.status === 'joined')
  const sooner = joined.length > 0 && g.reached && g.reached_solo && g.reached !== g.reached_solo
  const valid = name.trim().length > 0 && Number(amount) >= 0 && amount !== ''

  const invite = async () => {
    const ok = await act('goal_invite', { goal: g.id, name: name.trim(), per_payday: Number(amount) }, `Invite ready for ${name.trim()}`)
    if (ok) setName('')
  }

  return (
    <>
      <TopBar title="Save together" fallback="/" />

      <Card>
        <div className="spread"><h3>{g.name}</h3><span className="muted">{money(g.saved)} / {money(g.target)}</span></div>
        <Progress value={g.saved} max={g.target} color={g.color} />
        <div className="row"><span>You</span><b>{g.per_payday > 0 ? `${money(g.per_payday)} a payday` : 'No auto-save'}</b></div>
        {g.members.map((m) => (
          <div key={m.name} className="row" style={{ alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>{m.name} <Chip tone={m.status === 'joined' ? 'good' : 'warn'}>{m.status === 'joined' ? 'Joined' : 'Invite sent'}</Chip></span>
            <span className="hstack" style={{ gap: 10 }}>
              <b>{money(m.per_payday)} a payday</b>
              {m.status === 'invited' && <button className="link" disabled={busy} onClick={() => act('goal_member_accept', { goal: g.id, name: m.name }, `${m.name} joined`)}>Demo: accepts</button>}
              <button className="link" disabled={busy} onClick={() => act('goal_member_remove', { goal: g.id, name: m.name }, `${m.name} removed`)}>Remove</button>
            </span>
          </div>
        ))}
        <div className="small" style={{ marginTop: 8 }}>
          {sooner
            ? <>Together you add {money(g.per_payday + g.partner_per_payday)} a payday. Reached <b>{monthYear(g.reached!)}</b> instead of {monthYear(g.reached_solo!)} on your own.</>
            : g.members.length
              ? <>Waiting for {g.members.filter((m) => m.status === 'invited').map((m) => m.name).join(', ') || 'changes'}. The date moves once they join.</>
              : <>On your own: {g.reached ? `reached ${monthYear(g.reached)}` : g.reached_label}. Invite someone to get there sooner.</>}
        </div>
      </Card>

      <Card>
        <h3>Invite someone</h3>
        <p style={{ marginTop: 4 }}>A partner or a friend can join this goal and add their own amount each payday.</p>
        <div className="stack" style={{ gap: 8 }}>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Their name" aria-label="Their name" maxLength={30} />
          <label className="spread" style={{ gap: 8 }}>
            <span>They add each payday ($)</span>
            <input className="field" style={{ width: 110 }} type="number" min={0} max={2000} value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount each payday" />
          </label>
          <button className="btn primary block" disabled={!valid || busy} onClick={invite}>Send invite</button>
        </div>
      </Card>

      <Lock>They only see this goal: the target, the total saved and who is in it. Your other accounts and transactions stay private. Demo: no message is sent.</Lock>
    </>
  )
}
