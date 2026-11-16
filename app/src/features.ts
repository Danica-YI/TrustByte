// ★ Once the team decides which features to keep, only edit `enabled` in this file.
//   - enabled: false → its home card disappears and it greys out in the demo navigator (still clickable for preview).
//   - hero: a headline feature in the video, tagged in the navigator.
//   - figma: the wireframe code on the FigJam board, for cross-reference.
// The home page shows one Windy card at a time: the first enabled feature with a homeCard,
// or the one named in the URL, e.g. /?card=dream-nudge.

export type HomeCardId = 'life-event' | 'dream-nudge' | 'money-health' | 'grocery-check' | 'goal-pace'

export type Feature = {
  id: string
  name: string
  pitch: string
  enabled: boolean
  hero?: boolean
  homeCard?: HomeCardId
  screens: { path: string; label: string; figma: string }[]
}

export const features: Feature[] = [
  {
    id: 'windy-chat',
    name: 'Ask Windy (live AI chat)',
    pitch: 'Real Claude answers from Mia\'s own transactions, balances and goals; shows which data it used.',
    enabled: true,
    screens: [{ path: '/chat', label: 'Chat with Windy', figma: 'new' }],
  },
  {
    id: 'life-event',
    name: 'Life Event Detector',
    pitch: 'Reads "you\'re moving" from transactions, asks before planning.',
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
    name: 'Goal Trade-off Simulator',
    pitch: 'Three options, the customer chooses; a calculator does the maths, Windy explains.',
    enabled: true,
    hero: true,
    screens: [
      { path: '/goals/options', label: 'Goal conflict · 3 options', figma: 'LP-04' },
      { path: '/goals/review/B', label: 'Review & approve', figma: 'LP-05' },
    ],
  },
  {
    id: 'receipt-lens',
    name: 'Receipt Lens',
    pitch: 'Reads receipts and groups items by money, never health or diet.',
    enabled: true,
    hero: true,
    homeCard: 'grocery-check',
    screens: [
      { path: '/?card=grocery-check', label: 'Home · Grocery check', figma: 'RL-01' },
      { path: '/receipt', label: 'Receipt breakdown', figma: 'RL-02' },
    ],
  },
  {
    id: 'consent',
    name: 'Your Data and Consent',
    pitch: 'Trust layer: what data was used, where it went, switch off any time.',
    enabled: true,
    screens: [{ path: '/consent', label: 'Your data and consent', figma: 'DC-01' }],
  },
  {
    id: 'shortfall',
    name: 'Shortfall Early Warning',
    pitch: 'Predicts an overdraft in early December and offers fixes.',
    enabled: true,
    screens: [{ path: '/forecast', label: 'Cash flow forecast', figma: 'Harbour 03' }],
  },
  {
    id: 'dream-nudge',
    name: 'Dream Nudge',
    pitch: 'For people with no goal yet: what $30 a week could become.',
    enabled: true,
    homeCard: 'dream-nudge',
    screens: [{ path: '/?card=dream-nudge', label: 'Home · Dream nudge', figma: 'LP-07' }],
  },
  {
    id: 'money-health',
    name: 'Spending Behaviour Coach',
    pitch: 'How much you kept this month and what\'s worth a look.',
    enabled: true,
    homeCard: 'money-health',
    screens: [
      { path: '/?card=money-health', label: 'Home · Spending impact', figma: 'LP-08' },
      { path: '/insights', label: 'Insights', figma: 'Harbour 02' },
    ],
  },
  {
    id: 'goal-pace',
    name: 'Goal Pace Alert',
    pitch: 'Flags a goal falling behind and how to catch up.',
    enabled: true,
    homeCard: 'goal-pace',
    screens: [{ path: '/?card=goal-pace', label: 'Home · Goal pace alert', figma: 'GP-01' }],
  },
  {
    id: 'auto-budget',
    name: 'One-tap Auto-Budget',
    pitch: 'Recognises income from transactions and builds a budget in one step.',
    enabled: true,
    screens: [
      { path: '/budget/income', label: 'Confirm your income', figma: 'B-01' },
      { path: '/budget', label: 'Budget created', figma: 'B-05' },
    ],
  },
  {
    id: 'commitments',
    name: 'Commitments Watch',
    pitch: 'Spots new subscriptions and price rises.',
    enabled: true,
    screens: [
      { path: '/payments?found=spotify', label: 'AI found · Confirm payment', figma: 'R-02' },
      { path: '/payments?found=insurance', label: 'Price rise · Review', figma: 'R-03' },
    ],
  },
  {
    id: 'loan-readiness',
    name: 'Loan Readiness',
    pitch: 'Estimates home-buying readiness from your own transactions (not loan advice).',
    enabled: true,
    screens: [{ path: '/loan-readiness', label: 'Loan readiness', figma: 'LP-09' }],
  },
  {
    id: 'guided-application',
    name: 'Feature Finder + Guided Application',
    pitch: 'Ask once to find a feature; the application comes pre-filled.',
    enabled: true,
    screens: [
      { path: '/ask', label: 'Ask · Feature Finder', figma: 'FF-01' },
      { path: '/home-loan/apply', label: 'Pre-filled application', figma: 'PA-01' },
    ],
  },
]

export const isEnabled = (id: string) => features.find((f) => f.id === id)?.enabled ?? false
