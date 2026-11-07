import { AlertTriangle } from 'lucide-react'
import { fmtDate } from '../utils/formatDate'
import type { DuplicateMatch } from '../services/duplicateService'

// "This person is already recorded" warning shown before saving. It only informs: the user can go back
// and review, or save anyway.
export default function DuplicateWarningModal({ matches, onGoBack, onSaveAnyway }: {
  matches: DuplicateMatch[]
  onGoBack: () => void
  onSaveAnyway: () => void
}) {
  const inBin = matches.filter(m => m.inRecycleBin)
  return (
    <div className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-8">
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-gray-900 font-semibold text-xl">Possible duplicate</h3>
          <p className="text-gray-500 text-base mt-2">
            A person with the same name and birthdate is already recorded in this program:
          </p>
        </div>

        <ul className="space-y-2 max-h-56 overflow-y-auto mb-5 text-sm">
          {matches.map(m => (
            <li key={m.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="font-medium text-gray-800">{m.name}</p>
              <p className="text-gray-600">
                Born {fmtDate(m.birthdate)} · {m.program} · applied {fmtDate(m.dateApplied)}
              </p>
              {m.inRecycleBin && (
                <p className="text-amber-700 mt-0.5">This record is in the Recycle Bin. Restoring it may be better than adding it again.</p>
              )}
            </li>
          ))}
        </ul>

        {inBin.length === 0 && (
          <p className="text-gray-500 text-sm text-center mb-5">
            If this is the same person, go back and use the existing record instead of adding a new one.
          </p>
        )}

        <div className="flex gap-3">
          <button onClick={onGoBack} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-base text-gray-600 hover:bg-gray-50 transition-colors">
            Go back
          </button>
          <button onClick={onSaveAnyway} className="flex-1 py-2.5 rounded-lg text-base text-white font-medium bg-[#0077BE] hover:bg-[#006699] transition-colors">
            Save anyway
          </button>
        </div>
      </div>
    </div>
  )
}
