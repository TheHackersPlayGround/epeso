import { useState, useRef, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import Swal from 'sweetalert2'
import { ArrowLeft, Plus, Download, ChevronDown, X, Search, Users, MoreHorizontal, ChevronLeft, ChevronRight, CheckCircle, PlayCircle, XCircle } from 'lucide-react'
import DatePicker from '../../components/DatePicker'
import { canManage } from '../../utils/permissions'
import * as XLSX from 'xlsx'
import type { OFWProfile, OFWSavedAttachment } from '../../contexts/OFWContext'
import { useOFW } from '../../contexts/OFWContext'
import * as ofwService from '../../services/ofwService'
import AddOFWRequestForm, { EMPLOYMENT_STATUS_OPTIONS, REQUEST_TYPES } from './AddOFWRequestForm'
import OFWProfileModal from './OFWProfileModal'

interface OFWViewProps {
  onBack: () => void
}

function errMsg(e: unknown, fallback: string) {
  return (e as { message?: string })?.message ?? fallback
}

// Backend stores the OWWA/ELPOR attachments as named document slots rather
// than the display-shaped owwaWelfareFile/elporFiles fields on OFWProfile --
// this converts the form's shape into that wire format. Including every
// currently-set slot (not just freshly-uploaded ones) matters: the backend
// treats an entirely absent key as "remove this slot", so an unchanged,
// already-saved attachment must still be sent (with no dataUrl) to survive.
function buildNamedAttachments(elporFiles?: Record<string, OFWSavedAttachment>, owwaWelfareFile?: OFWSavedAttachment | null) {
  const named: Record<string, { fileName: string; dataUrl?: string }> = {}
  if (owwaWelfareFile) named['OWWA Welfare Case Form'] = { fileName: owwaWelfareFile.fileName, dataUrl: owwaWelfareFile.dataUrl }
  for (const [type, att] of Object.entries(elporFiles ?? {})) {
    named[type] = { fileName: att.fileName, dataUrl: att.dataUrl }
  }
  return named
}

function toApiPayload(data: Omit<OFWProfile, 'id'>) {
  const { elporFiles, owwaWelfareFile, ...rest } = data
  return { ...rest, namedAttachments: buildNamedAttachments(elporFiles, owwaWelfareFile) }
}

type FilterKey = 'referenceNo' | 'dateFiled' | 'status' | 'employmentStatus' | 'address' | 'typeOfRequest'

const FILTER_DEFS: { key: FilterKey; label: string; type: 'text' | 'date' | 'select'; options?: string[] }[] = [
  { key: 'referenceNo',      label: 'Reference No.',      type: 'text' },
  { key: 'dateFiled',        label: 'Date Filed',          type: 'date' },
  { key: 'status',           label: 'Status',              type: 'select', options: ['Pending', 'Approved', 'Ongoing', 'Completed', 'Rejected'] },
  { key: 'employmentStatus', label: 'Employment Status',   type: 'select', options: EMPLOYMENT_STATUS_OPTIONS },
  { key: 'address',          label: 'Address',             type: 'text' },
  // Employment Referral's Desired Position/Type of Skill are shown directly as
  // subtext in the Type of Request column instead of separate filters here.
  { key: 'typeOfRequest',    label: 'Type of Request',     type: 'select', options: REQUEST_TYPES },
]

function StatusBadge({ status }: { status: OFWProfile['status'] }) {
  const map: Record<OFWProfile['status'], string> = {
    Pending: 'bg-yellow-100 text-yellow-700',
    Ongoing: 'bg-blue-100 text-blue-700',
    Approved: 'bg-green-100 text-green-700',
    Completed: 'bg-gray-100 text-gray-700',
    Rejected: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status]}`}>
      {status}
    </span>
  )
}

function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <p className="text-sm text-gray-700 mb-5">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700">Delete</button>
        </div>
      </div>
    </div>
  )
}

interface ActionMenuProps {
  profile: OFWProfile
  pos: { top: number; left: number }
  menuRef: React.RefObject<HTMLDivElement | null>
  onView: () => void
  onEdit: () => void
  onChangeStatus: (newStatus: OFWProfile['status']) => void
  onDelete: () => void
  onClose: () => void
}

function ActionMenu({ profile, pos, menuRef, onView, onEdit, onChangeStatus, onDelete, onClose }: ActionMenuProps) {
  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={menuRef}
        className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-52"
        style={{ top: pos.top, left: pos.left }}
      >
        <button onClick={() => { onView(); onClose() }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          View
        </button>
        <button onClick={() => { onEdit(); onClose() }} disabled={!canManage('ofw')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          Edit
        </button>
        {profile.status === 'Pending' && (
          <button onClick={() => { onChangeStatus('Approved'); onClose() }} disabled={!canManage('ofw')} className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">
            <CheckCircle className="w-4 h-4 text-blue-500" />
            Approve
          </button>
        )}
        {profile.status === 'Pending' && (
          <button onClick={() => { onChangeStatus('Rejected'); onClose() }} disabled={!canManage('ofw')} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">
            <XCircle className="w-4 h-4 text-red-500" />
            Reject
          </button>
        )}
        {profile.status === 'Approved' && (
          <button onClick={() => { onChangeStatus('Ongoing'); onClose() }} disabled={!canManage('ofw')} className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">
            <PlayCircle className="w-4 h-4 text-blue-500" />
            Start Processing
          </button>
        )}
        {profile.status === 'Ongoing' && (
          <button onClick={() => { onChangeStatus('Completed'); onClose() }} disabled={!canManage('ofw')} className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Mark as Completed
          </button>
        )}
        <div className="border-t border-gray-100 my-1" />
        <button onClick={() => { onDelete(); onClose() }} disabled={!canManage('ofw')} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          Delete
        </button>
      </div>
    </>,
    document.body
  )
}

export default function OFWView({ onBack }: OFWViewProps) {
  const { profiles, refreshProfiles } = useOFW()

  // View / edit / delete modals
  const [showAddForm, setShowAddForm] = useState(false)
  const [viewProfile, setViewProfile] = useState<OFWProfile | null>(null)
  const [editProfile, setEditProfile] = useState<OFWProfile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OFWProfile | null>(null)
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    profile: OFWProfile
    newStatus: OFWProfile['status']
    label: string
  } | null>(null)

  // Search & filter
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [sortOrder, setSortOrder] = useState<'firstName_asc' | 'firstName_desc' | 'lastName_asc' | 'lastName_desc' | ''>('')
  const [activeFilters, setActiveFilters] = useState<FilterKey[]>([])
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const filterDropdownRef = useRef<HTMLDivElement | null>(null)

  // Action menu (portal)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Export dropdown
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false)

  const closeMenu = useCallback(() => setOpenMenuId(null), [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) closeMenu()
    }
    if (openMenuId !== null) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [openMenuId, closeMenu])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) setShowFilterDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const addFilter = (key: FilterKey) => {
    if (!activeFilters.includes(key)) {
      setActiveFilters(prev => [...prev, key])
      setFilterValues(prev => ({ ...prev, [key]: '' }))
      setCurrentPage(1)
    }
    setShowFilterDropdown(false)
  }

  const removeFilter = (key: FilterKey) => {
    setActiveFilters(prev => prev.filter(k => k !== key))
    setFilterValues(prev => { const n = { ...prev }; delete n[key]; return n })
    setCurrentPage(1)
  }

  const openMenu = (e: React.MouseEvent<HTMLButtonElement>, id: number) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 208 })
    setOpenMenuId(prev => (prev === id ? null : id))
  }

  const nextRefNumber = `OFW-2026-${String(profiles.length + 1).padStart(5, '0')}`

  // ── Profile handlers ──────────────────────────────────────────
  const handleAddProfile = async (data: Omit<OFWProfile, 'id'>) => {
    try {
      await ofwService.createProfile(toApiPayload(data))
      await refreshProfiles()
      setShowAddForm(false)
      Swal.fire({ icon: 'success', title: 'Success', text: 'OFW profile has been added successfully.', confirmButtonColor: '#0077BE' })
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: errMsg(e, 'Failed to save profile.'), confirmButtonColor: '#0077BE' })
    }
  }

  const handleUpdateProfile = async (updated: OFWProfile) => {
    try {
      await ofwService.updateProfile(updated.id, toApiPayload(updated))
      await refreshProfiles()
      setEditProfile(null)
      setViewProfile(null)
      Swal.fire({ icon: 'success', title: 'Success', text: 'OFW profile has been updated successfully.', confirmButtonColor: '#0077BE' })
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: errMsg(e, 'Failed to update profile.'), confirmButtonColor: '#0077BE' })
    }
  }

  const handleDeleteProfile = async (id: number) => {
    try {
      await ofwService.deleteProfile(id)
      await refreshProfiles()
      setDeleteTarget(null)
    } catch (e) {
      setDeleteTarget(null)
      Swal.fire({ icon: 'error', title: 'Error', text: errMsg(e, 'Failed to delete profile.'), confirmButtonColor: '#0077BE' })
    }
  }

  const handleStatusChange = (profile: OFWProfile, newStatus: OFWProfile['status'], label: string) => {
    setPendingStatusChange({ profile, newStatus, label })
  }

  const confirmStatusChange = async () => {
    if (!pendingStatusChange) return
    const { profile, newStatus } = pendingStatusChange
    try {
      await ofwService.updateStatus(profile.id, newStatus)
      await refreshProfiles()
      setPendingStatusChange(null)
      Swal.fire({
        icon: newStatus === 'Rejected' ? 'error' : 'success',
        title: 'Status Updated',
        text: `${profile.name}'s request is now ${newStatus}.`,
        confirmButtonColor: '#0077BE',
        timer: 2000,
        timerProgressBar: true,
      })
    } catch (e) {
      setPendingStatusChange(null)
      Swal.fire({ icon: 'error', title: 'Error', text: errMsg(e, 'Failed to update status.'), confirmButtonColor: '#0077BE' })
    }
  }

  // ── Filtering ─────────────────────────────────────────────────
  const filtered = profiles.filter(p => {
    const q = searchTerm.toLowerCase()
    const matchSearch = !q || p.name.toLowerCase().includes(q) ||
      p.referenceNumber.toLowerCase().includes(q) ||
      p.contactNumber.includes(q) ||
      p.barangay.toLowerCase().includes(q)
    const matchFilters = activeFilters.every(key => {
      const val = filterValues[key]
      if (!val) return true
      switch (key) {
        case 'referenceNo':      return p.referenceNumber.toLowerCase().includes(val.toLowerCase())
        case 'dateFiled':        return p.dateFiled === val
        case 'status':           return p.status === val
        case 'employmentStatus': return p.employmentStatus === val
        case 'address':          return [p.address, p.barangay, p.municipality, p.province].join(' ').toLowerCase().includes(val.toLowerCase())
        case 'typeOfRequest':    return p.typeOfRequest.some(t => t.toLowerCase().includes(val.toLowerCase()))
        default:                 return true
      }
    })
    return matchSearch && matchFilters
  })

  const STATUS_ORDER: Record<string, number> = {
    Pending: 0, Approved: 1, Ongoing: 2, Completed: 3, Rejected: 4,
  }

  const sorted = [...filtered].sort((a, b) => {
    const statusDiff = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
    if (statusDiff !== 0) return statusDiff
    if (!sortOrder) return 0
    const parts = (n: string) => n.trim().split(/\s+/)
    const keyA = (sortOrder.startsWith('firstName') ? parts(a.name)[0] : parts(a.name).at(-1) ?? '').toLowerCase()
    const keyB = (sortOrder.startsWith('firstName') ? parts(b.name)[0] : parts(b.name).at(-1) ?? '').toLowerCase()
    return sortOrder.endsWith('asc') ? keyA.localeCompare(keyB) : keyB.localeCompare(keyA)
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = sorted.slice((safePage - 1) * perPage, safePage * perPage)
  const recordStart = sorted.length === 0 ? 0 : (safePage - 1) * perPage + 1
  const recordEnd = Math.min(safePage * perPage, sorted.length)

  // ── Export ────────────────────────────────────────────────────
  const exportToExcel = () => {
    const data = filtered.map(p => ({
      'Reference #': p.referenceNumber,
      'Name': p.name,
      'Contact Number': p.contactNumber,
      'Email': p.email,
      'Address': p.address,
      'Barangay': p.barangay,
      'Municipality': p.municipality,
      'Province': p.province,
      'Date Filed': p.dateFiled,
      'Employment Status': p.employmentStatus,
      'Type of Request': p.typeOfRequest.join(', '),
      'Status': p.status,
      'Remarks': p.remarks,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'OFW Profiles')
    XLSX.writeFile(wb, `OFW_Profiles_${new Date().toISOString().split('T')[0]}.xlsx`)
    setIsExportDropdownOpen(false)
  }

  const exportToCSV = () => {
    const data = filtered.map(p => ({
      'Reference #': p.referenceNumber,
      'Name': p.name,
      'Contact Number': p.contactNumber,
      'Barangay': p.barangay,
      'Date Filed': p.dateFiled,
      'Employment Status': p.employmentStatus,
      'Status': p.status,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `OFW_Profiles_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    setIsExportDropdownOpen(false)
  }

  // ── Early returns ─────────────────────────────────────────────
  if (showAddForm) {
    return (
      <AddOFWRequestForm
        onClose={() => setShowAddForm(false)}
        onSave={handleAddProfile}
        nextRefNumber={nextRefNumber}
      />
    )
  }

  if (viewProfile) {
    return (
      <OFWProfileModal
        profile={viewProfile}
        mode="view"
        onClose={() => setViewProfile(null)}
        onSave={handleUpdateProfile}
      />
    )
  }

  if (editProfile) {
    return (
      <OFWProfileModal
        profile={editProfile}
        mode="edit"
        onClose={() => setEditProfile(null)}
        onSave={handleUpdateProfile}
      />
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-brand-bg">
      <div className="w-full px-6 py-8">

        {/* Page title */}
        <div className="mb-6 flex items-center gap-4">
          <button onClick={onBack} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><ArrowLeft size={24} /></button>
          <p className="text-gray-800 font-bold" style={{ fontSize: 'var(--text-xl)' }}>OFW Services</p>
        </div>

        {/* Action buttons card */}
        <div className="bg-white rounded-xl shadow-md p-3 mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddForm(true)}
              disabled={!canManage('ofw')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue text-white rounded-md hover:bg-brand-blue-dark transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue"
            >
              <Plus size={16} /><span>Add Profile</span>
            </button>
            <div className="relative">
              <button
                onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-md transition-colors text-sm"
              >
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

        {/* Search + Filter + Table card */}
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex gap-3 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-blue placeholder:text-gray-400"
                placeholder="Search by name, reference no., contact number, barangay..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1) }}
              />
            </div>
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value as typeof sortOrder)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:border-brand-blue cursor-pointer"
            >
              <option value="" disabled>Sort By</option>
              <option value="firstName_asc">First Name ASC</option>
              <option value="firstName_desc">First Name DSC</option>
              <option value="lastName_asc">Last Name ASC</option>
              <option value="lastName_desc">Last Name DSC</option>
            </select>
            <div className="relative" ref={filterDropdownRef}>
              <button
                onClick={() => setShowFilterDropdown(v => !v)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors whitespace-nowrap text-sm text-gray-700"
              >
                <Plus size={16} /><span>Filter By</span><ChevronDown size={14} className="text-gray-500" />
              </button>
              {showFilterDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowFilterDropdown(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-[200px] overflow-hidden">
                    {FILTER_DEFS.map((def, i) => (
                      <button
                        key={def.key}
                        onClick={() => addFilter(def.key)}
                        className={`w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between ${i < FILTER_DEFS.length - 1 ? 'border-b border-gray-50' : ''}`}
                      >
                        <span>{def.label}</span>
                        {activeFilters.includes(def.key) && (
                          <span className="text-xs text-gray-400 ml-3">(Active)</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Active filter chips */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {activeFilters.map(key => {
                const def = FILTER_DEFS.find(f => f.key === key)!
                return (
                  <div key={key} className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-blue-50 border border-blue-200 rounded-full text-sm">
                    <span className="text-brand-blue font-semibold text-xs whitespace-nowrap">{def.label}:</span>
                    {def.type === 'text' && (
                      <input
                        className="bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400 w-32"
                        placeholder="Enter value..."
                        value={filterValues[key] ?? ''}
                        onChange={e => { setFilterValues(prev => ({ ...prev, [key]: e.target.value })); setCurrentPage(1) }}
                      />
                    )}
                    {def.type === 'date' && (
                      <DatePicker
                        className="bg-transparent text-sm text-gray-700 outline-none"
                        value={filterValues[key] ?? ''}
                        onChange={v => { setFilterValues(prev => ({ ...prev, [key]: v })); setCurrentPage(1) }}
                      />
                    )}
                    {def.type === 'select' && (
                      <select
                        className="bg-transparent text-sm text-gray-700 outline-none cursor-pointer pr-1"
                        value={filterValues[key] ?? ''}
                        onChange={e => { setFilterValues(prev => ({ ...prev, [key]: e.target.value })); setCurrentPage(1) }}
                      >
                        <option value="">Select...</option>
                        {def.options!.map(o => <option key={o}>{o}</option>)}
                      </select>
                    )}
                    <button
                      onClick={() => removeFilter(key)}
                      className="ml-0.5 p-0.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-blue-100 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}


          {sorted.length === 0 ? (
            <div className="text-center py-20">
              <Users size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600 text-lg">No profiles found</p>
              <p className="text-gray-400 text-sm mt-1">
                {profiles.length === 0 ? 'Click "Add Profile" to register the first OFW profile.' : 'Try adjusting your search or filters.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-brand-blue">
                    {['Reference No.', 'Name', 'Contact Number', 'Address', 'Date Filed', 'Employment Status', 'Type of Request', 'Status', 'Actions'].map(col => (
                      <th key={col} className="px-4 py-4 text-left text-white whitespace-nowrap">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(profile => (
                    <tr key={profile.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">{profile.referenceNumber}</td>
                      <td className="px-4 py-3 text-gray-800 whitespace-nowrap">{profile.name}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{profile.contactNumber}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[180px]">
                        <span className="block truncate" title={profile.barangay}>
                          {profile.barangay}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{profile.dateFiled}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{profile.employmentStatus}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[180px]">
                        <span className="block truncate" title={profile.typeOfRequest.join(', ')}>
                          {profile.typeOfRequest.join(', ') || '—'}
                        </span>
                        {/* Employment Referral sub-fields -- only shown when at least one is
                            filled in, so this stays blank for every other request type. */}
                        {(profile.desiredPosition || profile.typeOfSkill) && (
                          <span
                            className="block truncate text-xs text-gray-400 mt-0.5"
                            title={[profile.desiredPosition && `Position: ${profile.desiredPosition}`, profile.typeOfSkill && `Skill: ${profile.typeOfSkill}`].filter(Boolean).join(' • ')}
                          >
                            {[profile.desiredPosition, profile.typeOfSkill].filter(Boolean).join(' • ')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={profile.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={e => openMenu(e, profile.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {openMenuId === profile.id && (
                          <ActionMenu
                            profile={profile}
                            pos={menuPos}
                            menuRef={menuRef}
                            onView={() => setViewProfile(profile)}
                            onEdit={() => setEditProfile(profile)}
                            onChangeStatus={(newStatus) => {
                              const label = newStatus === 'Ongoing' ? 'Start Processing' : newStatus === 'Rejected' ? 'Reject' : `Mark as ${newStatus}`
                              handleStatusChange(profile, newStatus, label)
                            }}
                            onDelete={() => setDeleteTarget(profile)}
                            onClose={closeMenu}
                          />
                        )}
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

      {deleteTarget && (
        <ConfirmModal
          message={`Delete profile for "${deleteTarget.name}" (${deleteTarget.referenceNumber})? This action cannot be undone.`}
          onConfirm={() => handleDeleteProfile(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── Status change confirmation modal ────────────────────── */}
      {pendingStatusChange !== null && (() => {
        const { profile, newStatus, label } = pendingStatusChange
        const isRejected = newStatus === 'Rejected'
        const isCompleted = newStatus === 'Completed'
        const steps: OFWProfile['status'][] = isRejected
          ? ['Pending', 'Rejected']
          : ['Pending', 'Approved', 'Ongoing', 'Completed']
        const curIdx  = steps.indexOf(profile.status)
        const nextIdx = steps.indexOf(newStatus)
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2.5 rounded-full ${isCompleted ? 'bg-green-100' : isRejected ? 'bg-red-100' : 'bg-blue-100'}`}>
                  {isCompleted
                    ? <CheckCircle size={22} className="text-green-600" />
                    : isRejected
                    ? <XCircle     size={22} className="text-red-600" />
                    : <PlayCircle  size={22} className="text-brand-blue" />}
                </div>
                <h3 className="text-gray-800 m-0 text-lg">{label}</h3>
              </div>

              <div className="flex items-center gap-2 mb-5 bg-gray-50 rounded-xl px-4 py-3">
                {steps.map((s, i) => {
                  const isCur  = s === profile.status
                  const isNext = s === newStatus
                  const isPast = i < Math.min(curIdx, nextIdx)
                  const dotCls = isPast || isCur
                    ? 'bg-blue-500'
                    : isNext
                    ? (isCompleted ? 'bg-green-500 ring-2 ring-green-200' : isRejected ? 'bg-red-500 ring-2 ring-red-200' : 'bg-brand-blue ring-2 ring-blue-200')
                    : 'bg-gray-200'
                  const lblCls = isNext
                    ? (isCompleted ? 'text-green-600 font-semibold' : isRejected ? 'text-red-600 font-semibold' : 'text-brand-blue font-semibold')
                    : isCur ? 'text-blue-500 font-semibold'
                    : isPast ? 'text-gray-400'
                    : 'text-gray-300'
                  return (
                    <div key={s} className="flex items-center gap-2 flex-1">
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <div className={`w-3 h-3 rounded-full transition-all ${dotCls}`} />
                        <span className={`text-xs whitespace-nowrap ${lblCls}`}>{s}</span>
                      </div>
                      {i < steps.length - 1 && (
                        <div className={`h-0.5 flex-1 mb-4 ${i < Math.max(curIdx, nextIdx) ? (isRejected ? 'bg-red-300' : 'bg-blue-400') : 'bg-gray-200'}`} />
                      )}
                    </div>
                  )
                })}
              </div>

              <p className="text-gray-600 text-sm mb-6">
                Change <span className="font-medium text-gray-800">{profile.name}</span> ({profile.referenceNumber}) status from{' '}
                <span className="font-medium text-blue-500">{profile.status}</span> to{' '}
                <span className={`font-medium ${isCompleted ? 'text-green-600' : isRejected ? 'text-red-600' : 'text-brand-blue'}`}>{newStatus}</span>?
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setPendingStatusChange(null)}
                  className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmStatusChange}
                  className={`px-5 py-2 text-white rounded-lg transition-colors text-sm ${
                    isCompleted ? 'bg-green-600 hover:bg-green-700' : isRejected ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-blue hover:bg-brand-blue-dark'
                  }`}
                >
                  {label}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
