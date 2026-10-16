import type { ReactNode } from 'react'
import { X } from 'lucide-react'

// Shared "Assigned <Activity / Project / Intervention>" detail dialog, so every
// program shows an assignment the same way (modelled on CDSP's "Assigned
// Activity"): blue header with the person, bold title + status pill, optional
// description, a label/value list, and an action row ending in Close.

export interface AssignedItemRow {
  label: string
  value?: string | number | null
}

export interface AssignedItemAction {
  label: string
  onClick: () => void
  /** danger = red outline (Unassign), primary = blue outline (Change …), warning = orange outline (Mark as withdrawn). */
  variant: 'danger' | 'primary' | 'warning'
  disabled?: boolean
}

interface AssignedItemModalProps {
  /** Header, e.g. "Assigned Project". */
  title: string
  personName: string
  /** Bold title of the project / activity / intervention. */
  itemName: string
  /** Small gray line under the title (e.g. a project ID or category). */
  subtitle?: string
  status?: string
  description?: string
  rows: AssignedItemRow[]
  /** Shown at the very top of the body (e.g. the withdrawal banner). */
  banner?: ReactNode
  /** Extra content under the rows (assignment history, …). */
  extra?: ReactNode
  /** A short grey note between the body and the buttons. */
  footnote?: ReactNode
  /** Shown instead of the details when the item can't be found. */
  notFound?: boolean
  actions: AssignedItemAction[]
  onClose: () => void
}

function statusPill(status: string) {
  switch (status) {
    case 'Ongoing':   return 'bg-green-100 text-green-700'
    case 'Completed': return 'bg-blue-100 text-blue-700'
    case 'Cancelled': return 'bg-red-100 text-red-600'
    case 'Withdrawn': return 'bg-orange-100 text-orange-700'
    default:          return 'bg-yellow-100 text-yellow-700'
  }
}

const ACTION_CLS: Record<AssignedItemAction['variant'], string> = {
  danger:  'px-4 py-2.5 border border-red-200 text-red-500 hover:bg-red-50',
  primary: 'flex-1 py-2.5 border border-brand-blue text-brand-blue hover:bg-blue-50',
  warning: 'flex-1 py-2.5 border border-orange-300 text-orange-600 hover:bg-orange-50',
}

export default function AssignedItemModal({
  title, personName, itemName, subtitle, status, description, rows, banner, extra, footnote, notFound, actions, onClose,
}: AssignedItemModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[85vh]">
        <div className="bg-brand-blue px-6 py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-white m-0 text-base font-semibold">{title}</h3>
            <p className="text-white/80 text-sm mt-0.5">{personName}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 text-white/80 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {banner}
          {notFound ? (
            <div className="py-8 text-center">
              <p className="text-sm font-medium text-gray-700 mb-1">{itemName}</p>
              <p className="text-xs text-gray-400">Details not found. It may have been removed in Maintenance.</p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <p className="text-base font-bold text-gray-800 leading-snug">{itemName}</p>
                  {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
                </div>
                {status && (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${statusPill(status)}`}>{status}</span>
                )}
              </div>
              {description && <p className="text-sm text-gray-500 mb-4 leading-relaxed">{description}</p>}
              <div className="mt-2">
                {rows.map(r =>
                  r.value != null && r.value !== '' ? (
                    <div key={r.label} className="flex gap-3 py-2.5 border-b border-gray-100 last:border-0">
                      <span className="text-xs text-gray-400 w-36 flex-shrink-0 pt-0.5">{r.label}</span>
                      <span className="text-sm text-gray-800 font-medium">{r.value}</span>
                    </div>
                  ) : null,
                )}
              </div>
            </>
          )}
          {extra}
        </div>

        {footnote}

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          {actions.map(a => (
            <button
              key={a.label}
              onClick={a.onClick}
              disabled={a.disabled}
              className={`${ACTION_CLS[a.variant]} rounded-xl transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
            >{a.label}</button>
          ))}
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium">Close</button>
        </div>
      </div>
    </div>
  )
}
