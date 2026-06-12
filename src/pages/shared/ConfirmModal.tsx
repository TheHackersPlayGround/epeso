interface ConfirmModalProps {
  isOpen: boolean
  type: 'confirm' | 'success'
  title: string
  message: string
  confirmText: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({ isOpen, type, title, message, confirmText, cancelText, onConfirm, onCancel }: ConfirmModalProps) {
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
          ) : (
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
          )}
          <h3 className="text-gray-900 font-semibold text-lg">{title}</h3>
          <p className="text-gray-500 text-sm mt-1">{message}</p>
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
              type === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
