// This company's job openings. The employer can ask the PESO to add a new opening, or to change or close one of theirs;
// nothing changes until the PESO accepts the request.
import { useMemo, useState } from 'react'
import { ChevronDown, Loader2, Plus, Search } from 'lucide-react'
import { listRequests, listVacancies, submitRequest, withdrawRequest, type PortalRequest, type Vacancy } from '../../api'
import { Badge, Card, Dialog, EmptyState, Notice, Spinner, WaitingPill } from '../../components/ui'
import { WithdrawDialog } from '../../components/dialogs'
import TablePagination from '../../../pages/employment/shared/TablePagination'
import { btnGhost, btnPrimary, btnSmall, errText, inputCls, labelCls, useData, usePaged } from '../../lib'

const peso = (n: number | null) => (n === null ? null : `₱${n.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`)
function salary(min: number | null, max: number | null) {
  if (min === null && max === null) return '—'
  if (min !== null && max !== null) return min === max ? peso(min) : `${peso(min)} – ${peso(max)}`
  return peso(min ?? max)
}
const numOrNull = (v: unknown) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v))

interface Form {
  jobTitle: string; jobType: string; description: string; requirements: string
  salaryMin: string; salaryMax: string; slotsTotal: string; status: string
}
const EMPTY: Form = { jobTitle: '', jobType: 'Full-time', description: '', requirements: '', salaryMin: '', salaryMax: '', slotsTotal: '1', status: 'Open' }
const fromVacancy = (v: Vacancy): Form => ({
  jobTitle: v.jobTitle, jobType: v.jobType ?? 'Full-time', description: v.description ?? '', requirements: v.requirements ?? '',
  salaryMin: v.salaryMin !== null ? String(v.salaryMin) : '', salaryMax: v.salaryMax !== null ? String(v.salaryMax) : '',
  slotsTotal: v.slotsTotal !== null ? String(v.slotsTotal) : '1', status: v.status ?? 'Open',
})

// One table row: an opening the PESO recorded, or a new opening the employer asked for that the PESO has not decided yet.
interface Row {
  key: string; title: string; jobType: string | null; salary: string; hired: string; description: string; requirements: string
  status: string | null          // null = a new opening still waiting for the PESO
  requestedByYou: boolean
  vacancy: Vacancy | null        // set for openings the PESO recorded
  openRequestId: number | null   // a request waiting for the PESO (changes, or the new opening itself)
}

export default function VacanciesTab({ tick, onChanged }: { tick: number; onChanged: () => void }) {
  const vac = useData(listVacancies, tick)
  const reqs = useData(listRequests, tick)
  const [dialog, setDialog] = useState<{ mode: 'new' } | { mode: 'edit'; vacancy: Vacancy } | null>(null)
  const [withdraw, setWithdraw] = useState<{ id: number; what: string } | null>(null)
  const [detailKey, setDetailKey] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')

  const all: Row[] = useMemo(() => {
    const waitingNew = (reqs.data ?? []).filter((r: PortalRequest) => r.type === 'vacancy_new' && r.status === 'Pending')
    const fromRequests: Row[] = waitingNew.map(r => {
      const c = (r.changes ?? {}) as Record<string, string | number>
      return {
        key: `r${r.id}`, title: r.jobTitle ?? String(c.jobTitle ?? ''), jobType: c.jobType ? String(c.jobType) : null,
        salary: salary(numOrNull(c.salaryMin), numOrNull(c.salaryMax)) ?? '—', hired: c.slotsTotal !== undefined ? `0 of ${c.slotsTotal}` : '—',
        description: String(c.description ?? ''), requirements: String(c.requirements ?? ''),
        status: null, requestedByYou: true, vacancy: null, openRequestId: r.id,
      }
    })
    const fromVacancies: Row[] = (vac.data ?? []).map(v => ({
      key: `v${v.id}`, title: v.jobTitle, jobType: v.jobType, salary: salary(v.salaryMin, v.salaryMax) ?? '—',
      hired: v.slotsTotal !== null ? `${v.hired} of ${v.slotsTotal}` : String(v.hired),
      description: v.description ?? '', requirements: v.requirements ?? '',
      status: v.status, requestedByYou: v.source === 'Employer', vacancy: v, openRequestId: v.openRequest?.id ?? null,
    }))
    return [...fromRequests, ...fromVacancies]
  }, [vac.data, reqs.data])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return all.filter(r => (status === 'all' || r.status === status) && (!q || r.title.toLowerCase().includes(q)))
  }, [all, search, status])
  const pg = usePaged(rows, `${search}|${status}`)
  const detail = detailKey ? all.find(r => r.key === detailKey) ?? null : null

  function reloadAll() { vac.reload(); reqs.reload(); onChanged() }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <div className="relative flex-1 min-w-[14rem]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by job title…" aria-label="Search openings"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-brand-blue placeholder:text-gray-400" />
        </div>
        <div className="relative">
          <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Status"
            className="appearance-none pl-4 pr-8 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:border-brand-blue cursor-pointer">
            <option value="all">All</option>
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
        <button type="button" onClick={() => setDialog({ mode: 'new' })} className={btnPrimary}><Plus size={16} />Request a new opening</button>
      </div>

      {vac.error && !vac.data && <p role="alert" className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{vac.error}</p>}

      {vac.loading && !vac.data ? <Spinner /> : rows.length === 0 ? (
        <EmptyState title={all.length === 0 ? 'No vacancies yet' : 'No openings match'} hint={all.length === 0 ? 'Openings the PESO records for your company appear here. You can also ask the PESO to add one.' : 'Try a different search or status.'} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-brand-blue">
                <th className="px-4 py-3 text-left text-white whitespace-nowrap">Job Title</th>
                <th className="px-4 py-3 text-left text-white whitespace-nowrap">Job Type</th>
                <th className="px-4 py-3 text-left text-white whitespace-nowrap">Salary</th>
                <th className="px-4 py-3 text-left text-white whitespace-nowrap">Hired</th>
                <th className="px-4 py-3 text-left text-white whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-left text-white whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pg.paged.map(r => (
                <tr key={r.key} className="border-b border-gray-100 align-middle hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{r.title}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.jobType ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.salary}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.hired}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.status ? <Badge value={r.status} /> : <WaitingPill text="New opening: waiting for the PESO" />}
                      {r.status && r.vacancy?.openRequest && <WaitingPill text="Changes waiting for the PESO" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button type="button" onClick={() => setDetailKey(r.key)} className={`${btnSmall} border border-gray-300 text-gray-700 hover:bg-gray-50`}>View details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 0 && <TablePagination currentPage={pg.page} totalItems={pg.total} onPageChange={pg.setPage} itemsPerPage={pg.perPage} onItemsPerPageChange={pg.setPerPage} />}

      {detail && (
        <Dialog
          title={detail.title} onClose={() => setDetailKey(null)}
          footer={<>
            <button type="button" onClick={() => setDetailKey(null)} className={btnGhost}>Close</button>
            {detail.openRequestId !== null ? (
              <button type="button" onClick={() => { setDetailKey(null); setWithdraw({ id: detail.openRequestId!, what: detail.vacancy ? `changes to “${detail.title}”` : `the new opening “${detail.title}”` }) }}
                className="px-5 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium">Withdraw request</button>
            ) : detail.vacancy ? (
              <button type="button" onClick={() => { const v = detail.vacancy!; setDetailKey(null); setDialog({ mode: 'edit', vacancy: v }) }} className={btnPrimary}>Request changes</button>
            ) : null}
          </>}
        >
          <div className="flex items-center gap-2 flex-wrap">
            {detail.status ? <Badge value={detail.status} /> : <WaitingPill text="New opening: waiting for the PESO" />}
            {detail.requestedByYou && detail.status && <WaitingPill text="Requested by you" />}
            {detail.status && detail.vacancy?.openRequest && <WaitingPill text="Changes waiting for the PESO" />}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div><dt className={labelCls}>Job type</dt><dd className="m-0 text-sm text-gray-800">{detail.jobType ?? '—'}</dd></div>
            <div><dt className={labelCls}>Hired</dt><dd className="m-0 text-sm text-gray-800">{detail.hired}</dd></div>
            <div className="col-span-2"><dt className={labelCls}>Salary</dt><dd className="m-0 text-sm text-gray-800">{detail.salary}</dd></div>
          </dl>
          <div><p className={labelCls}>Description</p><p className="m-0 text-sm text-gray-700 whitespace-pre-line break-words">{detail.description || '—'}</p></div>
          <div><p className={labelCls}>Requirements</p><p className="m-0 text-sm text-gray-700 whitespace-pre-line break-words">{detail.requirements || '—'}</p></div>
        </Dialog>
      )}

      {dialog && (
        <VacancyDialog
          mode={dialog.mode} vacancy={dialog.mode === 'edit' ? dialog.vacancy : null}
          onClose={() => setDialog(null)}
          onSent={() => {
            const wasNew = dialog.mode === 'new'
            setDialog(null); reloadAll()
            setNotice({ type: 'success', title: 'Request sent', message: wasNew ? 'The PESO will review your new opening. It appears in your list once they approve it. You can follow it under My Requests.' : 'The PESO will review your changes. You can follow it under My Requests.' })
          }}
        />
      )}
      {withdraw && <WithdrawDialog what={withdraw.what} onClose={() => setWithdraw(null)} onConfirm={async () => { await withdrawRequest(withdraw.id); setWithdraw(null); reloadAll() }} />}
      {notice && <Notice {...notice} onClose={() => setNotice(null)} />}
    </Card>
  )
}

function VacancyDialog({ mode, vacancy, onClose, onSent }: { mode: 'new' | 'edit'; vacancy: Vacancy | null; onClose: () => void; onSent: () => void }) {
  const [f, setF] = useState<Form>(() => (vacancy ? fromVacancy(vacancy) : EMPTY))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k: keyof Form, v: string) => { setF(p => ({ ...p, [k]: v })); setError('') }
  const isNew = mode === 'new'

  async function submit() {
    setBusy(true); setError('')
    try {
      const { status, ...rest } = f
      if (isNew) await submitRequest({ type: 'vacancy_new', payload: rest })
      else await submitRequest({ type: 'vacancy_update', vacancyId: vacancy!.id, payload: { ...rest, status } })
      onSent()
    } catch (e) { setError(errText(e)); setBusy(false) }
  }

  return (
    <Dialog
      title={isNew ? 'Request a new opening' : `Request changes: ${vacancy?.jobTitle ?? ''}`} onClose={onClose} busy={busy}
      footer={<>
        <button type="button" onClick={onClose} disabled={busy} className={btnGhost}>Cancel</button>
        <button type="button" onClick={() => void submit()} disabled={busy} className={btnPrimary}>{busy && <Loader2 size={15} className="animate-spin" />}Send to the PESO</button>
      </>}
    >
      <div>
        <label htmlFor="v-title" className={labelCls}>Job title <span className="text-red-500">*</span></label>
        <input id="v-title" value={f.jobTitle} maxLength={255} onChange={e => set('jobTitle', e.target.value)} className={inputCls} placeholder="e.g. Cashier" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="v-type" className={labelCls}>Job type <span className="text-red-500">*</span></label>
          <select id="v-type" value={f.jobType} onChange={e => set('jobType', e.target.value)} className={inputCls}>
            <option>Full-time</option><option>Part-time</option><option>Contract</option>
          </select>
        </div>
        <div>
          <label htmlFor="v-slots" className={labelCls}>People needed <span className="text-red-500">*</span></label>
          <input id="v-slots" inputMode="numeric" value={f.slotsTotal} onChange={e => set('slotsTotal', e.target.value)} className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="v-min" className={labelCls}>Minimum salary (₱) <span className="text-red-500">*</span></label>
          <input id="v-min" inputMode="decimal" value={f.salaryMin} onChange={e => set('salaryMin', e.target.value)} className={inputCls} placeholder="12000" />
        </div>
        <div>
          <label htmlFor="v-max" className={labelCls}>Maximum salary (₱) <span className="text-red-500">*</span></label>
          <input id="v-max" inputMode="decimal" value={f.salaryMax} onChange={e => set('salaryMax', e.target.value)} className={inputCls} placeholder="15000" />
        </div>
      </div>
      <div>
        <label htmlFor="v-desc" className={labelCls}>Description</label>
        <textarea id="v-desc" rows={3} value={f.description} maxLength={4000} onChange={e => set('description', e.target.value)} className={`${inputCls} resize-none`} placeholder="What the job involves" />
      </div>
      <div>
        <label htmlFor="v-req" className={labelCls}>Requirements <span className="text-red-500">*</span></label>
        <textarea id="v-req" rows={3} value={f.requirements} maxLength={4000} onChange={e => set('requirements', e.target.value)} className={`${inputCls} resize-none`} placeholder="e.g. High school graduate, 1 year experience" />
      </div>
      {!isNew && (
        <div>
          <label htmlFor="v-status" className={labelCls}>Status</label>
          <select id="v-status" value={f.status} onChange={e => set('status', e.target.value)} className={inputCls}>
            <option value="Open">Open</option><option value="Closed">Closed</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">Choose Closed when you no longer need anyone for this opening.</p>
        </div>
      )}
      <p className="text-xs text-gray-500">{isNew ? 'The PESO checks it first. Nothing is posted until they approve it.' : 'Only what you change is sent. The PESO checks it first, then it shows as approved or rejected.'}</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </Dialog>
  )
}
