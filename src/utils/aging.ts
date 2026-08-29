// Shared "how long since completion" math -- used by the Skills Training list's
// Aging filter, its 6-month re-assignment cooldown warning, and the Aging
// Report, so all three can never quietly drift out of sync with each other.

// Whole calendar months between a past date (YYYY-MM-DD or timestamp) and today.
export function monthsSince(dateStr: string): number {
  const then = new Date(dateStr.split('T')[0].split(' ')[0])
  const now = new Date()
  let months = (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth())
  if (now.getDate() < then.getDate()) months -= 1
  return Math.max(0, months)
}

// e.g. "12 days" / "3 months" -- short enough for a table cell; falls back to
// days under a month so a very recent completion doesn't read as "0 months".
export function relativeSince(dateStr: string): string {
  const then = new Date(dateStr.split('T')[0].split(' ')[0])
  const days = Math.floor((Date.now() - then.getTime()) / 86400000)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'}`
  const months = monthsSince(dateStr)
  return months <= 0 ? 'less than a month' : `${months} month${months === 1 ? '' : 's'}`
}

export type AgingBucket = '0-1 month' | '1-3 months' | '3-6 months' | '6+ months'

export function agingBucket(months: number): AgingBucket {
  if (months < 1) return '0-1 month'
  if (months < 3) return '1-3 months'
  if (months < 6) return '3-6 months'
  return '6+ months'
}

// Fixed display/legend order (Placed last), and the color each stage maps to
// everywhere it's shown: the Aging Report's chart/cell highlights, and the
// Skills Training list's Aging filter.
export const AGING_BUCKET_ORDER: (AgingBucket | 'Placed')[] = ['0-1 month', '1-3 months', '3-6 months', '6+ months', 'Placed']

export const AGING_BUCKET_COLORS: Record<string, string> = {
  '0-1 month': '#10B981', '1-3 months': '#F59E0B', '3-6 months': '#F97316', '6+ months': '#EF4444', Placed: '#0077BE',
}
