import { useState } from 'react'
import ConfirmModal from '../shared/ConfirmModal'
import {
  ArrowLeft, Plus, FolderOpen, PlusCircle, MoreHorizontal,
  Edit2, Trash2, CheckCircle, PlayCircle, RefreshCw, ClipboardList,
  Users, Search, ChevronLeft, ChevronRight,
} from 'lucide-react'

import { canManage } from '../../utils/permissions'
import { useSPES } from '../../contexts/SPESContext'
import type { SPESBatch } from '../../contexts/SPESContext'
import { useGIP } from '../../contexts/GIPContext'
import type { GIPWorkplace } from '../../contexts/GIPContext'
import * as gipApiService from '../../services/gipService'
import * as spesApiService from '../../services/spesService'
import SPESMaintenanceForm from './SPESMaintenanceForm'
import SkillsTrainingMaintenanceForm from './SkillsTrainingMaintenanceForm'
import CDSPMaintenanceForm from './CDSPMaintenanceForm'
import GIPMaintenanceForm from './GIPMaintenanceForm'
import LivelihoodMaintenanceForm from './LivelihoodMaintenanceForm'

// ─── Types ────────────────────────────────────────────────────────────────────

type MaintenanceTab = 'CDSP' | 'GIP' | 'SPES' | 'Livelihood' | 'Skills Training'
type SPESAction = '' | 'add_batch' | 'view_batches'
type SPESBatchAction = '' | 'view_batch' | 'edit_batch' | 'view_participants'
type GIPAction = '' | 'add_workplace' | 'view_workplaces'
type GIPWorkplaceAction = '' | 'view_workplace' | 'edit_workplace' | 'view_participants'

interface MaintenanceProps {
  onBack?: () => void
}

// ─── Status badge colors ──────────────────────────────────────────────────────

const SPES_BATCH_STATUS_COLORS: Record<SPESBatch['status'], string> = {
  Planned:   'bg-yellow-100 text-yellow-700',
  Ongoing:   'bg-green-100 text-green-700',
  Completed: 'bg-blue-100 text-blue-700',
}

const APPLICANT_STATUS_COLORS: Record<string, string> = {
  Active:    'bg-blue-100 text-blue-700',
  Inactive:  'bg-gray-100 text-gray-500',
  Completed: 'bg-green-100 text-green-700',
  Withdrawn: 'bg-red-100 text-red-600',
  'On Hold': 'bg-yellow-100 text-yellow-700',
}

const GIP_CONFIRM_COLOR = '#0077BE'

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const TABS: { key: MaintenanceTab; label: string }[] = [
  { key: 'CDSP',           label: 'CDSP' },
  { key: 'GIP',            label: 'GIP' },
  { key: 'SPES',           label: 'SPES' },
  { key: 'Livelihood',     label: 'Livelihood' },
  { key: 'Skills Training',label: 'Skills Training' },
]

// ─── Main component ───────────────────────────────────────────────────────────

function MaintenanceInner({ onBack }: MaintenanceProps) {
  const { spesBatches, applicants: spesApplicants, refreshProfiles: refreshSpesProfiles, refreshBatches: refreshSpesBatches } = useSPES()
  const { gipWorkplaces, applicants: gipApplicants, refreshProfiles: refreshGipProfiles, refreshWorkplaces: refreshGipWorkplaces } = useGIP()
  const [activeTab, setActiveTab] = useState<MaintenanceTab>('CDSP')

  // ── SPES state ─────────────────────────────────────────────────────────────
  const [spesAction, setSpesAction] = useState<SPESAction>('')
  const [spesBatchAction, setSpesBatchAction] = useState<SPESBatchAction>('')
  const [selectedBatch, setSelectedBatch] = useState<SPESBatch | null>(null)
  const [isSavingSpesBatch, setIsSavingSpesBatch] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [statusConfirm, setStatusConfirm] = useState<{
    batch: SPESBatch; nextStatus: SPESBatch['status']; action: string
  } | null>(null)

  // ── GIP state ──────────────────────────────────────────────────────────────
  const [gipAction, setGipAction] = useState<GIPAction>('')
  const [gipWorkplaceAction, setGipWorkplaceAction] = useState<GIPWorkplaceAction>('')
  const [selectedGipWorkplace, setSelectedGipWorkplace] = useState<GIPWorkplace | null>(null)
  const [isSavingGipWorkplace, setIsSavingGipWorkplace] = useState(false)
  const [gipOpenMenuId, setGipOpenMenuId] = useState<number | null>(null)
  const [gipMenuPos, setGipMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [gipSearch, setGipSearch] = useState('')
  const [gipWorkplacePage, setGipWorkplacePage] = useState(1)
  const [gipWorkplacePerPage, setGipWorkplacePerPage] = useState(10)
  const [spesSearch, setSpesSearch] = useState('')
  const [spesStatusFilter, setSpesStatusFilter] = useState('All')
  const [spesBatchPage, setSpesBatchPage] = useState(1)
  const [spesBatchPerPage, setSpesBatchPerPage] = useState(10)
  const [spesParticipantPage, setSpesParticipantPage] = useState(1)
  const [spesParticipantPerPage, setSpesParticipantPerPage] = useState(10)
  const [gipParticipantPage, setGipParticipantPage] = useState(1)
  const [gipParticipantPerPage, setGipParticipantPerPage] = useState(10)
  const [resultModal, setResultModal] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({ isOpen: false, type: 'success', title: '', message: '' })
  const [deleteSpesBatchConfirm, setDeleteSpesBatchConfirm] = useState<{ id: number; batchName: string } | null>(null)
  const [deleteGipWorkplaceConfirm, setDeleteGipWorkplaceConfirm] = useState<{ id: number; workplaceName: string } | null>(null)

  // ── Helpers ────────────────────────────────────────────────────────────────

  const resetSpesState = () => {
    setSpesAction('')
    setSpesBatchAction('')
    setSelectedBatch(null)
  }

  const resetGipState = () => {
    setGipAction('')
    setGipWorkplaceAction('')
    setSelectedGipWorkplace(null)
  }

  const handleTabChange = (tab: MaintenanceTab) => {
    setActiveTab(tab)
    resetSpesState()
    resetGipState()
  }

  // ── SPES handlers ──────────────────────────────────────────────────────────

  const handleAddBatch = async (data: Omit<SPESBatch, 'id'>) => {
    if (isSavingSpesBatch) return
    setIsSavingSpesBatch(true)
    try {
      await spesApiService.createBatch(data as unknown as Record<string, unknown>)
      await refreshSpesBatches()
      setSpesAction('')
      setResultModal({ isOpen: true, type: 'success', title: 'Batch Added', message: 'New SPES batch has been added successfully.' })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: apiErrMsg(e, 'Failed to save batch.') })
    } finally {
      setIsSavingSpesBatch(false)
    }
  }

  const handleUpdateBatch = async (updated: SPESBatch) => {
    if (isSavingSpesBatch) return
    setIsSavingSpesBatch(true)
    try {
      await spesApiService.updateBatch(updated.id, updated as unknown as Record<string, unknown>)
      await refreshSpesBatches()
      await refreshSpesProfiles()
      setSpesBatchAction('')
      setSelectedBatch(null)
      setResultModal({ isOpen: true, type: 'success', title: 'Batch Updated', message: 'Batch details have been saved successfully.' })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: apiErrMsg(e, 'Failed to update batch.') })
    } finally {
      setIsSavingSpesBatch(false)
    }
  }

  const handleDeleteSpesBatch = async (batchId: number) => {
    try {
      await spesApiService.deleteBatch(batchId)
      await refreshSpesBatches()
      setResultModal({ isOpen: true, type: 'success', title: 'Batch Deleted', message: 'SPES batch has been deleted.' })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: apiErrMsg(e, 'Failed to delete batch.') })
    }
  }

  const confirmDeleteSpesBatch = (b: { id: number; batchName: string }) => {
    setOpenMenuId(null)
    setDeleteSpesBatchConfirm(b)
  }

  const proceedDeleteSpesBatch = async () => {
    if (!deleteSpesBatchConfirm) return
    const b = deleteSpesBatchConfirm
    setDeleteSpesBatchConfirm(null)
    await handleDeleteSpesBatch(b.id)
  }

  // ── GIP handlers ───────────────────────────────────────────────────────────

  const apiErrMsg = (e: unknown, fallback: string) =>
    (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
    ?? (e as { message?: string })?.message ?? fallback

  const handleAddGipWorkplace = async (data: Omit<GIPWorkplace, 'id'>) => {
    if (isSavingGipWorkplace) return
    setIsSavingGipWorkplace(true)
    try {
      await gipApiService.createWorkplace(data as unknown as Record<string, unknown>)
      await refreshGipWorkplaces()
      setGipAction('')
      setResultModal({ isOpen: true, type: 'success', title: 'Workplace Added', message: 'New GIP workplace/office has been added successfully.' })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: apiErrMsg(e, 'Failed to save workplace/office.') })
    } finally {
      setIsSavingGipWorkplace(false)
    }
  }

  const handleUpdateGipWorkplace = async (updated: GIPWorkplace) => {
    if (isSavingGipWorkplace) return
    setIsSavingGipWorkplace(true)
    try {
      await gipApiService.updateWorkplace(updated.id, updated as unknown as Record<string, unknown>)
      await refreshGipWorkplaces()
      await refreshGipProfiles()
      setGipWorkplaceAction('')
      setSelectedGipWorkplace(null)
      setResultModal({ isOpen: true, type: 'success', title: 'Workplace Updated', message: 'Workplace/office details have been saved successfully.' })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: apiErrMsg(e, 'Failed to update workplace/office.') })
    } finally {
      setIsSavingGipWorkplace(false)
    }
  }

  const handleDeleteGipWorkplace = async (workplaceId: number) => {
    try {
      await gipApiService.deleteWorkplace(workplaceId)
      await refreshGipWorkplaces()
      setResultModal({ isOpen: true, type: 'success', title: 'Workplace Deleted', message: 'GIP workplace/office has been deleted.' })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: apiErrMsg(e, 'Failed to delete workplace/office.') })
    }
  }

  const confirmDeleteGipWorkplace = (w: { id: number; workplaceName: string }) => {
    setGipOpenMenuId(null)
    setDeleteGipWorkplaceConfirm(w)
  }

  const proceedDeleteGipWorkplace = async () => {
    if (!deleteGipWorkplaceConfirm) return
    const w = deleteGipWorkplaceConfirm
    setDeleteGipWorkplaceConfirm(null)
    await handleDeleteGipWorkplace(w.id)
  }

  // ── GIP filtered workplaces ─────────────────────────────────────────────────

  const statusRank = (s: string) => ({ Planned: 0, Open: 0, Ongoing: 1, Active: 1, Completed: 2, Cancelled: 3 }[s] ?? 1)
  const filteredGipWorkplaces = gipWorkplaces.filter(w =>
    !gipSearch || w.workplaceName.toLowerCase().includes(gipSearch.toLowerCase())
  )

  const gipWorkplaceTotalPages = Math.max(1, Math.ceil(filteredGipWorkplaces.length / gipWorkplacePerPage))
  const gipWorkplaceSafePage = Math.min(gipWorkplacePage, gipWorkplaceTotalPages)
  const paginatedGipWorkplaces = filteredGipWorkplaces.slice((gipWorkplaceSafePage - 1) * gipWorkplacePerPage, gipWorkplaceSafePage * gipWorkplacePerPage)
  const gipWorkplaceRecordStart = filteredGipWorkplaces.length === 0 ? 0 : (gipWorkplaceSafePage - 1) * gipWorkplacePerPage + 1
  const gipWorkplaceRecordEnd = Math.min(gipWorkplaceSafePage * gipWorkplacePerPage, filteredGipWorkplaces.length)

  const sortedSpesBatches = spesBatches.filter(b => {
    const matchSearch = !spesSearch ||
      b.batchName.toLowerCase().includes(spesSearch.toLowerCase()) ||
      b.employer.toLowerCase().includes(spesSearch.toLowerCase())
    const matchStatus = spesStatusFilter === 'All' || b.status === spesStatusFilter
    return matchSearch && matchStatus
  }).sort((a, b) => statusRank(a.status) - statusRank(b.status))
  const spesBatchTotalPages = Math.max(1, Math.ceil(sortedSpesBatches.length / spesBatchPerPage))
  const spesBatchSafePage = Math.min(spesBatchPage, spesBatchTotalPages)
  const paginatedSpesBatches = sortedSpesBatches.slice((spesBatchSafePage - 1) * spesBatchPerPage, spesBatchSafePage * spesBatchPerPage)
  const spesBatchRecordStart = sortedSpesBatches.length === 0 ? 0 : (spesBatchSafePage - 1) * spesBatchPerPage + 1
  const spesBatchRecordEnd = Math.min(spesBatchSafePage * spesBatchPerPage, sortedSpesBatches.length)

  // ── Early return: SPES sub-views ───────────────────────────────────────────

  if (activeTab === 'SPES' && (spesBatchAction === 'view_batch' || spesBatchAction === 'edit_batch')) {
    const mode = spesBatchAction === 'view_batch' ? 'batch-view' : 'batch-edit'
    return (
      <div className="w-full px-6 py-8">
        <div className="mb-4">
          <button
            onClick={() => { setSpesBatchAction(''); setSelectedBatch(null) }}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            <ArrowLeft size={16} /> Back to Batches
          </button>
        </div>
        <SPESMaintenanceForm
          mode={mode}
          initialBatch={selectedBatch ?? undefined}
          onSaveBatch={handleAddBatch}
          onUpdateBatch={handleUpdateBatch}
          onCancel={() => { setSpesBatchAction(''); setSelectedBatch(null) }}
          isSaving={isSavingSpesBatch}
        />
      </div>
    )
  }

  if (activeTab === 'SPES' && spesBatchAction === 'view_participants' && selectedBatch) {
    const participants = spesApplicants.filter(a =>
      a.assignedBatchId === selectedBatch.id ||
      a.assignmentHistory.some(h => h.batchId === selectedBatch.id)
    )
    const spPtotal = Math.max(1, Math.ceil(participants.length / spesParticipantPerPage))
    const spPsafe = Math.min(spesParticipantPage, spPtotal)
    const paginatedSpesPts = participants.slice((spPsafe - 1) * spesParticipantPerPage, spPsafe * spesParticipantPerPage)
    const spPStart = participants.length === 0 ? 0 : (spPsafe - 1) * spesParticipantPerPage + 1
    const spPEnd = Math.min(spPsafe * spesParticipantPerPage, participants.length)
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-4">
          <button
            onClick={() => { setSpesBatchAction(''); setSelectedBatch(null) }}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            <ArrowLeft size={16} /> Back to Batches
          </button>
        </div>
        <div className="bg-brand-blue rounded-xl px-6 py-4 mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-white text-base font-semibold">{selectedBatch.batchName}</h3>
            <p className="text-white/80 text-sm mt-0.5">
              {participants.length} participant{participants.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${SPES_BATCH_STATUS_COLORS[selectedBatch.status]}`}>
            {selectedBatch.status}
          </span>
        </div>
        {participants.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
            <p className="text-gray-500 text-sm">No participants assigned to this batch yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-blue">
                  <th className="px-4 py-3 text-left text-white font-semibold">Full Name</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Gender</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Contact Number</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">School</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSpesPts.map((a, i) => (
                  <tr key={a.id} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-4 py-3 font-medium text-gray-800">{a.lastName}, {a.firstName} {a.middleName}</td>
                    <td className="px-4 py-3 text-gray-600">{a.sex || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{a.contactNumber || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{a.email || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <p>{a.schoolName || '—'}</p>
                      {a.gradeYearLevel && <p className="text-xs text-gray-400">{a.gradeYearLevel}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${APPLICANT_STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Rows per page:</span>
                <select value={spesParticipantPerPage} onChange={e => { setSpesParticipantPerPage(Number(e.target.value)); setSpesParticipantPage(1) }} className="border border-gray-300 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue">
                  {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{spPStart}–{spPEnd} of {participants.length} records</span>
                <div className="flex gap-1">
                  <button onClick={() => setSpesParticipantPage(p => Math.max(1, p - 1))} disabled={spPsafe === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={16} /></button>
                  <button onClick={() => setSpesParticipantPage(p => Math.min(spPtotal, p + 1))} disabled={spPsafe === spPtotal} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronRight size={16} /></button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Early return: GIP sub-views ────────────────────────────────────────────

  if (activeTab === 'GIP' && (gipWorkplaceAction === 'view_workplace' || gipWorkplaceAction === 'edit_workplace')) {
    return (
      <div className="w-full px-6 py-8">
        <div className="mb-4">
          <button
            onClick={() => { setGipWorkplaceAction(''); setSelectedGipWorkplace(null) }}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            <ArrowLeft size={16} /> Back to Workplaces/Offices
          </button>
        </div>
        <GIPMaintenanceForm
          mode={gipWorkplaceAction === 'view_workplace' ? 'workplace-view' : 'workplace-edit'}
          initialWorkplace={selectedGipWorkplace ?? undefined}
          onSaveWorkplace={handleAddGipWorkplace}
          onUpdateWorkplace={handleUpdateGipWorkplace}
          onCancel={() => { setGipWorkplaceAction(''); setSelectedGipWorkplace(null) }}
          isSaving={isSavingGipWorkplace}
        />
      </div>
    )
  }

  if (activeTab === 'GIP' && gipWorkplaceAction === 'view_participants' && selectedGipWorkplace) {
    const participants = gipApplicants.filter(
      a => a.assignedWorkplaceId === selectedGipWorkplace.id
    )
    const gpPtotal = Math.max(1, Math.ceil(participants.length / gipParticipantPerPage))
    const gpPsafe = Math.min(gipParticipantPage, gpPtotal)
    const paginatedGipPts = participants.slice((gpPsafe - 1) * gipParticipantPerPage, gpPsafe * gipParticipantPerPage)
    const gpPStart = participants.length === 0 ? 0 : (gpPsafe - 1) * gipParticipantPerPage + 1
    const gpPEnd = Math.min(gpPsafe * gipParticipantPerPage, participants.length)
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-4">
          <button
            onClick={() => { setGipWorkplaceAction(''); setSelectedGipWorkplace(null) }}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            <ArrowLeft size={16} /> Back to Workplaces/Offices
          </button>
        </div>
        <div className="rounded-xl px-6 py-4 mb-4 flex items-center justify-between" style={{ backgroundColor: GIP_CONFIRM_COLOR }}>
          <div>
            <h3 className="text-white text-base font-semibold">{selectedGipWorkplace.workplaceName}</h3>
            <p className="text-white/80 text-sm mt-0.5">
              {participants.length} participant{participants.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>
        {participants.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
            <p className="text-gray-500 text-sm">No participants assigned to this workplace/office yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: GIP_CONFIRM_COLOR }}>
                  <th className="px-4 py-3 text-left text-white font-semibold">Full Name</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Gender</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Contact Number</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Barangay</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedGipPts.map((a, i) => (
                  <tr key={a.id} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-4 py-3 font-medium text-gray-800">{a.lastName}, {a.firstName}{a.middleName ? ` ${a.middleName.charAt(0)}.` : ''}</td>
                    <td className="px-4 py-3 text-gray-600">{a.sex || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{a.contactNumber || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{a.email || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{a.barangay || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${APPLICANT_STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Rows per page:</span>
                <select value={gipParticipantPerPage} onChange={e => { setGipParticipantPerPage(Number(e.target.value)); setGipParticipantPage(1) }} className="border border-gray-300 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue">
                  {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{gpPStart}–{gpPEnd} of {participants.length} records</span>
                <div className="flex gap-1">
                  <button onClick={() => setGipParticipantPage(p => Math.max(1, p - 1))} disabled={gpPsafe === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={16} /></button>
                  <button onClick={() => setGipParticipantPage(p => Math.min(gpPtotal, p + 1))} disabled={gpPsafe === gpPtotal} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronRight size={16} /></button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Main layout ────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">

      {/* Page header */}
      <div className="flex items-center gap-4 mb-6">
        {onBack && (
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
        )}
        <div>
          <h2 className="m-0" style={{ fontWeight: 700, color: '#111827' }}>Maintenance</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {activeTab === 'CDSP'
              ? 'Manage CDSP activities and services'
              : `Manage ${activeTab} program projects and services`}
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 shadow-md overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-5 py-2 rounded-lg transition-all text-sm whitespace-nowrap flex-shrink-0 ${
              activeTab === tab.key
                ? 'bg-brand-blue text-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CDSP tab */}
      {activeTab === 'CDSP' && <CDSPMaintenanceForm />}

      {/* Livelihood tab */}
      {activeTab === 'Livelihood' && <LivelihoodMaintenanceForm />}

      {/* ── Skills Training tab ──────────────────────────────────────────────── */}
      {activeTab === 'Skills Training' && <SkillsTrainingMaintenanceForm />}

      {/* ── GIP tab ─────────────────────────────────────────────────────────── */}
      {activeTab === 'GIP' && (
        <>
          {/* Action cards */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <p className="text-gray-500 mb-5">
              Select an action for <span className="font-medium" style={{ color: GIP_CONFIRM_COLOR }}>GIP</span>
            </p>
            <div className="grid grid-cols-2 gap-5">
              {[
                { key: 'add_workplace' as GIPAction, label: 'Add Workplace/Office', icon: <PlusCircle size={32} />, desc: 'Create a new GIP workplace/office' },
                { key: 'view_workplaces' as GIPAction, label: 'View Workplaces/Offices', icon: <FolderOpen size={32} />, desc: 'Browse all GIP workplaces/offices' },
              ].map(action => (
                <button
                  key={action.key}
                  onClick={() => setGipAction(action.key)}
                  disabled={action.label.startsWith('Add') && !canManage('gip-maintenance')}
                  className={`flex flex-col items-center gap-4 py-8 px-4 rounded-2xl border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    gipAction === action.key
                      ? 'border-brand-blue bg-blue-50 text-brand-blue'
                      : 'border-gray-200 hover:border-brand-blue hover:bg-blue-50 text-gray-600 hover:text-brand-blue'
                  }`}
                >
                  <div
                    className="p-4 rounded-2xl"
                    style={gipAction === action.key
                      ? { backgroundColor: GIP_CONFIRM_COLOR, color: 'white' }
                      : { backgroundColor: '#f3f4f6' }
                    }
                  >
                    {action.icon}
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{action.label}</p>
                    <p className="text-xs text-gray-400 mt-1">{action.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Idle state */}
          {gipAction === '' && (
            <div className="bg-white rounded-xl shadow-md py-20 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FolderOpen size={32} style={{ color: GIP_CONFIRM_COLOR }} />
              </div>
              <h3 className="text-gray-700 mb-2 text-center">GIP Program Maintenance</h3>
              <p className="text-gray-400 text-center px-8">
                Select an action above to manage workplaces/offices for the Government Internship Program.
              </p>
            </div>
          )}

          {/* Add Workplace/Office form */}
          {gipAction === 'add_workplace' && (
            <GIPMaintenanceForm
              mode="workplace"
              onSaveWorkplace={handleAddGipWorkplace}
              onCancel={() => setGipAction('')}
              isSaving={isSavingGipWorkplace}
            />
          )}

          {/* View Workplaces/Offices table */}
          {gipAction === 'view_workplaces' && (
            <>
              {/* Search bar */}
              <div className="bg-white rounded-xl shadow-md p-5 mb-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={gipSearch}
                    onChange={e => setGipSearch(e.target.value)}
                    placeholder="Search by workplace/office name..."
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                {/* Table header */}
                <div className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: GIP_CONFIRM_COLOR }}>
                  <div>
                    <h3 className="text-white m-0">GIP Workplaces/Offices</h3>
                  </div>
                  <button
                    onClick={() => setGipAction('add_workplace')}
                    disabled={!canManage('gip-maintenance')}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-brand-blue rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                  >
                    <Plus size={16} /> Add Workplace/Office
                  </button>
                </div>

                {filteredGipWorkplaces.length === 0 ? (
                  <div className="text-center py-16">
                    <FolderOpen size={48} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No GIP workplaces/offices found.</p>
                    <button
                      onClick={() => setGipAction('add_workplace')}
                      disabled={!canManage('gip-maintenance')}
                      className="mt-4 px-6 py-2 text-white rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: GIP_CONFIRM_COLOR }}
                    >
                      Add First Workplace/Office
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Workplace/Office Name</th>
                          <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Address</th>
                          <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold w-16">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedGipWorkplaces.map(w => {
                          const participantCount = gipApplicants.filter(a => a.assignedWorkplaceId === w.id).length
                          return (
                            <tr key={w.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="px-6 py-4 text-sm">
                                <span className="text-gray-800 font-medium">{w.workplaceName}</span>
                                {w.description && (
                                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{w.description}</p>
                                )}
                                {participantCount > 0 && (
                                  <span className="inline-flex items-center gap-1 text-xs mt-1" style={{ color: GIP_CONFIRM_COLOR }}>
                                    <Users size={11} /> {participantCount} participant{participantCount !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600 max-w-[180px]">
                                <p className="line-clamp-1">{w.deploymentLocation || '—'}</p>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <button
                                  onClick={e => {
                                    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                                    const dropdownW = 200
                                    const dropdownH = 220
                                    const left = Math.min(rect.right - dropdownW, window.innerWidth - dropdownW - 8)
                                    const spaceBelow = window.innerHeight - rect.bottom - 8
                                    const top = spaceBelow >= dropdownH ? rect.bottom + 4 : rect.top - dropdownH - 4
                                    setGipMenuPos({ top: Math.max(8, top), left: Math.max(8, left) })
                                    setGipOpenMenuId(gipOpenMenuId === w.id ? null : w.id)
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                  <MoreHorizontal size={16} />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {filteredGipWorkplaces.length > 0 && (
                  <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Rows per page:</span>
                      <select
                        value={gipWorkplacePerPage}
                        onChange={e => { setGipWorkplacePerPage(Number(e.target.value)); setGipWorkplacePage(1) }}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                      >
                        {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">
                        {gipWorkplaceRecordStart}–{gipWorkplaceRecordEnd} of {filteredGipWorkplaces.length} records
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setGipWorkplacePage(p => Math.max(1, p - 1))}
                          disabled={gipWorkplaceSafePage === 1}
                          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          onClick={() => setGipWorkplacePage(p => Math.min(gipWorkplaceTotalPages, p + 1))}
                          disabled={gipWorkplaceSafePage === gipWorkplaceTotalPages}
                          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* GIP workplace action menu */}
              {gipOpenMenuId !== null && gipMenuPos && (() => {
                const w = gipWorkplaces.find(x => x.id === gipOpenMenuId)
                if (!w) return null
                return (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setGipOpenMenuId(null)} />
                    <div
                      style={{ position: 'fixed', top: gipMenuPos.top, left: gipMenuPos.left, maxHeight: 'calc(100vh - 24px)' }}
                      className="w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1 overflow-y-auto"
                    >
                      <button
                        onClick={() => { setSelectedGipWorkplace(w); setGipWorkplaceAction('view_workplace'); setGipOpenMenuId(null) }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
                      >
                        <FolderOpen size={15} style={{ color: GIP_CONFIRM_COLOR }} />
                        View Workplace/Office Details
                      </button>
                      <button
                        onClick={() => { setSelectedGipWorkplace(w); setGipWorkplaceAction('view_participants'); setGipOpenMenuId(null) }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
                      >
                        <ClipboardList size={15} className="text-gray-500" />
                        View Participants
                      </button>
                      <div className="my-1 border-t border-gray-100" />
                      <button
                        onClick={() => { setSelectedGipWorkplace(w); setGipWorkplaceAction('edit_workplace'); setGipOpenMenuId(null) }}
                        disabled={!canManage('gip-maintenance')}
                        className="w-full px-4 py-2.5 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        <Edit2 size={15} className="text-blue-500" />
                        Edit
                      </button>
                      <div className="my-1 border-t border-gray-100" />
                      <button
                        onClick={() => confirmDeleteGipWorkplace(w)}
                        disabled={!canManage('gip-maintenance')}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        <Trash2 size={15} className="text-red-500" />
                        Delete
                      </button>
                    </div>
                  </>
                )
              })()}
            </>
          )}
        </>
      )}

      {/* ── SPES tab ──────────────────────────────────────────────────────────── */}
      {activeTab === 'SPES' && (
        <>
          {/* Action cards */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <p className="text-gray-500 mb-5">
              Select an action for <span className="text-brand-blue font-medium">SPES</span>
            </p>
            <div className="grid grid-cols-2 gap-5">
              {[
                { key: 'add_batch' as SPESAction, label: 'Add Batch', icon: <PlusCircle size={32} />, desc: 'Create a new SPES deployment batch' },
                { key: 'view_batches' as SPESAction, label: 'View Batches', icon: <FolderOpen size={32} />, desc: 'Browse all batches' },
              ].map(action => (
                <button
                  key={action.key}
                  onClick={() => setSpesAction(action.key)}
                  disabled={action.label.startsWith('Add') && !canManage('spes-maintenance')}
                  className={`flex flex-col items-center gap-4 py-8 px-4 rounded-2xl border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    spesAction === action.key
                      ? 'border-brand-blue bg-blue-50 text-brand-blue'
                      : 'border-gray-200 hover:border-brand-blue hover:bg-blue-50 text-gray-600 hover:text-brand-blue'
                  }`}
                >
                  <div className={`p-4 rounded-2xl ${spesAction === action.key ? 'bg-brand-blue text-white' : 'bg-gray-100'}`}>
                    {action.icon}
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{action.label}</p>
                    <p className="text-xs text-gray-400 mt-1">{action.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Empty idle state */}
          {spesAction === '' && (
            <div className="bg-white rounded-xl shadow-md py-20 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FolderOpen size={32} className="text-brand-blue" />
              </div>
              <h3 className="text-gray-700 mb-2 text-center">SPES Program Maintenance</h3>
              <p className="text-gray-400 text-center px-8">
                Select an action above to manage projects and services for the SPES program.
              </p>
            </div>
          )}

          {/* Add Batch form */}
          {spesAction === 'add_batch' && (
            <SPESMaintenanceForm
              mode="batch"
              onSaveBatch={handleAddBatch}
              onCancel={() => setSpesAction('')}
              isSaving={isSavingSpesBatch}
            />
          )}

          {/* View Batches table */}
          {spesAction === 'view_batches' && (
            <>
              {/* Search + filter bar */}
              <div className="bg-white rounded-xl shadow-md p-5 mb-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={spesSearch}
                      onChange={e => setSpesSearch(e.target.value)}
                      placeholder="Search by batch name or employer..."
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                    />
                  </div>
                  <select
                    value={spesStatusFilter}
                    onChange={e => setSpesStatusFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                  >
                    <option value="All">All Status</option>
                    <option value="Planned">Planned</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="bg-brand-blue px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-white m-0">SPES Batches</h3>
                  </div>
                  <button
                    onClick={() => setSpesAction('add_batch')}
                    disabled={!canManage('spes-maintenance')}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-brand-blue rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                  >
                    <Plus size={16} /> Add Batch
                  </button>
                </div>

                {sortedSpesBatches.length === 0 ? (
                  <div className="text-center py-16">
                    <FolderOpen size={48} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No SPES batches found.</p>
                    <button
                      onClick={() => setSpesAction('add_batch')}
                      disabled={!canManage('spes-maintenance')}
                      className="mt-4 px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue"
                    >
                      Add First Batch
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Batch Name</th>
                          <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Employer / Agency</th>
                          <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Slots</th>
                          <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Program Period</th>
                          <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Funding Source</th>
                          <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Status</th>
                          <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold w-16">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedSpesBatches.map(b => (
                          <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm">
                              <span className="text-gray-800 font-medium">{b.batchName}</span>
                              {b.description && (
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{b.description}</p>
                              )}
                              {(() => {
                                const count = spesApplicants.filter(a => a.assignedBatchId === b.id).length
                                return count > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-brand-blue mt-1">
                                    <Users size={11} /> {count} applicant{count !== 1 ? 's' : ''} assigned
                                  </span>
                                ) : null
                              })()}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 max-w-[180px]">
                              <p className="line-clamp-1">{b.employer || '—'}</p>
                              {b.deploymentLocation && (
                                <p className="text-xs text-gray-400 line-clamp-1">{b.deploymentLocation}</p>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 text-center whitespace-nowrap">
                              {b.availableSlots ? (
                                <span className={b.assignedCount >= parseInt(b.availableSlots, 10) ? 'text-red-500 font-semibold' : ''}>
                                  {b.assignedCount}/{b.availableSlots}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                              {b.programStartDate && b.programEndDate
                                ? `${b.programStartDate} – ${b.programEndDate}`
                                : '—'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                              {b.fundingSource || '—'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${SPES_BATCH_STATUS_COLORS[b.status]}`}>
                                {b.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={e => {
                                  const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                                  const dropdownW = 192
                                  const dropdownH = 200
                                  const left = Math.min(rect.right - dropdownW, window.innerWidth - dropdownW - 8)
                                  const spaceBelow = window.innerHeight - rect.bottom - 8
                                  const top = spaceBelow >= dropdownH ? rect.bottom + 4 : rect.top - dropdownH - 4
                                  setMenuPos({ top: Math.max(8, top), left: Math.max(8, left) })
                                  setOpenMenuId(openMenuId === b.id ? null : b.id)
                                }}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                              >
                                <MoreHorizontal size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {spesBatches.length > 0 && (
                  <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Rows per page:</span>
                      <select
                        value={spesBatchPerPage}
                        onChange={e => { setSpesBatchPerPage(Number(e.target.value)); setSpesBatchPage(1) }}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                      >
                        {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">
                        {spesBatchRecordStart}–{spesBatchRecordEnd} of {sortedSpesBatches.length} records
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setSpesBatchPage(p => Math.max(1, p - 1))}
                          disabled={spesBatchSafePage === 1}
                          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          onClick={() => setSpesBatchPage(p => Math.min(spesBatchTotalPages, p + 1))}
                          disabled={spesBatchSafePage === spesBatchTotalPages}
                          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SPES batch action menu */}
              {openMenuId !== null && menuPos && (() => {
                const b = spesBatches.find(x => x.id === openMenuId)
                if (!b) return null
                return (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                    <div
                      style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, maxHeight: 'calc(100vh - 24px)' }}
                      className="w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1 overflow-y-auto"
                    >
                      <button
                        onClick={() => { setSelectedBatch(b); setSpesBatchAction('view_batch'); setOpenMenuId(null) }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
                      >
                        <FolderOpen size={15} className="text-brand-blue" />
                        View Batch Details
                      </button>
                      <button
                        onClick={() => { setSelectedBatch(b); setSpesBatchAction('view_participants'); setOpenMenuId(null) }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
                      >
                        <ClipboardList size={15} className="text-gray-500" />
                        View Participants
                      </button>
                      <div className="my-1 border-t border-gray-100" />
                      <button
                        onClick={() => { setSelectedBatch(b); setSpesBatchAction('edit_batch'); setOpenMenuId(null) }}
                        disabled={!canManage('spes-maintenance')}
                        className="w-full px-4 py-2.5 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        <Edit2 size={15} className="text-blue-500" />
                        Edit
                      </button>
                      {b.status === 'Planned' && (
                        <button
                          onClick={() => { setStatusConfirm({ batch: b, nextStatus: 'Ongoing', action: 'Mark as Ongoing' }); setOpenMenuId(null) }}
                          disabled={!canManage('spes-maintenance')}
                          className="w-full px-4 py-2.5 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        >
                          <PlayCircle size={15} className="text-green-600" />
                          Mark as Ongoing
                        </button>
                      )}
                      {b.status === 'Ongoing' && (
                        <button
                          onClick={() => { setStatusConfirm({ batch: b, nextStatus: 'Completed', action: 'Mark as Completed' }); setOpenMenuId(null) }}
                          disabled={!canManage('spes-maintenance')}
                          className="w-full px-4 py-2.5 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        >
                          <CheckCircle size={15} className="text-green-600" />
                          Mark as Completed
                        </button>
                      )}
                      {b.status === 'Completed' && (
                        <button
                          onClick={() => { setStatusConfirm({ batch: b, nextStatus: 'Planned', action: 'Reopen Batch' }); setOpenMenuId(null) }}
                          disabled={!canManage('spes-maintenance')}
                          className="w-full px-4 py-2.5 text-left text-sm text-brand-blue hover:bg-blue-50 flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        >
                          <RefreshCw size={15} className="text-brand-blue" />
                          Reopen Batch
                        </button>
                      )}
                      <div className="my-1 border-t border-gray-100" />
                      <button
                        onClick={() => confirmDeleteSpesBatch(b)}
                        disabled={!canManage('spes-maintenance')}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        <Trash2 size={15} className="text-red-500" />
                        Delete
                      </button>
                    </div>
                  </>
                )
              })()}
            </>
          )}
        </>
      )}

      {/* ── SPES status change modal ───────────────────────────────────────────── */}
      {statusConfirm !== null && (() => {
        const { batch, nextStatus, action } = statusConfirm
        const stepOrder: SPESBatch['status'][] = ['Planned', 'Ongoing', 'Completed']
        const currentIdx = stepOrder.indexOf(batch.status)
        const nextIdx = stepOrder.indexOf(nextStatus)
        const isForward = nextIdx > currentIdx

        const circleClass = (step: SPESBatch['status']) => {
          const idx = stepOrder.indexOf(step)
          if (isForward) {
            if (idx < nextIdx) return { bg: 'bg-blue-400', text: 'text-white', label: 'text-blue-400 font-semibold' }
            if (idx === nextIdx) return nextStatus === 'Completed'
              ? { bg: 'bg-green-600', text: 'text-white', label: 'text-green-600 font-semibold' }
              : { bg: 'bg-blue-600', text: 'text-white', label: 'text-blue-600 font-semibold' }
            return { bg: 'bg-gray-200', text: 'text-gray-400', label: 'text-gray-400' }
          } else {
            if (idx === currentIdx) return { bg: 'bg-blue-400', text: 'text-white', label: 'text-blue-400 font-semibold' }
            if (idx === nextIdx) return { bg: 'bg-blue-600', text: 'text-white', label: 'text-blue-600 font-semibold' }
            return { bg: 'bg-gray-200', text: 'text-gray-400', label: 'text-gray-400' }
          }
        }

        const connectorClass = (i: number) =>
          isForward && i + 1 <= nextIdx ? 'bg-blue-400' : 'bg-gray-200'

        const confirmBtnClass =
          nextStatus === 'Completed' ? 'bg-green-600 hover:bg-green-700 text-white' :
          'bg-blue-600 hover:bg-blue-700 text-white'

        const nextStatusTextClass =
          nextStatus === 'Completed' ? 'text-green-600' : 'text-blue-600'

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  {nextStatus === 'Completed' ? <CheckCircle size={20} className="text-green-600" /> :
                   nextStatus === 'Ongoing'   ? <PlayCircle size={20} className="text-blue-600" /> :
                   <RefreshCw size={20} className="text-brand-blue" />}
                </div>
                <h3 className="text-gray-800 m-0 text-lg">{action}</h3>
              </div>

              <div className="relative flex items-start justify-between mb-6 px-2">
                <div className="absolute top-4 left-10 right-10 flex">
                  {[0, 1].map(i => (
                    <div key={i} className={`flex-1 h-0.5 ${connectorClass(i)}`} />
                  ))}
                </div>
                {stepOrder.map((step, i) => {
                  const styles = circleClass(step)
                  return (
                    <div key={step} className="flex flex-col items-center gap-1.5 relative z-10 w-16">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${styles.bg} ${styles.text}`}>
                        {i + 1}
                      </div>
                      <span className={`text-xs text-center leading-tight ${styles.label}`}>{step}</span>
                    </div>
                  )
                })}
              </div>

              <p className="text-gray-600 text-sm mb-6">
                Change <span className="font-semibold text-gray-800">{batch.batchName}</span> status from{' '}
                <span className="text-blue-400 font-semibold">{batch.status}</span> to{' '}
                <span className={`font-semibold ${nextStatusTextClass}`}>{nextStatus}</span>?
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setStatusConfirm(null)}
                  className="px-6 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await spesApiService.updateBatchStatus(batch.id, nextStatus)
                      await refreshSpesBatches()
                      await refreshSpesProfiles()
                      setStatusConfirm(null)
                      setResultModal({ isOpen: true, type: 'success', title: 'Status Updated', message: `Batch status changed to ${nextStatus}.` })
                    } catch (e: unknown) {
                      setStatusConfirm(null)
                      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: apiErrMsg(e, 'Failed to update batch status.') })
                    }
                  }}
                  className={`px-6 py-2.5 rounded-lg transition-colors font-medium ${confirmBtnClass}`}
                >
                  {action}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      <ConfirmModal
        isOpen={deleteSpesBatchConfirm !== null}
        type="confirm"
        title="Delete SPES Batch?"
        message={deleteSpesBatchConfirm ? `Are you sure you want to delete "${deleteSpesBatchConfirm.batchName}"? This will move the batch to the recycle bin.` : ''}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        onConfirm={proceedDeleteSpesBatch}
        onCancel={() => setDeleteSpesBatchConfirm(null)}
      />
      <ConfirmModal
        isOpen={deleteGipWorkplaceConfirm !== null}
        type="confirm"
        title="Delete GIP Workplace/Office?"
        message={deleteGipWorkplaceConfirm ? `Are you sure you want to delete "${deleteGipWorkplaceConfirm.workplaceName}"? This will move it to the recycle bin.` : ''}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        onConfirm={proceedDeleteGipWorkplace}
        onCancel={() => setDeleteGipWorkplaceConfirm(null)}
      />
      <ConfirmModal
        isOpen={resultModal.isOpen}
        type={resultModal.type}
        title={resultModal.title}
        message={resultModal.message}
        confirmText="OK"
        onConfirm={() => setResultModal(prev => ({ ...prev, isOpen: false }))}
        onCancel={() => setResultModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}

export default function Maintenance({ onBack }: MaintenanceProps) {
  return <MaintenanceInner onBack={onBack} />
}
