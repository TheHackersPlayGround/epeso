// Security -> Employer Activity (administrators only): what employers did in their portal -- sign-ins and sign-outs,
// password changes, each applicant they opened and each shared document they viewed or downloaded. Read-only.
// Kept apart from Activity Logs, which records what PESO staff did.
import { useState, useMemo, useEffect, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { Download, Search, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import ConfirmModal from '../shared/ConfirmModal'
import { listEmployerActivity, type EmployerActivityEntry } from '../../services/employerPortalService'
import { logSheetExport } from '../../services/activityLogService'

// The log stores short codes; these are the words shown on screen.
const ACTION_LABELS: Record<string, string> = {
  login: 'Signed in', logout: 'Signed out', change_password: 'Changed password',
  view_applicant: 'Viewed applicant', view_document: 'Viewed document', download_document: 'Downloaded document',
}
const actionLabel = (a: string) => ACTION_LABELS[a] ?? a

function actionBadgeClass(action: string): string {
  if (action === 'login' || action === 'logout') return 'bg-gray-100 text-gray-600'
  if (action === 'change_password') return 'bg-amber-50 text-amber-700'
  if (action === 'download_document') return 'bg-indigo-50 text-indigo-700'
  if (action === 'view_document') return 'bg-blue-50 text-blue-700'
  if (action === 'view_applicant') return 'bg-green-50 text-green-700'
  return 'bg-gray-50 text-gray-600'
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts.replace(' ', 'T'))
  return isNaN(d.getTime()) ? ts : d.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
}

// What the entry was about: the applicant, and for documents the file as well.
function subject(l: EmployerActivityEntry): string {
  const doc = l.documentName ? `${l.documentType ? l.documentType + ': ' : ''}${l.documentName}` : ''
  return [l.applicantName, doc].filter(Boolean).join(' — ')
}

const selectCls = 'appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] outline-none bg-white text-gray-700 cursor-pointer'

// isActive: SecurityView keeps this tab mounted after its first visit, so the list refreshes each time the tab is shown again.
export default function EmployerActivityTab({ isActive }: { isActive: boolean }) {
  const [logs, setLogs] = useState<EmployerActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [company, setCompany] = useState('All')
  const [action, setAction] = useState('All')
  const [perPage, setPerPage] = useState(10)
  const [page, setPage] = useState(1)
  const [loadError, setLoadError] = useState(false)

  const companies = useMemo(() => ['All', ...Array.from(new Set(logs.map(l => l.company))).sort()], [logs])
  const actions = useMemo(() => ['All', ...Array.from(new Set(logs.map(l => l.action))).sort((a, b) => actionLabel(a).localeCompare(actionLabel(b)))], [logs])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return logs.filter(l =>
      (company === 'All' || l.company === company) && (action === 'All' || l.action === action) &&
      (!q || [l.company, l.account, l.applicantName ?? '', l.documentName ?? '', l.ipAddress ?? ''].some(v => v.toLowerCase().includes(q))))
  }, [logs, search, company, action])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const current = Math.min(page, totalPages)
  const paginated = filtered.slice((current - 1) * perPage, current * perPage)

  // "Loading…" only shows for the very first load; later reloads update the list quietly.
  const reload = useCallback(() => {
    listEmployerActivity().then(setLogs).catch(() => setLoadError(true)).finally(() => setLoading(false))
  }, [])
  useEffect(() => { if (isActive) reload() }, [isActive, reload])

  const handleExport = () => {
    const rows = filtered.map(l => ({
      'Timestamp': l.timestamp, 'Company': l.company, 'Account': l.account, 'Action': actionLabel(l.action),
      'Applicant': l.applicantName ?? '', 'Document': l.documentName ?? '', 'IP Address': l.ipAddress ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Employer Activity')
    XLSX.writeFile(wb, `EmployerActivity_${new Date().toISOString().split('T')[0]}.xlsx`)
    logSheetExport('security', 'Employer activity', ws, 1)
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-md overflow-hidden min-h-[75vh]">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between max-sm:flex-col max-sm:items-start max-sm:gap-2">
          <div>
            <h3 className="text-gray-800 m-0 mb-0.5">Employer Activity</h3>
            <p className="text-gray-500 text-sm m-0">{filtered.length} record{filtered.length !== 1 ? 's' : ''} found</p>
          </div>
          <button onClick={handleExport} disabled={filtered.length === 0} className="flex items-center gap-2 px-4 py-2 bg-[#0077BE] text-white rounded-lg hover:bg-[#006699] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">
            <Download size={16} />
            Export Excel
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search company, account, applicant or document..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent outline-none bg-white text-gray-900 placeholder:text-gray-400" />
          </div>
          <div className="relative">
            <select value={company} onChange={e => { setCompany(e.target.value); setPage(1) }} aria-label="Company" className={selectCls}>
              {companies.map(c => <option key={c} value={c}>{c === 'All' ? 'All Companies' : c}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={action} onChange={e => { setAction(e.target.value); setPage(1) }} aria-label="Action" className={selectCls}>
              {actions.map(a => <option key={a} value={a}>{a === 'All' ? 'All Actions' : actionLabel(a)}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">Company</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">Action</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500">Applicant / Document</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">Loading…</td></tr>
              ) : filtered.length > 0 ? paginated.map(l => (
                <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatTimestamp(l.timestamp)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-800">{l.company}</span>
                      <span className="text-xs text-blue-400">{l.account}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-xs ${actionBadgeClass(l.action)}`}>{actionLabel(l.action)}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-[420px] break-words">{subject(l) || '—'}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">{logs.length === 0 ? 'No employer activity yet. Entries appear here once employers use the Employer Portal.' : 'No employer activity matches your filters.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50 max-sm:flex-col max-sm:gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Show</span>
              <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }} className="px-2 py-1 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#0077BE] outline-none bg-white">
                <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
              </select>
              <span className="text-xs text-gray-500">per page</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(Math.max(1, current - 1))} disabled={current === 1} aria-label="Previous page" className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft size={15} /></button>
              <span className="text-xs text-gray-500 px-2">{(current - 1) * perPage + 1}–{Math.min(current * perPage, filtered.length)} of {filtered.length}</span>
              <button onClick={() => setPage(Math.min(totalPages, current + 1))} disabled={current === totalPages} aria-label="Next page" className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronRight size={15} /></button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={loadError} type="error" title="Error" message="Failed to load the employer activity. Please try again."
        onConfirm={() => setLoadError(false)} onCancel={() => setLoadError(false)}
      />
    </>
  )
}
