// A date-range filter keeps its value in a shared string-valued filter state as
// "yyyy-mm-dd|yyyy-mm-dd" (either side may be empty); empty when neither is set.

export function splitDateRange(value: string | undefined): { from: string; to: string } {
  const [from = '', to = ''] = (value ?? '').split('|')
  return { from, to }
}

export function joinDateRange(from: string, to: string): string {
  return from || to ? `${from}|${to}` : ''
}

/** Inclusive range check. A record with no date never matches an active range. */
export function inDateRange(date: string | null | undefined, value: string | undefined): boolean {
  const { from, to } = splitDateRange(value)
  if (!from && !to) return true
  const d = (date ?? '').slice(0, 10)
  return !!d && (!from || d >= from) && (!to || d <= to)
}
