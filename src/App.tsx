import { useState } from 'react'
import Login from './pages/auth/login'
import Dashboard from './pages/dashboard/dashboard'
import Navbar from './pages/shared/navbar'
import './styles/App.css'

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [activeTab, setActiveTab] = useState('Dashboard')

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={() => setIsLoggedIn(false)}
      />
      <Dashboard onModuleClick={(id) => console.log('Module clicked:', id)} />
    </div>
  )
}
