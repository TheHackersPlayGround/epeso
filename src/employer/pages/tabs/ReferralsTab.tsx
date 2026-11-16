// Applicants the PESO referred to this company. The employer can open an applicant's details and ask the PESO
// to mark a referral Interviewed / Hired / Not Hired.
import { useMemo, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { listReferrals, submitRequest, withdrawRequest, type Referral } from '../../api'
import { Badge, Card, EmptyState, ExportButton, Notice, Spinner, WaitingPill } from '../../components/ui'
import { StatusRequestDialog, WithdrawDialog } from '../../components/dialogs'
import { btnSmall, exportToExcel, fmtDate, useData, usePaged } from '../../lib'
import TablePagination from '../../../pages/employment/shared/TablePagination'

const STATUSES = ['Pending', 'Interviewed', 'Hired', 'Not Hired']

export default function ReferralsTab({ tick, onView, onChanged }: { tick: number; onView: (applicantId: number) => void; onChanged: () => void }) {
  const { data, error, loading, reload } = useData(listReferrals, tick)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [update, setUpdate] = useState<Referral | null>(null)
  const [withdraw, setWithdraw] = useState<Referral | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null)

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data ?? []).filter(r => (status === 'all' || r.status === status) && (!q || r.applicantName.toLowerCase().includes(q) || (r.jobTitle ?? '').toLowerCase().includes(q)))
  }, [data, search, status])
  const pg = usePaged(rows, `${search}|${status}`)

  async function send(r: Referral, newStatus: string, dateHired?: string) {
    await submitRequest({ type: 'referral_status', referralId: r.id, payload: { status: newStatus, ...(dateHired ? { dateHired } : {}) } })
    setUpdate(null); reload(); onChanged()
    setNotice({ type: 'success', title: 'Request sent', message: 'The PESO will review your request. You can follow it under My Requests.' })
  }
  async function doWithdraw(r: Referral) {
    if (!r.openRequest) return
    await withdrawRequest(r.openRequest.id)
    setWithdraw(null); reload(); onChanged()
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <div className="relative flex-1 min-w-[14rem]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by applicant or position…" aria-label="Search referrals"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-brand-blue placeholder:text-gray-400" />
        </div>
        <div className="relative">
          <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Status"
            className="appearance-none pl-4 pr-8 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:border-brand-blue cursor-pointer">
            <option value="all">All</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
        {/* Exports what the table shows: the current search and status, every page. */}
        <ExportButton disabled={rows.length === 0} onExport={() => exportToExcel('referrals.xlsx', 'Referrals', rows.map(r => ({
          Applicant: r.applicantName, Position: r.jobTitle ?? '', 'Date referred': r.dateReferred ? fmtDate(r.dateReferred) : '', Status: r.status,
        })))} />
      </div>

      {error && !data && <p role="alert" className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</p>}
      {loading && !data ? <Spinner /> : rows.length === 0 ? (
        <EmptyState title={(data ?? []).length === 0 ? 'No referrals yet' : 'No referrals match'} hint={(data ?? []).length === 0 ? 'Applicants the PESO refers to your company will appear here.' : 'Try a different search or status.'} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-brand-blue">
                <th className="px-4 py-3 text-left text-white whitespace-nowrap">Applicant</th>
                <th className="px-4 py-3 text-left text-white whitespace-nowrap">Position</th>
                <th className="px-4 py-3 text-left text-white whitespace-nowrap">Referred</th>
                <th className="px-4 py-3 text-left text-white whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-left text-white whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pg.paged.map(r => {
                const canUpdate = (r.status === 'Pending' || r.status === 'Interviewed') && !r.openRequest
                return (
                  <tr key={r.id} className="border-b border-gray-100 align-middle hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{r.applicantName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.jobTitle ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(r.dateReferred)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge value={r.status} />
                        {r.openRequest && <WaitingPill text={`Requested: ${r.openRequest.requestedStatus}`} title="Waiting for the PESO to decide" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="inline-flex gap-2">
                        <button type="button" onClick={() => onView(r.applicantId)} className={`${btnSmall} border border-gray-300 text-gray-700 hover:bg-gray-50`}>View details</button>
                        {canUpdate && <button type="button" onClick={() => setUpdate(r)} className={`${btnSmall} bg-brand-blue text-white hover:bg-brand-blue-dark`}>Update status</button>}
                        {r.openRequest && <button type="button" onClick={() => setWithdraw(r)} className={`${btnSmall} border border-red-200 text-red-600 hover:bg-red-50`}>Withdraw request</button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 0 && <TablePagination currentPage={pg.page} totalItems={pg.total} onPageChange={pg.setPage} itemsPerPage={pg.perPage} onItemsPerPageChange={pg.setPerPage} />}

      {update && (
        <StatusRequestDialog
          title="Update referral status" subject={`${update.applicantName} · ${update.jobTitle ?? ''}`} current={update.status}
          options={['Interviewed', 'Hired', 'Not Hired']} allowHireDate
          onSubmit={(s, d) => send(update, s, d)}
          onClose={() => setUpdate(null)}
        />
      )}
      {withdraw && <WithdrawDialog what={`${withdraw.applicantName}`} onConfirm={() => doWithdraw(withdraw)} onClose={() => setWithdraw(null)} />}
      {notice && <Notice {...notice} onClose={() => setNotice(null)} />}
    </Card>
  )
}
