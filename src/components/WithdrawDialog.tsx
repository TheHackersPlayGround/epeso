import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import DatePicker from './DatePicker'

// "Mark as withdrawn" dialog (SPES/SLP) for someone who left an already-started
// batch/project -- different from Unassign, which only applies while still Planned.

export interface WithdrawDialogProps {
  personName: string
  /** Name of the batch or project they are leaving. */
  assignmentName: string
  kind: 'batch' | 'project' | 'workplace'
  /** Earliest allowed "date left" (the day they were assigned), yyyy-mm-dd. */
  minDate?: string
  isSaving: boolean
  onConfirm: (reason: string, exitDate: string) => void
  onClose: () => void
}

const MAX_REASON = 500

function todayIso() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export default function WithdrawDialog({ personName, assignmentName, kind, minDate, isSaving, onConfirm, onClose }: WithdrawDialogProps) {
  const [reason, setReason] = useState('')
  const [exitDate, setExitDate] = useState(todayIso())
  const [error, setError] = useState('')

  const noun = kind === 'batch' ? 'batch' : kind === 'workplace' ? 'workplace/office' : 'project'

  const submit = () => {
    const why = reason.trim()
    if (!why) { setError('Please enter the reason for leaving.'); return }
    if (!exitDate) { setError('Please select the date they left.'); return }
    if (exitDate > todayIso()) { setError('The date left cannot be in the future.'); return }
    if (minDate && exitDate < minDate.slice(0, 10)) {
      setError(`The date left cannot be before they were assigned to the ${noun} (${minDate.slice(0, 10)}).`)
      return
    }
    setError('')
    onConfirm(why, exitDate)
  }

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none placeholder:text-gray-400'
  const lbl = 'block text-xs uppercase tracking-wide text-gray-900 font-semibold mb-1'

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Mark as withdrawn</h3>
          <button onClick={onClose} disabled={isSaving} className="text-gray-400 hover:text-gray-600 disabled:opacity-50" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600">
            Record that <span className="font-semibold text-gray-900">{personName}</span> left the {noun}{' '}
            <span className="font-semibold text-gray-900">{assignmentName}</span> before it finished.
          </p>

          <div>
            <label className={lbl}>Date left <span className="text-red-500">*</span></label>
            <DatePicker
              className={inp}
              value={exitDate}
              min={minDate ? minDate.slice(0, 10) : undefined}
              max={todayIso()}
              onChange={v => { setExitDate(v); setError('') }}
            />
          </div>

          <div>
            <label className={lbl}>Reason <span className="text-red-500">*</span></label>
            <textarea
              className={`${inp} resize-none`}
              rows={3}
              maxLength={MAX_REASON}
              value={reason}
              onChange={e => { setReason(e.target.value); setError('') }}
              placeholder="e.g. Relocated, health reasons, personal or family reasons"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{reason.length}/{MAX_REASON}</p>
          </div>

          <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            They will no longer take a slot in this {noun} and will not be counted as completed when it finishes.
            Their record and this {noun} stay in their history.
          </p>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} disabled={isSaving}
            className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50">
            Cancel
          </button>
          <button onClick={submit} disabled={isSaving}
            className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2">
            {isSaving && <Loader2 size={15} className="animate-spin" />}
            {isSaving ? 'Saving…' : 'Mark as withdrawn'}
          </button>
        </div>
      </div>
    </div>
  )
}
