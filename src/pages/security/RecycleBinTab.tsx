import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Search, ChevronDown, ChevronLeft, ChevronRight,
  Trash, Trash2, RotateCcw, Clock, AlertTriangle,
} from 'lucide-react'
import ConfirmModal from '../shared/ConfirmModal'
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
import { useDocuments } from '../../contexts/DocumentsContext'
import { useEmployment } from '../../contexts/EmploymentContext'

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

// Days left before the 30-day retention window elapses. This used to be
// display-only -- now each module's backend actually enforces it too (see
// {module}PurgeExpired(), called from {module}ListDeleted(): the next time
// anyone loads this recycle bin, anything past 30 days for a given module
// is hard-deleted before the remaining list is returned). Keep this number
// in sync with RECYCLE_BIN_RETENTION_DAYS in core/helpers.php.
function getDaysRemaining(deletedAt: string): number {
  const deleted = new Date(deletedAt)
  const diff = Math.floor((Date.now() - deleted.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, 30 - diff)
}

const binModules  = [
  'All', 'Applicants', 'Employers', 'Referrals',
  'GIP Applicants', 'GIP Workplaces',
  'CDSP Applicants', 'CDSP Activities',
  'SPES Applicants', 'SPES Batches',
  'DILP Beneficiaries', 'DILP Projects',
  'TUPAD Beneficiaries', 'TUPAD Projects',
  'SLP Beneficiaries', 'SLP Projects',
  'CLPEP Beneficiaries', 'CLPEP Interventions',
  'Skills Training Applicants', 'Skills Training Batches', 'Skills Training Activities',
  'OFW Profiles',
  'Document Folders', 'Document Files',
]

// Colors the recycle bin's Module badge — records and their program's
// Maintenance-level entities (batches/projects/activities/interventions)
// share one color per program, so the family is recognizable at a glance.
const BIN_MODULE_BADGE: Record<string, string> = {
  'Applicants': 'bg-blue-50 text-blue-700',
  'Employers': 'bg-purple-50 text-purple-700',
  'Referrals': 'bg-amber-50 text-amber-700',
  'GIP Applicants': 'bg-sky-50 text-sky-700',
  'GIP Workplaces': 'bg-sky-50 text-sky-700',
  'CDSP Applicants': 'bg-teal-50 text-teal-700',
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
  'Document Folders': 'bg-yellow-50 text-yellow-700',
  'Document Files': 'bg-yellow-50 text-yellow-700',
}

// isActive: SecurityView keeps this tab mounted after its first visit, so the
// bin refreshes itself each time the tab is shown again.
// onCountChange keeps the count badge on the "Recycle Bin" tab (in SecurityView)
// in sync after a restore / delete / empty-bin changes how many items are in the bin.
interface RecycleBinTabProps {
  isActive: boolean
  onCountChange: (count: number) => void
}

export default function RecycleBinTab({ isActive, onCountChange }: RecycleBinTabProps) {
  const { refreshProfiles: refreshGipProfiles, refreshWorkplaces: refreshGipWorkplaces } = useGIP()
  const { refreshProfiles: refreshCdspProfiles, refreshActivities: refreshCdspActivities } = useCDSP()
  const { refreshProfiles: refreshSpesProfiles, refreshBatches: refreshSpesBatches } = useSPES()
  const { refreshProfiles: refreshDilpProfiles, refreshProjects: refreshDilpProjects } = useDILP()
  const { refreshProfiles: refreshTupadProfiles, refreshProjects: refreshTupadProjects } = useTUPAD()
  const { refreshProfiles: refreshSlpProfiles, refreshProjects: refreshSlpProjects } = useSLP()
  const { refreshProfiles: refreshClpepProfiles, refreshInterventions: refreshClpepInterventions } = useCLPEP()
  const { refreshProfiles: refreshSkillsTrainingProfiles, refreshBatches: refreshSkillsTrainingBatches, refreshActivities: refreshSkillsTrainingActivities } = useSkillsTraining()
  const { refreshProfiles: refreshOfwProfiles } = useOFW()
  const { refreshFolders: refreshDocumentsFolders, refreshDocuments: refreshDocumentsDocuments } = useDocuments()
  const { refreshAll: refreshEmploymentAll } = useEmployment()

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

  useEffect(() => { setBinPage(1) }, [binModuleFilter, binSearch])

  // "Loading…" only shows for the very first load (binLoading starts true).
  // Later reloads update the list quietly, with no flash.
  const reloadBin = useCallback(async () => {
    try {
      setRecycleBin(await listDeleted())
    } catch {
      setConfirmModal({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to load the recycle bin. Please try again.', onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) })
    } finally {
      setBinLoading(false)
    }
  }, [])

  // Loads when the tab is first opened and again every time it is shown, so a
  // deletion made elsewhere appears without a full page refresh.
  useEffect(() => { if (isActive) reloadBin() }, [isActive, reloadBin])
  // Report the count only once the first load has finished, so the badge doesn't
  // flash to 0 while the list is still empty.
  useEffect(() => { if (!binLoading) onCountChange(recycleBin.length) }, [binLoading, recycleBin.length, onCountChange])

  const closeModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
  const showError = (message: string) =>
    setConfirmModal({ isOpen: true, type: 'error', title: 'Error', message, onConfirm: closeModal })

  // A restored applicant needs the module's own list refreshed too — GIP/CDSP
  // applicant tables read from a shared context mounted at the app root
  // (GIPProvider/CDSPProvider in App.tsx), so refreshing it here means the
  // table is already up to date the moment the user navigates back to it,
  // no manual page refresh needed.
  const refreshModuleFor = async (recordType: RecycleBinItem['recordType']) => {
    // EF's lists live in EmploymentProvider now too. A restored applicant,
    // employer or referral can bring related rows back with it, so refresh all
    // five lists rather than guessing which ones.
    if (recordType === 'applicant' || recordType === 'employer' || recordType === 'referral') await refreshEmploymentAll()
    if (recordType === 'gipApplicant') await refreshGipProfiles()
    if (recordType === 'gipWorkplace') await refreshGipWorkplaces()
    if (recordType === 'cdspApplicant') await refreshCdspProfiles()
    if (recordType === 'cdspActivity') await refreshCdspActivities()
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
    if (recordType === 'documentsFolder') await refreshDocumentsFolders()
    if (recordType === 'documentsDocument') await refreshDocumentsDocuments()
  }

  const handleRestoreItem = (item: RecycleBinItem) => {
    setConfirmModal({
      isOpen: true, type: 'confirm', title: 'Restore Record',
      message: `Restore "${item.name}" back to ${item.module}?\n\nThis record will be fully accessible again.`,
      confirmText: 'Yes, Restore', cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          const renamedTo = await restoreRecord(item.recordType, item.id)
          await Promise.all([reloadBin(), refreshModuleFor(item.recordType)])
          const doneMessage = renamedTo
            ? `"${item.name}" has been restored to ${item.module} as "${renamedTo}", because that name is already in use in the same folder.`
            : `"${item.name}" has been successfully restored to ${item.module}.`
          setConfirmModal({ isOpen: true, type: 'success', title: 'Record Restored', message: doneMessage, onConfirm: closeModal })
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
      onConfirm: () => proceedPurge(item, false),
    })
  }

  // `force=false` first — an EF applicant with placement/referral history, or
  // a Documents folder with leftover recycle-bin files, gets blocked by the
  // backend (detail.code === 'has_history' / 'has_files') so we can show a
  // second, more specific warning before retrying with force=true.
  const proceedPurge = async (item: RecycleBinItem, force: boolean) => {
    try {
      await purgeRecord(item.recordType, item.id, force)
      await reloadBin()
      setConfirmModal({ isOpen: true, type: 'success', title: 'Permanently Deleted', message: `"${item.name}" has been permanently deleted.`, onConfirm: closeModal })
    } catch (err: unknown) {
      const detail = err instanceof Error
        ? (err as Error & { detail?: { code?: string; placements?: number; referrals?: number; count?: number } }).detail
        : undefined
      if (detail?.code === 'has_history') {
        const parts: string[] = []
        if (detail.placements) parts.push(`${detail.placements} placement${detail.placements !== 1 ? 's' : ''}`)
        if (detail.referrals) parts.push(`${detail.referrals} referral${detail.referrals !== 1 ? 's' : ''}`)
        setConfirmModal({
          isOpen: true, type: 'confirm', title: 'Has Placement/Referral History',
          message: `"${item.name}" has ${parts.join(' and ')}. Deleting will permanently remove all of that history too, along with the applicant record.\n\nThis cannot be undone. Delete anyway?`,
          confirmText: 'Yes, Delete Everything', cancelText: 'Cancel',
          onConfirm: () => proceedPurge(item, true),
        })
        return
      }
      if (detail?.code === 'has_files') {
        const count = detail.count ?? 0
        setConfirmModal({
          isOpen: true, type: 'confirm', title: 'Folder Has Files in Recycle Bin',
          message: `"${item.name}" still has ${count} file${count !== 1 ? 's' : ''} sitting in the Recycle Bin. Deleting this folder will also permanently delete ${count !== 1 ? 'them' : 'it'}.\n\nThis cannot be undone. Delete anyway?`,
          confirmText: 'Yes, Delete Everything', cancelText: 'Cancel',
          onConfirm: () => proceedPurge(item, true),
        })
        return
      }
      showError(err instanceof Error && err.message ? err.message : `Failed to delete "${item.name}".`)
    }
  }

  // Two-pass empty: try every item WITHOUT force first, exactly like a
  // single-item Purge would. An EF applicant with placement/referral
  // history, or a Documents folder with leftover recycle-bin files, gets
  // blocked by the backend instead of silently force-deleted — those are
  // left untouched and reported back in one aggregate follow-up warning
  // (naming exactly what extra data would be lost), rather than either
  // skipping the warning entirely (the old bug: "Empty Bin"'s generic
  // message never mentioned this) or nagging once per blocked item.
  const runEmptyBinPass = async (items: RecycleBinItem[], force: boolean) => {
    type PurgeDetail = { code?: string; placements?: number; referrals?: number; count?: number }
    const blocked: { item: RecycleBinItem; detail: PurgeDetail }[] = []
    let failed = 0

    for (const item of items) {
      try {
        await purgeRecord(item.recordType, item.id, force)
      } catch (err: unknown) {
        const detail = err instanceof Error ? (err as Error & { detail?: PurgeDetail }).detail : undefined
        if (!force && (detail?.code === 'has_history' || detail?.code === 'has_files')) {
          blocked.push({ item, detail })
        } else {
          failed++
        }
      }
    }

    await reloadBin()

    if (blocked.length > 0) {
      const lines = blocked.map(({ item, detail }) => {
        if (detail.code === 'has_history') {
          const parts: string[] = []
          if (detail.placements) parts.push(`${detail.placements} placement${detail.placements !== 1 ? 's' : ''}`)
          if (detail.referrals) parts.push(`${detail.referrals} referral${detail.referrals !== 1 ? 's' : ''}`)
          return `• "${item.name}" — has ${parts.join(' and ')}`
        }
        const count = detail.count ?? 0
        return `• "${item.name}" — still has ${count} file${count !== 1 ? 's' : ''} in the Recycle Bin`
      })
      setConfirmModal({
        isOpen: true, type: 'confirm', title: 'Some Items Carry Extra History',
        message: `${blocked.length} item${blocked.length !== 1 ? 's' : ''} also carry extra data that would be permanently lost too:\n\n${lines.join('\n')}\n\nDelete ${blocked.length !== 1 ? 'them' : 'it'} anyway? This cannot be undone.`,
        confirmText: 'Yes, Delete Everything', cancelText: 'Leave These For Now',
        onConfirm: () => runEmptyBinPass(blocked.map(b => b.item), true),
      })
      return
    }

    if (failed > 0) {
      showError(`${failed} item${failed !== 1 ? 's' : ''} could not be deleted. Please try again.`)
      return
    }

    setConfirmModal({ isOpen: true, type: 'success', title: 'Bin Emptied', message: 'All items in the recycle bin have been permanently deleted.', onConfirm: closeModal })
  }

  const handleEmptyBin = () => {
    if (recycleBin.length === 0) return
    setConfirmModal({
      isOpen: true, type: 'confirm', title: 'Empty Recycle Bin',
      message: `Permanently delete all ${recycleBin.length} item(s) in the recycle bin?\n\nThis action CANNOT be undone.`,
      confirmText: 'Yes, Empty Bin', cancelText: 'Cancel',
      onConfirm: () => runEmptyBinPass(recycleBin, false),
    })
  }

  return (
    <>
        <div className="bg-white rounded-xl shadow-md overflow-hidden min-h-[75vh]">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
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

      <ConfirmModal
        isOpen={confirmModal.isOpen} type={confirmModal.type} title={confirmModal.title}
        message={confirmModal.message} confirmText={confirmModal.confirmText} cancelText={confirmModal.cancelText}
        onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  )
}
