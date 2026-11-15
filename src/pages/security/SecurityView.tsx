import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import SystemUsersTab from './SystemUsersTab'
import DataManagementTab from './DataManagementTab'
import ActivityLogsTab from './ActivityLogsTab'
import EmployerActivityTab from './EmployerActivityTab'
import RecycleBinTab from './RecycleBinTab'
import { listDeleted } from '../../services/recycleBinService'
import { isAdministrator } from '../../utils/permissions'

type SecurityTab = 'users' | 'data' | 'bin' | 'logs' | 'employers'
const TAB_LABELS: Record<SecurityTab, string> = { users: 'System Users', data: 'Backup', logs: 'Activity Logs', employers: 'Employer Activity', bin: 'Recycle Bin' }

interface SecurityViewProps {
  onBack: () => void
}

export default function SecurityView({ onBack }: SecurityViewProps) {
  const [activeTab, setActiveTab] = useState<SecurityTab>('users')
  // Employer Activity (what employers did in their portal) is for administrators only; the server refuses everyone else.
  const tabs: SecurityTab[] = isAdministrator() ? ['users', 'data', 'logs', 'employers', 'bin'] : ['users', 'data', 'logs', 'bin']

  // Count shown on the Recycle Bin tab. Loaded up front so the badge is visible
  // before the tab is opened; RecycleBinTab keeps it current after that.
  const [binCount, setBinCount] = useState(0)
  useEffect(() => {
    listDeleted().then(items => setBinCount(items.length)).catch(() => {})
  }, [])

  // A tab is built the first time it is opened and then kept (just hidden) when
  // you switch away, so coming back is instant and keeps its search/filters.
  const [visited, setVisited] = useState<Set<string>>(new Set(['users']))
  const openTab = (tab: SecurityTab) => {
    setVisited(prev => new Set(prev).add(tab))
    setActiveTab(tab)
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 max-sm:px-3 max-sm:py-4">
      {/* Title row */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          aria-label="Back to dashboard"
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <p className="text-2xl font-bold text-gray-800 m-0 p-0 leading-tight">
          Security &amp; User Management
        </p>
      </div>

      {/* Tabs card */}
      <div className="mb-6">
        <div className="bg-white rounded-xl shadow-sm px-6 max-sm:px-2 max-sm:overflow-x-auto">
          <nav role="tablist" aria-label="Security tabs" className="flex gap-0 max-sm:gap-0">
            {tabs.map(tab => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => openTab(tab)}
                className={`px-6 py-4 max-sm:px-3 max-sm:py-3 whitespace-nowrap shrink-0 text-base font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-brand-blue text-brand-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {TAB_LABELS[tab]}
                {tab === 'bin' && binCount > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-red-500 text-white">{binCount}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab content */}
      <div>
        {visited.has('users') && <div className={activeTab === 'users' ? '' : 'hidden'}><SystemUsersTab isActive={activeTab === 'users'} /></div>}
        {visited.has('data')  && <div className={activeTab === 'data'  ? '' : 'hidden'}><DataManagementTab isActive={activeTab === 'data'} /></div>}
        {visited.has('bin')   && <div className={activeTab === 'bin'   ? '' : 'hidden'}><RecycleBinTab isActive={activeTab === 'bin'} onCountChange={setBinCount} /></div>}
        {visited.has('logs')  && <div className={activeTab === 'logs'  ? '' : 'hidden'}><ActivityLogsTab isActive={activeTab === 'logs'} /></div>}
        {visited.has('employers') && <div className={activeTab === 'employers' ? '' : 'hidden'}><EmployerActivityTab isActive={activeTab === 'employers'} /></div>}
      </div>
    </div>
  )
}
