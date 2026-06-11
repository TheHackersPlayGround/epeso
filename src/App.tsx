import { useState } from 'react'
import Login from './pages/auth/login'
import Dashboard from './pages/dashboard/dashboard'
import Navbar from './pages/shared/navbar'
import CDSPView from './pages/cdsp/cdsp'
import { CDSPProvider } from './contexts/CDSPContext'
import { ProgramActivitiesProvider } from './contexts/ProgramActivitiesContext'
import './styles/App.css'

type Page = 'dashboard' | 'cdsp'

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={() => setIsLoggedIn(false)}
      />
      <Dashboard
        onModuleClick={(id) => {
          if (id === 'cdsp') setCurrentPage('cdsp')
        }}
      />
    </div>
  )
}
