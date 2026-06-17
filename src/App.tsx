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
import { CDSPProvider } from './contexts/CDSPContext'
import { GIPProvider } from './contexts/GIPContext'
import { SPESProvider } from './contexts/SPESContext'
import { OFWProvider } from './contexts/OFWContext'
import { SkillsTrainingProvider } from './contexts/SkillsTrainingContext'
import { DocumentsProvider } from './contexts/DocumentsContext'
import { ProgramActivitiesProvider } from './contexts/ProgramActivitiesContext'
import './styles/App.css'

type Page = 'dashboard' | 'cdsp' | 'gip' | 'spes' | 'ofw' | 'employment' | 'skills' | 'documents' | 'maintenance'

function AppContent() {
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
  }

  const navbar = (
    <Navbar
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogout={() => setCurrentPage('dashboard')}
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
      <OFWProvider>
        <div className="h-screen flex flex-col overflow-hidden">
          {navbar}
          <div className="flex-1 overflow-hidden">
            <OFWView onBack={() => setCurrentPage('dashboard')} />
          </div>
        </div>
      </OFWProvider>
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
          <SkillsTrainingProvider>
            <ProgramActivitiesProvider>
              <AppContent />
            </ProgramActivitiesProvider>
          </SkillsTrainingProvider>
        </SPESProvider>
      </GIPProvider>
    </CDSPProvider>
  )
}
