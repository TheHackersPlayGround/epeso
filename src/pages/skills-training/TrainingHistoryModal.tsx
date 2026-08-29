// Shows every training a beneficiary has ever been assigned to, not just the
// current one -- assignments are additive (see stAddParticipant), so someone
// who finished one training and moved on to another still has both listed
// here, each with its own status and attendance.

import { useState, useEffect } from 'react'
import { X, GraduationCap } from 'lucide-react'
import { fmtDate } from '../../utils/formatDate'
import * as skillsTrainingService from '../../services/skillsTrainingService'
import type { TrainingHistoryEntry } from '../../services/skillsTrainingService'

interface TrainingHistoryModalProps {
  beneficiaryServiceId: number
  applicantName: string
  onClose: () => void
}

function entryBadge(entry: TrainingHistoryEntry) {
  if (entry.status === 'Completed' && entry.attended === false) {
    return { label: 'Absent', cls: 'bg-orange-100 text-orange-700' }
  }
  if (entry.status === 'Planned') return { label: 'Planned', cls: 'bg-yellow-100 text-yellow-700' }
  if (entry.status === 'Ongoing') return { label: 'Ongoing', cls: 'bg-green-100 text-green-700' }
  if (entry.status === 'Completed') return { label: 'Completed', cls: 'bg-blue-100 text-blue-700' }
  return { label: entry.status, cls: 'bg-red-100 text-red-600' }
}

export default function TrainingHistoryModal({ beneficiaryServiceId, applicantName, onClose }: TrainingHistoryModalProps) {
  const [history, setHistory] = useState<TrainingHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    skillsTrainingService.listTrainingHistory(beneficiaryServiceId)
      .then(rows => { if (alive) setHistory(rows) })
      .catch(() => { if (alive) setHistory([]) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [beneficiaryServiceId])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h3 className="text-gray-800 font-semibold">Training History</h3>
            <p className="text-sm text-gray-400 mt-0.5">{applicantName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <GraduationCap size={40} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No training assignments recorded yet.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {history.map(entry => {
                const badge = entryBadge(entry)
                return (
                  <li key={entry.activityId} className="border border-gray-200 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">{entry.activityTitle}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{entry.batchName}</p>
                        <p className="text-xs text-gray-400 mt-1">Scheduled {fmtDate(entry.activityDate)}</p>
                        {entry.completedDate && (
                          <p className="text-xs text-gray-400 mt-0.5">Completed {fmtDate(entry.completedDate)}</p>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${badge.cls}`}>{badge.label}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="w-full py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark">Close</button>
        </div>
      </div>
    </div>
  )
}
