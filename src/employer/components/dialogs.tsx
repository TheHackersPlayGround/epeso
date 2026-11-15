// Dialogs the tabs share: choose a new status (and hire date), confirm a withdrawal.
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Badge, Dialog } from './ui'
import ConfirmModal from '../../pages/shared/ConfirmModal'
import type { PortalRequest } from '../api'
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
          <input id="date-hired" type="date" value={date} max={todayStr()} onChange={e => setDate(e.target.value)} className={`${inputCls} w-auto`} />
        </div>
      )}
      <p className="text-xs text-gray-500">This is a request: the PESO checks it first, then it shows here as approved or rejected.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </Dialog>
  )
}

// The order the fields of an opening are listed in.
const FIELD_ORDER = ['jobTitle', 'jobType', 'slotsTotal', 'salaryMin', 'salaryMax', 'requirements', 'description', 'status']

// Everything a request asked for, in full: opened from a row of My Requests.
export function RequestDetailsDialog({ r, onClose, onWithdraw }: { r: PortalRequest; onClose: () => void; onWithdraw: () => void }) {
  const isStatus = r.type === 'referral_status' || r.type === 'placement_status'
  const entries: [string, string][] = isStatus
    ? [[r.type === 'placement_status' ? 'Employment status' : 'Referral status', r.requestedStatus ?? '—'], ...(r.requestedStatus === 'Hired' && r.dateHired ? [['Date hired', fmtDate(r.dateHired)] as [string, string]] : [])]
    : Object.entries(r.changes ?? {})
        .sort(([a], [b]) => (FIELD_ORDER.indexOf(a) === -1 ? 99 : FIELD_ORDER.indexOf(a)) - (FIELD_ORDER.indexOf(b) === -1 ? 99 : FIELD_ORDER.indexOf(b)))
        .map(([k, v]) => [FIELD_LABELS[k] ?? k, fmtChangeValue(k, v) || '—'] as [string, string])
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
        {isStatus && r.applicantName && <div><dt className={labelCls}>Applicant</dt><dd className="m-0 text-sm text-gray-800 break-words">{r.applicantName}</dd></div>}
        {isStatus && r.jobTitle && <div><dt className={labelCls}>Position</dt><dd className="m-0 text-sm text-gray-800 break-words">{r.jobTitle}</dd></div>}
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
        <dl className="m-0 mt-1 divide-y divide-gray-100 border border-gray-200 rounded-lg">
          {entries.map(([label, value]) => (
            <div key={label} className="flex gap-3 px-3 py-2 max-sm:flex-col max-sm:gap-0.5">
              <dt className="w-40 shrink-0 text-xs text-gray-500 pt-0.5 max-sm:w-auto">{label}</dt>
              <dd className="m-0 text-sm text-gray-900 whitespace-pre-line break-words min-w-0">{value}</dd>
            </div>
          ))}
        </dl>
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
