import { useState, useRef, useEffect } from 'react'
import { LogOut, User, ChevronDown } from 'lucide-react'
import logoImage from '../../assets/logo3.png'

interface NavbarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  onLogout: () => void
  username?: string
}

export default function Navbar({ activeTab, onTabChange, onLogout}: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <nav className="bg-[#0077BE] shadow-md h-21">
      <div className="px-6 py-2">
        <div className="flex items-center justify-between">

          {/* Left: Logo and Title */}
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="PESO Logo" className="w-16 h-16 object-contain" />
            <div>
              <p className="text-white font-bold m-0 p-0 leading-tight" style={{ fontSize: 'var(--text-lg)' }}>
                PESO TANGUB CITY
              </p>
              <p className="text-white/90 m-0 p-0 leading-tight" style={{ fontSize: 'var(--text-md)' }}>
                Comprehensive Profiling System
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

          {/* Right: User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
            >
              <User size={18} />
              <span style={{ fontSize: 'var(--text-base)' }}>Vicky</span>
              <ChevronDown
                size={15}
                className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {dropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-44 bg-white rounded-lg py-1 z-50"
                style={{ boxShadow: 'var(--shadow-md)' }}
              >
                <button
                  onClick={() => { setDropdownOpen(false); onLogout() }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                  style={{ fontSize: 'var(--text-sm)' }}
                >
                  <LogOut size={15} className="text-gray-500" />
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
