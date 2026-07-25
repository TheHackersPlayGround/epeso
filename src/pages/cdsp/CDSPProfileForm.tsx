import { useState, useRef } from 'react'
import { X, Users, FileText, Upload, Eye } from 'lucide-react'
import { useCDSP } from '../../contexts/CDSPContext'
import type { CDSPApplicant, CDSPSavedDocument } from '../../contexts/CDSPContext'
import SearchableSelect from '../../components/SearchableSelect'
import { searchProvinces, searchCities, searchBarangaysByCity } from '../../services/locationService'
import DatePicker from '../../components/DatePicker'
import { useFieldValidation, NAME_REGEX, type ValidationError } from '../../hooks/useFieldValidation'

// ─── Constants ────────────────────────────────────────────────────────────────

export const CLASSIFICATION_OPTIONS = [
  'Student', 'Fresh Graduate',
  'Out of School Youth', 'Person with Disability', 'Solo Parent',
  'Women', 'Senior Citizen', 'Returning OFW', 'Other', 'Indigenous People',
]

export const EDUCATION_OPTIONS = [
  'Elementary Level', 'Elementary Graduate', 'High School Level', 'High School Graduate',
  'Senior High School Level', 'Senior High School Graduate', 'Vocational / Technical',
  'College Level', 'College Graduate', "Master's Level", "Master's Graduate", 'Doctoral Level', 'Doctoral Graduate',
]

export const EMPLOYMENT_STATUS_OPTIONS = ['Employed', 'Underemployed', 'Unemployed', 'Self-Employed']

export const SEX_OPTIONS = ['Male', 'Female']

export const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated', 'Divorced']

export const CDSP_SEED_SERVICES = ['Career Coaching', 'Pre-Employment Coaching', 'Labor Employment for Graduating Students']

export const emptyForm: Omit<CDSPApplicant, 'id'> = {
  beneficiaryServiceId: 0, serviceId: 0, assignedActivityId: null, barangayId: 0,
  lastName: '', firstName: '', middleName: '',
  sex: '', birthdate: '', age: 0, civilStatus: '',
  contactNumber: '', email: '',
  streetPurok: '', barangay: '', cityMunicipality: '', province: '', region: '',
  classification: [], classificationOther: '',
  highestEducation: '', schoolName: '', course: '', strand: '', yearLevel: '', yearGraduated: '',
  employmentStatus: '', currentOccupation: '',
  serviceAvailed: '', assignedActivity: '', assignmentHistory: [],
  dateApplicationReceived: '', receivedBy: '',
  status: 'Active', remarks: '',
  attachedDocuments: [],
}

// ─── Shared helpers (also used by main view) ──────────────────────────────────

export function getEffectiveStatus(applicant: CDSPApplicant, activities: { title: string; status: string }[]): 'Active' | 'Inactive' {
  if (!applicant.assignedActivity) return 'Inactive'
  const act = activities.find(a => a.title === applicant.assignedActivity)
  return (act && act.status !== 'Completed') ? 'Active' : 'Inactive'
}

export function StatusBadge({ status }: { status: 'Active' | 'Inactive' }) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
      status === 'Active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
    }`}>
      {status}
    </span>
  )
}

// Which Educational Background sub-fields apply to a given attainment level —
// shared by the Add/Edit form and the View panel so they never drift apart.
function eduFieldFlags(edu: string) {
  const isSHS   = edu === 'Senior High School Level' || edu === 'Senior High School Graduate'
  const isLevel = edu.endsWith('Level')
  return {
    showYearLevel:     isLevel && edu !== 'Doctoral Level' && edu !== "Master's Level",
    showStrand:        isSHS,
    showCourse:        ['College Level', 'College Graduate', "Master's Level", "Master's Graduate", 'Doctoral Level', 'Doctoral Graduate'].includes(edu),
    showYearGraduated: edu.toLowerCase().includes('graduate') || edu === 'Vocational / Technical',
  }
}

// ─── Section Divider ──────────────────────────────────────────────────────────

function SectionDivider({ numeral, title, gray }: { numeral: string; title: string; gray?: boolean }) {
  return (
    <div className={`flex items-center gap-2 mt-8 mb-4 rounded px-4 py-2.5 ${gray ? 'bg-gray-500' : 'bg-brand-blue'}`}>
      <span className="text-white text-xs font-bold">{numeral}.</span>
      <span className="text-white text-xs font-bold uppercase tracking-wide">{title}</span>
    </div>
  )
}

// ─── Doc Attach Section ───────────────────────────────────────────────────────

function formatFileSize(bytes: number) {
  if (bytes <= 0) return '0 Bytes'
  const units = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${units[i]}`
}

// Rendered as a sibling of the whole form, not nested inside it -- a
// `fixed inset-0` modal nested inside an ancestor with opacity/filter/
// transform stops being positioned relative to the viewport.
function DocPreviewModal({ doc, onClose }: { doc: CDSPSavedDocument; onClose: () => void }) {
  const src = doc.dataUrl || doc.url
  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <p className="text-sm text-gray-500 truncate">{doc.customName || doc.fileName}</p>
          <button type="button" onClick={onClose} aria-label="Close preview" className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-gray-50">
          {/(\.png|\.jpe?g|\.gif|\.webp)$/i.test(doc.fileName) ? (
            <div className="flex items-center justify-center h-full">
              <img src={src} alt={doc.fileName} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
            </div>
          ) : /\.pdf$/i.test(doc.fileName) ? (
            <iframe src={src} className="w-full h-full min-h-[600px] rounded-lg shadow-lg" title="PDF Preview" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <FileText size={64} className="mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">Preview not available</p>
              <a href={src} target="_blank" rel="noreferrer" className="text-sm text-brand-blue underline">Open / download file</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DocAttachSection({
  documents,
  onChange,
  onPreview,
}: {
  documents: CDSPSavedDocument[]
  onChange: (docs: CDSPSavedDocument[]) => void
  onPreview: (doc: CDSPSavedDocument) => void
}) {
  const [pendingName, setPendingName] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const customName = pendingName.trim() || file.name
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      onChange([...documents, {
        id: Date.now().toString() + Math.random().toString(36),
        customName,
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        // A blob: URL (not the data: dataUrl) so "View" works before the
        // record is saved — Chrome/Brave block opening data: URIs in a new
        // tab, which would otherwise show a blank "Untitled" tab.
        url: URL.createObjectURL(file),
        dataUrl,
      }])
    }
    reader.readAsDataURL(file)
    setPendingName('')
    e.target.value = ''
  }

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none'

  return (
    <div className="space-y-3">
      {documents.length > 0 && (
        <div className="space-y-2 mb-2">
          {documents.map((doc, i) => (
            <div key={doc.id} className="flex items-center gap-3 px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50">
              <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                <FileText size={14} className="text-brand-blue" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">{doc.customName || doc.fileName}</p>
                <p className="text-xs text-gray-400 truncate">{doc.fileName} · {doc.fileSize}</p>
              </div>
              {(doc.url || doc.dataUrl) && (
                <button type="button" onClick={() => onPreview(doc)} className="p-1.5 text-brand-blue hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0" title="Preview">
                  <Eye size={16} />
                </button>
              )}
              <button onClick={() => onChange(documents.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-400 ml-1 flex-shrink-0">
                <X size={14} />
              </button>
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

// ─── View Applicant Panel ─────────────────────────────────────────────────────

export function ViewApplicantPanel({ applicant, onClose }: { applicant: CDSPApplicant; onClose: () => void }) {
  const { activities: cdspActivities, services: svcList } = useCDSP()
  const cdspServices = svcList.length > 0 ? svcList.map(s => s.name) : CDSP_SEED_SERVICES
  const [previewDoc, setPreviewDoc] = useState<CDSPSavedDocument | null>(null)

  const fullName = `${applicant.lastName}, ${applicant.firstName}${applicant.middleName ? ' ' + applicant.middleName : ''}`.trim()

  const Field = ({ label, value }: { label: string; value: string | number | undefined }) => (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-gray-800 text-sm">{value || '—'}</p>
    </div>
  )

  return (
    <div className="h-full bg-brand-bg flex flex-col">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <Users size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-gray-800 font-semibold" style={{ fontSize: 'var(--text-lg)' }}>{fullName}</p>
            <p className="text-sm text-gray-400">{applicant.serviceAvailed}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={getEffectiveStatus(applicant, cdspActivities)} />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8">

          <SectionDivider numeral="I" title="Personal Information" />
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

          <SectionDivider numeral="II" title="Address" />
          <div className="grid grid-cols-2 gap-5">
            <Field label="Region" value={applicant.region} />
            <Field label="Province" value={applicant.province} />
            <Field label="City / Municipality" value={applicant.cityMunicipality} />
            <Field label="Barangay" value={applicant.barangay} />
            <div className="col-span-2"><Field label="Street / Purok #" value={applicant.streetPurok} /></div>
          </div>

          <SectionDivider numeral="III" title="Classification" />
          <div className="flex flex-wrap gap-2">
            {CLASSIFICATION_OPTIONS.map((opt) => (
              <span key={opt} className={`px-3 py-1 rounded-full text-xs border ${
                applicant.classification.includes(opt)
                  ? 'border-brand-blue bg-blue-50 text-brand-blue'
                  : 'border-gray-200 text-gray-300'
              }`}>{opt}</span>
            ))}
          </div>
          {applicant.classificationOther && (
            <p className="text-sm text-gray-600 mt-2">Other: {applicant.classificationOther}</p>
          )}

          <SectionDivider numeral="IV" title="Educational Background" />
          {(() => {
            const { showYearLevel, showStrand, showCourse, showYearGraduated } = eduFieldFlags(applicant.highestEducation)
            return (
              <div className="grid grid-cols-2 gap-5">
                <Field label="Highest Attainment" value={applicant.highestEducation} />
                <Field label="School / University" value={applicant.schoolName} />
                {showYearLevel && <Field label="Year Level" value={applicant.yearLevel} />}
                {showStrand && <Field label="Strand" value={applicant.strand} />}
                {showCourse && <Field label="Course / Program" value={applicant.course} />}
                {showYearGraduated && <Field label="Year Graduated" value={applicant.yearGraduated} />}
              </div>
            )
          })()}

          <SectionDivider numeral="V" title="Employment Status" />
          <div className="grid grid-cols-2 gap-5">
            <Field label="Employment Status" value={applicant.employmentStatus} />
            <Field label="Current Occupation" value={applicant.currentOccupation} />
          </div>

          <SectionDivider numeral="VI" title="CDSP Service Availed" />
          <div className="flex flex-wrap gap-2 mb-4">
            {cdspServices.map((svc) => (
              <span key={svc} className={`px-3 py-1 rounded-full text-xs border ${
                applicant.serviceAvailed === svc
                  ? 'border-brand-blue bg-blue-50 text-brand-blue'
                  : 'border-gray-200 text-gray-300'
              }`}>{svc}</span>
            ))}
          </div>

          <SectionDivider numeral="VII" title="For PESO Office Only" gray />
          <div className="grid grid-cols-2 gap-5">
            <Field label="Date Applied" value={applicant.dateApplicationReceived} />
            <Field label="Received By" value={applicant.receivedBy} />
            <Field label="Status" value={getEffectiveStatus(applicant, cdspActivities)} />
            <Field label="Remarks" value={applicant.remarks} />
          </div>

          {(applicant.attachedDocuments?.length ?? 0) > 0 && (
            <>
              <p className="text-xs text-gray-400 uppercase tracking-wide mt-12 mb-4">Attached Documents</p>
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
                    {(doc.url || doc.dataUrl) && (
                      <button type="button" onClick={() => setPreviewDoc(doc)} className="p-1.5 text-brand-blue hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0" title="Preview">
                        <Eye size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      </div>
      {previewDoc && <DocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
    </div>
  )
}

// ─── CDSP Profile Form ────────────────────────────────────────────────────────

export default function CDSPProfileForm({
  onClose,
  onSave,
  initialData,
  mode = 'add',
}: {
  onClose: () => void
  onSave: (data: Omit<CDSPApplicant, 'id'>) => void
  initialData?: Omit<CDSPApplicant, 'id'>
  mode?: 'add' | 'edit'
}) {
  const { services: svcList } = useCDSP()
  const cdspServices = svcList.length > 0 ? svcList.map(s => s.name) : CDSP_SEED_SERVICES

  const [formData, setFormData] = useState<Omit<CDSPApplicant, 'id'>>(initialData ?? emptyForm)
  const set = (updates: Partial<Omit<CDSPApplicant, 'id'>>) => setFormData((prev) => ({ ...prev, ...updates }))
  const [provinceId, setProvinceId] = useState<number | null>(null)
  const [cityId, setCityId] = useState<number | null>(null)
  const [previewDoc, setPreviewDoc] = useState<CDSPSavedDocument | null>(null)
  const { fieldErrors, clearFieldError, errCls, fieldMessage, runValidation } = useFieldValidation()

  const toggleClassification = (value: string) =>
    set({
      classification: formData.classification.includes(value)
        ? formData.classification.filter((v) => v !== value)
        : [...formData.classification, value],
    })

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

  const lastNameRef = useRef<HTMLInputElement>(null)
  const firstNameRef = useRef<HTMLInputElement>(null)
  const middleNameRef = useRef<HTMLInputElement>(null)
  const sexRef = useRef<HTMLSelectElement>(null)
  const birthdateWrapRef = useRef<HTMLDivElement>(null)
  const civilStatusRef = useRef<HTMLSelectElement>(null)
  const barangayWrapRef = useRef<HTMLDivElement>(null)
  const eduFieldRef = useRef<HTMLSelectElement>(null)
  const empStatusFieldRef = useRef<HTMLSelectElement>(null)
  const serviceAvailedWrapRef = useRef<HTMLDivElement>(null)

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

    if (!formData.highestEducation) {
      errors.push({
        field: 'highestEducation',
        message: 'Highest Educational Attainment is required (Section IV).',
        focus: () => eduFieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      })
    }

    if (!formData.employmentStatus) {
      errors.push({
        field: 'employmentStatus',
        message: 'Employment Status is required (Section V).',
        focus: () => empStatusFieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      })
    }

    if (!formData.serviceAvailed) {
      errors.push({
        field: 'serviceAvailed',
        message: 'Please select a CDSP Service Availed (Section VI).',
        focus: () => serviceAvailedWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      })
    }

    if (runValidation(errors)) return

    onSave(formData)
  }

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none placeholder:text-gray-400'
  const lbl = 'block text-xs uppercase tracking-wide text-gray-900 font-semibold mb-1'
  const sel = `${inp} bg-white`

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
            {mode === 'edit' ? 'Edit Applicant Profile' : 'Add New Applicant — CDSP'}
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
              <input ref={lastNameRef} className={`${inp} ${errCls('lastName')}`} value={formData.lastName} onChange={(e) => { set({ lastName: e.target.value }); clearFieldError('lastName') }} placeholder="Enter surname" />
              {fieldMessage('lastName') && <p className="text-red-500 text-xs mt-1">{fieldMessage('lastName')}</p>}
            </div>
            <div>
              <label className={lbl}>First Name <span className="text-red-500">*</span></label>
              <input ref={firstNameRef} className={`${inp} ${errCls('firstName')}`} value={formData.firstName} onChange={(e) => { set({ firstName: e.target.value }); clearFieldError('firstName') }} placeholder="Enter first name" />
              {fieldMessage('firstName') && <p className="text-red-500 text-xs mt-1">{fieldMessage('firstName')}</p>}
            </div>
            <div>
              <label className={lbl}>Middle Name <span className="text-gray-400 font-normal">(if applicable)</span></label>
              <input ref={middleNameRef} className={`${inp} ${errCls('middleName')}`} value={formData.middleName} onChange={(e) => { set({ middleName: e.target.value }); clearFieldError('middleName') }} placeholder="Enter middle name" />
              {fieldMessage('middleName') && <p className="text-red-500 text-xs mt-1">{fieldMessage('middleName')}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className={lbl}>Sex <span className="text-red-500">*</span></label>
              <select ref={sexRef} className={`${sel} ${errCls('sex')}`} value={formData.sex} onChange={(e) => { set({ sex: e.target.value as CDSPApplicant['sex'] }); clearFieldError('sex') }}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
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
              <input type="number" className={inp} value={formData.age || ''} onChange={(e) => set({ age: parseInt(e.target.value) || 0 })} placeholder="Enter age" min={0} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={lbl}>Civil Status <span className="text-red-500">*</span></label>
              <select ref={civilStatusRef} className={`${sel} ${errCls('civilStatus')}`} value={formData.civilStatus} onChange={(e) => { set({ civilStatus: e.target.value }); clearFieldError('civilStatus') }}>
                <option value="">Select</option>
                {CIVIL_STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              {fieldMessage('civilStatus') && <p className="text-red-500 text-xs mt-1">{fieldMessage('civilStatus')}</p>}
            </div>
            <div>
              <label className={lbl}>Contact Number</label>
              <input className={inp} value={formData.contactNumber} onChange={(e) => set({ contactNumber: e.target.value })} placeholder="Enter contact number" />
            </div>
            <div>
              <label className={lbl}>Email <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="email" className={inp} value={formData.email} onChange={(e) => set({ email: e.target.value })} placeholder="Enter email address" />
            </div>
          </div>

          <SectionDivider numeral="II" title="Address" />
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
              <input className={inp} value={formData.streetPurok} onChange={(e) => set({ streetPurok: e.target.value })} placeholder="Enter street or purok" />
            </div>
          </div>

          <SectionDivider numeral="III" title="Classification" />
          <div className="grid grid-cols-2 gap-3">
            {CLASSIFICATION_OPTIONS.filter((o) => o !== 'Other').map((opt) => (
              <CheckItem key={opt} label={opt} checked={formData.classification.includes(opt)} onChange={() => toggleClassification(opt)} />
            ))}
            <CheckItem label="Other" checked={formData.classification.includes('Other')} onChange={() => toggleClassification('Other')} />
          </div>
          {formData.classification.includes('Other') && (
            <div className="mt-3">
              <label className={lbl}>Please specify</label>
              <input className={inp} value={formData.classificationOther} onChange={(e) => set({ classificationOther: e.target.value })} placeholder="Enter classification" />
            </div>
          )}

          <SectionDivider numeral="IV" title="Educational Background" />
          {(() => {
            const edu = formData.highestEducation
            const { showYearLevel, showStrand, showCourse, showYearGraduated } = eduFieldFlags(edu)
            return (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={lbl}>Highest Educational Attainment <span className="text-red-500">*</span></label>
                  <select
                    ref={eduFieldRef}
                    className={`w-full px-3 py-2 border rounded-lg text-sm text-gray-900 focus:ring-2 focus:border-transparent outline-none bg-white border-gray-300 focus:ring-brand-blue ${errCls('highestEducation')}`}
                    value={edu}
                    onChange={(e) => { set({ highestEducation: e.target.value, course: '', strand: '', yearLevel: '', yearGraduated: '' }); clearFieldError('highestEducation') }}
                  >
                    <option value="">Select</option>
                    {EDUCATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {fieldMessage('highestEducation') && <p className="text-red-500 text-xs mt-1">{fieldMessage('highestEducation')}</p>}
                </div>
                <div className="col-span-2">
                  <label className={lbl}>School / University</label>
                  <input className={inp} value={formData.schoolName} onChange={(e) => set({ schoolName: e.target.value })} placeholder="Enter school name" />
                </div>
                {showYearLevel && (
                  <div>
                    <label className={lbl}>Year Level</label>
                    <input className={inp} value={formData.yearLevel} onChange={(e) => set({ yearLevel: e.target.value })} placeholder="e.g. Grade 1, 1st Year" />
                  </div>
                )}
                {showStrand && (
                  <div>
                    <label className={lbl}>Strand</label>
                    <input className={inp} value={formData.strand} onChange={(e) => set({ strand: e.target.value })} placeholder="Enter strand" />
                  </div>
                )}
                {showCourse && (
                  <div>
                    <label className={lbl}>Course / Program</label>
                    <input className={inp} value={formData.course} onChange={(e) => set({ course: e.target.value })} placeholder="Enter course or program" />
                  </div>
                )}
                {showYearGraduated && (
                  <div>
                    <label className={lbl}>Year Graduated</label>
                    <input className={inp} value={formData.yearGraduated} onChange={(e) => set({ yearGraduated: e.target.value })} placeholder="Enter year graduated" />
                  </div>
                )}
              </div>
            )
          })()}

          <SectionDivider numeral="V" title="Employment Status" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Employment Status <span className="text-red-500">*</span></label>
              <select
                ref={empStatusFieldRef}
                className={`w-full px-3 py-2 border rounded-lg text-sm text-gray-900 focus:ring-2 focus:border-transparent outline-none bg-white border-gray-300 focus:ring-brand-blue ${errCls('employmentStatus')}`}
                value={formData.employmentStatus}
                onChange={(e) => { set({ employmentStatus: e.target.value }); clearFieldError('employmentStatus') }}
              >
                <option value="">Select</option>
                {EMPLOYMENT_STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              {fieldMessage('employmentStatus') && <p className="text-red-500 text-xs mt-1">{fieldMessage('employmentStatus')}</p>}
            </div>
            <div>
              <label className={lbl}>Current Occupation</label>
              <input className={inp} value={formData.currentOccupation} onChange={(e) => set({ currentOccupation: e.target.value })} placeholder="Enter current occupation" />
            </div>
          </div>

          <SectionDivider numeral="VI" title="CDSP Service Availed" />
          <div ref={serviceAvailedWrapRef} className="space-y-2 mb-1">
            {cdspServices.map((svc) => (
              <label
                key={svc}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${formData.serviceAvailed === svc ? 'border-brand-blue bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${formData.serviceAvailed === svc ? 'border-brand-blue' : 'border-gray-300'}`}>
                  {formData.serviceAvailed === svc && <div className="w-2 h-2 rounded-full bg-brand-blue" />}
                </div>
                <input type="radio" className="hidden" checked={formData.serviceAvailed === svc} onChange={() => { set({ serviceAvailed: svc, assignedActivity: '' }); clearFieldError('serviceAvailed') }} />
                <span className={`text-sm ${formData.serviceAvailed === svc ? 'text-brand-blue' : 'text-gray-700'}`}>{svc}</span>
              </label>
            ))}
          </div>
          {fieldMessage('serviceAvailed') && <p className="text-red-500 text-xs mb-4">{fieldMessage('serviceAvailed')}</p>}

          <SectionDivider numeral="VII" title="For PESO Office Only" gray />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Date Applied</label>
              <DatePicker className={inp} value={formData.dateApplicationReceived} onChange={(value) => set({ dateApplicationReceived: value })} />
            </div>
            <div>
              <label className={lbl}>Received By</label>
              <input className={inp} value={formData.receivedBy} onChange={(e) => set({ receivedBy: e.target.value })} placeholder="Enter staff name" />
            </div>
            <div>
              <label className={lbl}>Remarks</label>
              <input className={inp} value={formData.remarks} onChange={(e) => set({ remarks: e.target.value })} placeholder="Enter remarks" />
            </div>
          </div>
          <div className="mt-6">
            <label className={lbl}>Attached Documents</label>
            <p className="text-xs text-gray-400 mb-3">Attach supporting documents (e.g. resume, certificate). This section is optional / if applicable.</p>
            <DocAttachSection documents={formData.attachedDocuments} onChange={(docs) => set({ attachedDocuments: docs })} onPreview={setPreviewDoc} />
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">Cancel</button>
            <button onClick={handleSave} className="px-8 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark text-sm">
              {mode === 'edit' ? 'Save Changes' : 'Save Profile'}
            </button>
          </div>

        </div>
      </div>
      {previewDoc && <DocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
    </div>
  )
}
