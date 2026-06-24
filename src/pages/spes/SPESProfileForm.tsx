import { useState } from 'react'
import { X, Users, Upload, Download } from 'lucide-react'
import { useSPES } from '../../contexts/SPESContext'
import type { SPESApplicant, SPESBatchAssignment } from '../../contexts/SPESContext'
import AddressFields from '../../components/AddressFields'
import DatePicker from '../../components/DatePicker'

// ─── Exported constants ────────────────────────────────────────────────────────

export const SCHOOL_TYPE_OPTIONS = [
  'Junior High School',
  'Senior High School',
  'College',
  'Alternative Learning System (ALS)',
  'Technical / Vocational',
]

export const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated']

export const emptyForm: Omit<SPESApplicant, 'id'> = {
  lastName: '', firstName: '', middleName: '',
  sex: '', birthdate: '', age: 0, civilStatus: 'Single',
  contactNumber: '', email: '',
  streetPurok: '', barangay: '', cityMunicipality: 'Tangub City', province: 'Misamis Occidental', region: 'Region X',
  schoolName: '', schoolType: '', gradeYearLevel: '', course: '',
  annualFamilyIncome: '', numberOfDependents: 0,
  assignedActivity: '',
  assignedBatchId: null,
  assignmentHistory: [],
  attachedDocuments: [],
  dateApplicationReceived: '', receivedBy: '',
  status: 'Inactive', remarks: '',
}

// ─── Exported badges ───────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: SPESApplicant['status'] }) {
  const colors: Record<string, string> = {
    Active:   'bg-blue-100 text-blue-700',
    Inactive: 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

export function BatchStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Ongoing:   'bg-green-100 text-green-700',
    Completed: 'bg-blue-100 text-blue-700',
    Open:      'bg-sky-50 text-sky-600',
    Closed:    'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

const GRADE_YEAR_LEVEL_OPTIONS = [
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
  'Grade 11', 'Grade 12',
  '1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year',
  'ALS Level',
]

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
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none"
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

// ─── Exported view panel ───────────────────────────────────────────────────────

export function ViewApplicantPanel({ applicant, onClose }: {
  applicant: SPESApplicant
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
            <p className="text-sm text-gray-400">SPES Applicant Profile</p>
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
          <Sec num="III" title="Educational Information" />
          <div className="grid grid-cols-2 gap-5">
            <Field label="School Name" value={applicant.schoolName} />
            <Field label="School Type" value={applicant.schoolType} />
            <Field label="Grade / Year Level" value={applicant.gradeYearLevel} />
            <Field label="Course / Program" value={applicant.course} />
          </div>
          <Sec num="IV" title="Family / Economic Information" />
          <div className="grid grid-cols-2 gap-5">
            <Field label="Annual Family Income" value={applicant.annualFamilyIncome ? `₱${applicant.annualFamilyIncome}` : ''} />
            <Field label="Number of Dependents" value={applicant.numberOfDependents} />
          </div>
          <Sec num="V" title="Attached Documents" />
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
          <Sec num="VI" title="For PESO Office Only" gray />
          <div className="grid grid-cols-2 gap-5">
            <Field label="Date Application Received" value={applicant.dateApplicationReceived} />
            <Field label="Received By" value={applicant.receivedBy} />
            <div className="col-span-2"><Field label="Remarks" value={applicant.remarks} /></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Default export: form ──────────────────────────────────────────────────────

export default function SPESProfileForm({ initial, mode, onSave, onClose }: {
  initial: Omit<SPESApplicant, 'id'>
  mode: 'add' | 'edit'
  onSave: (data: Omit<SPESApplicant, 'id'>) => void
  onClose: () => void
}) {
  const { spesBatches } = useSPES()
  const [formData, setFormData] = useState(initial)
  const set = (patch: Partial<Omit<SPESApplicant, 'id'>>) => setFormData(p => ({ ...p, ...patch }))

  const handleBirthdate = (date: string) => {
    const age = date ? new Date().getFullYear() - new Date(date).getFullYear() : 0
    set({ birthdate: date, age })
  }

  const derivedStatus: SPESApplicant['status'] = formData.assignedBatchId !== null ? 'Active' : 'Inactive'

  const handleSave = () => {
    if (!formData.lastName.trim() || !formData.firstName.trim()) {
      alert('Please fill in Last Name and First Name.')
      return
    }
    onSave({ ...formData, status: derivedStatus })
  }

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none placeholder:text-gray-800'
  const lbl = 'block text-xs uppercase tracking-wide text-gray-400 mb-1'
  const sel = `${inp} bg-white`

  const SectionDivider = ({ num, title, gray }: { num: string; title: string; gray?: boolean }) => (
    <div className={`flex items-center gap-2 mt-8 mb-4 rounded px-4 py-2.5 ${gray ? 'bg-gray-500' : 'bg-brand-blue'}`}>
      <span className="text-white text-xs font-bold">{num}.</span>
      <span className="text-white text-xs font-bold uppercase tracking-wide">{title}</span>
    </div>
  )

  const statusStyles: Record<string, string> = {
    Completed: 'bg-blue-100 text-blue-700 border border-blue-200',
    Ongoing:   'bg-green-100 text-green-700 border border-green-200',
    Open:      'bg-sky-50 text-sky-600 border border-sky-200',
    Closed:    'bg-gray-100 text-gray-500 border border-gray-200',
  }

  return (
    <div className="h-full bg-brand-bg flex flex-col">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <Users size={18} className="text-brand-blue" />
          </div>
          <p className="text-gray-800 font-semibold" style={{ fontSize: 'var(--text-md)' }}>
            {mode === 'edit' ? 'Edit Applicant Profile' : 'Add New Applicant — SPES'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={derivedStatus} />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
        </div>
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
              <select className={sel} value={formData.sex} onChange={e => set({ sex: e.target.value as SPESApplicant['sex'] })}>
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
                {CIVIL_STATUS_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Contact Number</label>
              <input className={inp} value={formData.contactNumber} onChange={e => set({ contactNumber: e.target.value })} placeholder="09XXXXXXXXX" />
            </div>
            <div>
              <label className={lbl}>Email (optional)</label>
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

          <SectionDivider num="III" title="Educational Information" />
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <label className={lbl}>School Name</label>
              <input className={inp} value={formData.schoolName} onChange={e => set({ schoolName: e.target.value })} placeholder="e.g. Tangub City College" />
            </div>
            <div>
              <label className={lbl}>School Type</label>
              <select className={sel} value={formData.schoolType} onChange={e => set({ schoolType: e.target.value })}>
                <option value="">Select</option>
                {SCHOOL_TYPE_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Grade / Year Level</label>
              <select className={sel} value={formData.gradeYearLevel} onChange={e => set({ gradeYearLevel: e.target.value })}>
                <option value="">Select</option>
                {GRADE_YEAR_LEVEL_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            {(formData.schoolType === 'College' || formData.schoolType === 'Technical / Vocational') && (
              <div className="col-span-2">
                <label className={lbl}>Course / Program</label>
                <input className={inp} value={formData.course} onChange={e => set({ course: e.target.value })} placeholder="e.g. BS Information Technology" />
              </div>
            )}
          </div>

          <SectionDivider num="IV" title="Family / Economic Information" />
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={lbl}>Annual Family Income (₱)</label>
              <input className={inp} value={formData.annualFamilyIncome} onChange={e => set({ annualFamilyIncome: e.target.value })} placeholder="e.g. 80,000" />
            </div>
            <div>
              <label className={lbl}>Number of Dependents</label>
              <input type="number" className={inp} value={formData.numberOfDependents || ''} onChange={e => set({ numberOfDependents: parseInt(e.target.value) || 0 })} placeholder="0" />
            </div>
          </div>

          <SectionDivider num="V" title="Assignments" />
          {formData.assignmentHistory && formData.assignmentHistory.length > 0 ? (
            <div className="space-y-3 mb-2">
              {formData.assignmentHistory.map((entry: SPESBatchAssignment, i: number) => {
                const batch = spesBatches.find(b => b.id === entry.batchId)
                const batchStatus = batch?.status ?? 'Completed'
                const isCurrent = formData.assignedBatchId === entry.batchId
                return (
                  <div key={i} className={`flex items-start justify-between gap-3 px-4 py-3 rounded-xl border ${isCurrent ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800 font-semibold leading-snug">{entry.batchName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Date Assigned: {entry.assignedDate || '—'}</p>
                      {entry.completedDate && (
                        <p className="text-xs text-blue-500 mt-0.5">Date Completed: {entry.completedDate}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusStyles[batchStatus] ?? statusStyles.Closed}`}>
                        {batchStatus}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-brand-blue font-semibold">Current</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-2">No batch assignments yet. Use "Assign Batch" from the applicant list.</p>
          )}

          <SectionDivider num="VI" title="Attached Documents" />
          <p className="text-xs text-gray-400 -mt-1 mb-3">Attach supporting documents (e.g. school ID, certificate of enrollment). This section is optional / if applicable.</p>
          <AttachedDocsEditor
            docs={formData.attachedDocuments}
            onChange={docs => set({ attachedDocuments: docs })}
          />

          <SectionDivider num="VII" title="For PESO Office Only" gray />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Date Application Received</label>
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
