// Demo shell: presenter navigator on the left, phone on the right.
// Press P to hide the navigator while recording (press again to show).
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { features } from '../features'

export function DemoShell({ children }: { children: ReactNode }) {
  const [present, setPresent] = useState(false)
  const [showOff, setShowOff] = useState(true)
  const loc = useLocation()
  const here = loc.pathname + loc.search

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'p' || e.key === 'P') setPresent((v) => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const list = features.filter((f) => showOff || f.enabled)

  return (
    <div className="stage">
      {!present && (
        <aside className="demo-nav">
          <h1>LifePilot · demo navigator</h1>
          <p className="hint">Press P to hide this panel for recording. Feature switches live in src/features.ts.</p>
          <label>
            <input type="checkbox" checked={showOff} onChange={(e) => setShowOff(e.target.checked)} />
            Show disabled features
          </label>
          <hr style={{ borderColor: '#2f2a37', margin: '12px 0' }} />
          {list.map((f) => (
            <div key={f.id} className={`feature ${f.enabled ? '' : 'off'}`}>
              <div className="feature-head">
                {f.idea && <span className="tag">Idea {f.idea}</span>}
                {f.name}
                {f.hero && <span className="tag hero">HERO</span>}
                {!f.enabled && <span className="tag">off</span>}
              </div>
              <div className="pitch">{f.pitch}</div>
              {f.screens.map((s) => (
                <Link key={s.path} to={s.path} className={`screen-link ${here === s.path ? 'active' : ''}`}>
                  {s.label}
                  <span className="figma">{s.figma}</span>
                </Link>
              ))}
            </div>
          ))}
        </aside>
      )}
      <div className="phone-area">
        <div className="phone">{children}</div>
      </div>
    </div>
  )
}
