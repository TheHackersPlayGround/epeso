import { useState, useEffect, useMemo } from 'react'
import { Search, Plus, ChevronDown, X, Download, MoreHorizontal } from 'lucide-react'
import Swal from 'sweetalert2'
import type { Referral } from '../../contexts/EmploymentContext'
import { listReferrals, updateReferralStatus, deleteReferral } from '../../services/referralService'
import * as XLSX from 'xlsx'
import TablePagination, { EF_ITEMS_PER_PAGE } from './TablePagination'

// ── Filter config ─────────────────────────────────────────────────────────────

type FilterOption = { id: string; label: string; options: string[] }
type SortOrder = 'firstName_asc' | 'firstName_desc' | 'lastName_asc' | 'lastName_desc' | ''

// 'Hired' triggers placement creation rather than just updating referral status
type ReferralStatusOption = Referral['status'] | 'Hired'
const STATUS_OPTIONS: ReferralStatusOption[] = ['Pending', 'Interviewed', 'Not Hired', 'Hired']
const FILTER_STATUS_OPTIONS: Referral['status'][] = ['Pending', 'Interviewed', 'Not Hired']

// ── Status Badge ──────────────────────────────────────────────────────────────

function ReferralStatusBadge({ status }: { status: Referral['status'] }) {
  if (status === 'Interviewed') {
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Interviewed</span>
  }
  if (status === 'Not Hired') {
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">Not Hired</span>
  }
  return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span>
}

// ── Search Bar (with Export) ──────────────────────────────────────────────────

type ReferralsSearchBarProps = {
  searchQuery: string
  activeFilters: string[]
  isFilterOpen: boolean
  availableFilters: FilterOption[]
  sortOrder: SortOrder
  onSearchChange: (v: string) => void
  onToggleFilter: () => void
  onCloseFilter: () => void
  onAddFilter: (id: string) => void
  onSortChange: (v: SortOrder) => void
  onExportExcel: () => void
  onExportCsv: () => void
}

function ReferralsSearchBar({
  searchQuery,
  activeFilters,
  isFilterOpen,
  availableFilters,
  sortOrder,
  onSearchChange,
  onToggleFilter,
  onCloseFilter,
  onAddFilter,
  onSortChange,
  onExportExcel,
  onExportCsv,
}: ReferralsSearchBarProps) {
  const [isExportOpen, setIsExportOpen] = useState(false)
  const unselected = availableFilters.filter(f => !activeFilters.includes(f.id))

  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative flex-1 min-w-48">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search referrals..."
          aria-label="Search referrals"
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-brand-blue placeholder:text-gray-400"
        />
      </div>

      {/* Sort By */}
      <div className="relative">
        <select
          value={sortOrder}
          onChange={e => onSortChange(e.target.value as SortOrder)}
          className="appearance-none pl-4 pr-8 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:border-brand-blue cursor-pointer whitespace-nowrap"
        >
          <option value="" disabled>Sort By</option>
          <option value="firstName_asc">First Name ASC</option>
          <option value="firstName_desc">First Name DSC</option>
          <option value="lastName_asc">Last Name ASC</option>
          <option value="lastName_desc">Last Name DSC</option>
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
      </div>

      {/* Filter By */}
      <div className="relative">
        <button
          onClick={onToggleFilter}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors whitespace-nowrap text-sm text-gray-700"
        >
          <Plus size={16} />
          Filter By
          <ChevronDown size={14} className="text-gray-500" />
        </button>

        {isFilterOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={onCloseFilter} />
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
              {unselected.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400 italic">All filters applied</p>
              ) : (
                unselected.map(f => (
                  <button
                    key={f.id}
                    onClick={() => { onAddFilter(f.id); onCloseFilter() }}
                    className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    {f.label}
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Export */}
      <div className="relative">
        <button
          onClick={() => setIsExportOpen(o => !o)}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors whitespace-nowrap text-sm font-medium"
        >
          <Download size={16} />
          Export
          <ChevronDown size={14} />
        </button>

        {isExportOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsExportOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
              <button
                onClick={() => { onExportExcel(); setIsExportOpen(false) }}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100"
              >
                Export as Excel
              </button>
              <button
                onClick={() => { onExportCsv(); setIsExportOpen(false) }}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                Export as CSV
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Filter Badges ─────────────────────────────────────────────────────────────

type ReferralsFilterBadgesProps = {
  activeFilters: string[]
  filterValues: Record<string, string>
  availableFilters: FilterOption[]
  onFilterValueChange: (id: string, value: string) => void
  onRemoveFilter: (id: string) => void
}

function ReferralsFilterBadges({
  activeFilters,
  filterValues,
  availableFilters,
  onFilterValueChange,
  onRemoveFilter,
}: ReferralsFilterBadgesProps) {
  if (activeFilters.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {activeFilters.map(filterId => {
        const filter = availableFilters.find(f => f.id === filterId)
        if (!filter) return null
        return (
          <div
            key={filterId}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full"
          >
            <span className="text-sm text-blue-700 font-medium whitespace-nowrap">{filter.label}:</span>
            <select
              value={filterValues[filterId] ?? ''}
              onChange={e => onFilterValueChange(filterId, e.target.value)}
              onClick={e => e.stopPropagation()}
              className="text-sm bg-transparent border-none focus:outline-none text-blue-700 font-medium pr-1 cursor-pointer"
            >
              <option value="">All</option>
              {filter.options.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <button
              onClick={() => onRemoveFilter(filterId)}
              aria-label={`Remove ${filter.label} filter`}
              className="text-blue-700 hover:text-blue-900 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── Table ─────────────────────────────────────────────────────────────────────

type ReferralsTableProps = {
  referrals: Referral[]
  isFiltered: boolean
  activeFilters: string[]
  onUpdateStatus: (r: Referral) => void
  onRemove: (id: number) => void
}

// Active filters that map to a column NOT already shown by default get added to
// the table. (Status is already a default column, so it is intentionally absent.)
const EXTRA_COLUMNS: Record<string, { label: string; get: (r: Referral) => string }> = {
  employer: { label: 'Employer', get: r => r.employer },
}

function ReferralsTable({ referrals, isFiltered, activeFilters, onUpdateStatus, onRemove }: ReferralsTableProps) {
  const extraCols = activeFilters.filter(f => f in EXTRA_COLUMNS)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)

  function handleToggleMenu(e: React.MouseEvent, id: number) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const menuHeight = 80
    const showAbove = window.innerHeight - rect.bottom < menuHeight + 8
    setMenuPos({
      top: showAbove ? rect.top - menuHeight - 4 : rect.bottom + 4,
      right: window.innerWidth - rect.right,
    })
    setOpenMenuId(openMenuId === id ? null : id)
  }

  function closeMenu() { setOpenMenuId(null) }

  const menuReferral = referrals.find(r => r.id === openMenuId) ?? null

  async function handleConfirmRemove() {
    if (!menuReferral) return
    const result = await Swal.fire({
      title: 'Remove Referral?',
      text: `Remove referral for "${menuReferral.applicantName}"? This cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Remove',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
    })
    if (!result.isConfirmed) return
    onRemove(menuReferral.id)
    closeMenu()
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-brand-blue">
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Applicant Name</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Job Title</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Date Referred</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Status</th>
            {extraCols.map(id => (
              <th key={id} className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">{EXTRA_COLUMNS[id].label}</th>
            ))}
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody>
          {referrals.length === 0 ? (
            <tr>
              <td colSpan={5 + extraCols.length} className="py-16 text-center">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                  </svg>
                  {isFiltered ? (
                    <>
                      <p className="text-base font-medium text-gray-500">No referrals match your filters</p>
                      <p className="text-sm">Try adjusting your search or removing some filters.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-base font-medium text-gray-500">No referrals yet</p>
                      <p className="text-sm">Referrals appear here when an applicant is referred from the Applicants tab.</p>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            referrals.map(r => (
              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">{r.applicantName}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.jobTitle}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.referralDate}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <ReferralStatusBadge status={r.status} />
                </td>
                {extraCols.map(id => (
                  <td key={id} className="px-4 py-3 text-gray-600 whitespace-nowrap">{EXTRA_COLUMNS[id].get(r) || '—'}</td>
                ))}
                <td className="px-4 py-3 whitespace-nowrap">
                  <button
                    onClick={e => handleToggleMenu(e, r.id)}
                    aria-label={`Actions for ${r.applicantName}`}
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

      {openMenuId !== null && menuPos && menuReferral && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeMenu} />
          <div
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}
            className="w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1"
          >
            <button onClick={() => { onUpdateStatus(menuReferral); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-purple-600 hover:bg-purple-50">Update Status</button>
            <button
              onClick={handleConfirmRemove}
              className="w-full px-3 py-2 text-left text-xs text-red-500 hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Update Status Modal ───────────────────────────────────────────────────────

type UpdateStatusModalProps = {
  referral: Referral
  onClose: () => void
  onSave: (id: number, newStatus: ReferralStatusOption) => Promise<void>
}

function UpdateStatusModal({ referral, onClose, onSave }: UpdateStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<ReferralStatusOption>(referral.status)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(referral.id, selectedStatus)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Update Status</h3>
          <button
            onClick={onClose}
            aria-label="Close update status modal"
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Updating status for <span className="font-semibold text-gray-800">{referral.applicantName}</span>
          </p>

          <div>
            <label htmlFor="referral-status" className="block text-xs font-semibold uppercase text-gray-700 mb-1">
              Status
            </label>
            <select
              id="referral-status"
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as ReferralStatusOption)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark transition-colors font-medium disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ReferralsTab() {
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [updatingReferral, setUpdatingReferral] = useState<Referral | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  async function reload() {
    const data = await listReferrals()
    setReferrals(data)
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [])

  const availableFilters: FilterOption[] = useMemo(() => {
    const employers = [...new Set(referrals.map(r => r.employer).filter(Boolean))].sort()
    return [
      { id: 'status', label: 'Status', options: FILTER_STATUS_OPTIONS },
      { id: 'employer', label: 'Employer', options: employers },
    ]
  }, [referrals])

  function handleAddFilter(id: string) {
    setActiveFilters(prev => [...prev, id])
  }

  function handleRemoveFilter(id: string) {
    setActiveFilters(prev => prev.filter(f => f !== id))
    setFilterValues(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  function handleFilterValueChange(id: string, value: string) {
    setFilterValues(prev => ({ ...prev, [id]: value }))
  }

  async function handleRemoveReferral(id: number) {
    try {
      await deleteReferral(id)
      setReferrals(prev => prev.filter(r => r.id !== id))
    } catch {
      Swal.fire('Error', 'Failed to remove referral. Please try again.', 'error')
    }
  }

  async function handleUpdateStatus(id: number, newStatus: ReferralStatusOption) {
    await updateReferralStatus(id, newStatus)
    if (newStatus === 'Hired') {
      // Hired referrals are removed from the list (they become placements)
      setReferrals(prev => prev.filter(r => r.id !== id))
    } else {
      setReferrals(prev => prev.map(r => r.id === id ? { ...r, status: newStatus as Referral['status'] } : r))
    }
  }

  // ── Export helpers ─────────────────────────────────────────────────────────

  function buildExportRows() {
    return filtered.map(r => ({
      'Applicant Name': r.applicantName,
      'Job Title': r.jobTitle,
      'Employer': r.employer,
      'Date Referred': r.referralDate,
      'Status': r.status,
    }))
  }

  function handleExportExcel() {
    const ws = XLSX.utils.json_to_sheet(buildExportRows())
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Referrals')
    XLSX.writeFile(wb, 'referrals.xlsx')
  }

  function handleExportCsv() {
    const ws = XLSX.utils.json_to_sheet(buildExportRows())
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'referrals.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = referrals

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(r =>
        r.applicantName.toLowerCase().includes(q) ||
        r.jobTitle.toLowerCase().includes(q) ||
        r.employer.toLowerCase().includes(q)
      )
    }

    for (const filterId of activeFilters) {
      const value = filterValues[filterId]
      if (!value) continue
      if (filterId === 'status') result = result.filter(r => r.status === value)
      if (filterId === 'employer') result = result.filter(r => r.employer === value)
    }

    if (sortOrder) {
      result = [...result].sort((a, b) => {
        const parts = (n: string) => n.trim().split(/\s+/)
        const keyA = (sortOrder.startsWith('firstName') ? parts(a.applicantName)[0] : parts(a.applicantName).at(-1) ?? '').toLowerCase()
        const keyB = (sortOrder.startsWith('firstName') ? parts(b.applicantName)[0] : parts(b.applicantName).at(-1) ?? '').toLowerCase()
        return sortOrder.endsWith('asc') ? keyA.localeCompare(keyB) : keyB.localeCompare(keyA)
      })
    }

    return result
  }, [referrals, searchQuery, activeFilters, filterValues, sortOrder])

  const isFiltered = searchQuery.trim() !== '' || activeFilters.some(f => filterValues[f])

  // Reset to page 1 when the filtered set changes; clamp if it shrinks.
  const totalPages = Math.max(1, Math.ceil(filtered.length / EF_ITEMS_PER_PAGE))
  useEffect(() => { setCurrentPage(1) }, [searchQuery, activeFilters, filterValues, sortOrder])
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages) }, [currentPage, totalPages])
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * EF_ITEMS_PER_PAGE, currentPage * EF_ITEMS_PER_PAGE),
    [filtered, currentPage],
  )

  if (loading) return <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-500">Loading referrals…</div>

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="mb-4">
          <ReferralsSearchBar
            searchQuery={searchQuery}
            activeFilters={activeFilters}
            isFilterOpen={isFilterOpen}
            availableFilters={availableFilters}
            sortOrder={sortOrder}
            onSearchChange={v => setSearchQuery(v)}
            onToggleFilter={() => setIsFilterOpen(o => !o)}
            onCloseFilter={() => setIsFilterOpen(false)}
            onAddFilter={handleAddFilter}
            onSortChange={setSortOrder}
            onExportExcel={handleExportExcel}
            onExportCsv={handleExportCsv}
          />

          {activeFilters.length > 0 && (
            <div className="mt-3">
              <ReferralsFilterBadges
                activeFilters={activeFilters}
                filterValues={filterValues}
                availableFilters={availableFilters}
                onFilterValueChange={handleFilterValueChange}
                onRemoveFilter={handleRemoveFilter}
              />
            </div>
          )}
        </div>

        <ReferralsTable
          referrals={paginated}
          isFiltered={isFiltered}
          activeFilters={activeFilters}
          onUpdateStatus={setUpdatingReferral}
          onRemove={handleRemoveReferral}
        />
        <TablePagination
          currentPage={currentPage}
          totalItems={filtered.length}
          onPageChange={setCurrentPage}
          itemLabel="referral"
        />
      </div>

      {updatingReferral && (
        <UpdateStatusModal
          referral={updatingReferral}
          onClose={() => setUpdatingReferral(null)}
          onSave={handleUpdateStatus}
        />
      )}
    </div>
  )
}
