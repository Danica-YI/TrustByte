// Harbour 03 · Cash flow forecast (Idea 4 · Shortfall Early Warning).
// Everything is computed in data/analysis.ts from scheduled items + usual spending; ticking a fix re-runs it.
import { useState } from 'react'
import { Card, Chip, TopBar } from '../components/ui'
import { daysBetween, forecast, forecastFixes, shortDate, type FixId } from '../data/analysis'
import { money } from '../data/mia'

export default function Forecast() {
  const [picked, setPicked] = useState<FixId[]>(['pause-life'])
  const base = forecast()
  const fixed = forecast(picked)
  const fixes = forecastFixes()
  const toggle = (id: FixId, on: boolean) => setPicked(on ? [...picked, id] : picked.filter((x) => x !== id))

  return (
    <>
      <TopBar title="Cash flow forecast" />
      <p className="intro">Everyday, next 5 weeks</p>

      <Card>
        <div className="spread">
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: base.low.balance < 0 ? 'var(--bad)' : 'var(--good)' }}>{money(base.low.balance)} low</div>
            <div className="muted">around {shortDate(base.low.date)}</div>
          </div>
          {base.low.balance < 0 ? <Chip tone="bad">Heads up</Chip> : <Chip tone="good">Looks fine</Chip>}
        </div>
        <Sparkline points={base.points.map((p) => p.balance)} fixed={fixed.points.map((p) => p.balance)} />
        <div className="spread small"><span>Today</span><span>Payday {shortDate(base.nextPayday)}</span><span>{shortDate(base.points[base.points.length - 1].date)}</span></div>
        <p className="small" style={{ marginTop: 8 }}>
          Assumes you spend only your safe-to-spend ({money(base.safe)}) until payday, then your usual {money(base.daily)} a day
          (groceries, eating out, shopping, transport over the last 90 days).
        </p>
      </Card>

      <Card>
        <h3>What causes it</h3>
        {(() => {
          const pay = base.causes.filter((u) => u.date === base.nextPayday && ['pay', 'auto_save', 'pay_later'].includes(u.kind))
          const sum = (k: string) => pay.filter((u) => u.kind === k).reduce((s, u) => s + u.amount, 0)
          return (
            <>
              <div className="row">
                <div><div>Payday</div><div className="muted">{shortDate(base.nextPayday)} · pay in, then auto-saves and pay-later out</div></div>
                <b style={{ color: 'var(--good)' }}>+{money(sum('pay') + sum('auto_save') + sum('pay_later'), true)}</b>
              </div>
              <div className="small" style={{ margin: '-2px 0 6px' }}>
                {money(sum('pay'))} pay · {money(sum('auto_save'))} auto-saves · {money(sum('pay_later'))} pay-later
              </div>
            </>
          )
        })()}
        {base.causes.filter((u) => !['pay', 'auto_save', 'pay_later'].includes(u.kind)).map((u, i) => (
          <div key={i} className="row">
            <div><div>{u.label}</div><div className="muted">{shortDate(u.date)} · {u.source}</div></div>
            <b>{money(u.amount, true)}</b>
          </div>
        ))}
        <div className="row"><span className="muted">Usual spending, payday to {shortDate(base.low.date)}</span><b>{money(-base.daily * (1 + daysBetween(base.nextPayday, base.low.date)))}</b></div>
      </Card>

      <Card>
        <h3>Ways to stay above $0</h3>
        {fixes.map((f) => (
          <label key={f.id} className="row" style={{ cursor: 'pointer' }}>
            <span className="hstack" style={{ flexWrap: 'nowrap' }}>
              <input type="checkbox" checked={picked.includes(f.id)} onChange={(e) => toggle(f.id, e.target.checked)} />
              <span><div>{f.label}</div><div className="muted">{f.note}</div></span>
            </span>
            <b style={{ color: 'var(--good)' }}>+{money(f.gain)}</b>
          </label>
        ))}
        <hr className="sep" />
        <div className="row"><span>New lowest point</span><b style={{ color: fixed.low.balance < 0 ? 'var(--bad)' : 'var(--good)' }}>{money(fixed.low.balance)}</b></div>
      </Card>
      <button className="btn primary block">Apply selected</button>
      <p className="small center" style={{ marginTop: 8 }}>Nothing changes until you apply. A calculator worked out these figures; Windy only explains them.</p>
    </>
  )
}

function Sparkline({ points, fixed }: { points: number[]; fixed: number[] }) {
  const w = 320, h = 90
  const all = [...points, ...fixed, 0]
  const max = Math.max(...all), min = Math.min(...all)
  const x = (i: number) => (i / (points.length - 1)) * w
  const y = (v: number) => h - ((v - min) / (max - min || 1)) * h
  const path = (ps: number[]) => ps.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const lowI = points.indexOf(Math.min(...points))
  return (
    <svg viewBox={`0 0 ${w} ${h + 4}`} width="100%" style={{ margin: '12px 0 4px' }}>
      <line x1={0} x2={w} y1={y(0)} y2={y(0)} stroke="var(--bad)" strokeDasharray="4 4" strokeWidth={1} />
      <path d={path(fixed)} fill="none" stroke="var(--good)" strokeWidth={2} strokeDasharray="5 3" />
      <path d={path(points)} fill="none" stroke="var(--ink)" strokeWidth={2.5} />
      <circle cx={x(lowI)} cy={y(points[lowI])} r={5} fill="var(--bad)" />
    </svg>
  )
}
