import { useState } from 'react'
import { fmtDate } from '../../utils/formatDate'
import ReactDOM from 'react-dom'
import {
  ArrowLeft, Search, Plus, X, ChevronDown,
  Upload, Download, AlertCircle, MoreHorizontal, Users,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { canManage } from '../../utils/permissions'
import type { ProgramActivity } from '../../contexts/ProgramActivitiesContext'
import { useProgramActivities } from '../../contexts/ProgramActivitiesContext'
import type { SkillsTrainingProfile } from '../../contexts/SkillsTrainingContext'
import { useSkillsTraining } from '../../contexts/SkillsTrainingContext'
import ConfirmModal from '../shared/ConfirmModal'
import SkillsTrainingProfileForm, {
  ViewProfilePanel, emptyForm, BRAND,
  BATCH_OPTIONS, CLASSIFICATION_OPTIONS, QUALIFICATION_OPTIONS,
  PURPOSE_OPTIONS, CIVIL_STATUS_OPTIONS, StatusBadge,
} from './SkillsTrainingProfileForm'

interface SkillsTrainingViewProps {
  onBack: () => void
}

export default function SkillsTrainingView({ onBack }: SkillsTrainingViewProps) {
  const { activities } = useProgramActivities()
  const skillsTrainings = activities.filter((a): a is ProgramActivity => a.program === 'Skills Training')
  const plannedTrainings = skillsTrainings.filter(t => t.status === 'Planned')

  const { profiles, setProfiles } = useSkillsTraining()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [viewingProfile, setViewingProfile] = useState<SkillsTrainingProfile | null>(null)
  const [editingProfile, setEditingProfile] = useState<SkillsTrainingProfile | null>(null)

  const [assigningProfile, setAssigningProfile] = useState<SkillsTrainingProfile | null>(null)
  const [assignSearch, setAssignSearch] = useState('')
  const [assignStep, setAssignStep] = useState<1 | 2>(1)
  const [selectedTraining, setSelectedTraining] = useState<ProgramActivity | null>(null)
  const [assignViewOnly, setAssignViewOnly] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [sortOrder, setSortOrder] = useState<'firstName_asc' | 'firstName_desc' | 'lastName_asc' | 'lastName_desc' | 'dateApplied_newest' | 'dateApplied_oldest' | ''>('')
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false)
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})

  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<{ lastName: string; firstName: string; batchNo: string; status: string; valid: boolean }[]>([])
  const [importAllRows, setImportAllRows] = useState<Record<string, string>[]>([])

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number | null }>({ open: false, id: null })
  const [successModal, setSuccessModal] = useState<{ open: boolean; message: string }>({ open: false, message: '' })

  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)

  const availableFilters = [
    { id: 'classification',     label: 'Classification',       options: [...CLASSIFICATION_OPTIONS, 'Others'] },
    { id: 'desiredQualification', label: 'Desired Qualification', options: [...QUALIFICATION_OPTIONS, 'Others'] },
    { id: 'purposeOfTraining',  label: 'Purpose of Training',  options: [...PURPOSE_OPTIONS, 'Others'] },
    { id: 'status',             label: 'Status',               options: ['Accepted', 'Waitlisted'] },
    { id: 'batchNo',            label: 'Training Batch No.',   options: BATCH_OPTIONS },
    { id: 'sex',                label: 'Sex',                  options: ['Male', 'Female'] },
    { id: 'age',                label: 'Age',                  options: ['Below 20', '20–25', '26–30', '31–40', 'Above 40'] },
    { id: 'civilStatus',        label: 'Civil Status',         options: CIVIL_STATUS_OPTIONS },
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

  const filteredProfiles = profiles.filter(p => {
    const fullName = `${p.firstName} ${p.lastName} ${p.middleName}`.toLowerCase()
    const matchesSearch = searchQuery === '' ||
      fullName.includes(searchQuery.toLowerCase()) ||
      p.classification.join(' ').toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.desiredQualification.join(' ').toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.trainingBatchNo.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilters = activeFilters.every(filterId => {
      const val = filterValues[filterId]
      if (!val) return true
      switch (filterId) {
        case 'classification': return p.classification.includes(val) || (val === 'Others' && p.classificationOther.filter(Boolean).length > 0)
        case 'desiredQualification': return p.desiredQualification.includes(val) || (val === 'Others' && p.qualificationOther.length > 0)
        case 'purposeOfTraining': return p.purposeOfTraining.includes(val) || (val === 'Others' && p.purposeOther.length > 0)
        case 'status': return p.status === val
        case 'batchNo': return p.trainingBatchNo === val
        case 'sex': return p.sex === val
        case 'civilStatus': return p.civilStatus === val
        case 'age': {
          const age = p.age ?? 0
          if (val === 'Below 20') return age < 20
          if (val === '20–25') return age >= 20 && age <= 25
          if (val === '26–30') return age >= 26 && age <= 30
          if (val === '31–40') return age >= 31 && age <= 40
          if (val === 'Above 40') return age > 40
          return true
        }
        default: return true
      }
    })
    return matchesSearch && matchesFilters
  })

  const sortedProfiles = [...filteredProfiles].sort((a, b) => {
    if (sortOrder === 'dateApplied_newest') return (b.dateApplicationReceived || '').localeCompare(a.dateApplicationReceived || '')
    if (sortOrder === 'dateApplied_oldest') return (a.dateApplicationReceived || '').localeCompare(b.dateApplicationReceived || '')
    if (!sortOrder) return 0
    const keyA = (sortOrder.startsWith('firstName') ? (a.firstName ?? '') : (a.lastName ?? '')).toLowerCase()
    const keyB = (sortOrder.startsWith('firstName') ? (b.firstName ?? '') : (b.lastName ?? '')).toLowerCase()
    return sortOrder.endsWith('asc') ? keyA.localeCompare(keyB) : keyB.localeCompare(keyA)
  })

  const totalPages = Math.max(1, Math.ceil(sortedProfiles.length / perPage))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = sortedProfiles.slice((safePage - 1) * perPage, safePage * perPage)
  const recordStart = sortedProfiles.length === 0 ? 0 : (safePage - 1) * perPage + 1
  const recordEnd = Math.min(safePage * perPage, sortedProfiles.length)

  const getTrainingName = (id: number | null): string => {
    if (!id) return '—'
    return skillsTrainings.find(a => a.id === id)?.title ?? '—'
  }
  const getTrainingStatus = (id: number | null): string | null => {
    if (!id) return null
    return skillsTrainings.find(a => a.id === id)?.status ?? null
  }
  const trainingStatusBadge = (s: string) =>
    s === 'Planned' ? 'bg-yellow-100 text-yellow-700' : s === 'Ongoing' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'

  const exportRows = (rows: SkillsTrainingProfile[]) => rows.map(p => ({
    'Last Name': p.lastName, 'First Name': p.firstName, 'Middle Name': p.middleName,
    'Birthdate': p.birthdate, 'Age': p.age, 'Sex': p.sex, 'Civil Status': p.civilStatus,
    'Address': p.address, 'Contact #': p.contactNumber,
    'Classification': p.classification.join(', '),
    'Desired Qualification': p.desiredQualification.join(', '),
    'Purpose of Training': p.purposeOfTraining.join(', '),
    'Batch No.': p.trainingBatchNo, 'Status': p.status,
    'Assessment Result': p.assessmentResult,
    'Date Applied': p.dateApplicationReceived, 'Remarks': p.remarks,
  }))

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows(filteredProfiles))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Skills Training')
    XLSX.writeFile(wb, `SkillsTraining_${new Date().toISOString().split('T')[0]}.xlsx`)
    setIsExportDropdownOpen(false)
  }
  const exportToCSV = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows(filteredProfiles))
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([XLSX.utils.sheet_to_csv(ws)], { type: 'text/csv;charset=utf-8;' }))
    link.download = `SkillsTraining_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    setIsExportDropdownOpen(false)
  }

  const handleFileUpload = (file: File) => {
    setUploadedFile(file)
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary' })
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as Record<string, string>[]
        setImportAllRows(rows)
        setImportPreview(rows.slice(0, 5).map(r => ({
          lastName: r['Last Name'] || '',
          firstName: r['First Name'] || '',
          batchNo: r['Batch No.'] || '',
          status: r['Status'] || '',
          valid: !!(r['Last Name'] && r['First Name']),
        })))
      } catch { alert('Error reading file. Please use the correct format.') }
    }
    reader.readAsBinaryString(file)
  }

  const closeImportModal = () => {
    setIsImportModalOpen(false); setUploadedFile(null); setImportPreview([]); setImportAllRows([])
  }

  const handleImport = () => {
    const valid = importAllRows.filter(r => r['Last Name'] && r['First Name'])
    const newProfiles: SkillsTrainingProfile[] = valid.map((r, i) => ({
      ...emptyForm, id: Date.now() + i,
      lastName: r['Last Name'] || '', firstName: r['First Name'] || '',
      middleName: r['Middle Name'] || '', address: r['Address'] || '',
      contactNumber: r['Contact #'] || '', trainingBatchNo: r['Batch No.'] || '',
      status: (['Accepted', 'Waitlisted'].includes(r['Status']) ? r['Status'] : 'Waitlisted') as SkillsTrainingProfile['status'],
      dateApplicationReceived: r['Date Applied'] || '',
      assessmentResult: r['Assessment Result'] || '', remarks: r['Remarks'] || '',
    }))
    setProfiles(prev => [...newProfiles, ...prev])
    closeImportModal()
    setSuccessModal({ open: true, message: `Successfully imported ${newProfiles.length} profile(s)!` })
  }

  const closeAssignModal = () => {
    setAssigningProfile(null); setAssignSearch(''); setAssignStep(1); setSelectedTraining(null); setAssignViewOnly(false)
  }

  const handleAssignTraining = (trainingId: number) => {
    if (!assigningProfile) return
    setProfiles(prev => prev.map(p => p.id === assigningProfile.id ? { ...p, assignedTrainingId: trainingId } : p))
    closeAssignModal()
    setSuccessModal({ open: true, message: 'Training activity assigned successfully.' })
  }
  const handleUnassignTraining = () => {
    if (!assigningProfile) return
    setProfiles(prev => prev.map(p => p.id === assigningProfile.id ? { ...p, assignedTrainingId: null } : p))
    closeAssignModal()
    setSuccessModal({ open: true, message: 'Assigned activity has been removed.' })
  }

  const handleDelete = (id: number) => {
    setProfiles(prev => prev.filter(p => p.id !== id))
    setDeleteConfirm({ open: false, id: null })
    setSuccessModal({ open: true, message: 'Profile has been deleted.' })
  }

  if (isFormOpen) {
    return (
      <SkillsTrainingProfileForm
        onClose={() => setIsFormOpen(false)}
        onSave={data => {
          setProfiles(prev => [{ ...data, id: Date.now() }, ...prev])
          setIsFormOpen(false)
          setSuccessModal({ open: true, message: 'Profile added successfully!' })
        }}
      />
    )
  }
  if (editingProfile) {
    const { id: _id, ...rest } = editingProfile
    return (
      <SkillsTrainingProfileForm mode="edit" initialData={rest}
        onClose={() => setEditingProfile(null)}
        onSave={data => {
          setProfiles(prev => prev.map(p => p.id === editingProfile.id ? { ...data, id: editingProfile.id } : p))
          setEditingProfile(null)
          setSuccessModal({ open: true, message: 'Profile updated successfully!' })
        }}
      />
    )
  }
  if (viewingProfile) {
    return <ViewProfilePanel profile={viewingProfile} onClose={() => setViewingProfile(null)} />
  }

  return (
    <>
      <ConfirmModal
        isOpen={deleteConfirm.open} type="confirm"
        title="Delete Profile"
        message="Are you sure you want to delete this profile? This action cannot be undone."
        confirmText="Delete" cancelText="Cancel"
        onConfirm={() => deleteConfirm.id !== null && handleDelete(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
      />
      <ConfirmModal
        isOpen={successModal.open} type="success"
        title="Success" message={successModal.message}
        confirmText="OK"
        onConfirm={() => setSuccessModal({ open: false, message: '' })}
        onCancel={() => setSuccessModal({ open: false, message: '' })}
      />

      {/* Assign Training Modal */}
      {assigningProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div>
                <h3 className="text-gray-800 font-semibold">
                  {assignStep === 1 ? 'Assign Training' : 'Confirm Assignment'}
                </h3>
                <p className="text-sm text-gray-400 mt-0.5">{assigningProfile.firstName} {assigningProfile.lastName}</p>
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

            {/* Step 1 — pick a training */}
            {assignStep === 1 && (
              <>
                {assigningProfile.status !== 'Accepted' && (
                  <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 flex-shrink-0 flex items-start gap-2">
                    <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      Applicant status is <span className="font-semibold">{assigningProfile.status}</span>. Update to <span className="font-semibold">Accepted</span> before assigning an activity.
                    </p>
                  </div>
                )}
                <div className="px-6 pt-4 flex-shrink-0">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search trainings..."
                      value={assignSearch}
                      onChange={e => setAssignSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-blue"
                    />
                  </div>
                </div>
                <div className={`flex-1 overflow-y-auto p-6 pt-3 space-y-2${assigningProfile.status !== 'Accepted' ? ' pointer-events-none opacity-40' : ''}`}>
                  {plannedTrainings.filter(t => assignSearch === '' || t.title.toLowerCase().includes(assignSearch.toLowerCase())).length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle size={32} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-400">{assignSearch ? 'No planned trainings match your search' : 'No planned trainings available'}</p>
                      <p className="text-xs text-gray-300 mt-1">Only Planned trainings can be assigned.</p>
                    </div>
                  ) : plannedTrainings.filter(t => assignSearch === '' || t.title.toLowerCase().includes(assignSearch.toLowerCase())).map(training => {
                    const isAssigned = assigningProfile.assignedTrainingId === training.id
                    return (
                      <button
                        key={training.id}
                        onClick={() => { setSelectedTraining(training); setAssignStep(2) }}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${isAssigned ? 'border-brand-blue bg-blue-50' : 'border-gray-200 hover:border-brand-blue hover:bg-blue-50'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-gray-800">{training.title}</p>
                              {isAssigned && <span className="text-xs px-2 py-0.5 bg-blue-100 text-brand-blue rounded-full">Currently assigned</span>}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{training.service}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {training.location}{training.startDate && training.endDate ? ` · ${training.startDate} – ${training.endDate}` : training.date ? ` · ${training.date}` : ''}
                            </p>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-semibold bg-yellow-100 text-yellow-700">Planned</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 flex flex-col gap-2">
                  {assigningProfile.assignedTrainingId && (
                    <button onClick={handleUnassignTraining} disabled={!canManage('skills')} className="w-full py-2.5 border border-red-200 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Remove Assigned Activity</button>
                  )}
                  <button onClick={closeAssignModal} className="w-full py-2.5 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm">Cancel</button>
                </div>
              </>
            )}

            {/* Step 2 — confirm */}
            {assignStep === 2 && selectedTraining && (
              <>
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-800">{selectedTraining.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{selectedTraining.service}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${trainingStatusBadge(selectedTraining.status)}`}>
                        {selectedTraining.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      {selectedTraining.location && <div className="col-span-2"><span className="text-gray-400">Location: </span>{selectedTraining.location}</div>}
                      {selectedTraining.startDate && <div><span className="text-gray-400">Start: </span>{selectedTraining.startDate}</div>}
                      {selectedTraining.endDate && <div><span className="text-gray-400">End: </span>{selectedTraining.endDate}</div>}
                      {!selectedTraining.startDate && selectedTraining.date && <div><span className="text-gray-400">Date: </span>{selectedTraining.date}</div>}
                      {selectedTraining.participants && <div><span className="text-gray-400">Slots: </span>{selectedTraining.participants}</div>}
                      {selectedTraining.allowance && <div><span className="text-gray-400">Allowance: </span>₱{selectedTraining.allowance}/mo</div>}
                      {selectedTraining.facilitator && <div className="col-span-2"><span className="text-gray-400">Facilitator: </span>{selectedTraining.facilitator}</div>}
                      {selectedTraining.description && <div className="col-span-2"><span className="text-gray-400">Description: </span>{selectedTraining.description}</div>}
                    </div>
                  </div>
                  {assigningProfile.assignedTrainingId && assigningProfile.assignedTrainingId !== selectedTraining.id && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
                      This applicant is currently assigned to another training. Assigning will replace the current assignment.
                    </div>
                  )}
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
                  {assignViewOnly ? (
                    <button onClick={closeAssignModal} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Close</button>
                  ) : (
                    <>
                      <button onClick={() => { setAssignStep(1); setSelectedTraining(null) }} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Back</button>
                      <button
                        onClick={() => handleAssignTraining(selectedTraining.id)}
                        disabled={!canManage('skills')}
                        className="flex-1 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue"
                      >
                        {assigningProfile.assignedTrainingId ? 'Re-assign' : 'Assign'}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <p className="text-gray-800 font-semibold">Import Skills Training Profiles</p>
              <button onClick={closeImportModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <label className="block w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-[#8B5CF6] hover:bg-purple-50 transition-colors"
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f) }}>
                <Upload size={28} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">{uploadedFile ? uploadedFile.name : 'Click to upload or drag and drop'}</p>
                <p className="text-xs text-gray-400 mt-1">.xlsx or .csv files</p>
                <input type="file" accept=".xlsx,.csv" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]) }} />
              </label>
              {importPreview.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Preview ({importPreview.length} records found):</p>
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {importPreview.map((row, i) => (
                      <div key={i} className={`px-3 py-2 flex items-center justify-between text-xs ${row.valid ? '' : 'bg-red-50'}`}>
                        <span className="text-gray-700">{row.firstName} {row.lastName}</span>
                        <span className="text-gray-500">{row.batchNo || '—'}</span>
                        {!row.valid && <span className="text-red-500 ml-2">Invalid</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={closeImportModal} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={handleImport} disabled={importPreview.filter(r => r.valid).length === 0 || !canManage('skills')} className="flex-1 py-2 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: BRAND }}>
                Import {importPreview.filter(r => r.valid).length > 0 ? `(${importPreview.filter(r => r.valid).length})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main scrollable content */}
      <div className="h-full overflow-y-auto bg-brand-bg">
        <div className="w-full px-6 py-8">

          <div className="mb-6 flex items-center gap-4">
            <button onClick={onBack} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft size={24} />
            </button>
            <p className="text-gray-800 font-bold" style={{ fontSize: 'var(--text-xl)' }}>
              Skills Training Program
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-3 mb-4">
            <div className="flex gap-2">
              <button onClick={() => setIsFormOpen(true)} disabled={!canManage('skills')} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue text-white rounded-md hover:bg-brand-blue-dark transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue">
                <Plus size={16} /><span>Add Profile</span>
              </button>
              <button onClick={() => setIsImportModalOpen(true)} disabled={!canManage('skills')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white">
                <Upload size={16} /><span>Import</span>
              </button>
              <div className="relative">
                <button onClick={() => setIsExportDropdownOpen(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl transition-colors text-sm">
                  <Download size={16} /><span>Export</span><ChevronDown size={14} />
                </button>
                {isExportDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsExportDropdownOpen(false)} />
                    <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <button onClick={exportToExcel} className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-t-lg text-sm"><Download size={16} /> Excel (.xlsx)</button>
                      <button onClick={exportToCSV} className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-b-lg border-t border-gray-100 text-sm"><Download size={16} /> CSV (.csv)</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="mb-4">
            <div className="flex gap-3">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by name, classification, batch, or qualification..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-blue placeholder:text-gray-400"
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
                <button onClick={() => setIsFilterDropdownOpen(v => !v)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors whitespace-nowrap text-sm text-gray-700">
                  <Plus size={16} /><span>Filter By</span><ChevronDown size={14} className="text-gray-500" />
                </button>
                {isFilterDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsFilterDropdownOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      {availableFilters.map(filter => (
                        <button key={filter.id} onClick={() => handleAddFilter(filter.id)} disabled={activeFilters.includes(filter.id)} className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${activeFilters.includes(filter.id) ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'text-gray-700'}`}>
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
                      <select value={filterValues[filterId] || ''} onChange={e => { setFilterValues(prev => ({ ...prev, [filterId]: e.target.value })); setCurrentPage(1) }} onClick={e => e.stopPropagation()} className="text-sm bg-transparent border-none focus:outline-none text-blue-700 font-medium pr-1 cursor-pointer">
                        <option value="">All</option>
                        {filter?.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                      <button onClick={() => handleRemoveFilter(filterId)} className="text-blue-700 hover:text-blue-900"><X size={14} /></button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {sortedProfiles.length === 0 ? (
            <div className="text-center py-20">
              <Users size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600 text-lg">No profiles found</p>
              <p className="text-gray-400 text-sm mt-1">
                {profiles.length === 0 ? 'Click "Add Profile" to register the first applicant.' : 'Try adjusting your search or filters.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-brand-blue">
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Applicant Name</th>
                    {activeFilters.includes('sex')         && <th className="px-4 py-4 text-left text-white whitespace-nowrap">Sex</th>}
                    {activeFilters.includes('age')         && <th className="px-4 py-4 text-left text-white whitespace-nowrap">Age</th>}
                    {activeFilters.includes('civilStatus') && <th className="px-4 py-4 text-left text-white whitespace-nowrap">Civil Status</th>}
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Classification</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Desired Qualification</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Purpose of Training</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Assigned Training</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Status</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Date Applied</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(profile => (
                    <tr key={profile.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-gray-800 font-medium">{profile.lastName}, {profile.firstName}{profile.middleName ? ` ${profile.middleName.charAt(0)}.` : ''}</p>
                      </td>
                      {activeFilters.includes('sex')         && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{profile.sex || '—'}</td>}
                      {activeFilters.includes('age')         && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{profile.age ? `${profile.age} yrs` : '—'}</td>}
                      {activeFilters.includes('civilStatus') && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{profile.civilStatus || '—'}</td>}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {profile.classification.slice(0, 1).map(c => <span key={c} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{c}</span>)}
                          {(profile.classification.length + profile.classificationOther.filter(Boolean).length) > 1 && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-500 rounded text-xs">+{profile.classification.length + profile.classificationOther.filter(Boolean).length - 1}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {profile.desiredQualification.slice(0, 1).map(q => <span key={q} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{q}</span>)}
                          {(profile.desiredQualification.length + profile.qualificationOther.filter(Boolean).length) > 1 && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-500 rounded text-xs">+{profile.desiredQualification.length + profile.qualificationOther.filter(Boolean).length - 1}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {profile.purposeOfTraining.slice(0, 1).map(pt => <span key={pt} className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs max-w-[140px] truncate inline-block">{pt}</span>)}
                          {profile.purposeOfTraining.length > 1 && <span className="px-2 py-0.5 bg-green-50 text-green-500 rounded text-xs">+{profile.purposeOfTraining.length - 1}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {profile.assignedTrainingId ? (
                          <div>
                            <p className="text-gray-800 line-clamp-1">{getTrainingName(profile.assignedTrainingId)}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {(() => { const ts = getTrainingStatus(profile.assignedTrainingId); return ts ? <span className={`px-2 py-0.5 rounded-full text-xs ${trainingStatusBadge(ts)}`}>{ts}</span> : null })()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={profile.status} /></td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(profile.dateApplicationReceived)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={e => {
                            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                            const showAbove = window.innerHeight - rect.bottom < 148
                            setMenuPos({ top: showAbove ? rect.top - 148 : rect.bottom + 4, right: window.innerWidth - rect.right })
                            setOpenActionMenuId(openActionMenuId === profile.id ? null : profile.id)
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
              {sortedProfiles.length > 0 && (
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
                    <span>{recordStart} to {recordEnd} of {filteredProfiles.length} records</span>
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
        const profile = profiles.find(p => p.id === openActionMenuId)
        if (!profile) return null
        return ReactDOM.createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenActionMenuId(null)} />
            <div style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }} className="w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
              <button onClick={() => { setViewingProfile(profile); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">View</button>
              <button onClick={() => { setEditingProfile(profile); setOpenActionMenuId(null) }} disabled={!canManage('skills')} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Edit</button>
              {(() => {
                const hasActive = !!profile.assignedTrainingId
                if (hasActive) {
                  const current = skillsTrainings.find(t => t.id === profile.assignedTrainingId) ?? null
                  return (
                    <button onClick={() => { setAssigningProfile(profile); setSelectedTraining(current); setAssignStep(2); setAssignViewOnly(true); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-blue-600 hover:bg-blue-50">View Assigned Training</button>
                  )
                }
                return (
                  <button onClick={() => { setAssigningProfile(profile); setAssignSearch(''); setAssignViewOnly(false); setOpenActionMenuId(null) }} disabled={!canManage('skills')} className="w-full px-3 py-2 text-left text-xs text-purple-600 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Assign Training</button>
                )
              })()}
              <div className="my-1 border-t border-gray-100" />
              <button onClick={() => { setDeleteConfirm({ open: true, id: profile.id }); setOpenActionMenuId(null) }} disabled={!canManage('skills')} className="w-full px-3 py-2 text-left text-xs text-red-500 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Delete</button>
            </div>
          </>,
          document.body
        )
      })()}
    </>
  )
}
