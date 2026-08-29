import { useRef, useState } from 'react'
import { X, Users, Upload, FileText, Eye, Trash2 } from 'lucide-react'
import type { SkillsTrainingProfile, SkillsTrainingSavedDocument, SkillsTrainingLookup } from '../../contexts/SkillsTrainingContext'
import DatePicker from '../../components/DatePicker'
import SearchableSelect from '../../components/SearchableSelect'
import DocumentPreviewModal from '../../components/DocumentPreviewModal'
import { searchProvinces, searchCities, searchBarangaysByCity } from '../../services/locationService'
import { useFieldValidation, NAME_REGEX, type ValidationError } from '../../hooks/useFieldValidation'
import { ATTACHMENT_ACCEPT, ATTACHMENT_ACCEPT_LABEL } from '../../utils/attachments'

function formatFileSize(bytes: number) {
  if (bytes <= 0) return '0 Bytes'
  const units = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${units[i]}`
}

type AttachedDocsEditorProps = {
  docs: SkillsTrainingSavedDocument[]
  onChange: (docs: SkillsTrainingSavedDocument[]) => void
  onPreview: (doc: SkillsTrainingSavedDocument) => void
}

// previewDoc lives in the parent (SkillsTrainingProfileForm) and renders as a
// sibling of the whole form, not nested inside this component -- a
// `fixed inset-0` modal nested inside an ancestor with opacity/filter/transform
// (a view-mode-dimmed fieldset) stops being positioned relative to the
// viewport and gets squashed into that ancestor's box instead.
function AttachedDocsEditor({ docs, onChange, onPreview }: AttachedDocsEditorProps) {
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      onChange([...docs, {
        id: Date.now().toString() + Math.random().toString(36),
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        url: '',
        dataUrl: reader.result as string,
      }])
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  function handleRemoveFile(index: number) {
    onChange(docs.filter((_, i) => i !== index))
  }

  return (
    <div>
      <input
        type="file" id="skills-document-upload" className="hidden"
        onChange={handleFileChange} accept={ATTACHMENT_ACCEPT}
      />
      <label
        htmlFor="skills-document-upload"
        className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-dashed border-brand-blue bg-blue-50 text-brand-blue rounded-lg cursor-pointer hover:bg-blue-100 transition-colors text-sm"
      >
        <Upload size={16} />
        <span className="font-medium">Upload Document</span>
      </label>
      <p className="text-xs text-gray-500 mt-2">Accepted formats: {ATTACHMENT_ACCEPT_LABEL}</p>

      {docs.length > 0 && (
        <div className="space-y-3 pt-4 mt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700">Uploaded Documents</h4>
          <div className="space-y-2">
            {docs.map((doc, index) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer pointer-events-auto" onClick={() => onPreview(doc)}>
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <FileText size={20} className="text-brand-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{doc.fileName}</p>
                    <p className="text-xs text-gray-500">{doc.fileSize}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => onPreview(doc)} className="flex-shrink-0 p-2 text-brand-blue hover:bg-blue-50 rounded-lg transition-colors pointer-events-auto" title="Preview document">
                    <Eye size={18} />
                  </button>
                  <button type="button" onClick={() => handleRemoveFile(index)} className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete document">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Exported constants ────────────────────────────────────────────────────────

const BRAND = '#0077BE'

export const CLASSIFICATION_OPTIONS = ['Student', 'Out of School Youth', 'Women', 'PWD', 'Employed', 'Unemployed']
export const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated', 'Divorced']
export const SEX_OPTIONS = ['Male', 'Female']
export const STATUS_OPTIONS = ['Waitlisted', 'Accepted']

const emptyForm: Omit<SkillsTrainingProfile, 'id'> = {
  beneficiaryServiceId: 0,
  lastName: '', firstName: '', middleName: '', birthdate: '', age: 0,
  sex: '', civilStatus: '', contactNumber: '',
  streetPurok: '', barangay: '', barangayId: 0, cityMunicipality: '', province: '', region: '',
  classification: [], classificationOther: [],
  desiredQualification: [], qualificationOther: [],
  purposeOfTraining: [], purposeOther: [],
  assignedTrainingId: null, assignedTrainingTitle: '', assignedTrainingStatus: null,
  lastCompletedTrainingTitle: '', lastCompletedDate: null, placed: false,
  attachedDocuments: [],
  dateApplicationReceived: '', receivedBy: '',
  status: 'Waitlisted',
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
  values, placeholder, onUpdate,
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
  const [previewDoc, setPreviewDoc] = useState<SkillsTrainingSavedDocument | null>(null)
  const address = [profile.streetPurok, profile.barangay, profile.cityMunicipality, profile.province].filter(Boolean).join(', ')

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
            <Field label="Address" value={address} />
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
            {profile.desiredQualification.map(opt => (
              <span key={opt} className="px-3 py-1 rounded-full text-xs border bg-purple-50 text-purple-700" style={{ borderColor: BRAND }}>{opt}</span>
            ))}
            {profile.qualificationOther.filter(Boolean).map((v, i) => (
              <span key={i} className="px-3 py-1 rounded-full text-xs bg-purple-50 text-purple-700 border" style={{ borderColor: BRAND }}>Others: {v}</span>
            ))}
            {profile.desiredQualification.length === 0 && profile.qualificationOther.filter(Boolean).length === 0 && (
              <span className="text-gray-400 text-sm">—</span>
            )}
          </div>

          <SectionDivider numeral="IV" title="Purpose of Training" />
          <div className="flex flex-wrap gap-2">
            {profile.purposeOfTraining.map(opt => (
              <span key={opt} className="px-3 py-1 rounded-full text-xs border bg-green-100 text-green-700 border-green-300">{opt}</span>
            ))}
            {profile.purposeOther.filter(Boolean).map((v, i) => (
              <span key={i} className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-700 border border-green-300">Others: {v}</span>
            ))}
            {profile.purposeOfTraining.length === 0 && profile.purposeOther.filter(Boolean).length === 0 && (
              <span className="text-gray-400 text-sm">—</span>
            )}
          </div>

          <SectionDivider numeral="V" title="For PESO Office Only" gray />
          <div className="grid grid-cols-2 gap-5">
            <Field label="Date Applied" value={profile.dateApplicationReceived} />
            <Field label="Received By" value={profile.receivedBy} />
            <Field label="Status" value={profile.status} />
          </div>

          {profile.attachedDocuments.length > 0 && (
            <>
              <SectionDivider numeral="VI" title="Attached Documents" gray />
              <div className="space-y-2">
                {profile.attachedDocuments.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:shadow-md transition-shadow" onClick={() => setPreviewDoc(doc)}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <FileText size={20} className="text-brand-blue" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{doc.fileName}</p>
                        <p className="text-xs text-gray-500">{doc.fileSize}</p>
                      </div>
                    </div>
                    <Eye size={18} className="text-brand-blue flex-shrink-0" />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {previewDoc && <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
    </div>
  )
}

// ─── Default export: form ──────────────────────────────────────────────────────

export default function SkillsTrainingProfileForm({
  onClose, onSave, initialData, mode = 'add', qualifications, purposes,
}: {
  onClose: () => void
  onSave: (data: Omit<SkillsTrainingProfile, 'id'>) => void
  initialData?: Omit<SkillsTrainingProfile, 'id'>
  mode?: 'add' | 'edit'
  qualifications: SkillsTrainingLookup[]
  purposes: SkillsTrainingLookup[]
}) {
  const [formData, setFormData] = useState<Omit<SkillsTrainingProfile, 'id'>>(initialData ?? emptyForm)
  const set = (updates: Partial<Omit<SkillsTrainingProfile, 'id'>>) => setFormData(prev => ({ ...prev, ...updates }))
  const [provinceId, setProvinceId] = useState<number | null>(null)
  const [cityId, setCityId] = useState<number | null>(null)
  const [previewDoc, setPreviewDoc] = useState<SkillsTrainingSavedDocument | null>(null)
  const { clearFieldError, errCls, fieldMessage, runValidation } = useFieldValidation()

  const qualificationOptions = qualifications.filter(q => q.name !== 'Other').map(q => q.name)
  const purposeOptions = purposes.filter(p => p.name !== 'Other').map(p => p.name)

  const toggleArr = (field: 'classification' | 'desiredQualification' | 'purposeOfTraining', value: string) => {
    const arr = formData[field] as string[]
    set({ [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] })
  }

  const lastNameRef = useRef<HTMLInputElement>(null)
  const firstNameRef = useRef<HTMLInputElement>(null)
  const middleNameRef = useRef<HTMLInputElement>(null)
  const birthdateWrapRef = useRef<HTMLDivElement>(null)
  const civilStatusRef = useRef<HTMLSelectElement>(null)
  const sexWrapRef = useRef<HTMLDivElement>(null)
  const barangayWrapRef = useRef<HTMLDivElement>(null)

  const handleBirthdate = (date: string) => {
    let age = 0
    if (date) {
      const birth = new Date(date)
      const today = new Date()
      age = today.getFullYear() - birth.getFullYear()
      const hadBirthdayThisYear =
        today.getMonth() > birth.getMonth() ||
        (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate())
      if (!hadBirthdayThisYear) age--
    }
    set({ birthdate: date, age })
    clearFieldError('birthdate')
  }

  // Sex, birthdate, civil status, and barangay are required by the underlying
  // beneficiaries table (NOT NULL columns); name fields additionally reject
  // digits/symbols.
  const handleSave = () => {
    const lastName = formData.lastName.trim()
    const firstName = formData.firstName.trim()
    const middleName = formData.middleName.trim()
    const errors: ValidationError[] = []

    if (!lastName) {
      errors.push({ field: 'lastName', message: 'Last Name is required.', focus: () => lastNameRef.current?.focus() })
    } else if (!NAME_REGEX.test(lastName)) {
      errors.push({ field: 'lastName', message: 'Last Name must contain letters only (no numbers or symbols).', focus: () => lastNameRef.current?.focus() })
    }

    if (!firstName) {
      errors.push({ field: 'firstName', message: 'First Name is required.', focus: () => firstNameRef.current?.focus() })
    } else if (!NAME_REGEX.test(firstName)) {
      errors.push({ field: 'firstName', message: 'First Name must contain letters only (no numbers or symbols).', focus: () => firstNameRef.current?.focus() })
    }

    if (middleName && !NAME_REGEX.test(middleName)) {
      errors.push({ field: 'middleName', message: 'Middle Name must contain letters only (no numbers or symbols).', focus: () => middleNameRef.current?.focus() })
    }

    if (!formData.birthdate) {
      errors.push({
        field: 'birthdate',
        message: 'Birthdate is required.',
        focus: () => birthdateWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      })
    }

    if (!formData.civilStatus) {
      errors.push({ field: 'civilStatus', message: 'Civil Status is required.', focus: () => civilStatusRef.current?.focus() })
    }

    if (!formData.sex) {
      errors.push({
        field: 'sex',
        message: 'Sex is required.',
        focus: () => sexWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      })
    }

    if (!formData.barangayId) {
      errors.push({
        field: 'barangay',
        message: 'Barangay is required (Address section).',
        focus: () => barangayWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      })
    }

    if (runValidation(errors)) return
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
              <input ref={lastNameRef} className={`${inpFocus} ${errCls('lastName')}`} value={formData.lastName} onChange={e => { set({ lastName: e.target.value }); clearFieldError('lastName') }} placeholder="Enter last name" />
              {fieldMessage('lastName') && <p className="text-red-500 text-xs mt-1">{fieldMessage('lastName')}</p>}
            </div>
            <div>
              <label className={lbl}>First Name <span className="text-red-500">*</span></label>
              <input ref={firstNameRef} className={`${inpFocus} ${errCls('firstName')}`} value={formData.firstName} onChange={e => { set({ firstName: e.target.value }); clearFieldError('firstName') }} placeholder="Enter first name" />
              {fieldMessage('firstName') && <p className="text-red-500 text-xs mt-1">{fieldMessage('firstName')}</p>}
            </div>
            <div>
              <label className={lbl}>Middle Name</label>
              <input ref={middleNameRef} className={`${inpFocus} ${errCls('middleName')}`} value={formData.middleName} onChange={e => { set({ middleName: e.target.value }); clearFieldError('middleName') }} placeholder="Enter middle name" />
              {fieldMessage('middleName') && <p className="text-red-500 text-xs mt-1">{fieldMessage('middleName')}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div ref={birthdateWrapRef}>
              <label className={lbl}>Birthdate <span className="text-red-500">*</span></label>
              <div className={`rounded-lg ${fieldMessage('birthdate') ? 'ring-2 ring-red-200' : ''}`}>
                <DatePicker className={inpFocus} value={formData.birthdate} onChange={handleBirthdate} />
              </div>
              {fieldMessage('birthdate') && <p className="text-red-500 text-xs mt-1">{fieldMessage('birthdate')}</p>}
            </div>
            <div>
              <label className={lbl}>Age</label>
              <input type="number" className={inpFocus} value={formData.age || ''} onChange={e => set({ age: parseInt(e.target.value) || 0 })} placeholder="0" min={0} />
            </div>
            <div>
              <label className={lbl}>Civil Status <span className="text-red-500">*</span></label>
              <select ref={civilStatusRef} className={`${inpFocus} bg-white ${errCls('civilStatus')}`} value={formData.civilStatus} onChange={e => { set({ civilStatus: e.target.value }); clearFieldError('civilStatus') }}>
                <option value="">Select</option>
                {CIVIL_STATUS_OPTIONS.map(cs => <option key={cs}>{cs}</option>)}
              </select>
              {fieldMessage('civilStatus') && <p className="text-red-500 text-xs mt-1">{fieldMessage('civilStatus')}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div ref={sexWrapRef}>
              <label className={lbl}>Sex <span className="text-red-500">*</span></label>
              <div className={`flex gap-6 mt-2 rounded-lg ${fieldMessage('sex') ? 'ring-2 ring-red-200 p-2' : ''}`}>
                {['Male', 'Female'].map(s => (
                  <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="form-sex" value={s} checked={formData.sex === s} onChange={() => { set({ sex: s as 'Male' | 'Female' }); clearFieldError('sex') }} className="accent-[#8B5CF6]" />
                    {s}
                  </label>
                ))}
              </div>
              {fieldMessage('sex') && <p className="text-red-500 text-xs mt-1">{fieldMessage('sex')}</p>}
            </div>
            <div>
              <label className={lbl}>Contact #</label>
              <input className={inpFocus} value={formData.contactNumber} onChange={e => set({ contactNumber: e.target.value })} placeholder="09XXXXXXXXX" />
            </div>
          </div>

          <p className="text-xs font-bold text-gray-900 uppercase tracking-wide mt-6 mb-6">Address</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={lbl}>Province</label>
              <SearchableSelect
                value={formData.province}
                placeholder="Search province..."
                fetchOptions={(s) => searchProvinces(s)}
                onSelect={(opt) => {
                  setProvinceId(opt.id)
                  setCityId(null)
                  set({ province: opt.name, cityMunicipality: '', barangay: '', barangayId: 0 })
                }}
              />
            </div>
            <div>
              <label className={lbl}>City / Municipality</label>
              <SearchableSelect
                value={formData.cityMunicipality}
                placeholder={provinceId ? 'Search city/municipality...' : 'Select province first'}
                disabled={!provinceId}
                refetchKey={provinceId ?? ''}
                fetchOptions={(s) => searchCities(provinceId ?? 0, s)}
                onSelect={(opt) => {
                  setCityId(opt.id)
                  set({ cityMunicipality: opt.name, barangay: '', barangayId: 0 })
                }}
              />
            </div>
            <div ref={barangayWrapRef}>
              <label className={lbl}>Barangay <span className="text-red-500">*</span></label>
              <div className={`rounded-lg ${fieldMessage('barangay') ? 'ring-2 ring-red-200' : ''}`}>
                <SearchableSelect
                  value={formData.barangay}
                  placeholder={cityId ? 'Search barangay...' : 'Select city first'}
                  disabled={!cityId}
                  refetchKey={cityId ?? ''}
                  fetchOptions={(s) => searchBarangaysByCity(cityId ?? 0, s)}
                  onSelect={(opt) => { set({ barangay: opt.name, barangayId: opt.id }); clearFieldError('barangay') }}
                />
              </div>
              {fieldMessage('barangay') && <p className="text-red-500 text-xs mt-1">{fieldMessage('barangay')}</p>}
            </div>
            <div>
              <label className={lbl}>Street / Purok #</label>
              <input className={inp} value={formData.streetPurok} onChange={e => set({ streetPurok: e.target.value })} placeholder="Enter street or purok" />
            </div>
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
            {qualificationOptions.map(opt => (
              <CheckItem key={opt} label={opt} checked={formData.desiredQualification.includes(opt)} onChange={() => toggleArr('desiredQualification', opt)} />
            ))}
          </div>
          <OtherSpecifyField values={formData.qualificationOther} placeholder="Specify other qualification..." onUpdate={vals => set({ qualificationOther: vals })} />

          <SectionDivider numeral="IV" title="Purpose of Training" />
          <p className="text-xs text-gray-400 -mt-1 mb-3 italic">Select all purposes that apply to your training application.</p>
          <div className="space-y-3">
            {purposeOptions.map(opt => (
              <CheckItem key={opt} label={opt} checked={formData.purposeOfTraining.includes(opt)} onChange={() => toggleArr('purposeOfTraining', opt)} />
            ))}
          </div>
          <OtherSpecifyField values={formData.purposeOther} placeholder="Specify other purpose..." onUpdate={vals => set({ purposeOther: vals })} />

          <SectionDivider numeral="V" title="For PESO Office Only" gray />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Date Applied</label>
              <DatePicker className={inpFocus} value={formData.dateApplicationReceived} onChange={value => set({ dateApplicationReceived: value })} />
            </div>
            <div>
              <label className={lbl}>Received By</label>
              <input className={inpFocus} value={formData.receivedBy} onChange={e => set({ receivedBy: e.target.value })} placeholder="Staff name" />
            </div>
            <div>
              <label className={lbl}>Status</label>
              <select className={`${inpFocus} bg-white`} value={formData.status} onChange={e => set({ status: e.target.value as SkillsTrainingProfile['status'] })}>
                <option value="Waitlisted">Waitlisted</option>
                <option value="Accepted">Accepted</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label className={lbl}>Attached Documents</label>
            <p className="text-xs text-gray-400 mb-3">Attach supporting documents (optional / if applicable).</p>
            <AttachedDocsEditor
              docs={formData.attachedDocuments}
              onChange={docs => set({ attachedDocuments: docs })}
              onPreview={doc => setPreviewDoc(doc)}
            />
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">Cancel</button>
            <button onClick={handleSave} className="px-8 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark text-sm">
              {mode === 'edit' ? 'Save Changes' : 'Save Profile'}
            </button>
          </div>
        </div>
      </div>
      {previewDoc && <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
    </div>
  )
}
