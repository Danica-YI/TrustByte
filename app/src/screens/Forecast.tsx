// Harbour 03 · Cash flow forecast
import { useState } from 'react'
import { Card, Chip, TopBar } from '../components/ui'
import { money, shortfall } from '../data/mia'

export default function Forecast() {
  const [picked, setPicked] = useState<string[]>(['move'])
  const gain = shortfall.fixes.filter((f) => picked.includes(f.id)).reduce((s, f) => s + f.gain, 0)
  const newLow = shortfall.lowest + gain

  return (
    <>
      <TopBar title="Cash flow forecast" />
      <p className="intro">Everyday, next 4 weeks</p>

      <Card>
        <div className="spread">
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--bad)' }}>{money(shortfall.lowest)} low</div>
            <div className="muted">around {shortfall.lowestDate}</div>
          </div>
          <Chip tone="bad">Heads up</Chip>
        </div>
        <Sparkline points={shortfall.balancePoints} />
        <div className="spread small"><span>Today</span><span>28 Nov</span><span>3 Dec</span></div>
      </Card>

      <Card>
        <h3>What causes it</h3>
        {shortfall.timeline.map((t) => (
          <div key={t.date + t.label} className="row">
            <div><div>{t.label}{t.note && <span className="muted"> · {t.note}</span>}</div><div className="muted">{t.date}</div></div>
            <div style={{ textAlign: 'right' }}>
              <b style={{ color: t.amount > 0 ? 'var(--good)' : undefined }}>{t.amount > 0 ? '+' : ''}{money(t.amount)}</b>
              <div className="muted" style={{ color: t.after < 0 ? 'var(--bad)' : undefined }}>→ {money(t.after)}</div>
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <h3>Ways to stay above $0</h3>
        {shortfall.fixes.map((f) => (
          <label key={f.id} className="row" style={{ cursor: 'pointer' }}>
            <span className="hstack" style={{ flexWrap: 'nowrap' }}>
              <input type="checkbox" checked={picked.includes(f.id)}
                onChange={(e) => setPicked(e.target.checked ? [...picked, f.id] : picked.filter((x) => x !== f.id))} />
              <span><div>{f.label}</div><div className="muted">{f.note}</div></span>
            </span>
            <b style={{ color: 'var(--good)' }}>+{money(f.gain)}</b>
          </label>
        ))}
        <hr className="sep" />
        <div className="row"><span>New lowest point</span><b style={{ color: newLow < 0 ? 'var(--bad)' : 'var(--good)' }}>{money(newLow)}</b></div>
      </Card>
      <button className="btn primary block">Apply selected</button>
    </>
  )
}

function Sparkline({ points }: { points: number[] }) {
  const w = 320, h = 90, max = Math.max(...points), min = Math.min(...points, 0)
  const x = (i: number) => (i / (points.length - 1)) * w
  const y = (v: number) => h - ((v - min) / (max - min)) * h
  const d = points.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h + 4}`} width="100%" style={{ margin: '12px 0 4px' }}>
      <line x1={0} x2={w} y1={y(0)} y2={y(0)} stroke="var(--bad)" strokeDasharray="4 4" strokeWidth={1} />
      <path d={d} fill="none" stroke="var(--ink)" strokeWidth={2.5} />
      <circle cx={x(points.length - 1)} cy={y(points[points.length - 1])} r={5} fill="var(--bad)" />
    </svg>
  )
}
