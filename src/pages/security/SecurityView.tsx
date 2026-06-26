import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import SystemUsersTab from './SystemUsersTab'
import DataManagementTab from './DataManagementTab'
import ActivityLogsTab from './ActivityLogsTab'

interface SecurityViewProps {
  onBack: () => void
}

export default function SecurityView({ onBack }: SecurityViewProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'data' | 'logs'>('users')

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <span className="text-xl font-bold" style={{ color: '#111827' }}>Security & User Management</span>
      </div>

      <div className="bg-white rounded-xl shadow-md mb-6">
        <div className="border-b border-gray-200">
          <div className="flex gap-2 px-6">
            {(['users', 'data', 'logs'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 font-medium transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'border-[#0077BE] text-[#0077BE]'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab === 'users' ? 'System Users' : tab === 'data' ? 'Data Management' : 'Activity Logs'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'users' && <SystemUsersTab />}
      {activeTab === 'data' && <DataManagementTab />}
      {activeTab === 'logs' && <ActivityLogsTab />}
    </div>
  )
}
