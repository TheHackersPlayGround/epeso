import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import DILEEPTab from './DILEEPTab'
import SLPTab from './SLPTab'
import CLPEPTab from './CLPEPTab'

// ─── Types ────────────────────────────────────────────────────────────────────

type LivelihoodViewProps = {
  onBack: () => void
}

type TabType = 'dileep' | 'slp' | 'clpep'

const TABS: { id: TabType; label: string }[] = [
  { id: 'dileep', label: 'DILEEP' },
  { id: 'slp',    label: 'SLP' },
  { id: 'clpep',  label: 'CLPEP' },
]

// ─── Main component ───────────────────────────────────────────────────────────

export default function LivelihoodView({ onBack }: LivelihoodViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dileep')

  return (
    <div className="min-h-full flex flex-col bg-brand-bg">
      {/* Title row */}
      <div className="px-8 pt-7 pb-5 flex items-center gap-4">
        <button
          onClick={onBack}
          aria-label="Back to dashboard"
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <p className="text-2xl font-bold text-gray-800 m-0 p-0 leading-tight">
            Livelihood Programs
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage livelihood program beneficiaries and services
          </p>
        </div>
      </div>

      {/* Tabs card */}
      <div className="px-7.5 pb-2">
        <div className="bg-white rounded-xl shadow-sm px-6">
          <nav role="tablist" aria-label="Livelihood program tabs" className="flex gap-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-base font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-brand-blue text-brand-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab content */}
      <div className="p-6">
        {activeTab === 'dileep' && <DILEEPTab />}
        {activeTab === 'slp'    && <SLPTab />}
        {activeTab === 'clpep'  && <CLPEPTab />}
      </div>
    </div>
  )
}
