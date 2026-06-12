import { useState, useRef, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { Upload, Download, ChevronDown, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import type { OFWProfile } from '../../contexts/OFWContext'
import { useOFW } from '../../contexts/OFWContext'
import AddOFWRequestForm from './AddOFWRequestForm'
import OFWProfileModal from './OFWProfileModal'

interface OFWViewProps {
  onBack: () => void
}

type StatusFilter = 'All' | OFWProfile['status']

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [employmentFilter, setEmploymentFilter] = useState('All')
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const filterRef = useRef<HTMLDivElement | null>(null)

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
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilterMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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
    const matchStatus = statusFilter === 'All' || p.status === statusFilter
    const matchEmployment = employmentFilter === 'All' || p.employmentStatus === employmentFilter
    return matchSearch && matchStatus && matchEmployment
  })

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

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Page title */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <p className="text-gray-800 font-bold" style={{ fontSize: 'var(--text-xl)' }}>OFW Services</p>
        </div>

        {/* Toolbar card */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-4">
          {/* Action buttons */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#0077BE] text-white rounded-lg hover:bg-[#0065A5] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Profile</span>
            </button>

            {/* Import */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg transition-colors"
            >
              <Upload size={20} /><span>Import</span>
            </button>

            {/* Export dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg transition-colors"
              >
                <Download size={20} /><span>Export</span><ChevronDown size={16} />
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

          {/* Search + Filter By */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#0077BE] placeholder:text-gray-400"
                placeholder="Search by name, reference no., contact number, barangay..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter By dropdown */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setShowFilterMenu(v => !v)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors whitespace-nowrap text-sm text-gray-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Filter By</span>
                <ChevronDown size={14} className="text-gray-500" />
              </button>
              {showFilterMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowFilterMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-60 z-50">
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Status</p>
                      {(['All', 'Pending', 'Ongoing', 'Approved', 'Completed', 'Rejected'] as const).map(s => (
                        <label key={s} className="flex items-center gap-2 py-1 text-sm text-gray-700 cursor-pointer hover:text-gray-900">
                          <input type="radio" name="ofw-status-filter" checked={statusFilter === s} onChange={() => setStatusFilter(s)} className="accent-[#0077BE]" />
                          {s}
                        </label>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Employment Status</p>
                      {(['All', 'Employed Abroad', 'Unemployed', 'Repatriated', 'Distressed'] as const).map(s => (
                        <label key={s} className="flex items-center gap-2 py-1 text-sm text-gray-700 cursor-pointer hover:text-gray-900">
                          <input type="radio" name="ofw-employment-filter" checked={employmentFilter === s} onChange={() => setEmploymentFilter(s)} className="accent-[#0077BE]" />
                          {s}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  {['Reference No.', 'Name', 'Contact Number', 'Address', 'Date Filed', 'Employment Status', 'Type of Request', 'Status', 'Actions'].map(col => (
                    <th key={col} className="px-4 py-3 text-left text-sm font-bold text-gray-700 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm">No records found.</td>
                  </tr>
                ) : filtered.map(profile => (
                  <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
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
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
                        </svg>
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
          </div>
        </div>
      </div>

      {/* ── View / Edit modals ──────────────────────────────────── */}
      {viewProfile && (
        <OFWProfileModal profile={viewProfile} mode="view" onClose={() => setViewProfile(null)} onSave={handleUpdateProfile} />
      )}
      {editProfile && (
        <OFWProfileModal profile={editProfile} mode="edit" onClose={() => setEditProfile(null)} onSave={handleUpdateProfile} />
      )}
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
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-[#0077BE] hover:bg-blue-50 transition-colors"
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
                className="flex-1 py-2 bg-[#0077BE] text-white rounded-lg text-sm hover:bg-[#0065A5] disabled:opacity-40 transition-colors"
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
