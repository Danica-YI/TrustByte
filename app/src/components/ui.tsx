// Small components reused across the wireframes. Styling lives in styles.css.
import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { askWindy, windyFallback, type WindyTopic } from '../ai/windy'

export function Logo({ color = '#fff', size = 22 }: { color?: string; size?: number }) {
  // Placeholder logo (a flower shape in the wireframes). Replace with the final icon.
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 30 21" fill={color} aria-hidden>
      <path d="M15 0c3 4 3 10 0 15-3-5-3-11 0-15zM0 6c5 0 10 4 13 11C7 17 2 13 0 6zm30 0c-2 7-7 11-13 11 3-7 8-11 13-11z" />
      <rect x="2" y="18" width="26" height="3" rx="1.5" />
    </svg>
  )
}

export function Card({ children, variant, onClick }: { children: ReactNode; variant?: 'windy' | 'selected'; onClick?: () => void }) {
  return (
    <div className={`card ${variant ?? ''}`} onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      {children}
    </div>
  )
}

export function WindyPill({ label, time }: { label: string; time?: string }) {
  return (
    <div className="spread">
      <span className="pill">✦ Windy · {label}</span>
      {time && <span className="muted">{time}</span>}
    </div>
  )
}

export function Chip({ tone = 'plain', children }: { tone?: 'good' | 'warn' | 'bad' | 'windy' | 'plain'; children: ReactNode }) {
  return <span className={`chip ${tone}`}>{children}</span>
}

export function Progress({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="progress">
      <div style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} />
    </div>
  )
}

/** One level up from a path: /accounts/everyday → /accounts, /forecast → / */
const parentOf = (path: string) => path.replace(/\/[^/]*$/, '') || '/'

/**
 * Page header with a back button. Goes back in the app's history when there is some; when the
 * page was opened directly (demo navigator, refresh, shared link) it goes to `fallback`, or one
 * level up the URL.
 */
export function TopBar({ title, right, fallback }: { title: string; right?: ReactNode; fallback?: string }) {
  const nav = useNavigate()
  const { pathname } = useLocation()
  const back = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) nav(-1)
    else nav(fallback ?? parentOf(pathname), { replace: true })
  }
  return (
    <div className="top-bar">
      <button className="back" onClick={back} aria-label="Back">‹</button>
      <h1>{title}</h1>
      {right ?? <Logo color="var(--brand)" />}
    </div>
  )
}

export function Lock({ children }: { children: ReactNode }) {
  return <p className="lock">🔒 {children}</p>
}

export function Seg<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o} className={o === value ? 'on' : ''} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  )
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      aria-pressed={on}
      style={{
        width: 44, height: 26, borderRadius: 99, border: 'none', padding: 3,
        background: on ? 'var(--good)' : '#d6d0dd', display: 'flex',
        justifyContent: on ? 'flex-end' : 'flex-start', transition: 'all .15s',
      }}
    >
      <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', display: 'block' }} />
    </button>
  )
}

export function BottomNav() {
  const items = [
    { to: '/', label: 'Home', ico: '⌂' },
    { to: '/accounts', label: 'Accounts', ico: '▤' },
    { to: '/payments', label: 'Payments', ico: '$' },
    { to: '/insights', label: 'Insights', ico: '◔' },
    { to: '/more', label: 'More', ico: '⋯' },
  ]
  return (
    <nav className="bottom-nav">
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} end={i.to === '/'}>
          <span className="ico">{i.ico}</span>
          {i.label}
        </NavLink>
      ))}
    </nav>
  )
}

/** Windy's explanation text: shows the scripted copy first, then the model output if a backend is configured */
export function useWindy(topic: WindyTopic, context?: Record<string, unknown>) {
  const [text, setText] = useState(windyFallback[topic])
  useEffect(() => {
    let alive = true
    askWindy(topic, context).then((t) => alive && setText(t))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic])
  return text
}
