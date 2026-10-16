/** Converts YYYY-MM-DD (or full timestamp) to MM/DD/YYYY. Returns '—' for empty/invalid values. */
export function fmtDate(d?: string | null): string {
  if (!d) return '—'
  const dateOnly = d.split('T')[0].split(' ')[0]
  const parts = dateOnly.split('-')
  if (parts.length !== 3) return d
  const [y, m, day] = parts
  return `${m}/${day}/${y}`
}

/** Today's date as yyyy-mm-dd in the user's local time (for date inputs' `max`). */
export function todayIso(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
