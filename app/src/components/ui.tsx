// Small components reused across the wireframes. Styling lives in styles.css.
import type { ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import miaPhoto from '../assets/mia.jpg'

export function Logo({ color = '#fff', size = 22 }: { color?: string; size?: number }) {
  // Brand logo: the crown from the wireframes (same mark as the Home tab).
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 25 18" fill={color} aria-hidden>
      <path d="M22.4673 12.6783C22.0428 13.6924 21.5066 14.8795 21.1237 15.891C19.119 16.2432 17.1111 16.6703 15.1072 17.0347C14.3142 17.179 13.4552 17.3689 12.6638 17.49L15.9993 11.8707L17.2557 9.77766C17.4347 9.48259 17.686 9.03714 17.8748 8.76714L23.9032 6.9153L24.4212 6.76469C24.6126 6.70246 24.8056 6.64499 25 6.5923L22.4673 12.6783Z" />
      <path d="M0 6.5934C0.773632 6.79164 1.71742 7.10586 2.49256 7.34265L7.11733 8.76614C8.34203 10.7606 9.54759 12.7668 10.7339 14.7844L11.7255 16.4416C11.9038 16.7395 12.1797 17.1802 12.3193 17.4851C9.51557 17.0012 6.68473 16.4059 3.88115 15.8931C3.76406 15.5664 3.56985 15.1377 3.43311 14.8148L2.60031 12.845L0 6.5934Z" />
      <path d="M12.5027 0C13.084 0.972466 13.6925 2.15123 14.2501 3.15419L17.2234 8.55281L12.5057 16.9787C10.8982 14.2127 9.36613 11.3375 7.77292 8.54932C8.39787 7.43412 9.0154 6.31477 9.62548 5.19136C9.8775 4.73138 10.2469 4.00702 10.5134 3.58061C10.6109 3.40123 10.7489 3.13182 10.8619 2.97237C10.8822 2.92351 10.9046 2.87682 10.9284 2.83088C10.9403 2.8079 10.9525 2.78511 10.965 2.76232C10.9775 2.73953 10.9903 2.71673 11.0032 2.69376C11.4439 1.91063 11.8718 1.1184 12.3129 0.335103C12.3759 0.223206 12.4391 0.11148 12.5027 0Z" />
    </svg>
  )
}

// Windy mark (AI assistant only): one petal turned four ways around its tip, a four-point star.
const PETAL = 'M12.5027 0C13.084 0.972466 13.6925 2.15123 14.2501 3.15419L17.2234 8.55281L12.5057 16.9787C10.8982 14.2127 9.36613 11.3375 7.77292 8.54932C8.39787 7.43412 9.0154 6.31477 9.62548 5.19136C9.8775 4.73138 10.2469 4.00702 10.5134 3.58061C10.6109 3.40123 10.7489 3.13182 10.8619 2.97237C10.8822 2.92351 10.9046 2.87682 10.9284 2.83088C10.9403 2.8079 10.9525 2.78511 10.965 2.76232C10.9775 2.73953 10.9903 2.71673 11.0032 2.69376C11.4439 1.91063 11.8718 1.1184 12.3129 0.335103C12.3759 0.223206 12.4391 0.11148 12.5027 0Z'

export function WindyLogo({ color = 'var(--brand)', size = 22 }: { color?: string; size?: number | string }) {
  return (
    <svg width={size} height={size} viewBox="-17.5 -17.5 35 35" fill={color} aria-hidden>
      {[0, 90, 180, 270].map((deg) => (
        <path key={deg} d={PETAL} transform={`rotate(${deg}) translate(-12.5057 -16.9787)`} />
      ))}
    </svg>
  )
}

// The Windy mark inline with text (replaces the old sparkle glyph): brand red, sized to the text.
export function Mark() {
  return <span className="windy-mark"><WindyLogo size="1em" /></span>
}

// Send arrow for the chat composer (the paper plane from the wireframes), nudged right so it looks centred.
export function SendIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ marginLeft: 2 }}><path d="M3 4l18 8-18 8 4-8z" /></svg>
}

// Profile picture of the demo user (Mia).
export function UserAvatar({ size = 28 }: { size?: number }) {
  return <img className="avatar" src={miaPhoto} width={size} height={size} alt="Mia" />
}

// Small line icon for a spending category (Insights). Unknown categories get a plain dot.
const CATEGORY_PATHS: Record<string, ReactNode> = {
  'Eating out': <path d="M7 3v7a2 2 0 0 0 2 2v9M5 3v5M9 3v5M17 3c-2 2-3 4.5-3 8h3v10" />,
  Shopping: <path d="M6 8h12l1 12H5L6 8zM9 8V6.5a3 3 0 0 1 6 0V8" />,
  Groceries: <><path d="M3 4h2.2l2.3 10.5h10L20 7H6.4" /><circle cx="9" cy="18.5" r="1.3" /><circle cx="16.5" cy="18.5" r="1.3" /></>,
  Subscriptions: <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7M20 4v4.7h-4.7M20 12a8 8 0 0 1-13.7 5.6L4 15.3M4 20v-4.7h4.7" />,
  Transport: <><path d="M5.5 5h13A1.5 1.5 0 0 1 20 6.5V16H4V6.5A1.5 1.5 0 0 1 5.5 5zM4 11h16M7.5 16v2.5M16.5 16v2.5" /><circle cx="8" cy="13.5" r="0.6" /><circle cx="16" cy="13.5" r="0.6" /></>,
  'Bills and utilities': <path d="M13 3L5.5 13.5H11l-1 7.5 7.5-10.5H12L13 3z" />,
  // Tool icons for the Insights hub
  'Cash flow': <path d="M3 17l5-5 4 3 8-8M15 7h5v5" />,
  Goals: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.8" /></>,
  'Life events': <path d="M4 11l8-7 8 7M6 10v9h12v-9M10 19v-5h4v5" />,
  Receipts: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6" />,
  'Pay later': <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>,
  History: <path d="M4 12a8 8 0 1 0 2.5-5.8L4 8.5M4 4v4.5h4.5M12 8v4l3 2" />,
  Dream: <path d="M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3z" />,
  'What if': <><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.6a2.5 2.5 0 1 1 3.6 2.2c-.8.5-1.2 1-1.2 1.9M12 16.8h.01" /></>,
  'Time machine': <path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" />,
  Battle: <path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6" />,
}

export function CategoryIcon({ name }: { name: string }) {
  return (
    <span className="cat-icon" aria-hidden>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {CATEGORY_PATHS[name] ?? <circle cx="12" cy="12" r="3" />}
      </svg>
    </span>
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
      <span className="pill"><Mark /> Windy · {label}</span>
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
// back={false} on the bottom-nav tab pages (Accounts, Payments, Insights, More): nothing to go back to
export function TopBar({ title, right, fallback, back: showBack = true }: { title: string; right?: ReactNode; fallback?: string; back?: boolean }) {
  const nav = useNavigate()
  const { pathname } = useLocation()
  const back = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) nav(-1)
    else nav(fallback ?? parentOf(pathname), { replace: true })
  }
  return (
    <div className="top-bar">
      {showBack && <button className="back" onClick={back} aria-label="Back">‹</button>}
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
        width: 44, height: 26, flexShrink: 0, borderRadius: 99, border: 'none', padding: 3,
        background: on ? 'var(--good)' : '#a9a1b5', display: 'flex',
        justifyContent: on ? 'flex-end' : 'flex-start', transition: 'all .15s',
      }}
    >
      <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', display: 'block', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
    </button>
  )
}

// Bottom bar icons, exported from the Figma wireframe (Navigation frame). They take the link colour.
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
const NAV_ICONS = {
  home: <Logo color="currentColor" size={25} />,
  accounts: (
    <svg width="22" height="22" viewBox="0 0 22 22" {...stroke} aria-hidden>
      <path d="M11 7.33325C15.0501 7.33325 18.3333 6.10204 18.3333 4.58325C18.3333 3.06447 15.0501 1.83325 11 1.83325C6.9499 1.83325 3.66666 3.06447 3.66666 4.58325C3.66666 6.10204 6.9499 7.33325 11 7.33325Z" />
      <path d="M3.66666 4.58325V9.16659M3.66666 9.16659C3.66666 12.8333 18.3333 12.8333 18.3333 9.16659M3.66666 9.16659V13.7499M18.3333 9.16659V4.58325M18.3333 9.16659V13.7499M3.66666 13.7499C3.66666 17.4166 18.3333 17.4166 18.3333 13.7499M3.66666 13.7499V17.4166C3.66666 21.0833 18.3333 21.0833 18.3333 17.4166V13.7499" />
    </svg>
  ),
  payments: (
    <svg width="22" height="22" viewBox="0 0 22 22" {...stroke} aria-hidden>
      <path d="M11 20.1666C16.0626 20.1666 20.1667 16.0625 20.1667 10.9999C20.1667 5.93731 16.0626 1.83325 11 1.83325C5.93738 1.83325 1.83333 5.93731 1.83333 10.9999C1.83333 16.0625 5.93738 20.1666 11 20.1666Z" />
      <path d="M14.2083 6.87492C13.2917 5.04159 8.70832 5.49992 8.70832 7.79159C8.70832 10.0833 13.2917 9.62492 13.2917 12.3749C13.2917 15.1249 9.16666 15.1249 7.79166 13.2916M11 4.58325V17.4166" />
    </svg>
  ),
  insights: (
    <svg width="22" height="22" viewBox="0 0 22 22" {...stroke} aria-hidden>
      <path d="M8.24999 17.4166H13.75M9.16666 20.1666H12.8333M7.33333 14.6666C7.33333 11.9166 4.58333 11.9166 4.58333 8.24992C4.58333 6.54811 5.25937 4.91601 6.46273 3.71265C7.66608 2.50929 9.29819 1.83325 11 1.83325C12.7018 1.83325 14.3339 2.50929 15.5373 3.71265C16.7406 4.91601 17.4167 6.54811 17.4167 8.24992C17.4167 11.9166 14.6667 11.9166 14.6667 14.6666H7.33333Z" />
    </svg>
  ),
  more: (
    <svg width="22" height="22" viewBox="0 0 22 22" {...stroke} aria-hidden>
      <rect x="2.75" y="2.75" width="6.42" height="6.42" rx="0.92" />
      <rect x="12.83" y="2.75" width="6.42" height="6.42" rx="0.92" />
      <rect x="2.75" y="12.83" width="6.42" height="6.42" rx="0.92" />
      <rect x="12.83" y="12.83" width="6.42" height="6.42" rx="0.92" />
    </svg>
  ),
}

export function BottomNav() {
  const items = [
    { to: '/', label: 'Home', ico: NAV_ICONS.home },
    { to: '/accounts', label: 'Accounts', ico: NAV_ICONS.accounts },
    { to: '/payments', label: 'Payments', ico: NAV_ICONS.payments },
    { to: '/insights', label: 'Insights', ico: NAV_ICONS.insights },
    { to: '/more', label: 'More', ico: NAV_ICONS.more },
  ]
  return (
    <nav className="bottom-nav">
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} end={i.to === '/'}>
          <span className="ico" style={{ height: 22, display: 'grid', placeItems: 'center' }}>{i.ico}</span>
          {i.label}
        </NavLink>
      ))}
    </nav>
  )
}
