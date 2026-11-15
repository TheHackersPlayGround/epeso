// Small shared pieces: status badges, dialogs.
import type { ReactNode } from 'react'
import { Loader2, X } from 'lucide-react'
import ConfirmModal from '../../pages/shared/ConfirmModal'   // the staff system's message popup, so messages look the same on both sides

const BADGE: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Interviewed: 'bg-blue-100 text-blue-700',
  Hired: 'bg-green-100 text-green-700',
  'Not Hired': 'bg-red-100 text-red-600',
  Active: 'bg-green-100 text-green-700',
  Resigned: 'bg-orange-100 text-orange-700',
  Terminated: 'bg-red-100 text-red-600',
  Completed: 'bg-blue-100 text-blue-700',
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-600',
  Withdrawn: 'bg-gray-100 text-gray-600',
  Open: 'bg-green-100 text-green-700',
  Closed: 'bg-gray-100 text-gray-600',
  Inactive: 'bg-gray-100 text-gray-600',
}
export function Badge({ value }: { value: string }) {
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${BADGE[value] ?? 'bg-gray-100 text-gray-600'}`}>{value}</span>
}

// Shown on a row while the PESO has not yet decided on the employer's request.
export function WaitingPill({ text, title }: { text: string; title?: string }) {
  return <span title={title} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 border border-amber-200 text-amber-700 whitespace-nowrap">{text}</span>
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400"><Loader2 size={18} className="animate-spin" />{label}</div>
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="py-16 text-center text-gray-400">
      <p className="text-base font-medium text-gray-500">{title}</p>
      {hint && <p className="text-sm mt-1">{hint}</p>}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl shadow-md ${className}`}>{children}</div>
}

export function Dialog({ title, titleExtra, onClose, children, footer, busy = false, widthClass = 'max-w-md' }: { title: string; titleExtra?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; busy?: boolean; widthClass?: string }) {
  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`bg-white rounded-xl shadow-2xl w-full ${widthClass} overflow-hidden max-h-[92vh] flex flex-col`}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-wrap">
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            {titleExtra}
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="text-gray-400 hover:text-gray-600 p-1 disabled:opacity-40"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 shrink-0">{footer}</div>}
      </div>
    </div>
  )
}

// A success or error message with an OK button (the staff system's popup).
export function Notice({ type, title, message, onClose }: { type: 'success' | 'error'; title: string; message: string; onClose: () => void }) {
  return <ConfirmModal isOpen type={type} title={title} message={message} confirmText="OK" onConfirm={onClose} onCancel={onClose} />
}
