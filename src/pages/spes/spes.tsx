import { useState } from 'react'
import {
  ArrowLeft, Search, Plus, X, Users,
  AlertCircle, CheckCircle, Upload, Download, ChevronDown, MoreHorizontal,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { useSPES } from '../../contexts/SPESContext'
import type { SPESApplicant, SPESBatch, SPESBatchAssignment } from '../../contexts/SPESContext'
import SPESProfileForm, {
  ViewApplicantPanel, emptyForm, SCHOOL_TYPE_OPTIONS, CIVIL_STATUS_OPTIONS,
  StatusBadge, BatchStatusBadge,
} from './SPESProfileForm'

interface SPESViewProps {
  onBack: () => void
}

const STATUS_OPTIONS: SPESApplicant['status'][] = ['Active', 'Inactive']

// ─── Confirm Modal ────────────────────────────────────────────────────────────

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

// ─── Main SPESView ────────────────────────────────────────────────────────────

export default function SPESView({ onBack }: SPESViewProps) {
  const { applicants, setApplicants, spesBatches } = useSPES()

  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [sortOrder, setSortOrder] = useState<'firstName_asc' | 'firstName_desc' | 'lastName_asc' | 'lastName_desc' | ''>('')
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})

  const availableFilters = [
    { id: 'status',     label: 'Status',      options: STATUS_OPTIONS as string[] },
    { id: 'schoolType', label: 'School Type',  options: SCHOOL_TYPE_OPTIONS },
    { id: 'sex',        label: 'Sex',          options: ['Male', 'Female'] },
    { id: 'age',        label: 'Age',          options: ['Below 20', '20–25', '26–30', '31–40', 'Above 40'] },
    { id: 'civilStatus',label: 'Civil Status', options: CIVIL_STATUS_OPTIONS },
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
  const [viewingAssignedBatchFor, setViewingAssignedBatchFor] = useState<SPESApplicant | null>(null)
  const [confirmUnassignId, setConfirmUnassignId] = useState<number | null>(null)
  const [batchSearch, setBatchSearch] = useState('')

  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<{ lastName: string; firstName: string; school: string; status: string; valid: boolean }[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number | null }>({ open: false, id: null })
  const [successModal, setSuccessModal] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)

  const filtered = applicants.filter(a => {
    const fullName = `${a.lastName} ${a.firstName} ${a.middleName}`.toLowerCase()
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      a.barangay.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.schoolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.assignedActivity.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilters = activeFilters.every(filterId => {
      const val = filterValues[filterId]
      if (!val) return true
      if (filterId === 'status') return a.status === val
      if (filterId === 'schoolType') return a.schoolType === val
      if (filterId === 'sex') return a.sex === val
      if (filterId === 'civilStatus') return a.civilStatus === val
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

  const handleAddSave = (data: Omit<SPESApplicant, 'id'>) => {
    setApplicants(prev => [...prev, { ...data, id: Date.now() }])
    setIsFormOpen(false)
    setSuccessModal({ open: true, message: 'Applicant profile has been added successfully.' })
  }

  const handleEditSave = (data: Omit<SPESApplicant, 'id'>) => {
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

  const handleAssign = (batch: SPESBatch) => {
    if (!assignTarget) return
    const today = new Date().toISOString().split('T')[0]
    setApplicants(prev => prev.map(a => {
      if (a.id !== assignTarget.id) return a
      const alreadyInHistory = a.assignmentHistory.some(h => h.batchId === batch.id)
      const updatedHistory: SPESBatchAssignment[] = alreadyInHistory
        ? a.assignmentHistory
        : [...a.assignmentHistory, { batchId: batch.id, batchName: batch.batchName, assignedDate: today }]
      return { ...a, assignedActivity: batch.batchName, assignedBatchId: batch.id, assignmentHistory: updatedHistory, status: 'Active' }
    }))
    setAssignTarget(null)
    setSelectedBatch(null)
    setConfirmingBatch(null)
    setBatchSearch('')
    setSuccessModal({ open: true, message: `Assigned to "${batch.batchName}" successfully.` })
  }

  const handleUnassign = (targetId?: number) => {
    const id = targetId ?? assignTarget?.id
    if (!id) return
    setApplicants(prev => prev.map(a => a.id === id ? { ...a, assignedActivity: '', assignedBatchId: null, status: 'Inactive' } : a))
    setAssignTarget(null)
    setSelectedBatch(null)
    setViewingAssignedBatchFor(null)
    setBatchSearch('')
    setSuccessModal({ open: true, message: 'Assigned batch has been removed.' })
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
      'Assigned Batch': a.assignedActivity,
      'Status': a.status, 'Remarks': a.remarks,
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
      'Assigned Batch': a.assignedActivity, 'Status': a.status,
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

  const handleFileUpload = (file: File) => {
    setUploadedFile(file)
    const reader = new FileReader()
    reader.onload = e => {
      const data = e.target?.result
      const wb = XLSX.read(data, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws) as Record<string, string>[]
      setImportPreview(rows.slice(0, 5).map(r => ({
        lastName: r['Last Name'] || '',
        firstName: r['First Name'] || '',
        school: r['School Name'] || '',
        status: r['Status'] || '',
        valid: !!(r['Last Name'] && r['First Name']),
      })))
    }
    reader.readAsBinaryString(file)
  }

  if (isFormOpen) return <SPESProfileForm initial={emptyForm} mode="add" onSave={handleAddSave} onClose={() => setIsFormOpen(false)} />

  if (editingApplicant) {
    const { id: _id, ...rest } = editingApplicant
    return <SPESProfileForm initial={rest} mode="edit" onSave={handleEditSave} onClose={() => setEditingApplicant(null)} />
  }

  const liveViewingApplicant = viewingApplicant ? (applicants.find(a => a.id === viewingApplicant.id) ?? viewingApplicant) : null
  if (liveViewingApplicant) return <ViewApplicantPanel applicant={liveViewingApplicant} spesBatches={spesBatches} onClose={() => setViewingApplicant(null)} />

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

      {/* Assign Batch — detail modal (step 2) */}
      {assignTarget && selectedBatch && (() => {
        const isAssigned = assignTarget.assignedBatchId === selectedBatch.id
        const statusColor =
          selectedBatch.status === 'Ongoing'   ? 'bg-green-100 text-green-700' :
          selectedBatch.status === 'Completed' ? 'bg-blue-100 text-blue-700'  :
          selectedBatch.status === 'Open'      ? 'bg-blue-50 text-blue-600'   :
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
                    <Row label="Supervisor" value={selectedBatch.supervisor} />
                    <Row label="Application Period" value={selectedBatch.applicationStartDate && selectedBatch.applicationEndDate ? `${selectedBatch.applicationStartDate} – ${selectedBatch.applicationEndDate}` : ''} />
                    <Row label="Program Start Date" value={selectedBatch.programStartDate} />
                    <Row label="Program End Date" value={selectedBatch.programEndDate} />
                    <Row label="Available Slots" value={selectedBatch.availableSlots} />
                    {selectedBatch.targetBeneficiaries && <Row label="Target Beneficiaries" value={selectedBatch.targetBeneficiaries} />}
                    <Row label="Funding Source" value={selectedBatch.fundingSource === 'Other' ? `Other — ${selectedBatch.fundingSourceOther}` : selectedBatch.fundingSource} />
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
                  <button onClick={() => setSelectedBatch(null)} className="flex-1 py-2.5 border border-brand-blue text-brand-blue rounded-xl hover:bg-blue-50 transition-colors text-sm font-medium">Change Batch</button>
                  <button onClick={() => setConfirmingBatch(selectedBatch)} className="flex-1 py-2.5 bg-brand-blue text-white rounded-xl hover:bg-brand-blue-dark transition-colors text-sm font-medium">{isAssigned ? 'Re-assign' : 'Assign'}</button>
                </div>
              </div>
            </div>
            <ConfirmModal
              isOpen={!!confirmingBatch}
              type="confirm"
              title="Confirm Assignment"
              message={`Assign "${selectedBatch.batchName}" to ${assignTarget.firstName} ${assignTarget.lastName}?`}
              confirmText="Yes, Assign"
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
        const statusColor = (s: string) =>
          s === 'Ongoing'   ? 'bg-green-100 text-green-700' :
          s === 'Completed' ? 'bg-blue-100 text-blue-700'  :
          s === 'Open'      ? 'bg-blue-50 text-blue-600'   :
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
                      <Row label="Supervisor" value={batch.supervisor} />
                      <Row label="Application Period" value={batch.applicationStartDate && batch.applicationEndDate ? `${batch.applicationStartDate} – ${batch.applicationEndDate}` : ''} />
                      <Row label="Program Start Date" value={batch.programStartDate} />
                      <Row label="Program End Date" value={batch.programEndDate} />
                      <Row label="Available Slots" value={batch.availableSlots} />
                      {batch.targetBeneficiaries && <Row label="Target Beneficiaries" value={batch.targetBeneficiaries} />}
                      <Row label="Funding Source" value={batch.fundingSource === 'Other' ? `Other — ${batch.fundingSourceOther}` : batch.fundingSource} />
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-sm font-medium text-gray-700 mb-1">{viewingAssignedBatchFor.assignedActivity}</p>
                    <p className="text-xs text-gray-400">Batch details not found. It may have been deleted in Maintenance.</p>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
                <button onClick={() => setConfirmUnassignId(viewingAssignedBatchFor.id)} className="px-4 py-2.5 border border-red-200 text-red-500 rounded-xl hover:bg-red-50 transition-colors text-sm font-medium">Unassign</button>
                <button onClick={() => { close(); setAssignTarget(viewingAssignedBatchFor) }} className="px-4 py-2.5 border border-brand-blue text-brand-blue rounded-xl hover:bg-blue-50 transition-colors text-sm font-medium">Change Batch</button>
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
          .filter(b => b.status === 'Open' || b.status === 'Ongoing')
          .filter(b =>
            batchSearch === '' ||
            b.batchName.toLowerCase().includes(batchSearch.toLowerCase()) ||
            b.employer.toLowerCase().includes(batchSearch.toLowerCase()) ||
            b.coordinator.toLowerCase().includes(batchSearch.toLowerCase())
          )
        const scBadge = (s: string) =>
          s === 'Open'    ? 'bg-blue-50 text-blue-600 font-medium'   :
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
                  Only Open and Ongoing batches are shown
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
                  <button onClick={() => setConfirmUnassignId(assignTarget.id)} className="text-xs text-red-500 hover:text-red-700 font-medium whitespace-nowrap flex-shrink-0">Unassign</button>
                </div>
              )}
              <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-1.5">
                {filteredBatches.length === 0 ? (
                  <div className="py-12 text-center">
                    <AlertCircle size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-400 text-sm">{batchSearch ? 'No batches match your search.' : 'No Open or Ongoing SPES batches available.'}</p>
                    <p className="text-gray-400 text-xs mt-1">Add batches in Maintenance → SPES first.</p>
                  </div>
                ) : filteredBatches.map(batch => {
                  const isCurrent = assignTarget.assignedBatchId === batch.id
                  return (
                    <button
                      key={batch.id}
                      onClick={() => setSelectedBatch(batch)}
                      className={`w-full px-4 py-3.5 text-left rounded-xl border transition-all hover:border-blue-200 hover:bg-blue-50 ${isCurrent ? 'border-brand-blue bg-blue-50' : 'border-gray-200'}`}
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
                              {batch.availableSlots && <><span>·</span><span>{batch.availableSlots} slots</span></>}
                            </div>
                          )}
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 mt-0.5 ${scBadge(batch.status)}`}>{batch.status}</span>
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
                onClick={() => document.getElementById('spes-file-input')?.click()}
              >
                <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">Drop your Excel or CSV file here</p>
                <p className="text-xs text-gray-400 mt-1">or click to browse</p>
                <input id="spes-file-input" type="file" accept=".xlsx,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} />
              </div>
              {uploadedFile && importPreview.length > 0 && (
                <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full">
                    <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left">Last Name</th><th className="px-3 py-2 text-left">First Name</th><th className="px-3 py-2 text-left">School</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Valid</th></tr></thead>
                    <tbody>{importPreview.map((r, i) => <tr key={i} className="border-t border-gray-100"><td className="px-3 py-2">{r.lastName}</td><td className="px-3 py-2">{r.firstName}</td><td className="px-3 py-2">{r.school}</td><td className="px-3 py-2">{r.status}</td><td className="px-3 py-2">{r.valid ? '✓' : '✗'}</td></tr>)}</tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => { setIsImportModalOpen(false); setUploadedFile(null); setImportPreview([]) }} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button disabled={!uploadedFile} onClick={() => { setIsImportModalOpen(false); setUploadedFile(null); setImportPreview([]); setSuccessModal({ open: true, message: 'File imported successfully.' }) }} className="flex-1 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark disabled:opacity-40">Import</button>
            </div>
          </div>
        </div>
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
              <button onClick={() => setIsFormOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue text-white rounded-md hover:bg-brand-blue-dark transition-colors text-sm">
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
                      <th className="px-4 py-4 text-left text-white whitespace-nowrap">School</th>
                      <th className="px-4 py-4 text-left text-white whitespace-nowrap">Grade / Year Level</th>
                      <th className="px-4 py-4 text-left text-white whitespace-nowrap">Assigned Batch</th>
                      <th className="px-4 py-4 text-left text-white whitespace-nowrap">Status</th>
                      <th className="px-4 py-4 text-left text-white whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(applicant => (
                      <tr key={applicant.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-gray-800 font-medium">{applicant.lastName}, {applicant.firstName} {applicant.middleName}</p>
                        </td>
                        {activeFilters.includes('sex')         && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{applicant.sex || '—'}</td>}
                        {activeFilters.includes('age')         && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{applicant.age ? `${applicant.age} yrs` : '—'}</td>}
                        {activeFilters.includes('civilStatus') && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{applicant.civilStatus || '—'}</td>}
                        <td className="px-4 py-3 text-gray-600">
                          <p className="whitespace-nowrap">{applicant.schoolName || '—'}</p>
                          {applicant.schoolType && <p className="text-gray-400 text-xs">{applicant.schoolType}</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{applicant.gradeYearLevel || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 max-w-[200px]">
                          {applicant.assignedActivity ? (
                            <div>
                              <p className="line-clamp-2 leading-snug mb-1">{applicant.assignedActivity}</p>
                              {(() => {
                                const batch = spesBatches.find(b => b.id === applicant.assignedBatchId)
                                return batch ? <BatchStatusBadge status={batch.status} /> : null
                              })()}
                            </div>
                          ) : <span>—</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={applicant.status} /></td>
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
                    ))}
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
              style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}
              className="w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1"
            >
              <button onClick={() => { setViewingApplicant(applicant); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">View</button>
              <button onClick={() => { setEditingApplicant(applicant); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">Edit</button>
              {applicant.assignedBatchId ? (
                <button onClick={() => { setViewingAssignedBatchFor(applicant); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-brand-blue font-medium hover:bg-blue-50">View Assigned Batch</button>
              ) : (
                <button onClick={() => { setAssignTarget(applicant); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-purple-600 hover:bg-purple-50">Assign Batch</button>
              )}
              <div className="my-1 border-t border-gray-100" />
              <button onClick={() => { setDeleteConfirm({ open: true, id: applicant.id }); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-red-500 hover:bg-red-50">Delete</button>
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
        onConfirm={() => { if (confirmUnassignId !== null) { handleUnassign(confirmUnassignId); setConfirmUnassignId(null) } }}
        onCancel={() => setConfirmUnassignId(null)}
      />
    </>
  )
}
