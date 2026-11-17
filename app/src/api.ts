// Talks to the FastAPI backend (server/main.py). Every number on screen comes from GET /api/snapshot,
// which the Python engine works out from the bank data plus Mia's saved plan.

export type Check = { layer: 'input' | 'engine' | 'output' | 'ai' | 'approve'; name: string; ok: boolean; detail: string }

export type Upcoming = {
  date: string; label: string; amount: number; account: string; kind: string; source: string
  to_account?: string; plan_id?: string
}

export type Goal = {
  id: string; name: string; saved: number; target: number; per_payday: number
  reached: string | null; reached_label: string; color: string; goal_date?: string | null; on_track: boolean | null
  // Joint savings: people saving for this goal with Mia, and when she would get there alone
  members: GoalMember[]; partner_per_payday: number; reached_solo: string | null
}

export type GoalMember = { name: string; per_payday: number; status: 'invited' | 'joined' }

export type Evidence = { id: string; date: string; merchant: string; category: string; amount: number; note?: string }

export type Recurring = {
  merchant: string; category: string; cadence: string; latest: number; seen: string[]
  status: 'new' | 'ongoing' | 'stopped'; state: 'found' | 'confirmed' | 'dismissed' | 'ongoing' | 'stopped'
  price_change: number | null; next_expected: string; account: string; per_fortnight: number; paused: boolean
}

export type Insurance = { due: string; now: number; was: number; prev_year: number | null; pct: number; rise: number; reviewed: boolean }

export type Card =
  | { id: 'life-event'; bond: number }
  | { id: 'shortfall'; low: { date: string; balance: number } }
  | { id: 'commitments'; found: string[]; insurance: Insurance | null; pay_later: { count: number; next: number; owed: number } }
  | { id: 'grocery-check'; shop: { merchant: string; date: string; amount: number }; usual: number }
  | { id: 'dream-nudge'; weekly: number }

export type HistoryEntry = {
  id: string; time: string; kind: string; title: string
  changes: { label: string; from: string; to: string }[]; undoable: boolean
}

export type Snapshot = {
  today: string
  user: { first_name: string }
  accounts: { id: string; name: string; product: string; balance: number; goal_target?: number; note?: string }[]
  everyday: { balance: number; safe: number; committed: number; next_payday: string }
  safe_items: Upcoming[]
  goals: Goal[]
  // Windy's ideas for next time: optional spending above her usual this month (not part of the forecast)
  // Time machine: notes to future you, sealed until their year
  capsules: Capsule[]
  this_year: number
  cut_ideas: { id: string; label: string; category: string; count: number; usual_count: number; spent: number; usual: number; extra: number; action: 'limit' | 'ask' }[]
  cards: Card[]
  forecast: {
    points: { date: string; balance: number }[]; low: { date: string; balance: number }; daily: number; safe: number
    next_payday: string; payday: { pay: number; auto_saves: number; pay_later: number }
    causes: Upcoming[]; usual_after_payday: number; assumption: string
  }
  fixes: { id: 'skip-life' | 'eating-out' | 'hold-subs'; label: string; note: string; gain: number }[]
  life_event: {
    status: 'detected' | 'confirmed' | 'dismissed'; rent_frequency: string | null; evidence: Evidence[]
    bond: Evidence; new_rent: Evidence; old_rent: Evidence; from_savings: Evidence | null; moving_date: string | null
    rent_rise_weekly: number
  }
  tradeoff: {
    rent_rise_per_fortnight: number; rent_per_fortnight: number; old_rent_per_fortnight: number; low_now: number; no_conflict: boolean
    options: { id: 'A' | 'B' | 'C'; name: string; summary: string; low_after: number; rows: { label: string; value: string; tone: 'good' | 'warn' | 'bad' }[] }[]
  }
  japan: Record<'bali' | 'home', {
    variant: string; target: number; saved: number; needed: number; per: number; keep: number; from_bali: number
    from_home_per: number; from_everyday_per: number; total: number; spare: number; trip_by: string; paydays: number
    bali_balance: number; home_per: number; japan_before: string; home_before: string | null
  }>
  commitments: {
    rows: Recurring[]; found: Recurring[]; per_fortnight: number; count: number
    rent: { label: string; amount: number; frequency: string; per_fortnight: number }
    yearly: { balance: number; due: Upcoming[]; short_by: number; per_payday: number; insurance: Insurance | null }
    pay_later: {
      active: { id: string; merchant: string; total: number; instalment: number; paid: number; remaining: number; owed: number; dates: string[] }[]
      done: { id: string; merchant: string; total: number; finished: string }[]
      last_payday_total: number; next_payday_total: number; owed: number
      what_if: Record<string, { instalment: number; low: number }>; low: { date: string; balance: number }
    }
    price_rises: Recurring[]; stopped: Recurring[]
  }
  grocery: {
    shop: { id: string; merchant: string; date: string; amount: number; receipt_id: string }
    usual: number; above: number; reviewed: boolean; split: { name: string; amount: number | null }[] | null
    month: { total: number; extras_share: number; extras_estimate: number }
  }
  receipts: {
    receipt: { id: string; merchant: string; store: string; date: string; total: number; items: { name: string; price: number; group: string }[] }
    groups: Record<string, number>; sum: number; matches: boolean; paid_merchant: string | null; reviewed: boolean
  }[]
  insights: {
    spent: number; avg_same_days: number; vs_same_days: number; avg_full: number; days_counted: number
    months: { m: string; v: number; partial: boolean; start: string; end: string; by_category: Record<string, number> }[]
    categories: { category: string; this_month: number; avg_same_days: number; avg_full_month: number; diff_vs_same_days: number }[]
    coach: string; eating_out_weekly: number; budgets: Record<string, number>
  }
  consent: Record<string, boolean>
  plan_choice: { kind: string; name: string } | null
  budgets: Record<string, number>
  history: HistoryEntry[]
  usage: { time: string; feature: string; what: string }[]
  usage_count: number
  upcoming: Upcoming[]
}

export type Proposal = {
  id: string; kind: string; params: Record<string, unknown>; title: string; subtitle: string
  changes: { label: string; from: string; to: string }[]; unchanged: { label: string; value: string }[]
  explanation: string; explanation_source: 'claude' | 'template'; checks: Check[]
}

export class ApiError extends Error {
  checks: Check[]
  status: number
  constructor(message: string, status: number, checks: Check[] = []) {
    super(message)
    this.status = status
    this.checks = checks
  }
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Can’t reach the demo backend. Is it running? (npm run server)', 0)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error ?? data.detail ?? `Server error ${res.status}`, res.status, data.checks ?? [])
  return data as T
}

export type Capsule = { id: string; open_date: string; year: number; text: string; written: string; opened: boolean; answer: null | 'done' | 'not_yet' | 'dropped' | 'yes' | 'no' | 'unsure' | 'answered' | 'read'; reply?: string | null; from: string | null; kind?: 'goal' | 'question' | 'message'; goal_id?: string | null }

// What Windy noticed about a note before it is sealed
export type NoteCheck = {
  open_year: number; text_year: number | null; mismatch: boolean; kind: 'goal' | 'question' | 'message'; source: 'rules' | 'claude'
  // How the note connects to her money: the engine's figures and one plain suggestion
  money: { topic: string; facts: { label: string; value: string }[]; tip: string; goal_name: string | null } | null
  goal: { id: string; name: string; saved: number; target: number; per_payday: number; reached: string | null; reached_label: string; on_time: boolean } | null
}

export type WhatIf = {
  id: string; title: string; note: string; low_before: number; low_after: number; helps: boolean
  changes: { label: string; from: string; to: string }[]
}

export const api = {
  whatIf: () => call<{ scenarios: WhatIf[] }>('/what_if'),
  capsuleCheck: (text: string, open_date: string) => call<NoteCheck>('/capsule_check', { text, open_date }),
  snapshot: () => call<Snapshot>('/snapshot'),
  propose: (kind: string, params: Record<string, unknown> = {}) => call<Proposal>('/propose', { kind, params }),
  approve: (id: string) => call<{ snapshot: Snapshot; checks: Check[]; entry: HistoryEntry }>(`/approve/${id}`, {}),
  action: (kind: string, params: Record<string, unknown> = {}) =>
    call<{ snapshot: Snapshot; checks: Check[]; title: string }>('/action', { kind, params }),
  undo: (id: string) => call<{ snapshot: Snapshot; checks: Check[] }>(`/undo/${id}`, {}),
  reset: () => call<{ snapshot: Snapshot }>('/reset', {}),
}
