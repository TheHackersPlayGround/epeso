import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, SESSION_ENDED, getMe, logout, type Me, type SessionEndReason } from './api'
import { ChangePasswordPage, LoginPage } from './pages/Auth'
import Shell from './pages/Shell'
import { Spinner } from './components/ui'
import ConfirmModal from '../pages/shared/ConfirmModal'

type Auth = { state: 'loading' } | { state: 'out'; notice?: string } | { state: 'in'; me: Me }

export default function App() {
  const [auth, setAuth] = useState<Auth>({ state: 'loading' })

  // Who is signed in (if anyone) when the page opens.
  useEffect(() => {
    let alive = true
    getMe()
      .then(me => { if (alive) setAuth({ state: 'in', me }) })
      .catch(e => { if (alive) setAuth({ state: 'out', notice: e instanceof ApiError && e.status === 0 ? e.message : undefined }) })
    return () => { alive = false }
  }, [])

  // The session ended while the page was open (idle too long, or the PESO switched the account off). The page goes straight
  // to the sign-in screen (they ARE signed out) and a notice on top of it says why. 'inactive' wins over a plain 'session'.
  // Only counts while signed in: the "who am I" check on a fresh visit also answers 401, and that is not an ended session.
  const [ended, setEnded] = useState<SessionEndReason | null>(null)
  const signedIn = useRef(false)
  useEffect(() => { signedIn.current = auth.state === 'in' }, [auth.state])
  useEffect(() => {
    const onEnded = (e: Event) => {
      if (!signedIn.current) return
      const reason = (e as CustomEvent<{ reason?: SessionEndReason }>).detail?.reason ?? 'session'
      setEnded(prev => (prev === 'inactive' ? prev : reason))
      setAuth({ state: 'out' })
    }
    window.addEventListener(SESSION_ENDED, onEnded)
    return () => window.removeEventListener(SESSION_ENDED, onEnded)
  }, [])

  const refreshMe = useCallback(() => {
    getMe().then(me => setAuth({ state: 'in', me })).catch(() => setAuth({ state: 'out' }))
  }, [])

  const signOut = useCallback(() => {
    logout().catch(() => undefined).finally(() => setAuth({ state: 'out' }))
  }, [])

  if (auth.state === 'loading') return <div className="min-h-screen bg-brand-bg"><Spinner /></div>
  if (auth.state === 'out') {
    return (
      <>
        <LoginPage notice={auth.notice} onSignedIn={me => { setEnded(null); setAuth({ state: 'in', me }) }} />
        <ConfirmModal
          isOpen={ended === 'inactive'} type="error" title="Account Deactivated"
          message="Your account has been deactivated by the PESO. You have been signed out. Please contact the PESO if you think this is a mistake."
          confirmText="OK" onConfirm={() => setEnded(null)} onCancel={() => setEnded(null)}
        />
        <ConfirmModal
          isOpen={ended === 'session'} type="error" title="Session ended" message="Your session has ended. Please sign in again."
          confirmText="Sign in" onConfirm={() => setEnded(null)} onCancel={() => setEnded(null)}
        />
      </>
    )
  }
  if (auth.me.mustChangePassword) return <ChangePasswordPage me={auth.me} onDone={refreshMe} onLogout={signOut} />
  return <Shell me={auth.me} onLogout={signOut} />
}
