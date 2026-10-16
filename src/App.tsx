import { useState, useEffect, useRef } from 'react'
import Login from './pages/auth/login'
import SecuritySetup from './pages/auth/SecuritySetup'
import Dashboard from './pages/dashboard/dashboard'
import Navbar from './pages/shared/navbar'
import CDSPView from './pages/cdsp/cdsp'
import GIPView from './pages/gip/gip'
import SPESView from './pages/spes/spes'
import OFWView from './pages/ofw/ofw'
import EmploymentFacilitation from './pages/employment/EmploymentFacilitation'
import DocumentsView from './pages/documents/DocumentsView'
import SkillsTrainingView from './pages/skills-training/SkillsTrainingView'
import Maintenance from './pages/maintenance/Maintenance'
import SecurityView from './pages/security/SecurityView'
import { canView, diffPermissionLevels, type PermissionChange, type StoredUser } from './utils/permissions'
import LivelihoodView from './pages/livelihood/LivelihoodView'
import ReportView from './pages/report/ReportView'
import AboutView from './pages/about/AboutView'
import ProfileView from './pages/profile/ProfileView'
import { CDSPProvider } from './contexts/CDSPContext'
import { GIPProvider } from './contexts/GIPContext'
import { SPESProvider } from './contexts/SPESContext'
import { OFWProvider } from './contexts/OFWContext'
import { SkillsTrainingProvider } from './contexts/SkillsTrainingContext'
import { DocumentsProvider } from './contexts/DocumentsContext'
import { DILPProvider } from './contexts/DILPContext'
import { TUPADProvider } from './contexts/TUPADContext'
import { SLPProvider } from './contexts/SLPContext'
import { CLPEPProvider } from './contexts/CLPEPContext'
import { EmploymentProvider } from './contexts/EmploymentContext'
import { logout as apiLogout, getMe } from './services/userService'
import ConfirmModal from './pages/shared/ConfirmModal'
import { clearAllDrafts, clearDraftsForModules } from './hooks/useFormDraft'
import { requestLeave, hasDirtyForm } from './hooks/leaveGuard'
import NavLeaveGuard from './components/NavLeaveGuard'
import PermissionChangeModal from './pages/shared/PermissionChangeModal'
import './styles/App.css'

type Page = 'dashboard' | 'cdsp' | 'gip' | 'spes' | 'ofw' | 'employment' | 'skills' | 'documents' | 'maintenance' | 'livelihood' | 'security' | 'report' | 'about' | 'profile'

function AppContent({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')

  const nav = (id: string) => {
    if (id === 'cdsp') setCurrentPage('cdsp')
    if (id === 'gip') setCurrentPage('gip')
    if (id === 'spes') setCurrentPage('spes')
    if (id === 'ofw') setCurrentPage('ofw')
    if (id === 'employment') setCurrentPage('employment')
    if (id === 'skills') setCurrentPage('skills')
    if (id === 'documents') setCurrentPage('documents')
    if (id === 'maintenance') setCurrentPage('maintenance')
    if (id === 'livelihood') setCurrentPage('livelihood')
    if (id === 'security')   setCurrentPage('security')
    if (id === 'report')     setCurrentPage('report')
  }

  const getCurrentUsername = () => {
    try { return (JSON.parse(localStorage.getItem('peso_current_user') || '{}') as { firstName?: string }).firstName || 'User' }
    catch { return 'User' }
  }

  const [navUsername, setNavUsername] = useState(getCurrentUsername)

  // Every page renders {navbar}, so the unsaved-form confirmation is mounted
  // here once. Navigating away asks first if an open form has changes.
  const navbar = (
    <>
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => requestLeave(() => {
          setActiveTab(tab)
          if (tab === 'About PESO') setCurrentPage('about')
          if (tab === 'Dashboard') setCurrentPage('dashboard')
        })}
        onLogout={onLogout}
        onProfileClick={() => requestLeave(() => setCurrentPage('profile'))}
        username={navUsername}
      />
      <NavLeaveGuard />
    </>
  )

  if (currentPage === 'cdsp') {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {navbar}
        <div className="flex-1 overflow-hidden">
          <CDSPView onBack={() => requestLeave(() => setCurrentPage('dashboard'))} />
        </div>
      </div>
    )
  }

  if (currentPage === 'gip') {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {navbar}
        <div className="flex-1 overflow-hidden">
          <GIPView onBack={() => requestLeave(() => setCurrentPage('dashboard'))} />
        </div>
      </div>
    )
  }

  if (currentPage === 'spes') {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {navbar}
        <div className="flex-1 overflow-hidden">
          <SPESView onBack={() => requestLeave(() => setCurrentPage('dashboard'))} />
        </div>
      </div>
    )
  }

  if (currentPage === 'ofw') {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {navbar}
        <div className="flex-1 overflow-hidden">
          <OFWView onBack={() => requestLeave(() => setCurrentPage('dashboard'))} />
        </div>
      </div>
    )
  }

  if (currentPage === 'employment') {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {navbar}
        <div className="flex-1 overflow-y-auto">
          <EmploymentFacilitation onBack={() => requestLeave(() => setCurrentPage('dashboard'))} />
        </div>
      </div>
    )
  }

  if (currentPage === 'documents') {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {navbar}
        <div className="flex-1 overflow-hidden">
          <DocumentsView onBack={() => requestLeave(() => setCurrentPage('dashboard'))} />
        </div>
      </div>
    )
  }

  if (currentPage === 'skills') {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {navbar}
        <div className="flex-1 overflow-hidden">
          <SkillsTrainingView onBack={() => requestLeave(() => setCurrentPage('dashboard'))} />
        </div>
      </div>
    )
  }

  if (currentPage === 'maintenance') {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {navbar}
        <div className="flex-1 overflow-y-auto">
          <Maintenance onBack={() => requestLeave(() => setCurrentPage('dashboard'))} />
        </div>
      </div>
    )
  }

  if (currentPage === 'livelihood') {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {navbar}
        <div className="flex-1 overflow-y-auto">
          <LivelihoodView onBack={() => requestLeave(() => setCurrentPage('dashboard'))} />
        </div>
      </div>
    )
  }

  if (currentPage === 'security') {
    // Security is administrator-only; block the page for anyone without access.
    if (!canView('security')) {
      return (
        <div className="h-screen flex flex-col overflow-hidden">
          {navbar}
          <div className="flex-1 overflow-y-auto bg-gray-50 flex items-center justify-center">
            <div className="text-center p-8">
              <p className="text-gray-800 text-lg font-semibold mb-1">Access denied</p>
              <p className="text-gray-500 text-sm mb-4">You don't have permission to access Security.</p>
              <button onClick={() => setCurrentPage('dashboard')} className="px-4 py-2 bg-[#0077BE] text-white rounded-lg hover:bg-[#006699] transition-colors text-sm">
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {navbar}
        <div className="flex-1 overflow-y-auto bg-gray-50 [scrollbar-gutter:stable]">
          <SecurityView onBack={() => requestLeave(() => setCurrentPage('dashboard'))} />
        </div>
      </div>
    )
  }

  if (currentPage === 'report') {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {navbar}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <ReportView onBack={() => requestLeave(() => setCurrentPage('dashboard'))} />
        </div>
      </div>
    )
  }

  if (currentPage === 'about') {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {navbar}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <AboutView onBack={() => requestLeave(() => { setCurrentPage('dashboard'); setActiveTab('Dashboard') })} />
        </div>
      </div>
    )
  }

  if (currentPage === 'profile') {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {navbar}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <ProfileView
            onBack={() => requestLeave(() => setCurrentPage('dashboard'))}
            onLogout={onLogout}
            onNameChange={(firstName) => setNavUsername(firstName)}
          />
        </div>
      </div>
    )
  }

  // Dashboard
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {navbar}
      <div className="flex-1 overflow-y-auto">
        <Dashboard onModuleClick={nav} />
      </div>
    </div>
  )
}

// An admin who hasn't set up security questions must do so before continuing.
function needsSecuritySetup(user: { role?: string; securityQuestionsSet?: boolean }): boolean {
  return user?.role === 'Administrator' && user?.securityQuestionsSet === false
}

// How often a signed-in tab re-checks its own permissions (an administrator may
// have changed them). Also checked when the window regains focus, the browser
// comes back online, or an action is refused (403).
const PERMISSION_CHECK_MS = 10_000
const PERMISSION_CHECK_TIMEOUT_MS = 8_000
const PERMISSION_RETRY_MS = 3_000

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [logoutConfirm, setLogoutConfirm] = useState(false)
  const [permissionChanges, setPermissionChanges] = useState<PermissionChange[]>([])
  // The permission check could not reach the server several times in a row, so
  // the on-screen access may be out of date (shown as a small banner).
  const [accessCheckFailing, setAccessCheckFailing] = useState(false)
  // The server says the session is gone (signed out elsewhere / expired).
  const [sessionEnded, setSessionEnded] = useState(false)
  // An administrator deactivated this account while it was in use.
  const [accountDeactivated, setAccountDeactivated] = useState(false)
  // This tab's own last-known permissions. Compared against instead of the
  // shared localStorage copy, which another tab may already have refreshed,
  // so every open tab gets its own notice.
  const knownUserRef = useRef<StoredUser | null>(null)

  // Read the cached user and decide whether the security-questions setup is required.
  const refreshSetupGate = () => {
    try {
      const u = JSON.parse(localStorage.getItem('peso_current_user') || '{}')
      setNeedsSetup(needsSecuritySetup(u))
    } catch { setNeedsSetup(false) }
  }

  // On load, ask the backend who is logged in. If a session cookie is still
  // valid, restore it (survives a page refresh); otherwise show the login page.
  useEffect(() => {
    let active = true
    getMe()
      .then(user => {
        if (!active) return
        try { localStorage.setItem('peso_current_user', JSON.stringify(user)) } catch { /* quota */ }
        setNeedsSetup(needsSecuritySetup(user))
        setIsLoggedIn(true)
      })
      .catch(() => { /* no active session — stay logged out */ })
      .finally(() => { if (active) setCheckingSession(false) })
    return () => { active = false }
  }, [])

  // Permissions are otherwise only loaded once, at the effect above -- an
  // admin changing someone's access mid-session would silently do nothing
  // for that signed-in tab until they next logged out and back in. This
  // periodically re-checks and, if anything actually changed, holds the new
  // value back (the cached copy stays in effect) until the user acknowledges
  // it in PermissionChangeModal, rather than their buttons shifting under
  // them with no explanation mid-task.
  // Any request that discovers the account was deactivated raises this event
  // (see services/axiosClient.ts) -- covers both the background check and a
  // click on something that was then refused.
  useEffect(() => {
    if (!isLoggedIn) return
    const onDeactivated = () => setAccountDeactivated(true)
    window.addEventListener('peso:deactivated', onDeactivated)
    return () => window.removeEventListener('peso:deactivated', onDeactivated)
  }, [isLoggedIn])

  // A new login (or logging out) starts from a fresh baseline. Declared BEFORE
  // the polling effect so that on login it runs first and the poller then reads
  // a clean baseline.
  useEffect(() => { knownUserRef.current = null }, [isLoggedIn])

  useEffect(() => {
    if (!isLoggedIn || needsSetup) return
    let cancelled = false
    let inFlight = false
    let failures = 0
    let retryTimer: number | undefined

    // This tab's baseline: what it last knew, falling back to the cached copy.
    if (!knownUserRef.current) {
      try { knownUserRef.current = JSON.parse(localStorage.getItem('peso_current_user') || '{}') } catch { knownUserRef.current = {} }
    }

    const checkForChanges = () => {
      // Skip while the notice from a previous check is still waiting on the
      // user, and never overlap two checks (a slow server would pile them up).
      if (permissionChanges.length > 0 || inFlight) return
      inFlight = true
      getMe(PERMISSION_CHECK_TIMEOUT_MS)
        .then(after => {
          if (cancelled) return
          failures = 0
          setAccessCheckFailing(false)
          const changes = diffPermissionLevels(knownUserRef.current ?? {}, after)
          if (changes.length > 0) setPermissionChanges(changes)
        })
        .catch((err: Error & { status?: number }) => {
          if (cancelled) return
          const code = (err as Error & { detail?: { code?: string } }).detail?.code
          if (err.status === 401 && code === 'ACCOUNT_DEACTIVATED') return // handled by the peso:deactivated event
          if (err.status === 401) {
            // Signed out elsewhere or the session expired -- say so instead of
            // leaving the user working on a session that no longer exists.
            setSessionEnded(true)
            return
          }
          // Network blip / slow or failing server: retry shortly rather than
          // waiting for the next regular tick, and tell the user if it persists.
          failures += 1
          if (failures >= 3) setAccessCheckFailing(true)
          window.clearTimeout(retryTimer)
          retryTimer = window.setTimeout(checkForChanges, PERMISSION_RETRY_MS)
        })
        .finally(() => { inFlight = false })
    }

    const onVisible = () => { if (document.visibilityState === 'visible') checkForChanges() }

    const id = window.setInterval(checkForChanges, PERMISSION_CHECK_MS)
    window.addEventListener('focus', checkForChanges)
    window.addEventListener('online', checkForChanges)
    window.addEventListener('peso:forbidden', checkForChanges)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      window.clearInterval(id)
      window.clearTimeout(retryTimer)
      window.removeEventListener('focus', checkForChanges)
      window.removeEventListener('online', checkForChanges)
      window.removeEventListener('peso:forbidden', checkForChanges)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [isLoggedIn, needsSetup, permissionChanges])


  // Applies the change the user just acknowledged and reloads -- simplest way
  // to guarantee every already-mounted screen (not just the next click)
  // reflects the new permissions, matching how a DB restore elsewhere in the
  // app also reloads rather than trying to patch every component's state.
  const acknowledgePermissionChange = () => {
    // Drafts of a module they can no longer edit could never be opened again,
    // but would keep personal data in this browser -- remove them.
    clearDraftsForModules(
      permissionChanges.filter(c => c.to === 'Viewer' || c.to === 'No Access').map(c => c.module),
    )
    getMe()
      .then(user => {
        try { localStorage.setItem('peso_current_user', JSON.stringify(user)) } catch { /* quota */ }
      })
      .finally(() => { window.location.reload() })
  }

  const handleLogout = () => setLogoutConfirm(true)

  const confirmLogout = () => {
    setLogoutConfirm(false)
    // End the backend session; ignore network errors so the UI still logs out.
    apiLogout().catch(() => { /* already effectively logged out */ })
    try { localStorage.removeItem('peso_current_user') } catch { /* quota */ }
    clearAllDrafts()
    setNeedsSetup(false)
    setIsLoggedIn(false)
  }

  if (checkingSession) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <span className="text-gray-400 text-sm">Loading…</span>
      </div>
    )
  }

  if (!isLoggedIn) {
    return <Login onLogin={() => { refreshSetupGate(); setIsLoggedIn(true) }} />
  }

  return (
    <>
      {needsSetup ? (
        // First-login gate: admins must set up security questions before reaching the app.
        <SecuritySetup onDone={() => setNeedsSetup(false)} onLogout={handleLogout} />
      ) : (
        // Providers lifted here so their state survives navigation between modules and Maintenance.
        <CDSPProvider>
          <GIPProvider>
            <SPESProvider>
              <OFWProvider>
                <SkillsTrainingProvider>
                  <DILPProvider>
                    <TUPADProvider>
                      <SLPProvider>
                        <CLPEPProvider>
                          <EmploymentProvider>
                            <DocumentsProvider>
                              <AppContent onLogout={handleLogout} />
                            </DocumentsProvider>
                          </EmploymentProvider>
                        </CLPEPProvider>
                      </SLPProvider>
                    </TUPADProvider>
                  </DILPProvider>
                </SkillsTrainingProvider>
              </OFWProvider>
            </SPESProvider>
          </GIPProvider>
        </CDSPProvider>
      )}
      <ConfirmModal
        isOpen={logoutConfirm} type="confirm" confirmVariant="brand"
        title="Log out?" message="Are you sure you want to log out?"
        confirmText="Yes, log out" cancelText="Cancel"
        onConfirm={confirmLogout} onCancel={() => setLogoutConfirm(false)}
      />
      <PermissionChangeModal
        isOpen={permissionChanges.length > 0}
        changes={permissionChanges}
        hasUnsavedForm={permissionChanges.length > 0 && hasDirtyForm()}
        onAcknowledge={acknowledgePermissionChange}
      />
      <ConfirmModal
        isOpen={sessionEnded} type="error"
        title="Session ended" message={'Your session has ended. Please sign in again.'}
        confirmText="Sign in"
        onConfirm={() => {
          setSessionEnded(false)
          try { localStorage.removeItem('peso_current_user') } catch { /* quota */ }
          clearAllDrafts()
          setNeedsSetup(false)
          setIsLoggedIn(false)
        }}
        onCancel={() => { /* must sign in again */ }}
      />
      <ConfirmModal
        isOpen={accountDeactivated} type="error"
        title="Account Deactivated"
        message={'Your account has been deactivated by an administrator. You have been signed out. Please contact an administrator if you think this is a mistake.'}
        confirmText="OK"
        onConfirm={() => {
          setAccountDeactivated(false)
          try { localStorage.removeItem('peso_current_user') } catch { /* quota */ }
          clearAllDrafts()
          setNeedsSetup(false)
          setIsLoggedIn(false)
        }}
        onCancel={() => { /* must sign in again */ }}
      />
      {accessCheckFailing && isLoggedIn && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] bg-amber-50 border border-amber-300 text-amber-800 text-sm rounded-lg shadow px-4 py-2">
          Can't confirm your access right now. Please check your connection.
        </div>
      )}
    </>
  )
}
