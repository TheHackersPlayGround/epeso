// The signed-in page: the sidebar (logo, page navigation, account menu) and the page beside it. Data refreshes by itself
// every few seconds, and again when the window comes back into focus.
import { useEffect, useRef, useState } from 'react'
import { Briefcase, ChevronUp, ClipboardList, LayoutDashboard, LogOut, User, UserCheck, UserPlus, type LucideIcon } from 'lucide-react'
import { getOverview, type Me } from '../api'
import { useData } from '../lib'
import ApplicantView from './ApplicantView'
import HiredApplicantsView from './HiredApplicantsView'
import Overview from './tabs/Overview'
import ReferralsTab from './tabs/ReferralsTab'
import PlacementsTab from './tabs/PlacementsTab'
import VacanciesTab from './tabs/VacanciesTab'
import CompanyTab from './tabs/CompanyTab'
import RequestsTab from './tabs/RequestsTab'
import ConfirmModal from '../../pages/shared/ConfirmModal'   // the staff system's popup, so "Log out?" looks the same on both sides

type TabId = 'overview' | 'referrals' | 'placements' | 'vacancies' | 'company' | 'requests'
const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'referrals', label: 'Referrals', icon: UserPlus },
  { id: 'placements', label: 'Placements', icon: UserCheck },
  { id: 'vacancies', label: 'Vacancies', icon: Briefcase },
  { id: 'requests', label: 'My Requests', icon: ClipboardList },
]
const REFRESH_MS = 15_000

// The title and one-line description shown above each page (the same bold page title the staff pages have).
const HEADINGS: Record<TabId, { title: string; hint: string }> = {
  overview: { title: 'Overview', hint: 'A summary of your referrals, employees, job openings and requests.' },
  referrals: { title: 'Referrals', hint: 'Applicants the PESO referred to your company.' },
  placements: { title: 'Placements', hint: 'People hired by your company through the PESO.' },
  vacancies: { title: 'Vacancies', hint: 'Your job openings as recorded by the PESO.' },
  requests: { title: 'My Requests', hint: 'Your requests to the PESO. Nothing changes until the PESO approves it.' },
  company: { title: 'Company Profile', hint: 'Your company details as recorded by the PESO.' },
}

export default function Shell({ me, onLogout }: { me: Me; onLogout: () => void }) {
  const [tab, setTab] = useState<TabId>('overview')
  const [viewing, setViewing] = useState<{ id: number; fromTab: TabId } | null>(null)
  // The "who is hired for this opening" page. It stays set while an applicant is opened from it, so Back from the applicant returns here.
  const [hiredFor, setHiredFor] = useState<{ id: number; title: string } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const bump = () => { if (document.visibilityState === 'visible') setTick(t => t + 1) }
    const id = window.setInterval(bump, REFRESH_MS)
    document.addEventListener('visibilitychange', bump)
    window.addEventListener('focus', bump)
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', bump); window.removeEventListener('focus', bump) }
  }, [])

  // Close the account menu when clicking anywhere else.
  useEffect(() => {
    const away = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false) }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [])

  const overview = useData(getOverview, tick)
  const pending = overview.data?.pendingRequests ?? 0
  const activeTab = viewing ? viewing.fromTab : tab

  return (
    <div className="h-screen flex overflow-hidden bg-brand-bg max-lg:flex-col">
      {/* Sidebar: logo and system name on top, page navigation in the middle, the account menu at the bottom.
          On narrow screens it becomes a bar across the top: logo + account menu, then the pages in a row that scrolls sideways. */}
      <aside className="relative w-64 shrink-0 bg-brand-blue text-white shadow-lg flex flex-col max-lg:w-full">
        <div className="px-5 pt-6 pb-5 flex flex-col items-center text-center border-b border-white/15 max-lg:flex-row max-lg:text-left max-lg:gap-3 max-lg:px-3 max-lg:py-2.5 max-lg:pr-16">
          <img src="/logo3.png" alt="PESO Logo" className="w-20 h-20 object-contain shrink-0 max-lg:w-11 max-lg:h-11" />
          <div className="min-w-0 mt-3 max-lg:mt-0">
            <p className="font-bold m-0 leading-tight tracking-wide" style={{ fontSize: 'var(--text-md)' }}>E-PESO TANGUB CITY</p>
            <p className="text-white/80 m-0 mt-0.5 text-sm leading-tight">Employer Portal</p>
          </div>
        </div>

        <nav aria-label="Portal sections" className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1 max-lg:flex-none max-lg:flex max-lg:gap-1 max-lg:space-y-0 max-lg:overflow-y-visible max-lg:overflow-x-auto max-lg:px-2 max-lg:py-2">
          {TABS.map(t => {
            const active = activeTab === t.id
            const Icon = t.icon
            return (
              <button key={t.id} type="button" aria-current={active ? 'page' : undefined}
                onClick={() => { setViewing(null); setHiredFor(null); setTab(t.id); overview.reload() }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm whitespace-nowrap transition-colors max-lg:w-auto max-lg:px-3 ${
                  active ? 'bg-white text-brand-blue font-semibold shadow-sm' : 'text-white/90 hover:bg-white/15'
                }`}>
                <Icon size={18} className="shrink-0" />
                <span className="flex-1 text-left">{t.label}</span>
                {t.id === 'requests' && pending > 0 && (
                  <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-brand-orange text-white text-xs font-semibold inline-flex items-center justify-center" aria-label={`${pending} waiting for the PESO`}>{pending}</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Account: company and username; opens Profile / Logout. */}
        <div ref={menuRef} className="relative p-3 border-t border-white/15 max-lg:absolute max-lg:top-2 max-lg:right-2 max-lg:p-0 max-lg:border-0">
          {menuOpen && (
            <div role="menu" className="absolute left-3 right-3 bottom-full mb-1 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden max-lg:left-auto max-lg:right-0 max-lg:bottom-auto max-lg:top-full max-lg:mt-2 max-lg:mb-0 max-lg:w-44">
              <button role="menuitem" type="button" onClick={() => { setMenuOpen(false); setViewing(null); setHiredFor(null); setTab('company'); overview.reload() }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <User size={16} className="text-gray-400" />Profile
              </button>
              <div className="border-t border-gray-100" />
              <button role="menuitem" type="button" onClick={() => { setMenuOpen(false); setConfirmLogout(true) }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors">
                <LogOut size={16} />Logout
              </button>
            </div>
          )}
          <button type="button" onClick={() => setMenuOpen(o => !o)} aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Account menu"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left max-lg:w-auto max-lg:px-2 max-lg:py-2 ${menuOpen || tab === 'company' && !viewing ? 'bg-white/25' : 'bg-white/10 hover:bg-white/20'}`}>
            <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0"><User size={18} /></span>
            <span className="min-w-0 flex-1 max-lg:hidden">
              <span className="block text-sm font-semibold leading-tight truncate">{me.companyName}</span>
              <span className="block text-xs text-white/75 leading-tight truncate mt-0.5">{me.username}</span>
            </span>
            <ChevronUp size={16} className={`shrink-0 transition-transform max-lg:hidden ${menuOpen ? '' : 'rotate-180'}`} />
          </button>
        </div>
      </aside>

      <ConfirmModal
        isOpen={confirmLogout} type="confirm" confirmVariant="brand"
        title="Log out?" message="Are you sure you want to log out?"
        confirmText="Yes, log out" cancelText="Cancel"
        onConfirm={() => { setConfirmLogout(false); onLogout() }} onCancel={() => setConfirmLogout(false)}
      />

      <main className="flex-1 min-w-0 min-h-0 overflow-y-auto p-6 max-sm:p-3">
        {viewing ? (
          <ApplicantView id={viewing.id} onClose={() => { setTab(viewing.fromTab); setViewing(null) }} />
        ) : hiredFor ? (
          <HiredApplicantsView vacancyId={hiredFor.id} title={hiredFor.title} tick={tick} onBack={() => setHiredFor(null)}
            onView={id => setViewing({ id, fromTab: 'vacancies' })} />
        ) : (
          <>
            <div className="mb-5 max-sm:mb-3">
              <h1 className="text-2xl font-bold text-gray-800 m-0 leading-tight">{HEADINGS[tab].title}</h1>
              <p className="text-sm text-gray-500 m-0 mt-1 max-w-3xl">{HEADINGS[tab].hint}</p>
            </div>
            {tab === 'overview' && <Overview data={overview.data} error={overview.error} loading={overview.loading} onGo={setTab} />}
            {tab === 'referrals' && <ReferralsTab tick={tick} onView={id => setViewing({ id, fromTab: 'referrals' })} onChanged={overview.reload} />}
            {tab === 'placements' && <PlacementsTab tick={tick} onView={id => setViewing({ id, fromTab: 'placements' })} onChanged={overview.reload} />}
            {tab === 'vacancies' && <VacanciesTab tick={tick} onViewHired={(id, title) => setHiredFor({ id, title })} onChanged={overview.reload} />}
            {tab === 'company' && <CompanyTab tick={tick} onChanged={overview.reload} />}
            {tab === 'requests' && <RequestsTab tick={tick} onChanged={overview.reload} />}
          </>
        )}
      </main>
    </div>
  )
}
