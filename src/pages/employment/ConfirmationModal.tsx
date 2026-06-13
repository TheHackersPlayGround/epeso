import type { ReactNode } from 'react'
import { X } from 'lucide-react'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button
            type="button"
            onClick={onBackToEdit}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium"
          >
            Back to Edit
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark transition-colors font-medium"
          >
            Confirm &amp; Save
          </button>
        </div>
      </div>
    </div>
  )
}
