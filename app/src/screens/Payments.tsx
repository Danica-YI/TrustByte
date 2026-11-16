// R-02 / R-03 · Regular payments (Idea 9+15 · Commitments Watch).
// Everything listed is detected from transaction history in data/analysis.ts.
// The bottom sheet is driven by ?found=<merchant id> or ?found=insurance.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card, Chip, Seg, TopBar, WindyPill } from '../components/ui'
import { forecast, payLaterPlans, perFortnight, recurringPayments, safeToSpend, shortDate, yearlyBills, type Recurring } from '../data/analysis'
import { money } from '../data/mia'
import { upcoming } from '../data/bank'

const slug = (m: string) => m.toLowerCase().split(/[^a-z]+/)[0]

const GROUPS: { name: string; match: (r: Recurring) => boolean }[] = [
  { name: 'Home & bills', match: (r) => r.account === 'everyday' && (r.category === 'Housing' || r.category === 'Bills and utilities') },
  { name: 'Subscriptions', match: (r) => r.account === 'everyday' && r.category === 'Subscriptions' },
]

export default function Payments() {
  const [params, setParams] = useSearchParams()
  const found = params.get('found')
  const [view, setView] = useState<'List' | 'Calendar'>('List')
  const close = () => setParams({})

  const all = recurringPayments()
  const live = all.filter((r) => r.status !== 'stopped')
  const fresh = live.filter((r) => r.status === 'new')
  const rises = live.filter((r) => r.priceChange && r.priceChange > 0 && r.category === 'Subscriptions')
  const stopped = all.filter((r) => r.status === 'stopped' && r.category === 'Subscriptions')
  const yb = yearlyBills()
  const pl = payLaterPlans()
  const counted = live.filter((r) => r.status !== 'new' && r.account === 'everyday')
  // New rent has only been paid once, so it comes from the confirmed life event (LP-02), not detection
  const rent = upcoming.find((u) => u.kind === 'rent')!
  const rentPerFn = -rent.amount * 2
  const perFn = counted.reduce((s, r) => s + perFortnight(r), 0) + rentPerFn + yb.due.reduce((s, u) => s - u.amount, 0) / 26

  const sheet = found === 'insurance' ? 'insurance' : fresh.find((r) => slug(r.merchant) === found)

  return (
    <>
      <TopBar title="Regular payments" right={<span className="link">+ Add</span>} />
      <Seg options={['List', 'Calendar']} value={view} onChange={setView} />

      <Card>
        <div className="muted" style={{ marginTop: 4 }}>Per fortnight</div>
        <div style={{ fontSize: 28, fontWeight: 800 }}>{money(perFn)} <span className="muted">across {counted.length + 1} payments</span></div>
        <p className="small" style={{ marginTop: 6 }}>Already set aside, so your Safe to spend ({money(safeToSpend().safe)}) won’t be touched by these.</p>
      </Card>

      <Card variant="windy">
        <WindyPill label={`found ${fresh.length}`} />
        <div className="muted" style={{ margin: '6px 0' }}>Not counted yet</div>
        {fresh.map((f) => (
          <div key={f.merchant} className="row">
            <div className="hstack" style={{ flexWrap: 'nowrap' }}>
              <div className="avatar">{f.merchant[0]}</div>
              <div><div>{f.merchant}</div><div className="muted">{f.cadence} · seen {f.seen.map(shortDate).join(', ')}</div></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <b>{money(f.latest, true)}</b>
              <div><button className="link" onClick={() => setParams({ found: slug(f.merchant) })}>Add it</button></div>
            </div>
          </div>
        ))}
        <hr className="sep" />
        {rises.map((r) => (
          <div key={r.merchant} className="small">↑ {r.merchant} went up {money(r.priceChange!, true)}. Now {money(r.latest, true)}. Your budget has been updated.</div>
        ))}
        {stopped.map((r) => (
          <div key={r.merchant} className="small" style={{ marginTop: 4 }}>✓ {r.merchant} stopped after {shortDate(r.seen[r.seen.length - 1])}. Removed from your bills.</div>
        ))}
        <Link to="/pay-later" className="row" style={{ marginTop: 6 }}>
          <span><b>{pl.active.length} pay-later plans</b> · {money(pl.nextPaydayTotal)} next payday</span><span className="link">›</span>
        </Link>
      </Card>

      {GROUPS.map((g) => {
        const rows = live.filter((r) => r.status !== 'new' && g.match(r))
        return (
          <Card key={g.name}>
            <div className="spread"><h3>{g.name}</h3><b>{money(rows.reduce((s, r) => s + perFortnight(r), 0) + (g.name === 'Home & bills' ? rentPerFn : 0))}</b></div>
            {g.name === 'Home & bills' && (
              <div className="row">
                <div className="hstack" style={{ flexWrap: 'nowrap' }}>
                  <div className="avatar">R</div>
                  <div><div>{rent.label}</div><div className="muted">weekly · next {shortDate(rent.date)} · <Chip tone="windy">from your move</Chip></div></div>
                </div>
                <div style={{ textAlign: 'right' }}><b>{money(rentPerFn)}</b><div className="muted">{money(-rent.amount)} weekly</div></div>
              </div>
            )}
            {rows.map((r) => (
              <div key={r.merchant} className="row">
                <div className="hstack" style={{ flexWrap: 'nowrap' }}>
                  <div className="avatar">{r.merchant[0]}</div>
                  <div><div>{r.merchant}</div><div className="muted">{r.cadence} · next {shortDate(r.nextExpected)}</div></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <b>{money(perFortnight(r))}</b>
                  <div className="muted">{money(r.latest, true)} {r.cadence}</div>
                  {r.priceChange && r.priceChange > 0 && r.category === 'Subscriptions' && <Chip tone="warn">Price up {money(r.priceChange, true)}</Chip>}
                </div>
              </div>
            ))}
          </Card>
        )
      })}

      <Card>
        <div className="spread"><h3>Yearly bills · set aside</h3><b>{money(yb.balance)}</b></div>
        {yb.due.map((u) => (
          <div key={u.label} className="row">
            <div><div>{u.label}</div><div className="muted">Due {shortDate(u.date)} · {u.source}</div></div>
            <b>{money(-u.amount)}</b>
          </div>
        ))}
        {yb.shortBy > 0
          ? <p className="small" style={{ color: 'var(--bad)', marginTop: 6 }}>Your set-aside is {money(yb.shortBy, true)} short for these, because the insurance renewal went up.</p>
          : <p className="small" style={{ marginTop: 6 }}>Covered by your Bills set-aside. Nothing to do.</p>}
      </Card>
      <p className="small center">Amounts shown per fortnight. Tap any payment to edit, pause, or cancel through Westpac.</p>

      {sheet && (
        <div className="sheet-backdrop" onClick={close}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            {sheet === 'insurance' ? <InsuranceSheet onClose={close} /> : <FoundSheet r={sheet} onClose={close} />}
          </div>
        </div>
      )}
    </>
  )
}

function FoundSheet({ r, onClose }: { r: Recurring; onClose: () => void }) {
  const add = perFortnight(r)
  return (
    <>
      <WindyPill label="found this" />
      <h2 style={{ fontSize: 20 }}>Is {r.merchant} a regular payment?</h2>
      <div className="row"><span>{r.merchant} · card ending 7089</span><b>{money(r.latest, true)} / {r.cadence === 'monthly' ? 'mo' : r.cadence}</b></div>
      <div className="hstack">
        {r.seen.map((d) => <Chip key={d} tone="good">✓ {shortDate(d)}</Chip>)}
        <Chip>Next: {shortDate(r.nextExpected)}</Chip>
      </div>
      <h3 style={{ marginTop: 14 }}>Why we think so</h3>
      <p className="small">Same merchant, same amount, about every {r.cadence === 'monthly' ? '30 days' : r.cadence} since {shortDate(r.seen[0])}.</p>
      <h3>If you add it</h3>
      <p className="small">+{money(add, true)} per fortnight in bills. Your Safe to spend becomes {money(safeToSpend().safe - add)} until payday.</p>
      <button className="btn primary block" onClick={onClose}>Yes, add to regular payments</button>
      <button className="btn ghost block" onClick={onClose}>Not a bill</button>
      <button className="btn ghost block small" onClick={onClose}>Don’t suggest {r.merchant} again</button>
    </>
  )
}

function InsuranceSheet({ onClose }: { onClose: () => void }) {
  const yb = yearlyBills()
  const due = yb.due.find((u) => u.label.includes('insurance'))!
  const last = yb.history('Car insurance · AAMI').pop()!
  const prev = Number((last.note ?? '').match(/\$(\d+)/)?.[1] ?? 0)
  const now = -due.amount, was = -last.amount
  const pct = Math.round(((now - was) / was) * 100)
  const bars: [string, number][] = [...(prev ? [['2024', prev] as [string, number]] : []), ['2025', was], ['2026', now]]
  return (
    <>
      <WindyPill label="found this" />
      <h2 style={{ fontSize: 20 }}>Your car insurance went up {pct}%</h2>
      <div className="row"><span>Car insurance · renews {shortDate(due.date)}</span><span><b>{money(now)}</b> <span className="muted">was {money(was)}</span></span></div>
      <div className="bars" style={{ height: 80 }}>
        {bars.map(([y, v], i) => (
          <div key={y}><div className={`bar ${i === bars.length - 1 ? 'now' : ''}`} style={{ height: `${(v / now) * 60}px` }} />{y} · ${v}</div>
        ))}
      </div>
      <h3>What changed</h3>
      <p className="small">Same insurer, same policy. The renewal is {money(now - was)} more than last year. Windy flags the change only and does not recommend a provider.</p>
      <h3>If you keep it</h3>
      <p className="small">
        +{money((now - was) / 26, true)} per fortnight into your Bills set-aside.
        {yb.shortBy > 0 && <> Right now the set-aside is {money(yb.shortBy, true)} short on {shortDate(due.date)}.</>}
        {' '}Your Everyday low around {shortDate(forecast().low.date)} doesn’t change, because yearly bills come from the set-aside.
      </p>
      <button className="btn primary block" onClick={onClose}>Review my options</button>
      <button className="btn ghost block" onClick={onClose}>Keep it, update my plan</button>
      <button className="btn ghost block small" onClick={onClose}>Don’t flag insurance changes</button>
    </>
  )
}
