/** Converts YYYY-MM-DD to MM/DD/YYYY. Returns '—' for empty/invalid values. */
export function fmtDate(d?: string | null): string {
  if (!d) return '—'
  const parts = d.split('-')
  if (parts.length !== 3) return d
  const [y, m, day] = parts
  return `${m}/${day}/${y}`
}
