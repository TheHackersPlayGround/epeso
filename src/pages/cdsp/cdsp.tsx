import { useState } from 'react'
import { fmtDate } from '../../utils/formatDate'
import Swal from 'sweetalert2'
import {
  ArrowLeft, Search, Plus, X, Users,
  ChevronDown, AlertCircle, CheckCircle, Upload, Download, MoreHorizontal,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { useCDSP } from '../../contexts/CDSPContext'
import type { CDSPApplicant, CdspActivity } from '../../contexts/CDSPContext'
import { canManage } from '../../utils/permissions'
import * as cdspApiService from '../../services/cdspService'
import CDSPProfileForm, {
  ViewApplicantPanel, emptyForm, CDSP_SEED_SERVICES,
  getEffectiveStatus, StatusBadge, CLASSIFICATION_OPTIONS, CIVIL_STATUS_OPTIONS,
} from './CDSPProfileForm'

interface CDSPViewProps {
  onBack: () => void
}

// ─── Activity status badge ─────────────────────────────────────────────────────

function activityStatusBadge(status: string) {
  if (status === 'Ongoing')   return 'bg-green-100 text-green-700'
  if (status === 'Completed') return 'bg-blue-100 text-blue-700'
  return 'bg-yellow-100 text-yellow-700'
}

// ─── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  isOpen, type, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel',
}: {
  isOpen: boolean
  type: 'confirm' | 'success' | 'error'
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
}) {
  if (!isOpen) return null
  const Icon = type === 'success' ? CheckCircle : AlertCircle
  const iconColor = type === 'success' ? 'text-green-500' : type === 'error' ? 'text-red-500' : 'text-brand-blue'
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 text-center">
        <Icon size={56} className={`mx-auto mb-4 ${iconColor}`} />
        <p className="text-xl text-gray-800 mb-3 font-semibold">{title}</p>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          {type === 'confirm' ? (
            <>
              <button onClick={onCancel} className="px-6 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">{cancelText}</button>
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

// ─── Main CDSPView ─────────────────────────────────────────────────────────────

export default function CDSPView({ onBack }: CDSPViewProps) {
  const { applicants, activities: cdspActivities, services: svcList, refreshProfiles } = useCDSP()
  const cdspServices = svcList.length > 0 ? svcList.map(s => s.name) : CDSP_SEED_SERVICES

  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [sortOrder, setSortOrder] = useState<'firstName_asc' | 'firstName_desc' | 'lastName_asc' | 'lastName_desc' | 'dateApplied_newest' | 'dateApplied_oldest' | ''>('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})

  const availableFilters = [
    { id: 'service',        label: 'Service',        options: cdspServices },
    { id: 'status',         label: 'Status',          options: ['Active', 'Inactive'] },
    { id: 'classification', label: 'Classification',  options: [...CLASSIFICATION_OPTIONS, 'Others'] },
    { id: 'sex',            label: 'Sex',             options: ['Male', 'Female'] },
    { id: 'age',            label: 'Age',             options: ['Below 20', '20–25', '26–30', '31–40', 'Above 40'] },
    { id: 'civilStatus',    label: 'Civil Status',    options: CIVIL_STATUS_OPTIONS },
  ]

  const handleAddFilter = (filterId: string) => {
    if (!activeFilters.includes(filterId)) {
      setActiveFilters((prev) => [...prev, filterId])
      setFilterValues((prev) => ({ ...prev, [filterId]: '' }))
      setCurrentPage(1)
    }
    setIsFilterOpen(false)
  }
  const handleRemoveFilter = (filterId: string) => {
    setActiveFilters((prev) => prev.filter((id) => id !== filterId))
    setFilterValues((prev) => { const n = { ...prev }; delete n[filterId]; return n })
    setCurrentPage(1)
  }
  const handleFilterValueChange = (filterId: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [filterId]: value }))
    setCurrentPage(1)
  }

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingApplicant, setEditingApplicant] = useState<CDSPApplicant | null>(null)
  const [viewingApplicant, setViewingApplicant] = useState<CDSPApplicant | null>(null)
  const [assignTarget, setAssignTarget] = useState<CDSPApplicant | null>(null)
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importFileType, setImportFileType] = useState<'excel' | 'csv'>('excel')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<{ lastName: string; firstName: string; service: string; status: string; valid: boolean }[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number | null }>({ open: false, id: null })
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<CdspActivity | null>(null)
  const [viewingAssignedFor, setViewingAssignedFor] = useState<CDSPApplicant | null>(null)
  const [viewingAssignmentHistoryFor, setViewingAssignmentHistoryFor] = useState<CDSPApplicant | null>(null)

  const filtered = applicants.filter((a) => {
    const fullName = `${a.lastName} ${a.firstName} ${a.middleName}`.toLowerCase()
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      a.barangay.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.assignedActivity.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilters = activeFilters.every((filterId) => {
      const val = filterValues[filterId]
      if (!val) return true
      if (filterId === 'service') return a.serviceAvailed === val
      if (filterId === 'status') return getEffectiveStatus(a, cdspActivities) === val
      if (filterId === 'classification') return a.classification.includes(val) || (val === 'Others' && a.classificationOther !== '')
      if (filterId === 'sex') return a.sex === val
      if (filterId === 'civilStatus') return a.civilStatus === val
      if (filterId === 'age') {
        const age = a.age ?? 0
        if (val === 'Below 20')  return age < 20
        if (val === '20–25')     return age >= 20 && age <= 25
        if (val === '26–30')     return age >= 26 && age <= 30
        if (val === '31–40')     return age >= 31 && age <= 40
        if (val === 'Above 40')  return age > 40
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

  const handleAddSave = async (data: Omit<CDSPApplicant, 'id'>) => {
    try {
      await cdspApiService.createProfile(data as unknown as Record<string, unknown>)
      await refreshProfiles()
      setIsFormOpen(false)
      Swal.fire({ icon: 'success', title: 'Success', text: 'Applicant profile has been added successfully.', confirmButtonColor: '#0077BE' })
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (e as { message?: string })?.message ?? 'Failed to save profile.'
      Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#0077BE' })
    }
  }
  const handleEditSave = async (data: Omit<CDSPApplicant, 'id'>) => {
    if (!editingApplicant) return
    try {
      await cdspApiService.updateProfile(editingApplicant.id, data as unknown as Record<string, unknown>)
      await refreshProfiles()
      setEditingApplicant(null)
      Swal.fire({ icon: 'success', title: 'Success', text: 'Applicant profile has been updated successfully.', confirmButtonColor: '#0077BE' })
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (e as { message?: string })?.message ?? 'Failed to update profile.'
      Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#0077BE' })
    }
  }
  const handleDelete = async (id: number) => {
    try {
      await cdspApiService.deleteProfile(id)
      await refreshProfiles()
      setDeleteConfirm({ open: false, id: null })
      Swal.fire({ icon: 'success', title: 'Success', text: 'Applicant profile has been deleted.', confirmButtonColor: '#0077BE' })
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (e as { message?: string })?.message ?? 'Failed to delete profile.'
      Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#0077BE' })
    }
  }
  const handleAssign = async (activity: CdspActivity) => {
    if (!assignTarget?.beneficiaryServiceId) return
    try {
      await cdspApiService.addParticipant({ activityId: activity.id, beneficiaryServiceId: assignTarget.beneficiaryServiceId })
      await refreshProfiles()
      setAssignTarget(null)
      setSelectedActivity(null)
      Swal.fire({ icon: 'success', title: 'Success', text: `Assigned to "${activity.title}" successfully.`, confirmButtonText: 'OK', confirmButtonColor: '#0077BE' })
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (e as { message?: string })?.message ?? 'Failed to assign activity.'
      Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#0077BE' })
    }
  }
  const handleUnassign = async (targetId?: number) => {
    const applicant = targetId
      ? applicants.find(a => a.id === targetId)
      : assignTarget
    if (!applicant?.beneficiaryServiceId || !applicant?.assignedActivityId) return
    try {
      await cdspApiService.removeParticipant({ activityId: applicant.assignedActivityId, beneficiaryServiceId: applicant.beneficiaryServiceId })
      await refreshProfiles()
      setAssignTarget(null)
      setSelectedActivity(null)
      setViewingAssignedFor(null)
      Swal.fire({ icon: 'success', title: 'Removed', text: 'Assigned activity has been removed.', confirmButtonText: 'OK', confirmButtonColor: '#0077BE' })
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (e as { message?: string })?.message ?? 'Failed to remove assignment.'
      Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#0077BE' })
    }
  }

  const exportRows = (rows: CDSPApplicant[]) => rows.map((a) => ({
    'Last Name': a.lastName, 'First Name': a.firstName, 'Middle Name': a.middleName,
    'Sex': a.sex, 'Birthdate': a.birthdate, 'Age': a.age, 'Civil Status': a.civilStatus,
    'Contact Number': a.contactNumber, 'Email': a.email,
    'Street / Purok #': a.streetPurok, 'Barangay': a.barangay,
    'City / Municipality': a.cityMunicipality, 'Province': a.province, 'Region': a.region,
    'Classification': a.classification.join(', '),
    'Highest Education': a.highestEducation, 'Course': a.course,
    'Employment Status': a.employmentStatus, 'Occupation': a.currentOccupation,
    'Service Availed': a.serviceAvailed, 'Assigned Activity': a.assignedActivity,
    'Career Goal': a.careerGoal, 'Target Job': a.targetJob,
    'Counselor': a.counselorName, 'Status': a.status, 'Remarks': a.remarks,
    'Date Received': a.dateApplicationReceived, 'Received By': a.receivedBy,
  }))

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows(filtered))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'CDSP Applicants')
    XLSX.writeFile(wb, `CDSP_Applicants_${new Date().toISOString().split('T')[0]}.xlsx`)
    setIsExportDropdownOpen(false)
  }
  const exportToCSV = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows(filtered))
    const csv = XLSX.utils.sheet_to_csv(ws)
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    link.download = `CDSP_Applicants_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    setIsExportDropdownOpen(false)
  }
  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      'Last Name': 'Dela Cruz', 'First Name': 'Juan', 'Middle Name': 'M.',
      'Sex': 'Male', 'Birthdate': '2002-05-14', 'Age': 23, 'Civil Status': 'Single',
      'Contact Number': '09171234567', 'Email': 'juan@gmail.com',
      'Street / Purok #': 'Purok 3', 'Barangay': 'Poblacion',
      'City / Municipality': 'Tangub City', 'Province': 'Misamis Occidental', 'Region': 'Region X – Northern Mindanao',
      'Classification': 'Fresh Graduate', 'Highest Education': 'College Graduate', 'Course': 'BS IT',
      'Employment Status': 'Unemployed', 'Occupation': '',
      'Service Availed': 'Career Coaching', 'Assigned Activity': '',
      'Career Goal': 'Software Developer', 'Target Job': '',
      'Counselor': '', 'Status': 'Active', 'Remarks': '',
      'Date Received': '2026-03-10', 'Received By': 'Admin',
    }])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'CDSP Template')
    if (importFileType === 'excel') {
      XLSX.writeFile(wb, 'CDSP_Applicants_Template.xlsx')
    } else {
      const link = document.createElement('a')
      link.href = URL.createObjectURL(new Blob([XLSX.utils.sheet_to_csv(ws)], { type: 'text/csv;charset=utf-8;' }))
      link.download = 'CDSP_Applicants_Template.csv'
      link.click()
    }
  }
  const handleFileUpload = (file: File) => {
    setUploadedFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary' })
        const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])
        setImportPreview(rows.map((r) => ({
          lastName: r['Last Name'] || '', firstName: r['First Name'] || '',
          service: r['Service Availed'] || '', status: r['Status'] || '',
          valid: !!(r['Last Name'] && r['First Name']),
        })))
      } catch { alert('Error reading file. Please use the template format.') }
    }
    reader.readAsBinaryString(file)
  }
  const handleImport = () => {
    Swal.fire({ icon: 'info', title: 'Import Not Available', text: 'Bulk import requires barangay selection which cannot be resolved from a file. Please add applicants individually.', confirmButtonColor: '#0077BE' })
    setIsImportModalOpen(false)
    setUploadedFile(null)
    setImportPreview([])
  }

  // ─── Full-page sub-views ────────────────────────────────────────────────────

  if (isFormOpen) return <CDSPProfileForm onClose={() => setIsFormOpen(false)} onSave={handleAddSave} mode="add" />
  if (editingApplicant) {
    const { id: _id, ...rest } = editingApplicant
    return <CDSPProfileForm onClose={() => setEditingApplicant(null)} onSave={handleEditSave} initialData={rest} mode="edit" />
  }
  if (viewingApplicant) return <ViewApplicantPanel applicant={viewingApplicant} onClose={() => setViewingApplicant(null)} />

  // ─── Main list view ─────────────────────────────────────────────────────────

  return (
    <>
      <ConfirmModal
        isOpen={deleteConfirm.open} type="confirm"
        title="Delete Applicant Profile"
        message="Are you sure you want to delete this applicant's profile? This action cannot be undone."
        confirmText="Delete" cancelText="Cancel"
        onConfirm={() => deleteConfirm.id !== null && handleDelete(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
      />

      {/* View Assigned Activity Modal */}
      {viewingAssignedFor && (() => {
        const activity = cdspActivities.find(a => a.id === viewingAssignedFor.assignedActivityId)
        const close = () => setViewingAssignedFor(null)
        const statusBadge = (s: string) =>
          s === 'Ongoing'   ? 'bg-green-100 text-green-700' :
          s === 'Completed' ? 'bg-blue-100 text-blue-700'  :
          'bg-yellow-100 text-yellow-700'
        const Row = ({ label, value }: { label: string; value?: string | number }) =>
          value != null && value !== '' ? (
            <div className="flex gap-3 py-2.5 border-b border-gray-100 last:border-0">
              <span className="text-xs text-gray-400 w-36 flex-shrink-0 pt-0.5">{label}</span>
              <span className="text-sm text-gray-800 font-medium">{value}</span>
            </div>
          ) : null
        const canChange = !activity || activity.status === 'Completed'
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[85vh]">
              <div className="bg-brand-blue px-6 py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-white m-0 text-base font-semibold">Assigned Activity</h3>
                  <p className="text-white/80 text-sm mt-0.5">{viewingAssignedFor.lastName}, {viewingAssignedFor.firstName} {viewingAssignedFor.middleName}</p>
                </div>
                <button onClick={close} className="p-1 text-white/80 hover:text-white transition-colors"><X size={20} /></button>
              </div>

              <div className="overflow-y-auto flex-1 p-6">
                {activity ? (
                  <>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className="text-base font-bold text-gray-800 leading-snug flex-1">{activity.title}</p>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${statusBadge(activity.status)}`}>{activity.status}</span>
                    </div>
                    {activity.description && (
                      <p className="text-sm text-gray-500 mb-4 leading-relaxed">{activity.description}</p>
                    )}
                    <div className="mt-2">
                      <Row label="Service" value={activity.service} />
                      <Row label="Date" value={activity.date} />
                      <Row label="Location / Venue" value={activity.location} />
                      <Row label="Facilitator" value={activity.facilitator} />
                      <Row label="Participants" value={activity.participants ?? undefined} />
                      <Row label="Counselor" value={activity.counselor} />
                      <Row label="Session Duration" value={activity.sessionDuration} />
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-sm font-medium text-gray-700 mb-1">{viewingAssignedFor.assignedActivity}</p>
                    <p className="text-xs text-gray-400">Activity details not found.</p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
                {canChange && canManage('cdsp') && (
                  <button
                    onClick={() => {
                      Swal.fire({
                        icon: 'warning',
                        title: 'Remove Assignment',
                        text: 'Are you sure you want to remove the assigned activity from this applicant?',
                        showCancelButton: true,
                        confirmButtonText: 'Yes, Remove',
                        cancelButtonText: 'Cancel',
                        confirmButtonColor: '#0077BE',
                        cancelButtonColor: '#6b7280',
                      }).then(r => { if (r.isConfirmed) handleUnassign(viewingAssignedFor.id) })
                    }}
                    className="px-4 py-2.5 border border-red-200 text-red-500 rounded-xl hover:bg-red-50 transition-colors text-sm font-medium"
                  >Unassign</button>
                )}
                {canChange && canManage('cdsp') && (
                  <button
                    onClick={() => { close(); setAssignTarget(viewingAssignedFor) }}
                    className="flex-1 py-2.5 border border-brand-blue text-brand-blue rounded-xl hover:bg-blue-50 transition-colors text-sm font-medium"
                  >Change Activity</button>
                )}
                <button onClick={close} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium">Close</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Assignment History Modal */}
      {viewingAssignmentHistoryFor && (() => {
        const a = viewingAssignmentHistoryFor
        const statusColor = (s?: string) =>
          s === 'Completed' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
          s === 'Ongoing'   ? 'bg-green-100 text-green-700 border border-green-200' :
          'bg-amber-100 text-amber-700 border border-amber-200'
        const visibleHistory = (a.assignmentHistory ?? []).filter(entry => {
          const act = cdspActivities.find(x => x.id === entry.activityId)
          const entryStatus = act?.status ?? 'Planned'
          const isCurrent = a.assignedActivityId === entry.activityId
          return entryStatus === 'Completed' || isCurrent
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
                    <p className="text-xs text-gray-600 text-center">Completed or active activity assignments will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...visibleHistory].reverse().map((entry, i) => {
                      const act = cdspActivities.find(x => x.id === entry.activityId)
                      const isCurrent = a.assignedActivityId === entry.activityId
                      const entryStatus = act?.status ?? 'Planned'
                      return (
                        <div key={i} className={`rounded-xl border px-5 py-4 flex items-start justify-between gap-3 ${isCurrent ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-800 font-semibold leading-snug">{entry.activityTitle}</p>
                            <p className="text-xs text-gray-400 mt-1">Date Assigned: {fmtDate(entry.assignedDate)}</p>
                            {entryStatus === 'Completed' && (
                              <p className="text-xs text-blue-500 mt-0.5">Date Completed: {fmtDate(entry.completedDate ?? act?.date ?? '')}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-2">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusColor(entryStatus)}`}>{entryStatus}</span>
                            {isCurrent && <span className="text-[10px] px-2.5 py-1 rounded-full bg-brand-blue text-white font-semibold">Current</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="px-6 pb-6 flex-shrink-0">
                <button onClick={() => setViewingAssignmentHistoryFor(null)} className="w-full py-3 border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-sm font-semibold transition-colors">Close</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Assign Activity Modal — Step 1: Select */}
      {assignTarget && !selectedActivity && (() => {
        const currentActivity = assignTarget.assignedActivityId
          ? cdspActivities.find(a => a.id === assignTarget.assignedActivityId) ?? null
          : null
        const available = cdspActivities.filter(a =>
          a.status === 'Planned' &&
          (!assignTarget.serviceAvailed || a.service === assignTarget.serviceAvailed)
        )
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col">
              <div className="bg-brand-blue px-6 py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-white m-0 text-base font-semibold">Assign Activity</h3>
                  <p className="text-white/80 text-sm mt-0.5">{assignTarget.firstName} {assignTarget.lastName}</p>
                </div>
                <button onClick={() => setAssignTarget(null)} className="p-1 text-white/80 hover:text-white transition-colors"><X size={20} /></button>
              </div>

              <div className="px-4 pt-3 pb-2 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input placeholder="Search activities..." className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none" readOnly />
                </div>
                <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1 px-1">
                  <AlertCircle size={11} className="flex-shrink-0" />
                  Showing <span className="font-semibold text-brand-blue mx-1">Planned</span> activities
                  {assignTarget.serviceAvailed && <> for <span className="font-semibold text-brand-blue mx-1">{assignTarget.serviceAvailed}</span> only</>}
                </p>
              </div>

              {currentActivity && (
                <div className="mx-4 mb-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start justify-between gap-3 flex-shrink-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-brand-blue uppercase tracking-widest mb-1">Currently Assigned</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">{currentActivity.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {currentActivity.service && <span className="text-xs text-gray-500">{currentActivity.service}</span>}
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700">{currentActivity.status}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      Swal.fire({
                        icon: 'warning',
                        title: 'Remove Assignment',
                        text: 'Are you sure you want to remove the assigned activity from this applicant?',
                        showCancelButton: true,
                        confirmButtonText: 'Yes, Remove',
                        cancelButtonText: 'Cancel',
                        confirmButtonColor: '#0077BE',
                        cancelButtonColor: '#6b7280',
                      }).then(r => { if (r.isConfirmed) handleUnassign(assignTarget.id) })
                    }}
                    disabled={!canManage('cdsp')}
                    className="text-xs text-red-500 hover:text-red-700 font-medium whitespace-nowrap flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >Unassign</button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2">
                {available.length === 0 ? (
                  <div className="py-12 text-center">
                    <AlertCircle size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-400 text-sm">
                      No Planned activities found{assignTarget.serviceAvailed && ` for "${assignTarget.serviceAvailed}"`}.
                    </p>
                  </div>
                ) : available.map(activity => {
                  const isCurrent = assignTarget.assignedActivityId === activity.id
                  return (
                    <button
                      key={activity.id}
                      onClick={() => setSelectedActivity(activity)}
                      className={`w-full px-4 py-3.5 text-left rounded-xl border transition-all hover:border-blue-300 hover:bg-blue-50 ${isCurrent ? 'border-brand-blue bg-blue-50' : 'border-gray-200'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 mb-1">{activity.title}</p>
                          <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 text-xs text-gray-500">
                            {activity.service && <span>{activity.service}</span>}
                            {activity.date && <><span>·</span><span>{activity.date}</span></>}
                            {activity.location && <><span>·</span><span>{activity.location}</span></>}
                          </div>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 font-medium bg-yellow-100 text-yellow-700">{activity.status}</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
                <button onClick={() => setAssignTarget(null)} className="w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Assign Activity Modal — Step 2: Confirm */}
      {assignTarget && selectedActivity && (() => {
        const isAssigned = assignTarget.assignedActivityId === selectedActivity.id
        const statusBadge = (s: string) =>
          s === 'Ongoing'   ? 'bg-green-100 text-green-700' :
          s === 'Completed' ? 'bg-blue-100 text-blue-700'  :
          'bg-yellow-100 text-yellow-700'
        const Row = ({ label, value }: { label: string; value?: string | number }) =>
          value != null && value !== '' ? (
            <div className="flex gap-3 py-2.5 border-b border-gray-100 last:border-0">
              <span className="text-xs text-gray-400 w-36 flex-shrink-0 pt-0.5">{label}</span>
              <span className="text-sm text-gray-800 font-medium">{value}</span>
            </div>
          ) : null
        const doAssign = () => {
          Swal.fire({
            icon: 'warning',
            title: 'Confirm Assignment',
            text: `Assign "${selectedActivity.title}" to ${assignTarget.firstName} ${assignTarget.lastName}?`,
            showCancelButton: true,
            confirmButtonText: 'Yes, Assign',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#0077BE',
            cancelButtonColor: '#6b7280',
          }).then(r => { if (r.isConfirmed) handleAssign(selectedActivity) })
        }
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[85vh]">
              <div className="bg-brand-blue px-6 py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-white m-0 text-base font-semibold">Assign Activity</h3>
                  <p className="text-white/80 text-sm mt-0.5">{assignTarget.lastName}, {assignTarget.firstName} {assignTarget.middleName}</p>
                </div>
                <button onClick={() => setSelectedActivity(null)} className="p-1 text-white/80 hover:text-white transition-colors"><X size={20} /></button>
              </div>

              <div className="overflow-y-auto flex-1 p-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-gray-800 leading-snug">{selectedActivity.title}</p>
                    {isAssigned && <span className="inline-block mt-1.5 px-2 py-0.5 bg-blue-100 text-brand-blue rounded-full text-xs font-semibold">Currently Assigned</span>}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${statusBadge(selectedActivity.status)}`}>{selectedActivity.status}</span>
                </div>
                <div>
                  <Row label="Service" value={selectedActivity.service} />
                  <Row label="Date" value={selectedActivity.date} />
                  <Row label="Location / Venue" value={selectedActivity.location} />
                  <Row label="Facilitator" value={selectedActivity.facilitator} />
                  <Row label="Participants" value={selectedActivity.participants ?? undefined} />
                  <Row label="Counselor" value={selectedActivity.counselor} />
                  <Row label="Session Duration" value={selectedActivity.sessionDuration} />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
                <button
                  onClick={() => setSelectedActivity(null)}
                  className="flex-1 py-2.5 border border-brand-blue text-brand-blue rounded-xl hover:bg-blue-50 transition-colors text-sm font-medium"
                >Change Activity</button>
                <button
                  onClick={doAssign}
                  disabled={!canManage('cdsp')}
                  className="flex-1 py-2.5 bg-brand-blue text-white rounded-xl hover:bg-brand-blue-dark transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue"
                >{isAssigned ? 'Re-assign' : 'Assign'}</button>
              </div>
            </div>
          </div>
        )
      })()}

      <div className="h-full overflow-y-auto bg-brand-bg">
      <div className="w-full px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button onClick={onBack} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={24} />
          </button>
          <p className="text-gray-800 font-bold" style={{ fontSize: 'var(--text-xl)' }}>
            Career Development Support Program (CDSP)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-md p-3 mb-4">
          <div className="flex gap-2">
            <button onClick={() => setIsFormOpen(true)} disabled={!canManage('cdsp')} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue text-white rounded-md hover:bg-brand-blue-dark transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue">
              <Plus size={16} /><span>Add Applicant</span>
            </button>
            <button onClick={() => setIsImportModalOpen(true)} disabled={!canManage('cdsp')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-md transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white">
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
                    <button onClick={exportToExcel} className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-t-lg text-sm">
                      <Download size={16} /> Excel (.xlsx)
                    </button>
                    <button onClick={exportToCSV} className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-b-lg border-t border-gray-100 text-sm">
                      <Download size={16} /> CSV (.csv)
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Import Modal */}
        {isImportModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <p className="text-gray-800 font-semibold">Import CDSP Applicants</p>
                <button onClick={() => { setIsImportModalOpen(false); setUploadedFile(null); setImportPreview([]) }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex gap-3">
                  <button onClick={() => setImportFileType('excel')} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${importFileType === 'excel' ? 'border-brand-blue bg-blue-50 text-brand-blue' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>Excel (.xlsx)</button>
                  <button onClick={() => setImportFileType('csv')} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${importFileType === 'csv' ? 'border-brand-blue bg-blue-50 text-brand-blue' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>CSV (.csv)</button>
                </div>
                <button onClick={downloadTemplate} className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50">Download Template</button>
                <label className="block w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-brand-blue hover:bg-blue-50 transition-colors">
                  <Upload size={28} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">{uploadedFile ? uploadedFile.name : 'Click to upload or drag and drop'}</p>
                  <p className="text-xs text-gray-400 mt-1">{importFileType === 'excel' ? '.xlsx' : '.csv'} files only</p>
                  <input type="file" accept={importFileType === 'excel' ? '.xlsx,.xls' : '.csv'} className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]) }} />
                </label>
                {importPreview.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Preview ({importPreview.length} records found):</p>
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                      {importPreview.slice(0, 10).map((row, i) => (
                        <div key={i} className={`px-3 py-2 flex items-center justify-between text-xs ${row.valid ? '' : 'bg-red-50'}`}>
                          <span className="text-gray-700">{row.firstName} {row.lastName}</span>
                          <span className="text-gray-500">{row.service || '—'}</span>
                          {!row.valid && <span className="text-red-500 ml-2">Invalid</span>}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-amber-600 mt-2">Note: Bulk import will be processed individually. Address fields must be set after import.</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
                <button onClick={() => { setIsImportModalOpen(false); setUploadedFile(null); setImportPreview([]) }} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm">Cancel</button>
                <button onClick={handleImport} disabled={importPreview.filter((r) => r.valid).length === 0 || !canManage('cdsp')} className="flex-1 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  Import {importPreview.filter((r) => r.valid).length > 0 ? `(${importPreview.filter((r) => r.valid).length})` : ''}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search & Filter + Table */}
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="mb-4">
          <div className="flex gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search by name, barangay, or assigned activity..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
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
              <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors whitespace-nowrap text-sm text-gray-700">
                <Plus size={16} /><span>Filter By</span><ChevronDown size={14} className="text-gray-500" />
              </button>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    {availableFilters.map((filter) => (
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
              {activeFilters.map((filterId) => {
                const filter = availableFilters.find((f) => f.id === filterId)
                return (
                  <div key={filterId} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
                    <span className="text-sm text-blue-700 font-medium">{filter?.label}:</span>
                    <select value={filterValues[filterId] || ''} onChange={(e) => handleFilterValueChange(filterId, e.target.value)} onClick={(e) => e.stopPropagation()} className="text-sm bg-transparent border-none focus:outline-none text-blue-700 font-medium pr-1 cursor-pointer">
                      <option value="">All</option>
                      {filter?.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <button onClick={() => handleRemoveFilter(filterId)} className="text-blue-700 hover:text-blue-900"><X size={14} /></button>
                  </div>
                )
              })}
            </div>
          )}
          </div>

          {sorted.length === 0 ? (
            <div className="text-center py-20">
              <Users size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600 text-lg">No applicants found</p>
              <p className="text-gray-400 text-sm mt-1">
                {applicants.length === 0 ? 'Click "Add Applicant" to register the first CDSP applicant.' : 'Try adjusting your search or filters.'}
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
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Barangay</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Classification</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Service Availed</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Assigned Activity</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Status</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Date Applied</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((applicant) => (
                    <tr key={applicant.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-gray-800 font-medium">{applicant.lastName}, {applicant.firstName}{applicant.middleName ? ` ${applicant.middleName.charAt(0)}.` : ''}</p>
                      </td>
                      {activeFilters.includes('sex')         && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{applicant.sex || '—'}</td>}
                      {activeFilters.includes('age')         && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{applicant.age ? `${applicant.age} yrs` : '—'}</td>}
                      {activeFilters.includes('civilStatus') && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{applicant.civilStatus || '—'}</td>}
                      <td className="px-4 py-3 text-gray-600">{applicant.barangay || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {applicant.classification.slice(0, 1).map((c) => (
                            <span key={c} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{c}</span>
                          ))}
                          {applicant.classification.length > 1 && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-500 rounded text-xs">+{applicant.classification.length - 1}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded whitespace-nowrap text-xs">{applicant.serviceAvailed || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {applicant.assignedActivity ? (() => {
                          const act = cdspActivities.find(a => a.id === applicant.assignedActivityId)
                          return (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm text-gray-800 line-clamp-1">{applicant.assignedActivity}</span>
                              {act && <span className={`self-start px-1.5 py-0.5 rounded-full text-xs font-medium ${activityStatusBadge(act.status)}`}>{act.status}</span>}
                            </div>
                          )
                        })() : <span className="text-gray-400 text-xs italic">Not assigned</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={getEffectiveStatus(applicant, cdspActivities)} /></td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(applicant.dateApplicationReceived)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                            const showAbove = window.innerHeight - rect.bottom < 148
                            setMenuPos({ top: showAbove ? rect.top - 148 : rect.bottom + 4, right: window.innerWidth - rect.right })
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

      {/* Action dropdown menu (fixed position) */}
      {openActionMenuId !== null && menuPos && (() => {
        const applicant = applicants.find((a) => a.id === openActionMenuId)
        if (!applicant) return null
        const assignedAct = applicant.assignedActivityId
          ? cdspActivities.find(a => a.id === applicant.assignedActivityId)
          : null
        const isCompleted = assignedAct?.status === 'Completed'
        return (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenActionMenuId(null)} />
            <div style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }} className="w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
              <button onClick={() => { setViewingApplicant(applicant); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">View</button>
              <button onClick={() => { setEditingApplicant(applicant); setOpenActionMenuId(null) }} disabled={!canManage('cdsp')} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Edit</button>
              {applicant.assignedActivity && !isCompleted
                ? <button onClick={() => { setViewingAssignedFor(applicant); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-blue-600 hover:bg-blue-50">View Assigned Activity</button>
                : <button onClick={() => { setAssignTarget(applicant); setOpenActionMenuId(null) }} disabled={!canManage('cdsp')} className="w-full px-3 py-2 text-left text-xs text-purple-600 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Assign Activity</button>
              }
              <button onClick={() => { setViewingAssignmentHistoryFor(applicant); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-brand-blue hover:bg-blue-50">View Assignment History</button>
              <div className="my-1 border-t border-gray-100" />
              <button onClick={() => { setDeleteConfirm({ open: true, id: applicant.id }); setOpenActionMenuId(null) }} disabled={!canManage('cdsp')} className="w-full px-3 py-2 text-left text-xs text-red-500 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Delete</button>
            </div>
          </>
        )
      })()}
    </>
  )
}
