// Makes the dates in an exported spreadsheet real Excel dates shown as mm/dd/yyyy (so they sort and filter as dates, and don't follow
// each computer's region setting). Cells whose text looks like a date ("2005-05-30", "05/30/2005") or a date with a time
// ("2026-11-14 16:44:01") are converted; every other cell is left alone. Works on a SheetJS workbook, and returns it so it can wrap writeFile.
type Cell = { t?: string; v?: unknown; z?: string; w?: string }
type Book = { Sheets: Record<string, Record<string, unknown>> }

const ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/
const MDY = /^(\d{2})\/(\d{2})\/(\d{4})$/
const DATE_FMT = 'mm/dd/yyyy'
const DATE_TIME_FMT = 'mm/dd/yyyy h:mm AM/PM'

function realDate(y: number, m: number, d: number) {
  const t = new Date(Date.UTC(y, m - 1, d))
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d && y >= 1900
}

/** Reads "2005-05-30", "05/30/2005" or "2026-11-14 16:44:01" as a date (UTC, so the time shown is the time written); null for anything else. */
export function parseDateText(text: string): { date: Date; hasTime: boolean } | null {
  const s = text.trim()
  const iso = ISO.exec(s)
  const mdy = MDY.exec(s)
  let y: number, m: number, d: number, hh = 0, mi = 0, ss = 0, hasTime = false
  if (iso && (s.length === 10 || s.length >= 16)) {
    y = +iso[1]; m = +iso[2]; d = +iso[3]
    if (iso[4]) { hasTime = true; hh = +iso[4]; mi = +iso[5]; ss = +(iso[6] ?? 0) }
  } else if (mdy) {
    m = +mdy[1]; d = +mdy[2]; y = +mdy[3]
  } else return null
  if (!realDate(y, m, d)) return null
  return { date: new Date(Date.UTC(y, m - 1, d, hh, mi, ss)), hasTime }
}

export const EXCEL_DATE_FORMAT = DATE_FMT
export const EXCEL_DATE_TIME_FORMAT = DATE_TIME_FMT

export function withDateCells<T extends Book>(wb: T): T {
  for (const ws of Object.values(wb.Sheets)) {
    for (const [addr, raw] of Object.entries(ws)) {
      if (addr.startsWith('!')) continue
      const c = raw as Cell
      if (c.t !== 's' || typeof c.v !== 'string') continue
      const dt = parseDateText(c.v)
      if (!dt) continue
      c.t = 'n'
      c.v = dt.date.getTime() / 86400000 + 25569
      c.z = dt.hasTime ? DATE_TIME_FMT : DATE_FMT
      delete c.w
    }
  }
  return wb
}
