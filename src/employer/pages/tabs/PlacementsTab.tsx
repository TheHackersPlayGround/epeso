// People hired by this company. The employer can ask the PESO to mark a placement Resigned / Terminated / Completed.
import { useMemo, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { listPlacements, submitRequest, withdrawRequest, type ApplicantContext, type Placement, type PromotionInput } from '../../api'
import { Badge, Card, EmptyState, ExportButton, Notice, Spinner, WaitingPill } from '../../components/ui'
import { PromotionRequestDialog, StatusRequestDialog, WithdrawDialog } from '../../components/dialogs'
import { btnSmall, exportToExcel, fmtDate, useData, usePaged } from '../../lib'
import TablePagination from '../../../pages/employment/shared/TablePagination'

const STATUSES = ['Active', 'Resigned', 'Terminated', 'Completed']

export default function PlacementsTab({ tick, onView, onChanged }: { tick: number; onView: (applicantId: number, context: ApplicantContext) => void; onChanged: () => void }) {
  const { data, error, loading, reload } = useData(listPlacements, tick)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [update, setUpdate] = useState<Placement | null>(null)
  const [promote, setPromote] = useState<Placement | null>(null)
  const [withdraw, setWithdraw] = useState<Placement | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null)

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data ?? []).filter(r => (status === 'all' || r.status === status) && (!q || r.applicantName.toLowerCase().includes(q) || (r.jobTitle ?? '').toLowerCase().includes(q)))
  }, [data, search, status])
  const pg = usePaged(rows, `${search}|${status}`)
  // After a promotion the position now differs from the one the person was hired into: show both.
  const promotedFrom = (p: Placement) => (p.hiredAs && p.jobTitle && p.hiredAs.trim().toLowerCase() !== p.jobTitle.trim().toLowerCase() ? p.hiredAs : null)

  async function send(p: Placement, newStatus: string) {
    await submitRequest({ type: 'placement_status', placementId: p.id, payload: { status: newStatus } })
    setUpdate(null); reload(); onChanged()
    setNotice({ type: 'success', title: 'Request sent', message: 'The PESO will review your request. You can follow it under My Requests.' })
  }
  async function sendPromotion(p: Placement, input: PromotionInput) {
    await submitRequest({ type: 'placement_promotion', placementId: p.id, payload: input })
    setPromote(null); reload(); onChanged()
    setNotice({ type: 'success', title: 'Request sent', message: 'The PESO will review your promotion request. You can follow it under My Requests.' })
  }
  async function doWithdraw(p: Placement) {
    if (!p.openRequest) return
    await withdrawRequest(p.openRequest.id)
    setWithdraw(null); reload(); onChanged()
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <div className="relative flex-1 min-w-[14rem]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or position…" aria-label="Search placements"
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
        <ExportButton disabled={rows.length === 0} onExport={() => exportToExcel('placements.xlsx', 'Placements', rows.map(p => ({
          Employee: p.applicantName, Position: p.jobTitle ?? '', 'Hired as': p.hiredAs ?? '', 'Date hired': p.dateHired ? fmtDate(p.dateHired) : '', Status: p.status,
        })))} />
      </div>

      {error && !data && <p role="alert" className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</p>}
      {loading && !data ? <Spinner /> : rows.length === 0 ? (
        <EmptyState title={(data ?? []).length === 0 ? 'No placements yet' : 'No placements match'} hint={(data ?? []).length === 0 ? 'People hired through the PESO will appear here.' : 'Try a different search or status.'} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-brand-blue">
                <th className="px-4 py-3 text-left text-white whitespace-nowrap">Employee</th>
                <th className="px-4 py-3 text-left text-white whitespace-nowrap">Position</th>
                <th className="px-4 py-3 text-left text-white whitespace-nowrap">Date hired</th>
                <th className="px-4 py-3 text-left text-white whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-left text-white whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pg.paged.map(p => (
                <tr key={p.id} className="border-b border-gray-100 align-middle hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{p.applicantName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {p.jobTitle ?? '—'}
                    {promotedFrom(p) && <div className="text-xs text-gray-400 mt-0.5">Hired as {promotedFrom(p)}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(p.dateHired)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge value={p.status} />
                      {p.openRequest && <WaitingPill text={p.openRequest.type === 'placement_promotion' ? 'Promotion requested' : `Requested: ${p.openRequest.requestedStatus}`} title="Waiting for the PESO to decide" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="inline-flex gap-2">
                      <button type="button" onClick={() => onView(p.applicantId, { jobTitle: p.jobTitle, verb: 'Hired', date: p.dateHired, status: p.status, hiredAs: promotedFrom(p) })} className={`${btnSmall} border border-gray-300 text-gray-700 hover:bg-gray-50`}>View details</button>
                      {p.status === 'Active' && !p.openRequest && <button type="button" onClick={() => setUpdate(p)} className={`${btnSmall} bg-brand-blue text-white hover:bg-brand-blue-dark`}>Update status</button>}
                      {p.status === 'Active' && !p.openRequest && <button type="button" onClick={() => setPromote(p)} className={`${btnSmall} border border-brand-blue text-brand-blue hover:bg-blue-50`}>Record promotion</button>}
                      {p.openRequest && <button type="button" onClick={() => setWithdraw(p)} className={`${btnSmall} border border-red-200 text-red-600 hover:bg-red-50`}>Withdraw request</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 0 && <TablePagination currentPage={pg.page} totalItems={pg.total} onPageChange={pg.setPage} itemsPerPage={pg.perPage} onItemsPerPageChange={pg.setPerPage} />}

      {update && (
        <StatusRequestDialog
          title="Update placement status" subject={`${update.applicantName} · ${update.jobTitle ?? ''}`} current={update.status}
          options={['Resigned', 'Terminated', 'Completed']}
          onSubmit={s => send(update, s)}
          onClose={() => setUpdate(null)}
        />
      )}
      {promote && (
        <PromotionRequestDialog
          subject={promote.applicantName} currentTitle={promote.jobTitle ?? ''} dateHired={promote.dateHired}
          onSubmit={input => sendPromotion(promote, input)}
          onClose={() => setPromote(null)}
        />
      )}
      {withdraw && <WithdrawDialog what={withdraw.applicantName} onConfirm={() => doWithdraw(withdraw)} onClose={() => setWithdraw(null)} />}
      {notice && <Notice {...notice} onClose={() => setNotice(null)} />}
    </Card>
  )
}
