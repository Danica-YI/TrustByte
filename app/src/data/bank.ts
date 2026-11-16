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

export type Upcoming = { date: string; label: string; amount: number; source: string; estimate: boolean }

export const today = txFile.meta.today
export const accounts = accountsFile.accounts as Account[]
export const transactions = txFile.transactions as Transaction[]
export const receipts = receiptsFile.receipts as Receipt[]
export const upcoming = upcomingFile.upcoming as Upcoming[]

export const txFor = (accountId: string) =>
  transactions.filter((t) => t.account === accountId).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

export const fmtDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
