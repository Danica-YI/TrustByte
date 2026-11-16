// Deterministic calculations over Mia's generated data. Screens show these numbers;
// Windy (the LLM) only ever explains them. Mirrors server/tools.py for the chat backend.
import { account, accounts, receipts, today, transactions, upcoming, type Transaction, type Upcoming } from './bank'

// ---------------------------------------------------------------- dates
const D = (s: string) => new Date(s + 'T00:00:00Z')
const iso = (d: Date) => d.toISOString().slice(0, 10)
export const addDays = (s: string, n: number) => iso(new Date(D(s).getTime() + n * 864e5))
export const daysBetween = (a: string, b: string) => Math.round((D(b).getTime() - D(a).getTime()) / 864e5)
export const shortDate = (s: string) => D(s).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' })
export const dayDate = (s: string) =>
  D(s).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
export const monthYear = (s: string) => D(s).toLocaleDateString('en-AU', { month: 'short', year: 'numeric', timeZone: 'UTC' })
const r2 = (n: number) => Math.round(n * 100) / 100

const everydayOut = (from: string, to = today) =>
  transactions.filter((t) => t.account === 'everyday' && t.amount < 0 && t.type !== 'transfer' && t.date >= from && t.date <= to)

// ---------------------------------------------------------------- balances and payday
export const everydayBalance = account('everyday').closing_balance
export const nextPayday = upcoming.filter((u) => u.kind === 'pay').map((u) => u.date).sort()[0]
const everydayUpcoming = upcoming.filter((u) => u.account === 'everyday')

/** Balance minus everything already scheduled on Everyday before the next payday. */
export function safeToSpend() {
  const items = everydayUpcoming.filter((u) => u.date > today && u.date < nextPayday && u.amount < 0)
  const committed = -items.reduce((s, u) => s + u.amount, 0)
  return { safe: r2(everydayBalance - committed), committed: r2(committed), items, nextPayday }
}

/** Usual day-to-day spend: Groceries, Eating out, Shopping, Transport over the last 90 days. */
export function dailySpend(categories = ['Groceries', 'Eating out', 'Shopping', 'Transport'], days = 90) {
  const rows = everydayOut(addDays(today, -(days - 1))).filter((t) => categories.includes(t.category))
  return r2(rows.reduce((s, t) => s - t.amount, 0) / days)
}

// ---------------------------------------------------------------- Idea 4 · Shortfall Early Warning
export type FixId = 'pause-life' | 'eating-out' | 'skip-new-subs'

/**
 * Projection for Everyday over the next 5 weeks.
 * Assumption (shown on screen): until payday Mia spends only her safe-to-spend, evenly;
 * from payday on she spends her usual daily amount. Every scheduled item is applied on its date.
 */
export function forecast(fixes: FixId[] = []) {
  const { safe } = safeToSpend()
  const preDays = Math.max(1, daysBetween(today, nextPayday) - 1)
  let daily = dailySpend()
  if (fixes.includes('eating-out')) {
    const eo = dailySpend(['Eating out'])
    daily -= Math.max(0, eo - 60 / 7)
  }
  const skipNew = new Set(fixes.includes('skip-new-subs') ? ['Spotify Premium', 'Amazon Prime'] : [])
  const items = everydayUpcoming.filter((u) => {
    if (skipNew.has(u.label)) return false
    if (fixes.includes('pause-life') && u.kind === 'auto_save' && u.to_account === 'life' && u.date === nextPayday) return false
    return true
  })
  let bal = everydayBalance
  const points = [{ date: today, balance: r2(bal) }]
  let low = { date: today, balance: bal }
  for (let i = 1; i <= 35; i++) {
    const d = addDays(today, i)
    bal += items.filter((u) => u.date === d).reduce((s, u) => s + u.amount, 0)
    bal -= d < nextPayday ? Math.max(0, safe) / preDays : daily
    points.push({ date: d, balance: r2(bal) })
    if (bal < low.balance) low = { date: d, balance: r2(bal) }
  }
  // the big things between payday and the low point
  const causes = items
    .filter((u) => u.date >= nextPayday && u.date <= low.date && Math.abs(u.amount) >= 50)
    .map((u) => ({ ...u }))
  return { points, low, causes, daily: r2(daily), safe, nextPayday }
}

export function forecastFixes() {
  const base = forecast().low.balance
  const lifeSave = everydayUpcoming.find((u) => u.kind === 'auto_save' && u.to_account === 'life' && u.date === nextPayday)
  const defs: { id: FixId; label: string; note: string }[] = [
    { id: 'pause-life', label: `Skip one Westpac Life auto-save`, note: `The $${-(lifeSave?.amount ?? 0)} on ${shortDate(nextPayday)} stays in Everyday` },
    { id: 'eating-out', label: 'Keep Eating out under $60 a week', note: `You’ve averaged $${Math.round(dailySpend(['Eating out']) * 7)} a week lately` },
    { id: 'skip-new-subs', label: 'Hold off on 2 new subscriptions', note: 'Spotify and Amazon Prime, started in the last 3 months' },
  ]
  return defs.map((f) => ({ ...f, gain: r2(forecast([f.id]).low.balance - base) }))
}

// ---------------------------------------------------------------- Idea 9+15 · Commitments Watch
const CADENCES: [string, number, number][] = [['weekly', 6, 8], ['fortnightly', 13, 15], ['monthly', 27, 32], ['quarterly', 85, 95], ['yearly', 350, 380]]

export type Recurring = {
  merchant: string; category: string; cadence: string; latest: number; seen: string[]
  status: 'new' | 'ongoing' | 'stopped'; priceChange?: number; nextExpected: string; account: string
}

export function recurringPayments(): Recurring[] {
  const by = new Map<string, Transaction[]>()
  for (const t of transactions) {
    if (t.amount >= 0 || t.type === 'transfer' || t.type === 'atm' || t.provider) continue
    if (t.account !== 'everyday' && t.account !== 'bills-saver') continue
    by.set(t.merchant, [...(by.get(t.merchant) ?? []), t])
  }
  const out: Recurring[] = []
  for (const [merchant, ts] of by) {
    ts.sort((a, b) => (a.date < b.date ? -1 : 1))
    const amounts = ts.map((t) => -t.amount)
    let cadence: string | undefined
    let gap = 0
    if (ts.length === 1 && ts[0].yearly) { cadence = 'yearly'; gap = 365 }
    else if (ts.length >= 2) {
      const gaps = ts.slice(1).map((t, i) => daysBetween(ts[i].date, t.date)).sort((a, b) => a - b)
      gap = gaps[Math.floor(gaps.length / 2)]
      cadence = CADENCES.find(([, lo, hi]) => gap >= lo && gap <= hi)?.[0]
      if (!cadence || gaps.some((g) => Math.abs(g - gap) > 3)) continue
      // bills vary (energy, water); subscriptions and rent don't
      const tol = ts[0].category === 'Bills and utilities' ? 0.25 : 0.15
      if ((Math.max(...amounts) - Math.min(...amounts)) / Math.max(...amounts) > tol) continue
    } else continue
    const first = ts[0].date, last = ts[ts.length - 1].date
    const status = daysBetween(last, today) > gap * 1.25 ? 'stopped' : daysBetween(first, today) <= 100 && cadence !== 'yearly' ? 'new' : 'ongoing'
    const change = amounts.length >= 2 ? r2(amounts[amounts.length - 1] - amounts[amounts.length - 2]) : 0
    out.push({
      merchant, category: ts[0].category, cadence: cadence!, latest: amounts[amounts.length - 1], seen: ts.map((t) => t.date),
      status, priceChange: Math.abs(change) >= 0.5 ? change : undefined, nextExpected: addDays(last, gap), account: ts[0].account,
    })
  }
  return out.sort((a, b) => b.latest - a.latest)
}

const PER_FORTNIGHT: Record<string, number> = { weekly: 2, fortnightly: 1, monthly: 12 / 26, quarterly: 4 / 26, yearly: 1 / 26 }
export const perFortnight = (r: Recurring) => r2(r.latest * (PER_FORTNIGHT[r.cadence] ?? 0))

/** Yearly bills paid from the Bills set-aside, with what's coming up and whether the pot covers it. */
export function yearlyBills() {
  const pot = account('bills-saver')
  const due = upcoming.filter((u) => u.account === 'bills-saver')
  const topUps = upcoming.filter((u) => u.kind === 'auto_save' && u.to_account === 'bills-saver')
  let bal = pot.closing_balance
  let shortBy = 0
  for (const d of [...new Set([...due, ...topUps].map((u) => u.date))].sort()) {
    bal += topUps.filter((u) => u.date === d).reduce((s, u) => s - u.amount, 0)
    bal += due.filter((u) => u.date === d).reduce((s, u) => s + u.amount, 0)
    shortBy = Math.min(shortBy, bal)
  }
  const history = (merchant: string) => transactions.filter((t) => t.merchant === merchant && t.account === 'bills-saver')
  return { balance: pot.closing_balance, due, shortBy: r2(-shortBy), history }
}

export type Plan = {
  id: string; merchant: string; total: number; instalment: number; paid: number; remaining: number
  owed: number; nextDate?: string; dates: string[]
}

export function payLaterPlans() {
  const ids = [...new Set(transactions.filter((t) => t.plan_id).map((t) => t.plan_id!))]
  const plans: Plan[] = ids.map((id) => {
    const paid = transactions.filter((t) => t.plan_id === id)
    const next = upcoming.filter((u) => u.plan_id === id)
    const instalment = -paid[0].amount
    const remaining = 4 - paid.length
    return {
      id, merchant: paid[0].merchant.replace('Afterpay · ', ''), total: paid[0].plan_total!, instalment,
      paid: paid.length, remaining, owed: r2(instalment * remaining), nextDate: next[0]?.date,
      // 4 instalments a fortnight apart from the first one (the last may be beyond upcoming.json's 5 weeks)
      dates: [0, 1, 2, 3].map((k) => addDays(paid[0].date, 14 * k)),
    }
  })
  const active = plans.filter((p) => p.remaining > 0)
  const thisPayday = upcoming.filter((u) => u.kind === 'pay_later' && u.date === nextPayday).reduce((s, u) => s - u.amount, 0)
  const lastPayday = transactions.filter((t) => t.provider && t.date === transactions.filter((x) => x.merchant === 'Harbour Health').map((x) => x.date).sort().pop())
  return {
    active, done: plans.filter((p) => p.remaining === 0),
    lastPaydayTotal: r2(lastPayday.reduce((s, t) => s - t.amount, 0)),
    nextPaydayTotal: r2(thisPayday), owed: r2(active.reduce((s, p) => s + p.owed, 0)),
  }
}

/** What one more pay-later plan would do to the December low. */
export function extraPlanImpact(total: number) {
  const inst = total / 4
  const base = forecast()
  let bal = 0
  let low = base.low.balance
  const paydays = upcoming.filter((u) => u.kind === 'pay').map((u) => u.date)
  for (const p of base.points) {
    if (paydays.includes(p.date)) bal += inst
    low = Math.min(low, p.balance - bal)
  }
  return { instalment: r2(inst), low: r2(low) }
}

// ---------------------------------------------------------------- Idea 1 · Life Event Detector
export function lifeEvent() {
  const signals = transactions.filter((t) => t.signal === 'life-event' && t.account === 'everyday' && t.type !== 'transfer')
  const bond = signals.find((t) => t.merchant.startsWith('RTA'))!
  const newRent = signals.find((t) => t.category === 'Housing' && t !== bond)!
  const oldRent = transactions.filter((t) => t.merchant === 'Northside Realty').pop()!
  const mover = signals.find((t) => t.category === 'Moving')
  const fromSavings = transactions.find((t) => t.signal === 'life-event' && t.account === 'everyday' && t.type === 'transfer')
  return { signals, bond, newRent, oldRent, mover, fromSavings, rentRise: r2(-newRent.amount + oldRent.amount) }
}

// ---------------------------------------------------------------- goals (Idea 2)
export const goals = accounts.filter((a) => a.goal_target)

/** Current auto-save into an account per payday (0 if it stopped). */
export function perPayday(accountId: string) {
  const u = upcoming.find((x) => x.kind === 'auto_save' && x.to_account === accountId)
  return u ? -u.amount : 0
}

export function paydaysFrom(start = nextPayday, n = 1) {
  return Array.from({ length: n }, (_, i) => addDays(start, 14 * i))
}

/** Date a goal is reached, saving `per` each payday from the next one. */
export function goalDate(accountId: string, per = perPayday(accountId), extra = 0) {
  const g = account(accountId)
  const remaining = g.goal_target! - g.closing_balance - extra
  if (remaining <= 0) return today
  if (per <= 0) return null
  return addDays(nextPayday, 14 * (Math.ceil(remaining / per) - 1))
}

/** JP-01 / JP-02: reach the Japan goal within 6 paydays (about 3 months). */
export function japanSooner(variant: 'bali' | 'home') {
  const jp = account('goal-japan'), bali = account('goal-bali'), home = account('goal-home')
  const n = 6
  const dates = paydaysFrom(nextPayday, n)
  const needed = r2(jp.goal_target! - jp.closing_balance)
  const per = perPayday('goal-japan')
  const keep = per * n
  const fromBali = variant === 'bali' ? Math.min(bali.closing_balance, Math.max(0, needed - keep)) : 0
  const homePerNormal = perPayday('goal-home')
  const rest = Math.max(0, needed - keep - fromBali)
  const fromHomePer = Math.min(homePerNormal, Math.ceil(rest / n / 5) * 5)
  const fromEverydayPer = Math.max(0, Math.ceil((rest - fromHomePer * n) / n))
  const total = keep + fromBali + fromHomePer * n + fromEverydayPer * n
  const homeBefore = goalDate('goal-home')
  const homeAfter = homeBefore ? addDays(homeBefore, 14 * Math.ceil((fromHomePer * n) / homePerNormal)) : null
  return {
    variant, target: jp.goal_target!, saved: jp.closing_balance, needed, per, keep, fromBali, fromHomePer, fromEverydayPer, total: r2(total), spare: r2(total - needed),
    tripBy: dates[n - 1], paydays: n, japanBefore: goalDate('goal-japan'),
    baliBefore: bali.closing_balance, baliAfter: r2(bali.closing_balance - fromBali),
    homePerNormal, homeBefore, homeAfter, emergency: account('goal-emergency').closing_balance, home,
  }
}

// ---------------------------------------------------------------- Idea 10 · Receipt Lens
export const receipt = (id: string) => receipts.find((r) => r.id === id)!

export function receiptGroups(id: string) {
  const r = receipt(id)
  const groups: Record<string, number> = {}
  for (const i of r.items) groups[i.group] = r2((groups[i.group] ?? 0) + i.price)
  const sum = r2(Object.values(groups).reduce((s, v) => s + v, 0))
  return { receipt: r, groups, sum, matches: Math.abs(sum - r.total) < 0.01 }
}

/** The big grocery shop Windy noticed, and the usual size of a main shop. */
export function groceryCheck() {
  const shop = transactions.find((t) => t.receipt_id === 'rcpt-coles-20261112')!
  const shops = everydayOut(addDays(today, -89))
    .filter((t) => t.category === 'Groceries' && -t.amount >= 40 && t.id !== shop.id)
    .map((t) => -t.amount)
    .sort((a, b) => a - b)
  const usual = Math.round(shops[Math.floor(shops.length / 2)])
  return { shop, amount: -shop.amount, usual, above: r2(-shop.amount - usual) }
}

/** This month's groceries, and the share of receipt items that were extras. */
export function groceriesThisMonth() {
  const month = today.slice(0, 7)
  const total = everydayOut(month + '-01').filter((t) => t.category === 'Groceries').reduce((s, t) => s - t.amount, 0)
  const rs = receipts.filter((r) => r.date.startsWith(month))
  const all = rs.flatMap((r) => r.items)
  const extras = all.filter((i) => i.group === 'Extras and snacks').reduce((s, i) => s + i.price, 0)
  const share = extras / all.reduce((s, i) => s + i.price, 0)
  return { total: r2(total), extrasShare: share, extrasEstimate: r2(total * share), receiptsCounted: rs.length }
}

export type { Upcoming }
