import { useState } from 'react'
import Login from './pages/auth/login'
import Dashboard from './pages/user/dashboard'
import Navbar from './pages/user/navbar'
import './App.css'

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

      {/* Floating help button */}
      <button
        className="fixed bottom-6 right-6 w-10 h-10 text-white rounded-full flex items-center justify-center font-bold hover:scale-[1.05] transition-all"
        style={{
          backgroundColor: 'var(--color-brand)',
          boxShadow: 'var(--shadow-md)',
          fontSize: 'var(--text-md)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-brand-dark)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-brand)')}
        aria-label="Help"
      >
        ?
      </button>
    </div>
  )
}
