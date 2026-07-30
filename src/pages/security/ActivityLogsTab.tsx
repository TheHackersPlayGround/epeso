import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Download, Search, ChevronDown, ChevronLeft, ChevronRight,
  Trash, Trash2, RotateCcw, Clock, AlertTriangle,
} from 'lucide-react'
import ConfirmModal from '../shared/ConfirmModal'
import { listActivityLogs } from '../../services/activityLogService'
import { listDeleted, restoreRecord, purgeRecord, type RecycleBinRecord } from '../../services/recycleBinService'
import { useGIP } from '../../contexts/GIPContext'
import { useCDSP } from '../../contexts/CDSPContext'
import { useSPES } from '../../contexts/SPESContext'
import { useDILP } from '../../contexts/DILPContext'
import { useTUPAD } from '../../contexts/TUPADContext'
import { useSLP } from '../../contexts/SLPContext'
import { useCLPEP } from '../../contexts/CLPEPContext'
import { useSkillsTraining } from '../../contexts/SkillsTrainingContext'
import { useOFW } from '../../contexts/OFWContext'

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

// The recycle bin shows real soft-deleted records from every module that
// supports soft delete: Employment Facilitation (applicants, employers,
// referrals), GIP (applicants), CDSP (applicants), SPES (applicants), and
// DILP/TUPAD (beneficiaries). Other modules don't have soft delete yet, so
// they won't appear here until they do.
type RecycleBinItem = RecycleBinRecord

// Days left before the (display-only) 30-day window elapses, from the real date.
function getDaysRemaining(deletedAt: string): number {
  const deleted = new Date(deletedAt)
  const diff = Math.floor((Date.now() - deleted.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, 30 - diff)
}

const logStatuses = ['All', 'Success', 'Failed']
const binModules  = [
  'All', 'Applicants', 'Employers', 'Referrals',
  'GIP Applicants', 'GIP Batches',
  'CDSP Applicants', 'CDSP Services', 'CDSP Activities',
  'SPES Applicants', 'SPES Batches',
  'DILP Beneficiaries', 'DILP Projects',
  'TUPAD Beneficiaries', 'TUPAD Projects',
  'SLP Beneficiaries', 'SLP Projects',
  'CLPEP Beneficiaries', 'CLPEP Interventions',
  'Skills Training Applicants', 'Skills Training Batches', 'Skills Training Activities',
  'OFW Profiles',
]

// Colors the recycle bin's Module badge — records and their program's
// Maintenance-level entities (batches/projects/activities/interventions)
// share one color per program, so the family is recognizable at a glance.
const BIN_MODULE_BADGE: Record<string, string> = {
  'Applicants': 'bg-blue-50 text-blue-700',
  'Employers': 'bg-purple-50 text-purple-700',
  'Referrals': 'bg-amber-50 text-amber-700',
  'GIP Applicants': 'bg-sky-50 text-sky-700',
  'GIP Batches': 'bg-sky-50 text-sky-700',
  'CDSP Applicants': 'bg-teal-50 text-teal-700',
  'CDSP Services': 'bg-teal-50 text-teal-700',
  'CDSP Activities': 'bg-teal-50 text-teal-700',
  'SPES Applicants': 'bg-indigo-50 text-indigo-700',
  'SPES Batches': 'bg-indigo-50 text-indigo-700',
  'DILP Beneficiaries': 'bg-emerald-50 text-emerald-700',
  'DILP Projects': 'bg-emerald-50 text-emerald-700',
  'TUPAD Beneficiaries': 'bg-orange-50 text-orange-700',
  'TUPAD Projects': 'bg-orange-50 text-orange-700',
  'SLP Beneficiaries': 'bg-cyan-50 text-cyan-700',
  'SLP Projects': 'bg-cyan-50 text-cyan-700',
  'CLPEP Beneficiaries': 'bg-rose-50 text-rose-700',
  'CLPEP Interventions': 'bg-rose-50 text-rose-700',
  'Skills Training Applicants': 'bg-lime-50 text-lime-700',
  'Skills Training Batches': 'bg-lime-50 text-lime-700',
  'Skills Training Activities': 'bg-lime-50 text-lime-700',
  'OFW Profiles': 'bg-fuchsia-50 text-fuchsia-700',
}

export default function ActivityLogsTab() {
  const { refreshProfiles: refreshGipProfiles, refreshBatches: refreshGipBatches } = useGIP()
  const { refreshProfiles: refreshCdspProfiles, refreshActivities: refreshCdspActivities, refreshServices: refreshCdspServices } = useCDSP()
  const { refreshProfiles: refreshSpesProfiles, refreshBatches: refreshSpesBatches } = useSPES()
  const { refreshProfiles: refreshDilpProfiles, refreshProjects: refreshDilpProjects } = useDILP()
  const { refreshProfiles: refreshTupadProfiles, refreshProjects: refreshTupadProjects } = useTUPAD()
  const { refreshProfiles: refreshSlpProfiles, refreshProjects: refreshSlpProjects } = useSLP()
  const { refreshProfiles: refreshClpepProfiles, refreshInterventions: refreshClpepInterventions } = useCLPEP()
  const { refreshProfiles: refreshSkillsTrainingProfiles, refreshBatches: refreshSkillsTrainingBatches, refreshActivities: refreshSkillsTrainingActivities } = useSkillsTraining()
  const { refreshProfiles: refreshOfwProfiles } = useOFW()
  const [subTab, setSubTab] = useState<'logs' | 'bin'>('logs')

  const [logs,        setLogs]        = useState<ActivityLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [logSearch,       setLogSearch]       = useState('')
  const [logActionFilter, setLogActionFilter] = useState('All')
  const [logModuleFilter, setLogModuleFilter] = useState('All')
  const [logStatusFilter, setLogStatusFilter] = useState('All')
  const [logsPerPage,     setLogsPerPage]     = useState(10)
  const [logPage,         setLogPage]         = useState(1)

  const [recycleBin,    setRecycleBin]    = useState<RecycleBinItem[]>([])
  const [binLoading,    setBinLoading]    = useState(true)
  const [binPerPage,    setBinPerPage]    = useState(10)
  const [binPage,       setBinPage]       = useState(1)
  const [binModuleFilter, setBinModuleFilter] = useState('All')
  const [binSearch,     setBinSearch]     = useState('')

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

  const filteredBin = useMemo(() => recycleBin.filter(item => {
    const matchModule = binModuleFilter === 'All' || item.module === binModuleFilter
    const matchSearch = binSearch === '' || item.name.toLowerCase().includes(binSearch.toLowerCase()) || item.description.toLowerCase().includes(binSearch.toLowerCase())
    return matchModule && matchSearch
  }), [recycleBin, binModuleFilter, binSearch])

  const totalBinPages = Math.max(1, Math.ceil(filteredBin.length / binPerPage))
  const paginatedBin  = filteredBin.slice((binPage - 1) * binPerPage, binPage * binPerPage)
  const expiringDaysLeft = recycleBin.map(i => getDaysRemaining(i.deletedAt)).filter(d => d <= 7)
  const expiringCount = expiringDaysLeft.length
  // The banner's wording should reflect the most urgent item's real countdown,
  // not the fixed 7-day threshold used to decide whether to show it at all.
  const soonestExpiry = expiringCount > 0 ? Math.min(...expiringDaysLeft) : 0

  useEffect(() => { setLogPage(1) }, [logSearch, logActionFilter, logModuleFilter, logStatusFilter])
  useEffect(() => { setBinPage(1) }, [binModuleFilter, binSearch])

  const reloadLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const res = await listActivityLogs()
      setLogs(res.data ?? [])
    } catch {
      setConfirmModal({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to load activity logs. Please try again.', onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) })
    } finally {
      setLogsLoading(false)
    }
  }, [])

  useEffect(() => { reloadLogs() }, [reloadLogs])

  const reloadBin = useCallback(async () => {
    setBinLoading(true)
    try {
      setRecycleBin(await listDeleted())
    } catch {
      setConfirmModal({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to load the recycle bin. Please try again.', onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) })
    } finally {
      setBinLoading(false)
    }
  }, [])

  useEffect(() => { reloadBin() }, [reloadBin])

  const handleExportLogs = () => {
    const rows = [['Timestamp', 'User', 'Role', 'Action', 'Module', 'Details', 'Status'], ...filteredLogs.map(l => [l.timestamp, l.user, l.role, l.action, l.module, l.details, l.status])]
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href  = URL.createObjectURL(blob)
    link.download = `ActivityLogs_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const closeModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
  const showError = (message: string) =>
    setConfirmModal({ isOpen: true, type: 'error', title: 'Error', message, onConfirm: closeModal })

  // A restored applicant needs the module's own list refreshed too — GIP/CDSP
  // applicant tables read from a shared context mounted at the app root
  // (GIPProvider/CDSPProvider in App.tsx), so refreshing it here means the
  // table is already up to date the moment the user navigates back to it,
  // no manual page refresh needed.
  const refreshModuleFor = async (recordType: RecycleBinItem['recordType']) => {
    if (recordType === 'gipApplicant') await refreshGipProfiles()
    if (recordType === 'gipBatch') await refreshGipBatches()
    if (recordType === 'cdspApplicant') await refreshCdspProfiles()
    if (recordType === 'cdspActivity') await refreshCdspActivities()
    if (recordType === 'cdspService') await refreshCdspServices()
    if (recordType === 'spesApplicant') await refreshSpesProfiles()
    if (recordType === 'spesBatch') await refreshSpesBatches()
    if (recordType === 'dilpApplicant') await refreshDilpProfiles()
    if (recordType === 'dilpProject') await refreshDilpProjects()
    if (recordType === 'tupadApplicant') await refreshTupadProfiles()
    if (recordType === 'tupadProject') await refreshTupadProjects()
    if (recordType === 'slpApplicant') await refreshSlpProfiles()
    if (recordType === 'slpProject') await refreshSlpProjects()
    if (recordType === 'clpepApplicant') await refreshClpepProfiles()
    if (recordType === 'clpepIntervention') await refreshClpepInterventions()
    if (recordType === 'skillsTrainingApplicant') await refreshSkillsTrainingProfiles()
    if (recordType === 'skillsTrainingBatch') await refreshSkillsTrainingBatches()
    if (recordType === 'skillsTrainingActivity') await refreshSkillsTrainingActivities()
    if (recordType === 'ofwProfile') await refreshOfwProfiles()
  }

  const handleRestoreItem = (item: RecycleBinItem) => {
    setConfirmModal({
      isOpen: true, type: 'confirm', title: 'Restore Record',
      message: `Restore "${item.name}" back to ${item.module}?\n\nThis record will be fully accessible again.`,
      confirmText: 'Yes, Restore', cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await restoreRecord(item.recordType, item.id)
          await Promise.all([reloadBin(), refreshModuleFor(item.recordType)])
          setConfirmModal({ isOpen: true, type: 'success', title: 'Record Restored', message: `"${item.name}" has been successfully restored to ${item.module}.`, onConfirm: closeModal })
        } catch (err: unknown) {
          showError(err instanceof Error && err.message ? err.message : `Failed to restore "${item.name}".`)
        }
      },
    })
  }

  const handlePermanentDelete = (item: RecycleBinItem) => {
    setConfirmModal({
      isOpen: true, type: 'confirm', title: 'Permanently Delete',
      message: `Permanently delete "${item.name}"?\n\nThis action CANNOT be undone. The record will be lost forever.`,
      confirmText: 'Yes, Delete Permanently', cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await purgeRecord(item.recordType, item.id)
          await reloadBin()
          setConfirmModal({ isOpen: true, type: 'success', title: 'Permanently Deleted', message: `"${item.name}" has been permanently deleted.`, onConfirm: closeModal })
        } catch (err: unknown) {
          showError(err instanceof Error && err.message ? err.message : `Failed to delete "${item.name}".`)
        }
      },
    })
  }

  const handleEmptyBin = () => {
    if (recycleBin.length === 0) return
    setConfirmModal({
      isOpen: true, type: 'confirm', title: 'Empty Recycle Bin',
      message: `Permanently delete all ${recycleBin.length} item(s) in the recycle bin?\n\nThis action CANNOT be undone.`,
      confirmText: 'Yes, Empty Bin', cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          // No bulk endpoint — purge each record, then reload once.
          for (const item of recycleBin) {
            await purgeRecord(item.recordType, item.id)
          }
          await reloadBin()
          setConfirmModal({ isOpen: true, type: 'success', title: 'Bin Emptied', message: 'All items in the recycle bin have been permanently deleted.', onConfirm: closeModal })
        } catch {
          await reloadBin()
          showError('Some items could not be deleted. Please try again.')
        }
      },
    })
  }

  return (
    <>
      {subTab === 'logs' && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-gray-800 m-0 mb-0.5">Activity Logs</h3>
              <p className="text-gray-500 text-sm m-0">{filteredLogs.length} record{filteredLogs.length !== 1 ? 's' : ''} found</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSubTab('bin')} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors text-sm">
                <Trash size={15} />
                Recycle Bin
                {recycleBin.length > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${expiringCount > 0 ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {recycleBin.length}
                  </span>
                )}
              </button>
              <button onClick={handleExportLogs} className="flex items-center gap-2 px-4 py-2 bg-[#0077BE] text-white rounded-lg hover:bg-[#006699] transition-colors text-sm">
                <Download size={16} />
                Export CSV
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
      )}

      {subTab === 'bin' && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSubTab('logs')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                <ChevronLeft size={16} />
                Back to Logs
              </button>
              <span className="text-gray-300">|</span>
              <div>
                <h3 className="text-gray-800 m-0 mb-0.5 flex items-center gap-2">
                  <Trash size={18} className="text-gray-500" /> Recycle Bin
                </h3>
                <p className="text-gray-500 text-sm m-0">{recycleBin.length} item{recycleBin.length !== 1 ? 's' : ''} · Auto-deleted after 30 days</p>
              </div>
            </div>
            <button onClick={handleEmptyBin} disabled={recycleBin.length === 0} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed">
              <Trash size={16} />
              Empty Bin
            </button>
          </div>

          {expiringCount > 0 && (
            <div className="mx-6 mt-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-700 m-0">
                <span className="font-medium">{expiringCount} item{expiringCount !== 1 ? 's' : ''}</span> will be permanently deleted {soonestExpiry === 0 ? 'today' : `within ${soonestExpiry} day${soonestExpiry !== 1 ? 's' : ''}`}. Restore them now if needed.
              </p>
            </div>
          )}

          <div className="px-6 py-4 flex flex-wrap gap-3 items-center border-b border-gray-100 bg-gray-50 mt-0">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search deleted records..." value={binSearch} onChange={e => setBinSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent outline-none bg-white text-gray-900 placeholder:text-gray-400" />
            </div>
            <div className="relative">
              <select value={binModuleFilter} onChange={e => setBinModuleFilter(e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] outline-none bg-white text-gray-700 cursor-pointer">
                {binModules.map(m => <option key={m} value={m}>{m === 'All' ? 'All Modules' : m}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {binLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <p className="text-sm">Loading…</p>
            </div>
          ) : filteredBin.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Trash size={48} className="mb-4 text-gray-300" />
              <p className="text-sm">{recycleBin.length === 0 ? 'The recycle bin is empty.' : 'No records match your filters.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs text-gray-500">Record Name</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">Module</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500">Description</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">Deleted By</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">Deleted On</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">Expires In</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBin.map(item => {
                    const daysLeft  = getDaysRemaining(item.deletedAt)
                    const isUrgent  = daysLeft <= 3
                    const isWarning = daysLeft <= 7 && daysLeft > 3
                    return (
                      <tr key={`${item.recordType}-${item.id}`} className={`border-b border-gray-100 hover:bg-gray-50 ${isUrgent ? 'bg-red-50/40' : isWarning ? 'bg-amber-50/40' : ''}`}>
                        <td className="px-4 py-3"><span className="text-sm text-gray-800">{item.name}</span></td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-xs ${BIN_MODULE_BADGE[item.module] ?? 'bg-gray-100 text-gray-600'}`}>{item.module}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[220px]">{item.description}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{item.deletedBy}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatTimestamp(item.deletedAt)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className={`flex items-center gap-1.5 text-xs font-medium ${isUrgent ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-gray-500'}`}>
                            <Clock size={13} />
                            {daysLeft === 0 ? 'Expires today' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
                          </div>
                          <div className="mt-1 h-1.5 w-20 rounded-full bg-gray-200 overflow-hidden">
                            <div className={`h-full rounded-full ${isUrgent ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-green-400'}`} style={{ width: `${(daysLeft / 30) * 100}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleRestoreItem(item)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                              <RotateCcw size={13} /> Restore
                            </button>
                            <button onClick={() => handlePermanentDelete(item)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filteredBin.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Show</span>
                <select value={binPerPage} onChange={e => { setBinPerPage(Number(e.target.value)); setBinPage(1) }} className="px-2 py-1 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#0077BE] outline-none bg-white">
                  <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
                </select>
                <span className="text-xs text-gray-500">per page</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setBinPage(p => Math.max(1, p - 1))} disabled={binPage === 1} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft size={15} /></button>
                <span className="text-xs text-gray-500 px-2">{(binPage - 1) * binPerPage + 1}–{Math.min(binPage * binPerPage, filteredBin.length)} of {filteredBin.length}</span>
                <button onClick={() => setBinPage(p => Math.min(totalBinPages, p + 1))} disabled={binPage === totalBinPages} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronRight size={15} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen} type={confirmModal.type} title={confirmModal.title}
        message={confirmModal.message} confirmText={confirmModal.confirmText} cancelText={confirmModal.cancelText}
        onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  )
}
