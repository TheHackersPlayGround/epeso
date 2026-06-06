import { LogOut } from 'lucide-react'
import logo1 from '../assets/logo1.png'

interface NavbarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  onLogout: () => void
}

const NAV_TABS = ['Dashboard', 'Mission', 'Vision']

export default function Navbar({ activeTab, onTabChange, onLogout }: NavbarProps) {
  return (
    <header
      className="w-full flex items-center justify-between px-8 py-3"
      style={{ backgroundColor: 'var(--color-accent)' }}
    >
      {/* Left: logo + title */}
      <div className="flex items-center gap-3 shrink-0">
        <img src={logo1} alt="PESO logo" className="w-10 h-10 rounded-full object-contain" />
        <div className="leading-tight">
          <p className="text-white font-bold" style={{ fontSize: 'var(--text-md)' }}>
            PESO TANGUB CITY
          </p>
          <p className="text-white/80" style={{ fontSize: 'var(--text-xs)' }}>
            Comprehensive Profiling System
          </p>
        </div>
      </div>

      {/* Center: nav links */}
      <nav className="flex items-center gap-8">
        {NAV_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`pb-1 font-medium transition-colors ${
              activeTab === tab
                ? 'text-white border-b-2 border-white'
                : 'text-white/75 hover:text-white border-b-2 border-transparent'
            }`}
            style={{ fontSize: 'var(--text-base)' }}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* Right: logout */}
      <button
        onClick={onLogout}
        className="flex items-center gap-2 px-4 py-1.5 border border-white/60 text-white rounded-[var(--radius-sm)] hover:bg-white/10 transition-colors shrink-0"
        style={{ fontSize: 'var(--text-sm)' }}
      >
        <LogOut size={15} />
        Logout
      </button>
    </header>
  )
}
