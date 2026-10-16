import { fmtDate } from '../utils/formatDate'

// One look for "this person withdrew" everywhere it is shown (SPES, SLP, TUPAD,
// GIP): an orange banner at the TOP of the assignment dialog, plus a short note
// above the footer.

export function WithdrawalBanner({ exitedAt, reason }: { exitedAt?: string | null; reason?: string }) {
  return (
    <div className="mb-4 p-3 rounded-lg bg-orange-50 border border-orange-200 text-sm text-orange-800">
      <p className="font-semibold">Withdrawn</p>
      <div className="mt-1.5 space-y-0.5">
        <p><span className="font-semibold">Date Left:</span> {exitedAt ? fmtDate(exitedAt) : '—'}</p>
        <p><span className="font-semibold">Reason:</span> {reason || '—'}</p>
      </div>
    </div>
  )
}

export function WithdrawalFootnote({ what }: { what: 'batch' | 'project' | 'workplace/office' }) {
  return (
    <p className="px-6 py-3 text-xs text-gray-500 bg-gray-50 border-t border-gray-100 flex-shrink-0">
      This person withdrew from this {what}. The assignment stays on record and can no longer be changed or removed.
    </p>
  )
}
