import { useState, useMemo, useRef, useLayoutEffect } from 'react'
import { Search, ChevronDown, X, Download, MoreHorizontal, Loader2 } from 'lucide-react'
import ConfirmModal from '../shared/ConfirmModal'
import { useEmployment, type Referral } from '../../contexts/EmploymentContext'
import { updateReferralStatus, deleteReferral } from '../../services/referralService'
import * as XLSX from 'xlsx'
import TablePagination, { EF_ITEMS_PER_PAGE } from './shared/TablePagination'
import { canManage } from '../../utils/permissions'
import { fmtDate } from '../../utils/formatDate'
import { compareByName } from '../../utils/nameSort'
import SharedDocumentsDialog from './shared/SharedDocumentsDialog'
import { logSheetExport } from '../../services/activityLogService'
import { withDateCells } from '../../utils/excelDates'

// ── Filter config ─────────────────────────────────────────────────────────────

type SortOrder = 'firstName_asc' | 'firstName_desc' | 'lastName_asc' | 'lastName_desc' | ''

// 'Hired' triggers placement creation rather than just updating referral status
type ReferralStatusOption = Referral['status'] | 'Hired'
const STATUS_OPTIONS: ReferralStatusOption[] = ['Pending', 'Interviewed', 'Not Hired', 'Hired']
// The status dropdown above the table. "Hired" is not offered: hired referrals leave this list and become placements.
const STATUS_FILTER_OPTIONS: Referral['status'][] = ['Pending', 'Interviewed', 'Not Hired']

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

// ── Search Bar (with Status filter, Sort and Export) ──────────────────────────

type ReferralsSearchBarProps = {
  searchQuery: string
  statusFilter: string
  sortOrder: SortOrder
  onSearchChange: (v: string) => void
  onStatusChange: (v: string) => void
  onSortChange: (v: SortOrder) => void
  onExportExcel: () => void
  isExporting: boolean
}

function ReferralsSearchBar({
  searchQuery,
  statusFilter,
  sortOrder,
  onSearchChange,
  onStatusChange,
  onSortChange,
  onExportExcel,
  isExporting,
}: ReferralsSearchBarProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative flex-1 min-w-48 max-sm:min-w-full">
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

      {/* Status filter: always visible, like the employer portal's */}
      <div className="relative">
        <select
          value={statusFilter}
          onChange={e => onStatusChange(e.target.value)}
          aria-label="Status"
          className="appearance-none pl-4 pr-8 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:border-brand-blue cursor-pointer whitespace-nowrap"
        >
          <option value="">All</option>
          {STATUS_FILTER_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
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

      {/* Export */}
      <button
        onClick={onExportExcel}
        disabled={isExporting}
        className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors whitespace-nowrap text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue"
      >
        {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        {isExporting ? 'Exporting…' : 'Export'}
      </button>
    </div>
  )
}

// ── Table ─────────────────────────────────────────────────────────────────────

type ReferralsTableProps = {
  referrals: Referral[]
  isFiltered: boolean
  onUpdateStatus: (r: Referral) => void
  onShareDocuments: (r: Referral) => void
  onRemove: (id: number) => void | Promise<void>
}

function ReferralsTable({ referrals, isFiltered, onUpdateStatus, onShareDocuments, onRemove }: ReferralsTableProps) {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  // anchor is the button's position; pos is the menu's final placement, corrected
  // by measuring its real rendered height once mounted (see layout effect below).
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; bottom: number; right: number } | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (openMenuId === null || !menuAnchor || !menuRef.current) return
    const height = menuRef.current.getBoundingClientRect().height
    const spaceBelow = window.innerHeight - menuAnchor.bottom
    const showAbove = spaceBelow < height + 8 && menuAnchor.top > height
    const top = Math.max(8, showAbove ? menuAnchor.top - height - 4 : Math.min(menuAnchor.bottom + 4, window.innerHeight - height - 8))
    setMenuPos(prev => (prev && prev.top === top && prev.right === menuAnchor.right) ? prev : { top, right: menuAnchor.right })
  }, [openMenuId, menuAnchor])

  function handleToggleMenu(e: React.MouseEvent, id: number) {
    if (openMenuId === id) {
      setOpenMenuId(null)
      return
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const right = window.innerWidth - rect.right
    // Provisional placement below the trigger; the layout effect corrects it
    // to the real measured height right after it mounts.
    setMenuAnchor({ top: rect.top, bottom: rect.bottom, right })
    setMenuPos({ top: rect.bottom + 4, right })
    setOpenMenuId(id)
  }

  function closeMenu() { setOpenMenuId(null) }

  const menuReferral = referrals.find(r => r.id === openMenuId) ?? null
  const [removeConfirm, setRemoveConfirm] = useState(false)

  function handleConfirmRemove() {
    if (!menuReferral) return
    setRemoveConfirm(true)
  }

  async function proceedRemove() {
    try {
      if (menuReferral) await onRemove(menuReferral.id)
    } finally {
      setRemoveConfirm(false)
      closeMenu()
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-brand-blue">
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Applicant Name</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Job Title</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Employer</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Date Referred</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Status</th>
            <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody>
          {referrals.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-16 text-center">
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
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.employer || '—'}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(r.referralDate)}</td>
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
            ref={menuRef}
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, maxHeight: 'calc(100vh - 16px)' }}
            className="w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1 overflow-y-auto"
          >
            <button onClick={() => { onUpdateStatus(menuReferral); closeMenu() }} disabled={!canManage('employment')} className="w-full px-3 py-2 text-left text-xs text-purple-600 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Update Status</button>
            <button onClick={() => { onShareDocuments(menuReferral); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">Shared Documents</button>
            <button
              onClick={handleConfirmRemove}
              disabled={!canManage('employment')}
              className="w-full px-3 py-2 text-left text-xs text-red-500 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              Remove
            </button>
          </div>
        </>
      )}
      <ConfirmModal
        isOpen={removeConfirm} type="confirm"
        title="Remove Referral?" message={`Remove referral for "${menuReferral?.applicantName}"? This will move the referral to the recycle bin.`}
        confirmText="Yes, Remove" cancelText="Cancel"
        onConfirm={proceedRemove} onCancel={() => setRemoveConfirm(false)}
      />
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
  // The list lives in EmploymentProvider, shared with and kept across the other tabs.
  const { referrals, setReferrals, loading: listLoading, refreshApplicants, refreshPlacements, refreshVacancies } = useEmployment()
  const loading = listLoading.referrals
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('')
  const [statusFilter, setStatusFilter] = useState('')   // '' = All
  const [isExporting, setIsExporting] = useState(false)
  const [updatingReferral, setUpdatingReferral] = useState<Referral | null>(null)
  const [sharingReferral, setSharingReferral] = useState<Referral | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(EF_ITEMS_PER_PAGE)
  const [resultModal, setResultModal] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({ isOpen: false, type: 'success', title: '', message: '' })

  async function handleRemoveReferral(id: number) {
    try {
      await deleteReferral(id)
      setReferrals(prev => prev.filter(r => r.id !== id))
      void refreshApplicants() // the applicant may be free to refer again
      setResultModal({ isOpen: true, type: 'success', title: 'Removed', message: 'The referral has been removed.' })
    } catch (err: unknown) {
      // axiosClient's interceptor flattens backend errors into Error.message.
      const msg = err instanceof Error && err.message ? err.message : 'Failed to remove referral. Please try again.'
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: msg })
    }
  }

  async function handleUpdateStatus(id: number, newStatus: ReferralStatusOption) {
    const name = referrals.find(r => r.id === id)?.applicantName ?? 'The applicant'

    try {
      await updateReferralStatus(id, newStatus)
    } catch (err: unknown) {
      // axiosClient's interceptor flattens backend errors into Error.message.
      const msg = err instanceof Error && err.message ? err.message : 'Failed to update referral status. Please try again.'
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: msg })
      throw err // keep the Update Status modal open so the user can retry
    }

    if (newStatus === 'Hired') {
      // Hired referrals are removed from the list (they become placements)
      setReferrals(prev => prev.filter(r => r.id !== id))
      // Placements and Vacancies are shared lists too, so refresh them now.
      void refreshPlacements()
      void refreshVacancies()
    } else {
      setReferrals(prev => prev.map(r => r.id === id ? { ...r, status: newStatus as Referral['status'] } : r))
    }
    // Every status change can flip the applicant's Refer/Referred/Hired state.
    void refreshApplicants()

    // Customised confirmation per status.
    const notes: Record<ReferralStatusOption, { title: string; text: string }> = {
      Hired:        { title: 'Applicant Hired',  text: `${name} has been hired and moved to Placements.` },
      'Not Hired':  { title: 'Status Updated',   text: `${name} has been marked as Not Hired.` },
      Interviewed:  { title: 'Status Updated',   text: `${name} has been marked as Interviewed.` },
      Pending:      { title: 'Status Updated',   text: `${name}'s referral is now set to Pending.` },
    }
    const note = notes[newStatus]
    setResultModal({ isOpen: true, type: 'success', title: note.title, message: note.text })
  }

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const matched = referrals.filter(r =>
      (!q || r.applicantName.toLowerCase().includes(q) || r.jobTitle.toLowerCase().includes(q) || r.employer.toLowerCase().includes(q))
      && (!statusFilter || r.status === statusFilter),
    )
    if (!sortOrder) return matched

    const by = sortOrder.startsWith('firstName') ? 'first' : 'last'
    const ascending = sortOrder.endsWith('asc')
    return [...matched].sort((a, b) => compareByName(a.applicantName, b.applicantName, by, ascending))
  }, [referrals, searchQuery, statusFilter, sortOrder])

  const isFiltered = searchQuery.trim() !== '' || statusFilter !== ''

  // The page shown never points past the last page (the list can shrink); changing the search, status or sort goes back to page 1 (in the handlers below).
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const page = Math.min(currentPage, totalPages)
  const paginated = useMemo(
    () => filtered.slice((page - 1) * perPage, page * perPage),
    [filtered, page, perPage],
  )

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

  async function handleExportExcel() {
    setIsExporting(true)
    await new Promise(resolve => setTimeout(resolve, 0))
    try {
      const ws = XLSX.utils.json_to_sheet(buildExportRows())
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Referrals')
      XLSX.writeFile(withDateCells(wb), 'referrals.xlsx')
      logSheetExport('employment', 'Referrals list', ws, 1)
    } finally {
      setIsExporting(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-24 text-gray-400 text-sm">Loading referrals…</div>

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="mb-4">
          <ReferralsSearchBar
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            sortOrder={sortOrder}
            onSearchChange={v => { setSearchQuery(v); setCurrentPage(1) }}
            onStatusChange={v => { setStatusFilter(v); setCurrentPage(1) }}
            onSortChange={v => { setSortOrder(v); setCurrentPage(1) }}
            onExportExcel={handleExportExcel}
            isExporting={isExporting}
          />
        </div>

        <ReferralsTable
          referrals={paginated}
          isFiltered={isFiltered}
          onUpdateStatus={setUpdatingReferral}
          onShareDocuments={setSharingReferral}
          onRemove={handleRemoveReferral}
        />
        <TablePagination
          currentPage={page}
          totalItems={filtered.length}
          onPageChange={setCurrentPage}
          itemsPerPage={perPage}
          onItemsPerPageChange={n => { setPerPage(n); setCurrentPage(1) }}
        />
      </div>

      {sharingReferral && (
        <SharedDocumentsDialog
          referralId={sharingReferral.id}
          applicantId={sharingReferral.applicantId}
          applicantName={sharingReferral.applicantName}
          jobTitle={sharingReferral.jobTitle}
          employer={sharingReferral.employer}
          onClose={() => setSharingReferral(null)}
          onSaved={count => {
            setSharingReferral(null)
            setResultModal({ isOpen: true, type: 'success', title: 'Saved', message: count > 0 ? `${count} document${count === 1 ? ' is' : 's are'} now available to the employer.` : 'No documents are shared with the employer for this referral.' })
          }}
        />
      )}
      {updatingReferral && (
        <UpdateStatusModal
          referral={updatingReferral}
          onClose={() => setUpdatingReferral(null)}
          onSave={handleUpdateStatus}
        />
      )}
      <ConfirmModal
        isOpen={resultModal.isOpen} type={resultModal.type} title={resultModal.title} message={resultModal.message}
        confirmText="OK" onConfirm={() => setResultModal(prev => ({ ...prev, isOpen: false }))} onCancel={() => setResultModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}
