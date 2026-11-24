// Dialogs the tabs share: choose a new status (and hire date), confirm a withdrawal.
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Badge, Dialog } from './ui'
import DatePicker from '../../components/DatePicker'
import ConfirmModal from '../../pages/shared/ConfirmModal'
import type { PortalRequest, PromotionInput } from '../api'
import { FIELD_LABELS, btnGhost, btnPrimary, fmtChangeValue, fmtDate, fmtWhen, inputCls, labelCls, requestKind, todayStr } from '../lib'

// Ask the PESO to change a referral's or a placement's status. Nothing changes until the PESO accepts.
export function StatusRequestDialog({ title, subject, current, options, allowHireDate, onSubmit, onClose }: {
  title: string
  subject: string
  current: string
  options: string[]
  allowHireDate?: boolean
  onSubmit: (status: string, dateHired?: string) => Promise<void>
  onClose: () => void
}) {
  const choices = options.filter(o => o !== current)
  const [status, setStatus] = useState(choices[0] ?? '')
  const [date, setDate] = useState(todayStr())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const needsDate = !!allowHireDate && status === 'Hired'

  async function submit() {
    if (!status) return
    setBusy(true); setError('')
    try { await onSubmit(status, needsDate ? date : undefined) } catch (e) { setError(e instanceof Error ? e.message : 'Could not send your request.'); setBusy(false) }
  }

  return (
    <Dialog
      title={title} onClose={onClose} busy={busy}
      footer={<>
        <button type="button" onClick={onClose} disabled={busy} className={btnGhost}>Cancel</button>
        <button type="button" onClick={() => void submit()} disabled={busy || !status || (needsDate && !date)} className={btnPrimary}>
          {busy && <Loader2 size={15} className="animate-spin" />}Send to the PESO
        </button>
      </>}
    >
      <p className="text-sm text-gray-600"><span className="font-semibold text-gray-900">{subject}</span><br />Current status: <span className="font-medium">{current}</span></p>
      <fieldset>
        <legend className={labelCls}>Change status to</legend>
        <div className="space-y-2 mt-1">
          {choices.map(c => (
            <label key={c} className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
              <input type="radio" name="new-status" value={c} checked={status === c} onChange={() => setStatus(c)} className="accent-[#0077BE]" />{c}
            </label>
          ))}
        </div>
      </fieldset>
      {needsDate && (
        <div>
          <label htmlFor="date-hired" className={labelCls}>Date hired</label>
          <DatePicker id="date-hired" value={date} max={todayStr()} onChange={setDate} className={`${inputCls} w-auto`} />
        </div>
      )}
      <p className="text-xs text-gray-500">This is a request: the PESO checks it first, then it shows here as approved or rejected.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </Dialog>
  )
}

// Ask the PESO to record a promotion for someone hired. Nothing changes until the PESO accepts.
export function PromotionRequestDialog({ subject, currentTitle, dateHired, onSubmit, onClose }: {
  subject: string
  currentTitle: string
  dateHired: string | null
  onSubmit: (input: PromotionInput) => Promise<void>
  onClose: () => void
}) {
  const [date, setDate] = useState(todayStr())
  const [title, setTitle] = useState('')
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const hired = dateHired ? dateHired.slice(0, 10) : undefined

  async function submit() {
    setError('')
    if (!date) { setError('Enter the promotion date.'); return }
    if (hired && date < hired) { setError('The promotion date cannot be before the date hired.'); return }
    if (title.trim().length < 2) { setError('Enter the new job title.'); return }
    if (min.trim() !== '' && max.trim() !== '' && Number(min.replace(/,/g, '')) > Number(max.replace(/,/g, ''))) { setError('The minimum salary cannot be higher than the maximum salary.'); return }
    setBusy(true)
    try { await onSubmit({ promotionDate: date, newJobTitle: title.trim(), newSalaryMin: min.trim(), newSalaryMax: max.trim(), remarks: remarks.trim() }) }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not send your request.'); setBusy(false) }
  }

  return (
    <Dialog
      title="Record promotion" onClose={onClose} busy={busy}
      footer={<>
        <button type="button" onClick={onClose} disabled={busy} className={btnGhost}>Cancel</button>
        <button type="button" onClick={() => void submit()} disabled={busy || !date || !title.trim()} className={btnPrimary}>
          {busy && <Loader2 size={15} className="animate-spin" />}Send to the PESO
        </button>
      </>}
    >
      <p className="text-sm text-gray-600"><span className="font-semibold text-gray-900">{subject}</span><br />Current job title: <span className="font-medium">{currentTitle || '—'}</span></p>
      <div>
        <label htmlFor="promo-date" className={labelCls}>Promotion date <span className="text-red-500">*</span></label>
        <DatePicker id="promo-date" value={date} min={hired} max={todayStr()} onChange={setDate} className={`${inputCls} w-auto`} />
      </div>
      <div>
        <label htmlFor="promo-title" className={labelCls}>New job title <span className="text-red-500">*</span></label>
        <input id="promo-title" value={title} onChange={e => { setTitle(e.target.value); setError('') }} maxLength={255} placeholder="e.g. Head Cook" className={inputCls} />
      </div>
      <div>
        <p className={labelCls}>New salary range <span className="font-normal normal-case text-gray-500">(optional)</span></p>
        <div className="flex items-center gap-2">
          <input aria-label="Minimum salary" value={min} onChange={e => { setMin(e.target.value); setError('') }} inputMode="decimal" placeholder="Min (e.g. 18,000)" className={inputCls} />
          <span className="text-gray-400">–</span>
          <input aria-label="Maximum salary" value={max} onChange={e => { setMax(e.target.value); setError('') }} inputMode="decimal" placeholder="Max (e.g. 22,000)" className={inputCls} />
        </div>
      </div>
      <div>
        <label htmlFor="promo-remarks" className={labelCls}>Remarks <span className="font-normal normal-case text-gray-500">(optional)</span></label>
        <textarea id="promo-remarks" value={remarks} onChange={e => setRemarks(e.target.value)} maxLength={500} rows={2} placeholder="Optional notes" className={inputCls} />
      </div>
      <p className="text-xs text-gray-500">This is a request: the PESO checks it first, then it shows under My Requests as approved or rejected.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </Dialog>
  )
}

// The order the fields of an opening are listed in.
const FIELD_ORDER = ['jobTitle', 'jobType', 'slotsTotal', 'salaryMin', 'salaryMax', 'requirements', 'description', 'status',
  'promotionDate', 'newJobTitle', 'newSalaryMin', 'newSalaryMax', 'remarks']

// Everything a request asked for, in full: opened from a row of My Requests.
export function RequestDetailsDialog({ r, onClose, onWithdraw }: { r: PortalRequest; onClose: () => void; onWithdraw: () => void }) {
  const isStatus = r.type === 'referral_status' || r.type === 'placement_status'
  const aboutPerson = isStatus || r.type === 'placement_promotion'   // the request is about one person (shows the applicant and position)
  // One line per change: "field: what it was -> what you asked for" (a new opening has nothing before it, so it shows only the new value).
  const entries: { label: string; before: string; value: string }[] = isStatus
    ? [
        { label: r.type === 'placement_status' ? 'Employment status' : 'Referral status', before: r.currentStatus ?? '', value: r.requestedStatus ?? '—' },
        ...(r.requestedStatus === 'Hired' && r.dateHired ? [{ label: 'Date hired', before: '', value: fmtDate(r.dateHired) }] : []),
      ]
    : Object.entries(r.changes ?? {})
        .sort(([a], [b]) => (FIELD_ORDER.indexOf(a) === -1 ? 99 : FIELD_ORDER.indexOf(a)) - (FIELD_ORDER.indexOf(b) === -1 ? 99 : FIELD_ORDER.indexOf(b)))
        .map(([k, v]) => ({ label: FIELD_LABELS[k] ?? k, before: r.before?.[k] ? fmtChangeValue(k, r.before[k]) : '', value: fmtChangeValue(k, v) || '—' }))
  const decided = r.status === 'Approved' || r.status === 'Rejected'
  return (
    <Dialog
      title={requestKind(r)} titleExtra={<Badge value={r.status} />} widthClass="max-w-lg" onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} className={btnGhost}>Close</button>
        {r.status === 'Pending' && (
          <button type="button" onClick={onWithdraw} className="px-5 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium">Withdraw request</button>
        )}
      </>}
    >
      <dl className="space-y-3">
        {/* Who or what it is about, as labelled fields (a new opening and company details have nothing extra to say here). */}
        {aboutPerson && r.applicantName && <div><dt className={labelCls}>Applicant</dt><dd className="m-0 text-sm text-gray-800 break-words">{r.applicantName}</dd></div>}
        {aboutPerson && r.jobTitle && <div><dt className={labelCls}>Position</dt><dd className="m-0 text-sm text-gray-800 break-words">{r.jobTitle}</dd></div>}
        {r.type === 'vacancy_update' && r.jobTitle && <div><dt className={labelCls}>Opening</dt><dd className="m-0 text-sm text-gray-800 break-words">{r.jobTitle}</dd></div>}
        <div><dt className={labelCls}>Sent</dt><dd className="m-0 text-sm text-gray-800">{fmtWhen(r.submittedAt)}</dd></div>
        {decided && r.reviewedAt && <div><dt className={labelCls}>{r.status === 'Approved' ? 'Approved' : 'Rejected'}</dt><dd className="m-0 text-sm text-gray-800">{fmtWhen(r.reviewedAt)} by the PESO</dd></div>}
        {r.status === 'Pending' && <div><dt className={labelCls}>Decision</dt><dd className="m-0 text-sm text-gray-800">Waiting for the PESO</dd></div>}
      </dl>
      {r.status === 'Rejected' && r.reviewNote && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700 m-0 mb-0.5">Reason from the PESO</p>
          <p className="text-sm text-red-800 m-0 whitespace-pre-line break-words">{r.reviewNote}</p>
        </div>
      )}
      <div>
        <p className={labelCls}>What you asked for</p>
        {/* The same look as the PESO staff's "Change" box: "field: old -> new". The arrow is left out when nothing is known to change from. */}
        <div className="mt-1 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
          <ul className="m-0 p-0 list-none space-y-1">
            {entries.map(e => (
              <li key={e.label} className="text-sm text-gray-700 break-words whitespace-pre-line">
                <span className="text-gray-500">{e.label}:</span>{' '}
                {e.before && e.before !== e.value && <><span>{e.before}</span> <span className="text-gray-400">→</span> </>}
                <span className="font-medium text-gray-900">{e.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Dialog>
  )
}

// "Withdraw this request?" in the staff system's confirmation style. A failure is shown as a message of the same style.
export function WithdrawDialog({ what, onConfirm, onClose }: { what: string; onConfirm: () => Promise<void>; onClose: () => void }) {
  const [error, setError] = useState('')
  if (error) return <ConfirmModal isOpen type="error" title="Could not withdraw" message={error} confirmText="OK" onConfirm={onClose} onCancel={onClose} />
  return (
    <ConfirmModal
      isOpen type="confirm" title="Withdraw this request?"
      message={`Your request about ${what} will be cancelled, unless the PESO has already decided on it.`}
      confirmText="Withdraw" cancelText="Keep it"
      onConfirm={async () => { try { await onConfirm() } catch (e) { setError(e instanceof Error ? e.message : 'Could not withdraw the request.') } }}
      onCancel={onClose}
    />
  )
}
