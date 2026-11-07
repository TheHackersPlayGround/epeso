import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { fmtDate } from '../utils/formatDate'
import {
  setImportDuplicateHandler,
  type ImportDuplicateChoice,
  type ImportDuplicateReport,
} from '../services/duplicateService'

// Mounted once in App. When an Excel import finds possible duplicates, nothing has been saved yet:
// this asks whether to skip them, import them anyway, or cancel.
export default function DuplicateHost() {
  const [pending, setPending] = useState<{ report: ImportDuplicateReport; resolve: (c: ImportDuplicateChoice) => void } | null>(null)

  useEffect(() => {
    setImportDuplicateHandler(report => new Promise<ImportDuplicateChoice>(resolve => setPending({ report, resolve })))
    return () => setImportDuplicateHandler(null)
  }, [])

  if (!pending) return null
  const { report, resolve } = pending
  const choose = (choice: ImportDuplicateChoice) => { setPending(null); resolve(choice) }
  const hasExisting = report.existing.length > 0

  return (
    <div className="fixed inset-0 z-[10001] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl p-8 max-h-[90vh] flex flex-col">
        <div className="flex flex-col items-center text-center mb-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-gray-900 font-semibold text-xl">Possible duplicates found</h3>
          <p className="text-gray-500 text-sm mt-2">
            Nothing has been imported yet. Same name and birthdate means it is probably the same person.
          </p>
        </div>

        <div className="overflow-y-auto space-y-4 mb-5 text-sm">
          {hasExisting && (
            <div>
              <p className="font-semibold text-gray-700 mb-1">Already in this program ({report.existing.length})</p>
              <ul className="space-y-1.5">
                {report.existing.map(e => (
                  <li key={e.row} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="font-medium text-gray-800">{e.name}{e.birthdate ? ` · born ${fmtDate(e.birthdate)}` : ''}</p>
                    {e.matches.map(m => (
                      <p key={m.id} className="text-gray-600">
                        Existing: {m.program}, applied {fmtDate(m.dateApplied)}{m.inRecycleBin ? ' (in the Recycle Bin)' : ''}
                      </p>
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {report.inFile.length > 0 && (
            <div>
              <p className="font-semibold text-gray-700 mb-1">Repeated in your file ({report.inFile.length})</p>
              <ul className="space-y-1.5">
                {report.inFile.map(e => (
                  <li key={e.row} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="font-medium text-gray-800">{e.name}{e.birthdate ? ` · born ${fmtDate(e.birthdate)}` : ''}</p>
                    <p className="text-gray-600">Listed more than once. Only the first one is imported.</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={() => choose('cancel')} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel import
          </button>
          {hasExisting && (
            <button onClick={() => choose('import')} className="flex-1 py-2.5 border border-[#0077BE] rounded-lg text-sm text-[#0077BE] hover:bg-blue-50 transition-colors">
              Import them anyway
            </button>
          )}
          <button onClick={() => choose('skip')} className="flex-1 py-2.5 rounded-lg text-sm text-white font-medium bg-[#0077BE] hover:bg-[#006699] transition-colors">
            {hasExisting ? 'Skip duplicates' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
