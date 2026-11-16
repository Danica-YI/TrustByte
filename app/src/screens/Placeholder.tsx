// Placeholder for pages not in the wireframes (e.g. Accounts)
import { useLocation } from 'react-router-dom'
import { Card, TopBar } from '../components/ui'

export default function Placeholder() {
  const { pathname } = useLocation()
  return (
    <>
      <TopBar title={pathname.slice(1) || 'Page'} fallback="/" />
      <Card><p>Not designed yet. This tab is outside the demo flow.</p></Card>
    </>
  )
}
