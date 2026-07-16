import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
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
import { canView } from './utils/permissions'
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
import { ProgramActivitiesProvider } from './contexts/ProgramActivitiesContext'
import { DILPProvider } from './contexts/DILPContext'
import { TUPADProvider } from './contexts/TUPADContext'
import { LIVELIHOOD_SEED, SLP_PROJECTS_SEED, CLPEP_INTERVENTIONS_SEED } from './contexts/LivelihoodContext'
import { logout as apiLogout, getMe } from './services/userService'
import './styles/App.css'

function initLivelihoodLS() {
  const set = (key: string, data: unknown[]) => {
    try { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data)) } catch { /* quota */ }
  }
  set('lp_dileep_v4', LIVELIHOOD_SEED.filter(b => b.service === 'DILEEP (DILP)' || b.service === 'DILEEP (TUPAD)'))
  set('lp_slp_v4', LIVELIHOOD_SEED.filter(b => b.service === 'SLP'))
  set('lp_clpep_v4', LIVELIHOOD_SEED.filter(b => b.service === 'CLPEP'))
  set('lp_slp_projects_v2', SLP_PROJECTS_SEED)
  set('lp_clpep_interventions_v1', CLPEP_INTERVENTIONS_SEED)
}
initLivelihoodLS()

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

  const navbar = (
    <Navbar
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab)
        if (tab === 'About PESO') setCurrentPage('about')
        if (tab === 'Dashboard') setCurrentPage('dashboard')
      }}
      onLogout={onLogout}
      onProfileClick={() => setCurrentPage('profile')}
      username={navUsername}
    />
  )

  if (currentPage === 'cdsp') {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {navbar}
        <div className="flex-1 overflow-hidden">
          <CDSPView onBack={() => setCurrentPage('dashboard')} />
        </div>
      </div>
    )
  }

  if (currentPage === 'gip') {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {navbar}
        <div className="flex-1 overflow-hidden">
          <GIPView onBack={() => setCurrentPage('dashboard')} />
        </div>
      </div>
    )
  }

  if (currentPage === 'spes') {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {navbar}
        <div className="flex-1 overflow-hidden">
          <SPESView onBack={() => setCurrentPage('dashboard')} />
        </div>
      </div>
    )
  }

  if (currentPage === 'ofw') {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {navbar}
        <div className="flex-1 overflow-hidden">
          <OFWView onBack={() => setCurrentPage('dashboard')} />
        </div>
      </div>
    )
  }

  if (currentPage === 'employment') {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {navbar}
        <div className="flex-1 overflow-y-auto">
          <EmploymentFacilitation onBack={() => setCurrentPage('dashboard')} />
        </div>
      </div>
    )
  }

  if (currentPage === 'documents') {
    return (
      <DocumentsProvider>
        <div className="h-screen flex flex-col overflow-hidden">
          {navbar}
          <div className="flex-1 overflow-hidden">
            <DocumentsView onBack={() => setCurrentPage('dashboard')} />
          </div>
        </div>
      </DocumentsProvider>
    )
  }

  if (currentPage === 'skills') {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {navbar}
        <div className="flex-1 overflow-hidden">
          <SkillsTrainingView onBack={() => setCurrentPage('dashboard')} />
        </div>
      </div>
    )
  }

  if (currentPage === 'maintenance') {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {navbar}
        <div className="flex-1 overflow-y-auto">
          <Maintenance onBack={() => setCurrentPage('dashboard')} />
        </div>
      </div>
    )
  }

  if (currentPage === 'livelihood') {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {navbar}
        <div className="flex-1 overflow-y-auto">
          <LivelihoodView onBack={() => setCurrentPage('dashboard')} />
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
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <SecurityView onBack={() => setCurrentPage('dashboard')} />
        </div>
      </div>
    )
  }

  if (currentPage === 'report') {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {navbar}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <ReportView onBack={() => setCurrentPage('dashboard')} />
        </div>
      </div>
    )
  }

  if (currentPage === 'about') {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {navbar}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <AboutView onBack={() => { setCurrentPage('dashboard'); setActiveTab('Dashboard') }} />
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
            onBack={() => setCurrentPage('dashboard')}
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

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)

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

  const handleLogout = () => {
    Swal.fire({
      title: 'Log out?',
      text: 'Are you sure you want to log out?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, log out',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#0077BE',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    }).then(result => {
      if (!result.isConfirmed) return
      // End the backend session; ignore network errors so the UI still logs out.
      apiLogout().catch(() => { /* already effectively logged out */ })
      try { localStorage.removeItem('peso_current_user') } catch { /* quota */ }
      setNeedsSetup(false)
      setIsLoggedIn(false)
    })
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

  // First-login gate: admins must set up security questions before reaching the app.
  if (needsSetup) {
    return <SecuritySetup onDone={() => setNeedsSetup(false)} onLogout={handleLogout} />
  }

  // Providers lifted here so their state survives navigation between modules and Maintenance.
  return (
    <CDSPProvider>
      <GIPProvider>
        <SPESProvider>
          <OFWProvider>
            <SkillsTrainingProvider>
              <ProgramActivitiesProvider>
                <DILPProvider>
                  <TUPADProvider>
                    <AppContent onLogout={handleLogout} />
                  </TUPADProvider>
                </DILPProvider>
              </ProgramActivitiesProvider>
            </SkillsTrainingProvider>
          </OFWProvider>
        </SPESProvider>
      </GIPProvider>
    </CDSPProvider>
  )
}
