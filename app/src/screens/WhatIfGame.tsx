// What if? A mini game: guess whether a pretend change helps or hurts Everyday before payday, then flip the card.
// The engine works out every answer (GET /api/what_if). Nothing here is saved to the plan.
import { useEffect, useState } from 'react'
import { api, type WhatIf } from '../api'
import { Card, Chip, Lock, TopBar, WindyPill } from '../components/ui'
import { money } from '../format'

const LINES: Record<string, string> = {
  'pay-rise': 'Nice. Still not enough on its own, so maybe hold the champagne.',
  cat: 'Worth it, obviously. But the cat now outranks one of your goals.',
  afterpay: 'Four small payments. Each one lands on the day you least want it.',
  cook: 'Your delivery driver will miss you. Your balance will not.',
  japan: 'Japan gets closer. Everyday gets a little grumpy.',
  skip: 'One skipped transfer and the dip is gone. Your savings balance stays the same.',
}

export default function WhatIfGame() {
  const [items, setItems] = useState<WhatIf[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [guess, setGuess] = useState<Record<string, boolean>>({})
  useEffect(() => { api.whatIf().then((r) => setItems(r.scenarios)).catch(() => setFailed(true)) }, [])

  const played = items ? items.filter((i) => i.id in guess) : []
  const right = played.filter((i) => guess[i.id] === i.helps).length

  return (
    <>
      <TopBar title="What if?" fallback="/insights/tools" />
      <Card variant="windy">
        <WindyPill label="Mini game" />
        <h2 style={{ marginTop: 8 }}>Guess, then flip</h2>
        <p style={{ marginBottom: 0 }}>Does each change help or hurt your lowest Everyday balance before payday? Nothing here changes your plan.</p>
        {items && items.length > 0 && <div className="row" style={{ marginTop: 8 }}><span>Your score</span><b>{right} of {played.length}{played.length === items.length ? (right === items.length ? ' · perfect' : ' · done') : ''}</b></div>}
      </Card>

      {failed && <Card><p>Windy can’t reach the calculator right now. Try again in a moment.</p></Card>}
      {items && items.length === 0 && <Card><p>Turn on cash flow and goal planning in Your data and consent to play.</p></Card>}
      {!items && !failed && <Card><p>Setting up the game…</p></Card>}

      {items?.map((i) => {
        const done = i.id in guess
        const ok = done && guess[i.id] === i.helps
        return (
          <Card key={i.id} variant={done ? 'selected' : undefined}>
            <h3>{i.title}</h3>
            <div className="muted">{i.note}</div>
            {!done ? (
              <div className="hstack" style={{ marginTop: 10 }}>
                <button className="btn outline" style={{ flex: 1 }} onClick={() => setGuess({ ...guess, [i.id]: true })}>Helps</button>
                <button className="btn outline" style={{ flex: 1 }} onClick={() => setGuess({ ...guess, [i.id]: false })}>Hurts</button>
              </div>
            ) : (
              <div className="change-list">
                <div className="row" style={{ marginTop: 8 }}>
                  <span><Chip tone={ok ? 'good' : 'bad'}>{ok ? 'You got it' : 'Not quite'}</Chip> It {i.helps ? 'helps' : 'hurts'}</span>
                  <b><span className="from">{money(i.low_before)}</span>{money(i.low_after)}</b>
                </div>
                {i.changes.map((c) => <div key={c.label} className="row"><span>{c.label}</span><b><span className="from">{c.from}</span>{c.to}</b></div>)}
                <p className="small" style={{ marginTop: 8 }}>{LINES[i.id] ?? ''}</p>
              </div>
            )}
          </Card>
        )
      })}

      {items && items.length > 0 && played.length > 0 && <button className="btn ghost block" onClick={() => setGuess({})}>Play again</button>}
      <Lock>A calculator worked out every answer. The dollar guesses on each card are examples.</Lock>
    </>
  )
}
