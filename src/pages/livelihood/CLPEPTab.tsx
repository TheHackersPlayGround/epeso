import { useState, useMemo } from 'react'
import { Search, Plus, ChevronDown, X, Download, Upload, MoreHorizontal, Info, ChevronLeft, ChevronRight } from 'lucide-react'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'
import type { LivelihoodBeneficiary, LivelihoodStatus, CLPEPIntervention } from '../../contexts/LivelihoodContext'
import { LIVELIHOOD_SEED, CLPEP_INTERVENTIONS_SEED } from '../../contexts/LivelihoodContext'
import AddCLPEPProfileWizard, { EMPTY_CLPEP_RECORD } from './AddCLPEPProfileWizard'

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'lp_clpep_v6'
const LS_INTERVENTIONS_KEY = 'lp_clpep_interventions_v1'

const STATUS_OPTIONS: LivelihoodStatus[] = ['Active', 'Inactive', 'Dropped']

const STATUS_COLORS: Record<LivelihoodStatus, string> = {
  Active:    'bg-green-100 text-green-700',
  Completed: 'bg-blue-100 text-blue-700',
  Dropped:   'bg-red-100 text-red-600',
  Pending:   'bg-yellow-100 text-yellow-700',
  Closed:    'bg-gray-100 text-gray-500',
  Approved:  'bg-emerald-100 text-emerald-700',
  Released:  'bg-purple-100 text-purple-700',
  Inactive:  'bg-gray-200 text-gray-400',
}

const INTERVENTION_STATUS_COLORS: Record<string, string> = {
  Active:    'bg-green-100 text-green-700 border border-green-200',
  Planned:   'bg-yellow-100 text-yellow-700 border border-yellow-200',
  Completed: 'bg-blue-100 text-blue-600 border border-blue-200',
}

function loadInterventions(): CLPEPIntervention[] {
  try {
    const raw = localStorage.getItem(LS_INTERVENTIONS_KEY)
    const parsed = raw ? (JSON.parse(raw) as CLPEPIntervention[]) : []
    if (parsed.length > 0) return parsed
    try { localStorage.setItem(LS_INTERVENTIONS_KEY, JSON.stringify(CLPEP_INTERVENTIONS_SEED)) } catch { /* quota */ }
    return CLPEP_INTERVENTIONS_SEED
  } catch {
    return CLPEP_INTERVENTIONS_SEED
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterOption = { id: string; label: string; options: string[] }

// ─── Data helpers ─────────────────────────────────────────────────────────────

function normalizeStatus(b: LivelihoodBeneficiary): LivelihoodBeneficiary {
  if (b.status === 'Dropped') return b
  return { ...b, status: b.cooperativeName ? 'Active' : 'Inactive' }
}

function loadBeneficiaries(): LivelihoodBeneficiary[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    const parsed = raw ? (JSON.parse(raw) as LivelihoodBeneficiary[]) : []
    if (parsed.length > 0) return parsed.map(normalizeStatus)
    const seed = LIVELIHOOD_SEED.filter(b => b.service === 'CLPEP').map(normalizeStatus)
    try { localStorage.setItem(LS_KEY, JSON.stringify(seed)) } catch { /* quota */ }
    return seed
  } catch {
    return LIVELIHOOD_SEED.filter(b => b.service === 'CLPEP').map(normalizeStatus)
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
  onSearchChange: (v: string) => void
  onToggleFilter: () => void
  onCloseFilter: () => void
  onAddFilter: (id: string) => void
}

function SearchBar({
  searchQuery, activeFilters, isFilterOpen, availableFilters,
  onSearchChange, onToggleFilter, onCloseFilter, onAddFilter,
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
          aria-label="Search CLPEP beneficiaries"
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-brand-blue placeholder:text-gray-400"
        />
      </div>

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

// ─── Assign Intervention Modal ────────────────────────────────────────────────

type AssignInterventionModalProps = {
  beneficiary: LivelihoodBeneficiary
  interventions: CLPEPIntervention[]
  onAssign: (title: string, id: number) => void
  onUnassign: () => void
  onClose: () => void
}

function AssignInterventionModal({ beneficiary, interventions, onAssign, onUnassign, onClose }: AssignInterventionModalProps) {
  const [search, setSearch] = useState('')

  const currentIntervention = beneficiary.assignedInterventionId
    ? interventions.find(i => i.id === beneficiary.assignedInterventionId) ?? null
    : null

  const filtered = useMemo(() => {
    const active = interventions.filter(i => i.status === 'Planned' || i.status === 'Active')
    if (!search.trim()) return active
    const q = search.toLowerCase()
    return active.filter(i => i.title.toLowerCase().includes(q))
  }, [interventions, search])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-brand-blue px-6 pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Assign Intervention</h2>
              <p className="text-blue-200 text-sm mt-0.5">{beneficiary.name}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close modal" className="text-white/70 hover:text-white transition-colors mt-0.5">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-6 pt-5">
          {/* Currently Assigned card */}
          {currentIntervention && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-2">Currently Assigned</p>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-brand-blue">{currentIntervention.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{currentIntervention.type} &bull; {currentIntervention.location}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${INTERVENTION_STATUS_COLORS[currentIntervention.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {currentIntervention.status}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { onUnassign(); onClose() }}
                  className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Unassign
                </button>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search interventions..."
              aria-label="Search CLPEP interventions"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-blue placeholder:text-gray-400"
            />
          </div>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <Info size={12} className="flex-shrink-0" />
            Only CLPEP interventions (Planned and Active) are shown
          </p>
        </div>

        {/* Intervention list */}
        <div className="px-6 py-2 mt-2 max-h-72 overflow-y-auto divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-8">No interventions found</p>
          ) : (
            filtered.map(intervention => {
              const isCurrent = intervention.id === beneficiary.assignedInterventionId
              return (
                <button
                  key={intervention.id}
                  type="button"
                  onClick={() => { onAssign(intervention.title, intervention.id); onClose() }}
                  className="w-full text-left py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-900">{intervention.title}</p>
                        {isCurrent && (
                          <span className="px-2 py-0.5 text-xs font-semibold bg-orange-100 text-orange-600 rounded-full">Current</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {intervention.type} &bull; {intervention.location}
                      </p>
                      {intervention.description && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{intervention.description}</p>
                      )}
                    </div>
                    <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${INTERVENTION_STATUS_COLORS[intervention.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {intervention.status}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── View Assigned Intervention Modal ─────────────────────────────────────────

type ViewAssignedInterventionModalProps = {
  beneficiary: LivelihoodBeneficiary
  interventions: CLPEPIntervention[]
  onChangeAssignment: (b: LivelihoodBeneficiary) => void
  onClose: () => void
}

function ViewAssignedInterventionModal({ beneficiary, interventions, onChangeAssignment, onClose }: ViewAssignedInterventionModalProps) {
  const intervention = interventions.find(i => i.id === beneficiary.assignedInterventionId) ?? null

  function Row({ label, value }: { label: string; value?: string | number | null }) {
    return (
      <div className="flex justify-between py-2 border-b border-gray-100 last:border-b-0">
        <span className="text-xs text-gray-500 font-medium w-36 flex-shrink-0">{label}</span>
        <span className="text-xs text-gray-900 font-semibold text-right">{value != null && value !== '' ? String(value) : '—'}</span>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-brand-blue px-6 pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Assigned Intervention</h2>
              <p className="text-blue-200 text-sm mt-0.5">{beneficiary.name}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close modal" className="text-white/70 hover:text-white transition-colors mt-0.5">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[65vh] overflow-y-auto">
          {intervention ? (
            <>
              {/* Title + type + status */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-bold text-gray-900 text-base">{intervention.title}</p>
                  <span className="inline-block mt-0.5 text-xs font-semibold text-gray-500">{intervention.type}</span>
                </div>
                <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${INTERVENTION_STATUS_COLORS[intervention.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {intervention.status}
                </span>
              </div>

              <Row label="Description" value={intervention.description} />
              <Row label="Target Beneficiaries" value={intervention.targetBeneficiaries} />
              <Row label="Start Date" value={intervention.startDate} />
              <Row label="End Date" value={intervention.endDate} />
              <Row label="Implementing Officer" value={intervention.implementingOfficer} />
              <Row label="Partner Agency" value={intervention.partnerAgency} />
              <Row label="Location" value={intervention.location} />
            </>
          ) : (
            <p className="text-xs text-gray-400 italic text-center py-8">No intervention details available</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex gap-2">
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
  interventions: CLPEPIntervention[]
  totalCount: number
  isFiltered: boolean
  onView: (b: LivelihoodBeneficiary) => void
  onEdit: (b: LivelihoodBeneficiary) => void
  onRemove: (id: number) => void
  onAssignIntervention: (b: LivelihoodBeneficiary) => void
  onViewAssignedIntervention: (b: LivelihoodBeneficiary) => void
}

function BeneficiaryTable({ beneficiaries, interventions, totalCount, isFiltered, onView, onEdit, onRemove, onAssignIntervention, onViewAssignedIntervention }: BeneficiaryTableProps) {
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
    const menuHeight = 140
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
            <td colSpan={8} className="px-4 py-3">
              <p className="text-white font-bold text-sm">Beneficiaries</p>
              <p className="text-blue-200 text-xs">{totalCount} record(s)</p>
            </td>
          </tr>
          <tr className="bg-brand-blue">
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">#</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Name</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Sex</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Barangay</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Assigned Intervention</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Date Applied</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Status</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody>
          {beneficiaries.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-16 text-center">
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
                      <p className="text-base font-medium text-gray-500">No CLPEP beneficiaries yet</p>
                      <p className="text-sm">Click "Add Profile" to get started.</p>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            paginated.map((b, idx) => (
              <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{recordStart + idx}</td>
                <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">{b.name}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.sex ?? '-'}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.barangay ?? '-'}</td>
                <td className="px-4 py-3">
                  {b.cooperativeName ? (
                    <div>
                      <p className="text-gray-800 text-sm font-medium">{b.cooperativeName}</p>
                      {(() => {
                        const iv = interventions.find(i => i.id === b.assignedInterventionId)
                        return iv ? (
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${INTERVENTION_STATUS_COLORS[iv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {iv.status}
                          </span>
                        ) : null
                      })()}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic text-sm">Not assigned</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.dateApplied ?? '-'}</td>
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
            className="w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1"
          >
            <button onClick={() => { onView(menuBeneficiary); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">View</button>
            <button onClick={() => { onEdit(menuBeneficiary); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-brand-blue hover:bg-blue-50">Edit</button>
            {menuBeneficiary.cooperativeName
              ? <button onClick={() => { onViewAssignedIntervention(menuBeneficiary); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">View Assigned Intervention</button>
              : <button onClick={() => { onAssignIntervention(menuBeneficiary); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">Assign Intervention</button>
            }
            <button onClick={() => handleConfirmRemove(menuBeneficiary.id, menuBeneficiary.name)} className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50">Remove</button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CLPEPTab() {
  const [beneficiaries, setBeneficiaries] = useState<LivelihoodBeneficiary[]>(loadBeneficiaries)
  const [interventions] = useState<CLPEPIntervention[]>(loadInterventions)
  const [searchQuery, setSearchQuery] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [viewingBeneficiary, setViewingBeneficiary] = useState<LivelihoodBeneficiary | null>(null)
  const [editingBeneficiary, setEditingBeneficiary] = useState<LivelihoodBeneficiary | null>(null)
  const [assigningBeneficiary, setAssigningBeneficiary] = useState<LivelihoodBeneficiary | null>(null)
  const [viewingAssignedIntervention, setViewingAssignedIntervention] = useState<LivelihoodBeneficiary | null>(null)
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

  function handleAssignIntervention(beneficiary: LivelihoodBeneficiary, title: string, id: number) {
    persist(beneficiaries.map(b =>
      b.id === beneficiary.id ? { ...b, cooperativeName: title, assignedInterventionId: id, status: 'Active' as const } : b
    ))
  }

  function handleUnassignIntervention() {
    if (!assigningBeneficiary) return
    persist(beneficiaries.map(b =>
      b.id === assigningBeneficiary.id ? { ...b, cooperativeName: '', assignedInterventionId: null, status: 'Inactive' as const } : b
    ))
    setAssigningBeneficiary(null)
  }

  function handleAddFilter(id: string) { setActiveFilters(prev => [...prev, id]) }
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
        (b.barangay ?? '').toLowerCase().includes(q)
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

  const isFiltered = searchQuery.trim() !== '' || activeFilters.some(f => filterValues[f])

  function buildExportRows() {
    return filtered.map(b => ({
      'Name': b.name,
      'Sex': b.sex ?? '',
      'Barangay': b.barangay ?? '',
      'Assigned Intervention': b.cooperativeName ?? '',
      'Date Applied': b.dateApplied ?? '',
      'Status': b.status,
    }))
  }

  function handleExportExcel() {
    const ws = XLSX.utils.json_to_sheet(buildExportRows())
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'CLPEP')
    XLSX.writeFile(wb, 'clpep_beneficiaries.xlsx')
  }

  function handleExportCsv() {
    const ws = XLSX.utils.json_to_sheet(buildExportRows())
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'clpep_beneficiaries.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  if (isAddOpen) {
    return (
      <AddCLPEPProfileWizard
        mode="add"
        initial={{ ...EMPTY_CLPEP_RECORD }}
        onSave={data => { handleAddBeneficiary(data); setIsAddOpen(false) }}
        onClose={() => setIsAddOpen(false)}
      />
    )
  }

  if (viewingBeneficiary) {
    return (
      <AddCLPEPProfileWizard
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
      <AddCLPEPProfileWizard
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
        <AssignInterventionModal
          beneficiary={assigningBeneficiary}
          interventions={interventions}
          onAssign={(title, id) => { handleAssignIntervention(assigningBeneficiary, title, id); setAssigningBeneficiary(null) }}
          onUnassign={handleUnassignIntervention}
          onClose={() => setAssigningBeneficiary(null)}
        />
      )}

      {viewingAssignedIntervention && (
        <ViewAssignedInterventionModal
          beneficiary={viewingAssignedIntervention}
          interventions={interventions}
          onChangeAssignment={b => { setViewingAssignedIntervention(null); setAssigningBeneficiary(b) }}
          onClose={() => setViewingAssignedIntervention(null)}
        />
      )}

      {/* Top action card */}
      <div className="bg-white rounded-xl shadow-sm px-6 py-4">
        <div className="mb-3">
          <p className="text-gray-800 font-bold text-xl">CLPEP</p>
          <p className="text-gray-500 text-sm mt-0.5">Child Labor Prevention and Elimination Program</p>
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
                <button onClick={() => { handleExportExcel(); setIsExportOpen(false) }} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100">Export as Excel</button>
                <button onClick={() => { handleExportCsv(); setIsExportOpen(false) }} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50">Export as CSV</button>
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
            onSearchChange={setSearchQuery}
            onToggleFilter={() => setIsFilterOpen(o => !o)}
            onCloseFilter={() => setIsFilterOpen(false)}
            onAddFilter={handleAddFilter}
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
          beneficiaries={filtered}
          interventions={interventions}
          totalCount={filtered.length}
          isFiltered={isFiltered}
          onView={setViewingBeneficiary}
          onEdit={setEditingBeneficiary}
          onRemove={handleRemoveBeneficiary}
          onAssignIntervention={setAssigningBeneficiary}
          onViewAssignedIntervention={setViewingAssignedIntervention}
        />
      </div>

    </div>
  )
}
