// Formatting helpers shared by every screen.
const D = (s: string) => new Date(s + 'T00:00:00Z')

export const money = (n: number, cents = false) =>
  (n < -0.004 ? '−' : '') + '$' + Math.abs(n).toLocaleString('en-AU', {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  })

export const shortDate = (s: string) => D(s).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' })
export const dayDate = (s: string) =>
  D(s).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
export const monthYear = (s: string | null) =>
  s ? D(s).toLocaleDateString('en-AU', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : 'not set'
export const daysBetween = (a: string, b: string) => Math.round((D(b).getTime() - D(a).getTime()) / 864e5)
