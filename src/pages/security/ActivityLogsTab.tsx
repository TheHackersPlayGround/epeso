import { useState, useMemo, useEffect, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { Download, Search, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import ConfirmModal from '../shared/ConfirmModal'
import { listActivityLogs } from '../../services/activityLogService'

interface ActivityLog {
  id: number
  timestamp: string
  user: string
  role: string
  action: string
  module: string
  details: string
  status: 'Success' | 'Failed'
}

// Backend module values are the same lowercase permission slugs used across the
// app (e.g. 'cdsp', 'cdsp-maintenance', 'system') — mapped here to readable
// labels for display/filtering. Falls back to the raw slug for anything unmapped.
const MODULE_LABELS: Record<string, string> = {
  system: 'System', security: 'Security', report: 'Report', documents: 'Documents',
  employment: 'Employment Facilitation', ofw: 'OFW',
  cdsp: 'CDSP Records', 'cdsp-maintenance': 'CDSP Maintenance',
  gip: 'GIP Records', 'gip-maintenance': 'GIP Maintenance',
  spes: 'SPES Records', 'spes-maintenance': 'SPES Maintenance',
  livelihood: 'Livelihood Records', 'livelihood-maintenance': 'Livelihood Maintenance',
  skills: 'Skills Training Records', 'skills-maintenance': 'Skills Training Maintenance',
}
function formatModule(slug: string): string {
  return MODULE_LABELS[slug] ?? slug
}

// Colors the action badge by verb prefix rather than an exact-match list, since
// the real action vocabulary (Create/Update/Delete Profile|Batch|Activity|...)
// is far larger than any fixed set.
function actionBadgeClass(action: string): string {
  if (action === 'Login' || action === 'Logout') return 'bg-gray-100 text-gray-600'
  if (/^(Create|Add)\b/.test(action)) return 'bg-green-50 text-green-700'
  if (/^(Update|Edit)\b/.test(action)) return 'bg-blue-50 text-blue-700'
  if (/^(Delete|Purge)\b/.test(action)) return 'bg-red-50 text-red-700'
  if (/^Restore\b/.test(action)) return 'bg-teal-50 text-teal-700'
  return 'bg-gray-50 text-gray-600'
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts.replace(' ', 'T'))
  return isNaN(d.getTime()) ? ts : d.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
}

const logStatuses = ['All', 'Success', 'Failed']

// isActive: SecurityView keeps this tab mounted after its first visit, so the
// log refreshes itself each time the tab is shown again.
interface ActivityLogsTabProps {
  isActive: boolean
}

export default function ActivityLogsTab({ isActive }: ActivityLogsTabProps) {
  const [logs,        setLogs]        = useState<ActivityLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [logSearch,       setLogSearch]       = useState('')
  const [logActionFilter, setLogActionFilter] = useState('All')
  const [logModuleFilter, setLogModuleFilter] = useState('All')
  const [logStatusFilter, setLogStatusFilter] = useState('All')
  const [logsPerPage,     setLogsPerPage]     = useState(10)
  const [logPage,         setLogPage]         = useState(1)

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; type: 'confirm' | 'success' | 'error'
    title: string; message: string; confirmText?: string; cancelText?: string; onConfirm: () => void
  }>({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: () => {} })

  // Filter option lists are derived from the real data rather than hardcoded,
  // since the actual action/module vocabulary (Create/Update/Delete Profile|
  // Batch|Activity across a dozen modules) is far larger than any fixed set.
  const logActions = useMemo(() => ['All', ...Array.from(new Set(logs.map(l => l.action))).sort()], [logs])
  const logModules = useMemo(() => ['All', ...Array.from(new Set(logs.map(l => l.module))).sort()], [logs])

  const filteredLogs = useMemo(() => logs.filter(log => {
    const matchSearch = logSearch === '' || log.user.toLowerCase().includes(logSearch.toLowerCase()) || log.details.toLowerCase().includes(logSearch.toLowerCase())
    return matchSearch && (logActionFilter === 'All' || log.action === logActionFilter) && (logModuleFilter === 'All' || log.module === logModuleFilter) && (logStatusFilter === 'All' || log.status === logStatusFilter)
  }), [logs, logSearch, logActionFilter, logModuleFilter, logStatusFilter])

  const totalLogPages = Math.max(1, Math.ceil(filteredLogs.length / logsPerPage))
  const paginatedLogs = filteredLogs.slice((logPage - 1) * logsPerPage, logPage * logsPerPage)

  useEffect(() => { setLogPage(1) }, [logSearch, logActionFilter, logModuleFilter, logStatusFilter])

  // "Loading…" only shows for the very first load (logsLoading starts true).
  // Later reloads update the list quietly, with no flash.
  const reloadLogs = useCallback(async () => {
    try {
      const res = await listActivityLogs()
      setLogs(res.data ?? [])
    } catch {
      setConfirmModal({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to load activity logs. Please try again.', onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) })
    } finally {
      setLogsLoading(false)
    }
  }, [])

  // Loads when the tab is first opened and again every time it is shown, so entries
  // written by Recycle Bin actions elsewhere show up without a page refresh.
  useEffect(() => { if (isActive) reloadLogs() }, [isActive, reloadLogs])

  const handleExportLogs = () => {
    const rows = filteredLogs.map(l => ({
      'Timestamp': l.timestamp, 'User': l.user, 'Role': l.role,
      'Action': l.action, 'Module': l.module, 'Details': l.details, 'Status': l.status,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Activity Logs')
    XLSX.writeFile(wb, `ActivityLogs_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <>
        <div className="bg-white rounded-xl shadow-md overflow-hidden min-h-[75vh]">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-gray-800 m-0 mb-0.5">Activity Logs</h3>
              <p className="text-gray-500 text-sm m-0">{filteredLogs.length} record{filteredLogs.length !== 1 ? 's' : ''} found</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleExportLogs} className="flex items-center gap-2 px-4 py-2 bg-[#0077BE] text-white rounded-lg hover:bg-[#006699] transition-colors text-sm">
                <Download size={16} />
                Export Excel
              </button>
            </div>
          </div>

          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search user or details..." value={logSearch} onChange={e => setLogSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent outline-none bg-white text-gray-900 placeholder:text-gray-400" />
            </div>
            <div className="relative">
              <select value={logActionFilter} onChange={e => setLogActionFilter(e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] outline-none bg-white text-gray-700 cursor-pointer">
                {logActions.map(a => <option key={a} value={a}>{a === 'All' ? 'All Actions' : a}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={logModuleFilter} onChange={e => setLogModuleFilter(e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] outline-none bg-white text-gray-700 cursor-pointer">
                {logModules.map(m => <option key={m} value={m}>{m === 'All' ? 'All Modules' : formatModule(m)}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={logStatusFilter} onChange={e => setLogStatusFilter(e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] outline-none bg-white text-gray-700 cursor-pointer">
                {logStatuses.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">User</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">Action</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">Module</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500">Details</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {logsLoading ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">Loading…</td></tr>
                ) : filteredLogs.length > 0 ? paginatedLogs.map(log => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatTimestamp(log.timestamp)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-800">{log.user}</span>
                        <span className={`text-xs ${log.role === 'Administrator' ? 'text-purple-500' : 'text-blue-400'}`}>{log.role}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-xs ${actionBadgeClass(log.action)}`}>{log.action}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{formatModule(log.module)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[240px]">{log.details}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${log.status === 'Success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{log.status}</span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">No activity logs match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalLogPages > 1 && (
            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Show</span>
                <select value={logsPerPage} onChange={e => { setLogsPerPage(Number(e.target.value)); setLogPage(1) }} className="px-2 py-1 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#0077BE] outline-none bg-white">
                  <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
                </select>
                <span className="text-xs text-gray-500">per page</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setLogPage(p => Math.max(1, p - 1))} disabled={logPage === 1} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft size={15} /></button>
                <span className="text-xs text-gray-500 px-2">{(logPage - 1) * logsPerPage + 1}–{Math.min(logPage * logsPerPage, filteredLogs.length)} of {filteredLogs.length}</span>
                <button onClick={() => setLogPage(p => Math.min(totalLogPages, p + 1))} disabled={logPage === totalLogPages} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronRight size={15} /></button>
              </div>
            </div>
          )}
        </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen} type={confirmModal.type} title={confirmModal.title}
        message={confirmModal.message} confirmText={confirmModal.confirmText} cancelText={confirmModal.cancelText}
        onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  )
}
