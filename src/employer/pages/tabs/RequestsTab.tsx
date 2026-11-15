// Everything this company asked the PESO for, and what the PESO decided.
import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { listRequests, withdrawRequest, type PortalRequest } from '../../api'
import { Badge, Card, EmptyState, Spinner } from '../../components/ui'
import { RequestDetailsDialog, WithdrawDialog } from '../../components/dialogs'
import { fmtWhen, requestKind, requestSubject, requestSummary, useData, usePaged } from '../../lib'
import TablePagination from '../../../pages/employment/shared/TablePagination'

export default function RequestsTab({ tick, onChanged }: { tick: number; onChanged: () => void }) {
  const { data, error, loading, reload } = useData(listRequests, tick)
  const [withdraw, setWithdraw] = useState<PortalRequest | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data ?? []).filter(r => (status === 'all' || r.status === status) && (!q || [requestKind(r), requestSubject(r), requestSummary(r)].some(v => v.toLowerCase().includes(q))))
  }, [data, search, status])
  const pg = usePaged(rows, `${search}|${status}`)
  const detail = detailId !== null ? (data ?? []).find(r => r.id === detailId) ?? null : null   // looked up again each time the list refreshes

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <div className="relative flex-1 min-w-[14rem]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search requests…" aria-label="Search requests"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-brand-blue placeholder:text-gray-400" />
        </div>
        <div className="relative">
          <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Status"
            className="appearance-none pl-4 pr-8 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:border-brand-blue cursor-pointer">
            <option value="all">All</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Withdrawn">Withdrawn</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {error && !data && <p role="alert" className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</p>}
      {loading && !data ? <Spinner /> : rows.length === 0 ? (
        (data ?? []).length === 0
          ? <EmptyState title="No requests yet" hint="When you ask the PESO to update a referral, a placement or your company details, it shows up here." />
          : <EmptyState title="No requests match" hint="Try a different search or status." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-brand-blue">
                <th className="px-4 py-3 text-left text-white whitespace-nowrap">Request</th>
                <th className="px-4 py-3 text-left text-white whitespace-nowrap">Change</th>
                <th className="px-4 py-3 text-left text-white whitespace-nowrap">Sent</th>
                <th className="px-4 py-3 text-left text-white whitespace-nowrap">Decision</th>
                <th className="w-10" aria-label="Open details" />
              </tr>
            </thead>
            <tbody>
              {pg.paged.map(r => (
                <tr key={r.id} onClick={() => setDetailId(r.id)} onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) setDetailId(r.id) }} tabIndex={0}
                  aria-label={`${requestKind(r)}: open details`} className="border-b border-gray-100 align-top hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-800 m-0">{requestKind(r)}</p>
                    {requestSubject(r) && <p className="text-xs text-gray-500 m-0 mt-0.5">{requestSubject(r)}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700" title={requestSummary(r)}>{requestSummary(r)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtWhen(r.submittedAt)}</td>
                  <td className="px-4 py-3">
                    <Badge value={r.status} />
                    {r.status === 'Pending' && <p className="text-xs text-gray-400 m-0 mt-1">Waiting for the PESO</p>}
                    {(r.status === 'Approved' || r.status === 'Rejected') && r.reviewedAt && <p className="text-xs text-gray-400 m-0 mt-1">{fmtWhen(r.reviewedAt)}</p>}
                  </td>
                  <td className="pr-3 text-gray-300 align-middle"><ChevronRight size={16} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 0 && <TablePagination currentPage={pg.page} totalItems={pg.total} onPageChange={pg.setPage} itemsPerPage={pg.perPage} onItemsPerPageChange={pg.setPerPage} />}
      {detail && (
        <RequestDetailsDialog r={detail} onClose={() => setDetailId(null)} onWithdraw={() => { setDetailId(null); setWithdraw(detail) }} />
      )}
      {withdraw && (
        <WithdrawDialog what={`the ${requestKind(withdraw).toLowerCase()}${requestSubject(withdraw) ? ` “${requestSubject(withdraw)}”` : ''}`} onClose={() => setWithdraw(null)}
          onConfirm={async () => { await withdrawRequest(withdraw.id); setWithdraw(null); reload(); onChanged() }} />
      )}
    </Card>
  )
}
