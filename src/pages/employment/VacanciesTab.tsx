import { useState, useMemo } from 'react'
import Swal from 'sweetalert2'
import { Search, Plus, ChevronDown, X, MoreHorizontal } from 'lucide-react'
import type { Vacancy } from '../../contexts/EmploymentContext'
import { VACANCY_SEED } from '../../contexts/EmploymentContext'

const LS_KEY = 'ef_vacancies'

function loadVacancies(): Vacancy[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as Vacancy[]) : VACANCY_SEED
  } catch {
    return VACANCY_SEED
  }
}

type FilterOption = { id: string; label: string; options: string[] }

const AVAILABLE_FILTERS: FilterOption[] = [
  { id: 'industry', label: 'Industry', options: ['Manufacturing', 'Information Technology', 'Agriculture', 'Retail', 'Healthcare', 'Education', 'Construction', 'Hospitality', 'Transportation', 'Financial Services', 'Government', 'Other'] },
  { id: 'jobType', label: 'Job Type', options: ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship'] },
  { id: 'status', label: 'Status', options: ['Open', 'Closed'] },
]

// ── Toolbar ──────────────────────────────────────────────────────────────────

type VacanciesToolbarProps = { onAdd: () => void }

function VacanciesToolbar({ onAdd }: VacanciesToolbarProps) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue text-white rounded-md hover:bg-brand-blue-dark transition-colors text-sm"
      >
        <Plus size={16} />
        Add Vacancy
      </button>
    </div>
  )
}

// ── Search Bar ────────────────────────────────────────────────────────────────

type VacanciesSearchBarProps = {
  searchQuery: string
  activeFilters: string[]
  isFilterOpen: boolean
  onSearchChange: (v: string) => void
  onToggleFilter: () => void
  onCloseFilter: () => void
  onAddFilter: (id: string) => void
}

function VacanciesSearchBar({
  searchQuery,
  activeFilters,
  isFilterOpen,
  onSearchChange,
  onToggleFilter,
  onCloseFilter,
  onAddFilter,
}: VacanciesSearchBarProps) {
  const unselected = AVAILABLE_FILTERS.filter((f) => !activeFilters.includes(f.id))

  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative flex-1 min-w-48">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by job title, employer..."
          aria-label="Search vacancies"
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-brand-blue placeholder:text-gray-400"
        />
      </div>

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
                unselected.map((f) => (
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

// ── Filter Badges ─────────────────────────────────────────────────────────────

type VacanciesFilterBadgesProps = {
  activeFilters: string[]
  filterValues: Record<string, string>
  onFilterValueChange: (id: string, value: string) => void
  onRemoveFilter: (id: string) => void
}

function VacanciesFilterBadges({
  activeFilters,
  filterValues,
  onFilterValueChange,
  onRemoveFilter,
}: VacanciesFilterBadgesProps) {
  if (activeFilters.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {activeFilters.map((filterId) => {
        const filter = AVAILABLE_FILTERS.find((f) => f.id === filterId)
        if (!filter) return null
        return (
          <div
            key={filterId}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full"
          >
            <span className="text-sm text-blue-700 font-medium whitespace-nowrap">{filter.label}:</span>
            <select
              value={filterValues[filterId] ?? ''}
              onChange={(e) => onFilterValueChange(filterId, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="text-sm bg-transparent border-none focus:outline-none text-blue-700 font-medium pr-1 cursor-pointer"
            >
              <option value="">All</option>
              {filter.options.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <button
              onClick={() => onRemoveFilter(filterId)}
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

type VacanciesTableProps = {
  vacancies: Vacancy[]
  activeFilters: string[]
  onView: (v: Vacancy) => void
  onEdit: (v: Vacancy) => void
  onMatch: (v: Vacancy) => void
  onToggleStatus: (id: number, currentStatus: Vacancy['status']) => void
  isFiltered: boolean
}

function StatusBadge({ status }: { status: Vacancy['status'] }) {
  return status === 'Open' ? (
    <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Open</span>
  ) : (
    <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">Closed</span>
  )
}

function VacanciesTable({ vacancies, activeFilters, onView, onEdit, onMatch, onToggleStatus, isFiltered }: VacanciesTableProps) {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)

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

  const menuVacancy = vacancies.find((v) => v.id === openMenuId) ?? null

  async function handleConfirmClose() {
    if (!menuVacancy) return
    const result = await Swal.fire({
      title: 'Close Vacancy?',
      text: `"${menuVacancy.jobTitle}" will no longer accept applicants.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Close',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
    })
    if (!result.isConfirmed) return
    onToggleStatus(menuVacancy.id, menuVacancy.status)
    closeMenu()
  }

  async function handleConfirmReopen() {
    if (!menuVacancy) return
    const result = await Swal.fire({
      title: 'Re-open Vacancy?',
      text: `"${menuVacancy.jobTitle}" will be visible to applicants again.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Re-open',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#0077BE',
      cancelButtonColor: '#6b7280',
    })
    if (!result.isConfirmed) return
    onToggleStatus(menuVacancy.id, menuVacancy.status)
    closeMenu()
  }
  const showIndustry = activeFilters.includes('industry')
  const showJobType = activeFilters.includes('jobType')

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-blue">
              <th className="px-4 py-3 text-left text-white whitespace-nowrap">Job Title</th>
              <th className="px-4 py-3 text-left text-white whitespace-nowrap">Employer</th>
              <th className="px-4 py-3 text-left text-white whitespace-nowrap">Vacancies Count</th>
              <th className="px-4 py-3 text-left text-white whitespace-nowrap">Status</th>
              {showIndustry && <th className="px-4 py-3 text-left text-white whitespace-nowrap">Industry</th>}
              {showJobType && <th className="px-4 py-3 text-left text-white whitespace-nowrap">Job Type</th>}
              <th className="px-4 py-3 text-left text-white whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vacancies.length === 0 ? (
              <tr>
                <td colSpan={100} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-3-3v6M4 6h16M4 10h16M4 14h10" />
                    </svg>
                    {isFiltered ? (
                      <>
                        <p className="text-base font-medium text-gray-500">No vacancies match your filters</p>
                        <p className="text-sm">Try adjusting your search or removing some filters.</p>
                      </>
                    ) : (
                      <>
                        <p className="text-base font-medium text-gray-500">No vacancies yet</p>
                        <p className="text-sm">Add a vacancy to get started.</p>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              vacancies.map((v) => (
                <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">{v.jobTitle}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{v.employer}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{v.vacanciesCount}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={v.status} />
                  </td>
                  {showIndustry && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{v.industry}</td>}
                  {showJobType && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{v.jobType}</td>}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={(e) => handleToggleMenu(e, v.id)}
                      aria-label={`Actions for ${v.jobTitle}`}
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

      {openMenuId !== null && menuPos && menuVacancy && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeMenu} />
          <div
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}
            className="w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1"
          >
            <button onClick={() => { onView(menuVacancy); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">View</button>
            <button onClick={() => { onEdit(menuVacancy); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-brand-blue hover:bg-blue-50">Edit</button>
            <button onClick={() => { onMatch(menuVacancy); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-purple-600 hover:bg-purple-50">Match</button>
            {menuVacancy.status === 'Open' ? (
              <button
                onClick={handleConfirmClose}
                className="w-full px-3 py-2 text-left text-xs text-red-500 hover:bg-red-50"
              >
                Close
              </button>
            ) : (
              <button
                onClick={handleConfirmReopen}
                className="w-full px-3 py-2 text-left text-xs text-green-600 hover:bg-green-50"
              >
                Open
              </button>
            )}
          </div>
        </>
      )}
    </>
  )
}

// ── View Vacancy Modal ────────────────────────────────────────────────────────

function ViewVacancyModal({ vacancy, onClose }: { vacancy: Vacancy; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Vacancy Details</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Job Title</p>
              <p className="text-sm font-medium text-gray-800">{vacancy.jobTitle}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Employer</p>
              <p className="text-sm font-medium text-gray-800">{vacancy.employer}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Industry</p>
              <p className="text-sm font-medium text-gray-800">{vacancy.industry || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Vacancies Count</p>
              <p className="text-sm font-medium text-gray-800">{vacancy.vacanciesCount}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Job Type</p>
              <p className="text-sm font-medium text-gray-800">{vacancy.jobType}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Salary Range</p>
              <p className="text-sm font-medium text-gray-800">{vacancy.salaryRange || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Status</p>
              <StatusBadge status={vacancy.status} />
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">Description</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{vacancy.description || '-'}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">Requirements</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{vacancy.requirements || '-'}</p>
          </div>
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-gray-200">
          <button onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Match Applicants Modal ────────────────────────────────────────────────────

type SimpleApplicant = { id: number; name: string; skills: string; education: string }

function loadApplicantsForMatch(): SimpleApplicant[] {
  try {
    const raw = localStorage.getItem('ef_applicants')
    if (raw) {
      const list = JSON.parse(raw) as Array<{ id: number; name: string; skills: string; education: string }>
      return list.map(a => ({ id: a.id, name: a.name, skills: a.skills ?? '', education: a.education ?? '' }))
    }
  } catch { /* ignore */ }
  return []
}

function MatchApplicantsModal({ vacancy, onClose }: { vacancy: Vacancy; onClose: () => void }) {
  const applicants = loadApplicantsForMatch()
  const [referred, setReferred] = useState<Set<number>>(new Set())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Match Applicants</h3>
            <p className="text-sm text-gray-500 mt-0.5">Vacancy: {vacancy.jobTitle} at {vacancy.employer}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 flex flex-col gap-4 overflow-y-auto">
          <p className="text-sm text-gray-600">
            Showing applicants who might be a good match for this vacancy. You can refer them directly from here.
          </p>

          {applicants.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No applicants found.</p>
          ) : (
            applicants.map(applicant => (
              <div key={applicant.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-sm font-semibold text-gray-800">{applicant.name}</p>
                  {applicant.skills && (
                    <p className="text-sm text-gray-500 mt-0.5">Skills: {applicant.skills}</p>
                  )}
                  {applicant.education && (
                    <p className="text-sm text-gray-500">Education: {applicant.education}</p>
                  )}
                </div>
                <button
                  onClick={() => setReferred(prev => new Set(prev).add(applicant.id))}
                  disabled={referred.has(applicant.id)}
                  className={`flex-shrink-0 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    referred.has(applicant.id)
                      ? 'bg-green-100 text-green-700 cursor-default'
                      : 'bg-brand-blue text-white hover:bg-brand-blue-dark'
                  }`}
                >
                  {referred.has(applicant.id) ? 'Referred' : 'Refer'}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-gray-200">
          <button onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Vacancy Modal ────────────────────────────────────────────────────────

function EditVacancyModal({ vacancy, onClose, onSave }: { vacancy: Vacancy; onClose: () => void; onSave: (v: Vacancy) => void }) {
  const [jobTitle, setJobTitle] = useState(vacancy.jobTitle)
  const [employer, setEmployer] = useState(vacancy.employer)
  const [employerSearch, setEmployerSearch] = useState('')
  const [showEmployerDropdown, setShowEmployerDropdown] = useState(false)
  const [vacanciesCount, setVacanciesCount] = useState(String(vacancy.vacanciesCount))
  const [jobType, setJobType] = useState(vacancy.jobType)
  const [salaryRange, setSalaryRange] = useState(vacancy.salaryRange)
  const [description, setDescription] = useState(vacancy.description)
  const [requirements, setRequirements] = useState(vacancy.requirements)

  const employerNames = loadEmployerNames()
  const filteredEmployers = employerNames.filter(n =>
    n.toLowerCase().includes(employerSearch.toLowerCase())
  )

  const isValid = jobTitle.trim() && employer && vacanciesCount

  function handleSave() {
    if (!isValid) return
    onSave({
      ...vacancy,
      jobTitle: jobTitle.trim(),
      employer,
      vacanciesCount: parseInt(vacanciesCount) || 1,
      jobType,
      salaryRange: salaryRange.trim(),
      description: description.trim(),
      requirements: requirements.trim(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Edit Vacancy</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">Job Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none"
              />
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">Employer <span className="text-red-500">*</span></label>
              <div
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm flex items-center justify-between cursor-pointer focus-within:ring-2 focus-within:ring-brand-blue"
                onClick={() => setShowEmployerDropdown(p => !p)}
              >
                <span className={employer ? 'text-gray-900' : 'text-gray-400'}>{employer || 'Search employer...'}</span>
                <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
              </div>
              {showEmployerDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowEmployerDropdown(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                    <div className="p-2 border-b border-gray-100">
                      <input
                        type="text"
                        value={employerSearch}
                        onChange={e => setEmployerSearch(e.target.value)}
                        placeholder="Search employer..."
                        onClick={e => e.stopPropagation()}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-brand-blue"
                      />
                    </div>
                    {filteredEmployers.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-gray-400">No employers found</p>
                    ) : (
                      filteredEmployers.map(name => (
                        <button key={name} onClick={() => { setEmployer(name); setEmployerSearch(''); setShowEmployerDropdown(false) }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-brand-blue transition-colors">
                          {name}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">Vacancies Count <span className="text-red-500">*</span></label>
              <input
                type="number"
                min={1}
                value={vacanciesCount}
                onChange={e => setVacanciesCount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">Job Type <span className="text-red-500">*</span></label>
              <select
                value={jobType}
                onChange={e => setJobType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900"
              >
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contract</option>
                <option>Freelance</option>
                <option>Internship</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">Salary Range <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={salaryRange}
              onChange={e => setSalaryRange(e.target.value)}
              placeholder="e.g. ₱25,000 - ₱35,000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">Requirements <span className="text-red-500">*</span></label>
            <textarea
              value={requirements}
              onChange={e => setRequirements(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none resize-y"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!isValid}
            className="px-6 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Vacancy Modal ─────────────────────────────────────────────────────────

const EMPLOYER_LS_KEY = 'ef_employers'

function loadEmployerNames(): string[] {
  try {
    const raw = localStorage.getItem(EMPLOYER_LS_KEY)
    if (raw) {
      const list = JSON.parse(raw) as Array<{ companyName: string }>
      return list.map(e => e.companyName)
    }
  } catch { /* ignore */ }
  return ['ABC Corporation', 'TechHub Solutions', 'Green Valley Farm', 'City Hospital', 'XYZ School']
}

type AddVacancyModalProps = {
  onClose: () => void
  onSave: (v: Omit<Vacancy, 'id'>) => void
}

function AddVacancyModal({ onClose, onSave }: AddVacancyModalProps) {
  const [jobTitle, setJobTitle] = useState('')
  const [employer, setEmployer] = useState('')
  const [employerSearch, setEmployerSearch] = useState('')
  const [showEmployerDropdown, setShowEmployerDropdown] = useState(false)
  const [vacanciesCount, setVacanciesCount] = useState('')
  const [jobType, setJobType] = useState('Full-time')
  const [salaryRange, setSalaryRange] = useState('')
  const [description, setDescription] = useState('')
  const [requirements, setRequirements] = useState('')
  const [showFieldErrors, setShowFieldErrors] = useState(false)

  const employerNames = loadEmployerNames()
  const filteredEmployers = employerNames.filter(n =>
    n.toLowerCase().includes(employerSearch.toLowerCase())
  )

  function fieldErr(isEmpty: boolean) { return showFieldErrors && isEmpty }
  function inputCls(isEmpty: boolean) {
    return `w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-400 ${
      fieldErr(isEmpty) ? 'border-red-500 ring-2 ring-red-200 focus:ring-red-300' : 'border-gray-300 focus:ring-brand-blue'
    }`
  }
  function ErrMsg({ show }: { show: boolean }) {
    return show ? <p className="text-red-500 text-xs mt-1">This field is required.</p> : null
  }

  function handleSave() {
    if (!jobTitle.trim() || !employer.trim() || !vacanciesCount) {
      setShowFieldErrors(true)
      return
    }
    onSave({
      jobTitle: jobTitle.trim(),
      employer,
      vacanciesCount: parseInt(vacanciesCount) || 1,
      industry: '',
      jobType,
      salaryRange: salaryRange.trim(),
      description: description.trim(),
      requirements: requirements.trim(),
      status: 'Open',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Add Vacancy</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">Job Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                className={inputCls(!jobTitle.trim())}
              />
              <ErrMsg show={fieldErr(!jobTitle.trim())} />
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">Employer <span className="text-red-500">*</span></label>
              <div
                className={`w-full px-3 py-2 border rounded-lg text-sm flex items-center justify-between cursor-pointer ${
                  fieldErr(!employer) ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus-within:ring-2 focus-within:ring-brand-blue'
                }`}
                onClick={() => setShowEmployerDropdown(p => !p)}
              >
                <span className={employer ? 'text-gray-900' : 'text-gray-400'}>
                  {employer || 'Search employer...'}
                </span>
                <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
              </div>
              <ErrMsg show={fieldErr(!employer)} />
              {showEmployerDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowEmployerDropdown(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                    <div className="p-2 border-b border-gray-100">
                      <input
                        type="text"
                        value={employerSearch}
                        onChange={e => setEmployerSearch(e.target.value)}
                        placeholder="Search employer..."
                        onClick={e => e.stopPropagation()}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-brand-blue"
                      />
                    </div>
                    {filteredEmployers.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-gray-400">No employers found</p>
                    ) : (
                      filteredEmployers.map(name => (
                        <button key={name} onClick={() => { setEmployer(name); setEmployerSearch(''); setShowEmployerDropdown(false) }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-brand-blue transition-colors">
                          {name}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">Vacancies Count <span className="text-red-500">*</span></label>
              <input
                type="number"
                min={1}
                value={vacanciesCount}
                onChange={e => setVacanciesCount(e.target.value)}
                className={inputCls(!vacanciesCount)}
              />
              <ErrMsg show={fieldErr(!vacanciesCount)} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">Job Type <span className="text-red-500">*</span></label>
              <select
                value={jobType}
                onChange={e => setJobType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900"
              >
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contract</option>
                <option>Freelance</option>
                <option>Internship</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">Salary Range</label>
            <input
              type="text"
              value={salaryRange}
              onChange={e => setSalaryRange(e.target.value)}
              placeholder="e.g. ₱25,000 - ₱35,000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none placeholder:text-gray-400 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none resize-y text-gray-900 placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">Requirements</label>
            <textarea
              value={requirements}
              onChange={e => setRequirements(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none resize-y text-gray-900 placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium">
            Cancel
          </button>
          <button onClick={handleSave}
            className="px-6 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark transition-colors font-medium">
            Add Vacancy
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function VacanciesTab() {
  const [vacancies, setVacancies] = useState<Vacancy[]>(loadVacancies)
  const [searchQuery, setSearchQuery] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [viewingVacancy, setViewingVacancy] = useState<Vacancy | null>(null)
  const [editingVacancy, setEditingVacancy] = useState<Vacancy | null>(null)
  const [matchingVacancy, setMatchingVacancy] = useState<Vacancy | null>(null)

  function persist(next: Vacancy[]) {
    setVacancies(next)
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch { /* quota */ }
  }

  function handleAddFilter(id: string) {
    setActiveFilters((prev) => [...prev, id])
  }

  function handleRemoveFilter(id: string) {
    setActiveFilters((prev) => prev.filter((f) => f !== id))
    setFilterValues((prev) => { const n = { ...prev }; delete n[id]; return n })
  }

  function handleFilterValueChange(id: string, value: string) {
    setFilterValues((prev) => ({ ...prev, [id]: value }))
  }

  function handleToggleStatus(id: number, currentStatus: Vacancy['status']) {
    const next: Vacancy['status'] = currentStatus === 'Open' ? 'Closed' : 'Open'
    persist(vacancies.map(v => v.id === id ? { ...v, status: next } : v))
  }

  function handleAddVacancy(data: Omit<Vacancy, 'id'>) {
    const next = [{ id: Date.now(), ...data }, ...vacancies]
    persist(next)
    setShowAddModal(false)
  }

  const filtered = useMemo(() => {
    let result = vacancies

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (v) =>
          v.jobTitle.toLowerCase().includes(q) ||
          v.employer.toLowerCase().includes(q),
      )
    }

    for (const filterId of activeFilters) {
      const value = filterValues[filterId]
      if (!value) continue
      if (filterId === 'status') result = result.filter((v) => v.status === value)
      if (filterId === 'industry') result = result.filter((v) => v.industry === value)
      if (filterId === 'jobType') result = result.filter((v) => v.jobType === value)
    }

    return result
  }, [vacancies, searchQuery, activeFilters, filterValues])

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl shadow-md p-3">
        <VacanciesToolbar onAdd={() => setShowAddModal(true)} />
      </div>

      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="mb-4">
          <VacanciesSearchBar
            searchQuery={searchQuery}
            activeFilters={activeFilters}
            isFilterOpen={isFilterOpen}
            onSearchChange={(v) => setSearchQuery(v)}
            onToggleFilter={() => setIsFilterOpen((o) => !o)}
            onCloseFilter={() => setIsFilterOpen(false)}
            onAddFilter={handleAddFilter}
          />

          {activeFilters.length > 0 && (
            <div className="mt-3">
              <VacanciesFilterBadges
                activeFilters={activeFilters}
                filterValues={filterValues}
                onFilterValueChange={handleFilterValueChange}
                onRemoveFilter={handleRemoveFilter}
              />
            </div>
          )}
        </div>

        <VacanciesTable
          vacancies={filtered}
          activeFilters={activeFilters}
          onView={setViewingVacancy}
          onEdit={setEditingVacancy}
          onMatch={setMatchingVacancy}
          onToggleStatus={handleToggleStatus}
          isFiltered={searchQuery.trim() !== '' || activeFilters.length > 0}
        />
      </div>

      {viewingVacancy && (
        <ViewVacancyModal vacancy={viewingVacancy} onClose={() => setViewingVacancy(null)} />
      )}
      {matchingVacancy && (
        <MatchApplicantsModal vacancy={matchingVacancy} onClose={() => setMatchingVacancy(null)} />
      )}
      {editingVacancy && (
        <EditVacancyModal
          vacancy={editingVacancy}
          onClose={() => setEditingVacancy(null)}
          onSave={updated => {
            persist(vacancies.map(v => v.id === updated.id ? updated : v))
            setEditingVacancy(null)
          }}
        />
      )}
      {showAddModal && (
        <AddVacancyModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddVacancy}
        />
      )}
    </div>
  )
}
