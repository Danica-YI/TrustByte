// More tab: settings-style items only. Windy's features live where they are used
// (Home cards, Accounts, Payments), so they are not listed here.
import { Link } from 'react-router-dom'
import { Card, TopBar } from '../components/ui'

export default function More() {
  return (
    <>
      <TopBar title="More" fallback="/" />
      <Card>
        <Link to="/chat" className="row"><span>✦ Ask Windy (live AI chat)</span><span>›</span></Link>
        <Link to="/consent" className="row"><span>Your data and consent</span><span>›</span></Link>
      </Card>
    </>
  )
}
