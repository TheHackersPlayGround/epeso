// Shared helpers: formatting, button/input classes, and the data loader hook.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PortalRequest } from './api'
import { fmtDate as systemDate, fmtDateTime } from '../utils/formatDate'   // the staff system's date format, so both sides always match

export const errText = (e: unknown, fallback = 'Something went wrong. Please try again.') => (e instanceof Error && e.message ? e.message : fallback)
// "2026-11-14" -> "11/14/2026"
export const fmtDate = (v: string | null | undefined) => systemDate(v)
// "2026-11-14 16:44:01" -> "11/14/2026 4:44 PM" (the date like the rest of the system, the time in 12 hours like the logs)
export const fmtWhen = (v: string | null | undefined) => fmtDateTime(v)
export const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const FIELD_LABELS: Record<string, string> = {
  contactPersonName: 'Contact person', contactPersonPosition: 'Position', contactNumber: 'Contact number',
  emailAddress: 'Email', buildingNo: 'Building no.', street: 'Street',
  jobTitle: 'Job title', jobType: 'Job type', description: 'Description', requirements: 'Requirements',
  salaryMin: 'Minimum salary', salaryMax: 'Maximum salary', slotsTotal: 'Openings', status: 'Status',
}

// A requested value, written for people (salaries with the peso sign and thousands).
export const fmtChangeValue = (key: string, v: string | number) =>
  (key === 'salaryMin' || key === 'salaryMax') && !Number.isNaN(Number(v)) ? `₱${Number(v).toLocaleString('en-PH', { maximumFractionDigits: 2 })}` : String(v)

// What a request is about, in one line.
export const requestTitle = (r: PortalRequest) =>
  r.type === 'company_info' ? 'Company details'
    : r.type === 'vacancy_new' ? 'New opening'
    : r.type === 'vacancy_update' ? 'Opening change'
    : r.applicantName ?? 'Applicant'

const cutText = (v: string, max = 64) => (v.length > max ? v.slice(0, max) + '…' : v)

// What kind of request it is: always the first line of a request in a list.
export const requestKind = (r: PortalRequest) =>
  r.type === 'referral_status' ? 'Referral'
    : r.type === 'placement_status' ? 'Placement'
    : r.type === 'vacancy_new' ? 'New opening'
    : r.type === 'vacancy_update' ? 'Opening change'
    : 'Company details'

// Who or what it is about, for the second (small) line: the applicant and the position, or the job title.
export const requestSubject = (r: PortalRequest) =>
  r.type === 'referral_status' || r.type === 'placement_status' ? [r.applicantName, r.jobTitle].filter(Boolean).join(' · ')
    : r.type === 'company_info' ? '' : (r.jobTitle ?? '')

// One short line saying what the request was about (the full details are in My Requests).
export function requestSummary(r: PortalRequest): string {
  const c = (r.changes ?? {}) as Record<string, string | number>
  if (r.type === 'referral_status' || r.type === 'placement_status') return `${r.type === 'placement_status' ? 'Employment' : 'Referral'} marked ${r.requestedStatus ?? '—'}`
  if (r.type === 'vacancy_new') {
    const n = c.slotsTotal !== undefined ? Number(c.slotsTotal) : NaN
    const parts = [r.jobTitle ?? c.jobTitle, Number.isNaN(n) ? '' : `${n} opening${n === 1 ? '' : 's'}`,
      c.salaryMin !== undefined ? `${fmtChangeValue('salaryMin', c.salaryMin)} – ${fmtChangeValue('salaryMax', c.salaryMax ?? '')}` : '']
    return cutText(parts.filter(Boolean).join(' · '))
  }
  // company details / changes to an opening: which fields were asked to change
  const fields = Object.keys(c).filter(k => k !== 'jobTitle' || r.type === 'vacancy_update').map(k => FIELD_LABELS[k] ?? k)
  const what = fields.length ? `changed ${fields.join(', ').toLowerCase()}` : 'changes'
  return cutText(r.type === 'vacancy_update' && r.jobTitle ? `${r.jobTitle} · ${what}` : what.charAt(0).toUpperCase() + what.slice(1))
}

export const btnPrimary = 'px-5 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark text-sm font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2'
export const btnGhost = 'px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50'
export const btnSmall = 'px-3 py-1 rounded-lg text-xs font-medium disabled:opacity-40'
export const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none'
export const labelCls = 'block text-xs uppercase tracking-wide text-gray-900 font-semibold mb-1'

// Pages a list like the staff tables ("Show 10 / 25 / 50 per page"). The page goes back to 1 when resetKey changes (a new search or filter)
// and never points past the last page when the list shrinks (the data refreshes by itself).
export function usePaged<T>(rows: T[], resetKey: string) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [seenKey, setSeenKey] = useState(resetKey)
  if (seenKey !== resetKey) { setSeenKey(resetKey); setPage(1) }   // a new search/filter starts from page 1
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage))
  const current = Math.min(page, totalPages)
  const paged = useMemo(() => rows.slice((current - 1) * perPage, current * perPage), [rows, current, perPage])
  return { paged, page: current, setPage, perPage, setPerPage: (n: number) => { setPerPage(n); setPage(1) }, total: rows.length }
}

// Loads data and reloads it whenever `tick` changes (the shell bumps it every few seconds) or reload() is called.
// While reloading, the old data stays on screen (no flicker).
export function useData<T>(fn: () => Promise<T>, tick: number) {
  const [state, setState] = useState<{ data: T | null; error: string; loading: boolean }>({ data: null, error: '', loading: true })
  const [manual, setManual] = useState(0)
  const seq = useRef(0)
  useEffect(() => {
    const mine = ++seq.current
    fn()
      .then(d => { if (mine === seq.current) setState({ data: d, error: '', loading: false }) })
      .catch(e => { if (mine === seq.current) setState(s => ({ ...s, error: errText(e, 'Could not load this page.'), loading: false })) })
  }, [fn, tick, manual])
  const reload = useCallback(() => setManual(n => n + 1), [])
  return { ...state, reload }
}
