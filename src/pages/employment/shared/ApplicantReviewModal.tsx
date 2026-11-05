import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Loader2, X } from 'lucide-react'

type ApplicantReviewModalProps = {
  isOpen: boolean
  title: string
  message: string
  summaryContent?: ReactNode
  onBackToEdit: () => void
  // If this returns a promise, both buttons stay locked and the confirm button shows a spinner until it settles.
  onConfirm: () => unknown
}

export default function ApplicantReviewModal({
  isOpen,
  title,
  message,
  summaryContent,
  onBackToEdit,
  onConfirm,
}: ApplicantReviewModalProps) {
  const [saving, setSaving] = useState(false)
  const mounted = useRef(true)
  useEffect(() => () => { mounted.current = false }, [])
  if (!isOpen) return null

  const handleConfirm = () => {
    if (saving) return
    const result = onConfirm()
    if (typeof (result as { then?: unknown } | null)?.then !== 'function') return
    setSaving(true)
    ;(result as Promise<unknown>).then(() => undefined, () => undefined).then(() => { if (mounted.current) setSaving(false) })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button
            type="button"
            onClick={onBackToEdit}
            disabled={saving}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={20} />
          </button>
        </div>

        {/* Message banner */}
        <div className="mx-6 mt-4 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-gray-600 text-center">
          {message}
        </div>

        {/* Summary */}
        {summaryContent && (
          <div className="flex-1 overflow-y-auto mx-6 mt-4 mb-2 text-sm text-gray-700">
            {summaryContent}
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onBackToEdit}
            disabled={saving}
            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Back to Edit
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 py-2.5 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark transition-colors font-medium inline-flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            Confirm &amp; Save
          </button>
        </div>
      </div>
    </div>
  )
}
