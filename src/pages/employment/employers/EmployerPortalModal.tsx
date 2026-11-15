// Manage an employer's portal login (administrators only): create it, reset its password, switch it on/off.
// The system makes a one-time temporary password and shows it here once; the employer must change it at first login.
import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, Loader2, X } from 'lucide-react'
import ConfirmModal from '../../shared/ConfirmModal'
import type { Employer } from '../../../contexts/EmploymentContext'
import {
  createPortalAccount, getPortalAccount, resetPortalPassword, setPortalAccountStatus,
  type EmployerPortalAccount,
} from '../../../services/employerPortalService'

const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback)

// A starting username from the company name ("Moon Incorporated" -> "moon.incorporated").
function suggestUsername(company: string) {
  const s = company.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 30)
  return s.length >= 4 ? s : ''
}

export default function EmployerPortalModal({ employer, onClose }: { employer: Employer; onClose: () => void }) {
  const [account, setAccount] = useState<EmployerPortalAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState(() => suggestUsername(employer.companyName))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // The one-time password, kept only on screen.
  const [tempPassword, setTempPassword] = useState('')
  const [copied, setCopied] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const load = useCallback(() => {
    return getPortalAccount(employer.id)
      .then(a => { setAccount(a); setError('') })
      .catch(e => setError(errText(e, 'Could not load the portal account.')))
      .finally(() => setLoading(false))
  }, [employer.id])
  useEffect(() => { void load() }, [load])

  async function run(fn: () => Promise<void>) {
    setBusy(true); setError('')
    try { await fn() } catch (e) { setError(errText(e, 'Something went wrong. Please try again.')) }
    setBusy(false)
  }

  const create = () => run(async () => {
    const r = await createPortalAccount(employer.id, username.trim())
    setAccount(r.account); setTempPassword(r.temporaryPassword); setCopied(false)
  })
  const reset = () => run(async () => {
    setConfirmReset(false)
    setTempPassword(await resetPortalPassword(employer.id)); setCopied(false)
    await load()
  })
  const toggle = () => run(async () => {
    if (!account) return
    setAccount(await setPortalAccountStatus(employer.id, account.status === 'Active' ? 'Inactive' : 'Active'))
  })

  async function copyPassword() {
    try { await navigator.clipboard.writeText(tempPassword); setCopied(true) } catch { /* the password is on screen; they can copy it by hand */ }
  }

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 m-0">Portal account</h3>
            <p className="m-0 text-sm text-gray-500 mt-0.5">{employer.companyName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {loading ? (
            <p className="m-0 text-sm text-gray-400 text-center py-6"><Loader2 size={16} className="inline animate-spin mr-2" />Loading…</p>
          ) : (
            <>
              {tempPassword && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="m-0 text-xs font-semibold uppercase tracking-wide text-amber-800">Temporary password — shown once</p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-white border border-amber-200 rounded-md text-base tracking-wider text-gray-900 select-all">{tempPassword}</code>
                    <button type="button" onClick={() => void copyPassword()} className="px-3 py-2 border border-amber-300 rounded-md text-amber-800 hover:bg-amber-100 text-xs font-medium inline-flex items-center gap-1.5">
                      {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="m-0 mt-2 text-xs text-amber-800">Give the employer their username and this password. It can't be shown again; the employer must choose their own at first login.</p>
                </div>
              )}

              {account ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="m-0 text-xs uppercase tracking-wide text-gray-500">Username</p>
                      <p className="m-0 mt-1 text-sm font-medium text-gray-900 break-all">{account.username}</p>
                    </div>
                    <div>
                      <p className="m-0 text-xs uppercase tracking-wide text-gray-500">Status</p>
                      <p className="m-0 mt-1">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${account.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{account.status}</span>
                      </p>
                    </div>
                  </div>
                  {account.mustChangePassword && <p className="m-0 text-xs text-gray-500">The employer has not set their own password yet.</p>}
                  {account.status === 'Inactive' && <p className="m-0 text-xs text-gray-500">This account can't sign in to the portal while it is inactive.</p>}
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setConfirmReset(true)} disabled={busy} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50">Reset password</button>
                    <button type="button" onClick={() => void toggle()} disabled={busy} className={`px-4 py-2 rounded-lg text-sm disabled:opacity-50 border ${account.status === 'Active' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-700 hover:bg-green-50'}`}>
                      {account.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="m-0 text-sm text-gray-600">This employer has no portal login yet. Choose a username; the system makes a temporary password.</p>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-gray-900 font-semibold mb-1">Username</label>
                    <input
                      value={username} onChange={e => { setUsername(e.target.value); setError('') }} maxLength={50} autoComplete="off"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none"
                      placeholder="e.g. moon.incorporated"
                    />
                    <p className="m-0 text-xs text-gray-400 mt-1">4–50 characters: letters, numbers, dot, dash or underscore.</p>
                  </div>
                  <button type="button" onClick={() => void create()} disabled={busy || username.trim().length < 4} className="px-5 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2">
                    {busy && <Loader2 size={15} className="animate-spin" />}Create account
                  </button>
                </div>
              )}
              {error && <p className="m-0 text-red-500 text-sm">{error}</p>}
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmReset} type="confirm" confirmVariant="brand"
        title="Reset password?" message={`This makes a new temporary password for ${employer.companyName}. The old one stops working.`}
        confirmText="Yes, reset" cancelText="Cancel"
        onConfirm={() => reset()} onCancel={() => setConfirmReset(false)}
      />
    </div>
  )
}
