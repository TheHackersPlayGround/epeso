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
import { CDSPProvider } from './contexts/CDSPContext'
import { GIPProvider } from './contexts/GIPContext'
import { SPESProvider } from './contexts/SPESContext'
import { OFWProvider } from './contexts/OFWContext'
import { SkillsTrainingProvider } from './contexts/SkillsTrainingContext'
import { DocumentsProvider } from './contexts/DocumentsContext'
import { ProgramActivitiesProvider } from './contexts/ProgramActivitiesContext'
import './styles/App.css'

type Page = 'dashboard' | 'cdsp' | 'gip' | 'spes' | 'ofw' | 'employment' | 'skills' | 'documents'

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />
  }

  if (currentPage === 'cdsp') {
    return (
      <CDSPProvider>
        <ProgramActivitiesProvider>
          <div className="h-screen flex flex-col overflow-hidden">
            <Navbar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onLogout={() => setIsLoggedIn(false)}
            />
            <div className="flex-1 overflow-hidden">
              <CDSPView onBack={() => setCurrentPage('dashboard')} />
            </div>
          </div>
        </ProgramActivitiesProvider>
      </CDSPProvider>
    )
  }

  if (currentPage === 'gip') {
    return (
      <GIPProvider>
        <ProgramActivitiesProvider>
          <div className="h-screen flex flex-col overflow-hidden">
            <Navbar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onLogout={() => setIsLoggedIn(false)}
            />
            <div className="flex-1 overflow-hidden">
              <GIPView onBack={() => setCurrentPage('dashboard')} />
            </div>
          </div>
        </ProgramActivitiesProvider>
      </GIPProvider>
    )
  }

  if (currentPage === 'spes') {
    return (
      <SPESProvider>
        <ProgramActivitiesProvider>
          <div className="h-screen flex flex-col overflow-hidden">
            <Navbar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onLogout={() => setIsLoggedIn(false)}
            />
            <div className="flex-1 overflow-hidden">
              <SPESView onBack={() => setCurrentPage('dashboard')} />
            </div>
          </div>
        </ProgramActivitiesProvider>
      </SPESProvider>
    )
  }

  if (currentPage === 'ofw') {
    return (
      <OFWProvider>
        <div className="h-screen flex flex-col overflow-hidden">
          <Navbar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onLogout={() => setIsLoggedIn(false)}
          />
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
        <Navbar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onLogout={() => setIsLoggedIn(false)}
        />
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
          <Navbar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onLogout={() => setIsLoggedIn(false)}
          />
          <div className="flex-1 overflow-hidden">
            <DocumentsView onBack={() => setCurrentPage('dashboard')} />
          </div>
        </div>
      </DocumentsProvider>
    )
  }

  if (currentPage === 'skills') {
    return (
      <SkillsTrainingProvider>
        <ProgramActivitiesProvider>
          <div className="h-screen flex flex-col overflow-hidden">
            <Navbar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onLogout={() => setIsLoggedIn(false)}
            />
            <div className="flex-1 overflow-hidden">
              <SkillsTrainingView onBack={() => setCurrentPage('dashboard')} />
            </div>
          </div>
        </ProgramActivitiesProvider>
      </SkillsTrainingProvider>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={() => setIsLoggedIn(false)}
      />
      <div className="flex-1 overflow-y-auto">
        <Dashboard
          onModuleClick={(id) => {
            if (id === 'cdsp') setCurrentPage('cdsp')
            if (id === 'gip') setCurrentPage('gip')
            if (id === 'spes') setCurrentPage('spes')
            if (id === 'ofw') setCurrentPage('ofw')
            if (id === 'employment') setCurrentPage('employment')
            if (id === 'skills') setCurrentPage('skills')
            if (id === 'documents') setCurrentPage('documents')
          }}
        />
      </div>
    </div>
  )
}
