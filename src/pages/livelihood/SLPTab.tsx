import { useState, useMemo } from 'react'
import { Search, Plus, ChevronDown, X, Download, MoreHorizontal } from 'lucide-react'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'
import type { LivelihoodBeneficiary, LivelihoodStatus } from '../../contexts/LivelihoodContext'
import { LIVELIHOOD_SEED } from '../../contexts/LivelihoodContext'

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'lp_slp'

const STATUS_OPTIONS: LivelihoodStatus[] = [
  'Active', 'Completed', 'Dropped', 'Pending', 'Approved', 'Released', 'Closed', 'Inactive',
]

const SLP_TRACK_OPTIONS = [
  'Micro-enterprise Development',
  'Employment Facilitation',
  'Community-Based',
]

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

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterOption = { id: string; label: string; options: string[] }

type SLPFormData = {
  name: string
  contactNumber: string
  barangay: string
  dateEnrolled: string
  slpTrack: string
  livelihoodGrantAmount: string
  status: LivelihoodStatus
}

const emptyForm: SLPFormData = {
  name: '',
  contactNumber: '',
  barangay: '',
  dateEnrolled: '',
  slpTrack: '',
  livelihoodGrantAmount: '',
  status: 'Pending',
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

function loadBeneficiaries(): LivelihoodBeneficiary[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    const parsed = raw ? (JSON.parse(raw) as LivelihoodBeneficiary[]) : []
    return parsed.length > 0 ? parsed : LIVELIHOOD_SEED.filter(b => b.service === 'SLP')
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
  onSearchChange: (v: string) => void
  onToggleFilter: () => void
  onCloseFilter: () => void
  onAddFilter: (id: string) => void
  onExportExcel: () => void
  onExportCsv: () => void
  onAdd: () => void
}

function SearchBar({
  searchQuery, activeFilters, isFilterOpen, availableFilters,
  onSearchChange, onToggleFilter, onCloseFilter, onAddFilter,
  onExportExcel, onExportCsv, onAdd,
}: SearchBarProps) {
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
          placeholder="Search SLP beneficiaries..."
          aria-label="Search SLP beneficiaries"
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
          className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 bg-white rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap text-sm text-gray-700"
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

      {/* Add Beneficiary */}
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-full hover:bg-brand-blue-dark transition-colors whitespace-nowrap text-sm font-medium"
      >
        <Plus size={16} />
        Add Beneficiary
      </button>
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
  if (activeFilters.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {activeFilters.map(filterId => {
        const filter = availableFilters.find(f => f.id === filterId)
        if (!filter) return null
        return (
          <div key={filterId} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
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

// ─── Table ────────────────────────────────────────────────────────────────────

type BeneficiaryTableProps = {
  beneficiaries: LivelihoodBeneficiary[]
  isFiltered: boolean
  onView: (b: LivelihoodBeneficiary) => void
  onEdit: (b: LivelihoodBeneficiary) => void
  onRemove: (id: number) => void
}

function BeneficiaryTable({ beneficiaries, isFiltered, onView, onEdit, onRemove }: BeneficiaryTableProps) {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)

  function handleToggleMenu(e: React.MouseEvent, id: number) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const menuHeight = 100
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
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Barangay</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Date Enrolled</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">SLP Track</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Grant Amount</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Status</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody>
          {beneficiaries.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-16 text-center">
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
            beneficiaries.map(b => (
              <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">{b.name}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.barangay ?? '-'}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.dateEnrolled ?? '-'}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.slpTrack ?? '-'}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.livelihoodGrantAmount ?? '-'}</td>
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

      {openMenuId !== null && menuPos && menuBeneficiary && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeMenu} />
          <div
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}
            className="w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1"
          >
            <button onClick={() => { onView(menuBeneficiary); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">View</button>
            <button onClick={() => { onEdit(menuBeneficiary); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-brand-blue hover:bg-blue-50">Edit</button>
            <button onClick={() => handleConfirmRemove(menuBeneficiary.id, menuBeneficiary.name)} className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50">Remove</button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── View Modal ───────────────────────────────────────────────────────────────

function ViewBeneficiaryModal({ beneficiary, onClose }: { beneficiary: LivelihoodBeneficiary; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Beneficiary Details</h3>
          <button onClick={onClose} aria-label="Close beneficiary details" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Name</p>
              <p className="text-sm font-medium text-gray-800">{beneficiary.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Contact Number</p>
              <p className="text-sm font-medium text-gray-800">{beneficiary.contactNumber ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Barangay</p>
              <p className="text-sm font-medium text-gray-800">{beneficiary.barangay ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Date Enrolled</p>
              <p className="text-sm font-medium text-gray-800">{beneficiary.dateEnrolled ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">SLP Track</p>
              <p className="text-sm font-medium text-gray-800">{beneficiary.slpTrack ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Grant Amount</p>
              <p className="text-sm font-medium text-gray-800">{beneficiary.livelihoodGrantAmount ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Status</p>
              <StatusBadge status={beneficiary.status} />
            </div>
          </div>

          {beneficiary.notes && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{beneficiary.notes}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-6 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

type FormModalProps = {
  initial: SLPFormData
  title: string
  onClose: () => void
  onSave: (data: SLPFormData) => void
}

function FormModal({ initial, title, onClose, onSave }: FormModalProps) {
  const [form, setForm] = useState<SLPFormData>(initial)
  const [showErrors, setShowErrors] = useState(false)

  function handleFieldChange(field: keyof SLPFormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleSave() {
    if (!form.name.trim() || !form.dateEnrolled) {
      setShowErrors(true)
      return
    }
    onSave(form)
    onClose()
  }

  function fieldCls(isEmpty: boolean) {
    return `w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent outline-none text-gray-900 ${
      showErrors && isEmpty ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300 focus:ring-brand-blue'
    }`
  }

  function ErrMsg({ show }: { show: boolean }) {
    return show ? <p className="text-red-500 text-xs mt-1">This field is required.</p> : null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} aria-label="Close form" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 grid grid-cols-2 gap-x-6 gap-y-4 overflow-y-auto">
          {/* Name */}
          <div className="col-span-2">
            <label htmlFor="slp-name" className="block text-sm font-medium text-gray-600 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="slp-name"
              type="text"
              value={form.name}
              onChange={e => handleFieldChange('name', e.target.value)}
              className={fieldCls(!form.name.trim())}
            />
            <ErrMsg show={showErrors && !form.name.trim()} />
          </div>

          {/* Contact Number */}
          <div>
            <label htmlFor="slp-contact" className="block text-sm font-medium text-gray-600 mb-1">
              Contact Number
            </label>
            <input
              id="slp-contact"
              type="text"
              value={form.contactNumber}
              onChange={e => handleFieldChange('contactNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900"
            />
          </div>

          {/* Barangay */}
          <div>
            <label htmlFor="slp-barangay" className="block text-sm font-medium text-gray-600 mb-1">
              Barangay
            </label>
            <input
              id="slp-barangay"
              type="text"
              value={form.barangay}
              onChange={e => handleFieldChange('barangay', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900"
            />
          </div>

          {/* Date Enrolled */}
          <div>
            <label htmlFor="slp-date-enrolled" className="block text-sm font-medium text-gray-600 mb-1">
              Date Enrolled <span className="text-red-500">*</span>
            </label>
            <input
              id="slp-date-enrolled"
              type="date"
              value={form.dateEnrolled}
              onChange={e => handleFieldChange('dateEnrolled', e.target.value)}
              className={fieldCls(!form.dateEnrolled)}
            />
            <ErrMsg show={showErrors && !form.dateEnrolled} />
          </div>

          {/* SLP Track */}
          <div>
            <label htmlFor="slp-track" className="block text-sm font-medium text-gray-600 mb-1">
              SLP Track
            </label>
            <select
              id="slp-track"
              value={form.slpTrack}
              onChange={e => handleFieldChange('slpTrack', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900"
            >
              <option value="">— Select Track —</option>
              {SLP_TRACK_OPTIONS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Grant Amount */}
          <div>
            <label htmlFor="slp-grant" className="block text-sm font-medium text-gray-600 mb-1">
              Grant Amount
            </label>
            <input
              id="slp-grant"
              type="text"
              placeholder="e.g. ₱15,000"
              value={form.livelihoodGrantAmount}
              onChange={e => handleFieldChange('livelihoodGrantAmount', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900"
            />
          </div>

          {/* Status */}
          <div>
            <label htmlFor="slp-status" className="block text-sm font-medium text-gray-600 mb-1">
              Status
            </label>
            <select
              id="slp-status"
              value={form.status}
              onChange={e => handleFieldChange('status', e.target.value as LivelihoodStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-6 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors font-medium">
            Cancel
          </button>
          <button onClick={handleSave} className="px-6 py-2 bg-brand-blue text-white rounded-full text-sm hover:bg-brand-blue-dark transition-colors font-medium">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SLPTab() {
  const [beneficiaries, setBeneficiaries] = useState<LivelihoodBeneficiary[]>(loadBeneficiaries)
  const [searchQuery, setSearchQuery] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [viewingBeneficiary, setViewingBeneficiary] = useState<LivelihoodBeneficiary | null>(null)
  const [editingBeneficiary, setEditingBeneficiary] = useState<LivelihoodBeneficiary | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)

  const availableFilters: FilterOption[] = useMemo(() => [
    { id: 'status', label: 'Status', options: STATUS_OPTIONS },
    { id: 'slpTrack', label: 'SLP Track', options: SLP_TRACK_OPTIONS },
  ], [])

  function persist(next: LivelihoodBeneficiary[]) {
    setBeneficiaries(next)
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch { /* quota */ }
  }

  function handleAddBeneficiary(data: SLPFormData) {
    const newRecord: LivelihoodBeneficiary = {
      id: Date.now(),
      service: 'SLP',
      ...data,
    }
    persist([...beneficiaries, newRecord])
  }

  function handleEditSave(data: SLPFormData) {
    if (!editingBeneficiary) return
    persist(beneficiaries.map(b => b.id === editingBeneficiary.id ? { ...b, ...data } : b))
  }

  function handleRemoveBeneficiary(id: number) {
    persist(beneficiaries.filter(b => b.id !== id))
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
      if (filterId === 'slpTrack') result = result.filter(b => b.slpTrack === value)
    }

    return result
  }, [beneficiaries, searchQuery, activeFilters, filterValues])

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

  return (
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
          onExportExcel={handleExportExcel}
          onExportCsv={handleExportCsv}
          onAdd={() => setIsAddOpen(true)}
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
        isFiltered={isFiltered}
        onView={setViewingBeneficiary}
        onEdit={setEditingBeneficiary}
        onRemove={handleRemoveBeneficiary}
      />

      {viewingBeneficiary && (
        <ViewBeneficiaryModal
          beneficiary={viewingBeneficiary}
          onClose={() => setViewingBeneficiary(null)}
        />
      )}

      {editingBeneficiary && (
        <FormModal
          initial={{
            name: editingBeneficiary.name,
            contactNumber: editingBeneficiary.contactNumber ?? '',
            barangay: editingBeneficiary.barangay ?? '',
            dateEnrolled: editingBeneficiary.dateEnrolled ?? '',
            slpTrack: editingBeneficiary.slpTrack ?? '',
            livelihoodGrantAmount: editingBeneficiary.livelihoodGrantAmount ?? '',
            status: editingBeneficiary.status,
          }}
          title="Edit SLP Beneficiary"
          onClose={() => setEditingBeneficiary(null)}
          onSave={handleEditSave}
        />
      )}

      {isAddOpen && (
        <FormModal
          initial={emptyForm}
          title="Add SLP Beneficiary"
          onClose={() => setIsAddOpen(false)}
          onSave={handleAddBeneficiary}
        />
      )}
    </div>
  )
}
