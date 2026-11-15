// A checklist of an applicant's uploaded documents: the PESO ticks the ones to send to the employer. Used in the Refer screen and in the
// Shared Documents dialog of the Referrals tab.
import { FileText, Loader2 } from 'lucide-react'
import type { ShareableDocument } from '../../../services/referralDocumentService'

const fmtSize = (bytes: number) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`)

export default function DocumentPicker({ docs, chosen, onToggle, disabled = false, error = '' }: {
  docs: ShareableDocument[] | null
  chosen: Set<number>
  onToggle: (id: number) => void
  disabled?: boolean
  error?: string
}) {
  if (error) return <p className="text-sm text-red-500">{error}</p>
  if (docs === null) return <p className="text-sm text-gray-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Loading documents…</p>
  if (docs.length === 0) {
    return <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">This applicant has no uploaded documents, so nothing will be sent. You can upload some in the applicant's profile (Edit) and share them later from the Referrals tab.</p>
  }
  return (
    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-56 overflow-y-auto">
      {docs.map(d => (
        <label key={d.id} className={`flex items-start gap-3 px-3 py-2.5 ${disabled ? 'opacity-60' : 'cursor-pointer hover:bg-blue-50/50'}`}>
          <input type="checkbox" checked={chosen.has(d.id)} onChange={() => onToggle(d.id)} disabled={disabled} className="mt-1 accent-[#0077BE]" />
          <FileText size={16} className="mt-0.5 text-gray-400 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-gray-800">{d.label}</span>
            <span className="block text-xs text-gray-500 truncate">{d.fileName} · {fmtSize(d.fileSize)}</span>
          </span>
        </label>
      ))}
    </div>
  )
}
