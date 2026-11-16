// RL-03 · Tick what you bought (Idea 10 · Receipt Lens, no-receipt path). Saved to Mia's plan.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, TopBar } from '../components/ui'
import { money, shortDate } from '../format'
import { useApp, useSnap } from '../store'

type Row = { name: string; on: boolean; amount: string; rough?: boolean }
const DEFAULT: Row[] = [
  { name: 'Groceries', on: true, amount: '' },
  { name: 'Snacks and drinks', on: true, amount: '', rough: true },
  { name: 'Household', on: true, amount: '' },
  { name: 'Personal care', on: false, amount: '' },
  { name: 'Pet supplies', on: false, amount: '' },
  { name: 'Other', on: false, amount: '' },
]

export default function QuickSplit() {
  const nav = useNavigate()
  const s = useSnap()
  const { act, busy } = useApp()
  const g = s.grocery
  const [rows, setRows] = useState<Row[]>(() => g.split
    ? DEFAULT.map((d) => { const x = g.split!.find((r) => r.name === d.name); return x ? { ...d, on: true, amount: x.amount ? String(x.amount) : '' } : { ...d, on: false } })
    : DEFAULT)
  const set = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const sofar = rows.filter((r) => r.on).reduce((t, r) => t + (Number(r.amount) || 0), 0)
  const left = Math.round((g.shop.amount - sofar) * 100) / 100
  const save = async () => {
    const ok = await act('quick_split', { shop_id: g.shop.id, rows: rows.filter((r) => r.on).map((r) => ({ name: r.name, amount: r.amount ? Number(r.amount) : null })) }, 'Saved. Thanks for helping Windy learn.')
    if (ok) nav('/')
  }

  return (
    <>
      <TopBar title={`${g.shop.merchant} · ${money(g.shop.amount, true)}`} fallback="/" />
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
      </Card>

      <button className="btn primary block" disabled={busy || left < -0.004} onClick={save}>Save</button>
      {left < -0.004 && <p className="small center" style={{ color: 'var(--bad)' }}>Your amounts add up to more than the shop.</p>}
      <p className="small center" style={{ marginTop: 8 }}>Types are about money, not health or diet. Only you can see this.</p>
    </>
  )
}
