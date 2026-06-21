import { User, ChevronDown } from 'lucide-react'
import logoImage from '../../assets/logo3.png'

interface NavbarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  onLogout: () => void
  onProfileClick: () => void
  username?: string
}

export default function Navbar({ activeTab, onTabChange, onLogout: _onLogout, onProfileClick, username = 'User' }: NavbarProps) {

  return (
    <nav className="bg-brand-blue shadow-md h-21">
      <div className="px-6 py-2">
        <div className="flex items-center justify-between">

          {/* Left: Logo and Title */}
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="PESO Logo" className="w-16 h-16 object-contain" />
            <div>
              <p className="text-white font-bold m-0 p-0 leading-tight" style={{ fontSize: 'var(--text-lg)' }}>
                E-PESO TANGUB CITY
              </p>
              <p className="text-white/90 m-0 p-0 leading-tight" style={{ fontSize: 'var(--text-md)' }}>
                Profiling Management System
              </p>
            </div>
          </div>

          {/* Center: Navigation Tabs */}
          <div className="flex gap-8">
            {['Dashboard', 'About PESO'].map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`px-2 py-1 transition-all relative ${
                  activeTab === tab
                    ? 'text-white font-semibold'
                    : 'text-white/80 hover:text-white'
                }`}
                style={{ fontSize: 'var(--text-md)' }}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                )}
              </button>
            ))}
          </div>

          {/* Right: Profile button */}
          <button
            onClick={onProfileClick}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
          >
            <User size={18} />
            <span style={{ fontSize: 'var(--text-base)' }}>{username}</span>
            <ChevronDown size={15} />
          </button>

        </div>
      </div>
    </nav>
  )
}
