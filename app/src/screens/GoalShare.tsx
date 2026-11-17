// Joint savings plan: invite other people (a partner, friends) to save for one goal together.
// They're found by PayID (email, mobile or ABN) or by BSB and account number; only a masked version
// (e.g. "BSB 032-••• · Acct ••••5678") is kept and shown. They only ever see this one goal.
// Invites are simulated in the demo: no message is sent, and the "accepts" button stands in for the
// other person tapping Join in their own app.
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card, Chip, Lock, Progress, Seg, TopBar } from '../components/ui'
import { money, monthYear } from '../format'
import { useApp, useSnap } from '../store'

type Method = 'PayID' | 'BSB & account'
const digits = (v: string) => v.replace(/[\s()-]/g, '')

// Same rules as the server's guardrail (server/guardrails.py GoalInvite); the server checks again.
function payidOk(v: string) {
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim())) return true
  let d = digits(v)
  if (d.startsWith('+61')) d = '0' + d.slice(3)
  return /^04\d{8}$/.test(d) || /^\d{11}$/.test(d)
}

export default function GoalShare() {
  const { id } = useParams()
  const s = useSnap()
  const { act, busy } = useApp()
  const [method, setMethod] = useState<Method>('PayID')
  const [payid, setPayid] = useState('')
  const [bsb, setBsb] = useState('')
  const [account, setAccount] = useState('')
  const [amount, setAmount] = useState('50')
  const g = s.goals.find((x) => x.id === id) ?? s.goals[0]
  const joined = g.members.filter((m) => m.status === 'joined')
  const sooner = joined.length > 0 && g.reached && g.reached_solo && g.reached !== g.reached_solo

  const okPayid = payidOk(payid)
  const okBsb = /^\d{6}$/.test(digits(bsb))
  const okAccount = /^\d{6,9}$/.test(digits(account))
  const okAmount = amount !== '' && Number(amount) >= 0 && Number(amount) <= 2000
  const valid = okAmount && (method === 'PayID' ? okPayid : okBsb && okAccount)

  const invite = async () => {
    const who = method === 'PayID' ? { method: 'payid', payid } : { method: 'account', bsb, account }
    const ok = await act('goal_invite', { goal: g.id, per_payday: Number(amount), ...who }, 'Invitation sent')
    if (ok) { setPayid(''); setBsb(''); setAccount('') }
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
            <span>{m.name} <Chip tone={m.status === 'joined' ? 'good' : 'warn'}>{m.status === 'joined' ? 'Joined' : 'Invitation sent'}</Chip></span>
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
          <Seg options={['PayID', 'BSB & account'] as Method[]} value={method} onChange={setMethod} />
          {method === 'PayID' ? (
            <>
              <input className="field" value={payid} onChange={(e) => setPayid(e.target.value)} placeholder="Email, mobile or ABN"
                aria-label="Their PayID" maxLength={254} autoComplete="off" />
              {payid !== '' && !okPayid && <div className="small" style={{ color: 'var(--bad)' }}>Enter an email, an Australian mobile (04xx xxx xxx) or an ABN.</div>}
            </>
          ) : (
            <>
              <div className="hstack" style={{ flexWrap: 'nowrap', gap: 8 }}>
                <input className="field" style={{ width: 110 }} value={bsb} onChange={(e) => setBsb(e.target.value)} placeholder="BSB"
                  aria-label="BSB" inputMode="numeric" maxLength={7} autoComplete="off" />
                <input className="field" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="Account number"
                  aria-label="Account number" inputMode="numeric" maxLength={11} autoComplete="off" />
              </div>
              {bsb !== '' && !okBsb && <div className="small" style={{ color: 'var(--bad)' }}>A BSB has 6 digits, e.g. 032-001.</div>}
              {account !== '' && !okAccount && <div className="small" style={{ color: 'var(--bad)' }}>An account number has 6 to 9 digits.</div>}
            </>
          )}
          <label className="spread" style={{ gap: 8 }}>
            <span>They add each payday ($)</span>
            <input className="field" style={{ width: 110 }} type="number" min={0} max={2000} value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount each payday" />
          </label>
          <button className="btn primary block" disabled={!valid || busy} onClick={invite}>Send an invitation</button>
        </div>
      </Card>

      <Lock>They only see this goal: the target, the total saved and who is in it. Your other accounts and transactions stay private.
        Only a masked version of their PayID or account is kept. In a real bank you’d see the PayID’s registered name to check
        it’s the right person. Demo: no message is sent.</Lock>
    </>
  )
}
