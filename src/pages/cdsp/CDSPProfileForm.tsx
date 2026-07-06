import { useState, useRef } from 'react'
import { X, Users, FileText, Upload } from 'lucide-react'
import { useCDSP } from '../../contexts/CDSPContext'
import type { CDSPApplicant } from '../../contexts/CDSPContext'
import SearchableSelect from '../../components/SearchableSelect'
import { searchProvinces, searchCities, searchBarangaysByCity } from '../../services/locationService'
import DatePicker from '../../components/DatePicker'

// ─── Constants ────────────────────────────────────────────────────────────────

export const CLASSIFICATION_OPTIONS = [
  'Student', 'Fresh Graduate', 'Employed', 'Underemployed', 'Unemployed',
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
  employmentStatus: '', currentOccupation: '', employerName: '', employmentType: '', monthlyIncome: '',
  serviceAvailed: '', assignedActivity: '', assignmentHistory: [],
  careerGoal: '', coachingType: '', careerAssessmentResult: '',
  targetJob: '', industriesOfInterest: [], preEmploymentRequirements: [],
  school: '', courseProgram: '', yearLevel: '', expectedGraduation: '',
  applicantSignature: '', dateSignature: '',
  dateApplicationReceived: '', receivedBy: '', counselorName: '',
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

function DocAttachSection({
  documents,
  onChange,
}: {
  documents: { name: string; file: File; url: string }[]
  onChange: (docs: { name: string; file: File; url: string }[]) => void
}) {
  const [pendingName, setPendingName] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const name = pendingName.trim() || file.name
    onChange([...documents, { name, file, url: URL.createObjectURL(file) }])
    setPendingName('')
    e.target.value = ''
  }

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none'

  return (
    <div className="space-y-3">
      {documents.length > 0 && (
        <div className="space-y-2 mb-2">
          {documents.map((doc, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50">
              <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                <FileText size={14} className="text-brand-blue" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">{doc.name}</p>
                <p className="text-xs text-gray-400 truncate">{doc.file.name}</p>
              </div>
              <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs text-brand-blue hover:underline">View</a>
              <button onClick={() => onChange(documents.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-400 ml-1">
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
          <div className="grid grid-cols-2 gap-5">
            <Field label="Highest Attainment" value={applicant.highestEducation} />
            <Field label="Course / Program" value={applicant.course} />
          </div>

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

          {(applicant.attachedDocuments?.length ?? 0) > 0 && (
            <>
              <SectionDivider numeral="VI" title="Attached Documents" />
              <div className="space-y-2">
                {applicant.attachedDocuments.map((doc, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <FileText size={14} className="text-brand-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">{doc.name}</p>
                      <p className="text-xs text-gray-400 truncate">{doc.file.name}</p>
                    </div>
                    <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs text-brand-blue hover:underline whitespace-nowrap">View</a>
                  </div>
                ))}
              </div>
            </>
          )}

          <SectionDivider numeral="VII" title="For PESO Office Only" gray />
          <div className="grid grid-cols-2 gap-5">
            <Field label="Date Applied" value={applicant.dateApplicationReceived} />
            <Field label="Received By" value={applicant.receivedBy} />
            <Field label="Status" value={getEffectiveStatus(applicant, cdspActivities)} />
            <Field label="Remarks" value={applicant.remarks} />
          </div>

        </div>
      </div>
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

  const toggleArr = (field: 'classification' | 'industriesOfInterest' | 'preEmploymentRequirements', value: string) => {
    const arr = formData[field] as string[]
    set({ [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] })
  }

  const handleBirthdate = (date: string) => {
    const age = date ? new Date().getFullYear() - new Date(date).getFullYear() : 0
    set({ birthdate: date, age })
  }

  const [showFieldErrors, setShowFieldErrors] = useState(false)
  const eduError = showFieldErrors && !formData.highestEducation
  const empStatusError = showFieldErrors && !formData.employmentStatus
  const eduFieldRef = useRef<HTMLSelectElement>(null)
  const empStatusFieldRef = useRef<HTMLSelectElement>(null)

  const handleSave = () => {
    if (!formData.lastName || !formData.firstName) { alert('Please fill in Last Name and First Name.'); return }
    if (!formData.highestEducation) {
      setShowFieldErrors(true)
      eduFieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      eduFieldRef.current?.focus()
      return
    }
    if (!formData.employmentStatus) {
      setShowFieldErrors(true)
      empStatusFieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      empStatusFieldRef.current?.focus()
      return
    }
    if (!formData.serviceAvailed) { alert('Please select a CDSP Service Availed (Section VI).'); return }
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
              <input className={inp} value={formData.lastName} onChange={(e) => set({ lastName: e.target.value })} placeholder="Enter surname" />
            </div>
            <div>
              <label className={lbl}>First Name <span className="text-red-500">*</span></label>
              <input className={inp} value={formData.firstName} onChange={(e) => set({ firstName: e.target.value })} placeholder="Enter first name" />
            </div>
            <div>
              <label className={lbl}>Middle Name <span className="text-gray-400 font-normal">(if applicable)</span></label>
              <input className={inp} value={formData.middleName} onChange={(e) => set({ middleName: e.target.value })} placeholder="Enter middle name" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className={lbl}>Sex</label>
              <select className={sel} value={formData.sex} onChange={(e) => set({ sex: e.target.value as CDSPApplicant['sex'] })}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Birthdate</label>
              <DatePicker className={inp} value={formData.birthdate} onChange={handleBirthdate} />
            </div>
            <div>
              <label className={lbl}>Age</label>
              <input type="number" className={inp} value={formData.age || ''} onChange={(e) => set({ age: parseInt(e.target.value) || 0 })} placeholder="Enter age" min={0} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={lbl}>Civil Status</label>
              <select className={sel} value={formData.civilStatus} onChange={(e) => set({ civilStatus: e.target.value })}>
                <option value="">Select</option>
                {CIVIL_STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
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
            <div>
              <label className={lbl}>Barangay</label>
              <SearchableSelect
                value={formData.barangay}
                placeholder={cityId ? 'Search barangay...' : 'Select city first'}
                disabled={!cityId}
                refetchKey={cityId ?? ''}
                fetchOptions={(s) => searchBarangaysByCity(cityId ?? 0, s)}
                onSelect={(opt) => set({ barangay: opt.name, barangayId: opt.id })}
              />
            </div>
            <div>
              <label className={lbl}>Street / Purok #</label>
              <input className={inp} value={formData.streetPurok} onChange={(e) => set({ streetPurok: e.target.value })} placeholder="Enter street or purok" />
            </div>
          </div>

          <SectionDivider numeral="III" title="Classification" />
          <div className="grid grid-cols-2 gap-3">
            {CLASSIFICATION_OPTIONS.filter((o) => o !== 'Other').map((opt) => (
              <CheckItem key={opt} label={opt} checked={formData.classification.includes(opt)} onChange={() => toggleArr('classification', opt)} />
            ))}
            <CheckItem label="Other" checked={formData.classification.includes('Other')} onChange={() => toggleArr('classification', 'Other')} />
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
            const isSHS             = edu === 'Senior High School Level' || edu === 'Senior High School Graduate'
            const isLevel           = edu.endsWith('Level')
            const showYearLevel     = isLevel && edu !== 'Doctoral Level' && edu !== "Master's Level"
            const showStrand        = isSHS
            const showCourse        = ['College Level','College Graduate',"Master's Level","Master's Graduate",'Doctoral Level','Doctoral Graduate'].includes(edu)
            const showYearGraduated = edu.toLowerCase().includes('graduate') || edu === 'Vocational / Technical'
            return (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={lbl}>Highest Educational Attainment <span className="text-red-500">*</span></label>
                  <select
                    ref={eduFieldRef}
                    className={`w-full px-3 py-2 border rounded-lg text-sm text-gray-900 focus:ring-2 focus:border-transparent outline-none bg-white ${
                      eduError ? 'border-red-500 ring-2 ring-red-200 focus:ring-red-300' : 'border-gray-300 focus:ring-brand-blue'
                    }`}
                    value={edu}
                    onChange={(e) => { set({ highestEducation: e.target.value, course: '', strand: '', yearLevel: '', yearGraduated: '' }); setShowFieldErrors(false) }}
                  >
                    <option value="">Select</option>
                    {EDUCATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {eduError && <p className="text-red-500 text-xs mt-1">This field is required.</p>}
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
                className={`w-full px-3 py-2 border rounded-lg text-sm text-gray-900 focus:ring-2 focus:border-transparent outline-none bg-white ${
                  empStatusError ? 'border-red-500 ring-2 ring-red-200 focus:ring-red-300' : 'border-gray-300 focus:ring-brand-blue'
                }`}
                value={formData.employmentStatus}
                onChange={(e) => { set({ employmentStatus: e.target.value }); setShowFieldErrors(false) }}
              >
                <option value="">Select</option>
                {EMPLOYMENT_STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              {empStatusError && <p className="text-red-500 text-xs mt-1">This field is required.</p>}
            </div>
            <div>
              <label className={lbl}>Current Occupation</label>
              <input className={inp} value={formData.currentOccupation} onChange={(e) => set({ currentOccupation: e.target.value })} placeholder="Enter current occupation" />
            </div>
          </div>

          <SectionDivider numeral="VI" title="CDSP Service Availed" />
          <div className="space-y-2 mb-4">
            {cdspServices.map((svc) => (
              <label
                key={svc}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${formData.serviceAvailed === svc ? 'border-brand-blue bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${formData.serviceAvailed === svc ? 'border-brand-blue' : 'border-gray-300'}`}>
                  {formData.serviceAvailed === svc && <div className="w-2 h-2 rounded-full bg-brand-blue" />}
                </div>
                <input type="radio" className="hidden" checked={formData.serviceAvailed === svc} onChange={() => set({ serviceAvailed: svc, assignedActivity: '' })} />
                <span className={`text-sm ${formData.serviceAvailed === svc ? 'text-brand-blue' : 'text-gray-700'}`}>{svc}</span>
              </label>
            ))}
          </div>

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
            <DocAttachSection documents={formData.attachedDocuments} onChange={(docs) => set({ attachedDocuments: docs })} />
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
