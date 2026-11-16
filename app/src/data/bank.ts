// Generated bank data for Mia. Source of truth: data/generate.py (run it, don't edit the JSON by hand).
import accountsFile from '../../../data/mia/accounts.json'
import txFile from '../../../data/mia/transactions.json'
import receiptsFile from '../../../data/mia/receipts.json'
import upcomingFile from '../../../data/mia/upcoming.json'

export type Account = {
  id: string
  name: string
  product: string
  closing_balance: number
  opening_balance: number
  goal_target?: number
  goal_date?: string
  note?: string
}

export type Transaction = {
  id: string
  date: string // YYYY-MM-DD
  account: string
  description: string // raw statement text
  merchant: string
  category: string
  amount: number // negative = money out
  balance_after: number
  type: string
  status: 'posted' | 'pending'
  card_last4?: string
  signal?: string // e.g. "life-event"
  receipt_id?: string
  plan_id?: string
  plan_total?: number
  instalment?: string // e.g. "2 of 4"
  provider?: string
  auto_save?: boolean
  yearly?: boolean
  transfer_to?: string
  transfer_from?: string
  note?: string
}

export type Receipt = {
  id: string
  merchant: string
  store: string
  date: string
  total: number
  items: { name: string; price: number; group: string }[]
}

export type Upcoming = {
  date: string
  label: string
  amount: number
  account: string // which account pays it
  kind: 'pay' | 'rent' | 'bill' | 'auto_save' | 'pay_later' | 'yearly_bill'
  source: string
  estimate: boolean
  to_account?: string
  plan_id?: string
  plan_total?: number
  instalment?: string
}

export const today = txFile.meta.today
export const accounts = accountsFile.accounts as Account[]
export const transactions = txFile.transactions as Transaction[]
export const receipts = receiptsFile.receipts as Receipt[]
export const upcoming = upcomingFile.upcoming as Upcoming[]
export const account = (id: string) => accounts.find((a) => a.id === id)!

export const txFor = (accountId: string) =>
  transactions.filter((t) => t.account === accountId).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

export const fmtDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
