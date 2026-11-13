import { useState, useRef, useEffect } from 'react'
import { User, ChevronDown, LogOut } from 'lucide-react'
import logoImage from '../../assets/logo3.png'

interface NavbarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  onLogout: () => void
  onProfileClick: () => void
  username?: string
  /** Show the "Applications" tab (kiosk submissions waiting for review) for users who may see them. */
  showPending?: boolean
  pendingCount?: number
}

export default function Navbar({ activeTab, onTabChange, onLogout, onProfileClick, username = 'User', showPending = false, pendingCount = 0 }: NavbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <nav className="bg-brand-blue shadow-md h-21 max-lg:h-auto">
      <div className="px-6 py-2 max-sm:px-3">
        <div className="flex items-center justify-between max-sm:gap-2">

          {/* Left: Logo and Title */}
          <div className="flex items-center gap-3 min-w-0 max-sm:gap-2">
            <img src={logoImage} alt="PESO Logo" className="w-16 h-16 object-contain max-sm:w-10 max-sm:h-10 shrink-0" />
            <div className="min-w-0">
              <p className="text-white font-bold m-0 p-0 leading-tight truncate" style={{ fontSize: 'var(--text-lg)' }}>
                E-PESO TANGUB CITY
              </p>
              <p className="text-white/90 m-0 p-0 leading-tight truncate max-sm:hidden" style={{ fontSize: 'var(--text-md)' }}>
                Profiling Management System
              </p>
            </div>
          </div>

          {/* Center: Navigation Tabs */}
          <div className="flex gap-8 shrink-0 max-lg:gap-3">
            {['Dashboard', 'About PESO', ...(showPending ? ['Applications'] : [])].map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`px-2 py-1 transition-all relative whitespace-nowrap ${
                  activeTab === tab
                    ? 'text-white font-semibold'
                    : 'text-white/80 hover:text-white'
                }`}
                style={{ fontSize: 'var(--text-md)' }}
              >
                {tab}
                {tab === 'Applications' && pendingCount > 0 && (
                  <span
                    className="ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-brand-orange text-white text-xs font-semibold align-middle"
                    aria-label={`${pendingCount} pending`}
                  >
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                )}
              </button>
            ))}
          </div>

          {/* Right: Profile dropdown */}
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(prev => !prev)}
              className="flex items-center gap-2 px-4 py-2 max-sm:px-2.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
            >
              <User size={18} />
              <span className="max-sm:hidden" style={{ fontSize: 'var(--text-base)' }}>{username}</span>
              <ChevronDown size={15} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-lg shadow-lg border border-gray-100 z-50 overflow-hidden">
                <button
                  onClick={() => { setIsDropdownOpen(false); onProfileClick() }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <User size={16} className="text-gray-400" />
                  Profile
                </button>
                <div className="border-t border-gray-100" />
                <button
                  onClick={() => { setIsDropdownOpen(false); onLogout() }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </nav>
  )
}
