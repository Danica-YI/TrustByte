// JP-01 · Chat · Japan in 3 months (Idea 2 · Goal Trade-off Simulator).
// A scripted conversation so it's reliable on camera; every number comes from japanSooner() in analysis.ts.
// The live Claude chat (/chat) can answer the same question with tools.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, TopBar } from '../components/ui'
import { japanSooner, monthYear, shortDate } from '../data/analysis'
import { money } from '../data/mia'

export default function JapanSooner() {
  const nav = useNavigate()
  const [askedAlt, setAskedAlt] = useState(false)
  const a = japanSooner('bali')
  const b = japanSooner('home')

  return (
    <>
      <TopBar title="Windy" fallback="/goals/options" />
      <div className="bubble me">I want to go to Japan in the next 3 months. Can you plan the budget?</div>
      <div className="bubble ai">
        <div className="pill" style={{ marginBottom: 6 }}>✦ Windy</div>
        <div><b>Yes, with two changes.</b></div>
        <div style={{ marginTop: 4 }}>
          Your Japan goal is {money(a.target)}. At {money(a.per)} a payday you’d add {money(a.keep)} in {a.paydays} paydays, so I looked at money set aside for plans that aren’t due soon.
        </div>
      </div>

      <Card>
        <div className="row"><span>Saved so far</span><b>{money(a.saved)} <span className="muted">of {money(a.target)}</span></b></div>
        <div className="row"><span>Still needed</span><b>{money(a.needed)} <span className="muted">by {shortDate(a.tripBy)}</span></b></div>
      </Card>

      <div className="bubble ai">
        <div><span className="pill" style={{ marginBottom: 6 }}>✦ Windy · Suggested plan</span></div>
        • Keep saving {money(a.per)} a payday: {money(a.keep)}<br />
        • Move {money(a.fromBali)} from your Bali 2027 fund<br />
        {a.fromHomePer > 0 && <>• Redirect {money(a.fromHomePer)} a payday from Home deposit for {a.paydays} paydays: {money(a.fromHomePer * a.paydays)}<br /></>}
        • Emergency fund is not touched
        <div style={{ marginTop: 6 }}>Total {money(a.total)}. That covers the trip with {money(a.spare)} to spare. Nothing moves until you approve.</div>
      </div>
      <div className="stack" style={{ marginBottom: 10 }}>
        <button className="btn primary" onClick={() => nav('/goals/japan-sooner/review?variant=bali')}>Review and approve</button>
        {!askedAlt && <button className="btn outline" onClick={() => setAskedAlt(true)}>Can we leave the Bali fund alone?</button>}
      </div>

      {askedAlt && (
        <>
          <div className="bubble me">Can we leave the Bali fund alone?</div>
          <div className="bubble ai">
            <div className="pill" style={{ marginBottom: 6 }}>✦ Windy</div>
            <div><b>Yes, but it costs more elsewhere.</b></div>
            <div style={{ marginTop: 4 }}>
              I’d redirect {money(b.fromHomePer)} a payday from Home deposit
              {b.fromEverydayPer > 0 && <> and take {money(b.fromEverydayPer)} a payday from Everyday, which lowers your safe-to-spend by that much</>}.
              {b.homeBefore && b.homeAfter && <> Your home deposit date moves from {monthYear(b.homeBefore)} to {monthYear(b.homeAfter)}.</>}
            </div>
          </div>
          <div className="stack" style={{ marginBottom: 10 }}>
            <button className="btn primary" onClick={() => nav('/goals/japan-sooner/review?variant=home')}>Review this version</button>
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
