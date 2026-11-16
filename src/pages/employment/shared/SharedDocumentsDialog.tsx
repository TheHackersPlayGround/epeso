// Referrals tab -> Shared Documents: change which uploaded documents the employer can open for this referral.
import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import DocumentPicker from './DocumentPicker'
import { canManage } from '../../../utils/permissions'
import { listShareableDocuments, setSharedDocuments, type ShareableDocument } from '../../../services/referralDocumentService'

export default function SharedDocumentsDialog({ referralId, applicantId, applicantName, jobTitle, employer, onClose, onSaved }: {
  referralId: number
  applicantId: number
  applicantName: string
  jobTitle: string
  employer: string
  onClose: () => void
  onSaved: (count: number) => void
}) {
  const [docs, setDocs] = useState<ShareableDocument[] | null>(null)
  const [chosen, setChosen] = useState<Set<number>>(new Set())
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const editable = canManage('employment')

  useEffect(() => {
    let alive = true
    listShareableDocuments(applicantId, referralId)
      .then(d => { if (alive) { setDocs(d); setChosen(new Set(d.filter(x => x.shared).map(x => x.id))) } })
      .catch(e => { if (alive) setLoadError(e instanceof Error && e.message ? e.message : 'Could not load the documents.') })
    return () => { alive = false }
  }, [applicantId, referralId])

  const toggle = (id: number) => { setSaveError(''); setChosen(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n }) }

  async function save() {
    setSaving(true); setSaveError('')
    try { onSaved(await setSharedDocuments(referralId, [...chosen])) } catch (e) { setSaveError(e instanceof Error && e.message ? e.message : 'Could not save. Please try again.'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-start justify-between px-6 pt-6 pb-4 max-sm:px-4 max-sm:pt-4 border-b border-gray-100">
          <div className="min-w-0">
            <p className="text-xl font-bold text-gray-900 m-0">Shared Documents</p>
            <p className="text-sm text-gray-500 mt-0.5 mb-0">{applicantName} · {jobTitle}{employer ? ` · ${employer}` : ''}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 max-sm:px-4 space-y-4">
          <p className="text-sm text-gray-600 m-0">The employer can open only the documents selected here, and only while this referral is active or hired. Unselect one to stop sharing it.</p>
          <DocumentPicker docs={docs} chosen={chosen} onToggle={toggle} disabled={!editable || saving} error={loadError} />
          {!editable && <p className="text-xs text-gray-400 m-0">You can view this, but only an editor can change it.</p>}
          {saveError && <p className="text-red-500 text-sm m-0">{saveError}</p>}
        </div>
        <div className="flex gap-3 px-6 pb-6 max-sm:px-4 max-sm:pb-4">
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 font-medium disabled:opacity-50">Cancel</button>
          <button type="button" onClick={() => void save()} disabled={!editable || saving || docs === null} className="flex-1 py-2.5 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {saving && <Loader2 size={15} className="animate-spin" />}Save
          </button>
        </div>
      </div>
    </div>
  )
}
