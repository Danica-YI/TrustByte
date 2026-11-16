// FF-01 · Ask · Feature Finder (the only chat-style page)
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, TopBar, useWindy } from '../components/ui'

export default function FeatureFinder() {
  const nav = useNavigate()
  const answer = useWindy('feature-finder')
  const [q, setQ] = useState('')
  const [asked, setAsked] = useState('I want to apply for a home loan. Where do I start?')

  return (
    <>
      <TopBar title="Windy" fallback="/more" />
      <div className="bubble me">{asked}</div>
      <div className="bubble ai">
        <div className="pill" style={{ marginBottom: 6 }}>✦ Windy</div>
        <div><b>Here’s where to go, and what you’ll need.</b></div>
        <div style={{ marginTop: 4 }}>{answer}</div>
      </div>

      <Card>
        <div className="row"><span>Steps</span><b>4 <span className="muted">about 15 minutes</span></b></div>
        <div className="row"><span>Documents to upload</span><b>0 <span className="muted">already on file</span></b></div>
        <p className="small" style={{ marginTop: 6 }}>Want to check your Loan readiness first? It takes one tap.</p>
        <button className="btn primary block" onClick={() => nav('/home-loan/apply')}>Take me to home loans</button>
        <button className="btn ghost block" onClick={() => nav('/loan-readiness')}>Check Loan readiness</button>
      </Card>

      <Card>
        <h3>How I found this</h3>
        <p className="small">• Matched your question to features already in the Westpac app<br />• Steps and documents come from Westpac’s own guides<br />• I only point the way. I don’t apply for you or approve anything</p>
      </Card>
      <div style={{ height: 60 }} />

      <form className="composer" onSubmit={(e) => { e.preventDefault(); if (q.trim()) { setAsked(q); setQ('') } }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="What do you want to do?" />
        <button className="btn primary" type="submit">➤</button>
      </form>
    </>
  )
}
