// Applicant self-service kiosk (/apply/). One flow, one applicant at a time:
//   welcome + privacy consent -> choose a service -> that program's form -> thank-you screen.
// The applicant only ever sees their own entries. Nothing is saved as a real applicant: the
// submission waits in the staff "Pending" inbox until staff approve it. The page resets itself
// after each submission and when nobody touches it, so the next person never sees old data.

import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Clock, Loader2, Lock, WifiOff } from 'lucide-react'
import logoImage from '../assets/logo3.png'
import KioskForm from './KioskForm'
import efLogo from './logos/ef.png'
import cdspLogo from './logos/cdsp.png'
import gipLogo from './logos/gip.png'
import spesLogo from './logos/spes.png'
import skillsLogo from './logos/skills.png'
import dilpLogo from './logos/dilp.png'
import tupadLogo from './logos/tupad.png'
import slpLogo from './logos/slp.png'
import clpepLogo from './logos/clpep.png'
import ofwLogo from './logos/ofw.png'
import ConfirmModal from '../pages/shared/ConfirmModal'
import { getKioskStatus, submitApplication, type KioskStatus } from './kioskService'
import { useIdleTimeout } from './useIdleTimeout'

type Screen = 'loading' | 'offline' | 'closed' | 'welcome' | 'pick' | 'form' | 'done'

const IDLE_MS = 3 * 60_000          // no touch for 3 minutes -> warn
const IDLE_GRACE_MS = 30_000        // ...then clear the form after 30 more seconds
const DONE_SCREEN_SECONDS = 30      // thank-you screen returns to the start by itself
const STATUS_POLL_MS = 5_000        // the start, closed and program-list screens re-check whether the kiosk is open
const RELOAD_AFTER_MS = 6 * 60 * 60_000 // a page left open for hours reloads at the next idle moment (picks up updates)

// The short code and the official logo shown on each service card. The logos are the program artwork
// trimmed and shrunk to small files in ./logos (add a new program: add its code + logo here).
const PROGRAM_CODE: Record<string, string> = {
  ef: 'EF', cdsp: 'CDSP', gip: 'GIP', spes: 'SPES', skills: 'SKILLS',
  dilp: 'DILP', tupad: 'TUPAD', slp: 'SLP', clpep: 'CLPEP', ofw: 'OFW',
}
const PROGRAM_LOGO: Record<string, string> = {
  ef: efLogo, cdsp: cdspLogo, gip: gipLogo, spes: spesLogo, skills: skillsLogo,
  dilp: dilpLogo, tupad: tupadLogo, slp: slpLogo, clpep: clpepLogo, ofw: ofwLogo,
}

// The kiosk is a fixed light design (white cards on light gray). The app's global styles switch the heading and text
// colors to near-white when the computer is in dark mode, which would make them invisible here, so the kiosk keeps
// the light-mode values (and light form controls) whatever the computer's setting is.
const LIGHT_THEME = {
  colorScheme: 'light',
  '--text': '#6b6375', '--text-h': '#08060d', '--bg': '#fff', '--border': '#e5e4e7', '--code-bg': '#f4f3ec',
} as React.CSSProperties

export default function KioskApp() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [status, setStatus] = useState<KioskStatus | null>(null)
  const [program, setProgram] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [sessionKey, setSessionKey] = useState(0)
  const [reference, setReference] = useState('')
  const [doneSeconds, setDoneSeconds] = useState(DONE_SCREEN_SECONDS)
  const [confirmCancel, setConfirmCancel] = useState(false)
  // Has the applicant typed or chosen anything in the open form? (Decides whether leaving needs a "sure?")
  const touchedRef = useRef(false)
  // Hidden "website" field: people never see it, spam bots fill it in. The server ignores those.
  const [honeypot, setHoneypot] = useState('')
  const submittedRef = useRef('')
  const loadedAt = useRef(0)
  useEffect(() => { loadedAt.current = Date.now() }, [])

  // Re-checks whether the kiosk is switched on (and which services are on). It changes the screen only when nothing
  // has been entered yet (start, closed, offline, program list), so a form in progress is never interrupted.
  const refreshStatus = useCallback(
    () => getKioskStatus().then(
      s => {
        setStatus(s)
        if (!s.enabled) setAgreed(false) // when it opens again, the next person starts from the notice
        setScreen(cur => {
          if (cur === 'loading' || cur === 'offline' || cur === 'closed' || cur === 'welcome') return s.enabled ? 'welcome' : 'closed'
          if (cur === 'pick' && !s.enabled) return 'closed'
          return cur
        })
      },
      () => setScreen(cur => (cur === 'loading' || cur === 'closed' || cur === 'welcome') ? 'offline' : cur),
    ),
    [],
  )

  useEffect(() => { void refreshStatus() }, [refreshStatus])

  const isIdleScreen = screen === 'loading' || screen === 'offline' || screen === 'closed' || screen === 'welcome' || screen === 'pick' || screen === 'form'
  useEffect(() => {
    if (!isIdleScreen) return
    const id = window.setInterval(() => { void refreshStatus() }, STATUS_POLL_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') void refreshStatus() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [isIdleScreen, refreshStatus])

  // Back to the very start, with everything cleared.
  const resetKiosk = useCallback(() => {
    submittedRef.current = ''
    setAgreed(false)
    setReference('')
    setHoneypot('')
    setProgram('')
    setConfirmCancel(false)
    setSessionKey(k => k + 1)
    // A kiosk left open for hours reloads here (nobody is using it) so it always runs the latest version.
    if (Date.now() - loadedAt.current > RELOAD_AFTER_MS) { window.location.reload(); return }
    setScreen('welcome')
    void refreshStatus()
  }, [refreshStatus])

  const idle = useIdleTimeout(screen === 'pick' || screen === 'form', IDLE_MS, IDLE_GRACE_MS, resetKiosk)

  // Thank-you screen: count down, then return to the start for the next person.
  useEffect(() => {
    if (screen !== 'done') return
    let left = DONE_SCREEN_SECONDS
    const id = window.setInterval(() => {
      left -= 1
      setDoneSeconds(left)
      if (left <= 0) { window.clearInterval(id); resetKiosk() }
    }, 1000)
    return () => window.clearInterval(id)
  }, [screen, resetKiosk])

  // Back to the list of services (a mistaken tap, or "cancel"): the person already accepted the privacy
  // notice, so they don't start over from the welcome page. Whatever was entered is discarded.
  const backToPicker = () => {
    submittedRef.current = ''
    touchedRef.current = false
    setConfirmCancel(false)
    setHoneypot('')
    setProgram('')
    setSessionKey(k => k + 1)
    setScreen('pick')
  }

  // Something in the form has been typed or chosen. Tracked as it happens (typing, picking from a list, ticking
  // a box), because several forms start with default answers, so looking at the values afterwards can't tell.
  const formHasEntries = () => touchedRef.current

  const noteFormClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const button = target.closest('button')
    if (button) {
      // Moving between steps, leaving or submitting is not "filling in" the form.
      const name = `${button.getAttribute('aria-label') ?? ''} ${button.textContent ?? ''}`
      if (/close form|cancel|next|previous|back|submit|review/i.test(name)) return
    }
    if (target.closest('button, label, select, [role="option"], .cursor-pointer')) touchedRef.current = true
  }

  // The service (or the whole kiosk) was switched off while the applicant is filling in its form: they can't submit it
  // any more, so tell them now instead of letting them finish and fail at Submit.
  const formClosed = screen === 'form' && status !== null
    && (!status.enabled || !status.programs.some(p => p.id === program))

  const choose = (id: string) => {
    submittedRef.current = ''
    touchedRef.current = false
    setProgram(id)
    setSessionKey(k => k + 1)
    setScreen('form')
  }

  // Sends the form to the server and remembers the reference number. Throws on failure.
  const submitNow = async (data: object) => {
    submittedRef.current = await submitApplication(program, data, honeypot)
  }

  // Called with the finished form, after the applicant checked it on the form's own review screen.
  // The form shows the problem itself if this fails (it throws).
  const handleSubmit = (data: object): Promise<void> => submitNow(data)

  // The form calls this both after a successful submit and when the applicant presses Cancel.
  const handleFormClose = () => {
    if (submittedRef.current) {
      setReference(submittedRef.current)
      setDoneSeconds(DONE_SCREEN_SECONDS)
      setScreen('done')
    } else if (formHasEntries()) {
      setConfirmCancel(true)
    } else {
      backToPicker() // nothing entered yet: no need to ask
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-brand-bg flex flex-col text-gray-800" style={LIGHT_THEME}>
      <header className="bg-brand-blue shadow-md shrink-0 relative z-40">
        <div className="max-w-6xl mx-auto px-6 max-sm:px-3 py-3 flex items-center gap-4">
          <img src={logoImage} alt="PESO Logo" className="w-14 h-14 object-contain max-sm:w-10 max-sm:h-10" />
          <div className="min-w-0">
            <p className="text-white font-bold m-0 leading-tight truncate" style={{ fontSize: 'var(--text-lg, 1.125rem)' }}>E-PESO TANGUB CITY</p>
            <p className="text-white/90 m-0 leading-tight truncate text-sm">Applicant Self-Service Registration</p>
          </div>
        </div>
      </header>

      {/* Only this area scrolls: the header stays put and the scrollbar starts below it. */}
      <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable] flex flex-col">
      <main className={`flex-1 w-full max-w-6xl mx-auto px-6 max-sm:px-3 py-8 max-sm:py-4 ${screen === 'welcome' ? 'flex flex-col justify-center' : ''}`}>
        {screen === 'loading' && (
          <Card center>
            <Loader2 size={36} className="animate-spin text-brand-blue" />
            <p className="text-gray-500 mt-3 text-base">Loading…</p>
          </Card>
        )}

        {screen === 'offline' && (
          <Card center>
            <WifiOff size={48} className="text-gray-400" />
            <h2 className="text-xl font-semibold mt-4 mb-1">Can't connect right now</h2>
            <p className="text-gray-500 text-base mb-6">Please ask the PESO staff for help. This screen will try again by itself.</p>
            <button type="button" onClick={() => { setScreen('loading'); void refreshStatus() }} className={primaryBtn}>Try again</button>
          </Card>
        )}

        {screen === 'closed' && (
          <Card center>
            <Lock size={48} className="text-gray-400" />
            <h2 className="text-xl font-semibold mt-4 mb-1">Self-service registration is closed</h2>
            <p className="text-gray-500 text-base">Please see the staff at the front desk. They will be glad to help you.</p>
          </Card>
        )}

        {screen === 'welcome' && (
          <Card>
            {/* Spacing comes from `gap` (the app's global p / h2 margin rules override margin utilities). */}
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <h2 className="text-2xl font-semibold m-0!">Welcome!</h2>
                <p className="text-gray-600 text-base">
                  Fill in your own information here. When you're done, a PESO staff member will check it before it is added to our records.
                  It only takes a few minutes.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-5 text-sm text-gray-700 leading-relaxed flex flex-col gap-2">
                <p className="font-semibold">Data Privacy Notice</p>
                <p>
                  The Public Employment Service Office (PESO) of Tangub City will use the information you give here to help you with
                  employment and related programs. It is kept confidential, is seen only by authorized PESO staff, and is handled
                  in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173). You may ask the staff to correct or
                  remove your information at any time.
                </p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="w-6 h-6 m-0 accent-[#0077BE] shrink-0"
              />
              <span className="text-base leading-snug text-gray-800">I have read the notice above and I agree to the use of my information.</span>
            </label>

            <button
              type="button"
              disabled={!agreed}
              onClick={() => setScreen('pick')}
              className={`${primaryBtn} self-start max-sm:self-stretch disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Continue
            </button>
            </div>
          </Card>
        )}

        {screen === 'pick' && (
          <Card wide>
            <h2 className="text-2xl font-semibold mt-0 mb-1">What would you like to apply for?</h2>
            <p className="text-gray-500 text-base mb-6">Choose a service to open its form.</p>
            {status && status.programs.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {status.programs.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => choose(p.id)}
                    className="text-left px-5 py-4 rounded-xl border-2 border-gray-200 bg-white hover:border-brand-blue hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  >
                    <div className="flex items-center gap-4">
                      {PROGRAM_LOGO[p.id] && <img src={PROGRAM_LOGO[p.id]} alt="" className="h-16 w-16 object-contain shrink-0" />}
                      <div>
                        {PROGRAM_CODE[p.id] && <p className="text-2xl font-bold m-0 text-brand-blue tracking-wide">{PROGRAM_CODE[p.id]}</p>}
                        <p className="text-base font-medium mt-1 mb-0 text-gray-700">{p.label}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-base">No services are available right now. Please see the staff at the front desk.</p>
            )}
            <div className="mt-6">
              <button type="button" onClick={resetKiosk} className="px-6 py-3 text-base text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Back
              </button>
            </div>
          </Card>
        )}

        {screen === 'form' && program !== '' && (
          <>
            <div onInputCapture={() => { touchedRef.current = true }} onChangeCapture={() => { touchedRef.current = true }} onClickCapture={noteFormClick}>
              <KioskForm key={sessionKey} program={program} onSubmit={handleSubmit} onClose={handleFormClose} />
            </div>
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={honeypot}
              onChange={e => setHoneypot(e.target.value)}
              style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
            />
          </>
        )}

        {screen === 'done' && (
          <Card center>
            <CheckCircle2 size={64} className="text-green-500" />
            <h2 className="text-2xl font-semibold mt-4 mb-1">Your application was submitted!</h2>
            <p className="text-gray-600 text-base mb-5">
              Please wait while the PESO staff review it. You may go to the staff desk and give them your reference number.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-8 py-4 mb-6">
              <p className="text-sm text-gray-500 m-0">Your reference number</p>
              <p className="text-3xl font-bold tracking-wider text-brand-blue m-0 font-mono">{reference}</p>
            </div>
            <button type="button" onClick={resetKiosk} className={primaryBtn}>Done</button>
            <p className="text-sm text-gray-400 mt-4 mb-0">This screen will reset in {doneSeconds} seconds.</p>
          </Card>
        )}
      </main>

      <footer className="text-center text-sm text-gray-500 pb-4 px-4">
        Need help? Please ask any PESO staff member.
      </footer>
      </div>

      <ConfirmModal
        isOpen={formClosed}
        type="error"
        title={status?.enabled === false ? 'Registration has closed' : 'This service has just closed'}
        message={status?.enabled === false
          ? 'Self-service registration was just switched off, so this application can no longer be sent. Please see the staff at the front desk.'
          : 'This service was just switched off, so this application can no longer be sent. You can choose another service, or see the staff at the front desk.'}
        onConfirm={() => (status?.enabled === false ? resetKiosk() : backToPicker())}
        onCancel={() => (status?.enabled === false ? resetKiosk() : backToPicker())}
      />

      <ConfirmModal
        isOpen={confirmCancel}
        type="confirm"
        confirmVariant="brand"
        title="Cancel registration?"
        message={'Everything you entered will be cleared and nothing will be sent.'}
        confirmText="Yes, cancel"
        cancelText="Keep going"
        onConfirm={backToPicker}
        onCancel={() => setConfirmCancel(false)}
      />


      {idle.secondsLeft !== null && (
        <div className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <Clock size={48} className="text-brand-orange mx-auto" />
            <h3 className="text-xl font-semibold mt-4 mb-1">Are you still there?</h3>
            <p className="text-gray-600 text-base mb-6">
              For your privacy, this form will be cleared in <span className="font-semibold">{idle.secondsLeft}</span> seconds.
            </p>
            <button type="button" onClick={idle.keepAlive} className={`${primaryBtn} w-full`}>I'm still here</button>
          </div>
        </div>
      )}
    </div>
  )
}

const primaryBtn = 'px-10 py-3 text-base font-medium bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors'

function Card({ children, center = false, wide = false }: { children: React.ReactNode; center?: boolean; wide?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl shadow-md p-8 max-sm:p-5 w-full ${wide ? 'max-w-6xl' : 'max-w-3xl'} mx-auto ${center ? 'flex flex-col items-center text-center' : ''}`}>
      {children}
    </div>
  )
}
