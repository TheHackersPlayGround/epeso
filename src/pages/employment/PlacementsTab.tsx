import { useState, useEffect, useMemo } from 'react'
import { Search, Plus, ChevronDown, X, Download, MoreHorizontal } from 'lucide-react'
import DatePicker from '../../components/DatePicker'
import { canManage } from '../../utils/permissions'
import type { Placement } from '../../contexts/EmploymentContext'
import {
  listPlacements,
  updatePlacement,
  updatePlacementStatus,
  listPromotions,
  createPromotion,
  type Promotion,
  type PromotionInput,
} from '../../services/placementService'
import ConfirmModal from '../shared/ConfirmModal'
import * as XLSX from 'xlsx'
import TablePagination, { EF_ITEMS_PER_PAGE } from './shared/TablePagination'

// ── Filter config ─────────────────────────────────────────────────────────────

type FilterOption = { id: string; label: string; options: string[] }
type SortOrder = 'firstName_asc' | 'firstName_desc' | 'lastName_asc' | 'lastName_desc' | ''

const STATUS_OPTIONS: Placement['status'][] = ['Active', 'Resigned', 'Terminated', 'Completed']

// ── Status Badge ──────────────────────────────────────────────────────────────

function PlacementStatusBadge({ status }: { status: Placement['status'] }) {
  if (status === 'Resigned') {
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Resigned</span>
  }
  if (status === 'Terminated') {
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">Terminated</span>
  }
  if (status === 'Completed') {
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Completed</span>
  }
  return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
}

// ── Search Bar ────────────────────────────────────────────────────────────────

type PlacementsSearchBarProps = {
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

function PlacementsSearchBar({
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
}: PlacementsSearchBarProps) {
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
          placeholder="Search placements..."
          aria-label="Search placements"
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

type PlacementsFilterBadgesProps = {
  activeFilters: string[]
  filterValues: Record<string, string>
  availableFilters: FilterOption[]
  onFilterValueChange: (id: string, value: string) => void
  onRemoveFilter: (id: string) => void
}

function PlacementsFilterBadges({
  activeFilters,
  filterValues,
  availableFilters,
  onFilterValueChange,
  onRemoveFilter,
}: PlacementsFilterBadgesProps) {
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

type PlacementsTableProps = {
  placements: Placement[]
  isFiltered: boolean
  onView: (p: Placement) => void
  onEdit: (p: Placement) => void
  onUpdateStatus: (p: Placement) => void
  onRecordPromotion: (p: Placement) => void
}

function PlacementsTable({ placements, isFiltered, onView, onEdit, onUpdateStatus, onRecordPromotion }: PlacementsTableProps) {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)

  function handleToggleMenu(e: React.MouseEvent, id: number) {
    if (openMenuId === id) {
      setOpenMenuId(null)
      return
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const menuHeight = 145
    const margin = 8
    const spaceBelow = window.innerHeight - rect.bottom
    let top = spaceBelow < menuHeight + margin ? rect.top - menuHeight - 4 : rect.bottom + 4
    // Clamp so the menu is never cut off by the top or bottom edge of the viewport.
    top = Math.max(margin, Math.min(top, window.innerHeight - menuHeight - margin))
    setMenuPos({ top, right: window.innerWidth - rect.right })
    setOpenMenuId(id)
  }

  function closeMenu() { setOpenMenuId(null) }

  const menuPlacement = placements.find(p => p.id === openMenuId) ?? null

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-brand-blue">
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Applicant Name</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Job Title</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Employer</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Date Hired</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Status</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody>
          {placements.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-16 text-center">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                  </svg>
                  {isFiltered ? (
                    <>
                      <p className="text-base font-medium text-gray-500">No placements match your filters</p>
                      <p className="text-sm">Try adjusting your search or removing some filters.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-base font-medium text-gray-500">No placements yet</p>
                      <p className="text-sm">Applicants appear here when their referral status is set to Hired.</p>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            placements.map(p => (
              <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">{p.applicantName}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.currentJobTitle}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.employer}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.dateHired}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <PlacementStatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button
                    onClick={e => handleToggleMenu(e, p.id)}
                    aria-label={`Actions for ${p.applicantName}`}
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

      {openMenuId !== null && menuPos && menuPlacement && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeMenu} />
          <div
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, maxHeight: 'calc(100vh - 16px)' }}
            className="w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1 overflow-y-auto"
          >
            <button onClick={() => { onView(menuPlacement); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">View</button>
            <button onClick={() => { onEdit(menuPlacement); closeMenu() }} disabled={!canManage('employment')} className="w-full px-3 py-2 text-left text-xs text-brand-blue hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Edit</button>
            <button onClick={() => { onUpdateStatus(menuPlacement); closeMenu() }} disabled={!canManage('employment')} className="w-full px-3 py-2 text-left text-xs text-purple-600 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Update Status</button>
            <button onClick={() => { onRecordPromotion(menuPlacement); closeMenu() }} disabled={!canManage('employment')} className="w-full px-3 py-2 text-left text-xs text-amber-600 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Record Promotion</button>
          </div>
        </>
      )}
    </div>
  )
}

// ── View Placement Modal ──────────────────────────────────────────────────────

function ViewPlacementModal({ placement, onClose, onNavigateToVacancy }: {
  placement: Placement
  onClose: () => void
  onNavigateToVacancy?: (id: number) => void
}) {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loadingPromotions, setLoadingPromotions] = useState(true)

  useEffect(() => {
    let alive = true
    listPromotions(placement.id)
      .then(rows => { if (alive) setPromotions(rows) })
      .catch(() => { if (alive) setPromotions([]) })
      .finally(() => { if (alive) setLoadingPromotions(false) })
    return () => { alive = false }
  }, [placement.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Placement Details</h3>
          <button
            onClick={onClose}
            aria-label="Close placement details"
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Applicant Name</p>
              <p className="text-sm font-medium text-gray-800">{placement.applicantName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Current Position</p>
              <p className="text-sm font-medium text-gray-800">{placement.currentJobTitle}</p>
              {placement.currentJobTitle !== placement.jobTitle && (
                <p className="text-xs text-gray-400 mt-0.5">Hired as: {placement.jobTitle}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Employer</p>
              <p className="text-sm font-medium text-gray-800">{placement.employer || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Employment Type</p>
              <p className="text-sm font-medium text-gray-800">{placement.employmentType || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Date Hired</p>
              <p className="text-sm font-medium text-gray-800">{placement.dateHired || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Status</p>
              <PlacementStatusBadge status={placement.status} />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Linked Vacancy</p>
              {placement.vacancyId ? (
                <p className="text-sm font-medium">
                  <button
                    type="button"
                    onClick={() => { onNavigateToVacancy?.(placement.vacancyId as number); onClose(); }}
                    className="text-brand-blue hover:underline"
                  >
                    V-{placement.vacancyId}
                  </button>
                </p>
              ) : (
                <p className="text-sm font-medium text-gray-800">-</p>
              )}
            </div>
            {placement.salaryRange && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Salary Range</p>
                <p className="text-sm font-medium text-gray-800">{placement.salaryRange}</p>
              </div>
            )}
          </div>

          {/* Promotion history — oldest at the bottom, newest first. */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold uppercase text-gray-700 mb-2">Promotion History</p>
            {loadingPromotions ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : promotions.length === 0 ? (
              <p className="text-sm text-gray-400">No promotions recorded for this placement.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {promotions.map(pr => (
                  <li key={pr.id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-800">{pr.newJobTitle}</span>
                      <span className="text-xs text-gray-500 whitespace-nowrap">{pr.promotionDate}</span>
                    </div>
                    {pr.newSalaryRange && (
                      <p className="text-xs text-gray-500 mt-0.5">New salary: {pr.newSalaryRange}</p>
                    )}
                    {pr.remarks && (
                      <p className="text-xs text-gray-500 mt-0.5">{pr.remarks}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>

        <div className="flex justify-end px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Placement Modal ──────────────────────────────────────────────────────

type EditPlacementModalProps = {
  placement: Placement
  onClose: () => void
  onSave: (id: number, updates: Pick<Placement, 'dateHired' | 'status'>) => Promise<void>
}

function EditPlacementModal({ placement, onClose, onSave }: EditPlacementModalProps) {
  const [dateHired, setDateHired] = useState(placement.dateHired)
  const [status, setStatus] = useState<Placement['status']>(placement.status)
  const [showFieldErrors, setShowFieldErrors] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!dateHired) {
      setShowFieldErrors(true)
      return
    }
    setSaving(true)
    try {
      await onSave(placement.id, { dateHired, status })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const dateFieldCls = `w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent outline-none text-gray-900 ${
    showFieldErrors && !dateHired ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:ring-brand-blue'
  }`

  const readOnlyCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 outline-none cursor-not-allowed'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Edit Placement</h3>
          <button
            onClick={onClose}
            aria-label="Close edit placement modal"
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 grid grid-cols-2 gap-x-6 gap-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Applicant Name</label>
            <input type="text" value={placement.applicantName} readOnly className={readOnlyCls} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Current Position</label>
            <input type="text" value={placement.currentJobTitle} readOnly className={readOnlyCls} />
            {placement.currentJobTitle !== placement.jobTitle && (
              <p className="text-xs text-gray-400 mt-1">Hired as: {placement.jobTitle}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Employer</label>
            <input type="text" value={placement.employer} readOnly className={readOnlyCls} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Employment Type</label>
            <input type="text" value={placement.employmentType ?? ''} readOnly className={readOnlyCls} />
          </div>

          <div>
            <label htmlFor="placement-date-hired" className="block text-sm font-medium text-gray-600 mb-1">
              Date Hired <span className="text-red-500">*</span>
            </label>
            <DatePicker
              id="placement-date-hired"
              className={dateFieldCls}
              value={dateHired}
              onChange={setDateHired}
            />
            {showFieldErrors && !dateHired && (
              <p className="text-red-500 text-xs mt-1">This field is required.</p>
            )}
          </div>

          <div>
            <label htmlFor="placement-edit-status" className="block text-sm font-medium text-gray-600 mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              id="placement-edit-status"
              value={status}
              onChange={e => setStatus(e.target.value as Placement['status'])}
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
            className="px-6 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-brand-blue text-white rounded-full text-sm hover:bg-brand-blue-dark transition-colors font-medium disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Update Status Modal ───────────────────────────────────────────────────────

type UpdatePlacementStatusModalProps = {
  placement: Placement
  onClose: () => void
  onSave: (id: number, newStatus: Placement['status']) => Promise<void>
}

function UpdatePlacementStatusModal({ placement, onClose, onSave }: UpdatePlacementStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<Placement['status']>(placement.status)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(placement.id, selectedStatus)
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
            Updating status for <span className="font-semibold text-gray-800">{placement.applicantName}</span>
          </p>

          <div>
            <label htmlFor="placement-status" className="block text-xs font-semibold uppercase text-gray-700 mb-1">
              Status
            </label>
            <select
              id="placement-status"
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as Placement['status'])}
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

// ── Record Promotion Modal ────────────────────────────────────────────────────

type RecordPromotionModalProps = {
  placement: Placement
  onClose: () => void
  onSave: (id: number, input: PromotionInput) => Promise<void>
}

// Parse a salary form field to a number (₱, commas, spaces ignored), or undefined.
function parseSalaryInput(s: string): number | undefined {
  const n = Number(s.replace(/[^\d.]/g, ''))
  return s.trim() && !Number.isNaN(n) ? n : undefined
}

function RecordPromotionModal({ placement, onClose, onSave }: RecordPromotionModalProps) {
  const [promotionDate, setPromotionDate] = useState('')
  const [newJobTitle, setNewJobTitle] = useState('')
  const [newSalaryMin, setNewSalaryMin] = useState('')
  const [newSalaryMax, setNewSalaryMax] = useState('')
  const [remarks, setRemarks] = useState('')
  const [showFieldErrors, setShowFieldErrors] = useState(false)
  const [saving, setSaving] = useState(false)

  const fieldCls =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900'

  async function handleSave() {
    if (!promotionDate || !newJobTitle.trim()) {
      setShowFieldErrors(true)
      return
    }
    setSaving(true)
    try {
      await onSave(placement.id, {
        promotionDate,
        newJobTitle: newJobTitle.trim(),
        // Atomic numeric bounds; the backend derives the display string.
        newSalaryMin: parseSalaryInput(newSalaryMin),
        newSalaryMax: parseSalaryInput(newSalaryMax),
        remarks: remarks.trim() || undefined,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Record Promotion</h3>
          <button
            onClick={onClose}
            aria-label="Close record promotion modal"
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Recording a promotion for <span className="font-semibold text-gray-800">{placement.applicantName}</span>
            {' '}at <span className="font-semibold text-gray-800">{placement.employer || 'this employer'}</span>.
          </p>

          <div>
            <label htmlFor="promotion-date" className="block text-sm font-medium text-gray-600 mb-1">
              Promotion Date <span className="text-red-500">*</span>
            </label>
            <DatePicker
              id="promotion-date"
              className={fieldCls}
              value={promotionDate}
              onChange={setPromotionDate}
            />
            {showFieldErrors && !promotionDate && (
              <p className="text-red-500 text-xs mt-1">This field is required.</p>
            )}
          </div>

          <div>
            <label htmlFor="promotion-title" className="block text-sm font-medium text-gray-600 mb-1">
              New Job Title <span className="text-red-500">*</span>
            </label>
            <input
              id="promotion-title"
              type="text"
              value={newJobTitle}
              onChange={e => setNewJobTitle(e.target.value)}
              className={fieldCls}
              placeholder="e.g. Head Cook"
            />
            {showFieldErrors && !newJobTitle.trim() && (
              <p className="text-red-500 text-xs mt-1">This field is required.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              New Salary Range
            </label>
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-brand-blue focus-within:border-transparent">
                <span className="px-3 py-2 text-gray-900 text-sm font-medium border-r border-gray-300 bg-gray-50 rounded-l-lg select-none">₱</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={newSalaryMin}
                  onChange={e => setNewSalaryMin(e.target.value)}
                  placeholder="Min (e.g. 18,000)"
                  aria-label="New minimum salary"
                  className="flex-1 w-full px-3 py-2 text-sm text-gray-900 outline-none rounded-r-lg placeholder:text-gray-400"
                />
              </div>
              <span className="text-gray-400 select-none">–</span>
              <div className="flex flex-1 items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-brand-blue focus-within:border-transparent">
                <span className="px-3 py-2 text-gray-900 text-sm font-medium border-r border-gray-300 bg-gray-50 rounded-l-lg select-none">₱</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={newSalaryMax}
                  onChange={e => setNewSalaryMax(e.target.value)}
                  placeholder="Max (e.g. 22,000)"
                  aria-label="New maximum salary"
                  className="flex-1 w-full px-3 py-2 text-sm text-gray-900 outline-none rounded-r-lg placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="promotion-remarks" className="block text-sm font-medium text-gray-600 mb-1">
              Remarks
            </label>
            <textarea
              id="promotion-remarks"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              rows={2}
              className={fieldCls}
              placeholder="Optional notes"
            />
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
            {saving ? 'Saving…' : 'Record Promotion'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PlacementsTab({ onNavigateToVacancy }: {
  onNavigateToVacancy?: (id: number) => void
} = {}) {
  const [placements, setPlacements] = useState<Placement[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [viewingPlacement, setViewingPlacement] = useState<Placement | null>(null)
  const [editingPlacement, setEditingPlacement] = useState<Placement | null>(null)
  const [updatingPlacement, setUpdatingPlacement] = useState<Placement | null>(null)
  const [promotingPlacement, setPromotingPlacement] = useState<Placement | null>(null)
  const [resultModal, setResultModal] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({ isOpen: false, type: 'success', title: '', message: '' })

  async function reload() {
    const data = await listPlacements()
    setPlacements(data)
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [])

  const availableFilters: FilterOption[] = useMemo(() => {
    const employers = [...new Set(placements.map(p => p.employer).filter(Boolean))].sort()
    return [
      { id: 'status', label: 'Status', options: STATUS_OPTIONS },
      { id: 'employer', label: 'Employer', options: employers },
    ]
  }, [placements])

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

  async function handleEditSave(
    id: number,
    updates: Pick<Placement, 'dateHired' | 'status'>,
  ) {
    try {
      await updatePlacement(id, updates)
    } catch (err: unknown) {
      // axiosClient's interceptor flattens backend errors into Error.message.
      const msg = err instanceof Error && err.message ? err.message : 'Failed to update placement. Please try again.'
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: msg })
      throw err // keep the Edit Placement modal open so the user can retry
    }

    setPlacements(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
    setResultModal({ isOpen: true, type: 'success', title: 'Placement Updated', message: 'The placement details have been updated successfully.' })
  }

  async function handleUpdateStatus(id: number, newStatus: Placement['status']) {
    const name = placements.find(p => p.id === id)?.applicantName ?? 'The applicant'

    try {
      await updatePlacementStatus(id, newStatus)
    } catch (err: unknown) {
      // axiosClient's interceptor flattens backend errors into Error.message.
      const msg = err instanceof Error && err.message ? err.message : 'Failed to update placement status. Please try again.'
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: msg })
      throw err // keep the Update Status modal open so the user can retry
    }

    setPlacements(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p))

    // Customised confirmation per status.
    const notes: Record<Placement['status'], { title: string; text: string }> = {
      Active:     { title: 'Status Updated', text: `${name}'s placement is now set to Active.` },
      Resigned:   { title: 'Status Updated', text: `${name} has been marked as Resigned.` },
      Terminated: { title: 'Status Updated', text: `${name} has been marked as Terminated.` },
      Completed:  { title: 'Status Updated', text: `${name}'s placement has been marked as Completed.` },
    }
    const note = notes[newStatus]
    setResultModal({ isOpen: true, type: 'success', title: note.title, message: note.text })
  }

  async function handleRecordPromotion(id: number, input: PromotionInput) {
    const name = placements.find(p => p.id === id)?.applicantName ?? 'The applicant'

    try {
      await createPromotion(id, input)
    } catch (err: unknown) {
      // axiosClient's interceptor flattens backend errors into Error.message.
      const msg = err instanceof Error && err.message ? err.message : 'Failed to record promotion. Please try again.'
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: msg })
      throw err // keep the Record Promotion modal open so the user can retry
    }

    // currentJobTitle is computed server-side (latest promotion join), so a
    // local optimistic merge can't reproduce it correctly — reload instead.
    await reload()

    setResultModal({ isOpen: true, type: 'success', title: 'Promotion Recorded', message: `${name} has been promoted to ${input.newJobTitle}.` })
  }

  // ── Export helpers ─────────────────────────────────────────────────────────

  function buildExportRows() {
    return filtered.map(p => ({
      'Applicant Name': p.applicantName,
      'Hired As': p.jobTitle,
      'Current Position': p.currentJobTitle,
      'Employer': p.employer,
      'Date Hired': p.dateHired,
      'Status': p.status,
    }))
  }

  function handleExportExcel() {
    const ws = XLSX.utils.json_to_sheet(buildExportRows())
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Placements')
    XLSX.writeFile(wb, 'placements.xlsx')
  }

  function handleExportCsv() {
    const ws = XLSX.utils.json_to_sheet(buildExportRows())
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'placements.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = placements

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.applicantName.toLowerCase().includes(q) ||
        p.jobTitle.toLowerCase().includes(q) ||
        p.currentJobTitle.toLowerCase().includes(q) ||
        p.employer.toLowerCase().includes(q)
      )
    }

    for (const filterId of activeFilters) {
      const value = filterValues[filterId]
      if (!value) continue
      if (filterId === 'status') result = result.filter(p => p.status === value)
      if (filterId === 'employer') result = result.filter(p => p.employer === value)
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
  }, [placements, searchQuery, activeFilters, filterValues, sortOrder])

  const isFiltered = searchQuery.trim() !== '' || activeFilters.some(f => filterValues[f])

  // Reset to page 1 when the filtered set changes; clamp if it shrinks.
  const totalPages = Math.max(1, Math.ceil(filtered.length / EF_ITEMS_PER_PAGE))
  useEffect(() => { setCurrentPage(1) }, [searchQuery, activeFilters, filterValues, sortOrder])
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages) }, [currentPage, totalPages])
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * EF_ITEMS_PER_PAGE, currentPage * EF_ITEMS_PER_PAGE),
    [filtered, currentPage],
  )

  if (loading) return <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-500">Loading placements…</div>

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="mb-4">
          <PlacementsSearchBar
            searchQuery={searchQuery}
            activeFilters={activeFilters}
            isFilterOpen={isFilterOpen}
            availableFilters={availableFilters}
            sortOrder={sortOrder}
            onSearchChange={v => setSearchQuery(v)}
            onToggleFilter={() => setIsFilterOpen(o => !o)}
            onSortChange={setSortOrder}
            onCloseFilter={() => setIsFilterOpen(false)}
            onAddFilter={handleAddFilter}
            onExportExcel={handleExportExcel}
            onExportCsv={handleExportCsv}
          />

          {activeFilters.length > 0 && (
            <div className="mt-3">
              <PlacementsFilterBadges
                activeFilters={activeFilters}
                filterValues={filterValues}
                availableFilters={availableFilters}
                onFilterValueChange={handleFilterValueChange}
                onRemoveFilter={handleRemoveFilter}
              />
            </div>
          )}
        </div>

        <PlacementsTable
          placements={paginated}
          isFiltered={isFiltered}
          onView={setViewingPlacement}
          onEdit={setEditingPlacement}
          onUpdateStatus={setUpdatingPlacement}
          onRecordPromotion={setPromotingPlacement}
        />
        <TablePagination
          currentPage={currentPage}
          totalItems={filtered.length}
          onPageChange={setCurrentPage}
          itemLabel="placement"
        />
      </div>

      {viewingPlacement && (
        <ViewPlacementModal
          placement={viewingPlacement}
          onClose={() => setViewingPlacement(null)}
          onNavigateToVacancy={onNavigateToVacancy}
        />
      )}

      {editingPlacement && (
        <EditPlacementModal
          placement={editingPlacement}
          onClose={() => setEditingPlacement(null)}
          onSave={handleEditSave}
        />
      )}

      {updatingPlacement && (
        <UpdatePlacementStatusModal
          placement={updatingPlacement}
          onClose={() => setUpdatingPlacement(null)}
          onSave={handleUpdateStatus}
        />
      )}

      {promotingPlacement && (
        <RecordPromotionModal
          placement={promotingPlacement}
          onClose={() => setPromotingPlacement(null)}
          onSave={handleRecordPromotion}
        />
      )}
      <ConfirmModal
        isOpen={resultModal.isOpen} type={resultModal.type} title={resultModal.title} message={resultModal.message}
        confirmText="OK" onConfirm={() => setResultModal(prev => ({ ...prev, isOpen: false }))} onCancel={() => setResultModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}
