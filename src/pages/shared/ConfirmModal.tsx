import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  type: 'confirm' | 'success' | 'error'
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  // Only relevant when type === 'confirm'. Defaults to 'danger'; pass 'brand'
  // for non-destructive confirms (logout, restore) so color signals real risk.
  confirmVariant?: 'danger' | 'brand'
  // Optional third action, rendered to the right of the confirm button
  // (used by the "Leave this form?" modal: Keep editing / Discard / Save as draft).
  thirdText?: string
  onThird?: () => void
  // If this returns a promise, the buttons are disabled and the confirm button shows a spinner until it settles.
  onConfirm: () => unknown
  onCancel: () => void
  // Force the loading state on from outside, for callers that track their own busy flag.
  isLoading?: boolean
}

function isPromise(value: unknown): value is Promise<unknown> {
  return typeof (value as { then?: unknown } | null)?.then === 'function'
}

export default function ConfirmModal({ isOpen, type, title, message, confirmText = 'OK', cancelText, confirmVariant = 'danger', thirdText, onThird, onConfirm, onCancel, isLoading = false }: ConfirmModalProps) {
  const [pending, setPending] = useState(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true // React StrictMode mounts, unmounts and re-mounts in dev; without this the ref stays false
    return () => { mounted.current = false }
  }, [])
  if (!isOpen) return null

  const busy = pending || isLoading

  // Runs the confirm action; while a returned promise is pending the buttons stay locked.
  const handleConfirm = () => {
    if (busy) return
    const result = onConfirm()
    if (!isPromise(result)) return
    setPending(true)
    result.then(() => undefined, () => undefined).then(() => { if (mounted.current) setPending(false) })
  }

  return (
    <div className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8">
        <div className="flex flex-col items-center text-center mb-6">
          {type === 'success' ? (
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : type === 'error' ? (
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
          ) : confirmVariant === 'brand' ? (
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[#0077BE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
          )}
          <h3 className="text-gray-900 font-semibold text-xl">{title}</h3>
          <p className="text-gray-500 text-base mt-2 whitespace-pre-line">{message}</p>
        </div>
        <div className="flex gap-3">
          {type === 'confirm' && cancelText && (
            <button
              onClick={onCancel}
              disabled={busy}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-base text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={busy}
            className={`flex-1 py-2.5 rounded-lg text-base text-white font-medium transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${
              type === 'success' ? 'bg-green-600 hover:bg-green-700'
              : type === 'error' ? 'bg-red-600 hover:bg-red-700'
              : confirmVariant === 'brand' ? 'bg-[#0077BE] hover:bg-[#006699]'
              : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {confirmText}
          </button>
          {type === 'confirm' && thirdText && onThird && (
            <button
              onClick={onThird}
              disabled={busy}
              className="flex-1 py-2.5 rounded-lg text-base text-white font-medium bg-[#0077BE] hover:bg-[#006699] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {thirdText}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
