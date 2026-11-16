// Routes. Every screen reads the live snapshot from the backend (see store.tsx), so a change approved on one
// screen shows up everywhere, and going back to Home never resets anything.
import { Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { Shell } from './components/Shell'
import { BottomNav } from './components/ui'
import { useApp } from './store'
import Home from './screens/Home'
import LifeEventConfirm from './screens/LifeEventConfirm'
import GoalOptions from './screens/GoalOptions'
import Review from './screens/Review'
import Forecast from './screens/Forecast'
import Insights from './screens/Insights'
import Consent from './screens/Consent'
import Payments from './screens/Payments'
import Receipt from './screens/Receipt'
import More from './screens/More'
import Placeholder from './screens/Placeholder'
import { AccountDetail, AccountList } from './screens/Accounts'
import Chat from './screens/Chat'
import PayLater from './screens/PayLater'
import QuickSplit from './screens/QuickSplit'
import JapanSooner from './screens/JapanSooner'
import Plan from './screens/Plan'
import ReceiptSettings from './screens/ReceiptSettings'

export default function App() {
  const loc = useLocation()
  const scroller = useRef<HTMLDivElement>(null)
  const { snap, error, toast, reload } = useApp()
  useEffect(() => { scroller.current?.scrollTo(0, 0) }, [loc.pathname])

  return (
    <Shell>
      <div className="screen" ref={scroller}>
        {!snap ? (
          <div className="loading">
            {error ? (
              <div>
                <h3>Windy can’t reach the bank yet</h3>
                <p>{error}</p>
                <p className="small">Start the backend in another terminal: <code>cd app && npm run server</code></p>
                <button className="btn primary" onClick={reload}>Try again</button>
              </div>
            ) : 'Loading your accounts…'}
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/life-event" element={<LifeEventConfirm />} />
            <Route path="/goals/options" element={<GoalOptions />} />
            <Route path="/goals/japan-sooner" element={<JapanSooner />} />
            <Route path="/review/:id" element={<Review />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/consent" element={<Consent />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/receipt" element={<Receipt />} />
            <Route path="/receipt/quick-split" element={<QuickSplit />} />
            <Route path="/receipt/settings" element={<ReceiptSettings />} />
            <Route path="/receipt/:id" element={<Receipt />} />
            <Route path="/pay-later" element={<PayLater />} />
            <Route path="/plan" element={<Plan />} />
            <Route path="/more" element={<More />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/accounts" element={<AccountList />} />
            <Route path="/accounts/:id" element={<AccountDetail />} />
            <Route path="*" element={<Placeholder />} />
          </Routes>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
      {snap && <BottomNav />}
    </Shell>
  )
}
