import { useState } from 'react'
import { X, Users, Upload, Download } from 'lucide-react'
import type { GIPApplicant, GIPBatch } from '../../contexts/GIPContext'
import AddressFields from '../../components/AddressFields'
import DatePicker from '../../components/DatePicker'

// ─── Exported constants ────────────────────────────────────────────────────────

export const CLASSIFICATION_OPTIONS = [
  'Fresh Graduate', 'Unemployed', 'Underemployed',
  'Person with Disability (PWD)', 'Women', 'Solo Parent',
  'Senior Citizen', 'Indigenous People (IP)', 'Returning OFW', 'Other',
]

export const EDUCATION_OPTIONS = [
  'Elementary Level', 'Elementary Graduate',
  'High School Level', 'High School Graduate',
  'Senior High School Level', 'Senior High School Graduate',
  'Vocational / Technical',
  'College Level', 'College Level (2nd Year)', 'College Level (3rd Year)',
  'College Level (4th Year)', 'College Graduate', "Master's Level",
  "Master's Graduate", 'Doctoral',
]

export const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated', 'Annulled']

export const BATCH_STATUS_COLORS: Record<GIPBatch['status'], string> = {
  Planned:   'bg-yellow-100 text-yellow-700',
  Ongoing:   'bg-green-100 text-green-700',
  Completed: 'bg-gray-100 text-gray-500',
}

export const emptyForm: Omit<GIPApplicant, 'id'> = {
  lastName: '', firstName: '', middleName: '',
  sex: '', birthdate: '', age: 0, civilStatus: '',
  contactNumber: '', email: '',
  streetPurok: '', barangay: '', cityMunicipality: 'Tangub City', province: 'Misamis Occidental', region: 'Region X',
  classification: [], classificationOther: '',
  highestEducation: '', schoolName: '', course: '', yearGraduated: '',
  assignedBatchId: null,
  assignmentHistory: [],
  attachedDocuments: [],
  dateApplicationReceived: '', receivedBy: '',
  status: 'Inactive', remarks: '',
}

// ─── Exported helpers ──────────────────────────────────────────────────────────

export function deriveStatus(applicant: Omit<GIPApplicant, 'id'>, batches: GIPBatch[]): GIPApplicant['status'] {
  if (!applicant.assignedBatchId) return 'Inactive'
  const batch = batches.find(b => b.id === applicant.assignedBatchId)
  if (!batch || batch.status === 'Completed') return 'Inactive'
  return 'Active'
}

export function StatusBadge({ status }: { status: GIPApplicant['status'] }) {
  const colors: Record<string, string> = {
    Active:   'bg-green-100 text-green-700',
    Inactive: 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

function AttachedDocsEditor({ docs, onChange }: { docs: string[]; onChange: (docs: string[]) => void }) {
  const [docName, setDocName] = useState('')
  const addDoc = () => {
    const trimmed = docName.trim()
    if (!trimmed) return
    onChange([...docs, trimmed])
    setDocName('')
  }
  const removeDoc = (idx: number) => onChange(docs.filter((_, i) => i !== idx))
  return (
    <div>
      <div className="flex gap-2">
        <input
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none placeholder:text-gray-800"
          placeholder="Document name (e.g. Resume, Birth Certificate...)"
          value={docName}
          onChange={e => setDocName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDoc() } }}
        />
        <button
          type="button"
          onClick={addDoc}
          className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark text-sm whitespace-nowrap"
        >
          <Upload size={15} /> Attach File
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1.5">Supported: PDF, images (JPG, PNG), Word documents.</p>
      {docs.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {docs.map((doc, i) => (
            <li key={i} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700">
              <span className="flex items-center gap-2">
                <Download size={14} className="text-gray-400 rotate-180" />
                {doc}
              </span>
              <button onClick={() => removeDoc(i)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AssignmentCards({ history, batches, currentBatchId }: {
  history: GIPApplicant['assignmentHistory']
  batches: GIPBatch[]
  currentBatchId: number | null
}) {
  if (history.length === 0) {
    return <p className="text-sm text-gray-400">No assignment history.</p>
  }
  return (
    <div className="space-y-2">
      {[...history].reverse().map((h, i) => {
        const batch = batches.find(b => b.id === h.batchId)
        const displayStatus: GIPBatch['status'] = h.completedDate ? 'Completed' : (batch?.status ?? 'Planned')
        const isCurrent = currentBatchId === h.batchId && !h.completedDate
        return (
          <div key={i} className={`flex items-start justify-between gap-3 px-4 py-3 border rounded-lg ${isCurrent ? 'border-brand-blue bg-blue-50' : 'border-gray-200 bg-white'}`}>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-800">{h.batchName}</p>
                {isCurrent && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-blue text-white font-semibold">Current</span>
                )}
              </div>
              <p className="text-xs text-brand-blue mt-0.5">Date Assigned: {h.assignedDate || '—'}</p>
              {h.completedDate && (
                <p className="text-xs text-brand-blue">Date Completed: {h.completedDate}</p>
              )}
            </div>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold flex-shrink-0 mt-0.5 ${BATCH_STATUS_COLORS[displayStatus]}`}>
              {displayStatus}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Exported view panel ───────────────────────────────────────────────────────

export function ViewApplicantPanel({ applicant, batches, onClose }: {
  applicant: GIPApplicant
  batches: GIPBatch[]
  onClose: () => void
}) {
  const Field = ({ label, value }: { label: string; value: string | number | undefined }) => (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-gray-800 text-sm">{value || '—'}</p>
    </div>
  )
  const Sec = ({ num, title, gray }: { num: string; title: string; gray?: boolean }) => (
    <div className={`flex items-center gap-2 mt-8 mb-4 rounded px-4 py-2.5 ${gray ? 'bg-gray-500' : 'bg-brand-blue'}`}>
      <span className="text-white text-xs font-bold">{num}.</span>
      <span className="text-white text-xs font-bold uppercase tracking-wide">{title}</span>
    </div>
  )

  return (
    <div className="h-full bg-brand-bg flex flex-col">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <Users size={18} className="text-brand-blue" />
          </div>
          <div>
            <h2 className="text-lg" style={{ color: '#000000', fontWeight: 800 }}>{applicant.lastName}, {applicant.firstName} {applicant.middleName}</h2>
            <p className="text-sm text-gray-400">GIP Applicant Profile</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={applicant.status} />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8">
          <Sec num="I" title="Personal Information" />
          <div className="grid grid-cols-3 gap-5">
            <Field label="Last Name" value={applicant.lastName} />
            <Field label="First Name" value={applicant.firstName} />
            <Field label="Middle Name" value={applicant.middleName} />
            <Field label="Sex" value={applicant.sex} />
            <Field label="Birthdate" value={applicant.birthdate} />
            <Field label="Age" value={applicant.age} />
            <Field label="Civil Status" value={applicant.civilStatus} />
            <Field label="Contact Number" value={applicant.contactNumber} />
            <Field label="Email" value={applicant.email} />
          </div>
          <Sec num="II" title="Address" />
          <div className="grid grid-cols-2 gap-5">
            <Field label="Region" value={applicant.region} />
            <Field label="Province" value={applicant.province} />
            <Field label="City / Municipality" value={applicant.cityMunicipality} />
            <Field label="Barangay" value={applicant.barangay} />
            <div className="col-span-2"><Field label="Street / Purok #" value={applicant.streetPurok} /></div>
          </div>
          <Sec num="III" title="Classification" />
          <div className="flex flex-wrap gap-2">
            {applicant.classification.length > 0
              ? applicant.classification.map(c => <span key={c} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">{c}</span>)
              : <span className="text-sm text-gray-400">—</span>}
          </div>
          <Sec num="IV" title="Educational Background" />
          <div className="grid grid-cols-2 gap-5">
            <Field label="Highest Education" value={applicant.highestEducation} />
            <Field label="School / University" value={applicant.schoolName} />
            <Field label="Course / Degree" value={applicant.course} />
            <Field label="Year Graduated" value={applicant.yearGraduated} />
          </div>
          <Sec num="V" title="Assignment" />
          <AssignmentCards history={applicant.assignmentHistory} batches={batches} currentBatchId={applicant.assignedBatchId} />
          <Sec num="VI" title="Attached Documents" />
          {applicant.attachedDocuments && applicant.attachedDocuments.length > 0 ? (
            <ul className="space-y-1.5">
              {applicant.attachedDocuments.map((doc, i) => (
                <li key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700">
                  <Download size={14} className="text-gray-400 rotate-180" />{doc}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">No documents attached.</p>
          )}
          <Sec num="VII" title="For PESO Office Only" gray />
          <div className="grid grid-cols-2 gap-5">
            <Field label="Date Applied" value={applicant.dateApplicationReceived} />
            <Field label="Received By" value={applicant.receivedBy} />
            <Field label="Status" value={applicant.status} />
            <Field label="Remarks" value={applicant.remarks} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Default export: form ──────────────────────────────────────────────────────

export default function GIPProfileForm({ initial, mode, batches, onSave, onClose }: {
  initial: Omit<GIPApplicant, 'id'>
  mode: 'add' | 'edit'
  batches: GIPBatch[]
  onSave: (data: Omit<GIPApplicant, 'id'>) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState(initial)
  const set = (patch: Partial<Omit<GIPApplicant, 'id'>>) => setFormData(p => ({ ...p, ...patch }))

  const toggleClassification = (val: string) =>
    set({
      classification: formData.classification.includes(val)
        ? formData.classification.filter(c => c !== val)
        : [...formData.classification, val],
    })

  const handleBirthdate = (date: string) => {
    const age = date ? new Date().getFullYear() - new Date(date).getFullYear() : 0
    set({ birthdate: date, age })
  }

  const handleSave = () => {
    if (!formData.lastName.trim() || !formData.firstName.trim()) {
      alert('Please fill in Last Name and First Name.')
      return
    }
    onSave(formData)
  }

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none placeholder:text-gray-800'
  const lbl = 'block text-xs uppercase tracking-wide text-gray-900 font-semibold mb-1'
  const sel = `${inp} bg-white`

  const SectionDivider = ({ num, title, gray }: { num: string; title: string; gray?: boolean }) => (
    <div className={`flex items-center gap-2 mt-8 mb-4 rounded px-4 py-2.5 ${gray ? 'bg-gray-500' : 'bg-brand-blue'}`}>
      <span className="text-white text-xs font-bold">{num}.</span>
      <span className="text-white text-xs font-bold uppercase tracking-wide">{title}</span>
    </div>
  )

  const CheckItem = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={onChange}
        className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
          checked ? 'bg-brand-blue border-brand-blue' : 'border-gray-300 bg-white'
        }`}
      >
        {checked && <span className="text-white text-xs leading-none">{'✓'}</span>}
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )

  return (
    <div className="h-full bg-brand-bg flex flex-col">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <Users size={18} className="text-brand-blue" />
          </div>
          <p className="text-gray-800 font-semibold" style={{ fontSize: 'var(--text-md)' }}>
            {mode === 'edit' ? 'Edit Applicant Profile' : 'Add New Applicant — GIP'}
          </p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8">

          <SectionDivider num="I" title="Personal Information" />
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className={lbl}>Last Name <span className="text-red-500">*</span></label>
              <input className={inp} value={formData.lastName} onChange={e => set({ lastName: e.target.value })} placeholder="Dela Cruz" />
            </div>
            <div>
              <label className={lbl}>First Name <span className="text-red-500">*</span></label>
              <input className={inp} value={formData.firstName} onChange={e => set({ firstName: e.target.value })} placeholder="Juan" />
            </div>
            <div>
              <label className={lbl}>Middle Name <span className="text-gray-400 font-normal">(if applicable)</span></label>
              <input className={inp} value={formData.middleName} onChange={e => set({ middleName: e.target.value })} placeholder="M." />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className={lbl}>Sex</label>
              <select className={sel} value={formData.sex} onChange={e => set({ sex: e.target.value as GIPApplicant['sex'] })}>
                <option value="">Select</option>
                <option>Male</option><option>Female</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Birthdate</label>
              <DatePicker className={inp} value={formData.birthdate} onChange={handleBirthdate} />
            </div>
            <div>
              <label className={lbl}>Age</label>
              <input type="number" className={inp} value={formData.age || ''} onChange={e => set({ age: parseInt(e.target.value) || 0 })} placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={lbl}>Civil Status</label>
              <select className={sel} value={formData.civilStatus} onChange={e => set({ civilStatus: e.target.value })}>
                <option value="">Select</option>
                {CIVIL_STATUS_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Contact Number</label>
              <input className={inp} value={formData.contactNumber} onChange={e => set({ contactNumber: e.target.value })} placeholder="09XXXXXXXXX" />
            </div>
            <div>
              <label className={lbl}>Email <span className="text-gray-400 font-normal">(optional)</span></label>
              <input className={inp} value={formData.email} onChange={e => set({ email: e.target.value })} placeholder="email@example.com" />
            </div>
          </div>

          <SectionDivider num="II" title="Address" />
          <AddressFields
            value={{
              region: formData.region,
              province: formData.province,
              cityMunicipality: formData.cityMunicipality,
              barangay: formData.barangay,
              streetPurok: formData.streetPurok,
            }}
            onChange={(addr) => set(addr)}
            inputClass={inp}
            labelClass={lbl}
          />

          <SectionDivider num="III" title="Classification" />
          <div className="grid grid-cols-2 gap-3">
            {CLASSIFICATION_OPTIONS.map(opt => (
              <CheckItem key={opt} label={opt} checked={formData.classification.includes(opt)} onChange={() => toggleClassification(opt)} />
            ))}
          </div>
          {formData.classification.includes('Other') && (
            <div className="mt-3">
              <label className={lbl}>Please specify</label>
              <input className={inp} value={formData.classificationOther} onChange={e => set({ classificationOther: e.target.value })} placeholder="Specify classification" />
            </div>
          )}

          <SectionDivider num="IV" title="Educational Background" />
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <label className={lbl}>Highest Educational Attainment</label>
              <select className={sel} value={formData.highestEducation} onChange={e => set({ highestEducation: e.target.value })}>
                <option value="">Select</option>
                {EDUCATION_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>School / University</label>
              <input className={inp} value={formData.schoolName} onChange={e => set({ schoolName: e.target.value })} placeholder="University name" />
            </div>
            <div>
              <label className={lbl}>Course / Degree</label>
              <input className={inp} value={formData.course} onChange={e => set({ course: e.target.value })} placeholder="e.g. BS Public Administration" />
            </div>
            <div>
              <label className={lbl}>Year Graduated</label>
              <input className={inp} value={formData.yearGraduated} onChange={e => set({ yearGraduated: e.target.value })} placeholder="e.g. 2025" />
            </div>
          </div>

          <SectionDivider num="V" title="Assignment" />
          <AssignmentCards history={formData.assignmentHistory} batches={batches} currentBatchId={formData.assignedBatchId} />

          <SectionDivider num="VI" title="Attached Documents" />
          <p className="text-xs text-gray-400 -mt-1 mb-3">Attach supporting documents (e.g. resume, certificate). This section is optional / if applicable.</p>
          <AttachedDocsEditor
            docs={formData.attachedDocuments}
            onChange={docs => set({ attachedDocuments: docs })}
          />

          <SectionDivider num="VII" title="For PESO Office Only" gray />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Date Applied</label>
              <DatePicker className={inp} value={formData.dateApplicationReceived} onChange={value => set({ dateApplicationReceived: value })} />
            </div>
            <div>
              <label className={lbl}>Received By</label>
              <input className={inp} value={formData.receivedBy} onChange={e => set({ receivedBy: e.target.value })} placeholder="Staff name" />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Remarks</label>
              <input className={inp} value={formData.remarks} onChange={e => set({ remarks: e.target.value })} placeholder="Optional" />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-10 pt-6 border-t border-gray-100">
            <button onClick={onClose} className="px-6 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">Cancel</button>
            <button onClick={handleSave} className="px-8 py-2.5 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark text-sm">
              {mode === 'edit' ? 'Save Changes' : 'Save Profile'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
