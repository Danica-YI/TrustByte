// Responsive shell.
//  - Phone (< 760px): the app full screen, nothing else.
//  - Laptop: the app in a phone frame, the demo story on the left, and "Behind the scenes" on the right,
//    which lights up the architecture (guardrails, engine, AI model, approval) for every request.
// Press P to hide both side panels (for recording a clean phone-only shot).
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { Check } from '../api'
import { useApp } from '../store'

const STORY: { path: string; label: string; idea?: string }[] = [
  { path: '/', label: 'Home · Windy noticed 4 things' },
  { path: '/life-event', label: 'Confirm the move', idea: '1' },
  { path: '/goals/options', label: 'Goal trade-off options', idea: '2' },
  { path: '/forecast', label: 'Shortfall forecast and fixes', idea: '4' },
  { path: '/goals/japan-sooner', label: 'Ask: Japan in 3 months', idea: '2' },
  { path: '/goals/share/goal-japan', label: 'Save together · joint goal' },
  { path: '/payments', label: 'Regular payments', idea: '9+15' },
  { path: '/pay-later', label: 'Pay-later plans', idea: '9+15' },
  { path: '/receipt', label: 'Receipt Lens', idea: '10' },
  { path: '/insights', label: 'Spending coach', idea: '5+6' },
  { path: '/plan', label: 'Your plan · history and undo' },
  { path: '/consent', label: 'Data and consent' },
  { path: '/chat', label: 'Ask Windy (live AI)' },
]

export function Shell({ children }: { children: ReactNode }) {
  const [present, setPresent] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'p' || e.key === 'P') setPresent((v) => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="stage">
      {!present && <StoryPanel />}
      <div className="phone-area">
        <div className="phone">{children}</div>
      </div>
      {!present && <BehindTheScenes />}
    </div>
  )
}

function StoryPanel() {
  const { reset, snap } = useApp()
  const { pathname } = useLocation()
  return (
    <aside className="side-panel left">
      <h1>harbour · Windy</h1>
      <p className="hint">TrustByte · Westpac Hackathon 2026. Demo user Mia, synthetic data. Press P to hide the panels.</p>
      <div className="side-title">Demo story</div>
      {STORY.map((s, i) => (
        <Link key={s.path} to={s.path} className={`story-link ${pathname === s.path ? 'active' : ''}`}>
          <span className="num">{i + 1}</span>
          <span style={{ flex: 1 }}>{s.label}</span>
          {s.idea && <span className="tag">Idea {s.idea}</span>}
        </Link>
      ))}
      <button className="reset" onClick={() => { if (confirm('Reset the demo to the start of the story?')) reset() }}>↺ Reset demo</button>
      {snap && <p className="hint" style={{ marginTop: 10 }}>{snap.history.length} plan changes saved · data as of {snap.today}</p>}
    </aside>
  )
}

const LAYERS: { key: Check['layer'] | 'app' | 'api' | 'state'; label: string; sub: string }[] = [
  { key: 'app', label: 'Harbour web app', sub: 'Mia interacts with Windy' },
  { key: 'input', label: 'Input guardrails', sub: 'Consent · Permissions · Validation' },
  { key: 'api', label: 'FastAPI backend', sub: 'Coordinates the services' },
  { key: 'engine', label: 'Python engine', sub: 'Forecasts and scenarios' },
  { key: 'ai', label: 'AI model', sub: 'Explains the results' },
  { key: 'output', label: 'Output guardrails', sub: 'Schema · Financial checks · Safe text' },
  { key: 'approve', label: 'Customer approves', sub: 'Only the simulated plan changes' },
]

function BehindTheScenes() {
  const { runs } = useApp()
  const latest = runs[0]
  const status = (key: string) => {
    if (!latest) return ''
    if (key === 'app' || key === 'api') return 'on'
    const cs = latest.checks.filter((c) => c.layer === key)
    if (!cs.length) return ''
    return cs.every((c) => c.ok) ? 'on' : cs.some((c) => c.layer === 'output' && c.name === 'Replaced with safe template') ? 'on' : 'bad'
  }
  return (
    <aside className="side-panel right">
      <h1>Behind the scenes</h1>
      <p className="hint">What happened on the last request, following our architecture.</p>
      <div className="arch">
        {(['app', 'input', 'api', 'pair', 'output', 'approve'] as const).map((k, i) => {
          const box = (key: string) => {
            const l = LAYERS.find((x) => x.key === key)!
            return <div key={key} className={`arch-box ${status(key)}`}><b>{l.label}</b><span>{l.sub}</span></div>
          }
          return (
            <div key={k}>
              {i > 0 && <div className="arrow">↓</div>}
              {k === 'pair' ? <div className="arch-pair">{box('ai')}{box('engine')}</div> : box(k)}
            </div>
          )
        })}
      </div>
      {latest ? (
        <div className="run">
          <div className="run-head"><b>{latest.label}</b><span>{latest.time}</span></div>
          {latest.error && <div className="run-error">{latest.error}</div>}
          {latest.checks.map((c, i) => (
            <div key={i} className={`check ${c.ok ? 'ok' : 'fail'}`}>
              <span className="mark">{c.ok ? '✓' : '✗'}</span>
              <span><b>{c.name}</b>{c.detail && <span className="detail"> · {c.detail}</span>}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="hint">Tap something in the app (confirm the move, review a plan) to see each layer run.</p>
      )}
      {runs.length > 1 && (
        <>
          <div className="side-title">Earlier</div>
          {runs.slice(1, 8).map((r) => (
            <div key={r.id} className="run-mini"><span className={r.ok ? 'okc' : 'badc'}>{r.ok ? '✓' : '✗'}</span> {r.label} <span className="t">{r.time}</span></div>
          ))}
        </>
      )}
    </aside>
  )
}
