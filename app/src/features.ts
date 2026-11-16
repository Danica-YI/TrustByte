// ★ Feature switchboard. To change what the demo shows, edit `enabled` here.
//   - enabled: false → its home card disappears and it greys out in the demo navigator (still clickable for preview).
//   - hero: a headline feature in the video, tagged in the navigator.
//   - idea: the number on the FigJam board ("Idea 9 + 15" etc.); figma: the wireframe code.
// The home page shows one Windy card at a time: the first enabled feature with a homeCard,
// or the one named in the URL, e.g. /?card=dream-nudge.
//
// Team selection (16 Nov): Ideas 1, 2, 3, 4, 9+15, 10 (+ the live Windy chat).

export type HomeCardId = 'life-event' | 'dream-nudge' | 'money-health' | 'grocery-check' | 'goal-pace' | 'commitments'

export type Feature = {
  id: string
  idea?: string
  name: string
  pitch: string
  enabled: boolean
  hero?: boolean
  homeCard?: HomeCardId
  screens: { path: string; label: string; figma: string }[]
}

export const features: Feature[] = [
  // ---------------------------------------------------------------- selected
  {
    id: 'life-event',
    idea: '1',
    name: 'Life Event Detector',
    pitch: 'Reads "you\'re moving" from transactions (bond, new rent payee) and asks before planning.',
    enabled: true,
    hero: true,
    homeCard: 'life-event',
    screens: [
      { path: '/?card=life-event', label: 'Home · Life event detected', figma: 'LP-01' },
      { path: '/life-event', label: 'Confirm life event', figma: 'LP-02' },
    ],
  },
  {
    id: 'goal-tradeoff',
    idea: '2',
    name: 'Goal Trade-off Simulator',
    pitch: 'Lays out options when goals clash; a calculator does the maths, Windy explains, Mia approves.',
    enabled: true,
    hero: true,
    screens: [
      { path: '/goals/options', label: 'Goal conflict · 3 options', figma: 'LP-04' },
      { path: '/goals/review/B', label: 'Review & approve', figma: 'LP-05' },
      { path: '/goals/japan-sooner', label: 'Chat · Japan in 3 months', figma: 'JP-01' },
      { path: '/goals/japan-sooner/review?variant=bali', label: 'Review · Japan in 3 months', figma: 'JP-02' },
    ],
  },
  {
    id: 'dream-nudge',
    idea: '3',
    name: 'Dream Nudge',
    pitch: 'For people with no goal yet: what a small weekly amount could become.',
    enabled: true,
    homeCard: 'dream-nudge',
    screens: [{ path: '/?card=dream-nudge', label: 'Home · Dream nudge', figma: 'LP-07' }],
  },
  {
    id: 'shortfall',
    idea: '4',
    name: 'Shortfall Early Warning',
    pitch: 'Projects Everyday to the next paydays from scheduled items and usual spending; fixes with their effect.',
    enabled: true,
    screens: [{ path: '/forecast', label: 'Cash flow forecast', figma: 'Harbour 03' }],
  },
  {
    id: 'commitments',
    idea: '9 + 15',
    name: 'Commitments Watch',
    pitch: 'Bills, subscriptions, insurance renewals and pay-later plans: new ones, price rises, and what one more plan would do.',
    enabled: true,
    homeCard: 'commitments',
    screens: [
      { path: '/?card=commitments', label: 'Home · Commitments', figma: 'new' },
      { path: '/payments?found=spotify', label: 'AI found · Confirm payment', figma: 'R-02' },
      { path: '/payments?found=insurance', label: 'Price rise · Review', figma: 'R-03' },
      { path: '/pay-later', label: 'Pay-later plans', figma: 'new' },
    ],
  },
  {
    id: 'receipt-lens',
    idea: '10',
    name: 'Receipt Lens',
    pitch: 'Sees what was in a big shop (connected receipt, photo, or quick tick list), grouped by money, never health or diet.',
    enabled: true,
    hero: true,
    homeCard: 'grocery-check',
    screens: [
      { path: '/?card=grocery-check', label: 'Home · Grocery check', figma: 'RL-01' },
      { path: '/receipt', label: 'Receipt breakdown', figma: 'RL-02' },
      { path: '/receipt/quick-split', label: 'Tick what you bought', figma: 'RL-03' },
      { path: '/receipt/settings', label: 'Connected receipts (setting)', figma: 'new' },
    ],
  },
  {
    id: 'windy-chat',
    name: 'Ask Windy (live AI chat)',
    pitch: 'Claude answers from Mia\'s own transactions, balances and goals, and shows which data it used.',
    enabled: true,
    screens: [{ path: '/chat', label: 'Chat with Windy', figma: 'new' }],
  },
  // ---------------------------------------------------------------- not selected (preview only)
  {
    id: 'money-health',
    idea: '5 + 6',
    name: 'Spending Behaviour Coach',
    pitch: 'How much you kept this month and what\'s worth a look.',
    enabled: false,
    homeCard: 'money-health',
    screens: [
      { path: '/?card=money-health', label: 'Home · Spending impact', figma: 'LP-08' },
      { path: '/insights', label: 'Insights', figma: 'Harbour 02' },
    ],
  },
  {
    id: 'auto-budget',
    idea: '7',
    name: 'One-tap Auto-Budget',
    pitch: 'Recognises income from transactions and builds a budget in one step.',
    enabled: false,
    screens: [
      { path: '/budget/income', label: 'Confirm your income', figma: 'B-01' },
      { path: '/budget', label: 'Budget created', figma: 'B-05' },
    ],
  },
  {
    id: 'loan-readiness',
    idea: '8',
    name: 'Loan Readiness',
    pitch: 'Estimates home-buying readiness from your own transactions (not loan advice).',
    enabled: false,
    screens: [{ path: '/loan-readiness', label: 'Loan readiness', figma: 'LP-09' }],
  },
  {
    id: 'guided-application',
    idea: '11 + 13',
    name: 'Guided Application',
    pitch: 'Ask once to find a feature; the application comes pre-filled.',
    enabled: false,
    screens: [
      { path: '/ask', label: 'Ask · Feature Finder', figma: 'FF-01' },
      { path: '/home-loan/apply', label: 'Pre-filled application', figma: 'PA-01' },
    ],
  },
  {
    id: 'goal-pace',
    idea: '12',
    name: 'Goal Pace Alert',
    pitch: 'Flags a goal falling behind and how to catch up.',
    enabled: false,
    homeCard: 'goal-pace',
    screens: [{ path: '/?card=goal-pace', label: 'Home · Goal pace alert', figma: 'GP-01' }],
  },
  {
    id: 'consent',
    idea: '14',
    name: 'Your Data and Consent',
    pitch: 'Trust layer: what data was used, where it went, switch off any time.',
    enabled: false,
    screens: [{ path: '/consent', label: 'Your data and consent', figma: 'DC-01' }],
  },
]

export const isEnabled = (id: string) => features.find((f) => f.id === id)?.enabled ?? false
