// Accounts tab: not in the wireframes. Shows the generated transaction data so the team
// (and the video) can see the raw history Windy works from.
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card, Chip, Mark, Progress, TopBar } from '../components/ui'
import { fmtDate, txFor } from '../data/bank'
import { money } from '../format'
import { useSnap } from '../store'
import { useConnectedReceipts } from '../data/settings'

export function AccountList() {
  const accounts = useSnap().accounts
  return (
    <>
      <TopBar title="Accounts" fallback="/" />
      {accounts.map((a) => (
        <Link key={a.id} to={`/accounts/${a.id}`}>
          <Card>
            <div className="spread">
              <div><h3 style={{ margin: 0 }}>{a.name}</h3><div className="muted">{a.product}</div></div>
              <b style={{ fontSize: 18 }}>{money(a.balance, true)}</b>
            </div>
            {a.goal_target && <Progress value={a.balance} max={a.goal_target} color="var(--windy)" />}
          </Card>
        </Link>
      ))}
    </>
  )
}

export function AccountDetail() {
  const { id = 'everyday' } = useParams()
  const connected = useConnectedReceipts()
  const accounts = useSnap().accounts
  const account = accounts.find((a) => a.id === id) ?? accounts[0]
  const all = useMemo(() => txFor(account.id), [account.id])
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All')
  const cats = useMemo(() => ['All', ...Array.from(new Set(all.map((t) => t.category))).sort()], [all])

  const shown = all.filter((t) =>
    (cat === 'All' || t.category === cat) &&
    (!q || (t.merchant + ' ' + t.description).toLowerCase().includes(q.toLowerCase())))

  // group by date
  const byDate: [string, typeof shown][] = []
  for (const t of shown) {
    const last = byDate[byDate.length - 1]
    if (last && last[0] === t.date) last[1].push(t)
    else byDate.push([t.date, [t]])
  }

  return (
    <>
      <TopBar title={account.name} />
      <Card>
        <div className="muted">Available balance</div>
        <div style={{ fontSize: 30, fontWeight: 800 }}>{money(account.balance, true)}</div>
        <div className="small">{all.length} transactions since 1 Jun</div>
      </Card>

      {account.goal_target && (
        <Card>
          <Link to={`/goals/${account.id}`} className="row"><span>Goal: {money(account.balance)} of {money(account.goal_target)}</span><span className="link">Edit goal ›</span></Link>
        </Card>
      )}

      <div className="hstack" style={{ marginBottom: 10 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search"
          style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 99, padding: '9px 14px', font: 'inherit' }} />
        <select value={cat} onChange={(e) => setCat(e.target.value)}
          style={{ border: '1px solid var(--line)', borderRadius: 99, padding: '9px 10px', font: 'inherit', background: '#fff' }}>
          {cats.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {byDate.slice(0, 60).map(([d, list]) => (
        <div key={d}>
          <div className="muted" style={{ margin: '10px 4px 6px', fontWeight: 600 }}>{fmtDate(d)}</div>
          <Card>
            {list.map((t) => (
              <div key={t.id} className="row" style={{ alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <div>{t.merchant}</div>
                  <div className="muted" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10.5 }}>{t.description}</div>
                  <div className="hstack" style={{ marginTop: 3, gap: 4 }}>
                    <Chip>{t.category}</Chip>
                    {t.status === 'pending' && <Chip tone="warn">Pending</Chip>}
                    {t.signal && <Chip tone="windy"><Mark /> {t.signal}</Chip>}
                    {t.receipt_id && connected && <Link to={`/receipt/${t.receipt_id}`}><Chip tone="good">Receipt</Chip></Link>}
                  </div>
                </div>
                <b style={{ color: t.amount > 0 ? 'var(--good)' : undefined, whiteSpace: 'nowrap' }}>
                  {t.amount > 0 ? '+' : ''}{money(t.amount, true)}
                </b>
              </div>
            ))}
          </Card>
        </div>
      ))}
      {byDate.length > 60 && <p className="small center">Showing the latest 60 days. Search or filter to see older ones.</p>}
    </>
  )
}
