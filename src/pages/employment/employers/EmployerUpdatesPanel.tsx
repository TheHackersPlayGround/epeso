// "Employer Updates": what employers asked for in their portal, waiting for staff. An employer never changes the
// main data itself -- every request lands here, and only Accept applies it (the same change staff would make by hand).
import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight, Loader2, Search } from 'lucide-react'
import ConfirmModal from '../../shared/ConfirmModal'
import TablePagination from '../shared/TablePagination'
import DatePicker from '../../../components/DatePicker'
import { fmtDate, fmtDateTime } from '../../../utils/formatDate'
import { canManage } from '../../../utils/permissions'
import {
  acceptEmployerRequest, listEmployerRequests, rejectEmployerRequest,
  type EmployerRequest, type EmployerRequestStatus,
} from '../../../services/employerPortalService'

const MAX_REASON = 500
const REFRESH_MS = 30_000
const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback)
// "2026-11-10 16:50:01.66" -> "11/10/2026 4:50 PM": the date like the rest of the system, the time in 12 hours like the logs.
const fmtWhen = fmtDateTime
const today = () => new Date().toISOString().slice(0, 10)

const STATUS_STYLE: Record<EmployerRequestStatus, string> = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-600',
  Withdrawn: 'bg-gray-100 text-gray-600',
}

type Notice = { type: 'success' | 'error'; title: string; message: string }

// What the request is about, in one or two lines staff can read at a glance.
function summary(r: EmployerRequest): { title: string; sub: string } {
  if (r.type === 'company_info') return { title: 'Company details', sub: r.companyName }
  if (r.type === 'vacancy_new') return { title: 'New opening', sub: `${r.jobTitle ?? ''} · ${r.companyName}` }
  if (r.type === 'vacancy_update') return { title: 'Opening change', sub: `${r.jobTitle ?? ''} · ${r.companyName}` }
  return { title: r.applicantName ?? 'Unknown applicant', sub: `${r.jobTitle ?? ''} · ${r.companyName}` }
}

// Everything a person might type in the search box to find a request: the applicant, job, company, who sent / decided it, and the change itself.
function searchText(r: EmployerRequest): string {
  const s = summary(r)
  return [s.title, s.sub, r.companyName, r.jobTitle, r.applicantName, r.submittedBy, r.reviewedBy, r.currentStatus, r.requestedStatus,
    ...(r.changes ?? []).flatMap(c => [c.field, c.current, c.requested])]
    .filter(Boolean).join(' ').toLowerCase()
}

const shorten = (v: string, n = 90) => (v.length > n ? v.slice(0, n) + '…' : v)

const peso = (v: string) => (v !== '' && !Number.isNaN(Number(v)) ? `₱${Number(v).toLocaleString('en-PH', { maximumFractionDigits: 2 })}` : v)

function ChangeCell({ r }: { r: EmployerRequest }) {
  // A new opening is shown compactly (the job title is already in the Request column): 3 short lines instead of one line per field.
  if (r.type === 'vacancy_new') {
    const f = Object.fromEntries((r.changes ?? []).map(c => [c.field, c.requested])) as Record<string, string>
    const openings = Number(f['Openings'])
    const line1 = [f['Job type'], Number.isNaN(openings) || f['Openings'] === undefined ? '' : `${openings} opening${openings === 1 ? '' : 's'}`,
      f['Minimum salary'] ? `${peso(f['Minimum salary'])} – ${peso(f['Maximum salary'] ?? '')}` : ''].filter(Boolean).join(' · ')
    return (
      <div className="text-sm text-gray-700 max-w-md space-y-0.5">
        <p className="m-0 font-medium text-gray-900">{line1 || '—'}</p>
        <p className="m-0 break-words" title={f['Requirements']}><span className="text-gray-500">Requirements:</span> {shorten(f['Requirements'] ?? '', 70) || '—'}</p>
        {f['Description'] && <p className="m-0 break-words" title={f['Description']}><span className="text-gray-500">Description:</span> {shorten(f['Description'], 70)}</p>}
      </div>
    )
  }
  if (r.type === 'company_info' || r.type === 'vacancy_update') {
    return (
      <ul className="m-0 p-0 list-none space-y-1 max-w-md">
        {(r.changes ?? []).map(c => (
          <li key={c.field} className="text-sm text-gray-700 break-words">
            <span className="text-gray-500">{c.field}:</span>{' '}
            {c.current !== '' && <><span title={c.current}>{shorten(c.current) || '—'}</span> <span className="text-gray-400">→</span> </>}
            <span className="font-medium text-gray-900" title={c.requested}>{shorten(c.requested) || '—'}</span>
          </li>
        ))}
      </ul>
    )
  }
  return (
    <div className="text-sm text-gray-700">
      {r.currentStatus && <>{r.currentStatus} <span className="text-gray-400">→</span> </>}<span className="font-semibold text-gray-900">{r.requestedStatus ?? '—'}</span>
      {r.requestedStatus === 'Hired' && r.requestedDateHired && <p className="m-0 text-xs text-gray-500 mt-0.5">Date hired: {fmtDate(r.requestedDateHired)}</p>}
    </div>
  )
}

// The change in ONE short line for the table; the full "old -> new" list is in the details window (click the row).
function changeSummary(r: EmployerRequest): string {
  if (r.type === 'vacancy_new') {
    const f = Object.fromEntries((r.changes ?? []).map(c => [c.field, c.requested])) as Record<string, string>
    const openings = Number(f['Openings'])
    return [f['Job type'], Number.isNaN(openings) || f['Openings'] === undefined ? '' : `${openings} opening${openings === 1 ? '' : 's'}`,
      f['Minimum salary'] ? `${peso(f['Minimum salary'])} – ${peso(f['Maximum salary'] ?? '')}` : ''].filter(Boolean).join(' · ') || 'New opening'
  }
  if (r.type === 'company_info' || r.type === 'vacancy_update') {
    const ch = r.changes ?? []
    if (ch.length === 1) return `${ch[0].field}: ${ch[0].current !== '' ? `${shorten(ch[0].current, 30)} → ` : ''}${shorten(ch[0].requested, 40) || '—'}`
    return ch.length ? `Changed ${ch.map(c => c.field.toLowerCase()).join(', ')}` : 'Change'
  }
  return `${r.currentStatus ? `${r.currentStatus} → ` : ''}${r.requestedStatus ?? '—'}`
}

export default function EmployerUpdatesPanel({ signature, onChanged }: { signature: string; onChanged: () => void }) {
  const canEdit = canManage('employment')
  const [status, setStatus] = useState<EmployerRequestStatus>('Pending')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [rows, setRows] = useState<EmployerRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [acceptTarget, setAcceptTarget] = useState<EmployerRequest | null>(null)
  const [rejectTarget, setRejectTarget] = useState<EmployerRequest | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  // The request whose details window is open. Looked up in the loaded list each time, so the window always shows the current state
  // (and closes by itself if the request leaves the list, for example right after it is decided).
  const [detailId, setDetailId] = useState<number | null>(null)
  const detail = detailId !== null ? rows.find(r => r.id === detailId) ?? null : null

  // Only the answer to the latest request is used (a slow, older answer must not overwrite a newer one).
  const loadSeq = useRef(0)
  const load = useCallback(() => {
    const mine = ++loadSeq.current
    return listEmployerRequests(status)
      .then(r => { if (mine === loadSeq.current) { setRows(r); setLoadError('') } })
      .catch(e => { if (mine === loadSeq.current) setLoadError(errText(e, 'Could not load the employer updates.')) })
      .finally(() => { if (mine === loadSeq.current) setLoading(false) })
  }, [status])

  // Reload when the filter changes, and whenever the app's 5-second check sees something change.
  useEffect(() => { void load() }, [load, signature])

  // Safety net: a slower reload keeps the "can't be accepted any more" warnings current when staff change a
  // referral by hand (that doesn't change the request list itself). Paused while a dialog is open.
  const busy = acceptTarget !== null || rejectTarget !== null
  useEffect(() => {
    if (busy) return
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') void load() }, REFRESH_MS)
    return () => window.clearInterval(id)
  }, [busy, load])

  async function confirmAccept(dateHired?: string) {
    if (!acceptTarget) return
    const t = acceptTarget
    try {
      await acceptEmployerRequest(t.id, dateHired)
      setNotice({ type: 'success', title: 'Accepted', message: 'The change was applied in the system.' })
      onChanged()
    } catch (e) {
      setNotice({ type: 'error', title: 'Could not accept', message: errText(e, 'Could not accept this request.') })
    }
    setAcceptTarget(null)
    void load()
  }

  async function confirmReject(reason: string) {
    if (!rejectTarget) return
    try {
      await rejectEmployerRequest(rejectTarget.id, reason)
      setNotice({ type: 'success', title: 'Rejected', message: 'The employer will see your reason.' })
      onChanged()
    } catch (e) {
      setNotice({ type: 'error', title: 'Could not reject', message: errText(e, 'Could not reject this request.') })
    }
    setRejectTarget(null)
    void load()
  }

  // Accept / Reject only exist for Pending requests, so the Actions column is shown only in the Pending view.
  const showActions = status === 'Pending'
  const cols = showActions ? 6 : 5

  // Search, then page (the same "Show N per page" controls as the other staff tables).
  const q = search.trim().toLowerCase()
  const filtered = q ? rows.filter(r => searchText(r).includes(q)) : rows
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * perPage, currentPage * perPage)

  return (
    <div className="bg-white rounded-xl shadow-md p-4">
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <div className="relative flex-1 min-w-[14rem]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by company, applicant, job or change…" aria-label="Search employer updates"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-brand-blue placeholder:text-gray-400"
          />
        </div>
        <div className="relative">
          <select
            value={status}
            onChange={e => { setStatus(e.target.value as EmployerRequestStatus); setLoading(true); setPage(1) }}
            aria-label="Status"
            className="appearance-none pl-4 pr-8 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:border-brand-blue cursor-pointer"
          >
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Withdrawn">Withdrawn</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {loadError && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{loadError}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left table-fixed min-w-[960px]">
          {/* Fixed shares so the columns are evenly spaced; the last column no longer soaks up all the spare width. */}
          <colgroup>
            {(showActions ? [24, 25, 15, 12, 18, 6] : [28, 29, 17, 20, 6]).map((w, i) => <col key={i} style={{ width: `${w}%` }} />)}
          </colgroup>
          <thead>
            <tr className="bg-brand-blue">
              <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Request</th>
              <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Change</th>
              <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Sent</th>
              <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Status</th>
              {showActions && <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Actions</th>}
              <th className="px-2 py-3"><span className="sr-only">Details</span></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={cols} className="py-16 text-center text-sm text-gray-400"><Loader2 size={18} className="inline animate-spin mr-2" />Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={cols} className="py-16 text-center text-gray-400">
                  {q ? (
                    <>
                      <p className="m-0 text-base font-medium text-gray-500">No updates match your search</p>
                      <p className="m-0 text-sm mt-1">Try a different company, applicant or word.</p>
                    </>
                  ) : (
                    <>
                      <p className="m-0 text-base font-medium text-gray-500">{status === 'Pending' ? 'Nothing waiting for review' : `No ${status.toLowerCase()} requests`}</p>
                      {status === 'Pending' && <p className="m-0 text-sm mt-1">Requests from employers appear here as soon as they are sent.</p>}
                    </>
                  )}
                </td>
              </tr>
            ) : paged.map(r => {
              const s = summary(r)
              return (
                <tr
                  key={r.id} onClick={() => setDetailId(r.id)}
                  onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) setDetailId(r.id) }}
                  tabIndex={0} aria-label={`Open details: ${s.title}, ${s.sub}`}
                  className="border-b border-gray-100 align-top hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <p className="m-0 text-sm font-medium text-gray-800">{s.title}</p>
                    <p className="m-0 text-xs text-gray-500 mt-0.5">{s.sub}</p>
                    {(r.duplicates ?? []).length > 0 && (
                      <p className="m-0 mt-1.5 text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-md px-2 py-1 inline-flex items-start gap-1.5">
                        <AlertTriangle size={13} className="mt-0.5 shrink-0" />Possible duplicate: {r.companyName} already has {(r.duplicates ?? []).map(d => `“${d.jobTitle}” (${d.status})`).join(', ')}
                      </p>
                    )}
                    {r.conflict && (
                      <p className="m-0 mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 inline-flex items-start gap-1.5">
                        <AlertTriangle size={13} className="mt-0.5 shrink-0" />{r.conflict}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 break-words">{changeSummary(r)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {fmtWhen(r.submittedAt)}
                    {r.submittedBy && <p className="m-0 text-xs text-gray-400 mt-0.5">by {r.submittedBy}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                    {r.status !== 'Pending' && r.status !== 'Withdrawn' && (
                      <p className="m-0 text-xs text-gray-400 mt-1">{r.reviewedBy ? `by ${r.reviewedBy}` : ''}{r.reviewedAt ? ` · ${fmtWhen(r.reviewedAt)}` : ''}</p>
                    )}
                  </td>
                  {showActions && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      {canEdit ? (
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); setAcceptTarget(r) }}
                            disabled={!!r.conflict}
                            title={r.conflict ?? undefined}
                            className="px-3.5 py-1.5 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-brand-blue"
                          >Accept</button>
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); setRejectTarget(r) }}
                            className="px-3.5 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-xs font-medium"
                          >Reject</button>
                        </div>
                      ) : <span className="text-xs text-gray-400">View only</span>}
                    </td>
                  )}
                  <td className="px-2 py-3 text-gray-400 align-middle"><ChevronRight size={16} aria-hidden="true" /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <TablePagination
        currentPage={currentPage} totalItems={filtered.length} onPageChange={setPage}
        itemsPerPage={perPage} onItemsPerPageChange={n => { setPerPage(n); setPage(1) }}
      />

      {detail && (
        <RequestDetailDialog
          row={detail} canEdit={canEdit} onClose={() => setDetailId(null)}
          onAccept={() => { setDetailId(null); setAcceptTarget(detail) }}
          onReject={() => { setDetailId(null); setRejectTarget(detail) }}
        />
      )}
      {acceptTarget && <AcceptDialog row={acceptTarget} onCancel={() => setAcceptTarget(null)} onConfirm={confirmAccept} />}
      {rejectTarget && <RejectDialog row={rejectTarget} onCancel={() => setRejectTarget(null)} onConfirm={confirmReject} />}
      <ConfirmModal
        isOpen={notice !== null} type={notice?.type ?? 'success'} title={notice?.title ?? ''} message={notice?.message ?? ''}
        confirmText="OK" onConfirm={() => setNotice(null)} onCancel={() => setNotice(null)}
      />
    </div>
  )
}

// Everything about one request: the full change, who sent it and when, the decision, and (while it is pending) Accept / Reject.
function RequestDetailDialog({ row, canEdit, onClose, onAccept, onReject }: {
  row: EmployerRequest; canEdit: boolean; onClose: () => void; onAccept: () => void; onReject: () => void
}) {
  const s = summary(row)
  const decided = row.status !== 'Pending' && row.status !== 'Withdrawn'
  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-label={`${s.title}: ${s.sub}`}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-800 m-0 break-words">{s.title}</h3>
            <p className="m-0 text-sm text-gray-500 mt-0.5 break-words">{s.sub}</p>
          </div>
          <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[row.status]}`}>{row.status}</span>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          {(row.duplicates ?? []).length > 0 && (
            <p className="m-0 text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-md px-2 py-1.5 flex items-start gap-1.5">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />Possible duplicate: {row.companyName} already has {(row.duplicates ?? []).map(d => `“${d.jobTitle}” (${d.status})`).join(', ')}
            </p>
          )}
          {row.conflict && (
            <p className="m-0 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 flex items-start gap-1.5">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />{row.conflict}
            </p>
          )}
          <div>
            <p className="m-0 mb-1 text-xs uppercase tracking-wide text-gray-900 font-semibold">Change</p>
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2"><ChangeCell r={row} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <div>
              <p className="m-0 mb-1 text-xs uppercase tracking-wide text-gray-900 font-semibold">Sent</p>
              <p className="m-0 text-sm text-gray-700">{fmtWhen(row.submittedAt)}</p>
              {row.submittedBy && <p className="m-0 text-xs text-gray-500">by {row.submittedBy}</p>}
            </div>
            {decided && (
              <div>
                <p className="m-0 mb-1 text-xs uppercase tracking-wide text-gray-900 font-semibold">{row.status}</p>
                <p className="m-0 text-sm text-gray-700">{row.reviewedAt ? fmtWhen(row.reviewedAt) : '—'}</p>
                {row.reviewedBy && <p className="m-0 text-xs text-gray-500">by {row.reviewedBy}</p>}
              </div>
            )}
          </div>
          {row.status === 'Rejected' && row.reviewNote && (
            <div>
              <p className="m-0 mb-1 text-xs uppercase tracking-wide text-gray-900 font-semibold">Reason given to the employer</p>
              <p className="m-0 text-sm text-gray-700 break-words whitespace-pre-line">{row.reviewNote}</p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">Close</button>
          {row.status === 'Pending' && canEdit && (
            <>
              <button type="button" onClick={onReject} className="px-5 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium">Reject</button>
              <button
                type="button" onClick={onAccept} disabled={!!row.conflict} title={row.conflict ?? undefined}
                className="px-5 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-brand-blue"
              >Accept</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Confirms an accept. For a hire, staff can adjust the date the employer proposed before it becomes a placement.
function AcceptDialog({ row, onCancel, onConfirm }: { row: EmployerRequest; onCancel: () => void; onConfirm: (dateHired?: string) => Promise<void> }) {
  const isHire = row.type === 'referral_status' && row.requestedStatus === 'Hired'
  const [date, setDate] = useState(row.requestedDateHired || today())
  const [saving, setSaving] = useState(false)
  const s = summary(row)

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 m-0">Accept this update?</h3>
        </div>
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-gray-600 m-0">
            <span className="font-semibold text-gray-900">{s.title}</span> <span className="text-gray-400">·</span> {s.sub}
          </p>
          <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2"><ChangeCell r={row} /></div>
          {isHire && (
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-900 font-semibold mb-1">Date hired</label>
              <DatePicker
                id="accept-date-hired" max={today()} value={date} onChange={setDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none"
              />
              <p className="m-0 text-xs text-gray-500 mt-1">The employer proposed this date. You can change it. Accepting creates the placement.</p>
            </div>
          )}
          {!isHire && <p className="m-0 text-xs text-gray-500">{row.type === 'vacancy_new' ? 'Accepting creates this opening now. It is marked as requested by the employer.' : 'Accepting applies this change in the system now.'}</p>}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={saving} className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50">Cancel</button>
          <button
            type="button" disabled={saving || (isHire && !date)}
            onClick={() => { setSaving(true); void onConfirm(isHire ? date : undefined) }}
            className="px-5 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
          >{saving && <Loader2 size={15} className="animate-spin" />}Accept</button>
        </div>
      </div>
    </div>
  )
}

// Asks for the reason (required, shown to the employer) before rejecting.
function RejectDialog({ row, onCancel, onConfirm }: { row: EmployerRequest; onCancel: () => void; onConfirm: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const s = summary(row)

  const submit = async () => {
    const why = reason.trim()
    if (why.length < 3) { setError('Please enter the reason for rejecting this request.'); return }
    setSaving(true)
    await onConfirm(why)
  }

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 m-0">Reject this update</h3>
        </div>
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-gray-600 m-0">
            Reject the request about <span className="font-semibold text-gray-900">{s.title}</span> from {row.companyName}? Nothing will change in the system.
          </p>
          <div>
            <label className="block text-xs uppercase tracking-wide text-gray-900 font-semibold mb-1">Reason <span className="text-red-500">*</span></label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none resize-none"
              rows={3}
              maxLength={MAX_REASON}
              value={reason}
              onChange={e => { setReason(e.target.value); setError('') }}
              placeholder="e.g. The applicant has not been interviewed yet"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{reason.length}/{MAX_REASON}</p>
          </div>
          {error && <p className="text-red-500 text-sm m-0">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={saving} className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50">Cancel</button>
          <button type="button" onClick={() => void submit()} disabled={saving} className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2">
            {saving && <Loader2 size={15} className="animate-spin" />}Reject
          </button>
        </div>
      </div>
    </div>
  )
}
