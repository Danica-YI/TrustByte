// R-02 / R-03 · Regular payments (Idea 9+15 · Commitments Watch).
// Payments are detected from history by the engine. "Add it" / "Not a bill" are saved to Mia's plan;
// covering the insurance rise goes through the full review and approve flow.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, Chip, Seg, TopBar, WindyPill } from '../components/ui'
import type { Recurring, Snapshot, Upcoming } from '../api'
import { daysBetween, money, shortDate } from '../format'
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
          <PaydayTimeline s={s} />
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

// ---------------------------------------------------------------- Timeline to payday
// Coming up on Everyday as a picture: today on the left, payday on the right, one dot per day with
// payments (bigger dot = more money). Tap a dot to see what goes out that day. These are the payments
// held back from Safe to spend, so the total below adds up to it.
function PaydayTimeline({ s }: { s: Snapshot }) {
  const e = s.everyday
  const days: { date: string; items: Upcoming[]; total: number }[] = []
  for (const u of s.safe_items) {
    const d = days.find((x) => x.date === u.date)
    if (d) { d.items.push(u); d.total += -u.amount } else days.push({ date: u.date, items: [u], total: -u.amount })
  }
  const [pick, setPick] = useState(0)
  const span = Math.max(1, daysBetween(s.today, e.next_payday))
  const W = 320, L = 14, R = 306, Y = 34
  const x = (d: string) => L + ((R - L) * daysBetween(s.today, d)) / span
  const biggest = Math.max(1, ...days.map((d) => d.total))
  const r = (t: number) => 4 + 7 * Math.sqrt(t / biggest)
  const sel = days[Math.min(pick, days.length - 1)]

  return (
    <Card>
      <div className="spread"><h3>Coming up on Everyday</h3><Link to="/forecast" className="link">Forecast ›</Link></div>
      <svg viewBox={`0 0 ${W} 74`} width="100%" style={{ marginTop: 8, overflow: 'visible' }} role="img"
        aria-label={`${s.safe_items.length} payments before payday on ${shortDate(e.next_payday)}`}>
        <line x1={L} x2={R} y1={Y} y2={Y} stroke="var(--line)" strokeWidth={3} strokeLinecap="round" />
        <circle cx={L} cy={Y} r={4} fill="var(--ink)" />
        <circle cx={R} cy={Y} r={6} fill="var(--good)" />
        <text x={L - 4} y={Y - 18} fontSize="10" fill="var(--ink-3)">Today {shortDate(s.today)}</text>
        <text x={R + 4} y={Y - 18} fontSize="10" fill="var(--good)" textAnchor="end" fontWeight="700">Payday {shortDate(e.next_payday)}</text>
        {days.map((d, i) => (
          <g key={d.date} onClick={() => setPick(i)} style={{ cursor: 'pointer' }}>
            <circle cx={x(d.date)} cy={Y} r={r(d.total)} fill={d === sel ? 'var(--brand)' : '#e8a3ad'} stroke="#fff" strokeWidth={2} />
            <text x={x(d.date)} y={Y + 26} fontSize="10" fill={d === sel ? 'var(--ink)' : 'var(--ink-3)'} textAnchor="middle"
              fontWeight={d === sel ? 700 : 400}>{shortDate(d.date).split(' ')[0]}</text>
          </g>
        ))}
      </svg>

      {sel ? (
        <div style={{ background: '#f6f3f9', borderRadius: 12, padding: '8px 12px', marginTop: 4 }}>
          <div className="muted" style={{ fontWeight: 600 }}>{shortDate(sel.date)} · in {daysBetween(s.today, sel.date)} day{daysBetween(s.today, sel.date) === 1 ? '' : 's'}</div>
          {sel.items.map((u, i) => (
            <div key={i} className="row" style={{ padding: '3px 0' }}><span>{u.label}</span><b style={{ whiteSpace: 'nowrap' }}>{money(u.amount, true)}</b></div>
          ))}
        </div>
      ) : <p className="muted">Nothing else comes out before payday.</p>}

      <div className="row" style={{ marginTop: 8 }}>
        <span>{s.safe_items.length} payment{s.safe_items.length === 1 ? '' : 's'} before payday</span>
        <b style={{ whiteSpace: 'nowrap' }}>{money(-e.committed, true)}</b>
      </div>
      <div className="small">Tap a dot to see what goes out. Safe to spend until payday: {money(e.safe)}.</div>
    </Card>
  )
}

// ---------------------------------------------------------------- Calendar: the next 5 weeks as a grid
// Each day shows what leaves Everyday (darker red = more) or comes in (green = payday). Tap a day to see
// exactly what's paid: same-day Afterpay instalments and auto-saves are grouped, bills paid from the Bills
// set-aside are greyed out and not counted, and the forecast's Everyday balance for that day is shown.
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
  const first = addDays(s.today, 1), last = addDays(s.today, 7 * WEEKS)
  // The grid starts on the Monday on or before tomorrow, and runs whole weeks to the end of the 5 weeks
  const dow = (iso: string) => (new Date(iso + 'T00:00:00Z').getUTCDay() + 6) % 7 // Mon = 0
  const start = addDays(first, -dow(first))
  const cells = Array.from({ length: Math.ceil((dow(first) + 7 * WEEKS) / 7) * 7 }, (_, i) => addDays(start, i))
  const rowsOn = (day: string) => scheduleRows(s, day, day)
  const net = (day: string) => rowsOn(day).filter((r) => !r.setAside).reduce((t, r) => t + r.amount, 0)
  const biggest = Math.max(1, ...cells.map((d) => -Math.min(0, net(d))))
  const [pick, setPick] = useState(() => cells.find((d) => d >= first && rowsOn(d).length > 0) ?? first)
  const compact = (n: number) => { const a = Math.abs(n); return `${n < 0 ? '−' : '+'}${a >= 1000 ? `${(a / 1000).toFixed(1)}k` : Math.round(a)}` }
  const balanceOn = (day: string) => [...s.forecast.points].reverse().find((p) => p.date <= day)?.balance
  const picked = rowsOn(pick)
  const pickedNet = net(pick)
  const after = balanceOn(pick)

  return (
    <Card>
      <div className="spread" style={{ background: 'var(--bad-soft)', borderRadius: 10, padding: '8px 12px' }}>
        <h3 style={{ margin: 0 }}>Next 5 weeks</h3><span style={{ fontWeight: 600, fontSize: 13 }}>{shortDate(first)} – {shortDate(last)}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginTop: 10 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} className="small center" style={{ fontWeight: 700 }}>{d}</div>)}
        {cells.map((d) => {
          const inRange = d >= first && d <= last
          const n = inRange ? net(d) : 0
          const has = inRange && rowsOn(d).length > 0
          const pay = n > 0
          const shade = n < 0 ? 0.12 + 0.55 * (-n / biggest) : 0
          const selected = d === pick
          return (
            <button key={d} disabled={!inRange} onClick={() => setPick(d)} aria-label={`${shortDate(d)}${has ? `: ${money(n, true)}` : ''}`}
              style={{ height: 52, borderRadius: 10, padding: '4px 2px', font: 'inherit', cursor: inRange ? 'pointer' : 'default',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
                border: selected ? '2px solid var(--ink)' : '1px solid var(--line)', opacity: inRange ? 1 : 0.35,
                background: pay ? 'var(--good-soft, #dcfce7)' : n < 0 ? `rgba(200, 16, 46, ${shade})` : '#fff',
                color: shade > 0.45 ? '#fff' : 'var(--ink)' }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{Number(d.slice(8))}{d.slice(8) === '01' && <span style={{ fontWeight: 400 }}> {shortDate(d).split(' ')[1]}</span>}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: pay ? 'var(--good)' : undefined }}>
                {has && n !== 0 ? compact(n) : has ? '•' : ''}
              </span>
            </button>
          )
        })}
      </div>
      <div className="small" style={{ marginTop: 8 }}>Darker red = more going out. Green = payday. Tap a day.</div>

      <div style={{ background: '#f6f3f9', borderRadius: 12, padding: '10px 12px', marginTop: 10 }}>
        <div className="spread"><b>{shortDate(pick)}</b><span className="muted">in {daysBetween(s.today, pick)} day{daysBetween(s.today, pick) === 1 ? '' : 's'}</span></div>
        {picked.length === 0 && <div className="muted" style={{ marginTop: 4 }}>Nothing scheduled this day.</div>}
        {picked.map((r) => (
          <div key={r.key}>
            <div className="row" style={{ opacity: r.setAside ? 0.55 : 1 }}>
              <span>{r.label}{r.setAside && <span className="muted"> · from set-aside</span>}</span>
              <b style={{ whiteSpace: 'nowrap', color: r.amount > 0 ? 'var(--good)' : undefined }}>{r.amount > 0 ? '+' : ''}{money(r.amount, true)}</b>
            </div>
            {r.parts.length > 1 && r.parts.map((p) => (
              <div key={p.label} className="row small" style={{ paddingLeft: 12 }}><span className="muted">{p.label}</span><span style={{ whiteSpace: 'nowrap' }}>{money(p.amount, true)}</span></div>
            ))}
          </div>
        ))}
        {picked.length > 0 && (
          <>
            <hr className="sep" />
            <div className="row"><span>{pickedNet >= 0 ? 'In to Everyday' : 'Out of Everyday'} this day</span><b style={{ whiteSpace: 'nowrap', color: pickedNet > 0 ? 'var(--good)' : undefined }}>{pickedNet > 0 ? '+' : ''}{money(pickedNet, true)}</b></div>
            {after !== undefined && (
              <div className="row small"><span className="muted">Everyday by the end of the day, after usual spending</span>
                <b style={{ whiteSpace: 'nowrap', color: after < 0 ? 'var(--bad)' : undefined }}>about {money(after)}</b></div>
            )}
          </>
        )}
      </div>
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
