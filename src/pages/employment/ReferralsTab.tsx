import { useState, useMemo } from 'react'
import { Search, Plus, ChevronDown, X, Download, MoreHorizontal } from 'lucide-react'
import Swal from 'sweetalert2'
// Plus is used only by the Filter By button
import type { Referral, Placement } from '../../contexts/EmploymentContext'
import { REFERRAL_SEED, VACANCY_SEED } from '../../contexts/EmploymentContext'
import * as XLSX from 'xlsx'

const LS_KEY = 'ef_referrals'

// ── Data loaders ──────────────────────────────────────────────────────────────

function loadReferrals(): Referral[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return REFERRAL_SEED
    const parsed = JSON.parse(raw) as Array<Referral & { status: string }>
    // Filter out any legacy 'Hired' records — those now live in ef_placements
    const valid = parsed.filter(r => r.status !== 'Hired') as Referral[]
    return valid.length > 0 ? valid : REFERRAL_SEED
  } catch {
    return REFERRAL_SEED
  }
}

type SimpleApplicant = { id: number; name: string }
type SimpleVacancy = { id: number; jobTitle: string; employer: string }

function loadApplicantsForReferral(): SimpleApplicant[] {
  try {
    const raw = localStorage.getItem('ef_applicants')
    if (raw) {
      const list = JSON.parse(raw) as Array<{ id: number; name: string }>
      return list.map(a => ({ id: a.id, name: a.name }))
    }
  } catch { /* ignore */ }
  return []
}

function loadVacanciesForReferral(): SimpleVacancy[] {
  try {
    const raw = localStorage.getItem('ef_vacancies')
    if (raw) {
      const list = JSON.parse(raw) as Array<{ id: number; jobTitle: string; employer: string; status: string }>
      return list
        .filter(v => v.status !== 'Closed')
        .map(v => ({ id: v.id, jobTitle: v.jobTitle, employer: v.employer }))
    }
  } catch { /* ignore */ }
  return []
}

// ── Filter config ─────────────────────────────────────────────────────────────

type FilterOption = { id: string; label: string; options: string[] }

// 'Hired' triggers a move to Placements rather than updating referral status
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
  onSearchChange: (v: string) => void
  onToggleFilter: () => void
  onCloseFilter: () => void
  onAddFilter: (id: string) => void
  onExportExcel: () => void
  onExportCsv: () => void
}

function ReferralsSearchBar({
  searchQuery,
  activeFilters,
  isFilterOpen,
  availableFilters,
  onSearchChange,
  onToggleFilter,
  onCloseFilter,
  onAddFilter,
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
  onUpdateStatus: (r: Referral) => void
  onRemove: (id: number) => void
}

function ReferralsTable({ referrals, isFiltered, onUpdateStatus, onRemove }: ReferralsTableProps) {
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

  function formatDate(dateStr: string) {
    if (!dateStr) return '-'
    return dateStr
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
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody>
          {referrals.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-16 text-center">
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
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(r.referralDate)}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <ReferralStatusBadge status={r.status} />
                </td>
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

// ── View Referral Modal ───────────────────────────────────────────────────────

function ViewReferralModal({ referral, onClose }: { referral: Referral; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Referral Details</h3>
          <button
            onClick={onClose}
            aria-label="Close referral details"
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Applicant Name</p>
              <p className="text-sm font-medium text-gray-800">{referral.applicantName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Job Title</p>
              <p className="text-sm font-medium text-gray-800">{referral.jobTitle}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Employer</p>
              <p className="text-sm font-medium text-gray-800">{referral.employer || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Date Referred</p>
              <p className="text-sm font-medium text-gray-800">{referral.referralDate || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Status</p>
              <ReferralStatusBadge status={referral.status} />
            </div>
          </div>

          {referral.notes && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{referral.notes}</p>
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

// ── Update Status Modal ───────────────────────────────────────────────────────

type UpdateStatusModalProps = {
  referral: Referral
  onClose: () => void
  onSave: (id: number, newStatus: ReferralStatusOption) => void
}

function UpdateStatusModal({ referral, onClose, onSave }: UpdateStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<ReferralStatusOption>(referral.status)

  function handleSave() {
    onSave(referral.id, selectedStatus)
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
            className="px-6 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark transition-colors font-medium"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Referral Modal ────────────────────────────────────────────────────────

type AddReferralModalProps = {
  onClose: () => void
  onSave: (data: Omit<Referral, 'id'>) => void
}

function AddReferralModal({ onClose, onSave }: AddReferralModalProps) {
  const applicants = loadApplicantsForReferral()
  const vacancies = loadVacanciesForReferral()

  const today = new Date().toISOString().slice(0, 10)

  const [selectedApplicantId, setSelectedApplicantId] = useState<number | null>(null)
  const [applicantSearch, setApplicantSearch] = useState('')
  const [showApplicantDropdown, setShowApplicantDropdown] = useState(false)

  const [selectedVacancyId, setSelectedVacancyId] = useState<number | null>(null)
  const [vacancySearch, setVacancySearch] = useState('')
  const [showVacancyDropdown, setShowVacancyDropdown] = useState(false)

  const [referralDate, setReferralDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [showFieldErrors, setShowFieldErrors] = useState(false)

  const selectedApplicant = applicants.find(a => a.id === selectedApplicantId) ?? null
  const selectedVacancy = vacancies.find(v => v.id === selectedVacancyId) ?? null

  const filteredApplicants = applicants.filter(a =>
    a.name.toLowerCase().includes(applicantSearch.toLowerCase())
  )
  const filteredVacancies = vacancies.filter(v =>
    `${v.jobTitle} ${v.employer}`.toLowerCase().includes(vacancySearch.toLowerCase())
  )

  function fieldErr(isEmpty: boolean) { return showFieldErrors && isEmpty }

  function dropdownCls(isEmpty: boolean) {
    return `w-full px-3 py-2 border rounded-lg text-sm flex items-center justify-between cursor-pointer ${
      fieldErr(isEmpty)
        ? 'border-red-500 ring-2 ring-red-200'
        : 'border-gray-300 focus-within:ring-2 focus-within:ring-brand-blue'
    }`
  }

  function ErrMsg({ show }: { show: boolean }) {
    return show ? <p className="text-red-500 text-xs mt-1">This field is required.</p> : null
  }

  function handleSave() {
    if (!selectedApplicantId || !selectedVacancyId || !referralDate) {
      setShowFieldErrors(true)
      return
    }

    onSave({
      applicantId: selectedApplicant!.id,
      applicantName: selectedApplicant!.name,
      vacancyId: selectedVacancy!.id,
      jobTitle: selectedVacancy!.jobTitle,
      employer: selectedVacancy!.employer,
      referralDate,
      status: 'Pending',
      notes: notes.trim(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Add Referral</h3>
          <button
            onClick={onClose}
            aria-label="Close add referral modal"
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">

          {/* Applicant dropdown */}
          <div>
            <label htmlFor="referral-applicant" className="block text-xs font-semibold uppercase text-gray-700 mb-1">
              Applicant <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div
                id="referral-applicant"
                className={dropdownCls(!selectedApplicantId)}
                onClick={() => setShowApplicantDropdown(p => !p)}
              >
                <span className={selectedApplicant ? 'text-gray-900' : 'text-gray-400'}>
                  {selectedApplicant ? selectedApplicant.name : 'Select an applicant...'}
                </span>
                <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
              </div>
              <ErrMsg show={fieldErr(!selectedApplicantId)} />

              {showApplicantDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowApplicantDropdown(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                    <div className="p-2 border-b border-gray-100">
                      <input
                        type="text"
                        value={applicantSearch}
                        onChange={e => setApplicantSearch(e.target.value)}
                        placeholder="Search applicant..."
                        onClick={e => e.stopPropagation()}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-brand-blue"
                      />
                    </div>
                    {filteredApplicants.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-gray-400">No applicants found</p>
                    ) : (
                      filteredApplicants.map(a => (
                        <button
                          key={a.id}
                          onClick={() => { setSelectedApplicantId(a.id); setApplicantSearch(''); setShowApplicantDropdown(false) }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-brand-blue transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          {a.name}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Vacancy dropdown */}
          <div>
            <label htmlFor="referral-vacancy" className="block text-xs font-semibold uppercase text-gray-700 mb-1">
              Job Vacancy <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div
                id="referral-vacancy"
                className={dropdownCls(!selectedVacancyId)}
                onClick={() => setShowVacancyDropdown(p => !p)}
              >
                <span className={selectedVacancy ? 'text-gray-900' : 'text-gray-400'}>
                  {selectedVacancy
                    ? `${selectedVacancy.jobTitle} – ${selectedVacancy.employer}`
                    : 'Select a vacancy...'}
                </span>
                <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
              </div>
              <ErrMsg show={fieldErr(!selectedVacancyId)} />

              {showVacancyDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowVacancyDropdown(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                    <div className="p-2 border-b border-gray-100">
                      <input
                        type="text"
                        value={vacancySearch}
                        onChange={e => setVacancySearch(e.target.value)}
                        placeholder="Search vacancy..."
                        onClick={e => e.stopPropagation()}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-brand-blue"
                      />
                    </div>
                    {filteredVacancies.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-gray-400">No open vacancies found</p>
                    ) : (
                      filteredVacancies.map(v => (
                        <button
                          key={v.id}
                          onClick={() => { setSelectedVacancyId(v.id); setVacancySearch(''); setShowVacancyDropdown(false) }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-brand-blue transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <span className="font-medium">{v.jobTitle}</span>
                          <span className="text-gray-400"> – {v.employer}</span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Date Referred */}
          <div>
            <label htmlFor="referral-date" className="block text-xs font-semibold uppercase text-gray-700 mb-1">
              Date Referred <span className="text-red-500">*</span>
            </label>
            <input
              id="referral-date"
              type="date"
              value={referralDate}
              onChange={e => setReferralDate(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent outline-none text-gray-900 ${
                fieldErr(!referralDate)
                  ? 'border-red-500 ring-2 ring-red-200'
                  : 'border-gray-300 focus:ring-brand-blue'
              }`}
            />
            <ErrMsg show={fieldErr(!referralDate)} />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="referral-notes" className="block text-xs font-semibold uppercase text-gray-700 mb-1">
              Notes <span className="text-gray-400 font-normal normal-case">(optional)</span>
            </label>
            <textarea
              id="referral-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Any additional notes about this referral..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none resize-y text-gray-900 placeholder:text-gray-400"
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
            className="px-6 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark transition-colors font-medium"
          >
            Add Referral
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ReferralsTab() {
  const [referrals, setReferrals] = useState<Referral[]>(loadReferrals)
  const [searchQuery, setSearchQuery] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [updatingReferral, setUpdatingReferral] = useState<Referral | null>(null)

  // Employer filter options built from current referral records
  const availableFilters: FilterOption[] = useMemo(() => {
    const employers = [...new Set(referrals.map(r => r.employer).filter(Boolean))].sort()
    return [
      { id: 'status', label: 'Status', options: FILTER_STATUS_OPTIONS },
      { id: 'employer', label: 'Employer', options: employers },
    ]
  }, [referrals])

  function persist(next: Referral[]) {
    setReferrals(next)
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

  function handleRemoveReferral(id: number) {
    persist(referrals.filter(r => r.id !== id))
  }

  function handleUpdateStatus(id: number, newStatus: ReferralStatusOption) {
    if (newStatus === 'Hired') {
      const referral = referrals.find(r => r.id === id)
      if (!referral) return
      // Look up vacancy to capture employmentType and salaryRange
      let employmentType = ''
      let salaryRange = ''
      try {
        const rawVac = localStorage.getItem('ef_vacancies')
        const vacList = rawVac ? JSON.parse(rawVac) : VACANCY_SEED
        const vac = vacList.find((v: { id: number; jobType?: string; salaryRange?: string }) => v.id === referral.vacancyId)
        if (vac) { employmentType = vac.jobType ?? ''; salaryRange = vac.salaryRange ?? '' }
      } catch { /* ignore */ }
      const newPlacement: Placement = {
        id: Date.now(),
        applicantId: referral.applicantId,
        applicantName: referral.applicantName,
        jobTitle: referral.jobTitle,
        employer: referral.employer,
        dateHired: new Date().toISOString().slice(0, 10),
        status: 'Active',
        employmentType,
        source: 'Referral',
        referralId: referral.id,
        vacancyId: referral.vacancyId,
        salaryRange,
        notes: referral.notes ?? '',
      }
      try {
        const raw = localStorage.getItem('ef_placements')
        const existing: Placement[] = raw ? JSON.parse(raw) : []
        localStorage.setItem('ef_placements', JSON.stringify([newPlacement, ...existing]))
      } catch { /* quota */ }
      persist(referrals.filter(r => r.id !== id))
      return
    }
    persist(referrals.map(r => r.id === id ? { ...r, status: newStatus } : r))
  }

  // ── Export helpers ─────────────────────────────────────────────────────────

  function buildExportRows() {
    return filtered.map(r => ({
      'Applicant Name': r.applicantName,
      'Job Title': r.jobTitle,
      'Employer': r.employer,
      'Date Referred': r.referralDate,
      'Status': r.status,
      'Notes': r.notes ?? '',
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

    return result
  }, [referrals, searchQuery, activeFilters, filterValues])

  const isFiltered = searchQuery.trim() !== '' || activeFilters.some(f => filterValues[f])

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="mb-4">
          <ReferralsSearchBar
            searchQuery={searchQuery}
            activeFilters={activeFilters}
            isFilterOpen={isFilterOpen}
            availableFilters={availableFilters}
            onSearchChange={v => setSearchQuery(v)}
            onToggleFilter={() => setIsFilterOpen(o => !o)}
            onCloseFilter={() => setIsFilterOpen(false)}
            onAddFilter={handleAddFilter}
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
          referrals={filtered}
          isFiltered={isFiltered}
          onUpdateStatus={setUpdatingReferral}
          onRemove={handleRemoveReferral}
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
