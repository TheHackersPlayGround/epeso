import { useState, useRef } from 'react'
import { X, Users, Upload, FileText } from 'lucide-react'
import type { SPESApplicant, SPESBatch, SPESSavedDocument } from '../../contexts/SPESContext'
import SearchableSelect from '../../components/SearchableSelect'
import { searchProvinces, searchCities, searchBarangaysByCity } from '../../services/locationService'
import DatePicker from '../../components/DatePicker'
import { useFieldValidation, NAME_REGEX, type ValidationError } from '../../hooks/useFieldValidation'

// ─── Exported constants ────────────────────────────────────────────────────────

export const SCHOOL_TYPE_OPTIONS = [
  'Junior High School',
  'Senior High School',
  'College',
  'Alternative Learning System (ALS)',
  'Technical / Vocational',
]

export const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated']

export const CLASSIFICATION_OPTIONS = [
  'Student', 'Fresh Graduate', 'Employed', 'Underemployed', 'Unemployed',
  'Out of School Youth', 'Person with Disability', 'Solo Parent',
  'Women', 'Senior Citizen', 'Returning OFW', 'Other', 'Indigenous People',
]

export const emptyForm: Omit<SPESApplicant, 'id'> = {
  spesProfileId: null, beneficiaryServiceId: 0,
  lastName: '', firstName: '', middleName: '',
  sex: '', birthdate: '', age: 0, civilStatus: '',
  contactNumber: '', email: '',
  streetPurok: '', barangay: '', barangayId: 0, cityMunicipality: '', province: '', region: '',
  classification: [], classificationOther: '',
  schoolName: '', schoolType: '', gradeYearLevel: '', course: '',
  annualFamilyIncome: '', numberOfDependents: 0,
  assignedBatchId: null,
  assignmentHistory: [],
  attachedDocuments: [],
  dateApplicationReceived: '', receivedBy: '',
  status: 'Inactive', remarks: '',
}

// ─── Exported helpers ──────────────────────────────────────────────────────────

export function deriveStatus(applicant: Omit<SPESApplicant, 'id'>, batches: SPESBatch[]): SPESApplicant['status'] {
  if (applicant.status === 'Completed' || applicant.status === 'Cancelled') return applicant.status
  if (!applicant.assignedBatchId) return 'Inactive'
  const batch = batches.find(b => b.id === applicant.assignedBatchId)
  if (!batch || batch.status === 'Completed') return 'Inactive'
  return 'Active'
}

// ─── Exported badges ───────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: SPESApplicant['status'] }) {
  const colors: Record<string, string> = {
    Active:    'bg-blue-100 text-blue-700',
    Inactive:  'bg-gray-100 text-gray-500',
    Completed: 'bg-emerald-100 text-emerald-700',
    Cancelled: 'bg-red-100 text-red-600',
  }
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

export function BatchStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Planned:   'bg-yellow-100 text-yellow-700',
    Ongoing:   'bg-green-100 text-green-700',
    Completed: 'bg-blue-100 text-blue-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

// Grade/Year Level options narrow down to whatever's actually applicable to
// the selected School Type, instead of showing every level from Grade 7
// through 5th Year regardless of context. Exported so the bulk importer
// (spesImport.ts) can enforce the identical pairing on imported rows, since
// a spreadsheet's Grade/Year Level column can't be a School-Type-conditional
// dropdown the way the Add/Edit form's <select> can.
export function gradeYearLevelOptionsFor(schoolType: string): string[] {
  switch (schoolType) {
    case 'Junior High School':               return ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10']
    case 'Senior High School':                return ['Grade 11', 'Grade 12']
    case 'College':                           return ['1st Year', '2nd Year', '3rd Year', '4th Year']
    case 'Technical / Vocational':            return ['1st Year', '2nd Year']
    case 'Alternative Learning System (ALS)': return ['ALS Level']
    default:                                  return []
  }
}

function formatFileSize(bytes: number) {
  if (bytes <= 0) return '0 Bytes'
  const units = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${units[i]}`
}

function AttachedDocsEditor({ docs, onChange }: { docs: SPESSavedDocument[]; onChange: (docs: SPESSavedDocument[]) => void }) {
  const [pendingName, setPendingName] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const customName = pendingName.trim() || file.name
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      onChange([...docs, {
        id: Date.now().toString() + Math.random().toString(36),
        customName,
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        // A blob: URL (not the data: dataUrl) so "View" works before the
        // record is saved — Chrome/Brave block opening data: URIs in a new
        // tab as an anti-phishing measure, so a data:-based preview link
        // would always show a blank "Untitled" tab.
        url: URL.createObjectURL(file),
        dataUrl,
      }])
    }
    reader.readAsDataURL(file)
    setPendingName('')
    e.target.value = ''
  }

  const removeDoc = (idx: number) => onChange(docs.filter((_, i) => i !== idx))

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none'

  return (
    <div className="space-y-3">
      {docs.length > 0 && (
        <div className="space-y-2 mb-2">
          {docs.map((doc, i) => (
            <div key={doc.id} className="flex items-center gap-3 px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50">
              <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                <FileText size={14} className="text-brand-blue" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">{doc.customName || doc.fileName}</p>
                <p className="text-xs text-gray-400 truncate">{doc.fileName} · {doc.fileSize}</p>
              </div>
              {(doc.url || doc.dataUrl) && <a href={doc.url || doc.dataUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-blue hover:underline flex-shrink-0">View</a>}
              <button onClick={() => removeDoc(i)} className="text-gray-300 hover:text-red-400 ml-1 flex-shrink-0"><X size={14} /></button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          className={inp}
          value={pendingName}
          onChange={(e) => setPendingName(e.target.value)}
          placeholder="Document name (e.g. Resume, Birth Certificate...)"
        />
        <label className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg cursor-pointer hover:bg-brand-blue-dark whitespace-nowrap text-sm flex-shrink-0">
          <Upload size={15} />
          Attach File
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      </div>
      <p className="text-xs text-gray-400">Supported: PDF, images (JPG, PNG), Word documents.</p>
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
            <p className="text-gray-800 font-semibold" style={{ fontSize: 'var(--text-lg)' }}>{applicant.lastName}, {applicant.firstName} {applicant.middleName}</p>
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
          <Sec num="III" title="Classification" />
          <div className="flex flex-wrap gap-2">
            {applicant.classification.length > 0
              ? applicant.classification.map(c => <span key={c} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">{c}</span>)
              : <span className="text-sm text-gray-400">—</span>}
          </div>
          {applicant.classificationOther && (
            <p className="text-sm text-gray-600 mt-2">Other: {applicant.classificationOther}</p>
          )}
          <Sec num="IV" title="Educational Information" />
          <div className="grid grid-cols-2 gap-5">
            <Field label="School Name" value={applicant.schoolName} />
            <Field label="School Type" value={applicant.schoolType} />
            <Field label="Grade / Year Level" value={applicant.gradeYearLevel} />
            <Field label="Course / Program" value={applicant.course} />
          </div>
          <Sec num="V" title="Family / Economic Information" />
          <div className="grid grid-cols-2 gap-5">
            <Field label="Annual Family Income" value={applicant.annualFamilyIncome ? `₱${applicant.annualFamilyIncome}` : ''} />
            <Field label="Number of Dependents" value={applicant.numberOfDependents} />
          </div>
          <Sec num="VI" title="For PESO Office Only" gray />
          <div className="grid grid-cols-2 gap-5">
            <Field label="Date Applied" value={applicant.dateApplicationReceived} />
            <Field label="Received By" value={applicant.receivedBy} />
            <div className="col-span-2"><Field label="Remarks" value={applicant.remarks} /></div>
          </div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mt-12 mb-4">Attached Documents</p>
          {applicant.attachedDocuments && applicant.attachedDocuments.length > 0 ? (
            <div className="space-y-2">
              {applicant.attachedDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <FileText size={14} className="text-brand-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{doc.customName || doc.fileName}</p>
                    <p className="text-xs text-gray-400 truncate">{doc.fileName} · {doc.fileSize}</p>
                  </div>
                  {doc.url && <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs text-brand-blue hover:underline flex-shrink-0">View</a>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No documents attached.</p>
          )}
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
  const [formData, setFormData] = useState(initial)
  const set = (patch: Partial<Omit<SPESApplicant, 'id'>>) => setFormData(p => ({ ...p, ...patch }))
  const toggleClassification = (val: string) =>
    set({
      classification: formData.classification.includes(val)
        ? formData.classification.filter(c => c !== val)
        : [...formData.classification, val],
    })
  const [provinceId, setProvinceId] = useState<number | null>(null)
  const [cityId, setCityId] = useState<number | null>(null)

  const { fieldErrors, clearFieldError, errCls, fieldMessage, runValidation } = useFieldValidation()
  const lastNameRef = useRef<HTMLInputElement>(null)
  const firstNameRef = useRef<HTMLInputElement>(null)
  const middleNameRef = useRef<HTMLInputElement>(null)
  const sexRef = useRef<HTMLSelectElement>(null)
  const birthdateWrapRef = useRef<HTMLDivElement>(null)
  const civilStatusRef = useRef<HTMLSelectElement>(null)
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

  const derivedStatus: SPESApplicant['status'] = formData.assignedBatchId !== null ? 'Active' : 'Inactive'

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

    if (!formData.sex) {
      errors.push({ field: 'sex', message: 'Sex is required.', focus: () => sexRef.current?.focus() })
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

    if (!formData.barangayId) {
      errors.push({
        field: 'barangay',
        message: 'Barangay is required (Section II. Address).',
        focus: () => barangayWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      })
    }

    if (runValidation(errors)) return
    onSave({ ...formData, status: derivedStatus })
  }

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none placeholder:text-gray-400'
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
        className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${checked ? 'bg-brand-blue border-brand-blue' : 'border-gray-300 bg-white'}`}
      >
        {checked && <span className="text-white text-xs leading-none">✓</span>}
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
              <input ref={lastNameRef} className={`${inp} ${errCls('lastName')}`} value={formData.lastName} onChange={e => { set({ lastName: e.target.value }); clearFieldError('lastName') }} placeholder="Enter surname" />
              {fieldMessage('lastName') && <p className="text-red-500 text-xs mt-1">{fieldMessage('lastName')}</p>}
            </div>
            <div>
              <label className={lbl}>First Name <span className="text-red-500">*</span></label>
              <input ref={firstNameRef} className={`${inp} ${errCls('firstName')}`} value={formData.firstName} onChange={e => { set({ firstName: e.target.value }); clearFieldError('firstName') }} placeholder="Enter first name" />
              {fieldMessage('firstName') && <p className="text-red-500 text-xs mt-1">{fieldMessage('firstName')}</p>}
            </div>
            <div>
              <label className={lbl}>Middle Name <span className="text-gray-400 font-normal">(if applicable)</span></label>
              <input ref={middleNameRef} className={`${inp} ${errCls('middleName')}`} value={formData.middleName} onChange={e => { set({ middleName: e.target.value }); clearFieldError('middleName') }} placeholder="Enter middle name" />
              {fieldMessage('middleName') && <p className="text-red-500 text-xs mt-1">{fieldMessage('middleName')}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className={lbl}>Sex <span className="text-red-500">*</span></label>
              <select ref={sexRef} className={`${sel} ${errCls('sex')}`} value={formData.sex} onChange={e => { set({ sex: e.target.value as SPESApplicant['sex'] }); clearFieldError('sex') }}>
                <option value="">Select</option>
                <option>Male</option><option>Female</option>
              </select>
              {fieldMessage('sex') && <p className="text-red-500 text-xs mt-1">{fieldMessage('sex')}</p>}
            </div>
            <div ref={birthdateWrapRef}>
              <label className={lbl}>Birthdate <span className="text-red-500">*</span></label>
              <DatePicker className={`${inp} ${errCls('birthdate')}`} value={formData.birthdate} onChange={handleBirthdate} />
              {fieldMessage('birthdate') && <p className="text-red-500 text-xs mt-1">{fieldMessage('birthdate')}</p>}
            </div>
            <div>
              <label className={lbl}>Age</label>
              <input type="number" className={inp} value={formData.age || ''} onChange={e => set({ age: parseInt(e.target.value) || 0 })} placeholder="Enter age" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={lbl}>Civil Status <span className="text-red-500">*</span></label>
              <select ref={civilStatusRef} className={`${sel} ${errCls('civilStatus')}`} value={formData.civilStatus} onChange={e => { set({ civilStatus: e.target.value }); clearFieldError('civilStatus') }}>
                <option value="">Select</option>
                {CIVIL_STATUS_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
              {fieldMessage('civilStatus') && <p className="text-red-500 text-xs mt-1">{fieldMessage('civilStatus')}</p>}
            </div>
            <div>
              <label className={lbl}>Contact Number</label>
              <input className={inp} value={formData.contactNumber} onChange={e => set({ contactNumber: e.target.value })} placeholder="Enter contact number" />
            </div>
            <div>
              <label className={lbl}>Email (optional)</label>
              <input className={inp} value={formData.email} onChange={e => set({ email: e.target.value })} placeholder="Enter email address" />
            </div>
          </div>

          <SectionDivider num="II" title="Address" />
          <div className="grid grid-cols-2 gap-4">
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
              <div className={`rounded-lg ${fieldErrors.barangay ? 'ring-2 ring-red-200' : ''}`}>
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
              <input className={inp} value={formData.streetPurok} onChange={e => set({ streetPurok: e.target.value })} placeholder="e.g. Purok 3, Rizal St." />
            </div>
          </div>

          <SectionDivider num="III" title="Classification" />
          <div className="grid grid-cols-2 gap-3">
            {CLASSIFICATION_OPTIONS.filter(o => o !== 'Other').map(opt => (
              <CheckItem key={opt} label={opt} checked={formData.classification.includes(opt)} onChange={() => toggleClassification(opt)} />
            ))}
            <CheckItem label="Other" checked={formData.classification.includes('Other')} onChange={() => toggleClassification('Other')} />
          </div>
          {formData.classification.includes('Other') && (
            <div className="mt-3">
              <label className={lbl}>Please specify</label>
              <input className={inp} value={formData.classificationOther} onChange={e => set({ classificationOther: e.target.value })} placeholder="Enter classification" />
            </div>
          )}

          <SectionDivider num="IV" title="Educational Information" />
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <label className={lbl}>School Name</label>
              <input className={inp} value={formData.schoolName} onChange={e => set({ schoolName: e.target.value })} placeholder="e.g. Tangub City College" />
            </div>
            <div>
              <label className={lbl}>School Type</label>
              <select className={sel} value={formData.schoolType} onChange={e => set({ schoolType: e.target.value, gradeYearLevel: '' })}>
                <option value="">Select</option>
                {SCHOOL_TYPE_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Grade / Year Level</label>
              <select className={sel} value={formData.gradeYearLevel} disabled={!formData.schoolType} onChange={e => set({ gradeYearLevel: e.target.value })}>
                <option value="">{formData.schoolType ? 'Select' : 'Select school type first'}</option>
                {gradeYearLevelOptionsFor(formData.schoolType).map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            {(formData.schoolType === 'College' || formData.schoolType === 'Technical / Vocational') && (
              <div className="col-span-2">
                <label className={lbl}>Course / Program</label>
                <input className={inp} value={formData.course} onChange={e => set({ course: e.target.value })} placeholder="e.g. BS Information Technology" />
              </div>
            )}
          </div>

          <SectionDivider num="V" title="Family / Economic Information" />
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={lbl}>Annual Family Income (₱)</label>
              <input className={inp} value={formData.annualFamilyIncome} onChange={e => set({ annualFamilyIncome: e.target.value })} placeholder="e.g. 80,000" />
            </div>
            <div>
              <label className={lbl}>Number of Dependents</label>
              <input type="number" className={inp} value={formData.numberOfDependents || ''} onChange={e => set({ numberOfDependents: parseInt(e.target.value) || 0 })} placeholder="Enter number of dependents" />
            </div>
          </div>

          <SectionDivider num="VI" title="For PESO Office Only" gray />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Date Applied</label>
              <DatePicker className={inp} value={formData.dateApplicationReceived} onChange={value => set({ dateApplicationReceived: value })} />
            </div>
            <div>
              <label className={lbl}>Received By</label>
              <input className={inp} value={formData.receivedBy} onChange={e => set({ receivedBy: e.target.value })} placeholder="Enter staff name" />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Remarks</label>
              <input className={inp} value={formData.remarks} onChange={e => set({ remarks: e.target.value })} placeholder="Enter remarks" />
            </div>
          </div>
          <div className="mt-6">
            <label className={lbl}>Attached Documents</label>
            <p className="text-xs text-gray-400 mb-3">Attach supporting documents (e.g. school ID, certificate of enrollment). This section is optional / if applicable.</p>
            <AttachedDocsEditor
              docs={formData.attachedDocuments}
              onChange={docs => set({ attachedDocuments: docs })}
            />
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
