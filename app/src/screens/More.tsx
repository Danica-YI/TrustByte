// More tab: not in the wireframes. Temporary list of every enabled feature.
import { Link } from 'react-router-dom'
import { Card, TopBar } from '../components/ui'
import { features } from '../features'

export default function More() {
  return (
    <>
      <TopBar title="More" fallback="/" />
      <Card>
        <Link to="/chat" className="row"><span>✦ Ask Windy</span><span>›</span></Link>
        <Link to="/consent" className="row"><span>Your data and consent</span><span>›</span></Link>
      </Card>
      <Card>
        <h3>Windy features</h3>
        {features.filter((f) => f.enabled).map((f) => (
          <Link key={f.id} to={f.screens[0].path} className="row"><span>{f.name}</span><span>›</span></Link>
        ))}
      </Card>
    </>
  )
}
