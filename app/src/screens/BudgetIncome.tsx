// B-01 · Confirm your income
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, TopBar } from '../components/ui'
import { incomes, money } from '../data/mia'

export default function BudgetIncome() {
  const nav = useNavigate()
  const [counted, setCounted] = useState(incomes.filter((i) => i.counted).map((i) => i.id))
  const total = incomes.filter((i) => counted.includes(i.id)).reduce((s, i) => s + i.amount, 0)

  return (
    <>
      <TopBar title="Create a budget" />
      <div className="muted">Step 1 of 4</div>
      <h2 style={{ margin: '6px 0' }}>Confirm your income</h2>
      <p className="intro">We found these deposits in the last 3 months. Tick what you can count on each cycle.</p>

      <Card>
        {incomes.map((i) => (
          <label key={i.id} className="row" style={{ cursor: 'pointer' }}>
            <span className="hstack" style={{ flexWrap: 'nowrap' }}>
              <input type="checkbox" checked={counted.includes(i.id)}
                onChange={(e) => setCounted(e.target.checked ? [...counted, i.id] : counted.filter((x) => x !== i.id))} />
              <span><div>{i.name}</div><div className="muted">{i.meta}</div></span>
            </span>
            <b>{money(i.amount, true)}</b>
          </label>
        ))}
        <hr className="sep" />
        <div className="row"><span>Income per fortnight</span><b style={{ fontSize: 18 }}>{money(total)}</b></div>
      </Card>

      <Card variant="windy">
        <p style={{ margin: 0 }}>Your side income changes, so Windy plans with the lower end ($380) to keep you safe.</p>
      </Card>

      <button className="link" style={{ margin: '4px 0 14px' }}>+ Add other income</button>
      <button className="btn primary block" onClick={() => nav('/budget')}>Continue</button>
    </>
  )
}
