// Westpac 02 · Insights (Ideas 5+6 · Spending Behaviour Coach). Real figures from 12 months of history,
// compared fairly (same days of earlier months). Setting a limit goes through review and approve,
// and then lowers the usual spending the forecast plans for.
// The chart: one stacked bar per month, coloured by category. Tap a month (or use ‹ ›) to see its
// dates, total and categories with their share of the month.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CategoryIcon, Chip, WindyPill } from '../components/ui'
import { dayDate, money } from '../format'
import { ReceiptsToSortCard } from '../components/MoneyCards'
import { useApp, useSnap } from '../store'
import { InsightsTabs } from './InsightsHub'

const CATEGORY_COLORS: Record<string, string> = {
  Groceries: '#1f1d4d',
  'Eating out': '#e43fc4',
  Shopping: '#8f22d6',
  Transport: '#c8102e',
  Subscriptions: '#c2410c',
  'Bills and utilities': '#0e7490',
}
const colorOf = (c: string) => CATEGORY_COLORS[c] ?? '#8a8299'
const CHART_HEIGHT = 150

export default function Insights() {
  const s = useSnap()
  const nav = useNavigate()
  const { propose, busy } = useApp()
  const ins = s.insights
  const [sel, setSel] = useState(ins.months.length - 1) // the current month
  const limit = ins.budgets['Eating out']

  if (!s.consent.spending_insights) {
    return <><InsightsTabs /><Card><p>Spending coaching is off in Your data and consent.</p></Card></>
  }

  // A round top value for the axis ($300, $1,500, $2,500…), with gridlines at 0, half and top
  const top = Math.max(...ins.months.map((m) => m.v))
  const step = top > 1000 ? 500 : top > 200 ? 100 : 50
  const axis = Math.max(step, Math.ceil(top / step) * step)
  const month = ins.months[sel]
  const cats = Object.entries(month.by_category ?? {}).sort((a, b) => b[1] - a[1])

  return (
    <>
      <InsightsTabs />
      <Card>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="small" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: CHART_HEIGHT, textAlign: 'right', minWidth: 42 }}>
            <span>{money(axis)}</span><span>{money(axis / 2)}</span><span>$0</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ position: 'relative', height: CHART_HEIGHT, display: 'flex', alignItems: 'flex-end', gap: 10 }}>
              {[0, 0.5, 1].map((f) => (
                <div key={f} style={{ position: 'absolute', left: 0, right: 0, bottom: f * CHART_HEIGHT, borderTop: '1px solid var(--line)' }} />
              ))}
              {ins.months.map((m, i) => (
                <button key={m.start} onClick={() => setSel(i)} aria-label={`${m.m}: ${money(m.v)}`} aria-pressed={i === sel}
                  style={{ flex: 1, height: (m.v / axis) * CHART_HEIGHT, display: 'flex', flexDirection: 'column-reverse', padding: 0,
                    border: 'none', background: 'none', cursor: 'pointer', position: 'relative', opacity: i === sel ? 1 : 0.85 }}>
                  {Object.entries(m.by_category ?? {}).map(([c, v]) => (
                    <span key={c} style={{ height: `${(v / m.v) * 100}%`, background: colorOf(c), display: 'block' }} />
                  ))}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              {ins.months.map((m, i) => (
                <button key={m.start} onClick={() => setSel(i)} className="small"
                  style={{ flex: 1, padding: '2px 0 6px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'center',
                    color: i === sel ? 'var(--ink)' : undefined, fontWeight: i === sel ? 700 : undefined,
                    borderBottom: `3px solid ${i === sel ? 'var(--brand)' : 'transparent'}` }}>
                  {m.m}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="center" style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 600 }}>{dayDate(month.start).replace(',', '')} – {dayDate(month.end).replace(',', '')}{month.partial && <span className="muted"> · so far</span>}</div>
          <div className="spread" style={{ marginTop: 4 }}>
            <button className="link" style={{ fontSize: 24, visibility: sel > 0 ? 'visible' : 'hidden' }} onClick={() => setSel(sel - 1)} aria-label="Previous month">‹</button>
            <div style={{ fontSize: 30, fontWeight: 800 }}>{money(-month.v, true)}</div>
            <button className="link" style={{ fontSize: 24, visibility: sel < ins.months.length - 1 ? 'visible' : 'hidden' }} onClick={() => setSel(sel + 1)} aria-label="Next month">›</button>
          </div>
          {month.partial && (
            <Chip tone={ins.vs_same_days > 0 ? 'bad' : 'good'}>{ins.vs_same_days > 0 ? '+' : ''}{money(ins.vs_same_days)} vs usual by now</Chip>
          )}
        </div>
      </Card>

      <Card>
        <h3>Categories</h3>
        {cats.map(([c, v]) => {
          // This month only: compared fairly with the same days (1 to today) of earlier months
          const cmp = month.partial ? ins.categories.find((x) => x.category === c) : undefined
          const pct = cmp ? Math.round((cmp.diff_vs_same_days / cmp.avg_same_days) * 100) : 0
          return (
            <div key={c} className="row" style={{ padding: '8px 0', alignItems: 'flex-start' }}>
              <div className="hstack" style={{ flexWrap: 'nowrap', gap: 12 }}>
                <CategoryIcon name={c} color={colorOf(c)} />
                <div>
                  <div>{c}</div>
                  <div className="muted">{((v / month.v) * 100).toFixed(1)}%{cmp && <> · usual by now {money(cmp.avg_same_days)}</>}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <b style={{ whiteSpace: 'nowrap' }}>{money(-v, true)}</b>
                {cmp && (
                  <div style={{ marginTop: 2 }}>
                    <Chip tone={pct > 20 ? 'bad' : pct > 0 ? 'warn' : 'good'}>{Math.abs(pct) < 3 ? 'On track' : `${pct > 0 ? '+' : '−'}${Math.abs(pct)}%`}</Chip>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {cats.length === 0 && <p className="muted">No spending in this month.</p>}
        {month.partial && cats.length > 0 && <p className="small" style={{ marginTop: 8 }}>“Usual by now” is days 1 to {ins.days_counted} of earlier months.</p>}
      </Card>

      <Card variant="windy">
        <WindyPill label="Money Coach" />
        <p style={{ marginTop: 10, marginBottom: 12 }}>{ins.coach}</p>
        {limit
          ? <div className="plan-strip" style={{ marginBottom: 0 }}>✓ Eating out limit: {money(limit)} a week. Your forecast plans for it.</div>
          : <button className="btn outline" disabled={busy} onClick={async () => { const p = await propose('budget', { category: 'Eating out', weekly: 60 }); if (p) nav(`/review/${p.id}`) }}>
              Set a {money(60)} a week Eating out limit
            </button>}
      </Card>

      {/* Every receipt not sorted yet (Home only nudges about the one big shop) */}
      {s.consent.receipts && <ReceiptsToSortCard />}
    </>
  )
}
