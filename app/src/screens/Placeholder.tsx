// Placeholder for pages not in the wireframes (e.g. Accounts)
import { useLocation } from 'react-router-dom'
import { Card } from '../components/ui'

export default function Placeholder() {
  const { pathname } = useLocation()
  return (
    <>
      <div className="top-bar"><h1>{pathname.slice(1) || 'Page'}</h1></div>
      <Card><p>Not designed yet. This tab is outside the demo flow.</p></Card>
    </>
  )
}
