import { useState, useRef, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { ArrowLeft, Plus, Upload, Download, ChevronDown, X, Search, Users, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import * as XLSX from 'xlsx'
import type { OFWProfile } from '../../contexts/OFWContext'
import { useOFW } from '../../contexts/OFWContext'
import AddOFWRequestForm from './AddOFWRequestForm'
import OFWProfileModal from './OFWProfileModal'

interface OFWViewProps {
  onBack: () => void
}

type FilterKey = 'referenceNo' | 'dateFiled' | 'status' | 'employmentStatus' | 'address' | 'typeOfRequest'

const FILTER_DEFS: { key: FilterKey; label: string; type: 'text' | 'date' | 'select'; options?: string[] }[] = [
  { key: 'referenceNo',      label: 'Reference No.',      type: 'text' },
  { key: 'dateFiled',        label: 'Date Filed',          type: 'date' },
  { key: 'status',           label: 'Status',              type: 'select', options: ['Pending', 'Ongoing', 'Approved', 'Completed', 'Rejected'] },
  { key: 'employmentStatus', label: 'Employment Status',   type: 'select', options: ['employed', 'self-employed', 'unemployed', 'underemployed'] },
  { key: 'address',          label: 'Address',             type: 'text' },
  { key: 'typeOfRequest',    label: 'Type of Request',     type: 'select', options: [
    'employment referral',
    'skills training',
    'on-line services',
    'registration',
    'accreditation',
    'annual report repatriation',
    'OWWA Scholarship – ODSP/EDSP',
    'OWWA Benefits',
    'OWWA Welfare Case',
    'inquiry (pls specify)',
    'application letter and resume-making',
    're-integration program for OFWs',
    'free clearance for 1st-time jobseekers',
    'labor Market Information (LMI)',
    'livelihood',
    'Job Vacancy for posting',
    'other DOLE program (please specify)',
  ]},
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
  onStartProcessing: () => void
  onMarkCompleted: () => void
  onDelete: () => void
  onClose: () => void
}

function ActionMenu({ profile, pos, menuRef, onView, onEdit, onStartProcessing, onMarkCompleted, onDelete, onClose }: ActionMenuProps) {
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
        <button onClick={() => { onEdit(); onClose() }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          Edit
        </button>
        {profile.status === 'Pending' && (
          <button onClick={() => { onStartProcessing(); onClose() }} className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Start Processing
          </button>
        )}
        {profile.status === 'Ongoing' && (
          <button onClick={() => { onMarkCompleted(); onClose() }} className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Mark as Completed
          </button>
        )}
        <div className="border-t border-gray-100 my-1" />
        <button onClick={() => { onDelete(); onClose() }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          Delete
        </button>
      </div>
    </>,
    document.body
  )
}

export default function OFWView({ onBack }: OFWViewProps) {
  const { profiles, setProfiles } = useOFW()

  // View / edit / delete modals
  const [showAddForm, setShowAddForm] = useState(false)
  const [viewProfile, setViewProfile] = useState<OFWProfile | null>(null)
  const [editProfile, setEditProfile] = useState<OFWProfile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OFWProfile | null>(null)

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

  // Import modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<{ refNo: string; name: string; employment: string; status: string; valid: boolean }[]>([])
  const [importAllRows, setImportAllRows] = useState<Record<string, string>[]>([])

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
      const def = FILTER_DEFS.find(f => f.key === key)!
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
  const handleAddProfile = (data: Omit<OFWProfile, 'id'>) => {
    setProfiles(prev => [{ id: Date.now(), ...data }, ...prev])
    setShowAddForm(false)
  }

  const handleUpdateProfile = (updated: OFWProfile) => {
    setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p))
    setEditProfile(null)
    setViewProfile(null)
  }

  const handleDeleteProfile = (id: number) => {
    setProfiles(prev => prev.filter(p => p.id !== id))
    setDeleteTarget(null)
  }

  const handleStatusChange = (id: number, status: OFWProfile['status']) => {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, status } : p))
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

  const sorted = [...filtered].sort((a, b) => {
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

  // ── Import ────────────────────────────────────────────────────
  const handleFileUpload = (file: File) => {
    setUploadedFile(file)
    const reader = new FileReader()
    reader.onload = e => {
      const data = e.target?.result
      const wb = XLSX.read(data, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws) as Record<string, string>[]
      setImportAllRows(rows)
      setImportPreview(rows.slice(0, 5).map(r => ({
        refNo: r['Reference #'] || '',
        name: r['Name'] || '',
        employment: r['Employment Status'] || '',
        status: r['Status'] || '',
        valid: !!(r['Name']),
      })))
    }
    reader.readAsBinaryString(file)
  }

  const closeImportModal = () => {
    setIsImportModalOpen(false)
    setUploadedFile(null)
    setImportPreview([])
    setImportAllRows([])
  }

  const handleImport = () => {
    const newProfiles: OFWProfile[] = importAllRows
      .filter(r => r['Name'])
      .map((r, i) => ({
        id: Date.now() + i,
        referenceNumber: r['Reference #'] || `OFW-2026-${String(profiles.length + i + 1).padStart(5, '0')}`,
        name: r['Name'] || '',
        contactNumber: r['Contact Number'] || '',
        email: r['Email'] || '',
        address: r['Address'] || '',
        barangay: r['Barangay'] || '',
        municipality: r['Municipality'] || 'Tangub City',
        province: r['Province'] || 'Misamis Occidental',
        dateFiled: r['Date Filed'] || new Date().toISOString().split('T')[0],
        employmentStatus: r['Employment Status'] || '',
        typeOfRequest: r['Type of Request'] ? r['Type of Request'].split(', ') : [],
        status: (r['Status'] as OFWProfile['status']) || 'Pending',
        remarks: r['Remarks'] || '',
      }))
    setProfiles(prev => [...newProfiles, ...prev])
    closeImportModal()
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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue text-white rounded-md hover:bg-brand-blue-dark transition-colors text-sm"
            >
              <Plus size={16} /><span>Add Profile</span>
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-md transition-colors text-sm"
            >
              <Upload size={16} /><span>Import</span>
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
                      <input
                        type="date"
                        className="bg-transparent text-sm text-gray-700 outline-none"
                        value={filterValues[key] ?? ''}
                        onChange={e => { setFilterValues(prev => ({ ...prev, [key]: e.target.value })); setCurrentPage(1) }}
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
                        <span className="block truncate" title={[profile.address, profile.barangay].filter(Boolean).join(', ')}>
                          {[profile.barangay, profile.municipality].filter(Boolean).join(', ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{profile.dateFiled}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{profile.employmentStatus}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[180px]">
                        <span className="block truncate" title={profile.typeOfRequest.join(', ')}>
                          {profile.typeOfRequest.join(', ') || '—'}
                        </span>
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
                            onStartProcessing={() => handleStatusChange(profile.id, 'Ongoing')}
                            onMarkCompleted={() => handleStatusChange(profile.id, 'Completed')}
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

      {/* ── Import modal ────────────────────────────────────────── */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-gray-800 font-semibold">Import OFW Profiles</h3>
              <button onClick={closeImportModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-brand-blue hover:bg-blue-50 transition-colors"
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f) }}
                onClick={() => document.getElementById('ofw-file-input')?.click()}
              >
                <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">Drop your Excel or CSV file here</p>
                <p className="text-xs text-gray-400 mt-1">or click to browse</p>
                <input
                  id="ofw-file-input"
                  type="file"
                  accept=".xlsx,.csv"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
                />
              </div>
              {uploadedFile && importPreview.length > 0 && (
                <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-600">Reference #</th>
                        <th className="px-3 py-2 text-left text-gray-600">Name</th>
                        <th className="px-3 py-2 text-left text-gray-600">Employment</th>
                        <th className="px-3 py-2 text-left text-gray-600">Valid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((r, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-3 py-2 text-gray-700">{r.refNo || '—'}</td>
                          <td className="px-3 py-2 text-gray-700">{r.name}</td>
                          <td className="px-3 py-2 text-gray-700">{r.employment || '—'}</td>
                          <td className="px-3 py-2">{r.valid ? <span className="text-green-600">✓</span> : <span className="text-red-500">✗</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {uploadedFile && <p className="px-3 py-2 text-gray-400 border-t border-gray-100">Showing first 5 rows · {uploadedFile.name}</p>}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={closeImportModal} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button
                disabled={!uploadedFile}
                onClick={handleImport}
                className="flex-1 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark disabled:opacity-40 transition-colors"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

