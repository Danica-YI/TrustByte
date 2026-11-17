// More tab: settings-style items only. Windy's features live where they are used
// (Home cards, Accounts, Payments), so they are not listed here.
import { Link } from 'react-router-dom'
import { Card, Mark, TopBar } from '../components/ui'

const LINKS = [
  ['/chat', 'Ask Windy (live AI chat)'],
  ['/plan', 'Your plan and history'],
  ['/consent', 'Your data and consent'],
]

export default function More() {
  return (
    <>
      <TopBar title="More" back={false} />
      <Card>
        {LINKS.map(([to, label]) => <Link key={to} to={to} className="row"><span>{to === '/chat' && <><Mark /> </>}{label}</span><span>›</span></Link>)}
      </Card>
    </>
  )
}
