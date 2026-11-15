/** Converts YYYY-MM-DD (or full timestamp) to MM/DD/YYYY. Returns '—' for empty/invalid values. */
export function fmtDate(d?: string | null): string {
  if (!d) return '—'
  const dateOnly = d.split('T')[0].split(' ')[0]
  const parts = dateOnly.split('-')
  if (parts.length !== 3) return d
  const [y, m, day] = parts
  return `${m}/${day}/${y}`
}

/** Converts a timestamp ("2026-11-14 16:44:01") to "11/14/2026 4:44 PM": the date like fmtDate, the time in 12 hours. A date with no time gives just the date. */
export function fmtDateTime(d?: string | null): string {
  if (!d) return '—'
  const m = /^(\d{2}):(\d{2})/.exec(d.slice(11, 16))
  if (!m) return fmtDate(d)
  const h = Number(m[1])
  return `${fmtDate(d)} ${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`
}

/** Today's date as yyyy-mm-dd in the user's local time (for date inputs' `max`). */
export function todayIso(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
