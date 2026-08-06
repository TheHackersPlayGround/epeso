interface ConfirmModalProps {
  isOpen: boolean
  type: 'confirm' | 'success' | 'error'
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  // Only relevant when type === 'confirm'. Defaults to 'danger' (red) to
  // match every pre-existing call site — pass 'brand' for confirms that
  // aren't destructive (logout, restore, moving forward a status), so the
  // button color actually signals risk instead of always reading as delete.
  confirmVariant?: 'danger' | 'brand'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({ isOpen, type, title, message, confirmText = 'OK', cancelText, confirmVariant = 'danger', onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex flex-col items-center text-center mb-5">
          {type === 'success' ? (
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : type === 'error' ? (
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
          ) : confirmVariant === 'brand' ? (
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-[#0077BE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
          )}
          <h3 className="text-gray-900 font-semibold text-lg">{title}</h3>
          <p className="text-gray-500 text-sm mt-1 whitespace-pre-line">{message}</p>
        </div>
        <div className="flex gap-3">
          {type === 'confirm' && cancelText && (
            <button
              onClick={onCancel}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`flex-1 py-2 rounded-lg text-sm text-white font-medium transition-colors ${
              type === 'success' ? 'bg-green-600 hover:bg-green-700'
              : type === 'error' ? 'bg-red-600 hover:bg-red-700'
              : confirmVariant === 'brand' ? 'bg-[#0077BE] hover:bg-[#006699]'
              : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
