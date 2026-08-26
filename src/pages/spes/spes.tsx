import { useState } from 'react'
import { fmtDate } from '../../utils/formatDate'
import ConfirmModal from '../shared/ConfirmModal'
import {
  ArrowLeft, Search, Plus, X, Users,
  AlertCircle, Upload, Download, ChevronDown, MoreHorizontal,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { useSPES } from '../../contexts/SPESContext'
import { canManage } from '../../utils/permissions'
import type { SPESApplicant, SPESBatch } from '../../contexts/SPESContext'
import * as spesApiService from '../../services/spesService'
import SPESProfileForm, {
  ViewApplicantPanel, emptyForm, SCHOOL_TYPE_OPTIONS, CIVIL_STATUS_OPTIONS,
  StatusBadge, BatchStatusBadge, deriveStatus,
} from './SPESProfileForm'
import { downloadImportTemplate, importSpesApplicants, type ImportResult } from './spesImport'

interface SPESViewProps {
  onBack: () => void
}

const STATUS_OPTIONS: SPESApplicant['status'][] = ['Active', 'Inactive', 'Completed', 'Cancelled']

// ─── Import modal ──────────────────────────────────────────────────────────────

function SPESImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  function pickFile(f: File | null) {
    setFile(f)
    setResult(null)
    setError(null)
  }

  async function handleImport() {
    if (!file || isImporting) return
    setIsImporting(true)
    setError(null)
    setResult(null)
    setProgress({ done: 0, total: 0 })
    try {
      const res = await importSpesApplicants(file, (done, total) => setProgress({ done, total }))
      setResult(res)
      if (res.succeeded > 0) onImported()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the file. Make sure it's a valid .xlsx file.")
    } finally {
      setIsImporting(false)
      setProgress(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <p className="text-gray-800 font-semibold">Import SPES Applicants</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {result ? (
            <ImportResultView result={result} />
          ) : (
            <>
              <button onClick={() => { void downloadImportTemplate() }} className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50">Download Template</button>
              <label className={`block w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${file ? 'border-brand-blue bg-blue-50' : 'border-gray-300 hover:border-brand-blue hover:bg-blue-50'}`}>
                <Upload size={28} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 break-all">{file ? file.name : 'Click to upload or drag and drop'}</p>
                <p className="text-xs text-gray-400 mt-1">.xlsx files only</p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  disabled={isImporting}
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
              </label>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              {isImporting && progress && (
                <p className="text-sm text-gray-600 text-center">Importing {progress.done} of {progress.total}…</p>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
          {result ? (
            <button onClick={onClose} className="flex-1 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark text-sm">Done</button>
          ) : (
            <>
              <button onClick={onClose} disabled={isImporting} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm disabled:opacity-50">Cancel</button>
              <button onClick={handleImport} disabled={!file || isImporting} className="flex-1 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark disabled:opacity-50 disabled:cursor-not-allowed">
                {isImporting ? 'Importing…' : 'Import'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ImportResultView({ result }: { result: ImportResult }) {
  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <div className="flex-1 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-center">
          <p className="text-2xl font-semibold text-green-700">{result.succeeded}</p>
          <p className="text-xs text-green-700">Imported</p>
        </div>
        <div className="flex-1 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-center">
          <p className="text-2xl font-semibold text-red-700">{result.failed.length}</p>
          <p className="text-xs text-red-700">Failed</p>
        </div>
      </div>

      {result.total === 0 ? (
        <p className="text-sm text-gray-500 text-center">No applicant rows were found in the file.</p>
      ) : result.failed.length === 0 ? (
        <p className="text-sm text-green-700 text-center">All {result.succeeded} applicant{result.succeeded !== 1 ? 's' : ''} imported successfully.</p>
      ) : (
        <div className="mt-1">
          <p className="text-xs font-semibold text-gray-600 mb-1">Rows that could not be imported:</p>
          <ul className="space-y-1 max-h-48 overflow-y-auto text-xs">
            {result.failed.map((f) => (
              <li key={f.row} className="rounded border border-red-100 bg-red-50 px-2 py-1.5">
                <span className="font-medium text-gray-700">Row {f.row} — {f.name}:</span>{' '}
                <span className="text-red-600">{f.error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function errMsg(e: unknown, fallback: string) {
  return (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
    ?? (e as { message?: string })?.message ?? fallback
}

// ─── Main SPESView ────────────────────────────────────────────────────────────

export default function SPESView({ onBack }: SPESViewProps) {
  const { applicants, spesBatches, refreshProfiles, refreshBatches } = useSPES()

  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [sortOrder, setSortOrder] = useState<'firstName_asc' | 'firstName_desc' | 'lastName_asc' | 'lastName_desc' | 'dateApplied_newest' | 'dateApplied_oldest' | ''>('')
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})

  const availableFilters = [
    { id: 'status',     label: 'Status',      options: STATUS_OPTIONS as string[] },
    { id: 'schoolType', label: 'School Type',  options: SCHOOL_TYPE_OPTIONS },
    { id: 'sex',        label: 'Sex',          options: ['Male', 'Female'] },
    { id: 'age',        label: 'Age',          options: ['Below 20', '20–25', '26–30', '31–40', 'Above 40'] },
    { id: 'civilStatus',label: 'Civil Status', options: CIVIL_STATUS_OPTIONS },
    { id: 'course',     label: 'Course / Program', type: 'text' as const },
  ]

  const handleAddFilter = (filterId: string) => {
    if (!activeFilters.includes(filterId)) {
      setActiveFilters(prev => [...prev, filterId])
      setFilterValues(prev => ({ ...prev, [filterId]: '' }))
      setCurrentPage(1)
    }
    setIsFilterDropdownOpen(false)
  }

  const handleRemoveFilter = (filterId: string) => {
    setActiveFilters(prev => prev.filter(id => id !== filterId))
    setFilterValues(prev => { const n = { ...prev }; delete n[filterId]; return n })
    setCurrentPage(1)
  }

  const handleFilterValueChange = (filterId: string, value: string) => {
    setFilterValues(prev => ({ ...prev, [filterId]: value }))
    setCurrentPage(1)
  }

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingApplicant, setEditingApplicant] = useState<SPESApplicant | null>(null)
  const [viewingApplicant, setViewingApplicant] = useState<SPESApplicant | null>(null)
  const [assignTarget, setAssignTarget] = useState<SPESApplicant | null>(null)
  const [selectedBatch, setSelectedBatch] = useState<SPESBatch | null>(null)
  const [confirmingBatch, setConfirmingBatch] = useState<SPESBatch | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)
  const [viewingAssignedBatchFor, setViewingAssignedBatchFor] = useState<SPESApplicant | null>(null)
  const [confirmUnassignId, setConfirmUnassignId] = useState<number | null>(null)
  const [batchSearch, setBatchSearch] = useState('')

  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const [resultModal, setResultModal] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({ isOpen: false, type: 'success', title: '', message: '' })
  const [deleteConfirm, setDeleteConfirm] = useState<SPESApplicant | null>(null)

  const batchNameFor = (applicant: SPESApplicant) =>
    spesBatches.find(b => b.id === applicant.assignedBatchId)?.batchName ?? ''

  const filtered = applicants.filter(a => {
    const fullName = `${a.lastName} ${a.firstName} ${a.middleName}`.toLowerCase()
    const derivedStatus = deriveStatus(a, spesBatches)
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      a.barangay.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.schoolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batchNameFor(a).toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilters = activeFilters.every(filterId => {
      const val = filterValues[filterId]
      if (!val) return true
      if (filterId === 'status') return derivedStatus === val
      if (filterId === 'schoolType') return a.schoolType === val
      if (filterId === 'sex') return a.sex === val
      if (filterId === 'civilStatus') return a.civilStatus === val
      if (filterId === 'course') return (a.course ?? '').toLowerCase().includes(val.toLowerCase())
      if (filterId === 'age') {
        const age = a.age ?? 0
        if (val === 'Below 20') return age < 20
        if (val === '20–25') return age >= 20 && age <= 25
        if (val === '26–30') return age >= 26 && age <= 30
        if (val === '31–40') return age >= 31 && age <= 40
        if (val === 'Above 40') return age > 40
      }
      return true
    })
    return matchesSearch && matchesFilters
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortOrder === 'dateApplied_newest') return (b.dateApplicationReceived || '').localeCompare(a.dateApplicationReceived || '')
    if (sortOrder === 'dateApplied_oldest') return (a.dateApplicationReceived || '').localeCompare(b.dateApplicationReceived || '')
    if (!sortOrder) return 0
    const keyA = (sortOrder.startsWith('firstName') ? (a.firstName ?? '') : (a.lastName ?? '')).toLowerCase()
    const keyB = (sortOrder.startsWith('firstName') ? (b.firstName ?? '') : (b.lastName ?? '')).toLowerCase()
    return sortOrder.endsWith('asc') ? keyA.localeCompare(keyB) : keyB.localeCompare(keyA)
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = sorted.slice((safePage - 1) * perPage, safePage * perPage)
  const recordStart = sorted.length === 0 ? 0 : (safePage - 1) * perPage + 1
  const recordEnd = Math.min(safePage * perPage, sorted.length)

  const handleAddSave = async (data: Omit<SPESApplicant, 'id'>) => {
    try {
      await spesApiService.createProfile(data as unknown as Record<string, unknown>)
      await refreshProfiles()
      setIsFormOpen(false)
      setResultModal({ isOpen: true, type: 'success', title: 'Success', message: 'Applicant profile has been added successfully.' })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: errMsg(e, 'Failed to save profile.') })
    }
  }

  const handleEditSave = async (data: Omit<SPESApplicant, 'id'>) => {
    if (!editingApplicant) return
    try {
      await spesApiService.updateProfile(editingApplicant.id, data as unknown as Record<string, unknown>)
      await refreshProfiles()
      setEditingApplicant(null)
      setResultModal({ isOpen: true, type: 'success', title: 'Success', message: 'Applicant profile has been updated successfully.' })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: errMsg(e, 'Failed to update profile.') })
    }
  }

  const handleDelete = (applicant: SPESApplicant) => {
    setDeleteConfirm(applicant)
  }

  const proceedDelete = async () => {
    if (!deleteConfirm) return
    const applicant = deleteConfirm
    const name = `${applicant.lastName}, ${applicant.firstName}${applicant.middleName ? ' ' + applicant.middleName.charAt(0) + '.' : ''}`
    setDeleteConfirm(null)
    try {
      await spesApiService.deleteProfile(applicant.id)
      await refreshProfiles()
      setResultModal({ isOpen: true, type: 'success', title: 'Deleted', message: `${name} has been deleted and moved to the recycle bin.` })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: errMsg(e, 'Failed to delete profile.') })
    }
  }

  const handleAssign = async (batch: SPESBatch) => {
    if (!assignTarget || isAssigning) return
    setIsAssigning(true)
    try {
      await spesApiService.assignBatch(assignTarget.id, batch.id)
      await refreshProfiles()
      await refreshBatches()
      setAssignTarget(null)
      setSelectedBatch(null)
      setConfirmingBatch(null)
      setBatchSearch('')
      setResultModal({ isOpen: true, type: 'success', title: 'Success', message: `Assigned to "${batch.batchName}" successfully.` })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: errMsg(e, 'Failed to assign batch.') })
    } finally {
      setIsAssigning(false)
    }
  }

  const handleUnassign = async (targetId?: number) => {
    if (isAssigning) return
    const id = targetId ?? assignTarget?.id
    if (!id) return
    setIsAssigning(true)
    try {
      await spesApiService.unassignBatch(id)
      await refreshProfiles()
      await refreshBatches()
      setAssignTarget(null)
      setSelectedBatch(null)
      setViewingAssignedBatchFor(null)
      setBatchSearch('')
      setResultModal({ isOpen: true, type: 'success', title: 'Removed', message: 'Assigned batch has been removed.' })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: errMsg(e, 'Failed to remove assignment.') })
    } finally {
      setIsAssigning(false)
    }
  }

  const exportToExcel = () => {
    const data = filtered.map(a => ({
      'Last Name': a.lastName, 'First Name': a.firstName, 'Middle Name': a.middleName,
      'Sex': a.sex, 'Birthdate': a.birthdate, 'Age': a.age, 'Civil Status': a.civilStatus,
      'Contact Number': a.contactNumber, 'Email': a.email,
      'Barangay': a.barangay, 'City / Municipality': a.cityMunicipality, 'Province': a.province,
      'School Name': a.schoolName, 'School Type': a.schoolType,
      'Grade / Year Level': a.gradeYearLevel, 'Course': a.course,
      'Annual Family Income': a.annualFamilyIncome, 'Number of Dependents': a.numberOfDependents,
      'Assigned Batch': batchNameFor(a),
      'Status': deriveStatus(a, spesBatches), 'Remarks': a.remarks,
      'Date Received': a.dateApplicationReceived, 'Received By': a.receivedBy,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'SPES Applicants')
    XLSX.writeFile(wb, `SPES_Applicants_${new Date().toISOString().split('T')[0]}.xlsx`)
    setIsExportDropdownOpen(false)
  }

  const exportToCSV = () => {
    const data = filtered.map(a => ({
      'Last Name': a.lastName, 'First Name': a.firstName,
      'School': a.schoolName, 'Grade / Year Level': a.gradeYearLevel,
      'Assigned Batch': batchNameFor(a), 'Status': deriveStatus(a, spesBatches),
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `SPES_Applicants_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    setIsExportDropdownOpen(false)
  }

  if (isFormOpen) return <SPESProfileForm initial={emptyForm} mode="add" onSave={handleAddSave} onClose={() => setIsFormOpen(false)} />

  if (editingApplicant) {
    const { id: _id, ...rest } = editingApplicant
    return <SPESProfileForm initial={rest} mode="edit" onSave={handleEditSave} onClose={() => setEditingApplicant(null)} />
  }

  const liveViewingApplicant = viewingApplicant ? (applicants.find(a => a.id === viewingApplicant.id) ?? viewingApplicant) : null
  if (liveViewingApplicant) return <ViewApplicantPanel applicant={liveViewingApplicant} onClose={() => setViewingApplicant(null)} />

  return (
    <>

      {/* Assign Batch — detail modal (step 2) */}
      {assignTarget && selectedBatch && (() => {
        const isAssigned = assignTarget.assignedBatchId === selectedBatch.id
        const statusColor =
          selectedBatch.status === 'Ongoing'   ? 'bg-green-100 text-green-700' :
          selectedBatch.status === 'Completed' ? 'bg-blue-100 text-blue-700'  :
          selectedBatch.status === 'Planned'   ? 'bg-yellow-100 text-yellow-700' :
                                                  'bg-gray-100 text-gray-600'
        const Row = ({ label, value }: { label: string; value?: string | number }) =>
          value ? (
            <div className="flex gap-3 py-2.5 border-b border-gray-100 last:border-0">
              <span className="text-xs text-gray-400 w-40 flex-shrink-0 pt-0.5">{label}</span>
              <span className="text-sm text-gray-800 font-medium">{value}</span>
            </div>
          ) : null
        return (
          <>
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[85vh]">
                <div className="bg-brand-blue px-6 py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
                  <div>
                    <h3 className="text-white m-0 text-base font-semibold">Assign Batch</h3>
                    <p className="text-white/80 text-sm mt-0.5">{assignTarget.lastName}, {assignTarget.firstName} {assignTarget.middleName}</p>
                  </div>
                  <button onClick={() => setSelectedBatch(null)} className="p-1 text-white/80 hover:text-white transition-colors"><X size={20} /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-6">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-semibold text-gray-800">{selectedBatch.batchName}</p>
                      {selectedBatch.description && <p className="text-sm text-gray-500 mt-1">{selectedBatch.description}</p>}
                      {isAssigned && <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-brand-blue rounded-full text-xs font-semibold">Currently Assigned</span>}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium flex-shrink-0 ${statusColor}`}>{selectedBatch.status}</span>
                  </div>
                  <div className="mt-4">
                    <Row label="Employer / Agency" value={selectedBatch.employer} />
                    <Row label="Deployment Location" value={selectedBatch.deploymentLocation} />
                    <Row label="Program Coordinator" value={selectedBatch.coordinator} />
                    <Row label="Program Start Date" value={selectedBatch.programStartDate} />
                    <Row label="Program End Date" value={selectedBatch.programEndDate} />
                    <Row label="Available Slots" value={`${selectedBatch.assignedCount}/${selectedBatch.availableSlots}`} />
                    <Row label="Funding Source" value={selectedBatch.fundingSource === 'Other' ? `Other — ${selectedBatch.fundingSourceOther}` : selectedBatch.fundingSource} />
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
                  <button onClick={() => setSelectedBatch(null)} className="flex-1 py-2.5 border border-brand-blue text-brand-blue rounded-xl hover:bg-blue-50 transition-colors text-sm font-medium">Change Batch</button>
                  <button onClick={() => setConfirmingBatch(selectedBatch)} disabled={!canManage('spes')} className="flex-1 py-2.5 bg-brand-blue text-white rounded-xl hover:bg-brand-blue-dark transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue">{isAssigned ? 'Re-assign' : 'Assign'}</button>
                </div>
              </div>
            </div>
            <ConfirmModal
              isOpen={!!confirmingBatch}
              type="confirm"
              title="Confirm Assignment"
              message={`Assign "${selectedBatch.batchName}" to ${assignTarget.firstName} ${assignTarget.lastName}?`}
              confirmText="Yes, Assign"
              cancelText="Cancel"
              onConfirm={() => handleAssign(selectedBatch)}
              onCancel={() => setConfirmingBatch(null)}
            />
          </>
        )
      })()}

      {/* View Assigned Batch modal */}
      {viewingAssignedBatchFor && (() => {
        const batch = spesBatches.find(b => b.id === viewingAssignedBatchFor.assignedBatchId)
        const close = () => setViewingAssignedBatchFor(null)
        // There's no separate assignment-history table — the only record that
        // this applicant was ever in this batch is the live batch_id link.
        // Once the batch moves past Planned (Ongoing/Completed), real
        // progress has happened, so unassigning or changing batch would
        // silently erase that record.
        const canChange = batch ? batch.status === 'Planned' : true
        const statusColor = (s: string) =>
          s === 'Ongoing'   ? 'bg-green-100 text-green-700' :
          s === 'Completed' ? 'bg-blue-100 text-blue-700'  :
          s === 'Planned'   ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-600'
        const Row = ({ label, value }: { label: string; value?: string | number }) =>
          value ? (
            <div className="flex gap-3 py-2.5 border-b border-gray-100 last:border-0">
              <span className="text-xs text-gray-400 w-40 flex-shrink-0 pt-0.5">{label}</span>
              <span className="text-sm text-gray-800 font-medium">{value}</span>
            </div>
          ) : null
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[85vh]">
              <div className="bg-brand-blue px-6 py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-white m-0 text-base">Assigned Batch</h3>
                  <p className="text-white/80 text-sm mt-0.5">{viewingAssignedBatchFor.lastName}, {viewingAssignedBatchFor.firstName} {viewingAssignedBatchFor.middleName}</p>
                </div>
                <button onClick={close} className="p-1 text-white/80 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              <div className="overflow-y-auto flex-1 p-6">
                {batch ? (
                  <>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-semibold text-gray-800">{batch.batchName}</p>
                        {batch.description && <p className="text-sm text-gray-500 mt-1">{batch.description}</p>}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium flex-shrink-0 ${statusColor(batch.status)}`}>{batch.status}</span>
                    </div>
                    <div>
                      <Row label="Employer / Agency" value={batch.employer} />
                      <Row label="Deployment Location" value={batch.deploymentLocation} />
                      <Row label="Program Coordinator" value={batch.coordinator} />
                      <Row label="Program Start Date" value={batch.programStartDate} />
                      <Row label="Program End Date" value={batch.programEndDate} />
                      <Row label="Available Slots" value={`${batch.assignedCount}/${batch.availableSlots}`} />
                      <Row label="Funding Source" value={batch.fundingSource === 'Other' ? `Other — ${batch.fundingSourceOther}` : batch.fundingSource} />
                      {/* No separate history table (single batch_id link), so this
                          applicant's own assigned/completed dates live here instead
                          of a now-removed separate "Assignment History" modal. */}
                      <Row label="Date Assigned" value={viewingAssignedBatchFor.assignmentHistory[0]?.assignedDate ? fmtDate(viewingAssignedBatchFor.assignmentHistory[0].assignedDate) : undefined} />
                      <Row label="Date Completed" value={viewingAssignedBatchFor.assignmentHistory[0]?.completedDate ? fmtDate(viewingAssignedBatchFor.assignmentHistory[0].completedDate) : undefined} />
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-xs text-gray-400">Batch details not found. It may have been deleted in Maintenance.</p>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
                <button
                  onClick={() => setConfirmUnassignId(viewingAssignedBatchFor.id)}
                  disabled={!canChange || !canManage('spes')}
                  title={!canChange ? 'This batch is no longer Open — unassigning would erase the only record of this assignment.' : undefined}
                  className="px-4 py-2.5 border border-red-200 text-red-500 rounded-xl hover:bg-red-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >Unassign</button>
                <button
                  onClick={() => { close(); setAssignTarget(viewingAssignedBatchFor) }}
                  disabled={!canChange || !canManage('spes')}
                  className={`px-4 py-2.5 border border-brand-blue text-brand-blue rounded-xl hover:bg-blue-50 transition-colors text-sm font-medium${(!canChange || !canManage('spes')) ? ' opacity-50 cursor-not-allowed' : ''}`}
                >Change Batch</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Assign Batch — selection modal (step 1) */}
      {assignTarget && !selectedBatch && (() => {
        const currentBatch = assignTarget.assignedBatchId
          ? spesBatches.find(b => b.id === assignTarget.assignedBatchId) ?? null
          : null
        const filteredBatches = spesBatches
          .filter(b => b.status === 'Planned')
          .filter(b =>
            batchSearch === '' ||
            b.batchName.toLowerCase().includes(batchSearch.toLowerCase()) ||
            b.employer.toLowerCase().includes(batchSearch.toLowerCase()) ||
            b.coordinator.toLowerCase().includes(batchSearch.toLowerCase())
          )
        const scBadge = (s: string) =>
          s === 'Planned' ? 'bg-yellow-100 text-yellow-700 font-medium' :
          s === 'Ongoing' ? 'bg-green-100 text-green-700 font-medium' :
                            'bg-gray-100 text-gray-600 font-medium'
        const close = () => { setAssignTarget(null); setBatchSearch('') }
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
              <div className="bg-brand-blue px-6 py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-white m-0 text-base font-semibold">Assign Batch</h3>
                  <p className="text-white/80 text-sm mt-0.5">{assignTarget.firstName} {assignTarget.lastName}</p>
                </div>
                <button onClick={close} className="p-1 text-white/80 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              <div className="px-4 pt-3 pb-2 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search batches..."
                    value={batchSearch}
                    onChange={e => setBatchSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1 px-1">
                  <AlertCircle size={11} className="flex-shrink-0" />
                  Only batches with <span className="font-semibold">Planned</span> status are shown
                </p>
              </div>
              {currentBatch && (
                <div className="mx-4 mb-2 bg-blue-50 border border-orange-100 rounded-xl px-4 py-3 flex items-start justify-between gap-3 flex-shrink-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-brand-blue uppercase tracking-widest mb-1">Currently Assigned</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">{currentBatch.batchName}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {currentBatch.employer && <span className="text-xs text-gray-500">{currentBatch.employer}</span>}
                      <BatchStatusBadge status={currentBatch.status} />
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmUnassignId(assignTarget.id)}
                    disabled={currentBatch.status !== 'Planned' || !canManage('spes')}
                    title={currentBatch.status !== 'Planned' ? 'This batch is no longer Planned — unassigning would erase the only record of this assignment.' : undefined}
                    className="text-xs text-red-500 hover:text-red-700 font-medium whitespace-nowrap flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >Unassign</button>
                </div>
              )}
              <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-1.5">
                {filteredBatches.length === 0 ? (
                  <div className="py-12 text-center">
                    <AlertCircle size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-400 text-sm">{batchSearch ? 'No batches match your search.' : 'No Planned SPES batches available.'}</p>
                    <p className="text-gray-400 text-xs mt-1">Add batches in Maintenance → SPES first.</p>
                  </div>
                ) : filteredBatches.map(batch => {
                  const isCurrent = assignTarget.assignedBatchId === batch.id
                  const isFull = !isCurrent && batch.assignedCount >= parseInt(batch.availableSlots || '0', 10)
                  return (
                    <button
                      key={batch.id}
                      onClick={() => { if (!isFull) setSelectedBatch(batch) }}
                      disabled={isFull}
                      title={isFull ? 'This batch is already at full capacity.' : undefined}
                      className={`w-full px-4 py-3.5 text-left rounded-xl border transition-all ${
                        isFull ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed' : 'hover:border-blue-200 hover:bg-blue-50'
                      } ${isCurrent ? 'border-brand-blue bg-blue-50' : 'border-gray-200'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-semibold text-gray-800">{batch.batchName}</span>
                            {isCurrent && <span className="text-xs px-2 py-0.5 bg-blue-100 text-brand-blue rounded-full font-medium">Current</span>}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
                            {batch.employer && <span>{batch.employer}</span>}
                            {batch.coordinator && <><span>·</span><span>{batch.coordinator}</span></>}
                          </div>
                          {(batch.programStartDate || batch.programEndDate) && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                              {batch.programStartDate && batch.programEndDate
                                ? <span>{batch.programStartDate} – {batch.programEndDate}</span>
                                : <span>{batch.programStartDate || batch.programEndDate}</span>}
                              {batch.availableSlots && <><span>·</span><span>{batch.assignedCount}/{batch.availableSlots} slots</span></>}
                            </div>
                          )}
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 mt-0.5 ${scBadge(isFull ? 'Full' : batch.status)}`}>{isFull ? 'Full' : batch.status}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
              <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
                <button onClick={close} className="w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Import Modal */}
      {isImportModalOpen && (
        <SPESImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImported={refreshProfiles}
        />
      )}

      {/* Main List */}
      <div className="h-full overflow-y-auto bg-brand-bg">
        <div className="w-full px-6 py-8">
          <div className="mb-6 flex items-center gap-4">
            <button onClick={onBack} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><ArrowLeft size={24} /></button>
            <p className="text-gray-800 font-bold" style={{ fontSize: 'var(--text-xl)' }}>Special Program for Employment of Students (SPES)</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-3 mb-4">
            <div className="flex gap-2">
              <button onClick={() => setIsFormOpen(true)} disabled={!canManage('spes')} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue text-white rounded-md hover:bg-brand-blue-dark transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue">
                <Plus size={16} /><span>Add Applicant</span>
              </button>
              <button onClick={() => setIsImportModalOpen(true)} disabled={!canManage('spes')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-md transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white">
                <Upload size={16} /><span>Import</span>
              </button>
              <div className="relative">
                <button onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-md transition-colors text-sm">
                  <Download size={16} /><span>Export</span><ChevronDown size={14} />
                </button>
                {isExportDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsExportDropdownOpen(false)} />
                    <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <button onClick={exportToExcel} className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-t-lg"><Download size={16} /> Excel (.xlsx)</button>
                      <button onClick={exportToCSV} className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-b-lg border-t border-gray-100"><Download size={16} /> CSV (.csv)</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="mb-4">
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-48">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-blue placeholder:text-gray-400"
                    placeholder="Search by name, barangay, school, or assigned batch..."
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                  />
                </div>
                <div className="relative">
                  <select
                    value={sortOrder}
                    onChange={e => setSortOrder(e.target.value as typeof sortOrder)}
                    className="appearance-none pl-4 pr-8 py-2 border border-gray-300 rounded-full bg-white text-sm text-gray-700 focus:outline-none focus:border-brand-blue cursor-pointer whitespace-nowrap"
                  >
                    <option value="" disabled>Sort By</option>
          <option value="firstName_asc">First Name ASC</option>
                    <option value="firstName_desc">First Name DSC</option>
                    <option value="lastName_asc">Last Name ASC</option>
                    <option value="lastName_desc">Last Name DSC</option>
                    <option value="dateApplied_newest">Date Applied (Latest)</option>
                    <option value="dateApplied_oldest">Date Applied (Oldest)</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
                <div className="relative">
                  <button
                    onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors whitespace-nowrap text-sm text-gray-700"
                  >
                    <Plus size={16} />
                    <span>Filter By</span>
                    <ChevronDown size={14} className="text-gray-500" />
                  </button>
                  {isFilterDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsFilterDropdownOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        {availableFilters.map(filter => (
                          <button
                            key={filter.id}
                            onClick={() => handleAddFilter(filter.id)}
                            disabled={activeFilters.includes(filter.id)}
                            className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${activeFilters.includes(filter.id) ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'text-gray-700'}`}
                          >
                            {filter.label}
                            {activeFilters.includes(filter.id) && <span className="ml-2 text-xs text-gray-400">(Active)</span>}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              {activeFilters.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {activeFilters.map(filterId => {
                    const filter = availableFilters.find(f => f.id === filterId)
                    return (
                      <div key={filterId} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
                        <span className="text-sm text-blue-700 font-medium">{filter?.label}:</span>
                        {filter?.type === 'text' ? (
                          <input
                            type="text"
                            value={filterValues[filterId] || ''}
                            onChange={e => handleFilterValueChange(filterId, e.target.value)}
                            placeholder="Type to search…"
                            className="text-sm bg-transparent border-none focus:outline-none text-blue-700 font-medium pr-1 placeholder:text-blue-400 placeholder:font-normal w-36"
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <select
                            value={filterValues[filterId] || ''}
                            onChange={e => handleFilterValueChange(filterId, e.target.value)}
                            className="text-sm bg-transparent border-none focus:outline-none text-blue-700 font-medium pr-1 cursor-pointer"
                            onClick={e => e.stopPropagation()}
                          >
                            <option value="">All</option>
                            {filter?.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        )}
                        <button onClick={() => handleRemoveFilter(filterId)} className="text-blue-700 hover:text-blue-900 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {sorted.length === 0 ? (
              <div className="text-center py-16">
                <Users size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No applicants found</p>
                <p className="text-gray-400 text-sm mt-1">{applicants.length === 0 ? 'Click "Add Applicant" to register the first SPES applicant.' : 'Try adjusting your search or filters.'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-brand-blue">
                      <th className="px-4 py-4 text-left text-white whitespace-nowrap">Name</th>
                      {activeFilters.includes('sex')         && <th className="px-4 py-4 text-left text-white whitespace-nowrap">Sex</th>}
                      {activeFilters.includes('age')         && <th className="px-4 py-4 text-left text-white whitespace-nowrap">Age</th>}
                      {activeFilters.includes('civilStatus') && <th className="px-4 py-4 text-left text-white whitespace-nowrap">Civil Status</th>}
                      {activeFilters.includes('course')      && <th className="px-4 py-4 text-left text-white whitespace-nowrap">Course</th>}
                      <th className="px-4 py-4 text-left text-white whitespace-nowrap">Barangay</th>
                      <th className="px-4 py-4 text-left text-white whitespace-nowrap">School</th>
                      <th className="px-4 py-4 text-left text-white whitespace-nowrap">Grade / Year Level</th>
                      <th className="px-4 py-4 text-left text-white whitespace-nowrap">Assigned Batch</th>
                      <th className="px-4 py-4 text-left text-white whitespace-nowrap">Status</th>
                      <th className="px-4 py-4 text-left text-white whitespace-nowrap">Date Applied</th>
                      <th className="px-4 py-4 text-left text-white whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(applicant => {
                      const batch = spesBatches.find(b => b.id === applicant.assignedBatchId)
                      const derivedStatus = deriveStatus(applicant, spesBatches)
                      return (
                      <tr key={applicant.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-gray-800 font-medium">{applicant.lastName}, {applicant.firstName}{applicant.middleName ? ` ${applicant.middleName.charAt(0)}.` : ''}</p>
                        </td>
                        {activeFilters.includes('sex')         && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{applicant.sex || '—'}</td>}
                        {activeFilters.includes('age')         && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{applicant.age ? `${applicant.age} yrs` : '—'}</td>}
                        {activeFilters.includes('civilStatus') && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{applicant.civilStatus || '—'}</td>}
                        {activeFilters.includes('course')      && <td className="px-4 py-3 text-gray-600">{applicant.course || '—'}</td>}
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{applicant.barangay || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">
                          <p className="whitespace-nowrap">{applicant.schoolName || '—'}</p>
                          {applicant.schoolType && <p className="text-gray-400 text-xs">{applicant.schoolType}</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{applicant.gradeYearLevel || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 max-w-[200px]">
                          {batch ? (
                            <div>
                              <p className="line-clamp-2 leading-snug mb-1">{batch.batchName}</p>
                              <BatchStatusBadge status={batch.status} />
                            </div>
                          ) : <span>—</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={derivedStatus} /></td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(applicant.dateApplicationReceived)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={e => {
                              const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                              const menuHeight = 140
                              const showAbove = window.innerHeight - rect.bottom < menuHeight + 8
                              setMenuPos({
                                top: showAbove ? rect.top - menuHeight - 4 : rect.bottom + 4,
                                right: window.innerWidth - rect.right,
                              })
                              setOpenActionMenuId(openActionMenuId === applicant.id ? null : applicant.id)
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
                {sorted.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      Show
                      <select
                        value={perPage}
                        onChange={e => { setPerPage(Number(e.target.value)); setCurrentPage(1) }}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:border-brand-blue"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                      per page
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                        <ChevronLeft size={16} />
                      </button>
                      <span>{recordStart} to {recordEnd} of {sorted.length} records</span>
                      <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {openActionMenuId !== null && menuPos && (() => {
        const applicant = applicants.find(a => a.id === openActionMenuId)
        if (!applicant) return null
        return (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenActionMenuId(null)} />
            <div
              style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, maxHeight: 'calc(100vh - 24px)' }}
              className="w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1 overflow-y-auto"
            >
              <button onClick={() => { setViewingApplicant(applicant); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">View</button>
              <button onClick={() => { setEditingApplicant(applicant); setOpenActionMenuId(null) }} disabled={!canManage('spes')} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Edit</button>
              {applicant.assignedBatchId ? (
                <button onClick={() => { setViewingAssignedBatchFor(applicant); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-brand-blue font-medium hover:bg-blue-50">View Assigned Batch</button>
              ) : (
                <button onClick={() => { setAssignTarget(applicant); setOpenActionMenuId(null) }} disabled={!canManage('spes')} className="w-full px-3 py-2 text-left text-xs text-purple-600 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Assign Batch</button>
              )}
              <div className="my-1 border-t border-gray-100" />
              <button onClick={() => { handleDelete(applicant); setOpenActionMenuId(null) }} disabled={!canManage('spes')} className="w-full px-3 py-2 text-left text-xs text-red-500 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Delete</button>
            </div>
          </>
        )
      })()}

      <ConfirmModal
        isOpen={confirmUnassignId !== null}
        type="confirm"
        title="Remove Batch Assignment"
        message="Are you sure you want to remove the assigned batch from this applicant?"
        confirmText="Yes, Remove"
        cancelText="Cancel"
        onConfirm={async () => {
          if (confirmUnassignId === null) return
          await handleUnassign(confirmUnassignId)
          setConfirmUnassignId(null)
        }}
        onCancel={() => setConfirmUnassignId(null)}
      />
      <ConfirmModal
        isOpen={deleteConfirm !== null}
        type="confirm"
        title="Delete Applicant?"
        message={deleteConfirm ? `Are you sure you want to delete ${deleteConfirm.lastName}, ${deleteConfirm.firstName}${deleteConfirm.middleName ? ' ' + deleteConfirm.middleName.charAt(0) + '.' : ''}? This will move the applicant to the recycle bin.` : ''}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        onConfirm={proceedDelete}
        onCancel={() => setDeleteConfirm(null)}
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
    </>
  )
}
