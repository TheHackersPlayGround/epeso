import type { ReactNode } from 'react'

type ConfirmationModalProps = {
  isOpen: boolean
  title: string
  message: string
  summaryContent?: ReactNode
  onBackToEdit: () => void
  onConfirm: () => void
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  summaryContent,
  onBackToEdit,
  onConfirm,
}: ConfirmationModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-4">{message}</p>

        {summaryContent && (
          <div className="bg-gray-50 rounded-lg p-4 mb-5 text-sm text-gray-700 max-h-48 overflow-y-auto">
            {summaryContent}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBackToEdit}
            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium"
          >
            Back to Edit
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-brand-orange text-white rounded-lg text-sm hover:bg-[#d96a1e] transition-colors font-medium"
          >
            Confirm &amp; Save
          </button>
        </div>
      </div>
    </div>
  )
}
