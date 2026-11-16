// All mock data for the demo user Mia, kept in this one file.
// Numbers copied from the Figma wireframes. Where wireframes disagree there's a TODO to reconcile.

export const user = {
  firstName: 'Mia',
  everydayBalance: 1678.25,
  safeToSpend: 180, // until next payday
  payday: '27 Nov',
}

export type Goal = { id: string; name: string; saved: number; target: number; color: string }

export const goals: Goal[] = [
  { id: 'japan', name: 'Japan trip', saved: 1140, target: 3500, color: '#6d28d9' },
  { id: 'emergency', name: 'Emergency fund', saved: 2600, target: 6000, color: '#15803d' },
  { id: 'home', name: 'Home deposit', saved: 8000, target: 40000, color: '#d4002a' },
]

// LP-01 / LP-02: moving-home signal
export const lifeEvent = {
  kind: 'moving',
  title: 'Looks like you’re moving home',
  body: 'We spotted a $2,400 bond to RTA Queensland and a new rent payee this week. Want me to check how this affects your Japan trip and home deposit?',
  evidence: [
    { icon: 'B', label: 'Bond · RTA Queensland', meta: '10 Nov · Everyday', amount: -2400 },
    { icon: 'R', label: 'New payee · Ray White Rentals', meta: '11 Nov · first payment', amount: -620 },
  ],
  newRentPerWeek: 620,
  previousRentPerWeek: 540,
  movingDate: 'Sat 22 Nov',
}

// Shortfall warning on the home page (Harbour 03 is the detail page)
// TODO: rent here is $1,200 in Harbour 03 but $620/week in LP-02. Reconcile.
export const shortfall = {
  title: 'Early December looks tight',
  body: 'After rent and car rego, Everyday could dip to −$120 around 3 Dec.',
  lowest: -120,
  lowestDate: 'Thu 3 Dec',
  timeline: [
    { date: '28 Nov', label: 'Pay (Everyday share)', amount: 1678, after: 1858 },
    { date: '1 Dec', label: 'Rent', amount: -1200, after: 658 },
    { date: '2 Dec', label: 'Car registration', note: 'yearly', amount: -412, after: 246 },
    { date: '3 Dec', label: 'Phone and car insurance', amount: -366, after: -120 },
  ],
  balancePoints: [1678, 1520, 1380, 1858, 658, 246, -120], // for the line chart
  fixes: [
    { id: 'move', label: 'Move $150 from Emergency fund', note: 'Top it back up from your next pay', gain: 150 },
    { id: 'subs', label: 'Cancel 2 unused subscriptions', note: 'Not opened in 60+ days', gain: 38 },
    { id: 'eatout', label: 'Keep Eating out under $60 a week', note: 'Based on your last 3 weeks', gain: 110 },
  ],
}

// LP-04 / LP-05: three trade-off options (a calculator does the maths, Windy only explains)
export type PlanOption = {
  id: 'A' | 'B' | 'C'
  name: string
  summary: string
  rows: { label: string; value: string; tone: 'good' | 'warn' | 'bad' | 'windy' }[]
  note?: string
}

export const planOptions: PlanOption[] = [
  {
    id: 'A', name: 'Travel first', summary: 'Keep Japan at $3,500 for July 2027.',
    rows: [
      { label: 'Japan trip', value: 'On track · Jul 2027', tone: 'good' },
      { label: 'Home deposit', value: '+5 months', tone: 'bad' },
      { label: 'Emergency fund', value: 'Stays at 3-month min', tone: 'windy' },
    ],
  },
  {
    id: 'B', name: 'Balanced', summary: 'Trim the trip to $3,000 and keep both goals moving.',
    rows: [
      { label: 'Japan trip', value: '$3,000 · Jul 2027', tone: 'good' },
      { label: 'Home deposit', value: '+2 months', tone: 'warn' },
      { label: 'Emergency fund', value: 'Stays at 3-month min', tone: 'windy' },
    ],
    note: 'Closest to your current plan',
  },
  {
    id: 'C', name: 'Home first', summary: 'Move Japan to October and protect the deposit.',
    rows: [
      { label: 'Japan trip', value: 'Moves to Oct 2027', tone: 'warn' },
      { label: 'Home deposit', value: 'On track · Mar 2029', tone: 'good' },
      { label: 'Emergency fund', value: 'Stays at 3-month min', tone: 'windy' },
    ],
  },
]

// LP-05 only details option B; add A / C when decided
export const planChanges: Record<string, { label: string; from: string; to: string }[]> = {
  B: [
    { label: 'Japan trip budget', from: '$3,500', to: '$3,000' },
    { label: 'Japan saving each payday', from: '$139', to: '$118' },
    { label: 'Home deposit date', from: 'Mar 2029', to: 'May 2029' },
    { label: 'Safe to spend till payday', from: '$120', to: '$180' },
  ],
}

// Harbour 02: spending insights
export const insights = {
  spentThisMonth: 2140,
  vsAverage: 248,
  average: 1892,
  months: [
    { m: 'Jun', v: 1780 }, { m: 'Jul', v: 1950 }, { m: 'Aug', v: 1840 },
    { m: 'Sep', v: 1910 }, { m: 'Oct', v: 1870 }, { m: 'Nov', v: 2140 },
  ],
  categories: [
    { name: 'Eating out', spent: 486, avg: 310 },
    { name: 'Shopping', spent: 390, avg: 260 },
    { name: 'Transport', spent: 238, avg: 220 },
    { name: 'Subscriptions', spent: 96, avg: 96 },
    { name: 'Groceries', spent: 412, avg: 430 },
    { name: 'Bills and utilities', spent: 518, avg: 576 },
  ],
}

// R-02 / R-03: regular payments
export const regularPayments = {
  perFortnight: 1482,
  count: 8,
  paid: 683,
  comingUp: 799,
  groups: [
    {
      name: 'Home & bills', total: 1378, items: [
        { icon: 'R', name: 'Rent · Ray White', meta: 'Weekly · Thu · next 4 Dec', tag: 'Detected', amount: 1240, sub: '$620 / wk' },
        { icon: 'E', name: 'Electricity · Origin', meta: 'Quarterly · next 18 Jan', tag: 'Estimate', amount: 93, sub: '~$560 / qtr' },
        { icon: 'T', name: 'Phone · Telstra', meta: 'Monthly · next 5 Dec', tag: 'Detected', amount: 45, sub: '$98 / mo' },
      ],
    },
    {
      name: 'Subscriptions', total: 44, items: [
        { icon: 'G', name: 'Gym · Fitness First', meta: 'Fortnightly · next 8 Dec', tag: 'You added', amount: 25 },
        { icon: 'N', name: 'Netflix', meta: 'Monthly · next 20 Dec', tag: 'Price up $2', amount: 19, sub: '$18.99 / mo' },
      ],
    },
    {
      name: 'Yearly bills · set aside', total: 60, items: [
        { icon: 'C', name: 'Car rego · QLD TMR', meta: 'Due 3 Dec · $412', tag: 'You added', amount: 16 },
        { icon: 'I', name: 'Car insurance · AAMI', meta: 'Renews 15 Dec · ~$720', tag: 'Estimate', amount: 28 },
        { icon: 'H', name: 'Contents insurance', meta: 'Renews 2 Mar · $416', tag: 'You added', amount: 16 },
      ],
    },
  ],
  found: [
    { id: 'spotify', icon: 'S', name: 'Spotify Premium', meta: 'Monthly · seen 2 Sep, 2 Oct, 2 Nov', amount: 13.99 },
    { id: 'amazon', icon: 'A', name: 'Amazon Prime', meta: 'Monthly · seen 14 Oct, 14 Nov', amount: 9.99 },
  ],
}

// RL-01 / RL-02: receipt
export const receipt = {
  merchant: 'Coles',
  date: '12 Nov',
  total: 142.3,
  usualShop: 90,
  groups: [
    { name: 'Essentials', amount: 86.4 },
    { name: 'Extras and snacks', amount: 38.2 },
    { name: 'Household', amount: 17.7 },
  ],
}

// B-01: income
export const incomes = [
  { id: 'salary', name: 'Salary · Harbour Health', meta: 'Every 2 weeks · last on 13 Nov', amount: 2883.24, counted: true },
  { id: 'abn', name: 'Side income (ABN)', meta: 'Varies · avg of last 6 payments', amount: 420, counted: true },
  { id: 'transfer', name: 'Transfer from Westpac Life', meta: 'Your own money, not income', amount: 300, counted: false },
]

// DC-01: consent switches
export const consentDefaults = [
  { id: 'insights', label: 'Spending insights', on: true },
  { id: 'life-event', label: 'Life event detection', on: true },
  { id: 'nudges', label: 'Goal and dream nudges', on: true },
  { id: 'receipt', label: 'Receipt Lens', on: false },
]

export const money = (n: number, cents = false) =>
  (n < 0 ? '−' : '') + '$' + Math.abs(n).toLocaleString('en-AU', {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  })
