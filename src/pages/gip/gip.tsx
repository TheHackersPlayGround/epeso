import { useState } from 'react'
import { fmtDate } from '../../utils/formatDate'
import ConfirmModal from '../shared/ConfirmModal'
import {
  ArrowLeft, Search, Plus, X, Users,
  Upload, Download, ChevronDown, MoreHorizontal,
  ChevronRight, ChevronLeft, Loader2,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { useGIP } from '../../contexts/GIPContext'
import { canManage } from '../../utils/permissions'
import type { GIPApplicant, GIPWorkplace } from '../../contexts/GIPContext'
import * as gipApiService from '../../services/gipService'
import GIPProfileForm, {
  ViewApplicantPanel, emptyForm,
  deriveStatus, StatusBadge, CLASSIFICATION_OPTIONS, EDUCATION_OPTIONS, CIVIL_STATUS_OPTIONS,
} from './GIPProfileForm'
import { downloadImportTemplate, importGipApplicants, type ImportResult } from './gipImport'

interface GIPViewProps {
  onBack: () => void
}

// ─── Import modal ──────────────────────────────────────────────────────────────

function GIPImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
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
      const res = await importGipApplicants(file, (done, total) => setProgress({ done, total }))
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
          <p className="text-gray-800 font-semibold">Import GIP Applicants</p>
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

// ─── Main GIPView ──────────────────────────────────────────────────────────────

export default function GIPView({ onBack }: GIPViewProps) {
  const { applicants, gipWorkplaces, refreshProfiles, refreshWorkplaces } = useGIP()

  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [sortOrder, setSortOrder] = useState<'firstName_asc' | 'firstName_desc' | 'lastName_asc' | 'lastName_desc' | 'dateApplied_newest' | 'dateApplied_oldest' | ''>('')
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})

  const availableFilters = [
    { id: 'status',         label: 'Status',         options: ['Ongoing', 'Inactive', 'Completed', 'Cancelled'] as string[] },
    { id: 'classification', label: 'Classification',  options: [...CLASSIFICATION_OPTIONS, 'Others'] },
    { id: 'sex',            label: 'Sex',             options: ['Male', 'Female'] },
    { id: 'age',            label: 'Age',             options: ['Below 20', '20–25', '26–30', '31–40', 'Above 40'] },
    { id: 'civilStatus',    label: 'Civil Status',    options: CIVIL_STATUS_OPTIONS },
    { id: 'education',      label: 'Education',       options: EDUCATION_OPTIONS },
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
  const [editingApplicant, setEditingApplicant] = useState<GIPApplicant | null>(null)
  const [viewingApplicant, setViewingApplicant] = useState<GIPApplicant | null>(null)

  const [assignTarget, setAssignTarget] = useState<GIPApplicant | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)
  const [assignStep, setAssignStep] = useState<1 | 2>(1)
  const [assignSearch, setAssignSearch] = useState('')
  const [selectedWorkplace, setSelectedWorkplace] = useState<GIPWorkplace | null>(null)
  const [confirmingWorkplace, setConfirmingWorkplace] = useState<GIPWorkplace | null>(null)
  const [viewWorkplaceTarget, setViewWorkplaceTarget] = useState<GIPApplicant | null>(null)
  const [completeConfirm, setCompleteConfirm] = useState<GIPApplicant | null>(null)

  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number | null }>({ open: false, id: null })
  const [resultModal, setResultModal] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({ isOpen: false, type: 'success', title: '', message: '' })
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)

  const filtered = applicants.filter(a => {
    const fullName = `${a.lastName} ${a.firstName} ${a.middleName}`.toLowerCase()
    const lastWorkplace = a.assignmentHistory[a.assignmentHistory.length - 1]?.workplaceName ?? ''
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      a.barangay.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lastWorkplace.toLowerCase().includes(searchQuery.toLowerCase())
    const derivedStatus = deriveStatus(a)
    const matchesFilters = activeFilters.every(filterId => {
      const val = filterValues[filterId]
      if (!val) return true
      if (filterId === 'status') return derivedStatus === val
      if (filterId === 'classification') return a.classification.includes(val) || (val === 'Others' && a.classificationOther !== '')
      if (filterId === 'sex') return a.sex === val
      if (filterId === 'civilStatus') return a.civilStatus === val
      if (filterId === 'education') return a.highestEducation === val
      if (filterId === 'age') {
        const age = a.age ?? 0
        if (val === 'Below 20') return age < 20
        if (val === '20–25')    return age >= 20 && age <= 25
        if (val === '26–30')    return age >= 26 && age <= 30
        if (val === '31–40')    return age >= 31 && age <= 40
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

  const handleAddSave = async (data: Omit<GIPApplicant, 'id'>) => {
    try {
      await gipApiService.createProfile(data as unknown as Record<string, unknown>)
      await refreshProfiles()
      setIsFormOpen(false)
      setResultModal({ isOpen: true, type: 'success', title: 'Success', message: 'Applicant profile has been added successfully.' })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: errMsg(e, 'Failed to save profile.') })
    }
  }

  const handleEditSave = async (data: Omit<GIPApplicant, 'id'>) => {
    if (!editingApplicant) return
    try {
      await gipApiService.updateProfile(editingApplicant.id, data as unknown as Record<string, unknown>)
      await refreshProfiles()
      setEditingApplicant(null)
      setResultModal({ isOpen: true, type: 'success', title: 'Success', message: 'Applicant profile has been updated successfully.' })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: errMsg(e, 'Failed to update profile.') })
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await gipApiService.deleteProfile(id)
      await refreshProfiles()
      setDeleteConfirm({ open: false, id: null })
      setResultModal({ isOpen: true, type: 'success', title: 'Deleted', message: 'The applicant has been deleted and moved to the recycle bin.' })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: errMsg(e, 'Failed to delete profile.') })
    }
  }

  const handleAssignWorkplace = async (workplace: GIPWorkplace) => {
    if (!assignTarget || isAssigning) return
    setIsAssigning(true)
    try {
      await gipApiService.assignWorkplace(assignTarget.id, workplace.id)
      await refreshProfiles()
      await refreshWorkplaces()
      setAssignTarget(null)
      setAssignStep(1)
      setSelectedWorkplace(null)
      setAssignSearch('')
      setConfirmingWorkplace(null)
      setResultModal({ isOpen: true, type: 'success', title: 'Success', message: `Assigned to "${workplace.workplaceName}" successfully.` })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: errMsg(e, 'Failed to assign workplace.') })
    } finally {
      setIsAssigning(false)
    }
  }

  const handleUnassignWorkplace = async (targetId?: number) => {
    if (isAssigning) return
    const applicant = targetId ? applicants.find(a => a.id === targetId) : viewWorkplaceTarget
    if (!applicant) return
    setIsAssigning(true)
    try {
      await gipApiService.unassignWorkplace(applicant.id)
      await refreshProfiles()
      await refreshWorkplaces()
      setViewWorkplaceTarget(null)
      setResultModal({ isOpen: true, type: 'success', title: 'Removed', message: 'Applicant has been unassigned from the workplace.' })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: errMsg(e, 'Failed to remove assignment.') })
    } finally {
      setIsAssigning(false)
    }
  }

  // Completing is final — a GIP applicant can only ever go through the
  // program once, so unlike an assignment, a completed engagement is never
  // reopened. It stays on record permanently.
  const handleCompleteAssignment = async (applicantId: number) => {
    if (isAssigning) return
    setIsAssigning(true)
    try {
      await gipApiService.completeAssignment(applicantId)
      await refreshProfiles()
      await refreshWorkplaces()
      setCompleteConfirm(null)
      setResultModal({ isOpen: true, type: 'success', title: 'Completed', message: 'Applicant has been marked as completed.' })
    } catch (e: unknown) {
      setCompleteConfirm(null)
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: errMsg(e, 'Failed to mark as completed.') })
    } finally {
      setIsAssigning(false)
    }
  }

  const openAssignModal = (applicant: GIPApplicant) => {
    setAssignTarget(applicant)
    setAssignStep(1)
    setSelectedWorkplace(null)
    setAssignSearch('')
  }

  const exportToExcel = () => {
    const data = filtered.map(a => {
      const workplace = gipWorkplaces.find(w => w.id === a.assignedWorkplaceId)
      return {
        'Last Name': a.lastName, 'First Name': a.firstName, 'Middle Name': a.middleName,
        'Sex': a.sex, 'Birthdate': a.birthdate, 'Age': a.age, 'Civil Status': a.civilStatus,
        'Contact': a.contactNumber, 'Email': a.email, 'Barangay': a.barangay,
        'Classification': a.classification.join(', '),
        'Education': a.highestEducation, 'School': a.schoolName, 'Course': a.course,
        'Assigned Workplace/Office': workplace?.workplaceName ?? '',
        'Status': deriveStatus(a), 'Remarks': a.remarks,
      }
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'GIP Applicants')
    XLSX.writeFile(wb, `GIP_Applicants_${new Date().toISOString().split('T')[0]}.xlsx`)
    setIsExportDropdownOpen(false)
  }

  const exportToCSV = () => {
    const data = filtered.map(a => {
      const workplace = gipWorkplaces.find(w => w.id === a.assignedWorkplaceId)
      return {
        'Last Name': a.lastName, 'First Name': a.firstName,
        'Barangay': a.barangay,
        'Assigned Workplace/Office': workplace?.workplaceName ?? '',
        'Status': deriveStatus(a),
      }
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `GIP_Applicants_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    setIsExportDropdownOpen(false)
  }

  const closeAssignModal = () => {
    setAssignTarget(null)
    setAssignStep(1)
    setSelectedWorkplace(null)
    setAssignSearch('')
    setConfirmingWorkplace(null)
  }

  if (isFormOpen) return <GIPProfileForm initial={emptyForm} mode="add" onSave={handleAddSave} onClose={() => setIsFormOpen(false)} />

  if (editingApplicant) {
    const { id: _id, ...rest } = editingApplicant
    return <GIPProfileForm initial={rest} mode="edit" onSave={handleEditSave} onClose={() => setEditingApplicant(null)} />
  }

  if (viewingApplicant) return <ViewApplicantPanel applicant={viewingApplicant} onClose={() => setViewingApplicant(null)} />

  const filteredAssignWorkplaces = gipWorkplaces.filter(w =>
    w.workplaceName.toLowerCase().includes(assignSearch.toLowerCase())
  )

  return (
    <>
      <ConfirmModal
        isOpen={deleteConfirm.open}
        type="confirm"
        title="Delete Applicant?"
        message={(() => {
          const applicant = applicants.find(a => a.id === deleteConfirm.id)
          const name = applicant ? `${applicant.firstName} ${applicant.lastName}` : 'this applicant'
          return `Are you sure you want to delete ${name}? This will move the applicant to the recycle bin.`
        })()}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => deleteConfirm.id !== null && handleDelete(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
      />
      <ConfirmModal
        isOpen={resultModal.isOpen} type={resultModal.type} title={resultModal.title} message={resultModal.message}
        confirmText="OK" onConfirm={() => setResultModal(prev => ({ ...prev, isOpen: false }))} onCancel={() => setResultModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Assign Workplace/Office Modal */}
      {assignTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div>
                <h3 className="text-gray-800 font-semibold">
                  {assignStep === 1 ? 'Assign to Workplace/Office' : 'Confirm Assignment'}
                </h3>
                <p className="text-sm text-gray-400 mt-0.5">
                  {assignTarget.firstName} {assignTarget.lastName}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${assignStep >= 1 ? 'bg-brand-blue text-white' : 'bg-gray-200 text-gray-500'}`}>1</span>
                  <ChevronRight size={12} />
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${assignStep >= 2 ? 'bg-brand-blue text-white' : 'bg-gray-200 text-gray-500'}`}>2</span>
                </div>
                <button onClick={closeAssignModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
            </div>

            {assignStep === 1 && (
              <>
                <div className="px-6 pt-4 flex-shrink-0">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-blue"
                      placeholder="Search workplaces/offices..."
                      value={assignSearch}
                      onChange={e => setAssignSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 pt-3 space-y-2">
                  {filteredAssignWorkplaces.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-400">No workplaces/offices found.</p>
                      <p className="text-xs text-gray-300 mt-1">Add one first from GIP Maintenance.</p>
                    </div>
                  ) : filteredAssignWorkplaces.map(workplace => (
                    <button
                      key={workplace.id}
                      onClick={() => { setSelectedWorkplace(workplace); setAssignStep(2) }}
                      className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-brand-blue hover:bg-blue-50 transition-all"
                    >
                      <p className="text-sm font-medium text-gray-800">{workplace.workplaceName}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {workplace.deploymentLocation} · {workplace.assignedCount} currently assigned
                      </p>
                    </button>
                  ))}
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
                  <button onClick={closeAssignModal} className="w-full py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                </div>
              </>
            )}

            {assignStep === 2 && selectedWorkplace && (
              <>
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-800">{selectedWorkplace.workplaceName}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div><span className="text-gray-400">Address:</span> {selectedWorkplace.deploymentLocation || '—'}</div>
                      <div><span className="text-gray-400">Currently Assigned:</span> {selectedWorkplace.assignedCount}</div>
                      <div><span className="text-gray-400">Allowance:</span> {selectedWorkplace.allowance ? `₱${selectedWorkplace.allowance}/mo` : '—'}</div>
                      {selectedWorkplace.supervisor && <div className="col-span-2"><span className="text-gray-400">Supervisor:</span> {selectedWorkplace.supervisor}</div>}
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
                  <button onClick={() => setAssignStep(1)} disabled={isAssigning} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Back</button>
                  <button
                    onClick={() => setConfirmingWorkplace(selectedWorkplace)}
                    disabled={!canManage('gip') || isAssigning}
                    className="flex-1 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue flex items-center justify-center gap-1.5"
                  >
                    {isAssigning && <Loader2 size={14} className="animate-spin" />}
                    {isAssigning ? 'Assigning…' : 'Assign'}
                  </button>
                </div>
              </>
            )}
          </div>
          <ConfirmModal
            isOpen={!!confirmingWorkplace}
            type="confirm"
            title="Confirm Assignment"
            message={`Assign "${confirmingWorkplace?.workplaceName}" to ${assignTarget.firstName} ${assignTarget.lastName}?`}
            confirmText="Yes, Assign"
            cancelText="Cancel"
            onConfirm={() => confirmingWorkplace && handleAssignWorkplace(confirmingWorkplace)}
            onCancel={() => setConfirmingWorkplace(null)}
          />
        </div>
      )}

      {/* View Assigned Workplace/Office Modal */}
      {viewWorkplaceTarget && (() => {
        const currentWorkplace = gipWorkplaces.find(w => w.id === viewWorkplaceTarget.assignedWorkplaceId)
        if (!currentWorkplace) return null
        // Status/dates here are the applicant's OWN (not the workplace's) --
        // the workplace is a reusable directory entry with no period of its
        // own; each person carries their own assigned/completed dates.
        const isCompleted = viewWorkplaceTarget.status === 'Completed'
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div>
                  <h3 className="text-gray-800 font-semibold">Assigned Workplace/Office</h3>
                  <p className="text-sm text-gray-400 mt-0.5">{viewWorkplaceTarget.firstName} {viewWorkplaceTarget.lastName}</p>
                </div>
                <button onClick={() => setViewWorkplaceTarget(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">{currentWorkplace.workplaceName}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isCompleted ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                      {isCompleted ? 'Completed' : 'Ongoing'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div><span className="text-gray-400">Address:</span> {currentWorkplace.deploymentLocation || '—'}</div>
                    <div><span className="text-gray-400">Allowance:</span> {currentWorkplace.allowance ? `₱${currentWorkplace.allowance}/mo` : '—'}</div>
                    {currentWorkplace.supervisor && <div><span className="text-gray-400">Supervisor:</span> {currentWorkplace.supervisor}</div>}
                  </div>
                </div>

                {/* This applicant's own assignment period -- kept separate from
                    the workplace's own details above, since these dates belong
                    to this person, not the (reusable, dateless) workplace. */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assignment Period</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div><span className="text-gray-400">Start Date:</span> {viewWorkplaceTarget.assignmentHistory[0]?.assignedDate ? fmtDate(viewWorkplaceTarget.assignmentHistory[0].assignedDate) : '—'}</div>
                    <div><span className="text-gray-400">End Date:</span> {isCompleted && viewWorkplaceTarget.assignmentHistory[0]?.completedDate ? fmtDate(viewWorkplaceTarget.assignmentHistory[0].completedDate) : '—'}</div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
                {!isCompleted && (
                  <button
                    onClick={() => handleUnassignWorkplace()}
                    disabled={!canManage('gip') || isAssigning}
                    className="flex-1 py-2 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent flex items-center justify-center gap-1.5"
                  >
                    {isAssigning ? 'Removing…' : 'Unassign'}
                  </button>
                )}
                <button onClick={() => setViewWorkplaceTarget(null)} className="flex-1 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark">Close</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Import Modal */}
      {isImportModalOpen && (
        <GIPImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImported={refreshProfiles}
        />
      )}

      {/* Main Content */}
      <div className="h-full overflow-y-auto bg-brand-bg">
      <div className="w-full px-6 py-8">
        <div className="mb-6 flex items-center gap-4">
          <button onClick={onBack} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><ArrowLeft size={24} /></button>
          <p className="text-gray-800 font-bold" style={{ fontSize: 'var(--text-xl)' }}>Government Internship Program (GIP)</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-3 mb-4">
          <div className="flex gap-2">
            <button onClick={() => setIsFormOpen(true)} disabled={!canManage('gip')} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue text-white rounded-md hover:bg-brand-blue-dark transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue">
              <Plus size={16} /><span>Add Applicant</span>
            </button>
            <button onClick={() => setIsImportModalOpen(true)} disabled={!canManage('gip')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-md transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white">
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
                  placeholder="Search by name, barangay, or workplace..."
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
                      <select
                        value={filterValues[filterId] || ''}
                        onChange={e => handleFilterValueChange(filterId, e.target.value)}
                        className="text-sm bg-transparent border-none focus:outline-none text-blue-700 font-medium pr-1 cursor-pointer"
                        onClick={e => e.stopPropagation()}
                      >
                        <option value="">All</option>
                        {filter?.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
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
              <p className="text-gray-400 text-sm mt-1">
                {applicants.length === 0 ? 'Click "Add Applicant" to register the first GIP applicant.' : 'Try adjusting your search or filters.'}
              </p>
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
                    {activeFilters.includes('education')   && <th className="px-4 py-4 text-left text-white whitespace-nowrap">Education</th>}
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Barangay</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Classification</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Assigned Workplace/Office</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Status</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Date Applied</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(applicant => {
                    const workplace = gipWorkplaces.find(w => w.id === applicant.assignedWorkplaceId)
                    const derivedStatus = deriveStatus(applicant)
                    return (
                      <tr key={applicant.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-gray-800 font-medium">{applicant.lastName}, {applicant.firstName}{applicant.middleName ? ` ${applicant.middleName.charAt(0)}.` : ''}</p>
                        </td>
                        {activeFilters.includes('sex')         && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{applicant.sex || '—'}</td>}
                        {activeFilters.includes('age')         && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{applicant.age ? `${applicant.age} yrs` : '—'}</td>}
                        {activeFilters.includes('civilStatus') && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{applicant.civilStatus || '—'}</td>}
                        {activeFilters.includes('education')   && <td className="px-4 py-3 text-gray-600">{applicant.highestEducation || '—'}</td>}
                        <td className="px-4 py-3 text-gray-600">{applicant.barangay}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {applicant.classification.slice(0, 1).map(c => (
                              <span key={c} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{c}</span>
                            ))}
                            {applicant.classification.length > 1 && (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-500 rounded text-xs">+{applicant.classification.length - 1}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          {workplace ? (
                            <p className="text-gray-800 text-sm leading-tight">{workplace.workplaceName}</p>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={derivedStatus} />
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(applicant.dateApplicationReceived)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={e => {
                              const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                              const menuHeight = 160
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
        const hasWorkplaceLink = applicant.assignedWorkplaceId !== null
        const isActive = applicant.status === 'Ongoing'
        return (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenActionMenuId(null)} />
            <div
              style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, maxHeight: 'calc(100vh - 24px)' }}
              className="w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1 overflow-y-auto"
            >
              <button onClick={() => { setViewingApplicant(applicant); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">View</button>
              <button onClick={() => { setEditingApplicant(applicant); setOpenActionMenuId(null) }} disabled={!canManage('gip')} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Edit</button>
              {hasWorkplaceLink && (
                <button
                  onClick={() => { setViewWorkplaceTarget(applicant); setOpenActionMenuId(null) }}
                  className="w-full px-3 py-2 text-left text-xs text-blue-600 hover:bg-blue-50"
                >View Assigned Workplace/Office</button>
              )}
              {isActive && (
                <button
                  onClick={() => { setCompleteConfirm(applicant); setOpenActionMenuId(null) }}
                  disabled={!canManage('gip')}
                  className="w-full px-3 py-2 text-left text-xs text-green-700 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >Mark as Completed</button>
              )}
              {applicant.status === 'Inactive' && (
                <button
                  onClick={() => { openAssignModal(applicant); setOpenActionMenuId(null) }}
                  disabled={!canManage('gip')}
                  className="w-full px-3 py-2 text-left text-xs text-purple-600 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >Assign Workplace/Office</button>
              )}
              <div className="my-1 border-t border-gray-100" />
              <button onClick={() => { setDeleteConfirm({ open: true, id: applicant.id }); setOpenActionMenuId(null) }} disabled={!canManage('gip')} className="w-full px-3 py-2 text-left text-xs text-red-500 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Delete</button>
            </div>
          </>
        )
      })()}

      {completeConfirm && (
        <ConfirmModal
          isOpen={true}
          type="confirm"
          title="Mark as Completed?"
          message={`Mark ${completeConfirm.firstName} ${completeConfirm.lastName}'s internship as completed? This is final and cannot be undone — it becomes a permanent part of their record.`}
          confirmText="Yes, Mark Completed"
          cancelText="Cancel"
          onConfirm={() => handleCompleteAssignment(completeConfirm.id)}
          onCancel={() => setCompleteConfirm(null)}
        />
      )}
    </>
  )
}
