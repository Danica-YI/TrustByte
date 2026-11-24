// Westpac 03 · Cash flow forecast (Idea 4 · Shortfall Early Warning).
// The projection comes from the engine. Ticking fixes previews their combined effect; "Apply" sends them
// through the full pipeline for review and approval, and the home warning goes away once Everyday stays above $0.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Chip, TopBar, WindyPill } from '../components/ui'
import { money, shortDate } from '../format'
import { useApp, useSnap } from '../store'

// Where each fix finds the money, so it is clear what is being touched
const FIX_SOURCE: Record<string, { tag: string; tone: 'good' | 'warn' | 'windy'; detail: string }> = {
  'skip-life': { tag: 'From savings', tone: 'warn', detail: 'Skips one transfer. Your savings balance stays the same.' },
  'hold-subs': { tag: 'From regular payments', tone: 'windy', detail: 'On hold, not cancelled.' },
}

export default function Forecast() {
  const nav = useNavigate()
  const s = useSnap()
  const { propose, busy } = useApp()
  const fc = s.forecast
  // Spending changes are Windy's suggestions (the ideas box below). The fixes list keeps to savings and regular payments.
  const fixes = s.fixes.filter((f) => f.id !== 'eating-out')
  const eatFix = s.fixes.find((f) => f.id === 'eating-out')
  const [picked, setPicked] = useState<string[]>(fixes.length ? [fixes[0].id] : [])
  const toggle = (id: string, on: boolean) => setPicked(on ? [...picked, id] : picked.filter((x) => x !== id))
  // Preview: fixes are mostly independent, so their gains add up (the review screen shows the exact figure)
  const preview = fc.low.balance + fixes.filter((f) => picked.includes(f.id)).reduce((t, f) => t + f.gain, 0)
  const apply = async () => {
    const p = await propose('shortfall_fix', { fixes: picked })
    if (p) nav(`/review/${p.id}`)
  }
  const nonPayday = fc.causes.filter((u) => !['pay', 'auto_save', 'pay_later'].includes(u.kind))
  const ok = fc.low.balance >= 0
  const firstLimit = s.cut_ideas.find((i) => i.action === 'limit')?.id

  return (
    <>
      <TopBar title="Cash flow forecast" fallback="/" />
      <p className="intro">Everyday, next 5 weeks</p>

      <Card>
        <div className="spread">
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: ok ? 'var(--good)' : 'var(--bad)' }}>{money(fc.low.balance)} low</div>
            <div className="muted">around {shortDate(fc.low.date)}</div>
          </div>
          {ok ? <Chip tone="good">Looks fine</Chip> : <Chip tone="bad">Heads up</Chip>}
        </div>
        <Sparkline points={fc.points.map((p) => p.balance)} />
        <div className="spread small"><span>Today</span><span>Payday {shortDate(fc.next_payday)}</span><span>{shortDate(fc.points[fc.points.length - 1].date)}</span></div>
        <p className="small" style={{ marginTop: 8 }}>{fc.assumption}</p>
      </Card>

      <Card>
        <h3>What happens on payday ({shortDate(fc.next_payday)})</h3>
        <div className="row"><span>Pay in</span><b style={{ color: 'var(--good)' }}>+{money(fc.payday.pay, true)}</b></div>
        <div className="row"><span>Auto-saves out</span><b>{money(fc.payday.auto_saves, true)}</b></div>
        <div className="row"><span>Pay-later out</span><b>{money(fc.payday.pay_later, true)}</b></div>
        {nonPayday.length > 0 && <hr className="sep" />}
        {nonPayday.map((u, i) => (
          <div key={i} className="row">
            <div><div>{u.label}</div><div className="muted">{shortDate(u.date)} · {u.source}</div></div>
            <b>{money(u.amount, true)}</b>
          </div>
        ))}
        {fc.usual_after_payday > 0 && <div className="row"><span className="muted">Usual spending, payday to {shortDate(fc.low.date)}</span><b>{money(-fc.usual_after_payday)}</b></div>}
      </Card>

      {fixes.length > 0 && !ok && (
        <>
          <Card>
            <h3>Ways to stay above $0</h3>
            {fixes.map((f) => (
              <label key={f.id} className="row" style={{ cursor: 'pointer', alignItems: 'flex-start' }}>
                <span className="hstack" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                  <input type="checkbox" style={{ marginTop: 3, flexShrink: 0 }} checked={picked.includes(f.id)} onChange={(e) => toggle(f.id, e.target.checked)} />
                  <span>
                    <div>{f.label}</div>
                    <div className="muted">{f.note}</div>
                    {FIX_SOURCE[f.id] && <div style={{ marginTop: 5 }}><Chip tone={FIX_SOURCE[f.id].tone}>{FIX_SOURCE[f.id].tag}</Chip><div className="small" style={{ marginTop: 3 }}>{FIX_SOURCE[f.id].detail}</div></div>}
                  </span>
                </span>
                <b style={{ color: 'var(--good)' }}>+{money(f.gain)}</b>
              </label>
            ))}
            <hr className="sep" />
            <div className="row"><span>New lowest point (about)</span><b style={{ color: preview < 0 ? 'var(--bad)' : 'var(--good)' }}>{money(preview)}</b></div>
          </Card>
          <button className="btn primary block" disabled={busy || picked.length === 0} onClick={apply}>{busy ? 'Windy is checking…' : 'Review selected fixes'}</button>
        </>
      )}
      {ok && <Card variant="windy"><p style={{ margin: 0 }}>✓ Everyday stays above $0 for the next 5 weeks on your current plan.</p></Card>}

      {s.cut_ideas.length > 0 && (
        <div className="ideas">
          <div className="ideas-head"><WindyPill label="Spending ideas" /></div>
          <h3>Spending you could trim</h3>
          <p className="small" style={{ margin: '2px 0 8px' }}>Windy’s suggestions from your spending. Separate from the fixes above, and nothing changes unless you choose to.</p>
          {s.cut_ideas.map((i) => (
            <div key={i.id} className="row" style={{ alignItems: 'flex-start' }}>
              <div>
                <div>{i.label}</div>
                <div className="muted">{i.count} times, {money(i.spent)}. Usually {i.usual_count > 0 ? `${i.usual_count}, ${money(i.usual)}` : 'none'}.</div>
                {i.action === 'limit' && i.id === firstLimit
                  ? <>
                      <button className="link" disabled={busy} onClick={async () => { const p = await propose('budget', { category: 'Eating out', weekly: 60 }); if (p) nav(`/review/${p.id}`) }}>Set a {money(60)} a week Eating out limit ›</button>
                      {eatFix && !ok && <div className="small">Would add about {money(eatFix.gain)} before {shortDate(fc.low.date)}.</div>}
                    </>
                  : i.action === 'limit'
                    ? <div className="small">Counts toward the same Eating out limit.</div>
                    : <button className="link" onClick={() => nav('/chat', { state: { q: `How could I spend less on ${i.label} next month?` } })}>Ask Windy about this ›</button>}
              </div>
              <span className="idea-save">about {money(i.extra)}<br />above usual</span>
            </div>
          ))}
          <p className="small" style={{ marginTop: 8 }}>Windy only looks at optional spending here: eating out, shopping and entertainment. You decide what matters to you.</p>
        </div>
      )}
      <p className="small center" style={{ marginTop: 8 }}>Nothing changes until you approve. A calculator worked out these figures; Windy only explains them.</p>
    </>
  )
}

function Sparkline({ points }: { points: number[] }) {
  const w = 320, h = 90
  const all = [...points, 0]
  const max = Math.max(...all), min = Math.min(...all)
  const x = (i: number) => (i / (points.length - 1)) * w
  const y = (v: number) => h - ((v - min) / (max - min || 1)) * h
  const path = points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const lowI = points.indexOf(Math.min(...points))
  return (
    <svg viewBox={`0 0 ${w} ${h + 4}`} width="100%" style={{ margin: '12px 0 4px' }}>
      <line x1={0} x2={w} y1={y(0)} y2={y(0)} stroke="var(--bad)" strokeDasharray="4 4" strokeWidth={1} />
      <path d={path} fill="none" stroke="var(--ink)" strokeWidth={2.5} />
      <circle cx={x(lowI)} cy={y(points[lowI])} r={5} fill={points[lowI] < 0 ? 'var(--bad)' : 'var(--good)'} />
    </svg>
  )
}
