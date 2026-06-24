import { useState } from 'react'
import { X, Users, Upload } from 'lucide-react'
import type { SkillsTrainingProfile } from '../../contexts/SkillsTrainingContext'
import DatePicker from '../../components/DatePicker'

// ─── Exported constants ────────────────────────────────────────────────────────

export const BRAND = '#0077BE'

export const BATCH_OPTIONS = ['BATCH-001', 'BATCH-002', 'BATCH-003']
export const CLASSIFICATION_OPTIONS = ['Student', 'Out of School Youth', 'Women', 'PWD', 'Employed', 'Unemployed']
export const QUALIFICATION_OPTIONS = ['EIM/ELECTRICAL', 'COOKERY', 'FORKLIFT', 'BREAD AND PASTRY']
export const PURPOSE_OPTIONS = ['For employment', 'For local or overseas work', 'To start a livelihood / business', 'To enhance existing skills']
export const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated']

export const emptyForm: Omit<SkillsTrainingProfile, 'id'> = {
  lastName: '', firstName: '', middleName: '', birthdate: '', age: 0,
  sex: '', civilStatus: '', address: '', contactNumber: '',
  classification: [], classificationOther: [],
  desiredQualification: [], qualificationOther: [],
  purposeOfTraining: [], purposeOther: [],
  attachedDocuments: [], applicantSignature: '', dateSignature: '',
  dateApplicationReceived: '', receivedBy: '', trainingBatchNo: '',
  assignedTrainingId: null,
  status: 'Waitlisted', assessmentResult: '', remarks: '',
}

// ─── Exported badge ────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: SkillsTrainingProfile['status'] }) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status === 'Accepted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
      {status}
    </span>
  )
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:border-transparent outline-none placeholder:text-gray-400'
const inpFocus = `${inp} focus:ring-[#0077BE]`
const lbl = 'block text-xs uppercase tracking-wide text-gray-900 font-semibold mb-1'

function SectionDivider({ numeral, title, gray }: { numeral: string; title: string; gray?: boolean }) {
  return (
    <div className={`flex items-center gap-2 mt-8 mb-4 rounded px-4 py-2.5 ${gray ? 'bg-gray-500' : ''}`} style={gray ? {} : { backgroundColor: BRAND }}>
      <span className="text-white text-xs font-bold">{numeral}.</span>
      <span className="text-white text-xs font-bold uppercase tracking-wide">{title}</span>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-gray-800 text-sm">{value || '—'}</p>
    </div>
  )
}

function CheckItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={onChange}
        className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer"
        style={{ backgroundColor: checked ? BRAND : 'white', borderColor: checked ? BRAND : '#D1D5DB' }}
      >
        {checked && <span className="text-white text-xs leading-none">✓</span>}
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )
}

function OtherSpecifyField({
  values,
  placeholder,
  onUpdate,
}: {
  values: string[]
  placeholder: string
  onUpdate: (newValues: string[]) => void
}) {
  const list = values.length === 0 ? [''] : values
  return (
    <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
      <label className="block text-xs font-medium text-gray-600 mb-2">Others, please specify:</label>
      <div className="space-y-2">
        {list.map((val, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="text" value={val}
              onChange={e => { const u = [...list]; u[idx] = e.target.value; onUpdate(u) }}
              className={`${inpFocus} flex-1`} placeholder={placeholder}
            />
            {values.length > 1 && (
              <button type="button" onClick={() => onUpdate(values.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => onUpdate([...list, ''])} className="text-xs mt-1 hover:underline" style={{ color: BRAND }}>+ Add another</button>
      </div>
    </div>
  )
}

// ─── Exported view panel ───────────────────────────────────────────────────────

export function ViewProfilePanel({ profile, onClose }: { profile: SkillsTrainingProfile; onClose: () => void }) {
  const fullName = `${profile.lastName}, ${profile.firstName}${profile.middleName ? ' ' + profile.middleName : ''}`.trim()

  return (
    <div className="h-full bg-brand-bg flex flex-col">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EDE9FE' }}>
            <Users size={18} style={{ color: BRAND }} />
          </div>
          <div>
            <p className="text-gray-800 font-semibold" style={{ fontSize: 'var(--text-lg)' }}>{fullName}</p>
            <p className="text-sm text-gray-400">Skills Training Applicant</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={profile.status} />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8">
          <SectionDivider numeral="I" title="Personal Information" />
          <div className="grid grid-cols-3 gap-5">
            <Field label="Last Name" value={profile.lastName} />
            <Field label="First Name" value={profile.firstName} />
            <Field label="Middle Name" value={profile.middleName} />
            <Field label="Sex" value={profile.sex} />
            <Field label="Birthdate" value={profile.birthdate} />
            <Field label="Age" value={profile.age} />
            <Field label="Civil Status" value={profile.civilStatus} />
            <Field label="Contact #" value={profile.contactNumber} />
          </div>
          <div className="grid grid-cols-1 gap-5 mt-5">
            <Field label="Address" value={profile.address} />
          </div>

          <SectionDivider numeral="II" title="Classification" />
          <div className="flex flex-wrap gap-2">
            {CLASSIFICATION_OPTIONS.map(opt => (
              <span key={opt} className={`px-3 py-1 rounded-full text-xs border ${profile.classification.includes(opt) ? 'bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-300'}`}
                style={profile.classification.includes(opt) ? { borderColor: BRAND } : {}}>
                {opt}
              </span>
            ))}
            {profile.classificationOther.filter(Boolean).map((v, i) => (
              <span key={i} className="px-3 py-1 rounded-full text-xs bg-purple-50 text-purple-700 border" style={{ borderColor: BRAND }}>Others: {v}</span>
            ))}
          </div>

          <SectionDivider numeral="III" title="Desired Qualification" />
          <div className="flex flex-wrap gap-2">
            {QUALIFICATION_OPTIONS.map(opt => (
              <span key={opt} className={`px-3 py-1 rounded-full text-xs border ${profile.desiredQualification.includes(opt) ? 'bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-300'}`}
                style={profile.desiredQualification.includes(opt) ? { borderColor: BRAND } : {}}>
                {opt}
              </span>
            ))}
            {profile.qualificationOther.filter(Boolean).map((v, i) => (
              <span key={i} className="px-3 py-1 rounded-full text-xs bg-purple-50 text-purple-700 border" style={{ borderColor: BRAND }}>Others: {v}</span>
            ))}
          </div>

          <SectionDivider numeral="IV" title="Purpose of Training" />
          <div className="flex flex-wrap gap-2">
            {PURPOSE_OPTIONS.map(opt => (
              <span key={opt} className={`px-3 py-1 rounded-full text-xs border ${profile.purposeOfTraining.includes(opt) ? 'bg-green-100 text-green-700 border-green-300' : 'border-gray-200 text-gray-300'}`}>
                {opt}
              </span>
            ))}
            {profile.purposeOther.filter(Boolean).map((v, i) => (
              <span key={i} className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-700 border border-green-300">Others: {v}</span>
            ))}
          </div>

          <SectionDivider numeral="V" title="For PESO Office Only" gray />
          <div className="grid grid-cols-2 gap-5">
            <Field label="Date Received" value={profile.dateApplicationReceived} />
            <Field label="Received By" value={profile.receivedBy} />
            <Field label="Batch No." value={profile.trainingBatchNo} />
            <Field label="Status" value={profile.status} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Default export: form ──────────────────────────────────────────────────────

export default function SkillsTrainingProfileForm({
  onClose,
  onSave,
  initialData,
  mode = 'add',
}: {
  onClose: () => void
  onSave: (data: Omit<SkillsTrainingProfile, 'id'>) => void
  initialData?: Omit<SkillsTrainingProfile, 'id'>
  mode?: 'add' | 'edit'
}) {
  const [formData, setFormData] = useState<Omit<SkillsTrainingProfile, 'id'>>(initialData ?? emptyForm)
  const set = (updates: Partial<Omit<SkillsTrainingProfile, 'id'>>) => setFormData(prev => ({ ...prev, ...updates }))

  const toggleArr = (field: 'classification' | 'desiredQualification' | 'purposeOfTraining', value: string) => {
    const arr = formData[field] as string[]
    set({ [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] })
  }

  const handleBirthdate = (date: string) => {
    const age = date ? new Date().getFullYear() - new Date(date).getFullYear() : 0
    set({ birthdate: date, age })
  }

  const handleSave = () => {
    if (!formData.lastName || !formData.firstName) { alert('Please fill in Last Name and First Name.'); return }
    onSave(formData)
  }

  return (
    <div className="h-full bg-brand-bg flex flex-col">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EDE9FE' }}>
            <Users size={18} style={{ color: BRAND }} />
          </div>
          <p className="text-gray-800 font-semibold" style={{ fontSize: 'var(--text-md)' }}>
            {mode === 'edit' ? 'Edit Profile — Skills Training' : 'Add New Profile — Skills Training'}
          </p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8">

          <SectionDivider numeral="I" title="Personal Information" />
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className={lbl}>Last Name <span className="text-red-500">*</span></label>
              <input className={inpFocus} value={formData.lastName} onChange={e => set({ lastName: e.target.value })} placeholder="Dela Cruz" />
            </div>
            <div>
              <label className={lbl}>First Name <span className="text-red-500">*</span></label>
              <input className={inpFocus} value={formData.firstName} onChange={e => set({ firstName: e.target.value })} placeholder="Juan" />
            </div>
            <div>
              <label className={lbl}>Middle Name</label>
              <input className={inpFocus} value={formData.middleName} onChange={e => set({ middleName: e.target.value })} placeholder="M." />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className={lbl}>Birthdate</label>
              <DatePicker className={inpFocus} value={formData.birthdate} onChange={handleBirthdate} />
            </div>
            <div>
              <label className={lbl}>Age</label>
              <input type="number" className={inpFocus} value={formData.age || ''} onChange={e => set({ age: parseInt(e.target.value) || 0 })} placeholder="0" min={0} />
            </div>
            <div>
              <label className={lbl}>Civil Status</label>
              <select className={`${inpFocus} bg-white`} value={formData.civilStatus} onChange={e => set({ civilStatus: e.target.value })}>
                <option value="">Select</option>
                {CIVIL_STATUS_OPTIONS.map(cs => <option key={cs}>{cs}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={lbl}>Sex</label>
              <div className="flex gap-6 mt-2">
                {['Male', 'Female'].map(s => (
                  <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="form-sex" value={s} checked={formData.sex === s} onChange={() => set({ sex: s })} className="accent-[#8B5CF6]" />
                    {s}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className={lbl}>Contact #</label>
              <input className={inpFocus} value={formData.contactNumber} onChange={e => set({ contactNumber: e.target.value })} placeholder="09XXXXXXXXX" />
            </div>
          </div>
          <div>
            <label className={lbl}>Address</label>
            <input className={inpFocus} value={formData.address} onChange={e => set({ address: e.target.value })} placeholder="House No., Street, Barangay, Municipality/City, Province" />
          </div>

          <SectionDivider numeral="II" title="Classification" />
          <p className="text-xs text-gray-400 -mt-1 mb-3 italic">Please check the box(es) that best apply to you.</p>
          <div className="grid grid-cols-2 gap-3">
            {CLASSIFICATION_OPTIONS.map(opt => (
              <CheckItem key={opt} label={opt} checked={formData.classification.includes(opt)} onChange={() => toggleArr('classification', opt)} />
            ))}
          </div>
          <OtherSpecifyField values={formData.classificationOther} placeholder="Specify other classification..." onUpdate={vals => set({ classificationOther: vals })} />

          <SectionDivider numeral="III" title="Desired Qualification" />
          <p className="text-xs text-gray-400 -mt-1 mb-3 italic">Select the qualification(s) you wish to train for.</p>
          <div className="grid grid-cols-2 gap-3">
            {QUALIFICATION_OPTIONS.map(opt => (
              <CheckItem key={opt} label={opt} checked={formData.desiredQualification.includes(opt)} onChange={() => toggleArr('desiredQualification', opt)} />
            ))}
          </div>
          <OtherSpecifyField values={formData.qualificationOther} placeholder="Specify other qualification..." onUpdate={vals => set({ qualificationOther: vals })} />

          <SectionDivider numeral="IV" title="Purpose of Training" />
          <p className="text-xs text-gray-400 -mt-1 mb-3 italic">Select all purposes that apply to your training application.</p>
          <div className="space-y-3">
            {PURPOSE_OPTIONS.map(opt => (
              <CheckItem key={opt} label={opt} checked={formData.purposeOfTraining.includes(opt)} onChange={() => toggleArr('purposeOfTraining', opt)} />
            ))}
          </div>
          <OtherSpecifyField values={formData.purposeOther} placeholder="Specify other purpose..." onUpdate={vals => set({ purposeOther: vals })} />

          <SectionDivider numeral="V" title="Attached Documents" />
          <p className="text-xs text-gray-400 -mt-1 mb-3">Attach supporting documents (optional / if applicable).</p>
          <div className="flex gap-2">
            <input
              className={`${inpFocus} flex-1`}
              placeholder="Document name (e.g. Birth Certificate, Certificate of Residency...)"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const val = (e.currentTarget.value || '').trim()
                  if (val) { set({ attachedDocuments: [...formData.attachedDocuments, val] }); e.currentTarget.value = '' }
                  e.preventDefault()
                }
              }}
            />
            <button
              type="button"
              onClick={e => {
                const inputEl = e.currentTarget.previousSibling as HTMLInputElement
                const val = inputEl?.value?.trim()
                if (val) { set({ attachedDocuments: [...formData.attachedDocuments, val] }); inputEl.value = '' }
              }}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 whitespace-nowrap text-sm flex-shrink-0"
              style={{ backgroundColor: BRAND }}
            >
              <Upload size={15} /> Attach File
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Supported: PDF, images (JPG, PNG), Word documents.</p>
          {formData.attachedDocuments.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {formData.attachedDocuments.map((doc, i) => (
                <li key={i} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700">
                  {doc}
                  <button type="button" onClick={() => set({ attachedDocuments: formData.attachedDocuments.filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                </li>
              ))}
            </ul>
          )}

          <SectionDivider numeral="VI" title="For PESO Office Only" gray />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Date Application Received</label>
              <DatePicker className={inpFocus} value={formData.dateApplicationReceived} onChange={value => set({ dateApplicationReceived: value })} />
            </div>
            <div>
              <label className={lbl}>Received By</label>
              <input className={inpFocus} value={formData.receivedBy} onChange={e => set({ receivedBy: e.target.value })} placeholder="Staff name" />
            </div>
            <div>
              <label className={lbl}>Training Batch No.</label>
              <select className={`${inpFocus} bg-white`} value={formData.trainingBatchNo} onChange={e => set({ trainingBatchNo: e.target.value })}>
                <option value="">— Select Batch —</option>
                {BATCH_OPTIONS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Status</label>
              <select className={`${inpFocus} bg-white`} value={formData.status} onChange={e => set({ status: e.target.value as SkillsTrainingProfile['status'] })}>
                <option value="Waitlisted">Waitlisted</option>
                <option value="Accepted">Accepted</option>
              </select>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">Cancel</button>
            <button onClick={handleSave} className="px-8 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark text-sm">
              {mode === 'edit' ? 'Save Changes' : 'Save Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
