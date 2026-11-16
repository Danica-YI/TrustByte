// RL-03 · Tick what you bought (Idea 10 · Receipt Lens, no-receipt path).
// For a shop with no receipt: Mia ticks the types of things and optionally adds amounts.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, TopBar } from '../components/ui'
import { groceryCheck, shortDate } from '../data/analysis'
import { money } from '../data/mia'

type Row = { name: string; on: boolean; amount: string; rough?: boolean }

export default function QuickSplit() {
  const nav = useNavigate()
  const g = groceryCheck()
  const [rows, setRows] = useState<Row[]>([
    { name: 'Groceries', on: true, amount: '' },
    { name: 'Snacks and drinks', on: true, amount: '', rough: true },
    { name: 'Household', on: true, amount: '' },
    { name: 'Personal care', on: false, amount: '' },
    { name: 'Pet supplies', on: false, amount: '' },
    { name: 'Other', on: false, amount: '' },
  ])
  const set = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const sofar = rows.filter((r) => r.on).reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const left = Math.round((g.amount - sofar) * 100) / 100

  return (
    <>
      <TopBar title={`${g.shop.merchant} · ${money(g.amount, true)}`} />
      <div className="muted" style={{ marginTop: -6, marginBottom: 10 }}>{shortDate(g.shop.date)} · No receipt</div>
      <h2 style={{ margin: '0 0 6px' }}>What was in this shop?</h2>
      <p className="intro">Tick the types of things you bought. Add an amount if you want more detail, or leave it blank.</p>

      <Card variant="windy">
        <p style={{ margin: 0 }}>✦ Windy asked because this shop was about {money(g.above)} above your usual {money(g.usual)}. Skip it any time.</p>
      </Card>

      <Card>
        {rows.map((r, i) => (
          <div key={r.name} className="row">
            <label className="hstack" style={{ cursor: 'pointer', flexWrap: 'nowrap' }}>
              <input type="checkbox" checked={r.on} onChange={(e) => set(i, { on: e.target.checked })} />
              <span>{r.name}{r.rough && r.amount && <span className="muted"> · rough</span>}</span>
            </label>
            {r.on ? (
              <input inputMode="decimal" placeholder="Add $" value={r.amount} onChange={(e) => set(i, { amount: e.target.value.replace(/[^\d.]/g, '') })}
                style={{ width: 84, textAlign: 'right', border: '1px solid var(--line)', borderRadius: 10, padding: '6px 8px', font: 'inherit' }} />
            ) : <span className="muted">—</span>}
          </div>
        ))}
        <hr className="sep" />
        <div className="row"><span>Amounts so far</span><b>{money(sofar, true)}</b></div>
        <div className="row"><span className="muted">Not split yet</span><span className="muted">{money(left, true)}</span></div>
        <button className="link" style={{ marginTop: 6 }}>+ Add a type</button>
      </Card>

      <button className="btn primary block" onClick={() => nav('/')}>Save</button>
      <p className="small center" style={{ marginTop: 8 }}>Types are about money, not health or diet. Only you can see this.</p>
    </>
  )
}
