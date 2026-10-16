import { ArrowRight } from 'lucide-react'
import type { PermissionChange, PermissionLevel } from '../../utils/permissions'

const LEVEL_STYLES: Record<PermissionLevel, string> = {
  'Full Access': 'bg-[#0077BE] text-white',
  'Editor':      'bg-green-100 text-green-700 border border-green-200',
  'Viewer':      'bg-gray-100 text-gray-600 border border-gray-200',
  'No Access':   'bg-red-50 text-red-500 border border-red-100',
}

function LevelBadge({ level }: { level: PermissionLevel }) {
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${LEVEL_STYLES[level]}`}>{level}</span>
}

interface PermissionChangeModalProps {
  isOpen: boolean
  changes: PermissionChange[]
  /** A form with unsaved changes is open: it will be cleared by the reload. */
  hasUnsavedForm?: boolean
  onAcknowledge: () => void
}

// Shown to a signed-in user when a background check (see App.tsx) notices an
// administrator changed their permissions mid-session -- without this, their
// buttons would silently stop matching their real access until they next
// logged out and back in, with no indication anything had changed.
export default function PermissionChangeModal({ isOpen, changes, hasUnsavedForm = false, onAcknowledge }: PermissionChangeModalProps) {
  if (!isOpen || changes.length === 0) return null
  return (
    <div className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8 flex flex-col max-h-[90vh]">
        <div className="flex flex-col items-center text-center mb-6 flex-shrink-0">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[#0077BE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-gray-900 font-semibold text-xl">Your Permissions Have Changed</h3>
          <p className="text-gray-500 text-base mt-2">
            An administrator updated your access while you were signed in.
          </p>
        </div>

        {/* Scrolls on its own when many modules changed, so the header and the button stay on screen. */}
        <div className="space-y-2 mb-6 overflow-y-auto flex-1 min-h-0 pr-1">
          {changes.map(c => (
            <div key={c.module} className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-800">{c.label}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <LevelBadge level={c.from} />
                <ArrowRight size={14} className="text-gray-400" />
                <LevelBadge level={c.to} />
              </div>
            </div>
          ))}
        </div>

        {hasUnsavedForm && (
          <p className="mb-4 flex-shrink-0 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            You have a form with unsaved changes. It will be cleared when the page refreshes, so you will need to enter it again.
          </p>
        )}

        <button
          onClick={onAcknowledge}
          className="w-full flex-shrink-0 py-2.5 rounded-lg text-base text-white font-medium bg-[#0077BE] hover:bg-[#006699] transition-colors"
        >
          Got It — Refresh Now
        </button>
      </div>
    </div>
  )
}
