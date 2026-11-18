// Sign-in, and the first-login "choose your own password" page.
import { useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, Check, Eye, EyeOff, Loader2, Lock, User } from 'lucide-react'
import { ApiError, changePassword, login, logout, type Me } from '../api'
import { errText } from '../lib'

// PESO blue page with a white card (the portal's blue and white, switched around from the sidebar look).
const glassLabel = 'block text-xs uppercase tracking-wide text-gray-900 font-semibold mb-1'
const glassInput = 'glass-input w-full px-3 py-2.5 rounded-lg text-sm text-gray-900 bg-white border border-gray-300 outline-none transition-colors focus:ring-2 focus:ring-brand-blue focus:border-transparent placeholder:text-gray-400'
const glassIcon = 'absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none'
const glassPrimary = 'px-5 py-2.5 bg-brand-blue text-white rounded-lg text-sm font-semibold hover:bg-brand-blue-dark disabled:opacity-60 inline-flex items-center justify-center gap-2 transition-colors'
const glassPrimaryStyle = {}
const glassError = 'text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2'

function Frame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-brand-blue">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="px-8 pt-7 pb-5 max-sm:px-5 flex flex-col items-center text-center border-b border-gray-300">
          <img src="/logo3.png" alt="PESO Logo" className="w-20 h-20 object-contain rounded-full ring-2 ring-blue-200 shadow-md shadow-blue-900/15" />
          <p className="font-bold m-0 mt-3 leading-tight tracking-wide text-brand-blue" style={{ fontSize: 'var(--text-md)' }}>E-PESO TANGUB CITY</p>
          <span className="mt-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-brand-blue text-xs font-semibold tracking-wider uppercase">Employer Portal</span>
        </div>
        <div className="px-8 py-6 max-sm:px-5 max-sm:py-5">
          <h1 className="text-xl font-bold text-gray-800 m-0">{title}</h1>
          <div className="flex items-start gap-2 mt-1 mb-5">
            <span className="w-4 h-[3px] rounded-full bg-brand-blue mt-2 shrink-0" />
            <p className="text-sm text-gray-500 m-0">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
      <p className="text-xs text-white/80 mt-5 text-center max-w-md">Public Employment Service Office, Tangub City. For employers registered with the PESO.</p>
    </div>
  )
}

function PasswordInput({ value, onChange, id, autoComplete, placeholder }: { value: string; onChange: (v: string) => void; id: string; autoComplete: string; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Lock size={16} className={glassIcon} />
      <input id={id} type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} autoComplete={autoComplete} placeholder={placeholder} className={`${glassInput} pl-10 pr-10`} />
      <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}

type ForgotStep = 'verify' | 'reset' | 'done'
const FORGOT_SUBTITLE: Record<ForgotStep, string> = {
  verify: 'Enter the temporary password the PESO gave you',
  reset: 'Choose a new password for your account',
  done: 'Your password has been changed',
}

// Forgot password: the PESO checks who you are and gives you a temporary password; here you use it to choose a new one.
// (It uses the normal sign-in and "choose your own password" calls, so the same lockout and password rules apply.)
function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<ForgotStep>('verify')
  const [username, setUsername] = useState('')
  const [temp, setTemp] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const stepIndex = step === 'verify' ? 0 : step === 'reset' ? 1 : 2

  // Leaving while the temporary-password session is open ends that session first.
  async function leave() {
    if (step === 'reset') await logout().catch(() => undefined)
    onBack()
  }

  async function verify(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    if (!username.trim() || !temp) { setError('Please enter your username and the temporary password.'); return }
    setBusy(true); setError('')
    try {
      const me = await login(username.trim(), temp)
      if (!me.mustChangePassword) {
        // A normal password was typed, not a temporary one: nothing to reset here.
        await logout().catch(() => undefined)
        setError('This account has no temporary password waiting. Please contact the PESO to get one.')
        setBusy(false); return
      }
      setTemp(''); setStep('reset'); setBusy(false)
    } catch (err) { setError(errText(err)); setBusy(false) }
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    if (next !== again) { setError('The two new passwords do not match.'); return }
    setBusy(true); setError('')
    try {
      await changePassword(next)
      await logout().catch(() => undefined)   // they sign in again with the new password
      setNext(''); setAgain(''); setStep('done'); setBusy(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { setStep('verify'); setError('This took too long. Please enter your username and temporary password again.') }
      else setError(errText(err))
      setBusy(false)
    }
  }

  const backLink = (
    <div className="text-center">
      <button type="button" onClick={() => void leave()} disabled={busy} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-brand-blue hover:underline disabled:opacity-50">
        <ArrowLeft size={15} />Back to Login
      </button>
    </div>
  )

  return (
    <Frame title="Forgot Password" subtitle={FORGOT_SUBTITLE[step]}>
      {step !== 'done' && (
        <div className="flex gap-2 mb-5" aria-label={`Step ${stepIndex + 1} of 2`}>
          {[0, 1].map(i => <span key={i} className={`h-1 flex-1 rounded-full ${i <= stepIndex ? 'bg-brand-blue' : 'bg-gray-200'}`} />)}
        </div>
      )}

      {step === 'verify' && (
        <form onSubmit={e => void verify(e)} className="space-y-4">
          <p className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            Contact the PESO to get a temporary password. They will confirm who you are first. Then enter it here with your username.
          </p>
          <div>
            <label htmlFor="fp-username" className={glassLabel}>Username</label>
            <div className="relative">
              <User size={16} className={glassIcon} />
              <input id="fp-username" value={username} onChange={e => { setUsername(e.target.value); setError('') }} autoComplete="username" autoCapitalize="none" autoFocus
                placeholder="Enter your username" className={`${glassInput} pl-10`} />
            </div>
          </div>
          <div>
            <label htmlFor="fp-temp" className={glassLabel}>Temporary password</label>
            <PasswordInput id="fp-temp" value={temp} onChange={v => { setTemp(v); setError('') }} autoComplete="off" placeholder="Enter the temporary password" />
          </div>
          {error && <p role="alert" className={glassError}>{error}</p>}
          <button type="submit" disabled={busy} className={`${glassPrimary} w-full`}>
            {busy && <Loader2 size={16} className="animate-spin" />}{busy ? 'Checking…' : 'Continue'}
          </button>
          {backLink}
        </form>
      )}

      {step === 'reset' && (
        <form onSubmit={e => void save(e)} className="space-y-4">
          <div>
            <label htmlFor="fp-new" className={glassLabel}>New password</label>
            <PasswordInput id="fp-new" value={next} onChange={v => { setNext(v); setError('') }} autoComplete="new-password" placeholder="Enter a new password" />
            <p className="text-xs text-gray-400 mt-1">At least 8 characters, with a letter and a number.</p>
          </div>
          <div>
            <label htmlFor="fp-again" className={glassLabel}>Retype new password</label>
            <PasswordInput id="fp-again" value={again} onChange={v => { setAgain(v); setError('') }} autoComplete="new-password" placeholder="Retype the new password" />
          </div>
          {error && <p role="alert" className={glassError}>{error}</p>}
          <button type="submit" disabled={busy || !next || !again} className={`${glassPrimary} w-full`}>
            {busy && <Loader2 size={16} className="animate-spin" />}Save password
          </button>
          {backLink}
        </form>
      )}

      {step === 'done' && (
        <div className="space-y-5 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center"><Check size={28} className="text-green-600" /></div>
          <p className="text-sm text-gray-600">Sign in with your new password.</p>
          <button type="button" onClick={onBack} className={`${glassPrimary} w-full`}>Back to Login</button>
        </div>
      )}
    </Frame>
  )
}

export function LoginPage({ onSignedIn, notice }: { onSignedIn: (me: Me) => void; notice?: string }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [forgot, setForgot] = useState(false)
  const [showNotice, setShowNotice] = useState(true)   // the notice from the app (e.g. "could not reach the portal") goes away once they act

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setShowNotice(false)
    if (!username.trim() || !password) { setError('Please enter your username and password.'); return }
    setBusy(true); setError('')
    try { onSignedIn(await login(username.trim(), password)) } catch (err) { setError(errText(err)); setBusy(false) }
  }

  if (forgot) return <ForgotPassword onBack={() => { setForgot(false); setError(''); setPassword('') }} />

  return (
    <Frame title="Welcome back" subtitle="Sign in to your employer account.">
      <form onSubmit={e => void submit(e)} className="space-y-4">
        {notice && showNotice && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{notice}</p>}
        <div>
          <label htmlFor="username" className={glassLabel}>Username</label>
          <div className="relative">
            <User size={16} className={glassIcon} />
            {/* No autoFocus here: on a phone it would open the keyboard at once, and the browser's list of saved usernames would pop open by itself. */}
            <input id="username" value={username} onChange={e => { setUsername(e.target.value); setError(''); setShowNotice(false) }} autoComplete="username" autoCapitalize="none"
              placeholder="Enter your username" className={`${glassInput} pl-10`} />
          </div>
        </div>
        <div>
          <label htmlFor="password" className={glassLabel}>Password</label>
          <PasswordInput id="password" value={password} onChange={v => { setPassword(v); setError(''); setShowNotice(false) }} autoComplete="current-password" placeholder="Enter your password" />
          <div className="flex justify-end mt-1.5">
            <button type="button" onClick={() => setForgot(true)} className="text-xs font-semibold text-brand-blue hover:underline focus:outline-none">Forgot password?</button>
          </div>
        </div>
        {error && <p role="alert" className={glassError}>{error}</p>}
        <button type="submit" disabled={busy} className={`${glassPrimary} w-full`} style={glassPrimaryStyle}>
          {busy && <Loader2 size={16} className="animate-spin" />}{busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-xs text-gray-500 text-center m-0 pt-1">Need an account? Please contact the PESO.</p>
      </form>
    </Frame>
  )
}

export function ChangePasswordPage({ me, onDone, onLogout }: { me: Me; onDone: () => void; onLogout: () => void }) {
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    if (next !== again) { setError('The two new passwords do not match.'); return }
    setBusy(true); setError('')
    try { await changePassword(next); onDone() } catch (err) { setError(errText(err)); setBusy(false) }
  }

  return (
    <Frame title="Choose your own password" subtitle={`Welcome, ${me.companyName}. For your security, please replace the temporary password with one of your own.`}>
      <form onSubmit={e => void submit(e)} className="space-y-4">
        <div>
          <label htmlFor="new" className={glassLabel}>New password</label>
          <PasswordInput id="new" value={next} onChange={setNext} autoComplete="new-password" />
          <p className="text-xs text-gray-400 mt-1">At least 8 characters, with a letter and a number.</p>
        </div>
        <div>
          <label htmlFor="again" className={glassLabel}>New password again</label>
          <PasswordInput id="again" value={again} onChange={setAgain} autoComplete="new-password" />
        </div>
        {error && <p role="alert" className={glassError}>{error}</p>}
        <button type="submit" disabled={busy || !next || !again} className={`${glassPrimary} w-full`} style={glassPrimaryStyle}>
          {busy && <Loader2 size={16} className="animate-spin" />}Save password
        </button>
        {/* Leaves this screen (it signs the employer out), like "Back to Login" on the staff side. */}
        <div className="text-center">
          <button type="button" onClick={onLogout} disabled={busy} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-brand-blue hover:underline disabled:opacity-50">
            <ArrowLeft size={15} />Back to Login
          </button>
        </div>
      </form>
    </Frame>
  )
}
