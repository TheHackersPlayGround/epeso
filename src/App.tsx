import { useState } from 'react'
import Login from './pages/auth/login'
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
import { LIVELIHOOD_SEED, SLP_PROJECTS_SEED, CLPEP_INTERVENTIONS_SEED } from './contexts/LivelihoodContext'
import './styles/App.css'

const DEFAULT_CURRENT_USER = {
  id: 1, firstName: 'Vicky', lastName: 'Administrator',
  username: 'admin', email: 'admin@peso.gov.ph',
  role: 'Administrator', status: 'Active',
  lastLogin: new Date().toLocaleString(), permissions: [],
}
function initCurrentUser() {
  try {
    if (!localStorage.getItem('peso_current_user'))
      localStorage.setItem('peso_current_user', JSON.stringify(DEFAULT_CURRENT_USER))
  } catch { /* quota */ }
}
initCurrentUser()

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

  const navbar = (
    <Navbar
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab)
        if (tab === 'About PESO') setCurrentPage('about')
        if (tab === 'Dashboard') setCurrentPage('dashboard')
      }}
      onLogout={() => setCurrentPage('dashboard')}
      onProfileClick={() => setCurrentPage('profile')}
      username={getCurrentUsername()}
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

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />
  }

  // Providers lifted here so their state survives navigation between modules and Maintenance.
  return (
    <CDSPProvider>
      <GIPProvider>
        <SPESProvider>
          <OFWProvider>
            <SkillsTrainingProvider>
              <ProgramActivitiesProvider>
                <AppContent onLogout={() => setIsLoggedIn(false)} />
              </ProgramActivitiesProvider>
            </SkillsTrainingProvider>
          </OFWProvider>
        </SPESProvider>
      </GIPProvider>
    </CDSPProvider>
  )
}
