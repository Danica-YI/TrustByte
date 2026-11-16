// R-02 / R-03 · Regular payments. The bottom sheet is driven by ?found=spotify | insurance
import { useSearchParams } from 'react-router-dom'
import { Card, Chip, Seg, TopBar, WindyPill } from '../components/ui'
import { money, regularPayments as rp } from '../data/mia'
import { useState } from 'react'

export default function Payments() {
  const [params, setParams] = useSearchParams()
  const found = params.get('found')
  const [view, setView] = useState<'List' | 'Calendar'>('List')
  const close = () => setParams({})

  return (
    <>
      <TopBar title="Regular payments" right={<span className="link">+ Add</span>} />
      <Seg options={['List', 'Calendar']} value={view} onChange={setView} />

      <Card>
        <div className="muted" style={{ marginTop: 4 }}>This cycle · 27 Nov – 10 Dec</div>
        <div style={{ fontSize: 28, fontWeight: 800 }}>{money(rp.perFortnight)} <span className="muted">across {rp.count} payments</span></div>
        <div className="hstack small"><span>● Paid {money(rp.paid)}</span><span>○ Coming up {money(rp.comingUp)}</span></div>
        <p className="small" style={{ marginTop: 6 }}>Already set aside, so your Safe to spend ($180) won’t be touched by these.</p>
      </Card>

      <Card variant="windy">
        <WindyPill label={`found ${rp.found.length}`} />
        <div className="muted" style={{ margin: '6px 0' }}>Not counted yet</div>
        {rp.found.map((f) => (
          <div key={f.id} className="row">
            <div className="hstack" style={{ flexWrap: 'nowrap' }}>
              <div className="avatar">{f.icon}</div>
              <div><div>{f.name}</div><div className="muted">{f.meta}</div></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <b>{money(f.amount, true)}</b>
              <div><button className="link" onClick={() => setParams({ found: f.id })}>Add it</button></div>
            </div>
          </div>
        ))}
        <hr className="sep" />
        <div className="small">↑ Netflix went up $2 a month. Now $18.99. Your budget has been updated.</div>
        <div className="small" style={{ marginTop: 4 }}>! Car rego is due 3 Dec ($412). Covered by your yearly set-aside.</div>
        <button className="link" style={{ marginTop: 6 }} onClick={() => setParams({ found: 'insurance' })}>Car insurance went up 12% ›</button>
      </Card>

      {rp.groups.map((g) => (
        <Card key={g.name}>
          <div className="spread"><h3>{g.name}</h3><b>{money(g.total)}</b></div>
          {g.items.map((i) => (
            <div key={i.name} className="row">
              <div className="hstack" style={{ flexWrap: 'nowrap' }}>
                <div className="avatar">{i.icon}</div>
                <div><div>{i.name}</div><div className="muted">{i.meta}</div></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <b>{money(i.amount)}</b>
                <div><Chip tone={i.tag === 'Estimate' || i.tag.startsWith('Price') ? 'warn' : 'plain'}>{i.tag}</Chip></div>
              </div>
            </div>
          ))}
        </Card>
      ))}
      <p className="small center">Amounts shown per fortnight. Tap any payment to edit, pause, or cancel through Westpac.</p>

      {found && (
        <div className="sheet-backdrop" onClick={close}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            {found === 'insurance' ? <InsuranceSheet onClose={close} /> : <SpotifySheet onClose={close} />}
          </div>
        </div>
      )}
    </>
  )
}

function SpotifySheet({ onClose }: { onClose: () => void }) {
  return (
    <>
      <WindyPill label="found this" />
      <h2 style={{ fontSize: 20 }}>Is Spotify a regular payment?</h2>
      <div className="row"><span>Spotify Premium · card ending 7089</span><b>$13.99 / mo</b></div>
      <div className="hstack"><Chip tone="good">✓ 2 Sep</Chip><Chip tone="good">✓ 2 Oct</Chip><Chip tone="good">✓ 2 Nov</Chip><Chip>Next: 2 Dec</Chip></div>
      <h3 style={{ marginTop: 14 }}>Why we think so</h3>
      <p className="small">Same merchant, same amount, about every 30 days for 3 months.</p>
      <h3>If you add it</h3>
      <p className="small">+$6.46 per fortnight in bills. Your Safe to spend becomes $174 until payday.</p>
      <div className="row"><span>Category</span><span className="link">Subscriptions ›</span></div>
      <button className="btn primary block" onClick={onClose}>Yes, add to regular payments</button>
      <button className="btn ghost block" onClick={onClose}>Not a bill</button>
      <button className="btn ghost block small" onClick={onClose}>Don’t suggest Spotify again</button>
    </>
  )
}

function InsuranceSheet({ onClose }: { onClose: () => void }) {
  return (
    <>
      <WindyPill label="found this" />
      <h2 style={{ fontSize: 20 }}>Your car insurance went up 12%</h2>
      <div className="row"><span>Car insurance · Yearly · renews 5 Dec</span><span><b>$806</b> <span className="muted">was $720</span></span></div>
      <div className="bars" style={{ height: 80 }}>
        {[['2024', 650], ['2025', 720], ['2026', 806]].map(([y, v], i) => (
          <div key={y}><div className={`bar ${i === 2 ? 'now' : ''}`} style={{ height: `${(Number(v) / 806) * 60}px` }} />{y} · ${v}</div>
        ))}
      </div>
      <h3>What changed</h3>
      <p className="small">Same insurer, same policy. The renewal is $86 more than last year. Windy flags the change only and does not recommend a provider.</p>
      <h3>If you keep it</h3>
      <p className="small">+$3.31 per fortnight set aside. Your Safe to spend becomes $177 until payday.</p>
      <button className="btn primary block" onClick={onClose}>Review my options</button>
      <button className="btn ghost block" onClick={onClose}>Keep it, update my plan</button>
      <button className="btn ghost block small" onClick={onClose}>Don’t flag insurance changes</button>
    </>
  )
}
