// JP-01 · Ask Windy: Japan in 3 months (Idea 2). A guided conversation so it's reliable on camera; every
// number comes from the engine. Tapping "Review" asks the backend for a full proposal (guardrails, AI, checks).
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Mark, TopBar } from '../components/ui'
import { money, monthYear, shortDate } from '../format'
import { useApp, useSnap } from '../store'

export default function JapanSooner() {
  const nav = useNavigate()
  const s = useSnap()
  const { propose, busy } = useApp()
  const [askedAlt, setAskedAlt] = useState(false)
  const a = s.japan.bali
  const b = s.japan.home
  const review = async (variant: 'bali' | 'home') => {
    const p = await propose('japan_sooner', { variant })
    if (p) nav(`/review/${p.id}`)
  }

  if (s.plan_choice?.kind === 'japan_sooner') {
    const jp = s.goals.find((g) => g.id === 'goal-japan')!
    return (
      <>
        <TopBar title="Windy" fallback="/" />
        <div className="bubble ai">
          <div className="pill" style={{ marginBottom: 6 }}><Mark /> Windy</div>
          You’re on track: {s.plan_choice.name}. Japan has {money(jp.saved)} of {money(jp.target)}, with {money(jp.per_payday)} going in each payday, so you reach it in {monthYear(jp.reached)}.
        </div>
        <button className="btn outline block" onClick={() => nav('/plan')}>See or undo this plan</button>
      </>
    )
  }

  return (
    <>
      <TopBar title="Windy" fallback="/" />
      <div className="bubble me">I want to go to Japan in the next 3 months. Can you plan the budget?</div>
      <div className="bubble ai">
        <div className="pill" style={{ marginBottom: 6 }}><Mark /> Windy</div>
        <div><b>Yes, with two changes.</b></div>
        <div style={{ marginTop: 4 }}>
          Your Japan goal is {money(a.target)}. At {money(a.per)} a payday you’d add {money(a.keep)} in {a.paydays} paydays, so I looked at money set aside for plans that aren’t due soon.
        </div>
      </div>

      <Card>
        <div className="row"><span>Saved so far</span><b>{money(a.saved)} <span className="muted">of {money(a.target)}</span></b></div>
        <div className="row"><span>Still needed</span><b>{money(a.needed)} <span className="muted">by {shortDate(a.trip_by)}</span></b></div>
        <div className="row"><span>On your current plan</span><span className="muted">{monthYear(a.japan_before)}</span></div>
      </Card>

      <div className="bubble ai">
        <div><span className="pill" style={{ marginBottom: 6 }}><Mark /> Windy · Suggested plan</span></div>
        • Keep saving {money(a.per)} a payday: {money(a.keep)}<br />
        {a.from_bali > 0 && <>• Move {money(a.from_bali)} from your Bali 2027 fund<br /></>}
        {a.from_home_per > 0 && <>• Redirect {money(a.from_home_per)} a payday from Home deposit for {a.paydays} paydays: {money(a.from_home_per * a.paydays)}<br /></>}
        {a.from_everyday_per > 0 && <>• {money(a.from_everyday_per)} a payday from Everyday<br /></>}
        • Emergency fund is not touched
        <div style={{ marginTop: 6 }}>Total {money(a.total)}. That covers the trip with {money(a.spare)} to spare. Nothing moves until you approve.</div>
      </div>
      <div className="stack" style={{ marginBottom: 10 }}>
        <button className="btn primary" disabled={busy} onClick={() => review('bali')}>{busy ? 'Windy is checking…' : 'Review and approve'}</button>
        {!askedAlt && <button className="btn outline" onClick={() => setAskedAlt(true)}>Can we leave the Bali fund alone?</button>}
      </div>

      {askedAlt && (
        <>
          <div className="bubble me">Can we leave the Bali fund alone?</div>
          <div className="bubble ai">
            <div className="pill" style={{ marginBottom: 6 }}><Mark /> Windy</div>
            <div><b>Yes, but it costs more elsewhere.</b></div>
            <div style={{ marginTop: 4 }}>
              I’d redirect {money(b.from_home_per)} a payday from Home deposit
              {b.from_everyday_per > 0 && <> and take {money(b.from_everyday_per)} a payday from Everyday, which lowers what you have left each fortnight</>}
              {' '}for {b.paydays} paydays.
            </div>
          </div>
          <div className="stack" style={{ marginBottom: 10 }}>
            <button className="btn primary" disabled={busy} onClick={() => review('home')}>Review this version</button>
            <button className="btn outline" onClick={() => nav('/goals/options')}>Compare options</button>
          </div>
        </>
      )}
      <div style={{ height: 70 }} />
      <form className="composer" onSubmit={(e) => { e.preventDefault(); nav('/chat') }}>
        <input placeholder="Type a follow-up… (opens live chat)" />
        <button className="btn primary" type="submit">➤</button>
      </form>
    </>
  )
}
