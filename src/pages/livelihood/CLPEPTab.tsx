import { useState, useMemo } from 'react'
import { fmtDate } from '../../utils/formatDate'
import { Search, Plus, ChevronDown, X, Download, Upload, MoreHorizontal, Info, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import { canManage } from '../../utils/permissions'
import ConfirmModal from '../shared/ConfirmModal'
import * as clpepService from '../../services/clpepService'
import { useCLPEP } from '../../contexts/CLPEPContext'
import type { CLPEPApplicant, CLPEPIntervention } from '../../contexts/CLPEPContext'
import type { LivelihoodBeneficiary } from '../../contexts/LivelihoodContext'
import CLPEPProfileForm, { EMPTY_CLPEP_RECORD } from './CLPEPProfileForm'
import { downloadImportTemplate, importClpepApplicants, type ImportResult } from './clpepImport'

// ─── Import modal ──────────────────────────────────────────────────────────────

function CLPEPImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
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
      const res = await importClpepApplicants(file, (done, total) => setProgress({ done, total }))
      setResult(res)
      if (res.succeeded > 0) onImported()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the file. Make sure it's a valid .xlsx file.")
    } finally {
      setIsImporting(false)
      setProgress(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <p className="text-gray-800 font-semibold">Import CLPEP Applicants</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {result ? (
            <ImportResultView result={result} />
          ) : (
            <>
              <button onClick={() => { void downloadImportTemplate() }} className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50">Download Template</button>
              <label className={`block w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${file ? 'border-brand-blue bg-blue-50' : 'border-gray-300 hover:border-brand-blue hover:bg-blue-50'}`}>
                <Upload size={28} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 break-all">{file ? file.name : 'Click to upload or drag and drop'}</p>
                <p className="text-xs text-gray-400 mt-1">.xlsx files only</p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  disabled={isImporting}
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
              </label>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              {isImporting && progress && (
                <p className="text-sm text-gray-600 text-center">Importing {progress.done} of {progress.total}…</p>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
          {result ? (
            <button onClick={onClose} className="flex-1 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark text-sm">Done</button>
          ) : (
            <>
              <button onClick={onClose} disabled={isImporting} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm disabled:opacity-50">Cancel</button>
              <button onClick={handleImport} disabled={!file || isImporting} className="flex-1 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark disabled:opacity-50 disabled:cursor-not-allowed">
                {isImporting ? 'Importing…' : 'Import'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

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
        <p className="text-sm text-gray-500 text-center">No applicant rows were found in the file.</p>
      ) : result.failed.length === 0 ? (
        <p className="text-sm text-green-700 text-center">All {result.succeeded} applicant{result.succeeded !== 1 ? 's' : ''} imported successfully.</p>
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

// ─── Constants ────────────────────────────────────────────────────────────────

const INTERVENTION_STATUS_COLORS: Record<string, string> = {
  Ongoing:   'bg-green-100 text-green-700 border border-green-200',
  Planned:   'bg-yellow-100 text-yellow-700 border border-yellow-200',
  Completed: 'bg-blue-100 text-blue-600 border border-blue-200',
}

const STATUS_COLORS: Record<string, string> = {
  Active:    'bg-green-100 text-green-700',
  Completed: 'bg-blue-100 text-blue-700',
  Inactive:  'bg-gray-200 text-gray-400',
}

function errMsg(e: unknown, fallback: string) {
  return (e as { message?: string })?.message ?? fallback
}

function formatDisplayName(b: { lastName: string; firstName: string; middleName?: string; nameExtension?: string }): string {
  const given = [b.firstName, b.middleName, b.nameExtension].filter(Boolean).join(' ')
  return `${b.lastName}, ${given}`
}

function formatTableName(b: { lastName: string; firstName: string; middleName?: string; nameExtension?: string }): string {
  const middleInitial = b.middleName?.trim() ? `${b.middleName.trim().charAt(0)}.` : ''
  const given = [b.firstName, middleInitial, b.nameExtension].filter(Boolean).join(' ')
  return `${b.lastName}, ${given}`
}

// Adapts a CLPEPApplicant (context/API shape) into the generic
// LivelihoodBeneficiary shape CLPEPProfileForm expects -- field names match
// almost 1:1 by design, this just adds the display `name`/`service`.
function toFormRecord(a: CLPEPApplicant): Omit<LivelihoodBeneficiary, 'id'> {
  return {
    ...a,
    name: formatDisplayName(a),
    service: 'CLPEP',
    status: a.status,
    currentlyWorking: a.currentlyWorking ?? undefined,
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterOption = { id: string; label: string; options: string[] }

// ─── Search Bar ───────────────────────────────────────────────────────────────

type SearchBarProps = {
  searchQuery: string
  activeFilters: string[]
  isFilterOpen: boolean
  availableFilters: FilterOption[]
  sortOrder: 'firstName_asc' | 'firstName_desc' | 'lastName_asc' | 'lastName_desc' | 'dateApplied_newest' | 'dateApplied_oldest' | ''
  onSearchChange: (v: string) => void
  onToggleFilter: () => void
  onCloseFilter: () => void
  onAddFilter: (id: string) => void
  onSortChange: (v: 'firstName_asc' | 'firstName_desc' | 'lastName_asc' | 'lastName_desc' | 'dateApplied_newest' | 'dateApplied_oldest' | '') => void
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
          aria-label="Search CLPEP beneficiaries"
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
          <option value="dateApplied_newest">Date Applied (Latest)</option>
          <option value="dateApplied_oldest">Date Applied (Oldest)</option>
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
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
  beneficiary: CLPEPApplicant
  interventions: CLPEPIntervention[]
  onAssign: (id: number) => void
  onUnassign: () => void
  onClose: () => void
  isAssigning: boolean
}

function AssignInterventionModal({ beneficiary, interventions, onAssign, onUnassign, onClose, isAssigning }: AssignInterventionModalProps) {
  const [search, setSearch] = useState('')
  const [confirmIntervention, setConfirmIntervention] = useState<CLPEPIntervention | null>(null)
  const [confirmingAssign, setConfirmingAssign] = useState(false)

  const currentIntervention = beneficiary.assignedInterventionId
    ? interventions.find(i => i.id === beneficiary.assignedInterventionId) ?? null
    : null

  const filtered = useMemo(() => {
    const active = interventions.filter(i => i.status === 'Planned')
    if (!search.trim()) return active
    const q = search.toLowerCase()
    return active.filter(i => i.interventionName.toLowerCase().includes(q))
  }, [interventions, search])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="bg-brand-blue px-6 pt-5 pb-4 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">
                {confirmIntervention ? 'Confirm Assignment' : 'Assign Intervention'}
              </h2>
              <p className="text-blue-200 text-sm mt-0.5">{formatDisplayName(beneficiary)}</p>
            </div>
            <button type="button" onClick={onClose} disabled={isAssigning} aria-label="Close modal" className="text-white/70 hover:text-white transition-colors mt-0.5 disabled:opacity-50 disabled:cursor-not-allowed">
              <X size={20} />
            </button>
          </div>
        </div>

        {confirmIntervention ? (
          <>
            {/* Step 2: confirm details before assigning */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold text-gray-900">{confirmIntervention.interventionName}</p>
                  <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${INTERVENTION_STATUS_COLORS[confirmIntervention.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {confirmIntervention.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>
                    <span className="text-gray-400">Category:</span>{' '}
                    {confirmIntervention.interventionCategory === 'Other' ? (confirmIntervention.interventionCategoryOther || 'Other') : confirmIntervention.interventionCategory}
                  </div>
                  <div><span className="text-gray-400">Date:</span> {confirmIntervention.date || '—'}</div>
                  <div><span className="text-gray-400">Location:</span> {confirmIntervention.location || '—'}</div>
                  <div><span className="text-gray-400">Implementing Officer:</span> {confirmIntervention.implementingOfficer || '—'}</div>
                  <div>
                    <span className="text-gray-400">Partner Agency:</span>{' '}
                    {confirmIntervention.partnerAgency === 'Other' ? (confirmIntervention.partnerAgencyOther || 'Other') : (confirmIntervention.partnerAgency || '—')}
                  </div>
                  {confirmIntervention.targetBeneficiaries !== '' && (
                    <div><span className="text-gray-400">Target Beneficiaries:</span> {confirmIntervention.assignedCount}/{confirmIntervention.targetBeneficiaries}</div>
                  )}
                  {confirmIntervention.description && (
                    <div className="col-span-2"><span className="text-gray-400">Description:</span> {confirmIntervention.description}</div>
                  )}
                </div>
              </div>
              {currentIntervention && currentIntervention.id !== confirmIntervention.id && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
                  This applicant is currently assigned to "{currentIntervention.interventionName}". Assigning will replace the current assignment.
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setConfirmIntervention(null)}
                disabled={isAssigning}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setConfirmingAssign(true)}
                disabled={!canManage('livelihood') || isAssigning}
                className="flex-1 py-2.5 bg-brand-blue text-white rounded-xl text-sm font-semibold hover:bg-brand-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {isAssigning && <Loader2 size={14} className="animate-spin" />}
                {isAssigning ? 'Assigning…' : 'Assign'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="px-6 pt-5 flex-shrink-0">
              {/* Currently Assigned card */}
              {currentIntervention && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                  <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-2">Currently Assigned</p>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-brand-blue">{currentIntervention.interventionName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{currentIntervention.interventionCategory} &bull; {currentIntervention.location}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${INTERVENTION_STATUS_COLORS[currentIntervention.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {currentIntervention.status}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onUnassign}
                      disabled={!canManage('livelihood') || isAssigning}
                      className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {isAssigning && <Loader2 size={12} className="animate-spin" />}
                      {isAssigning ? 'Removing…' : 'Unassign'}
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
                Only CLPEP interventions with <span className="font-semibold">Planned</span> status are shown
              </p>
            </div>

            {/* Intervention list */}
            <div className="flex-1 px-6 py-2 mt-2 overflow-y-auto divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-8">No interventions found</p>
              ) : (
                filtered.map(intervention => {
                  const isCurrent = intervention.id === beneficiary.assignedInterventionId
                  const isFull = intervention.targetBeneficiaries !== '' && intervention.assignedCount >= Number(intervention.targetBeneficiaries) && !isCurrent
                  return (
                    <button
                      key={intervention.id}
                      type="button"
                      disabled={isFull}
                      onClick={() => { if (!isFull) setConfirmIntervention(intervention) }}
                      className="w-full text-left py-3.5 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-gray-900">{intervention.interventionName}</p>
                            {isCurrent && (
                              <span className="px-2 py-0.5 text-xs font-semibold bg-orange-100 text-orange-600 rounded-full">Current</span>
                            )}
                            {isFull && (
                              <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-600 rounded-full">Full</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {intervention.interventionCategory === 'Other' ? (intervention.interventionCategoryOther || 'Other') : intervention.interventionCategory} &bull; {intervention.location}
                            {intervention.targetBeneficiaries !== '' && ` • ${intervention.assignedCount}/${intervention.targetBeneficiaries}`}
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
            <div className="px-6 pb-5 pt-3 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
      <ConfirmModal
        isOpen={confirmingAssign}
        type="confirm"
        title="Confirm Assignment"
        message={confirmIntervention ? `Assign "${confirmIntervention.interventionName}" to ${formatDisplayName(beneficiary)}?` : ''}
        confirmText="Yes, Assign"
        cancelText="Cancel"
        onConfirm={() => { setConfirmingAssign(false); if (confirmIntervention) onAssign(confirmIntervention.id) }}
        onCancel={() => setConfirmingAssign(false)}
      />
    </div>
  )
}

// ─── View Assigned Intervention Modal ─────────────────────────────────────────

type ViewAssignedInterventionModalProps = {
  beneficiary: CLPEPApplicant
  interventions: CLPEPIntervention[]
  onChangeAssignment: (b: CLPEPApplicant) => void
  onClose: () => void
}

function ViewAssignedInterventionModal({ beneficiary, interventions, onChangeAssignment, onClose }: ViewAssignedInterventionModalProps) {
  const intervention = interventions.find(i => i.id === beneficiary.assignedInterventionId) ?? null
  const canChange = intervention?.status === 'Planned'

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
              <p className="text-blue-200 text-sm mt-0.5">{formatDisplayName(beneficiary)}</p>
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
                  <p className="font-bold text-gray-900 text-base">{intervention.interventionName}</p>
                  <span className="inline-block mt-0.5 text-xs font-semibold text-gray-500">
                    {intervention.interventionCategory === 'Other' ? (intervention.interventionCategoryOther || 'Other') : intervention.interventionCategory}
                  </span>
                </div>
                <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${INTERVENTION_STATUS_COLORS[intervention.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {intervention.status}
                </span>
              </div>

              <Row label="Description" value={intervention.description} />
              <Row label="Target Beneficiaries" value={intervention.targetBeneficiaries} />
              <Row label="Date" value={intervention.date} />
              <Row label="Implementing Officer" value={intervention.implementingOfficer} />
              <Row
                label="Partner Agency"
                value={intervention.partnerAgency === 'Other' ? (intervention.partnerAgencyOther || 'Other') : intervention.partnerAgency}
              />
              <Row label="Location" value={intervention.location} />
            </>
          ) : (
            <p className="text-xs text-gray-400 italic text-center py-8">No intervention details available</p>
          )}

          {beneficiary.assignmentHistory.length > 1 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Assignment History</p>
              <div className="space-y-2">
                {beneficiary.assignmentHistory.map((h, i) => (
                  <div key={`${h.interventionId}-${i}`} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700">{h.interventionName}</span>
                    <span className="text-gray-400">{fmtDate(h.assignedDate)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex gap-2">
          {canChange && (
            <button
              type="button"
              onClick={() => { onChangeAssignment(beneficiary); onClose() }}
              disabled={!canManage('livelihood')}
              className="flex-1 py-2.5 border border-brand-blue text-brand-blue rounded-xl text-xs font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Change Assignment
            </button>
          )}
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
  beneficiaries: CLPEPApplicant[]
  totalCount: number
  isFiltered: boolean
  activeFilters: string[]
  onView: (b: CLPEPApplicant) => void
  onEdit: (b: CLPEPApplicant) => void
  onRemove: (id: number, name: string) => void
  onAssignIntervention: (b: CLPEPApplicant) => void
  onViewAssignedIntervention: (b: CLPEPApplicant) => void
}

function BeneficiaryTable({ beneficiaries, isFiltered, activeFilters, onView, onEdit, onRemove, onAssignIntervention, onViewAssignedIntervention }: BeneficiaryTableProps) {
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-brand-blue">
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Name</th>
            {activeFilters.includes('sex') && <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Sex</th>}
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
              <td colSpan={6 + ['sex'].filter(f => activeFilters.includes(f)).length} className="py-16 text-center">
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
            paginated.map(b => (
              <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">{formatTableName(b)}</td>
                {activeFilters.includes('sex') && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.sex || '—'}</td>}
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.barangay || '-'}</td>
                <td className="px-4 py-3">
                  {b.assignedInterventionName ? (
                    <div>
                      <p className="text-gray-800 text-sm font-medium">{b.assignedInterventionName}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${INTERVENTION_STATUS_COLORS[b.assignedInterventionStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                        {b.assignedInterventionStatus}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic text-sm">Not assigned</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(b.dateApplied)}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {b.status}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button
                    onClick={e => handleToggleMenu(e, b.id)}
                    aria-label={`Actions for ${formatDisplayName(b)}`}
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
            <button onClick={() => { onEdit(menuBeneficiary); closeMenu() }} disabled={!canManage('livelihood')} className="w-full px-3 py-2 text-left text-xs text-brand-blue hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Edit</button>
            {menuBeneficiary.assignedInterventionId
              ? <button onClick={() => { onViewAssignedIntervention(menuBeneficiary); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">View Assigned Intervention</button>
              : <button onClick={() => { onAssignIntervention(menuBeneficiary); closeMenu() }} disabled={!canManage('livelihood')} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Assign Intervention</button>
            }
            <button onClick={() => onRemove(menuBeneficiary.id, formatDisplayName(menuBeneficiary))} disabled={!canManage('livelihood')} className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Remove</button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CLPEPTab() {
  const { applicants, interventions, refreshProfiles, refreshInterventions } = useCLPEP()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'firstName_asc' | 'firstName_desc' | 'lastName_asc' | 'lastName_desc' | 'dateApplied_newest' | 'dateApplied_oldest' | ''>('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [viewingBeneficiary, setViewingBeneficiary] = useState<CLPEPApplicant | null>(null)
  const [editingBeneficiary, setEditingBeneficiary] = useState<CLPEPApplicant | null>(null)
  const [assigningBeneficiary, setAssigningBeneficiary] = useState<CLPEPApplicant | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)
  const [viewingAssignedIntervention, setViewingAssignedIntervention] = useState<CLPEPApplicant | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [resultModal, setResultModal] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({ isOpen: false, type: 'success', title: '', message: '' })
  const [removeConfirm, setRemoveConfirm] = useState<{ id: number; name: string } | null>(null)

  const availableFilters: FilterOption[] = useMemo(() => [
    { id: 'sex', label: 'Sex', options: ['Male', 'Female'] },
  ], [])

  async function handleAddBeneficiary(data: Record<string, unknown>) {
    try {
      await clpepService.createProfile(data)
      await refreshProfiles()
      setIsAddOpen(false)
      setResultModal({ isOpen: true, type: 'success', title: 'Success', message: 'Beneficiary profile has been added successfully.' })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: errMsg(e, 'Failed to save profile.') })
    }
  }

  async function handleEditSave(data: Record<string, unknown>) {
    if (!editingBeneficiary) return
    try {
      await clpepService.updateProfile(editingBeneficiary.id, data)
      await refreshProfiles()
      setEditingBeneficiary(null)
      setResultModal({ isOpen: true, type: 'success', title: 'Success', message: 'Beneficiary profile has been updated successfully.' })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: errMsg(e, 'Failed to update profile.') })
    }
  }

  function handleConfirmRemove(id: number, name: string) {
    setRemoveConfirm({ id, name })
  }

  async function proceedRemove() {
    if (!removeConfirm) return
    const { id, name } = removeConfirm
    setRemoveConfirm(null)
    try {
      await clpepService.deleteProfile(id)
      await refreshProfiles()
      setResultModal({ isOpen: true, type: 'success', title: 'Removed', message: `${name} moved to the recycle bin.` })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: errMsg(e, 'Failed to remove beneficiary.') })
    }
  }

  async function handleAssignIntervention(beneficiary: CLPEPApplicant, interventionId: number) {
    if (isAssigning) return
    setIsAssigning(true)
    try {
      await clpepService.assignIntervention(beneficiary.id, interventionId)
      await refreshProfiles()
      await refreshInterventions()
      setAssigningBeneficiary(null)
      setResultModal({ isOpen: true, type: 'success', title: 'Success', message: 'Beneficiary assigned successfully.' })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: errMsg(e, 'Failed to assign intervention.') })
    } finally {
      setIsAssigning(false)
    }
  }

  async function handleUnassignIntervention() {
    if (!assigningBeneficiary || isAssigning) return
    setIsAssigning(true)
    try {
      await clpepService.unassignIntervention(assigningBeneficiary.id)
      await refreshProfiles()
      await refreshInterventions()
      setAssigningBeneficiary(null)
      setResultModal({ isOpen: true, type: 'success', title: 'Removed', message: 'Assigned intervention has been removed.' })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: errMsg(e, 'Failed to remove assignment.') })
    } finally {
      setIsAssigning(false)
    }
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
    let result = applicants
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(b =>
        formatDisplayName(b).toLowerCase().includes(q) ||
        (b.barangay ?? '').toLowerCase().includes(q)
      )
    }
    for (const filterId of activeFilters) {
      const value = filterValues[filterId]
      if (!value) continue
      if (filterId === 'sex') result = result.filter(b => b.sex === value)
    }
    return result
  }, [applicants, searchQuery, activeFilters, filterValues])

  const sorted = [...filtered].sort((a, b) => {
    if (sortOrder === 'dateApplied_newest') return (b.dateApplied || '').localeCompare(a.dateApplied || '')
    if (sortOrder === 'dateApplied_oldest') return (a.dateApplied || '').localeCompare(b.dateApplied || '')
    if (!sortOrder) return 0
    const keyA = (sortOrder.startsWith('firstName') ? a.firstName : a.lastName).toLowerCase()
    const keyB = (sortOrder.startsWith('firstName') ? b.firstName : b.lastName).toLowerCase()
    return sortOrder.endsWith('asc') ? keyA.localeCompare(keyB) : keyB.localeCompare(keyA)
  })

  const isFiltered = searchQuery.trim() !== '' || activeFilters.some(f => filterValues[f])

  function buildExportRows() {
    return filtered.map(b => ({
      'Name': formatDisplayName(b),
      'Sex': b.sex ?? '',
      'Barangay': b.barangay ?? '',
      'Assigned Intervention': b.assignedInterventionName ?? '',
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
      <CLPEPProfileForm
        mode="add"
        initial={{ ...EMPTY_CLPEP_RECORD }}
        onSave={data => handleAddBeneficiary(data)}
        onClose={() => setIsAddOpen(false)}
      />
    )
  }

  if (viewingBeneficiary) {
    return (
      <CLPEPProfileForm
        key={viewingBeneficiary.id}
        mode="view"
        initial={toFormRecord(viewingBeneficiary)}
        onSave={() => {}}
        onEdit={() => { setEditingBeneficiary(viewingBeneficiary); setViewingBeneficiary(null) }}
        onClose={() => setViewingBeneficiary(null)}
      />
    )
  }

  if (editingBeneficiary) {
    return (
      <CLPEPProfileForm
        key={editingBeneficiary.id}
        mode="edit"
        initial={toFormRecord(editingBeneficiary)}
        onSave={data => handleEditSave(data)}
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
          onAssign={interventionId => handleAssignIntervention(assigningBeneficiary, interventionId)}
          onUnassign={handleUnassignIntervention}
          onClose={() => setAssigningBeneficiary(null)}
          isAssigning={isAssigning}
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

      {isImportOpen && (
        <CLPEPImportModal
          onClose={() => setIsImportOpen(false)}
          onImported={refreshProfiles}
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
          disabled={!canManage('livelihood')}
          className="flex items-center gap-2 px-5 py-2 bg-brand-blue text-white rounded-full text-sm font-medium hover:bg-[#01a0ff] transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue"
        >
          <Plus size={16} />
          Add Profile
        </button>
        <button
          onClick={() => setIsImportOpen(true)}
          disabled={!canManage('livelihood')}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-full text-sm text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
        >
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
          totalCount={sorted.length}
          isFiltered={isFiltered}
          activeFilters={activeFilters}
          onView={setViewingBeneficiary}
          onEdit={setEditingBeneficiary}
          onRemove={handleConfirmRemove}
          onAssignIntervention={setAssigningBeneficiary}
          onViewAssignedIntervention={setViewingAssignedIntervention}
        />
      </div>
      <ConfirmModal
        isOpen={removeConfirm !== null} type="confirm"
        title="Remove Beneficiary?" message={removeConfirm ? `This will move ${removeConfirm.name} to the recycle bin.` : ''}
        confirmText="Yes, remove" cancelText="Cancel"
        onConfirm={proceedRemove} onCancel={() => setRemoveConfirm(null)}
      />
      <ConfirmModal
        isOpen={resultModal.isOpen} type={resultModal.type} title={resultModal.title} message={resultModal.message}
        confirmText="OK" onConfirm={() => setResultModal(prev => ({ ...prev, isOpen: false }))} onCancel={() => setResultModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}
