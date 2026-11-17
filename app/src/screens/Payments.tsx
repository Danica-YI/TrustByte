// R-02 / R-03 · Regular payments (Idea 9+15 · Commitments Watch).
// Payments are detected from history by the engine. "Add it" / "Not a bill" are saved to Mia's plan;
// covering the insurance rise goes through the full review and approve flow.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, Chip, Seg, TopBar, WindyPill } from '../components/ui'
import type { Recurring, Snapshot, Upcoming } from '../api'
import { money, shortDate } from '../format'
import { useApp, useSnap } from '../store'

const GROUPS: { name: string; match: (r: Recurring) => boolean }[] = [
  { name: 'Home & bills', match: (r) => r.account === 'everyday' && r.category === 'Bills and utilities' },
  { name: 'Subscriptions', match: (r) => r.account === 'everyday' && r.category === 'Subscriptions' },
]

export default function Payments() {
  const s = useSnap()
  const c = s.commitments
  const [sheet, setSheet] = useState<string | null>(null)
  const [view, setView] = useState<'List' | 'Calendar'>('List')
  const live = c.rows.filter((r) => r.state === 'ongoing' || r.state === 'confirmed')
  const found = c.found.find((r) => r.merchant === sheet)
  const ins = c.yearly.insurance

  return (
    <>
      <TopBar title="Regular payments" back={false} />
      <div style={{ marginBottom: 14 }}><Seg options={['List', 'Calendar']} value={view} onChange={setView} /></div>

      <Card>
        <div className="muted" style={{ marginTop: 4 }}>Per fortnight</div>
        <div style={{ fontSize: 28, fontWeight: 800 }}>{money(c.per_fortnight)} <span className="muted">across {c.count} regular payments</span></div>
        <p className="small" style={{ marginTop: 6 }}>Includes rent and yearly bills. Already counted in your Safe to spend.</p>
      </Card>

      {view === 'Calendar' ? <Calendar s={s} /> : (
        <>
          {(c.found.length > 0 || (ins && !ins.reviewed)) && (
            <Card variant="windy">
              <WindyPill label={`found ${c.found.length + (ins && !ins.reviewed ? 1 : 0)}`} />
              <div className="muted" style={{ margin: '6px 0' }}>Needs a quick check</div>
              {c.found.map((f) => (
                <div key={f.merchant} className="row">
                  <div className="hstack" style={{ flexWrap: 'nowrap' }}>
                    <div className="avatar">{f.merchant[0]}</div>
                    <div><div>{f.merchant}</div><div className="muted">{f.cadence} · seen {f.seen.map(shortDate).join(', ')}</div></div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <b>{money(f.latest, true)}</b>
                    <div><button className="link" onClick={() => setSheet(f.merchant)}>Check it</button></div>
                  </div>
                </div>
              ))}
              {ins && !ins.reviewed && (
                <div className="row">
                  <div className="hstack" style={{ flexWrap: 'nowrap' }}>
                    <div className="avatar">A</div>
                    <div><div>Car insurance renewal</div><div className="muted">Up {ins.pct}% · renews {shortDate(ins.due)}</div></div>
                  </div>
                  <div style={{ textAlign: 'right' }}><b>{money(ins.now)}</b><div><button className="link" onClick={() => setSheet('insurance')}>Check it</button></div></div>
                </div>
              )}
            </Card>
          )}

          <Card>
            {c.price_rises.map((r) => <div key={r.merchant} className="small">↑ {r.merchant} went up {money(r.price_change!, true)}. Now {money(r.latest, true)}. Included in your totals.</div>)}
            {c.stopped.map((r) => <div key={r.merchant} className="small" style={{ marginTop: 4 }}>✓ {r.merchant} stopped after {shortDate(r.seen[r.seen.length - 1])}. Removed from your bills.</div>)}
            <Link to="/pay-later" className="row" style={{ marginTop: 6 }}>
              <span><b>{c.pay_later.active.length} pay-later plans</b> · {money(c.pay_later.next_payday_total)} next payday</span><span className="link">›</span>
            </Link>
          </Card>

          {GROUPS.map((g) => {
            const rows = live.filter(g.match)
            const total = rows.reduce((t, r) => t + r.per_fortnight, 0) + (g.name === 'Home & bills' ? c.rent.per_fortnight : 0)
            return (
              <Card key={g.name}>
                <div className="spread"><h3>{g.name}</h3><b>{money(total)}</b></div>
                {g.name === 'Home & bills' && (
                  <div className="row">
                    <div className="hstack" style={{ flexWrap: 'nowrap' }}>
                      <div className="avatar">R</div>
                      <div><div>{c.rent.label}</div><div className="muted">{c.rent.frequency} · <Chip tone="windy">from your move</Chip></div></div>
                    </div>
                    <div style={{ textAlign: 'right' }}><b>{money(c.rent.per_fortnight)}</b><div className="muted">{money(c.rent.amount)} {c.rent.frequency}</div></div>
                  </div>
                )}
                {rows.map((r) => (
                  <div key={r.merchant} className="row">
                    <div className="hstack" style={{ flexWrap: 'nowrap' }}>
                      <div className="avatar">{r.merchant[0]}</div>
                      <div><div>{r.merchant} {r.state === 'confirmed' && <Chip tone="windy">added</Chip>} {r.paused && <Chip tone="warn">on hold</Chip>}</div>
                        <div className="muted">{r.cadence} · next {shortDate(r.next_expected)}</div></div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <b>{money(r.per_fortnight)}</b>
                      <div className="muted">{money(r.latest, true)} {r.cadence}</div>
                    </div>
                  </div>
                ))}
              </Card>
            )
          })}

          <Card>
            <div className="spread"><h3>Yearly bills · set aside</h3><b>{money(c.yearly.balance)}</b></div>
            {c.yearly.due.map((u) => (
              <div key={u.label} className="row">
                <div><div>{u.label}</div><div className="muted">Due {shortDate(u.date)} · {u.source}</div></div>
                <b>{money(-u.amount)}</b>
              </div>
            ))}
            <div className="row"><span className="muted">Auto-save into it each payday</span><b>{money(c.yearly.per_payday)}</b></div>
            {c.yearly.short_by > 0
              ? <p className="small" style={{ color: 'var(--bad)', marginTop: 6 }}>Your set-aside is {money(c.yearly.short_by, true)} short for these, because the insurance renewal went up.</p>
              : <p className="small" style={{ marginTop: 6, color: 'var(--good)' }}>✓ Covered by your Bills set-aside.</p>}
          </Card>
        </>
      )}

      {sheet && (
        <div className="sheet-backdrop" onClick={() => setSheet(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <button className="sheet-close" onClick={() => setSheet(null)} aria-label="Close">✕</button>
            {sheet === 'insurance' ? <InsuranceSheet onClose={() => setSheet(null)} /> : found && <FoundSheet r={found} onClose={() => setSheet(null)} />}
          </div>
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------- Calendar: the next 5 weeks, week by week
// Payday is shown, same-day Afterpay instalments and auto-saves fold into one row (tap to open),
// bills paid from the Bills set-aside are greyed out and left out of the week's total, and each week
// ends with the forecast's Everyday balance so this lines up with the shortfall warning.
const WEEKS = 5
const FOLDED: Record<string, string> = { pay_later: 'Afterpay', auto_save: 'Auto-saves to your goals' }
const addDays = (iso: string, n: number) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10)

type Row = { key: string; date: string; label: string; amount: number; setAside: boolean; parts: Upcoming[] }

function scheduleRows(s: Snapshot, from: string, to: string): Row[] {
  const items = [...s.upcoming, ...s.commitments.yearly.due]
    .filter((u) => u.date >= from && u.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date) || (b.amount > 0 ? 1 : 0) - (a.amount > 0 ? 1 : 0))
  const rows: Row[] = []
  for (const u of items) {
    const fold = FOLDED[u.kind]
    const same = fold && rows.find((r) => r.date === u.date && r.parts[0].kind === u.kind)
    if (same) {
      same.parts.push(u)
      same.amount += u.amount
      same.label = `${fold} ×${same.parts.length}`
    } else {
      rows.push({ key: `${u.date}-${u.kind}-${u.label}`, date: u.date, label: u.label, amount: u.amount, setAside: u.account !== 'everyday', parts: [u] })
    }
  }
  return rows
}

function Calendar({ s }: { s: Snapshot }) {
  const [open, setOpen] = useState<string | null>(null)
  const balanceOn = (day: string) => [...s.forecast.points].reverse().find((p) => p.date <= day)?.balance
  const lowestIn = (from: string, to: string) =>
    s.forecast.points.filter((p) => p.date >= from && p.date <= to).reduce<Snapshot['forecast']['low'] | undefined>(
      (low, p) => (!low || p.balance < low.balance ? p : low), undefined)
  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const from = addDays(s.today, 1 + 7 * i), to = addDays(s.today, 7 + 7 * i)
    const rows = scheduleRows(s, from, to)
    const everyday = rows.filter((r) => !r.setAside)
    return {
      from, to, rows,
      payday: rows.some((r) => r.parts[0].kind === 'pay'),
      in: everyday.filter((r) => r.amount > 0).reduce((t, r) => t + r.amount, 0),
      out: everyday.filter((r) => r.amount < 0).reduce((t, r) => t + r.amount, 0),
      balance: balanceOn(to),
      low: lowestIn(from, to),
    }
  })

  return (
    <Card>
      <h3>Next 5 weeks</h3>
      <p className="small">Money in and out of Everyday. Grey bills come from your Bills set-aside, not Everyday.</p>
      {weeks.map((w) => (
        <div key={w.from} style={{ marginTop: 12 }}>
          <div className="spread" style={{ borderBottom: '1px solid var(--line)', paddingBottom: 4 }}>
            <span style={{ whiteSpace: 'nowrap' }}>
              <b>{shortDate(w.from)} – {shortDate(w.to)}</b>
              {w.payday && <Chip tone="good">Payday</Chip>}
            </span>
            <span className="small" style={{ whiteSpace: 'nowrap' }}>
              {w.in > 0 && <span style={{ color: 'var(--good)' }}>+{money(w.in)} · </span>}{money(w.out)}
            </span>
          </div>
          {w.rows.map((r) => (
            <div key={r.key}>
              <div className="row" style={{ opacity: r.setAside ? 0.55 : 1, cursor: r.parts.length > 1 ? 'pointer' : undefined }}
                onClick={() => r.parts.length > 1 && setOpen(open === r.key ? null : r.key)}>
                <span>
                  <b>{shortDate(r.date)}</b> · {r.label}
                  {r.parts.length > 1 && <span className="muted"> {open === r.key ? '▾' : '›'}</span>}
                  {r.setAside && <span className="muted"> · from set-aside</span>}
                </span>
                <span style={{ whiteSpace: 'nowrap', color: r.amount > 0 ? 'var(--good)' : undefined, fontWeight: r.amount > 0 ? 700 : undefined }}>
                  {r.amount > 0 ? '+' : ''}{money(r.amount, true)}
                </span>
              </div>
              {open === r.key && r.parts.map((p) => (
                <div key={p.label} className="row small" style={{ paddingLeft: 14 }}>
                  <span className="muted">{p.label}</span><span style={{ whiteSpace: 'nowrap' }}>{money(p.amount, true)}</span>
                </div>
              ))}
            </div>
          ))}
          {w.rows.length === 0 && <div className="row small"><span className="muted">Nothing scheduled</span></div>}
          {w.low && w.low.balance < 0 ? (
            <div className="row small">
              <span style={{ color: 'var(--bad)' }}>Everyday dips below $0 around {shortDate(w.low.date)}</span>
              <b style={{ whiteSpace: 'nowrap', color: 'var(--bad)' }}>about {money(w.low.balance)}</b>
            </div>
          ) : w.balance !== undefined && (
            <div className="row small">
              <span className="muted">Everyday by {shortDate(w.to)}, after usual spending</span>
              <b style={{ whiteSpace: 'nowrap' }}>about {money(w.balance)}</b>
            </div>
          )}
        </div>
      ))}
    </Card>
  )
}

function FoundSheet({ r, onClose }: { r: Recurring; onClose: () => void }) {
  const { act, busy } = useApp()
  const s = useSnap()
  return (
    <>
      <WindyPill label="found this" />
      <h2 style={{ fontSize: 20 }}>Is {r.merchant} a regular payment?</h2>
      <div className="row"><span>{r.merchant}</span><b>{money(r.latest, true)} / {r.cadence === 'monthly' ? 'month' : r.cadence}</b></div>
      <div className="hstack">
        {r.seen.map((d) => <Chip key={d} tone="good">✓ {shortDate(d)}</Chip>)}
        <Chip>Next: {shortDate(r.next_expected)}</Chip>
      </div>
      <h3 style={{ marginTop: 14 }}>Why we think so</h3>
      <p className="small">Same merchant, same amount, about every {r.cadence === 'monthly' ? '30 days' : r.cadence} since {shortDate(r.seen[0])}.</p>
      <h3>If you add it</h3>
      <p className="small">+{money(r.per_fortnight, true)} per fortnight in your regular payments. It’s already in your forecast, so Safe to spend stays {money(s.everyday.safe)}.</p>
      <button className="btn primary block" disabled={busy} onClick={async () => { if (await act('recurring_confirm', { merchant: r.merchant }, `${r.merchant} added to regular payments`)) onClose() }}>Yes, add to regular payments</button>
      <button className="btn ghost block" disabled={busy} onClick={async () => { if (await act('recurring_dismiss', { merchant: r.merchant }, `Got it. ${r.merchant} won’t be counted.`)) onClose() }}>Not a regular payment</button>
    </>
  )
}

function InsuranceSheet({ onClose }: { onClose: () => void }) {
  const s = useSnap()
  const nav = useNavigate()
  const { propose, busy } = useApp()
  const ins = s.commitments.yearly.insurance!
  const bars: [string, number][] = [...(ins.prev_year ? [['2024', ins.prev_year] as [string, number]] : []), ['2025', ins.was], ['2026', ins.now]]
  return (
    <>
      <WindyPill label="found this" />
      <h2 style={{ fontSize: 20 }}>Your car insurance went up {ins.pct}%</h2>
      <div className="row"><span>Renews {shortDate(ins.due)}</span><span><b>{money(ins.now)}</b> <span className="muted">was {money(ins.was)}</span></span></div>
      <div className="bars" style={{ height: 80 }}>
        {bars.map(([y, v], i) => <div key={y}><div className={`bar ${i === bars.length - 1 ? 'now' : ''}`} style={{ height: `${(v / ins.now) * 60}px` }} />{y} · ${v}</div>)}
      </div>
      <h3>What changed</h3>
      <p className="small">Same insurer, same policy. The renewal is {money(ins.rise)} more than last year. Windy flags the change only and does not recommend a provider.</p>
      <h3>If you keep it</h3>
      <p className="small">
        {s.commitments.yearly.short_by > 0 ? <>Your Bills set-aside is {money(s.commitments.yearly.short_by, true)} short on {shortDate(ins.due)}. </> : null}
        Windy can raise the Bills set-aside auto-save just enough to cover it. Your Everyday forecast changes slightly; the review shows by how much.
      </p>
      <button className="btn primary block" disabled={busy} onClick={async () => { const p = await propose('insurance_topup'); if (p) { onClose(); nav(`/review/${p.id}`) } }}>Keep it, update my plan</button>
      <button className="btn ghost block" onClick={onClose}>Not now</button>
    </>
  )
}
