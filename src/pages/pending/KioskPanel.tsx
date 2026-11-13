// The kiosk settings card at the top of the Pending page: is the kiosk open, its link, and which services
// applicants can choose there. Administrators get real on/off switches (services are inside a "Manage" list);
// everyone else just sees a summary.

import { useState } from 'react'
import { Check, ChevronDown, Copy, ExternalLink, Loader2 } from 'lucide-react'
import type { KioskProgramSetting } from '../../services/submissionService'

// Same short codes as the cards on the kiosk, and each program's full name.
const PROGRAM_CODE: Record<string, string> = {
  ef: 'EF', cdsp: 'CDSP', gip: 'GIP', spes: 'SPES', skills: 'SKILLS',
  dilp: 'DILP', tupad: 'TUPAD', slp: 'SLP', clpep: 'CLPEP', ofw: 'OFW',
}
const PROGRAM_NAME: Record<string, string> = {
  ef: 'Employment Facilitation',
  cdsp: 'Career Development Support Program',
  gip: 'Government Internship Program',
  spes: 'Special Program for Employment of Students',
  skills: 'Skills Training',
  dilp: 'DOLE Integrated Livelihood Program',
  tupad: 'Tulong Panghanapbuhay sa Disadvantaged Workers',
  slp: 'Sustainable Livelihood Program',
  clpep: 'Child Labor Prevention and Elimination Program',
  ofw: 'OFW Assistance',
}

function Switch({ checked, onChange, disabled = false, busy = false, label }: {
  checked: boolean; onChange: () => void; disabled?: boolean; busy?: boolean; label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled || busy}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${checked ? 'bg-green-500' : 'bg-gray-300'}`}
    >
      <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[1.1rem]' : 'translate-x-0.5'}`}>
        {busy && <Loader2 size={10} className="animate-spin text-gray-500" />}
      </span>
    </button>
  )
}

interface KioskPanelProps {
  admin: boolean
  /** null while it is still loading or could not be read. */
  kioskOn: boolean | null
  programs: KioskProgramSetting[]
  togglingKiosk: boolean
  /** Id of the service being saved right now ('' = none). */
  togglingProgram: string
  /** A short result line after a change, e.g. "SPES is now closed at the kiosk." */
  message: string
  kioskUrl: string
  copied: boolean
  onToggleKiosk: (next: boolean) => void
  onToggleProgram: (id: string) => void
  onCopy: () => void
}

export default function KioskPanel({
  admin, kioskOn, programs, togglingKiosk, togglingProgram, message, kioskUrl, copied, onToggleKiosk, onToggleProgram, onCopy,
}: KioskPanelProps) {
  const [open, setOpen] = useState(false)
  const onCount = programs.filter(p => p.enabled).length
  const closed = programs.filter(p => !p.enabled).map(p => PROGRAM_CODE[p.id] ?? p.label)

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
      {/* Master switch + link */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Applicant kiosk</span>
          {admin && kioskOn !== null && (
            <Switch checked={kioskOn} busy={togglingKiosk} onChange={() => onToggleKiosk(!kioskOn)} label="Applicant kiosk open" />
          )}
          {kioskOn === null ? (
            <span className="text-sm font-semibold text-gray-500">Unknown</span>
          ) : kioskOn ? (
            <span className="text-sm font-semibold text-green-700">Open</span>
          ) : (
            <span className="text-sm font-semibold text-red-600">Closed</span>
          )}
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <code className="text-sm bg-gray-100! rounded px-2 py-1 text-gray-800! truncate">{kioskUrl}</code>
          <button type="button" onClick={onCopy} className="px-2.5 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 inline-flex items-center gap-1.5 text-gray-700">
            {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}
          </button>
          <a href={kioskUrl} target="_blank" rel="noreferrer" className="px-2.5 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 inline-flex items-center gap-1.5 text-gray-700">
            <ExternalLink size={13} />Open
          </a>
        </div>
      </div>

      {/* Services */}
      {programs.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <p className="text-sm text-gray-700">Services applicants can choose at the kiosk</p>
              <p className="text-xs text-gray-500">
                {onCount} of {programs.length} open{closed.length > 0 ? ` · Closed: ${closed.join(', ')}` : ''}
              </p>
            </div>
            {admin && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-green-700" role="status" aria-live="polite">{message}</span>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen(o => !o)}
                className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 inline-flex items-center gap-1.5 text-gray-700"
              >
                Manage services
                <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              </div>
            )}
          </div>

          {admin && open && (
            <div className="mt-3">
              <div className="grid grid-cols-2 max-md:grid-cols-1 gap-x-8 gap-y-1">
                {programs.map(p => (
                  <div key={p.id} className="flex items-center gap-3 py-1">
                    <Switch
                      checked={p.enabled}
                      busy={togglingProgram === p.id}
                      disabled={kioskOn !== true || togglingProgram !== ''}
                      onChange={() => onToggleProgram(p.id)}
                      label={`${PROGRAM_NAME[p.id] ?? p.label} at the kiosk`}
                    />
                    <span className="w-12 shrink-0 text-xs font-bold text-brand-blue">{PROGRAM_CODE[p.id] ?? p.id.toUpperCase()}</span>
                    <span className={`text-sm ${p.enabled ? 'text-gray-800' : 'text-gray-400'}`}>{PROGRAM_NAME[p.id] ?? p.label}</span>
                  </div>
                ))}
              </div>
              {kioskOn !== true && <div className="mt-2"><p className="text-xs text-gray-500">Open the kiosk to change which services are available.</p></div>}
            </div>
          )}

        </div>
      )}
    </div>
  )
}
