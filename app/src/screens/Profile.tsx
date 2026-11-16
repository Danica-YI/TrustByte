// Profile: opened from the picture on Home. The demo user, and shortcuts to her own settings.
import { Link } from 'react-router-dom'
import { Card, Lock, Mark, TopBar, UserAvatar } from '../components/ui'
import { money } from '../format'
import { useSnap } from '../store'

export default function Profile() {
  const s = useSnap()
  const saved = s.goals.reduce((t, g) => t + g.saved, 0)
  return (
    <>
      <TopBar title="Profile" fallback="/" />
      <Card>
        <div className="stack" style={{ alignItems: 'center', gap: 6, padding: '6px 0' }}>
          <UserAvatar size={88} />
          <h2 style={{ margin: 0 }}>{s.user.first_name}</h2>
          <div style={{ textAlign: 'center' }}>24 · Software developer at Harbour Health</div>
          <div className="small" style={{ textAlign: 'center' }}>First full-time job · freelance web work on the side</div>
          <div className="small">Demo customer · synthetic data</div>
        </div>
        <div className="row"><span>Goals</span><b>{s.goals.length}</b></div>
        <div className="row"><span>Saved across goals</span><b>{money(saved)}</b></div>
        <div className="row"><span>Plan changes saved</span><b>{s.history.filter((h) => h.changes.length).length}</b></div>
      </Card>
      <Card>
        <Link to="/goals" className="row"><span>Your goals</span><span>›</span></Link>
        <Link to="/plan" className="row"><span>Your plan and history</span><span>›</span></Link>
        <Link to="/consent" className="row"><span>Your data and consent</span><span>›</span></Link>
        <Link to="/chat" className="row"><span><Mark /> Ask Windy</span><span>›</span></Link>
      </Card>
      <Lock>Windy only uses the data you switched on in Your data and consent.</Lock>
    </>
  )
}
