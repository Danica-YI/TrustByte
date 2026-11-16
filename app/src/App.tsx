// Routes: roughly one wireframe = one page. To add a page: create a file in screens/ → add a line here → register it in features.ts.
import { Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { DemoShell } from './components/DemoShell'
import { BottomNav } from './components/ui'
import Home from './screens/Home'
import LifeEventConfirm from './screens/LifeEventConfirm'
import GoalOptions from './screens/GoalOptions'
import GoalReview from './screens/GoalReview'
import Forecast from './screens/Forecast'
import Insights from './screens/Insights'
import Consent from './screens/Consent'
import BudgetIncome from './screens/BudgetIncome'
import BudgetCreated from './screens/BudgetCreated'
import Payments from './screens/Payments'
import Receipt from './screens/Receipt'
import LoanReadiness from './screens/LoanReadiness'
import FeatureFinder from './screens/FeatureFinder'
import HomeLoanApply from './screens/HomeLoanApply'
import More from './screens/More'
import Placeholder from './screens/Placeholder'
import { AccountDetail, AccountList } from './screens/Accounts'

export default function App() {
  const loc = useLocation()
  const scroller = useRef<HTMLDivElement>(null)
  // Scroll back to top on page change
  useEffect(() => { scroller.current?.scrollTo(0, 0) }, [loc.pathname])

  return (
    <DemoShell>
      <div className="screen" ref={scroller}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/life-event" element={<LifeEventConfirm />} />
          <Route path="/goals/options" element={<GoalOptions />} />
          <Route path="/goals/review/:option" element={<GoalReview />} />
          <Route path="/forecast" element={<Forecast />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/consent" element={<Consent />} />
          <Route path="/budget/income" element={<BudgetIncome />} />
          <Route path="/budget" element={<BudgetCreated />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/receipt" element={<Receipt />} />
          <Route path="/loan-readiness" element={<LoanReadiness />} />
          <Route path="/ask" element={<FeatureFinder />} />
          <Route path="/home-loan/apply" element={<HomeLoanApply />} />
          <Route path="/more" element={<More />} />
          <Route path="/accounts" element={<AccountList />} />
          <Route path="/accounts/:id" element={<AccountDetail />} />
          <Route path="*" element={<Placeholder />} />
        </Routes>
      </div>
      <BottomNav />
    </DemoShell>
  )
}
