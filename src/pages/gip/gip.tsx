import { useState } from 'react'
import { fmtDate } from '../../utils/formatDate'
import {
  ArrowLeft, Search, Plus, X, Users,
  AlertCircle, CheckCircle, Upload, Download, ChevronDown, MoreHorizontal,
  ChevronRight, ChevronLeft,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { useGIP } from '../../contexts/GIPContext'
import { canManage } from '../../utils/permissions'
import type { GIPApplicant, GIPBatch } from '../../contexts/GIPContext'
import GIPProfileForm, {
  ViewApplicantPanel, emptyForm, BATCH_STATUS_COLORS,
  deriveStatus, StatusBadge, CLASSIFICATION_OPTIONS, EDUCATION_OPTIONS, CIVIL_STATUS_OPTIONS,
} from './GIPProfileForm'

interface GIPViewProps {
  onBack: () => void
}

// ─── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({ isOpen, type, title, message, onConfirm, onCancel, confirmText = 'Confirm' }: {
  isOpen: boolean; type: 'confirm' | 'success'; title: string; message: string
  onConfirm: () => void; onCancel: () => void; confirmText?: string
}) {
  if (!isOpen) return null
  const Icon = type === 'success' ? CheckCircle : AlertCircle
  const iconColor = type === 'success' ? 'text-green-500' : 'text-brand-blue'
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 text-center">
        <Icon size={56} className={`mx-auto mb-4 ${iconColor}`} />
        <h3 className="text-xl text-gray-800 mb-3">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          {type === 'confirm' ? (
            <>
              <button onClick={onCancel} className="px-6 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">Cancel</button>
              <button onClick={onConfirm} className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark">{confirmText}</button>
            </>
          ) : (
            <button onClick={onConfirm} className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark">OK</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main GIPView ──────────────────────────────────────────────────────────────

export default function GIPView({ onBack }: GIPViewProps) {
  const { applicants, setApplicants, gipBatches } = useGIP()

  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [sortOrder, setSortOrder] = useState<'firstName_asc' | 'firstName_desc' | 'lastName_asc' | 'lastName_desc' | 'dateApplied_newest' | 'dateApplied_oldest' | ''>('')
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})

  const availableFilters = [
    { id: 'status',         label: 'Status',         options: ['Active', 'Inactive'] as string[] },
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
  const [assignStep, setAssignStep] = useState<1 | 2>(1)
  const [assignSearch, setAssignSearch] = useState('')
  const [selectedBatch, setSelectedBatch] = useState<GIPBatch | null>(null)
  const [viewBatchTarget, setViewBatchTarget] = useState<GIPApplicant | null>(null)

  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<{ lastName: string; firstName: string; barangay: string; status: string; valid: boolean }[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number | null }>({ open: false, id: null })
  const [successModal, setSuccessModal] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const [viewingAssignmentHistoryFor, setViewingAssignmentHistoryFor] = useState<GIPApplicant | null>(null)

  const filtered = applicants.filter(a => {
    const fullName = `${a.lastName} ${a.firstName} ${a.middleName}`.toLowerCase()
    const lastBatch = a.assignmentHistory[a.assignmentHistory.length - 1]?.batchName ?? ''
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      a.barangay.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lastBatch.toLowerCase().includes(searchQuery.toLowerCase())
    const derivedStatus = deriveStatus(a, gipBatches)
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

  const handleAddSave = (data: Omit<GIPApplicant, 'id'>) => {
    setApplicants(prev => [...prev, { ...data, id: Date.now() }])
    setIsFormOpen(false)
    setSuccessModal({ open: true, message: 'Applicant profile has been added successfully.' })
  }

  const handleEditSave = (data: Omit<GIPApplicant, 'id'>) => {
    if (!editingApplicant) return
    setApplicants(prev => prev.map(a => a.id === editingApplicant.id ? { ...data, id: a.id } : a))
    setEditingApplicant(null)
    setSuccessModal({ open: true, message: 'Applicant profile has been updated successfully.' })
  }

  const handleDelete = (id: number) => {
    setApplicants(prev => prev.filter(a => a.id !== id))
    setDeleteConfirm({ open: false, id: null })
    setSuccessModal({ open: true, message: 'Applicant profile has been deleted.' })
  }

  const handleAssignBatch = (batch: GIPBatch) => {
    if (!assignTarget) return
    const today = new Date().toISOString().split('T')[0]
    setApplicants(prev => prev.map(a => a.id === assignTarget.id ? {
      ...a,
      assignedBatchId: batch.id,
      status: 'Active' as const,
      assignmentHistory: [
        ...a.assignmentHistory,
        { batchId: batch.id, batchName: batch.batchName, assignedDate: today },
      ],
    } : a))
    setAssignTarget(null)
    setAssignStep(1)
    setSelectedBatch(null)
    setAssignSearch('')
    setSuccessModal({ open: true, message: `Assigned to "${batch.batchName}" successfully.` })
  }

  const handleUnassignBatch = () => {
    if (!viewBatchTarget) return
    const today = new Date().toISOString().split('T')[0]
    const batchId = viewBatchTarget.assignedBatchId
    setApplicants(prev => prev.map(a => a.id === viewBatchTarget.id ? {
      ...a,
      assignedBatchId: null,
      status: 'Inactive' as const,
      assignmentHistory: a.assignmentHistory.map(h =>
        h.batchId === batchId && !h.completedDate
          ? { ...h, completedDate: today }
          : h
      ),
    } : a))
    setViewBatchTarget(null)
    setSuccessModal({ open: true, message: 'Applicant has been unassigned from the batch.' })
  }

  const openAssignModal = (applicant: GIPApplicant) => {
    setAssignTarget(applicant)
    setAssignStep(1)
    setSelectedBatch(null)
    setAssignSearch('')
  }

  const exportToExcel = () => {
    const data = filtered.map(a => {
      const batch = gipBatches.find(b => b.id === a.assignedBatchId)
      return {
        'Last Name': a.lastName, 'First Name': a.firstName, 'Middle Name': a.middleName,
        'Sex': a.sex, 'Birthdate': a.birthdate, 'Age': a.age, 'Civil Status': a.civilStatus,
        'Contact': a.contactNumber, 'Email': a.email, 'Barangay': a.barangay,
        'Classification': a.classification.join(', '),
        'Education': a.highestEducation, 'School': a.schoolName, 'Course': a.course,
        'Assigned Batch': batch?.batchName ?? '',
        'Batch Status': batch?.status ?? '',
        'Status': deriveStatus(a, gipBatches), 'Remarks': a.remarks,
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
      const batch = gipBatches.find(b => b.id === a.assignedBatchId)
      return {
        'Last Name': a.lastName, 'First Name': a.firstName,
        'Barangay': a.barangay,
        'Assigned Batch': batch?.batchName ?? '',
        'Batch Status': batch?.status ?? '',
        'Status': deriveStatus(a, gipBatches),
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

  const handleFileUpload = (file: File) => {
    setUploadedFile(file)
    const reader = new FileReader()
    reader.onload = e => {
      const data = e.target?.result
      const wb = XLSX.read(data, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws) as Record<string, string>[]
      setImportPreview(rows.slice(0, 5).map(r => ({
        lastName: r['Last Name'] || '', firstName: r['First Name'] || '',
        barangay: r['Barangay'] || '', status: r['Status'] || '',
        valid: !!(r['Last Name'] && r['First Name']),
      })))
    }
    reader.readAsBinaryString(file)
  }

  const closeAssignModal = () => {
    setAssignTarget(null)
    setAssignStep(1)
    setSelectedBatch(null)
    setAssignSearch('')
  }

  if (isFormOpen) return <GIPProfileForm initial={emptyForm} mode="add" onSave={handleAddSave} onClose={() => setIsFormOpen(false)} />

  if (editingApplicant) {
    const { id: _id, ...rest } = editingApplicant
    return <GIPProfileForm initial={rest} mode="edit" onSave={handleEditSave} onClose={() => setEditingApplicant(null)} />
  }

  if (viewingApplicant) return <ViewApplicantPanel applicant={viewingApplicant} onClose={() => setViewingApplicant(null)} />

  const assignableBatches = gipBatches.filter(b => b.status === 'Planned')
  const filteredAssignBatches = assignableBatches.filter(b =>
    b.batchName.toLowerCase().includes(assignSearch.toLowerCase()) ||
    b.batchCode.toLowerCase().includes(assignSearch.toLowerCase())
  )

  return (
    <>
      <ConfirmModal
        isOpen={deleteConfirm.open} type="confirm"
        title="Delete Applicant Profile"
        message="Are you sure you want to delete this applicant's profile? This action cannot be undone."
        confirmText="Delete"
        onConfirm={() => deleteConfirm.id !== null && handleDelete(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
      />
      <ConfirmModal
        isOpen={successModal.open} type="success"
        title="Success" message={successModal.message}
        onConfirm={() => setSuccessModal({ open: false, message: '' })}
        onCancel={() => setSuccessModal({ open: false, message: '' })}
      />

      {/* Assign Batch Modal */}
      {assignTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div>
                <h3 className="text-gray-800 font-semibold">
                  {assignStep === 1 ? 'Assign to Batch' : 'Confirm Assignment'}
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
                      placeholder="Search batches..."
                      value={assignSearch}
                      onChange={e => setAssignSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 pt-3 space-y-2">
                  {filteredAssignBatches.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-400">No available batches.</p>
                      <p className="text-xs text-gray-300 mt-1">Only Planned batches can be assigned.</p>
                    </div>
                  ) : filteredAssignBatches.map(batch => (
                    <button
                      key={batch.id}
                      onClick={() => { setSelectedBatch(batch); setAssignStep(2) }}
                      className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-brand-blue hover:bg-blue-50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">{batch.batchName}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{batch.batchCode}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {batch.assignedOffice} · {batch.startDate} – {batch.endDate}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-semibold ${BATCH_STATUS_COLORS[batch.status]}`}>
                          {batch.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
                  <button onClick={closeAssignModal} className="w-full py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                </div>
              </>
            )}

            {assignStep === 2 && selectedBatch && (
              <>
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-800">{selectedBatch.batchName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{selectedBatch.batchCode}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${BATCH_STATUS_COLORS[selectedBatch.status]}`}>
                        {selectedBatch.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div><span className="text-gray-400">Office:</span> {selectedBatch.assignedOffice || '—'}</div>
                      <div><span className="text-gray-400">Location:</span> {selectedBatch.deploymentLocation || '—'}</div>
                      <div><span className="text-gray-400">Start:</span> {selectedBatch.startDate || '—'}</div>
                      <div><span className="text-gray-400">End:</span> {selectedBatch.endDate || '—'}</div>
                      <div><span className="text-gray-400">Slots:</span> {selectedBatch.slots || '—'}</div>
                      <div><span className="text-gray-400">Allowance:</span> {selectedBatch.allowance ? `₱${selectedBatch.allowance}/mo` : '—'}</div>
                      {selectedBatch.coordinator && <div className="col-span-2"><span className="text-gray-400">Coordinator:</span> {selectedBatch.coordinator}</div>}
                    </div>
                  </div>
                  {assignTarget.assignedBatchId && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
                      This applicant is currently assigned to another batch. Assigning will replace the current assignment.
                    </div>
                  )}
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
                  <button onClick={() => setAssignStep(1)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Back</button>
                  <button
                    onClick={() => handleAssignBatch(selectedBatch)}
                    className="flex-1 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark"
                  >
                    {assignTarget.assignedBatchId ? 'Re-assign' : 'Assign'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* View / Change Assigned Batch Modal */}
      {viewBatchTarget && (() => {
        const currentBatch = gipBatches.find(b => b.id === viewBatchTarget.assignedBatchId)
        if (!currentBatch) return null
        const canChange = currentBatch.status === 'Completed'
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div>
                  <h3 className="text-gray-800 font-semibold">Assigned Batch</h3>
                  <p className="text-sm text-gray-400 mt-0.5">{viewBatchTarget.firstName} {viewBatchTarget.lastName}</p>
                </div>
                <button onClick={() => setViewBatchTarget(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="p-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">{currentBatch.batchName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{currentBatch.batchCode}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${BATCH_STATUS_COLORS[currentBatch.status]}`}>
                      {currentBatch.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div><span className="text-gray-400">Office:</span> {currentBatch.assignedOffice || '—'}</div>
                    <div><span className="text-gray-400">Location:</span> {currentBatch.deploymentLocation || '—'}</div>
                    <div><span className="text-gray-400">Start:</span> {currentBatch.startDate || '—'}</div>
                    <div><span className="text-gray-400">End:</span> {currentBatch.endDate || '—'}</div>
                    <div><span className="text-gray-400">Slots:</span> {currentBatch.slots || '—'}</div>
                    <div><span className="text-gray-400">Allowance:</span> {currentBatch.allowance ? `₱${currentBatch.allowance}/mo` : '—'}</div>
                    {currentBatch.coordinator && <div className="col-span-2"><span className="text-gray-400">Coordinator:</span> {currentBatch.coordinator}</div>}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
                <button onClick={handleUnassignBatch} className="flex-1 py-2 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50">Unassign</button>
                <button
                  onClick={() => { setViewBatchTarget(null); openAssignModal(viewBatchTarget) }}
                  disabled={!canChange}
                  className={`flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50${!canChange ? ' opacity-50 cursor-not-allowed' : ''}`}
                >Change Batch</button>
                <button onClick={() => setViewBatchTarget(null)} className="flex-1 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark">Close</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-gray-800">Import Applicants</h3>
              <button onClick={() => { setIsImportModalOpen(false); setUploadedFile(null); setImportPreview([]) }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6">
              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-brand-blue hover:bg-blue-50 transition-colors"
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f) }}
                onClick={() => document.getElementById('gip-file-input')?.click()}
              >
                <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">Drop your Excel or CSV file here</p>
                <p className="text-xs text-gray-400 mt-1">or click to browse</p>
                <input id="gip-file-input" type="file" accept=".xlsx,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} />
              </div>
              {uploadedFile && importPreview.length > 0 && (
                <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Last Name</th>
                        <th className="px-3 py-2 text-left">First Name</th>
                        <th className="px-3 py-2 text-left">Barangay</th>
                        <th className="px-3 py-2 text-left">Valid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((r, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-3 py-2">{r.lastName}</td>
                          <td className="px-3 py-2">{r.firstName}</td>
                          <td className="px-3 py-2">{r.barangay}</td>
                          <td className="px-3 py-2">{r.valid ? '✓' : '✗'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => { setIsImportModalOpen(false); setUploadedFile(null); setImportPreview([]) }} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button
                disabled={!uploadedFile}
                onClick={() => { setIsImportModalOpen(false); setUploadedFile(null); setImportPreview([]); setSuccessModal({ open: true, message: 'File imported successfully.' }) }}
                className="flex-1 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark disabled:opacity-40"
              >Import</button>
            </div>
          </div>
        </div>
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
            <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-md transition-colors text-sm">
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
                  placeholder="Search by name, barangay, or batch..."
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
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Assigned Batch</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Status</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Date Applied</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(applicant => {
                    const batch = gipBatches.find(b => b.id === applicant.assignedBatchId)
                    const derivedStatus = deriveStatus(applicant, gipBatches)
                    return (
                      <tr key={applicant.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-gray-800 font-medium">{applicant.lastName}, {applicant.firstName} {applicant.middleName}</p>
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
                          {batch ? (
                            <div>
                              <p className="text-gray-800 text-sm leading-tight">{batch.batchName}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold mt-1 inline-block ${BATCH_STATUS_COLORS[batch.status]}`}>
                                {batch.status}
                              </span>
                            </div>
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

      {/* Action dropdown portal */}
      {/* Assignment History Modal */}
      {viewingAssignmentHistoryFor && (() => {
        const a = viewingAssignmentHistoryFor
        const badgeCls = (s: string) =>
          s === 'Completed' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
          s === 'Ongoing'   ? 'bg-green-100 text-green-700 border border-green-200' :
          s === 'Open'      ? 'bg-sky-100 text-sky-700 border border-sky-200' :
          'bg-amber-100 text-amber-700 border border-amber-200'
        const visibleHistory = a.assignmentHistory.filter(entry => {
          const batch = gipBatches.find(b => b.id === entry.batchId)
          const batchStatus = batch?.status ?? (entry.completedDate ? 'Completed' : null)
          const isCurrent = a.assignedBatchId === entry.batchId
          return batchStatus === 'Completed' || isCurrent
        })
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
              <div className="bg-white border-b border-gray-200 rounded-t-2xl px-6 py-5 flex items-center justify-between flex-shrink-0">
                <div>
                  <p className="text-black font-extrabold text-lg tracking-tight">Assignment History</p>
                  <p className="text-gray-500 text-sm mt-0.5">{a.lastName}, {a.firstName} {a.middleName}</p>
                </div>
                <button onClick={() => setViewingAssignmentHistoryFor(null)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"><X size={20} /></button>
              </div>
              <div className="px-6 py-5 overflow-y-auto flex-1">
                {visibleHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                      <Users size={26} className="text-gray-400" />
                    </div>
                    <p className="text-sm font-bold text-black">No assignments yet</p>
                    <p className="text-xs text-gray-600 text-center">Completed or active batch assignments will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...visibleHistory].reverse().map((entry, i) => {
                      const batch = gipBatches.find(b => b.id === entry.batchId)
                      const batchStatus = batch?.status ?? (entry.completedDate ? 'Completed' : null)
                      const isCurrent = a.assignedBatchId === entry.batchId
                      return (
                        <div key={i} className={`rounded-xl border px-5 py-4 flex items-start justify-between gap-3 ${isCurrent ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-800 font-semibold leading-snug">{entry.batchName}</p>
                            <p className="text-xs text-gray-400 mt-1">Date Assigned: {fmtDate(entry.assignedDate)}</p>
                            {entry.completedDate && batchStatus === 'Completed' && (
                              <p className="text-xs text-blue-500 mt-0.5">Date Completed: {fmtDate(entry.completedDate)}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-2">
                            {batchStatus && <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${badgeCls(batchStatus)}`}>{batchStatus}</span>}
                            {isCurrent && <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-blue-100 text-blue-700 border border-blue-200">Current</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end flex-shrink-0">
                <button onClick={() => setViewingAssignmentHistoryFor(null)} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors">Close</button>
              </div>
            </div>
          </div>
        )
      })()}

      {openActionMenuId !== null && menuPos && (() => {
        const applicant = applicants.find(a => a.id === openActionMenuId)
        if (!applicant) return null
        const hasAssignment = applicant.assignedBatchId !== null
        return (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenActionMenuId(null)} />
            <div
              style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}
              className="w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1"
            >
              <button onClick={() => { setViewingApplicant(applicant); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">View</button>
              <button onClick={() => { setEditingApplicant(applicant); setOpenActionMenuId(null) }} disabled={!canManage('gip')} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Edit</button>
              <button onClick={() => { setViewingAssignmentHistoryFor(applicant); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-brand-blue hover:bg-blue-50">View Assignment History</button>
              {hasAssignment ? (
                <button
                  onClick={() => { setViewBatchTarget(applicant); setOpenActionMenuId(null) }}
                  className="w-full px-3 py-2 text-left text-xs text-blue-600 hover:bg-blue-50"
                >View / Change Batch</button>
              ) : (
                <button
                  onClick={() => { openAssignModal(applicant); setOpenActionMenuId(null) }}
                  className="w-full px-3 py-2 text-left text-xs text-purple-600 hover:bg-purple-50"
                >Assign Batch</button>
              )}
              <div className="my-1 border-t border-gray-100" />
              <button onClick={() => { setDeleteConfirm({ open: true, id: applicant.id }); setOpenActionMenuId(null) }} disabled={!canManage('gip')} className="w-full px-3 py-2 text-left text-xs text-red-500 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Delete</button>
            </div>
          </>
        )
      })()}
    </>
  )
}
