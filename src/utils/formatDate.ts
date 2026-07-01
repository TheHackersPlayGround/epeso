/** Converts YYYY-MM-DD (or full timestamp) to MM/DD/YYYY. Returns '—' for empty/invalid values. */
export function fmtDate(d?: string | null): string {
  if (!d) return '—'
  const dateOnly = d.split('T')[0].split(' ')[0]
  const parts = dateOnly.split('-')
  if (parts.length !== 3) return d
  const [y, m, day] = parts
  return `${m}/${day}/${y}`
}
