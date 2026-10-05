import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import SystemUsersTab from './SystemUsersTab'
import DataManagementTab from './DataManagementTab'
import ActivityLogsTab from './ActivityLogsTab'
import RecycleBinTab from './RecycleBinTab'
import { listDeleted } from '../../services/recycleBinService'

interface SecurityViewProps {
  onBack: () => void
}

export default function SecurityView({ onBack }: SecurityViewProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'data' | 'bin' | 'logs'>('users')

  // Count shown on the Recycle Bin tab. Loaded up front so the badge is visible
  // before the tab is opened; RecycleBinTab keeps it current after that.
  const [binCount, setBinCount] = useState(0)
  useEffect(() => {
    listDeleted().then(items => setBinCount(items.length)).catch(() => {})
  }, [])

  // A tab is built the first time it is opened and then kept (just hidden) when
  // you switch away, so coming back is instant and keeps its search/filters.
  const [visited, setVisited] = useState<Set<string>>(new Set(['users']))
  const openTab = (tab: 'users' | 'data' | 'bin' | 'logs') => {
    setVisited(prev => new Set(prev).add(tab))
    setActiveTab(tab)
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
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
        <div className="bg-white rounded-xl shadow-sm px-6">
          <nav role="tablist" aria-label="Security tabs" className="flex gap-0">
            {(['users', 'data', 'logs', 'bin'] as const).map(tab => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => openTab(tab)}
                className={`px-6 py-4 text-base font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-brand-blue text-brand-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'users' ? 'System Users' : tab === 'data' ? 'Backup' : tab === 'logs' ? 'Activity Logs' : 'Recycle Bin'}
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
        {visited.has('users') && <div className={activeTab === 'users' ? '' : 'hidden'}><SystemUsersTab /></div>}
        {visited.has('data')  && <div className={activeTab === 'data'  ? '' : 'hidden'}><DataManagementTab /></div>}
        {visited.has('bin')   && <div className={activeTab === 'bin'   ? '' : 'hidden'}><RecycleBinTab isActive={activeTab === 'bin'} onCountChange={setBinCount} /></div>}
        {visited.has('logs')  && <div className={activeTab === 'logs'  ? '' : 'hidden'}><ActivityLogsTab isActive={activeTab === 'logs'} /></div>}
      </div>
    </div>
  )
}
