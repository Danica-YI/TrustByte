// More tab.
import { Link } from 'react-router-dom'
import { Card, TopBar } from '../components/ui'

const LINKS = [
  ['/chat', '✦ Ask Windy'],
  ['/plan', 'Your plan and history'],
  ['/consent', 'Your data and consent'],
  ['/goals/options', 'Goal options'],
  ['/goals/japan-sooner', 'Plan a trip sooner'],
  ['/forecast', 'Cash flow forecast'],
  ['/payments', 'Regular payments'],
  ['/pay-later', 'Pay-later plans'],
  ['/receipt', 'Receipts'],
]

export default function More() {
  return (
    <>
      <TopBar title="More" fallback="/" />
      <Card>
        {LINKS.map(([to, label]) => <Link key={to} to={to} className="row"><span>{label}</span><span>›</span></Link>)}
      </Card>
    </>
  )
}
