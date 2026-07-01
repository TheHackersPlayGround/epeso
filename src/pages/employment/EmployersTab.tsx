import { useState, useMemo, useEffect } from 'react'
import Swal from 'sweetalert2'
import { Search, Plus, ChevronDown, X, MoreHorizontal } from 'lucide-react'
import * as XLSX from 'xlsx'
import type { Employer } from '../../contexts/EmploymentContext'
import { canManage } from '../../utils/permissions'
import { listEmployers, createEmployer, updateEmployer, deleteEmployer } from '../../services/employerService'
import { downloadImportTemplate, importEmployers, type ImportResult } from './employerImport'
import AddEmployerSidebar from './AddEmployerSidebar'
import EditEmployerSidebar from './EditEmployerSidebar'
import ViewEmployerSidebar from './ViewEmployerSidebar'
import TablePagination, { EF_ITEMS_PER_PAGE } from './TablePagination'

// ─── Filter options ────────────────────────────────────────────────────────────

type FilterOption = { id: string; label: string; options: string[] }

const STATIC_FILTERS: FilterOption[] = [
  { id: 'industry', label: 'Industry', options: ['Manufacturing', 'Information Technology', 'Agriculture', 'Retail', 'Healthcare', 'Education', 'Construction', 'Hospitality', 'Transportation', 'Financial Services', 'Other'] },
  { id: 'companySize', label: 'Company Size', options: ['Small (1-50 employees)', 'Medium (51-200 employees)', 'Large (201+ employees)'] },
  { id: 'businessType', label: 'Business Type', options: ['Corporation', 'Partnership', 'Sole Proprietorship', 'Cooperative'] },
  { id: 'status', label: 'Status', options: ['Active', 'Inactive'] },
]

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmployersEmptyState({ isFiltered }: { isFiltered: boolean }) {
  return (
    <tr>
      <td colSpan={100} className="py-16 text-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          {isFiltered ? (
            <>
              <p className="text-base font-medium text-gray-500">No employers match your filters</p>
              <p className="text-sm">Try adjusting your search or removing some filters.</p>
            </>
          ) : (
            <>
              <p className="text-base font-medium text-gray-500">No employers yet</p>
              <p className="text-sm">Add an employer to get started.</p>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

// ─── Table ─────────────────────────────────────────────────────────────────────

type EmployersTableProps = {
  employers: Employer[]
  activeFilters: string[]
  isFiltered: boolean
  onView: (e: Employer) => void
  onEdit: (e: Employer) => void
  onDelete: (id: number) => void
}

function EmployersTable({ employers, activeFilters, isFiltered, onView, onEdit, onDelete }: EmployersTableProps) {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)

  function handleToggleMenu(e: React.MouseEvent, id: number) {
    if (openMenuId === id) {
      setOpenMenuId(null)
      return
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const menuHeight = 110
    const margin = 8
    const spaceBelow = window.innerHeight - rect.bottom
    let top = spaceBelow < menuHeight + margin ? rect.top - menuHeight - 4 : rect.bottom + 4
    // Clamp so the menu is never cut off by the top or bottom edge of the viewport.
    top = Math.max(margin, Math.min(top, window.innerHeight - menuHeight - margin))
    setMenuPos({ top, right: window.innerWidth - rect.right })
    setOpenMenuId(id)
  }

  function closeMenu() { setOpenMenuId(null) }

  const menuEmployer = employers.find(e => e.id === openMenuId) ?? null

  const showCompanySize = activeFilters.includes('companySize')
  const showIndustry = activeFilters.includes('industry')
  const showBusinessType = activeFilters.includes('businessType')
  const showStatus = activeFilters.includes('status')

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-blue">
              <th className="px-4 py-3 text-left text-white whitespace-nowrap">Company Name</th>
              {showIndustry && <th className="px-4 py-3 text-left text-white whitespace-nowrap">Industry</th>}
              <th className="px-4 py-3 text-left text-white whitespace-nowrap">Contact Person</th>
              <th className="px-4 py-3 text-left text-white whitespace-nowrap">Email</th>
              {showCompanySize && <th className="px-4 py-3 text-left text-white whitespace-nowrap">Company Size</th>}
              {showBusinessType && <th className="px-4 py-3 text-left text-white whitespace-nowrap">Business Type</th>}
              {showStatus && <th className="px-4 py-3 text-left text-white whitespace-nowrap">Status</th>}
              <th className="px-4 py-3 text-left text-white whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employers.length === 0 ? (
              <EmployersEmptyState isFiltered={isFiltered} />
            ) : (
              employers.map(employer => (
                <tr key={employer.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">{employer.companyName}</td>
                  {showIndustry && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{employer.industry}</td>}
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{employer.contactPersonName}</td>
                  <td className="px-4 py-3 text-gray-600">{employer.email}</td>
                  {showCompanySize && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{employer.companySize}</td>}
                  {showBusinessType && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{employer.businessType}</td>}
                  {showStatus && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        employer.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {employer.status}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={e => handleToggleMenu(e, employer.id)}
                      aria-label={`Actions for ${employer.companyName}`}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {openMenuId !== null && menuPos && menuEmployer && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeMenu} />
          <div
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, maxHeight: 'calc(100vh - 16px)' }}
            className="w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1 overflow-y-auto"
          >
            <button onClick={() => { onView(menuEmployer); closeMenu() }}
              className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">View</button>
            <button onClick={() => { onEdit(menuEmployer); closeMenu() }} disabled={!canManage('employment')}
              className="w-full px-3 py-2 text-left text-xs text-brand-blue hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Edit</button>
            <button onClick={() => { onDelete(menuEmployer.id); closeMenu() }} disabled={!canManage('employment')}
              className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Delete</button>
          </div>
        </>
      )}
    </>
  )
}

// ─── Filter badges ─────────────────────────────────────────────────────────────

type FilterBadgesProps = {
  activeFilters: string[]
  filterValues: Record<string, string>
  availableFilters: FilterOption[]
  onFilterValueChange: (id: string, value: string) => void
  onRemoveFilter: (id: string) => void
}

function EmployersFilterBadges({ activeFilters, filterValues, availableFilters, onFilterValueChange, onRemoveFilter }: FilterBadgesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {activeFilters.map(filterId => {
        const filter = availableFilters.find(f => f.id === filterId)
        return (
          <div key={filterId} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
            <span className="text-sm text-blue-700 font-medium whitespace-nowrap">{filter?.label ?? filterId}:</span>
            <select
              value={filterValues[filterId] ?? ''}
              onChange={e => onFilterValueChange(filterId, e.target.value)}
              className="text-sm bg-transparent border-none focus:outline-none text-blue-700 font-medium pr-1 cursor-pointer"
              onClick={e => e.stopPropagation()}
            >
              <option value="">All</option>
              {(filter?.options ?? []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <button onClick={() => onRemoveFilter(filterId)} className="text-blue-700 hover:text-blue-900 transition-colors">
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── Search bar ────────────────────────────────────────────────────────────────

type SearchBarProps = {
  searchQuery: string
  activeFilters: string[]
  availableFilters: FilterOption[]
  isFilterDropdownOpen: boolean
  onSearchChange: (v: string) => void
  onToggleFilterDropdown: () => void
  onAddFilter: (id: string) => void
  onCloseFilterDropdown: () => void
}

function EmployersSearchBar({ searchQuery, activeFilters, availableFilters, isFilterDropdownOpen, onSearchChange, onToggleFilterDropdown, onAddFilter, onCloseFilterDropdown }: SearchBarProps) {
  const unselected = availableFilters.filter(f => !activeFilters.includes(f.id))

  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative flex-1 min-w-48">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search by company name or contact person..."
          aria-label="Search employers"
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-brand-blue placeholder:text-gray-400"
        />
      </div>
      <div className="relative">
        <button
          onClick={onToggleFilterDropdown}
          aria-expanded={isFilterDropdownOpen}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors whitespace-nowrap text-sm text-gray-700"
        >
          <Plus size={16} />
          Filter By
          <ChevronDown size={14} className="text-gray-500" />
        </button>
        {isFilterDropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" aria-hidden="true" onClick={onCloseFilterDropdown} />
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
              {unselected.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400 italic">All filters applied</p>
              ) : (
                unselected.map(filter => (
                  <button key={filter.id} onClick={() => onAddFilter(filter.id)}
                    className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0">
                    {filter.label}
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Toolbar ───────────────────────────────────────────────────────────────────

type ToolbarProps = {
  onAdd: () => void
  onImport: () => void
  isExportOpen: boolean
  onToggleExport: () => void
  onCloseExport: () => void
  onExportExcel: () => void
  onExportCsv: () => void
}

function EmployersToolbar({ onAdd, onImport, isExportOpen, onToggleExport, onCloseExport, onExportExcel, onExportCsv }: ToolbarProps) {
  return (
    <div className="flex gap-2">
      <button onClick={onAdd} disabled={!canManage('employment')}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue text-white rounded-md hover:bg-brand-blue-dark transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue">
        <Plus size={16} />
        Add Employer
      </button>
      <button onClick={onImport} disabled={!canManage('employment')}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-md transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M8 12l4 4m0 0l4-4m-4 4V4" />
        </svg>
        Import
      </button>
      <div className="relative">
        <button onClick={onToggleExport} aria-expanded={isExportOpen}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-md transition-colors text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M8 8l4-4m0 0l4 4m-4-4v12" />
          </svg>
          Export
          <ChevronDown size={14} />
        </button>
        {isExportOpen && (
          <>
            <div className="fixed inset-0 z-10" aria-hidden="true" onClick={onCloseExport} />
            <ul role="menu" className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[170px] py-1">
              <li role="menuitem">
                <button onClick={onExportExcel} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-brand-blue transition-colors">
                  Export as Excel
                </button>
              </li>
              <li role="menuitem">
                <button onClick={onExportCsv} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-brand-blue transition-colors">
                  Export as CSV
                </button>
              </li>
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Import modal ──────────────────────────────────────────────────────────────

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
        <p className="text-sm text-gray-500 text-center">No employer rows were found in the file.</p>
      ) : result.failed.length === 0 ? (
        <p className="text-sm text-green-700 text-center">All {result.succeeded} employer{result.succeeded !== 1 ? 's' : ''} imported successfully.</p>
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

function EmployerImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
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
      const res = await importEmployers(file, (done, total) => setProgress({ done, total }))
      setResult(res)
      if (res.succeeded > 0) onImported()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the file. Make sure it's a valid .xlsx or .csv.")
    } finally {
      setIsImporting(false)
      setProgress(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Import Employers</h3>
          <button onClick={onClose} aria-label="Close import modal" className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
        </div>

        <div className="overflow-y-auto">
          {result ? (
            <ImportResultView result={result} />
          ) : (
            <>
              <label className={`block border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${file ? 'border-brand-blue bg-blue-50' : 'border-gray-300 text-gray-400 hover:border-brand-blue'}`}>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  disabled={isImporting}
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-3xl mb-2">📂</p>
                {file ? (
                  <p className="text-sm font-medium text-brand-blue break-all">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-600">Click to upload or drag & drop</p>
                    <p className="text-xs mt-1">Excel (.xlsx) or CSV files</p>
                  </>
                )}
              </label>

              <p className="text-xs text-gray-400 mt-3 text-center">
                Download the{' '}
                <button type="button" onClick={() => { void downloadImportTemplate() }} className="text-brand-blue cursor-pointer hover:underline">
                  template file
                </button>{' '}
                to ensure correct column format.
              </p>

              {error && <p className="text-red-500 text-sm mt-3 text-center">{error}</p>}

              {isImporting && progress && (
                <p className="text-sm text-gray-600 mt-3 text-center">
                  Importing {progress.done} of {progress.total}…
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 mt-5">
          {result ? (
            <button onClick={onClose} className="flex-1 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark transition-colors">Done</button>
          ) : (
            <>
              <button onClick={onClose} disabled={isImporting} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={handleImport} disabled={!file || isImporting} className="flex-1 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {isImporting ? 'Importing…' : 'Import'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── EmployersTab ──────────────────────────────────────────────────────────────

export default function EmployersTab() {
  const [employers, setEmployers] = useState<Employer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedEmployer, setSelectedEmployer] = useState<Employer | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [sidebarMode, setSidebarMode] = useState<'view' | 'edit' | null>(null)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  const availableFilters = STATIC_FILTERS

  useEffect(() => {
    listEmployers()
      .then(setEmployers)
      .catch(() => Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load employers.' }))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return employers.filter(e => {
      if (q && !e.companyName.toLowerCase().includes(q) && !e.contactPersonName.toLowerCase().includes(q)) return false
      for (const filterId of activeFilters) {
        const val = filterValues[filterId]
        if (!val) continue
        if (filterId === 'status' && e.status !== val) return false
        if (filterId === 'industry' && e.industry !== val) return false
        if (filterId === 'companySize' && e.companySize !== val) return false
        if (filterId === 'businessType' && e.businessType !== val) return false
      }
      return true
    })
  }, [employers, searchQuery, activeFilters, filterValues])

  // Reset to page 1 when the filtered set changes; clamp if it shrinks.
  const totalPages = Math.max(1, Math.ceil(filtered.length / EF_ITEMS_PER_PAGE))
  useEffect(() => { setCurrentPage(1) }, [searchQuery, activeFilters, filterValues])
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages) }, [currentPage, totalPages])
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * EF_ITEMS_PER_PAGE, currentPage * EF_ITEMS_PER_PAGE),
    [filtered, currentPage],
  )

  // Persist + refresh; the AddEmployerSidebar shows the success alert then closes
  // itself via onClose, and surfaces any thrown error in its own catch.
  async function handleAdd(data: Omit<Employer, 'id'>) {
    await createEmployer(data)
    const fresh = await listEmployers()
    setEmployers(fresh)
  }

  async function handleEdit(data: Omit<Employer, 'id'>) {
    if (!selectedEmployer) return
    try {
      await updateEmployer(selectedEmployer.id, data)
      const fresh = await listEmployers()
      setEmployers(fresh)
      setSelectedEmployer(null)
      setSidebarMode(null)
      Swal.fire({
        icon: 'success',
        title: 'Changes Saved!',
        text: 'Employer information has been successfully updated.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#0077BE',
      })
    } catch (err: unknown) {
      // axiosClient's interceptor flattens backend errors into Error.message.
      const msg = err instanceof Error && err.message ? err.message : 'Failed to update employer.'
      Swal.fire({ icon: 'error', title: 'Error', text: msg })
    }
  }

  async function handleDelete(id: number) {
    const result = await Swal.fire({
      title: 'Delete Employer?',
      text: 'Are you sure you want to delete this employer? This will move the employer to the recycle bin.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
    })
    if (!result.isConfirmed) return
    try {
      await deleteEmployer(id)
      setEmployers(prev => prev.filter(e => e.id !== id))
    } catch (err: unknown) {
      // axiosClient's interceptor flattens backend errors into Error.message.
      const msg = err instanceof Error && err.message ? err.message : 'Failed to delete employer.'
      Swal.fire({ icon: 'error', title: 'Error', text: msg })
    }
  }

  function openView(employer: Employer) {
    setSelectedEmployer(employer)
    setSidebarMode('view')
  }

  function openEdit(employer: Employer) {
    setSelectedEmployer(employer)
    setSidebarMode('edit')
  }

  function closeSidebar() {
    setSelectedEmployer(null)
    setSidebarMode(null)
  }

  const isFiltered = searchQuery.trim().length > 0 || activeFilters.some(f => filterValues[f])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
        Loading employers…
      </div>
    )
  }

  if (showAdd) {
    return (
      <AddEmployerSidebar
        onSave={data => handleAdd(data as Omit<Employer, 'id'>)}
        onClose={() => setShowAdd(false)}
      />
    )
  }

  if (selectedEmployer && sidebarMode === 'view') {
    return (
      <ViewEmployerSidebar data={selectedEmployer} onClose={closeSidebar} />
    )
  }

  if (selectedEmployer && sidebarMode === 'edit') {
    return (
      <EditEmployerSidebar
        initialData={selectedEmployer}
        onSave={data => handleEdit(data as Omit<Employer, 'id'>)}
        onClose={closeSidebar}
      />
    )
  }

  function handleExportExcel() {
    const rows = filtered.map(e => ({
      'Company Name': e.companyName,
      'Industry': e.industry === 'Other' ? `Other - ${e.industryOther}` : e.industry,
      'Company Size': e.companySize,
      'Business Type': e.businessType,
      'Years in Operation': e.yearsInOperation,
      'TIN Number': e.tinNumber,
      'Contact Person': e.contactPersonName,
      'Position': e.position,
      'Contact Number': e.contactNumber,
      'Email': e.email,
      'Address': [e.buildingNo, e.street, e.barangay, e.city, e.province, e.region].filter(Boolean).join(', '),
      'Status': e.status,
      'Date Registered': e.dateRegistered,
      'Remarks': e.remarks,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Employers')
    XLSX.writeFile(wb, 'employers.xlsx')
    setIsExportOpen(false)
  }

  function handleExportCsv() {
    const rows = filtered.map(e => ({
      'Company Name': e.companyName,
      'Industry': e.industry === 'Other' ? `Other - ${e.industryOther}` : e.industry,
      'Company Size': e.companySize,
      'Business Type': e.businessType,
      'Years in Operation': e.yearsInOperation,
      'TIN Number': e.tinNumber,
      'Contact Person': e.contactPersonName,
      'Position': e.position,
      'Contact Number': e.contactNumber,
      'Email': e.email,
      'Address': [e.buildingNo, e.street, e.barangay, e.city, e.province, e.region].filter(Boolean).join(', '),
      'Status': e.status,
      'Date Registered': e.dateRegistered,
      'Remarks': e.remarks,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'employers.csv'
    link.click()
    URL.revokeObjectURL(url)
    setIsExportOpen(false)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl shadow-md p-3">
        <EmployersToolbar
          onAdd={() => setShowAdd(true)}
          onImport={() => setIsImportModalOpen(true)}
          isExportOpen={isExportOpen}
          onToggleExport={() => setIsExportOpen(p => !p)}
          onCloseExport={() => setIsExportOpen(false)}
          onExportExcel={handleExportExcel}
          onExportCsv={handleExportCsv}
        />
      </div>

      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="mb-4">
          <EmployersSearchBar
            searchQuery={searchQuery}
            activeFilters={activeFilters}
            availableFilters={availableFilters}
            isFilterDropdownOpen={isFilterDropdownOpen}
            onSearchChange={setSearchQuery}
            onToggleFilterDropdown={() => setIsFilterDropdownOpen(p => !p)}
            onAddFilter={id => { setActiveFilters(prev => [...prev, id]); setIsFilterDropdownOpen(false) }}
            onCloseFilterDropdown={() => setIsFilterDropdownOpen(false)}
          />
          {activeFilters.length > 0 && (
            <div className="mt-3">
              <EmployersFilterBadges
                activeFilters={activeFilters}
                filterValues={filterValues}
                availableFilters={availableFilters}
                onFilterValueChange={(id, val) => setFilterValues(prev => ({ ...prev, [id]: val }))}
                onRemoveFilter={id => {
                  setActiveFilters(prev => prev.filter(f => f !== id))
                  setFilterValues(prev => { const n = { ...prev }; delete n[id]; return n })
                }}
              />
            </div>
          )}
        </div>
        <EmployersTable
          employers={paginated}
          activeFilters={activeFilters}
          isFiltered={isFiltered}
          onView={openView}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
        <TablePagination
          currentPage={currentPage}
          totalItems={filtered.length}
          onPageChange={setCurrentPage}
          itemLabel="employer"
        />
      </div>

      {isImportModalOpen && (
        <EmployerImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImported={() => {
            listEmployers().then(setEmployers).catch(() => {})
          }}
        />
      )}
    </div>
  )
}
