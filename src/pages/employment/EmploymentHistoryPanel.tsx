// Read-only modal showing one applicant's Employment Facilitation history as a
// referral -> placement flow. One card per employer attempt, oldest first.
// Each attempt reads: Referred (date) -> [referral status] -> [placement status]
// (the placement leg only appears when the applicant was hired through it).

import { useEffect, useState } from 'react'
import { X, ArrowRight } from 'lucide-react'
import type { Applicant } from '../../contexts/EmploymentContext'
import {
  getApplicantHistory,
  type EmploymentHistory,
  type EmploymentHistoryEntry,
} from '../../services/applicantService'

const PILL = 'px-2.5 py-0.5 rounded-full text-xs font-medium'

// Covers all four referral statuses (the ReferralsTab badge omits 'Hired').
function ReferralBadge({ status }: { status: EmploymentHistoryEntry['status'] }) {
  const cls =
    status === 'Hired' ? 'bg-green-100 text-green-700'
    : status === 'Interviewed' ? 'bg-blue-100 text-blue-700'
    : status === 'Not Hired' ? 'bg-red-100 text-red-600'
    : 'bg-yellow-100 text-yellow-700' // Pending
  return <span className={`${PILL} ${cls}`}>{status}</span>
}

type PlacementStatus = NonNullable<EmploymentHistoryEntry['placement']>['status']
function PlacementBadge({ status }: { status: PlacementStatus }) {
  const cls =
    status === 'Active' ? 'bg-green-100 text-green-700'
    : status === 'Resigned' ? 'bg-yellow-100 text-yellow-700'
    : status === 'Terminated' ? 'bg-red-100 text-red-600'
    : 'bg-blue-100 text-blue-700' // Completed
  return <span className={`${PILL} ${cls}`}>{status}</span>
}

function FlowNode({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50">
      <span className="text-xs font-semibold text-gray-800">{label}</span>
      {sub && <span className="text-[11px] text-gray-500">{sub}</span>}
    </div>
  )
}

type Props = { applicant: Applicant; onClose: () => void }

export default function EmploymentHistoryPanel({ applicant, onClose }: Props) {
  const [data, setData] = useState<EmploymentHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    getApplicantHistory(applicant.id)
      .then(d => { if (alive) setData(d) })
      .catch((e: unknown) => { if (alive) setError(e instanceof Error ? e.message : 'Failed to load employment history.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [applicant.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <p className="text-xl font-bold text-gray-900">Employment History</p>
            <p className="text-sm text-gray-500 mt-0.5">Applicant: {applicant.name}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-8">Loading…</p>
          ) : error ? (
            <p className="text-sm text-red-600 text-center py-8">{error}</p>
          ) : !data || data.history.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              This applicant has not been referred to any employer yet.
            </p>
          ) : (
            <div className="space-y-4">
              {data.history.map(entry => (
                <div key={entry.referralId} className="border border-gray-200 rounded-lg p-4">
                  <div className="mb-3 min-w-0">
                    <p className="text-gray-900 truncate">
                      <span className="font-semibold text-gray-500">Employer: </span>
                      <span className="font-semibold">{entry.employer}</span>
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      <span className="font-semibold text-gray-500">Job Title: </span>
                      {entry.jobTitle}
                    </p>
                  </div>
                  <div className="flex items-center flex-wrap gap-2">
                    <FlowNode label="Referred" sub={entry.referralDate} />
                    <ArrowRight size={16} className="text-gray-400 shrink-0" />
                    <ReferralBadge status={entry.status} />
                    {entry.placement && (
                      <>
                        <ArrowRight size={16} className="text-gray-400 shrink-0" />
                        <FlowNode label="Placement" sub={`Hired ${entry.placement.dateHired}`} />
                        <PlacementBadge status={entry.placement.status} />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
