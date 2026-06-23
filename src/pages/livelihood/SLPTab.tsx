import { useState, useMemo, useEffect } from 'react'
import { Search, Plus, ChevronDown, X, Download, Upload, MoreHorizontal, Info, ChevronLeft, ChevronRight } from 'lucide-react'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'
import type { LivelihoodBeneficiary, LivelihoodStatus, SLPProject } from '../../contexts/LivelihoodContext'
import { LIVELIHOOD_SEED, SLP_PROJECTS_SEED } from '../../contexts/LivelihoodContext'
import SLPProfileForm, { EMPTY_SLP_RECORD } from './SLPProfileForm'

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'lp_slp_v7'
const ACTIVITIES_LS_KEY = 'lp_program_activities_v2'

const STATUS_OPTIONS: LivelihoodStatus[] = [
  'Active', 'Inactive',
]


const STATUS_COLORS: Record<LivelihoodStatus, string> = {
  Active:     'bg-green-100 text-green-700',
  Completed:  'bg-blue-100 text-blue-700',
  Dropped:    'bg-red-100 text-red-600',
  Pending:    'bg-yellow-100 text-yellow-700',
  Closed:     'bg-gray-100 text-gray-500',
  Approved:   'bg-emerald-100 text-emerald-700',
  Released:   'bg-purple-100 text-purple-700',
  Inactive:   'bg-gray-200 text-gray-400',
  Accepted:   'bg-teal-100 text-teal-700',
  Waitlisted: 'bg-orange-100 text-orange-700',
  Rejected:   'bg-red-100 text-red-700',
}

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterOption = { id: string; label: string; options: string[] }

const PROJECT_STATUS_COLORS: Record<string, string> = {
  Ongoing: 'text-green-600 border border-green-500 bg-white',
  Planned: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  Completed: 'bg-blue-100 text-blue-600 border border-blue-200',
}


function loadSLPProjects(): SLPProject[] {
  try {
    const raw = localStorage.getItem(ACTIVITIES_LS_KEY)
    if (raw) {
      const activities = JSON.parse(raw) as Array<{
        id: number; service: string; title: string; date: string
        location?: string; description?: string; status: string
        facilitator?: string; participants?: number
        assistanceAmount?: string; dateReleased?: string
      }>
      const slp = activities.filter(a => a.service === 'SLP')
      if (slp.length > 0) {
        return slp.map(a => ({
          id: a.id,
          title: a.title,
          date: a.date,
          location: a.location ?? '',
          description: a.description ?? '',
          status: a.status as SLPProject['status'],
          facilitator: a.facilitator,
          participants: a.participants,
          assistanceAmount: a.assistanceAmount,
          dateReleased: a.dateReleased,
        }))
      }
    }
  } catch { /* ignore */ }
  return SLP_PROJECTS_SEED
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

function loadBeneficiaries(): LivelihoodBeneficiary[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    const parsed = raw ? (JSON.parse(raw) as LivelihoodBeneficiary[]) : []
    if (parsed.length > 0) return parsed
    const seed = LIVELIHOOD_SEED.filter(b => b.service === 'SLP')
    try { localStorage.setItem(LS_KEY, JSON.stringify(seed)) } catch { /* quota */ }
    return seed
  } catch {
    return LIVELIHOOD_SEED.filter(b => b.service === 'SLP')
  }
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: LivelihoodStatus }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

// ─── Search Bar ───────────────────────────────────────────────────────────────

type SearchBarProps = {
  searchQuery: string
  activeFilters: string[]
  isFilterOpen: boolean
  availableFilters: FilterOption[]
  sortOrder: 'firstName_asc' | 'firstName_desc' | 'lastName_asc' | 'lastName_desc' | ''
  onSearchChange: (v: string) => void
  onToggleFilter: () => void
  onCloseFilter: () => void
  onAddFilter: (id: string) => void
  onSortChange: (v: 'firstName_asc' | 'firstName_desc' | 'lastName_asc' | 'lastName_desc' | '') => void
}

function SearchBar({
  searchQuery, activeFilters, isFilterOpen, availableFilters, sortOrder,
  onSearchChange, onToggleFilter, onCloseFilter, onAddFilter, onSortChange,
}: SearchBarProps) {
  const unselected = availableFilters.filter(f => !activeFilters.includes(f.id))

  return (
    <div className="flex gap-3">
      <div className="relative flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search by name..."
          aria-label="Search SLP beneficiaries"
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-brand-blue placeholder:text-gray-400"
        />
      </div>

      <div className="relative">
        <select
          value={sortOrder}
          onChange={e => onSortChange(e.target.value as typeof sortOrder)}
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

      {/* Filter By */}
      <div className="relative">
        <button
          onClick={onToggleFilter}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-full bg-white hover:bg-gray-50 transition-colors whitespace-nowrap text-sm text-gray-700"
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
    </div>
  )
}

// ─── Filter Badges ────────────────────────────────────────────────────────────

type FilterBadgesProps = {
  activeFilters: string[]
  filterValues: Record<string, string>
  availableFilters: FilterOption[]
  onFilterValueChange: (id: string, value: string) => void
  onRemoveFilter: (id: string) => void
}

function FilterBadges({
  activeFilters, filterValues, availableFilters, onFilterValueChange, onRemoveFilter,
}: FilterBadgesProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  if (activeFilters.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {activeFilters.map(filterId => {
        const filter = availableFilters.find(f => f.id === filterId)
        if (!filter) return null
        const selectedValue = filterValues[filterId] ?? ''
        const isOpen = openDropdown === filterId

        return (
          <div key={filterId} className="relative">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
              <span className="text-sm text-blue-700 font-medium whitespace-nowrap">{filter.label}:</span>
              <button
                type="button"
                onClick={() => setOpenDropdown(isOpen ? null : filterId)}
                className="flex items-center gap-1 text-sm text-blue-700 font-medium"
              >
                <span>{selectedValue || 'All'}</span>
                <ChevronDown size={13} />
              </button>
              <button
                type="button"
                onClick={() => onRemoveFilter(filterId)}
                aria-label={`Remove ${filter.label} filter`}
                className="text-blue-700 hover:text-blue-900 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {isOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                  {filter.options.map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => { onFilterValueChange(filterId, option); setOpenDropdown(null) }}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                        selectedValue === option
                          ? 'bg-blue-100 text-brand-blue font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Assign Project Modal ─────────────────────────────────────────────────────

type AssignProjectModalProps = {
  beneficiary: LivelihoodBeneficiary
  projects: SLPProject[]
  onAssign: (projectName: string, projectId: number) => void
  onUnassign: () => void
  onClose: () => void
}

function AssignProjectModal({ beneficiary, projects, onAssign, onUnassign, onClose }: AssignProjectModalProps) {
  const [search, setSearch] = useState('')

  const currentProject = beneficiary.assignedSlpProjectId
    ? projects.find(p => p.id === beneficiary.assignedSlpProjectId) ?? null
    : null

  const filtered = useMemo(() => {
    const active = projects.filter(p => p.status === 'Planned' || p.status === 'Ongoing')
    if (!search.trim()) return active
    const q = search.toLowerCase()
    return active.filter(p => p.title.toLowerCase().includes(q))
  }, [projects, search])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="bg-brand-blue px-5 pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Assign Project</h2>
              <p className="text-blue-200 text-xs mt-0.5">{beneficiary.name}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="text-white/70 hover:text-white transition-colors mt-0.5"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-4 pt-4">
          {/* Currently Assigned card */}
          {currentProject && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3">
              <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1.5">Currently Assigned</p>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-brand-blue">{currentProject.title}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PROJECT_STATUS_COLORS[currentProject.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {currentProject.status}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { onUnassign(); onClose() }}
                  className="flex-shrink-0 px-2 py-1 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Unassign
                </button>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="assign-project-search"
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search projects..."
              aria-label="Search SLP projects"
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-brand-blue placeholder:text-gray-400"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
            <Info size={11} className="flex-shrink-0" />
            Only SLP projects (Planned and Ongoing) are shown
          </p>
        </div>

        {/* Project list */}
        <div className="px-4 py-2 max-h-56 overflow-y-auto divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 italic text-center py-6">No projects found</p>
          ) : (
            filtered.map(project => {
              const isCurrent = project.id === beneficiary.assignedSlpProjectId
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => { onAssign(project.title, project.id); onClose() }}
                  className="w-full text-left py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-bold text-gray-900">{project.title}</p>
                        {isCurrent && (
                          <span className="px-2 py-0.5 text-xs font-semibold bg-orange-100 text-orange-600 rounded-full">Current</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        SLP &bull; {project.date} &bull; {project.location}
                      </p>
                      {project.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{project.description}</p>
                      )}
                    </div>
                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${PROJECT_STATUS_COLORS[project.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {project.status}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 border border-gray-200 rounded-xl text-xs text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── View Assigned Project Modal ──────────────────────────────────────────────

type ViewAssignedProjectModalProps = {
  beneficiary: LivelihoodBeneficiary
  projects: SLPProject[]
  onChangeAssignment: (b: LivelihoodBeneficiary) => void
  onClose: () => void
}

function ViewAssignedProjectModal({ beneficiary, projects, onChangeAssignment, onClose }: ViewAssignedProjectModalProps) {
  const project = projects.find(p => p.id === beneficiary.assignedSlpProjectId) ?? null

  function Row({ label, value }: { label: string; value?: string }) {
    return (
      <div className="flex justify-between py-2 border-b border-gray-100 last:border-b-0">
        <span className="text-xs text-gray-500 font-medium w-32 flex-shrink-0">{label}</span>
        <span className="text-xs text-gray-900 font-semibold text-right">{value || '-'}</span>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="bg-brand-blue px-5 pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Assigned Project</h2>
              <p className="text-blue-200 text-sm mt-1">{beneficiary.name}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="text-white/70 hover:text-white transition-colors mt-0.5"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {project ? (
            <>
              {/* Project title + status badge */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-bold text-gray-900 text-base">{project.title}</p>
                  <span className="inline-block mt-1 text-xs font-semibold text-gray-500">SLP</span>
                </div>
                <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium ${PROJECT_STATUS_COLORS[project.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {project.status}
                </span>
              </div>

              <div>
                <Row label="Description" value={project.description} />
                <Row label="Date" value={project.date} />
                <Row label="Location" value={project.location} />
                {project.facilitator && <Row label="Facilitator" value={project.facilitator} />}
                {project.participants != null && <Row label="Participants" value={String(project.participants)} />}
                {project.assistanceAmount && <Row label="Assistance Amount" value={`₱${Number(project.assistanceAmount).toLocaleString()}`} />}
                {project.dateReleased && <Row label="Date Released" value={project.dateReleased} />}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 italic text-center py-8">No project details available</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-2 flex gap-2">
          <button
            type="button"
            onClick={() => { onChangeAssignment(beneficiary); onClose() }}
            className="flex-1 py-2.5 border border-brand-blue text-brand-blue rounded-xl text-xs font-semibold hover:bg-blue-50 transition-colors"
          >
            Change Assignment
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-brand-blue text-white rounded-xl text-xs font-semibold hover:bg-brand-blue-dark transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Table ────────────────────────────────────────────────────────────────────

type BeneficiaryTableProps = {
  beneficiaries: LivelihoodBeneficiary[]
  projects: SLPProject[]
  totalCount: number
  isFiltered: boolean
  activeFilters: string[]
  onView: (b: LivelihoodBeneficiary) => void
  onEdit: (b: LivelihoodBeneficiary) => void
  onRemove: (id: number) => void
  onAssignProject: (b: LivelihoodBeneficiary) => void
  onViewAssignedProject: (b: LivelihoodBeneficiary) => void
}

function BeneficiaryTable({ beneficiaries, projects, totalCount, isFiltered, activeFilters, onView, onEdit, onRemove, onAssignProject, onViewAssignedProject }: BeneficiaryTableProps) {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  const totalPages = Math.max(1, Math.ceil(beneficiaries.length / perPage))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = beneficiaries.slice((safePage - 1) * perPage, safePage * perPage)
  const recordStart = beneficiaries.length === 0 ? 0 : (safePage - 1) * perPage + 1
  const recordEnd = Math.min(safePage * perPage, beneficiaries.length)

  function handleToggleMenu(e: React.MouseEvent, id: number) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const menuHeight = 160
    const showAbove = window.innerHeight - rect.bottom < menuHeight + 8
    setMenuPos({
      top: showAbove ? rect.top - menuHeight - 4 : rect.bottom + 4,
      right: window.innerWidth - rect.right,
    })
    setOpenMenuId(openMenuId === id ? null : id)
  }

  function closeMenu() { setOpenMenuId(null) }

  const menuBeneficiary = beneficiaries.find(b => b.id === openMenuId) ?? null

  async function handleConfirmRemove(id: number, name: string) {
    closeMenu()
    const result = await Swal.fire({
      title: 'Remove Beneficiary?',
      text: `This will permanently remove ${name} from the list.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, remove',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
    })
    if (!result.isConfirmed) return
    onRemove(id)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-brand-blue">
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Name</th>
            {activeFilters.includes('sex') && <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Sex</th>}
            {activeFilters.includes('civilStatus') && <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Civil Status</th>}
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Barangay</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Assigned Project</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Date Applied</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Assessment Result</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Status</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody>
          {beneficiaries.length === 0 ? (
            <tr>
              <td colSpan={8 + ['sex', 'civilStatus'].filter(f => activeFilters.includes(f)).length} className="py-16 text-center">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                  </svg>
                  {isFiltered ? (
                    <>
                      <p className="text-base font-medium text-gray-500">No beneficiaries match your filters</p>
                      <p className="text-sm">Try adjusting your search or removing some filters.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-base font-medium text-gray-500">No SLP beneficiaries yet</p>
                      <p className="text-sm">Click "Add Beneficiary" to get started.</p>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            paginated.map((b, idx) => (
              <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">{b.name}</td>
                {activeFilters.includes('sex') && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.sex ?? '—'}</td>}
                {activeFilters.includes('civilStatus') && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.civilStatus ?? '—'}</td>}
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.barangay ?? '-'}</td>
                <td className="px-4 py-3">
                  {b.projectName ? (() => {
                    const proj = projects.find(p => p.id === b.assignedSlpProjectId)
                    return (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm text-gray-800 line-clamp-1">{b.projectName}</span>
                        {proj && (
                          <span className={`self-start px-1.5 py-0.5 rounded-full text-xs font-medium ${PROJECT_STATUS_COLORS[proj.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {proj.status}
                          </span>
                        )}
                      </div>
                    )
                  })() : <span className="text-gray-400 text-xs italic">Not assigned</span>}
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.dateApplied ?? '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {b.assessmentResult ? (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${b.assessmentResult === 'Qualified' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {b.assessmentResult}
                    </span>
                  ) : <span className="text-gray-400 text-xs">—</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={b.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button
                    onClick={e => handleToggleMenu(e, b.id)}
                    aria-label={`Actions for ${b.name}`}
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
      {beneficiaries.length > 0 && (
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
            <span>{recordStart} to {recordEnd} of {beneficiaries.length} records</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {openMenuId !== null && menuPos && menuBeneficiary && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeMenu} />
          <div
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}
            className="w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1"
          >
            <button onClick={() => { onView(menuBeneficiary); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">View</button>
            <button onClick={() => { onEdit(menuBeneficiary); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-brand-blue hover:bg-blue-50">Edit</button>
            {menuBeneficiary.projectName
              ? <button onClick={() => { onViewAssignedProject(menuBeneficiary); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">View Assigned Project</button>
              : <button onClick={() => { onAssignProject(menuBeneficiary); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">Assign Project</button>
            }
            <button onClick={() => handleConfirmRemove(menuBeneficiary.id, menuBeneficiary.name)} className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50">Remove</button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SLPTab() {
  const [beneficiaries, setBeneficiaries] = useState<LivelihoodBeneficiary[]>(loadBeneficiaries)
  const [slpProjects, setSlpProjects] = useState<SLPProject[]>(loadSLPProjects)

  // On mount: sync project statuses and auto-set beneficiaries Inactive when project is Completed.
  useEffect(() => {
    const freshProjects = loadSLPProjects()
    setSlpProjects(freshProjects)

    setBeneficiaries(prev => {
      let changed = false
      const updated = prev.map(b => {
        if (!b.assignedSlpProjectId) return b
        const proj = freshProjects.find(p => p.id === b.assignedSlpProjectId)
        if (proj?.status === 'Completed' && b.status === 'Active') {
          changed = true
          return { ...b, status: 'Inactive' as LivelihoodStatus }
        }
        return b
      })
      if (changed) {
        try { localStorage.setItem(LS_KEY, JSON.stringify(updated)) } catch { /* quota */ }
      }
      return changed ? updated : prev
    })
  }, [])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'firstName_asc' | 'firstName_desc' | 'lastName_asc' | 'lastName_desc' | ''>('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [viewingBeneficiary, setViewingBeneficiary] = useState<LivelihoodBeneficiary | null>(null)
  const [editingBeneficiary, setEditingBeneficiary] = useState<LivelihoodBeneficiary | null>(null)
  const [assigningBeneficiary, setAssigningBeneficiary] = useState<LivelihoodBeneficiary | null>(null)
  const [viewingAssignedProject, setViewingAssignedProject] = useState<LivelihoodBeneficiary | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)

const availableFilters: FilterOption[] = useMemo(() => [
    { id: 'status', label: 'Status', options: STATUS_OPTIONS },
    { id: 'sex', label: 'Sex', options: ['Male', 'Female'] },
    { id: 'civilStatus', label: 'Civil Status', options: ['Single', 'Married', 'Widowed', 'Separated', 'Annulled'] },
  ], [])

  function persist(next: LivelihoodBeneficiary[]) {
    setBeneficiaries(next)
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch { /* quota */ }
  }

  function handleAddBeneficiary(data: Omit<LivelihoodBeneficiary, 'id'>) {
    const newRecord: LivelihoodBeneficiary = { id: Date.now(), ...data }
    persist([...beneficiaries, newRecord])
  }

  function handleEditSave(data: Omit<LivelihoodBeneficiary, 'id'>) {
    if (!editingBeneficiary) return
    persist(beneficiaries.map(b => b.id === editingBeneficiary.id ? { ...b, ...data } : b))
  }

  function handleRemoveBeneficiary(id: number) {
    persist(beneficiaries.filter(b => b.id !== id))
  }

  function handleAssignProject(beneficiary: LivelihoodBeneficiary, projectName: string, projectId: number) {
    persist(beneficiaries.map(b =>
      b.id === beneficiary.id ? { ...b, projectName, assignedSlpProjectId: projectId, status: 'Active' } : b
    ))
  }

  function handleUnassignSLPProject() {
    if (!assigningBeneficiary) return
    persist(beneficiaries.map(b =>
      b.id === assigningBeneficiary.id ? { ...b, projectName: '', assignedSlpProjectId: null, status: 'Inactive' } : b
    ))
    setAssigningBeneficiary(null)
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

  const filtered = useMemo(() => {
    let result = beneficiaries

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(b =>
        b.name.toLowerCase().includes(q) ||
        (b.barangay ?? '').toLowerCase().includes(q) ||
        (b.slpTrack ?? '').toLowerCase().includes(q)
      )
    }

    for (const filterId of activeFilters) {
      const value = filterValues[filterId]
      if (!value) continue
      if (filterId === 'status') result = result.filter(b => b.status === value)
      if (filterId === 'sex') result = result.filter(b => b.sex === value)
      if (filterId === 'civilStatus') result = result.filter(b => b.civilStatus === value)
    }

    return result
  }, [beneficiaries, searchQuery, activeFilters, filterValues])

  const sorted = [...filtered].sort((a, b) => {
    if (!sortOrder) return 0
    const parts = (n: string) => n.trim().split(/\s+/)
    const keyA = (sortOrder.startsWith('firstName') ? parts(a.name)[0] : parts(a.name).at(-1) ?? '').toLowerCase()
    const keyB = (sortOrder.startsWith('firstName') ? parts(b.name)[0] : parts(b.name).at(-1) ?? '').toLowerCase()
    return sortOrder.endsWith('asc') ? keyA.localeCompare(keyB) : keyB.localeCompare(keyA)
  })

  const isFiltered = searchQuery.trim() !== '' || activeFilters.some(f => filterValues[f])

  function buildExportRows() {
    return filtered.map(b => ({
      'Name': b.name,
      'Contact Number': b.contactNumber ?? '',
      'Barangay': b.barangay ?? '',
      'Date Enrolled': b.dateEnrolled ?? '',
      'SLP Track': b.slpTrack ?? '',
      'Grant Amount': b.livelihoodGrantAmount ?? '',
      'Status': b.status,
    }))
  }

  function handleExportExcel() {
    const ws = XLSX.utils.json_to_sheet(buildExportRows())
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'SLP')
    XLSX.writeFile(wb, 'slp_beneficiaries.xlsx')
  }

  function handleExportCsv() {
    const ws = XLSX.utils.json_to_sheet(buildExportRows())
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'slp_beneficiaries.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  if (isAddOpen) {
    return (
      <SLPProfileForm
        mode="add"
        initial={{ ...EMPTY_SLP_RECORD }}
        onSave={data => { handleAddBeneficiary(data); setIsAddOpen(false) }}
        onClose={() => setIsAddOpen(false)}
      />
    )
  }

  if (viewingBeneficiary) {
    return (
      <SLPProfileForm
        key={viewingBeneficiary.id}
        mode="view"
        initial={viewingBeneficiary}
        onSave={() => {}}
        onEdit={() => { setEditingBeneficiary(viewingBeneficiary); setViewingBeneficiary(null) }}
        onClose={() => setViewingBeneficiary(null)}
      />
    )
  }

  if (editingBeneficiary) {
    return (
      <SLPProfileForm
        key={editingBeneficiary.id}
        mode="edit"
        initial={editingBeneficiary}
        onSave={data => { handleEditSave(data); setEditingBeneficiary(null) }}
        onClose={() => setEditingBeneficiary(null)}
      />
    )
  }

  return (
    <div className="space-y-4">
      {assigningBeneficiary && (
        <AssignProjectModal
          beneficiary={assigningBeneficiary}
          projects={slpProjects}
          onAssign={(projectName, projectId) => { handleAssignProject(assigningBeneficiary, projectName, projectId); setAssigningBeneficiary(null) }}
          onUnassign={handleUnassignSLPProject}
          onClose={() => setAssigningBeneficiary(null)}
        />
      )}

      {viewingAssignedProject && (
        <ViewAssignedProjectModal
          beneficiary={viewingAssignedProject}
          projects={slpProjects}
          onChangeAssignment={b => { setViewingAssignedProject(null); setAssigningBeneficiary(b) }}
          onClose={() => setViewingAssignedProject(null)}
        />
      )}

      {/* Top action card */}
      <div className="bg-white rounded-xl shadow-sm px-6 py-4">
        <div className="mb-3">
          <p className="text-gray-800 font-bold text-xl">SLP</p>
          <p className="text-gray-500 text-sm mt-0.5">Sustainable Livelihood Program</p>
        </div>
        <div className="flex items-center gap-3">
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-5 py-2 bg-brand-blue text-white rounded-full text-sm font-medium hover:bg-[#01a0ff] transition-colors whitespace-nowrap"
        >
          <Plus size={16} />
          Add Profile
        </button>

        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-full text-sm text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap">
          <Upload size={16} />
          Import
        </button>

        <div className="relative">
          <button
            onClick={() => setIsExportOpen(o => !o)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-full text-sm text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            <Download size={16} />
            Export
          </button>
          {isExportOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsExportOpen(false)} />
              <div className="absolute left-0 top-full mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                <button
                  onClick={() => { handleExportExcel(); setIsExportOpen(false) }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100"
                >
                  Export as Excel
                </button>
                <button
                  onClick={() => { handleExportCsv(); setIsExportOpen(false) }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Export as CSV
                </button>
              </div>
            </>
          )}
        </div>
        </div>
      </div>

      {/* Main table card */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="mb-4">
          <SearchBar
            searchQuery={searchQuery}
            activeFilters={activeFilters}
            isFilterOpen={isFilterOpen}
            availableFilters={availableFilters}
            sortOrder={sortOrder}
            onSearchChange={setSearchQuery}
            onToggleFilter={() => setIsFilterOpen(o => !o)}
            onCloseFilter={() => setIsFilterOpen(false)}
            onAddFilter={handleAddFilter}
            onSortChange={setSortOrder}
          />
          <FilterBadges
            activeFilters={activeFilters}
            filterValues={filterValues}
            availableFilters={availableFilters}
            onFilterValueChange={handleFilterValueChange}
            onRemoveFilter={handleRemoveFilter}
          />
        </div>

        <BeneficiaryTable
          beneficiaries={sorted}
          projects={slpProjects}
          totalCount={sorted.length}
          isFiltered={isFiltered}
          activeFilters={activeFilters}
          onView={setViewingBeneficiary}
          onEdit={setEditingBeneficiary}
          onRemove={handleRemoveBeneficiary}
          onAssignProject={setAssigningBeneficiary}
          onViewAssignedProject={setViewingAssignedProject}
        />
      </div>
    </div>
  )
}
