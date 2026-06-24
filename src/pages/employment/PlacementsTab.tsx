import { useState, useMemo } from 'react'
import { Search, Plus, ChevronDown, X, Download, MoreHorizontal } from 'lucide-react'
import DatePicker from '../../components/DatePicker'
import type { Placement } from '../../contexts/EmploymentContext'
import { PLACEMENT_SEED } from '../../contexts/EmploymentContext'
import * as XLSX from 'xlsx'

const LS_KEY = 'ef_placements'

// ── Data loader ───────────────────────────────────────────────────────────────

function loadPlacements(): Placement[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return PLACEMENT_SEED
    const parsed = JSON.parse(raw) as Placement[]
    return parsed
  } catch {
    return PLACEMENT_SEED
  }
}

// ── Filter config ─────────────────────────────────────────────────────────────

type FilterOption = { id: string; label: string; options: string[] }

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

type SortOrder = 'firstName_asc' | 'firstName_desc' | 'lastName_asc' | 'lastName_desc' | ''

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
}

function PlacementsTable({ placements, isFiltered, onView, onEdit, onUpdateStatus }: PlacementsTableProps) {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)

  function handleToggleMenu(e: React.MouseEvent, id: number) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const menuHeight = 110
    const showAbove = window.innerHeight - rect.bottom < menuHeight + 8
    setMenuPos({
      top: showAbove ? rect.top - menuHeight - 4 : rect.bottom + 4,
      right: window.innerWidth - rect.right,
    })
    setOpenMenuId(openMenuId === id ? null : id)
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
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.jobTitle}</td>
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
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}
            className="w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1"
          >
            <button onClick={() => { onView(menuPlacement); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">View</button>
            <button onClick={() => { onEdit(menuPlacement); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-brand-blue hover:bg-blue-50">Edit</button>
            <button onClick={() => { onUpdateStatus(menuPlacement); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-purple-600 hover:bg-purple-50">Update Status</button>
          </div>
        </>
      )}
    </div>
  )
}

// ── View Placement Modal ──────────────────────────────────────────────────────

function ViewPlacementModal({ placement, onClose }: { placement: Placement; onClose: () => void }) {
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

        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Applicant Name</p>
              <p className="text-sm font-medium text-gray-800">{placement.applicantName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Job Title</p>
              <p className="text-sm font-medium text-gray-800">{placement.jobTitle}</p>
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
              <p className="text-xs text-gray-500 mb-0.5">Source</p>
              <p className="text-sm font-medium text-gray-800">{placement.source || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Job Reference ID</p>
              <p className="text-sm font-medium text-gray-800">
                {placement.referralId && placement.vacancyId
                  ? `R-${placement.referralId} / V-${placement.vacancyId}`
                  : '-'}
              </p>
            </div>
            {placement.salaryRange && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Salary Range</p>
                <p className="text-sm font-medium text-gray-800">{placement.salaryRange}</p>
              </div>
            )}
          </div>

          {placement.notes && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{placement.notes}</p>
            </div>
          )}
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
  onSave: (id: number, updates: Pick<Placement, 'jobTitle' | 'employer' | 'dateHired' | 'employmentType' | 'status'>) => void
}

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship']

function EditPlacementModal({ placement, onClose, onSave }: EditPlacementModalProps) {
  const [jobTitle, setJobTitle] = useState(placement.jobTitle)
  const [employer, setEmployer] = useState(placement.employer)
  const [dateHired, setDateHired] = useState(placement.dateHired)
  const [employmentType, setEmploymentType] = useState(placement.employmentType ?? '')
  const [status, setStatus] = useState<Placement['status']>(placement.status)
  const [showFieldErrors, setShowFieldErrors] = useState(false)

  function handleSave() {
    if (!jobTitle.trim() || !employer.trim() || !dateHired) {
      setShowFieldErrors(true)
      return
    }
    onSave(placement.id, { jobTitle: jobTitle.trim(), employer: employer.trim(), dateHired, employmentType, status })
    onClose()
  }

  function fieldCls(isEmpty: boolean) {
    return `w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent outline-none text-gray-900 ${
      showFieldErrors && isEmpty ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:ring-brand-blue'
    }`
  }

  function ErrMsg({ show }: { show: boolean }) {
    return show ? <p className="text-red-500 text-xs mt-1">This field is required.</p> : null
  }

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
          {/* Applicant Name — read-only */}
          <div>
            <label htmlFor="placement-applicant-name" className="block text-sm font-medium text-gray-600 mb-1">
              Applicant Name
            </label>
            <input
              id="placement-applicant-name"
              type="text"
              value={placement.applicantName}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400 outline-none cursor-not-allowed"
            />
          </div>

          {/* Job Title */}
          <div>
            <label htmlFor="placement-job-title" className="block text-sm font-medium text-gray-600 mb-1">
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              id="placement-job-title"
              type="text"
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              className={fieldCls(!jobTitle.trim())}
            />
            <ErrMsg show={showFieldErrors && !jobTitle.trim()} />
          </div>

          {/* Employer */}
          <div>
            <label htmlFor="placement-employer" className="block text-sm font-medium text-gray-600 mb-1">
              Employer <span className="text-red-500">*</span>
            </label>
            <input
              id="placement-employer"
              type="text"
              value={employer}
              onChange={e => setEmployer(e.target.value)}
              className={fieldCls(!employer.trim())}
            />
            <ErrMsg show={showFieldErrors && !employer.trim()} />
          </div>

          {/* Date Hired */}
          <div>
            <label htmlFor="placement-date-hired" className="block text-sm font-medium text-gray-600 mb-1">
              Date Hired <span className="text-red-500">*</span>
            </label>
            <DatePicker
              id="placement-date-hired"
              className={fieldCls(!dateHired)}
              value={dateHired}
              onChange={setDateHired}
            />
            <ErrMsg show={showFieldErrors && !dateHired} />
          </div>

          {/* Employment Type */}
          <div>
            <label htmlFor="placement-employment-type" className="block text-sm font-medium text-gray-600 mb-1">
              Employment Type <span className="text-red-500">*</span>
            </label>
            <select
              id="placement-employment-type"
              value={employmentType}
              onChange={e => setEmploymentType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900"
            >
              <option value="">— Select —</option>
              {EMPLOYMENT_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Status */}
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
            className="px-6 py-2 bg-brand-blue text-white rounded-full text-sm hover:bg-brand-blue-dark transition-colors font-medium"
          >
            Save Changes
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
  onSave: (id: number, newStatus: Placement['status']) => void
}

function UpdatePlacementStatusModal({ placement, onClose, onSave }: UpdatePlacementStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<Placement['status']>(placement.status)

  function handleSave() {
    onSave(placement.id, selectedStatus)
    onClose()
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
            className="px-6 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark transition-colors font-medium"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PlacementsTab() {
  const [placements, setPlacements] = useState<Placement[]>(loadPlacements)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [viewingPlacement, setViewingPlacement] = useState<Placement | null>(null)
  const [editingPlacement, setEditingPlacement] = useState<Placement | null>(null)
  const [updatingPlacement, setUpdatingPlacement] = useState<Placement | null>(null)

  const availableFilters: FilterOption[] = useMemo(() => {
    const employers = [...new Set(placements.map(p => p.employer).filter(Boolean))].sort()
    return [
      { id: 'status', label: 'Status', options: STATUS_OPTIONS },
      { id: 'employer', label: 'Employer', options: employers },
    ]
  }, [placements])

  function persist(next: Placement[]) {
    setPlacements(next)
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch { /* quota */ }
  }

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

  function handleEditSave(id: number, updates: Pick<Placement, 'jobTitle' | 'employer' | 'dateHired' | 'employmentType' | 'status'>) {
    persist(placements.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  function handleUpdateStatus(id: number, newStatus: Placement['status']) {
    persist(placements.map(p => p.id === id ? { ...p, status: newStatus } : p))
  }

  // ── Export helpers ─────────────────────────────────────────────────────────

  function buildExportRows() {
    return filtered.map(p => ({
      'Applicant Name': p.applicantName,
      'Job Title': p.jobTitle,
      'Employer': p.employer,
      'Date Hired': p.dateHired,
      'Status': p.status,
      'Notes': p.notes ?? '',
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
          placements={filtered}
          isFiltered={isFiltered}
          onView={setViewingPlacement}
          onEdit={setEditingPlacement}
          onUpdateStatus={setUpdatingPlacement}
        />
      </div>

      {viewingPlacement && (
        <ViewPlacementModal
          placement={viewingPlacement}
          onClose={() => setViewingPlacement(null)}
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
    </div>
  )
}
