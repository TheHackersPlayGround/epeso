import { useState } from 'react'
import Swal from 'sweetalert2'
import {
  ArrowLeft, Search, Plus, X, Users,
  ChevronDown, AlertCircle, CheckCircle, Upload, Download, MoreHorizontal,
  FileText,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { useCDSP } from '../../contexts/CDSPContext'
import type { CDSPApplicant } from '../../contexts/CDSPContext'
import { useProgramActivities } from '../../contexts/ProgramActivitiesContext'
import type { ProgramActivity } from '../../contexts/ProgramActivitiesContext'
import AddressFields from '../../components/AddressFields'

interface CDSPViewProps {
  onBack: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────


const CLASSIFICATION_OPTIONS = [
  'Student', 'Fresh Graduate', 'Employed', 'Underemployed', 'Unemployed',
  'Out of School Youth (OSY)', 'Person with Disability (PWD)', 'Solo Parent',
  'Women', 'Senior Citizen', 'Returning OFW', 'Other',
]

const EDUCATION_OPTIONS = [
  'Elementary Level', 'Elementary Graduate', 'High School Level', 'High School Graduate',
  'Senior High School Level', 'Senior High School Graduate', 'Vocational / Technical',
  'College Level', 'College Level (2nd Year)', 'College Level (3rd Year)',
  'College Level (4th Year)', 'College Graduate', "Master's Level", "Master's Graduate", 'Doctoral',
]

const EMPLOYMENT_STATUS_OPTIONS = ['Employed', 'Underemployed', 'Unemployed', 'Self-Employed', 'Student', 'Retired']

const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated', 'Annulled']


const emptyForm: Omit<CDSPApplicant, 'id'> = {
  lastName: '', firstName: '', middleName: '',
  sex: '', birthdate: '', age: 0, civilStatus: '',
  contactNumber: '', email: '',
  streetPurok: '', barangay: '', cityMunicipality: '', province: '', region: '',
  classification: [], classificationOther: '',
  highestEducation: '', schoolName: '', course: '', yearGraduated: '',
  employmentStatus: '', currentOccupation: '', employerName: '', employmentType: '', monthlyIncome: '',
  serviceAvailed: '', assignedActivity: '',
  careerGoal: '', coachingType: '', careerAssessmentResult: '',
  targetJob: '', industriesOfInterest: [], preEmploymentRequirements: [],
  school: '', courseProgram: '', yearLevel: '', expectedGraduation: '',
  applicantSignature: '', dateSignature: '',
  dateApplicationReceived: '', receivedBy: '', counselorName: '',
  status: 'Active', remarks: '',
  attachedDocuments: [],
}

// ─── Activity status badge ─────────────────────────────────────────────────────

function activityStatusBadge(status: string) {
  if (status === 'Ongoing')   return 'bg-green-100 text-green-700'
  if (status === 'Completed') return 'bg-blue-100 text-blue-700'
  return 'bg-yellow-100 text-yellow-700'
}

// ─── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'Active' | 'Inactive' }) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
      status === 'Active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
    }`}>
      {status}
    </span>
  )
}

function getEffectiveStatus(applicant: CDSPApplicant, activities: { title: string; status: string }[]): 'Active' | 'Inactive' {
  if (!applicant.assignedActivity) return 'Inactive'
  const act = activities.find(a => a.title === applicant.assignedActivity)
  return (act && act.status !== 'Completed') ? 'Active' : 'Inactive'
}

// ─── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  isOpen, type, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel',
}: {
  isOpen: boolean
  type: 'confirm' | 'success' | 'error'
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
}) {
  if (!isOpen) return null
  const Icon = type === 'success' ? CheckCircle : AlertCircle
  const iconColor = type === 'success' ? 'text-green-500' : type === 'error' ? 'text-red-500' : 'text-brand-blue'
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 text-center">
        <Icon size={56} className={`mx-auto mb-4 ${iconColor}`} />
        <p className="text-xl text-gray-800 mb-3 font-semibold">{title}</p>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          {type === 'confirm' ? (
            <>
              <button onClick={onCancel} className="px-6 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">{cancelText}</button>
              <button onClick={onConfirm} className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark">{confirmText}</button>
            </>
          ) : (
            <button onClick={onConfirm} className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark">OK</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Section divider ───────────────────────────────────────────────────────────

function SectionDivider({ numeral, title, gray }: { numeral: string; title: string; gray?: boolean }) {
  return (
    <div className={`flex items-center gap-2 mt-8 mb-4 rounded px-4 py-2.5 ${gray ? 'bg-gray-500' : 'bg-brand-blue'}`}>
      <span className="text-white text-xs font-bold">{numeral}.</span>
      <span className="text-white text-xs font-bold uppercase tracking-wide">{title}</span>
    </div>
  )
}

// ─── View Applicant Panel ──────────────────────────────────────────────────────

const CDSP_SEED_SERVICES = ['Career Coaching', 'Pre-Employment Coaching', 'Labor Employment for Graduating Students']

function ViewApplicantPanel({ applicant, onClose }: { applicant: CDSPApplicant; onClose: () => void }) {
  const { activities } = useProgramActivities()
  const cdspActivities = activities.filter(a => a.program === 'CDSP' || CDSP_SEED_SERVICES.includes(a.service))
  const cdspServices = Array.from(new Set(cdspActivities.map(a => a.service)))

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
          {(() => {
            const act = applicant.assignedActivity
              ? cdspActivities.find(a => a.title === applicant.assignedActivity)
              : null
            const statusColor =
              act?.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
              act?.status === 'Ongoing'   ? 'bg-green-100 text-green-700' :
              'bg-yellow-100 text-yellow-700'
            return (
              <div className="mb-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Assigned Activity</p>
                {applicant.assignedActivity ? (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-gray-800 font-medium">{applicant.assignedActivity}</span>
                      {act && (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>
                          {act.status}
                        </span>
                      )}
                    </div>
                    {act?.status === 'Completed' && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-100 px-3 py-1.5 rounded-lg w-fit">
                        <CheckCircle size={12} />
                        <span>Service completed and recorded in Section VI</span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-800 text-sm">—</p>
                )}
              </div>
            )
          })()}

          {(applicant.attachedDocuments?.length ?? 0) > 0 && (
            <>
              <SectionDivider numeral="VII" title="Attached Documents" />
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

          <SectionDivider numeral="VIII" title="For PESO Office Only" gray />
          <div className="grid grid-cols-2 gap-5">
            <Field label="Date Received" value={applicant.dateApplicationReceived} />
            <Field label="Received By" value={applicant.receivedBy} />
            <Field label="Counselor" value={applicant.counselorName} />
            <Field label="Status" value={getEffectiveStatus(applicant, cdspActivities)} />
            <Field label="Remarks" value={applicant.remarks} />
          </div>

        </div>
      </div>
    </div>
  )
}

// ─── Doc Attach Section ────────────────────────────────────────────────────────

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

// ─── Add / Edit Profile Form ───────────────────────────────────────────────────

function AddProfileForm({
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
  const { activities } = useProgramActivities()
  const cdspServices = Array.from(new Set(
    activities
      .filter(a => a.program === 'CDSP' || CDSP_SEED_SERVICES.includes(a.service))
      .map(a => a.service)
  ))

  const [formData, setFormData] = useState<Omit<CDSPApplicant, 'id'>>(initialData ?? emptyForm)
  const set = (updates: Partial<Omit<CDSPApplicant, 'id'>>) => setFormData((prev) => ({ ...prev, ...updates }))

  const toggleArr = (field: 'classification' | 'industriesOfInterest' | 'preEmploymentRequirements', value: string) => {
    const arr = formData[field] as string[]
    set({ [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] })
  }

  const handleBirthdate = (date: string) => {
    const age = date ? new Date().getFullYear() - new Date(date).getFullYear() : 0
    set({ birthdate: date, age })
  }

  const handleSave = () => {
    if (!formData.lastName || !formData.firstName) { alert('Please fill in Last Name and First Name.'); return }
    if (!formData.serviceAvailed) { alert('Please select a CDSP Service Availed (Section VI).'); return }
    onSave(formData)
  }

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none placeholder:text-gray-800'
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

          {/* I. Personal Information */}
          <SectionDivider numeral="I" title="Personal Information" />
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className={lbl}>Last Name <span className="text-red-500">*</span></label>
              <input className={inp} value={formData.lastName} onChange={(e) => set({ lastName: e.target.value })} placeholder="Dela Cruz" />
            </div>
            <div>
              <label className={lbl}>First Name <span className="text-red-500">*</span></label>
              <input className={inp} value={formData.firstName} onChange={(e) => set({ firstName: e.target.value })} placeholder="Juan" />
            </div>
            <div>
              <label className={lbl}>Middle Name <span className="text-gray-400 font-normal">(if applicable)</span></label>
              <input className={inp} value={formData.middleName} onChange={(e) => set({ middleName: e.target.value })} placeholder="M." />
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
              <input type="date" className={inp} value={formData.birthdate} onChange={(e) => handleBirthdate(e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Age</label>
              <input type="number" className={inp} value={formData.age || ''} onChange={(e) => set({ age: parseInt(e.target.value) || 0 })} placeholder="0" min={0} />
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
              <input className={inp} value={formData.contactNumber} onChange={(e) => set({ contactNumber: e.target.value })} placeholder="09XXXXXXXXX" />
            </div>
            <div>
              <label className={lbl}>Email <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="email" className={inp} value={formData.email} onChange={(e) => set({ email: e.target.value })} placeholder="example@email.com" />
            </div>
          </div>

          {/* II. Address */}
          <SectionDivider numeral="II" title="Address" />
          <AddressFields
            value={{ region: formData.region, province: formData.province, cityMunicipality: formData.cityMunicipality, barangay: formData.barangay, streetPurok: formData.streetPurok }}
            onChange={(addr) => set(addr)}
            inputClass={inp}
            labelClass={lbl}
          />

          {/* III. Classification */}
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
              <input className={inp} value={formData.classificationOther} onChange={(e) => set({ classificationOther: e.target.value })} placeholder="Specify classification" />
            </div>
          )}

          {/* IV. Educational Background */}
          <SectionDivider numeral="IV" title="Educational Background" />
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={lbl}>Highest Educational Attainment</label>
              <select className={sel} value={formData.highestEducation} onChange={(e) => set({ highestEducation: e.target.value })}>
                <option value="">Select</option>
                {EDUCATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Course / Program</label>
              <input className={inp} value={formData.course} onChange={(e) => set({ course: e.target.value })} placeholder="e.g. BS Information Technology" />
            </div>
            <div>
              <label className={lbl}>Year Graduated</label>
              <input className={inp} value={formData.yearGraduated} onChange={(e) => set({ yearGraduated: e.target.value })} placeholder="e.g. 2024" />
            </div>
          </div>

          {/* V. Employment Status */}
          <SectionDivider numeral="V" title="Employment Status" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Employment Status</label>
              <select className={sel} value={formData.employmentStatus} onChange={(e) => set({ employmentStatus: e.target.value })}>
                <option value="">Select</option>
                {EMPLOYMENT_STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Current Occupation</label>
              <input className={inp} value={formData.currentOccupation} onChange={(e) => set({ currentOccupation: e.target.value })} placeholder="e.g. Sales Associate" />
            </div>
          </div>

          {/* VI. CDSP Service Availed */}
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

          {/* VII. Attached Documents */}
          <SectionDivider numeral="VII" title="Attached Documents" />
          <p className="text-xs text-gray-400 -mt-1 mb-3">Attach supporting documents (e.g. resume, certificate). This section is optional / if applicable.</p>
          <DocAttachSection documents={formData.attachedDocuments} onChange={(docs) => set({ attachedDocuments: docs })} />

          {/* VIII. PESO Office Only */}
          <SectionDivider numeral="VIII" title="For PESO Office Only" gray />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Date Received</label>
              <input type="date" className={inp} value={formData.dateApplicationReceived} onChange={(e) => set({ dateApplicationReceived: e.target.value })} />
            </div>
            <div>
              <label className={lbl}>Received By</label>
              <input className={inp} value={formData.receivedBy} onChange={(e) => set({ receivedBy: e.target.value })} placeholder="Staff name" />
            </div>
            <div>
              <label className={lbl}>Counselor</label>
              <input className={inp} value={formData.counselorName} onChange={(e) => set({ counselorName: e.target.value })} placeholder="Counselor name" />
            </div>
            <div>
              <label className={lbl}>Remarks</label>
              <input className={inp} value={formData.remarks} onChange={(e) => set({ remarks: e.target.value })} placeholder="Optional" />
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

// ─── Main CDSPView ─────────────────────────────────────────────────────────────

export default function CDSPView({ onBack }: CDSPViewProps) {
  const { applicants, setApplicants } = useCDSP()
  const { activities } = useProgramActivities()
  const cdspActivities = activities.filter(a => a.program === 'CDSP' || CDSP_SEED_SERVICES.includes(a.service))
  const cdspServices = Array.from(new Set(cdspActivities.map(a => a.service)))

  const [searchQuery, setSearchQuery] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})

  const availableFilters = [
    { id: 'service', label: 'Service', options: cdspServices },
    { id: 'status', label: 'Status', options: ['Active', 'Inactive'] },
    { id: 'sex', label: 'Sex', options: ['Male', 'Female'] },
    { id: 'civilStatus', label: 'Civil Status', options: CIVIL_STATUS_OPTIONS },
  ]

  const handleAddFilter = (filterId: string) => {
    if (!activeFilters.includes(filterId)) {
      const filter = availableFilters.find((f) => f.id === filterId)
      setActiveFilters((prev) => [...prev, filterId])
      setFilterValues((prev) => ({ ...prev, [filterId]: filter?.options[0] ?? '' }))
    }
    setIsFilterOpen(false)
  }
  const handleRemoveFilter = (filterId: string) => {
    setActiveFilters((prev) => prev.filter((id) => id !== filterId))
    setFilterValues((prev) => { const n = { ...prev }; delete n[filterId]; return n })
  }
  const handleFilterValueChange = (filterId: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [filterId]: value }))
  }

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingApplicant, setEditingApplicant] = useState<CDSPApplicant | null>(null)
  const [viewingApplicant, setViewingApplicant] = useState<CDSPApplicant | null>(null)
  const [assignTarget, setAssignTarget] = useState<CDSPApplicant | null>(null)
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importFileType, setImportFileType] = useState<'excel' | 'csv'>('excel')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<{ lastName: string; firstName: string; service: string; status: string; valid: boolean }[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number | null }>({ open: false, id: null })
  const [successModal, setSuccessModal] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<ProgramActivity | null>(null)
  const [viewingAssignedFor, setViewingAssignedFor] = useState<CDSPApplicant | null>(null)

  const filtered = applicants.filter((a) => {
    const fullName = `${a.lastName} ${a.firstName} ${a.middleName}`.toLowerCase()
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      a.barangay.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.assignedActivity.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilters = activeFilters.every((filterId) => {
      const val = filterValues[filterId]
      if (!val) return true
      if (filterId === 'service') return a.serviceAvailed === val
      if (filterId === 'status') return getEffectiveStatus(a, cdspActivities) === val
      if (filterId === 'sex') return a.sex === val
      if (filterId === 'civilStatus') return a.civilStatus === val
      return true
    })
    return matchesSearch && matchesFilters
  })

  const handleAddSave = (data: Omit<CDSPApplicant, 'id'>) => {
    setApplicants((prev) => [...prev, { ...data, id: Date.now() }])
    setIsFormOpen(false)
    setSuccessModal({ open: true, message: 'Applicant profile has been added successfully.' })
  }
  const handleEditSave = (data: Omit<CDSPApplicant, 'id'>) => {
    if (!editingApplicant) return
    setApplicants((prev) => prev.map((a) => (a.id === editingApplicant.id ? { ...data, id: a.id } : a)))
    setEditingApplicant(null)
    setSuccessModal({ open: true, message: 'Applicant profile has been updated successfully.' })
  }
  const handleDelete = (id: number) => {
    setApplicants((prev) => prev.filter((a) => a.id !== id))
    setDeleteConfirm({ open: false, id: null })
    setSuccessModal({ open: true, message: 'Applicant profile has been deleted.' })
  }
  const handleAssign = (activity: ProgramActivity) => {
    if (!assignTarget) return
    setApplicants((prev) => prev.map((a) =>
      a.id === assignTarget.id ? { ...a, assignedActivity: activity.title, status: 'Active' as const } : a
    ))
    setAssignTarget(null)
    setSelectedActivity(null)
    Swal.fire({
      icon: 'success',
      title: 'Success',
      text: `Assigned to "${activity.title}" successfully.`,
      confirmButtonText: 'OK',
      confirmButtonColor: '#0077BE',
    })
  }
  const handleUnassign = (targetId?: number) => {
    const id = targetId ?? assignTarget?.id
    if (!id) return
    setApplicants((prev) => prev.map((a) =>
      a.id === id ? { ...a, assignedActivity: '', status: 'Inactive' as const } : a
    ))
    setAssignTarget(null)
    setSelectedActivity(null)
    setViewingAssignedFor(null)
    Swal.fire({
      icon: 'success',
      title: 'Removed',
      text: 'Assigned activity has been removed.',
      confirmButtonText: 'OK',
      confirmButtonColor: '#0077BE',
    })
  }

  const exportRows = (rows: CDSPApplicant[]) => rows.map((a) => ({
    'Last Name': a.lastName, 'First Name': a.firstName, 'Middle Name': a.middleName,
    'Sex': a.sex, 'Birthdate': a.birthdate, 'Age': a.age, 'Civil Status': a.civilStatus,
    'Contact Number': a.contactNumber, 'Email': a.email,
    'Street / Purok #': a.streetPurok, 'Barangay': a.barangay,
    'City / Municipality': a.cityMunicipality, 'Province': a.province, 'Region': a.region,
    'Classification': a.classification.join(', '),
    'Highest Education': a.highestEducation, 'Course': a.course,
    'Employment Status': a.employmentStatus, 'Occupation': a.currentOccupation,
    'Service Availed': a.serviceAvailed, 'Assigned Activity': a.assignedActivity,
    'Career Goal': a.careerGoal, 'Target Job': a.targetJob,
    'Counselor': a.counselorName, 'Status': a.status, 'Remarks': a.remarks,
    'Date Received': a.dateApplicationReceived, 'Received By': a.receivedBy,
  }))

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows(filtered))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'CDSP Applicants')
    XLSX.writeFile(wb, `CDSP_Applicants_${new Date().toISOString().split('T')[0]}.xlsx`)
    setIsExportDropdownOpen(false)
  }
  const exportToCSV = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows(filtered))
    const csv = XLSX.utils.sheet_to_csv(ws)
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    link.download = `CDSP_Applicants_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    setIsExportDropdownOpen(false)
  }
  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      'Last Name': 'Dela Cruz', 'First Name': 'Juan', 'Middle Name': 'M.',
      'Sex': 'Male', 'Birthdate': '2002-05-14', 'Age': 23, 'Civil Status': 'Single',
      'Contact Number': '09171234567', 'Email': 'juan@gmail.com',
      'Street / Purok #': 'Purok 3', 'Barangay': 'Poblacion',
      'City / Municipality': 'Tangub City', 'Province': 'Misamis Occidental', 'Region': 'Region X – Northern Mindanao',
      'Classification': 'Fresh Graduate', 'Highest Education': 'College Graduate', 'Course': 'BS IT',
      'Employment Status': 'Unemployed', 'Occupation': '',
      'Service Availed': 'Career Coaching', 'Assigned Activity': 'Career Coaching Batch 1 – March 2026',
      'Career Goal': 'Software Developer', 'Target Job': '',
      'Counselor': 'Engr. Lito Reyes', 'Status': 'Active', 'Remarks': '',
      'Date Received': '2026-03-10', 'Received By': 'Admin',
    }])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'CDSP Template')
    if (importFileType === 'excel') {
      XLSX.writeFile(wb, 'CDSP_Applicants_Template.xlsx')
    } else {
      const link = document.createElement('a')
      link.href = URL.createObjectURL(new Blob([XLSX.utils.sheet_to_csv(ws)], { type: 'text/csv;charset=utf-8;' }))
      link.download = 'CDSP_Applicants_Template.csv'
      link.click()
    }
  }
  const handleFileUpload = (file: File) => {
    setUploadedFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary' })
        const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])
        setImportPreview(rows.map((r) => ({
          lastName: r['Last Name'] || '', firstName: r['First Name'] || '',
          service: r['Service Availed'] || '', status: r['Status'] || '',
          valid: !!(r['Last Name'] && r['First Name']),
        })))
      } catch { alert('Error reading file. Please use the template format.') }
    }
    reader.readAsBinaryString(file)
  }
  const handleImport = () => {
    const valid = importPreview.filter((r) => r.valid)
    setApplicants((prev) => [...prev, ...valid.map((row) => ({
      ...emptyForm,
      id: Date.now() + Math.random(),
      lastName: row.lastName, firstName: row.firstName,
      serviceAvailed: cdspServices.includes(row.service) ? row.service : '',
      status: (['Active', 'Inactive'].includes(row.status) ? row.status : 'Active') as CDSPApplicant['status'],
    }))])
    setIsImportModalOpen(false); setUploadedFile(null); setImportPreview([])
    alert(`Successfully imported ${valid.length} applicant(s)!`)
  }

  // ─── Full-page sub-views ────────────────────────────────────────────────────

  if (isFormOpen) return <AddProfileForm onClose={() => setIsFormOpen(false)} onSave={handleAddSave} mode="add" />
  if (editingApplicant) {
    const { id: _id, ...rest } = editingApplicant
    return <AddProfileForm onClose={() => setEditingApplicant(null)} onSave={handleEditSave} initialData={rest} mode="edit" />
  }
  if (viewingApplicant) return <ViewApplicantPanel applicant={viewingApplicant} onClose={() => setViewingApplicant(null)} />

  // ─── Main list view ─────────────────────────────────────────────────────────

  return (
    <>
<ConfirmModal
        isOpen={deleteConfirm.open} type="confirm"
        title="Delete Applicant Profile"
        message="Are you sure you want to delete this applicant's profile? This action cannot be undone."
        confirmText="Delete" cancelText="Cancel"
        onConfirm={() => deleteConfirm.id !== null && handleDelete(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
      />
      <ConfirmModal
        isOpen={successModal.open} type="success"
        title="Success" message={successModal.message}
        onConfirm={() => setSuccessModal({ open: false, message: '' })}
        onCancel={() => setSuccessModal({ open: false, message: '' })}
      />

      {/* View Assigned Activity Modal */}
      {viewingAssignedFor && (() => {
        const activity = cdspActivities.find(a => a.title === viewingAssignedFor.assignedActivity)
        const close = () => setViewingAssignedFor(null)
        const statusBadge = (s: string) =>
          s === 'Ongoing'   ? 'bg-green-100 text-green-700' :
          s === 'Completed' ? 'bg-blue-100 text-blue-700'  :
          'bg-yellow-100 text-yellow-700'
        const Row = ({ label, value }: { label: string; value?: string | number }) =>
          value != null && value !== '' ? (
            <div className="flex gap-3 py-2.5 border-b border-gray-100 last:border-0">
              <span className="text-xs text-gray-400 w-36 flex-shrink-0 pt-0.5">{label}</span>
              <span className="text-sm text-gray-800 font-medium">{value}</span>
            </div>
          ) : null
        const canChange = !activity || activity.status === 'Planned'
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[85vh]">
              {/* Orange header */}
              <div className="bg-brand-blue px-6 py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-white m-0 text-base font-semibold">Assigned Activity</h3>
                  <p className="text-white/80 text-sm mt-0.5">{viewingAssignedFor.lastName}, {viewingAssignedFor.firstName} {viewingAssignedFor.middleName}</p>
                </div>
                <button onClick={close} className="p-1 text-white/80 hover:text-white transition-colors"><X size={20} /></button>
              </div>

              <div className="overflow-y-auto flex-1 p-6">
                {activity ? (
                  <>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className="text-base font-bold text-gray-800 leading-snug flex-1">{activity.title}</p>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${statusBadge(activity.status)}`}>{activity.status}</span>
                    </div>
                    {activity.description && (
                      <p className="text-sm text-gray-500 mb-4 leading-relaxed">{activity.description}</p>
                    )}
                    <div className="mt-2">
                      <Row label="Service" value={activity.service} />
                      <Row label="Date" value={activity.date} />
                      <Row label="Start Date" value={activity.startDate} />
                      <Row label="End Date" value={activity.endDate} />
                      <Row label="Location / Venue" value={activity.location} />
                      <Row label="Facilitator" value={activity.facilitator} />
                      <Row label="Participants" value={activity.participants} />
                      <Row label="Counselor" value={activity.counselor} />
                      <Row label="Session Duration" value={activity.sessionDuration} />
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-sm font-medium text-gray-700 mb-1">{viewingAssignedFor.assignedActivity}</p>
                    <p className="text-xs text-gray-400">Activity details not found.</p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
                {canChange && (
                  <button
                    onClick={() => {
                      Swal.fire({
                        icon: 'warning',
                        title: 'Remove Assignment',
                        text: 'Are you sure you want to remove the assigned activity from this applicant?',
                        showCancelButton: true,
                        confirmButtonText: 'Yes, Remove',
                        cancelButtonText: 'Cancel',
                        confirmButtonColor: '#0077BE',
                        cancelButtonColor: '#6b7280',
                      }).then(r => { if (r.isConfirmed) handleUnassign(viewingAssignedFor.id) })
                    }}
                    className="px-4 py-2.5 border border-red-200 text-red-500 rounded-xl hover:bg-red-50 transition-colors text-sm font-medium"
                  >Unassign</button>
                )}
                {canChange && (
                  <button
                    onClick={() => { close(); setAssignTarget(viewingAssignedFor) }}
                    className="flex-1 py-2.5 border border-brand-blue text-brand-blue rounded-xl hover:bg-blue-50 transition-colors text-sm font-medium"
                  >Change Activity</button>
                )}
                <button onClick={close} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium">Close</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Assign Activity Modal — Step 1: Select */}
      {assignTarget && !selectedActivity && (() => {
        const currentActivity = assignTarget.assignedActivity
          ? cdspActivities.find(a => a.title === assignTarget.assignedActivity) ?? null
          : null
        const available = cdspActivities.filter(a =>
          a.status === 'Planned' &&
          (!assignTarget.serviceAvailed || a.service === assignTarget.serviceAvailed)
        )
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col">
              {/* Orange header */}
              <div className="bg-brand-blue px-6 py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-white m-0 text-base font-semibold">Assign Activity</h3>
                  <p className="text-white/80 text-sm mt-0.5">{assignTarget.firstName} {assignTarget.lastName}</p>
                </div>
                <button onClick={() => setAssignTarget(null)} className="p-1 text-white/80 hover:text-white transition-colors"><X size={20} /></button>
              </div>

              <div className="px-4 pt-3 pb-2 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input placeholder="Search activities..." className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none" readOnly />
                </div>
                <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1 px-1">
                  <AlertCircle size={11} className="flex-shrink-0" />
                  Showing <span className="font-semibold text-brand-blue mx-1">Planned</span> activities
                  {assignTarget.serviceAvailed && <> for <span className="font-semibold text-brand-blue mx-1">{assignTarget.serviceAvailed}</span> only</>}
                </p>
              </div>

              {currentActivity && (
                <div className="mx-4 mb-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start justify-between gap-3 flex-shrink-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-brand-blue uppercase tracking-widest mb-1">Currently Assigned</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">{currentActivity.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {currentActivity.service && <span className="text-xs text-gray-500">{currentActivity.service}</span>}
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700">{currentActivity.status}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      Swal.fire({
                        icon: 'warning',
                        title: 'Remove Assignment',
                        text: 'Are you sure you want to remove the assigned activity from this applicant?',
                        showCancelButton: true,
                        confirmButtonText: 'Yes, Remove',
                        cancelButtonText: 'Cancel',
                        confirmButtonColor: '#0077BE',
                        cancelButtonColor: '#6b7280',
                      }).then(r => { if (r.isConfirmed) handleUnassign(assignTarget.id) })
                    }}
                    className="text-xs text-red-500 hover:text-red-700 font-medium whitespace-nowrap flex-shrink-0"
                  >Unassign</button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2">
                {available.length === 0 ? (
                  <div className="py-12 text-center">
                    <AlertCircle size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-400 text-sm">
                      No Planned activities found{assignTarget.serviceAvailed && ` for "${assignTarget.serviceAvailed}"`}.
                    </p>
                  </div>
                ) : available.map(activity => {
                  const isCurrent = assignTarget.assignedActivity === activity.title
                  return (
                    <button
                      key={activity.id}
                      onClick={() => setSelectedActivity(activity)}
                      className={`w-full px-4 py-3.5 text-left rounded-xl border transition-all hover:border-blue-300 hover:bg-blue-50 ${isCurrent ? 'border-brand-blue bg-blue-50' : 'border-gray-200'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 mb-1">{activity.title}</p>
                          <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 text-xs text-gray-500">
                            {activity.service && <span>{activity.service}</span>}
                            {activity.date && <><span>·</span><span>{activity.date}</span></>}
                            {activity.location && <><span>·</span><span>{activity.location}</span></>}
                          </div>
                          {(activity.startDate || activity.endDate) && (
                            <p className="text-xs text-gray-400 mt-0.5">{activity.startDate} – {activity.endDate}</p>
                          )}
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 font-medium bg-yellow-100 text-yellow-700">{activity.status}</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
                <button onClick={() => setAssignTarget(null)} className="w-full py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Assign Activity Modal — Step 2: Confirm */}
      {assignTarget && selectedActivity && (() => {
        const isAssigned = assignTarget.assignedActivity === selectedActivity.title
        const statusBadge = (s: string) =>
          s === 'Ongoing'   ? 'bg-green-100 text-green-700' :
          s === 'Completed' ? 'bg-blue-100 text-blue-700'  :
          'bg-yellow-100 text-yellow-700'
        const Row = ({ label, value }: { label: string; value?: string | number }) =>
          value != null && value !== '' ? (
            <div className="flex gap-3 py-2.5 border-b border-gray-100 last:border-0">
              <span className="text-xs text-gray-400 w-36 flex-shrink-0 pt-0.5">{label}</span>
              <span className="text-sm text-gray-800 font-medium">{value}</span>
            </div>
          ) : null
        const doAssign = () => {
          Swal.fire({
            icon: 'warning',
            title: 'Confirm Assignment',
            text: `Assign "${selectedActivity.title}" to ${assignTarget.firstName} ${assignTarget.lastName}?`,
            showCancelButton: true,
            confirmButtonText: 'Yes, Assign',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#0077BE',
            cancelButtonColor: '#6b7280',
          }).then(r => { if (r.isConfirmed) handleAssign(selectedActivity) })
        }
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[85vh]">
              {/* Orange header */}
              <div className="bg-brand-blue px-6 py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-white m-0 text-base font-semibold">Assign Activity</h3>
                  <p className="text-white/80 text-sm mt-0.5">{assignTarget.lastName}, {assignTarget.firstName} {assignTarget.middleName}</p>
                </div>
                <button onClick={() => setSelectedActivity(null)} className="p-1 text-white/80 hover:text-white transition-colors"><X size={20} /></button>
              </div>

              <div className="overflow-y-auto flex-1 p-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-gray-800 leading-snug">{selectedActivity.title}</p>
                    {isAssigned && <span className="inline-block mt-1.5 px-2 py-0.5 bg-blue-100 text-brand-blue rounded-full text-xs font-semibold">Currently Assigned</span>}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${statusBadge(selectedActivity.status)}`}>{selectedActivity.status}</span>
                </div>
                <div>
                  <Row label="Service" value={selectedActivity.service} />
                  <Row label="Date" value={selectedActivity.date} />
                  <Row label="Start Date" value={selectedActivity.startDate} />
                  <Row label="End Date" value={selectedActivity.endDate} />
                  <Row label="Location / Venue" value={selectedActivity.location} />
                  <Row label="Facilitator" value={selectedActivity.facilitator} />
                  <Row label="Participants" value={selectedActivity.participants} />
                  <Row label="Counselor" value={selectedActivity.counselor} />
                  <Row label="Session Duration" value={selectedActivity.sessionDuration} />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
                <button
                  onClick={() => setSelectedActivity(null)}
                  className="flex-1 py-2.5 border border-brand-blue text-brand-blue rounded-xl hover:bg-blue-50 transition-colors text-sm font-medium"
                >Change Activity</button>
                <button
                  onClick={doAssign}
                  className="flex-1 py-2.5 bg-brand-blue text-white rounded-xl hover:bg-brand-blue-dark transition-colors text-sm font-medium"
                >{isAssigned ? 'Re-assign' : 'Assign'}</button>
              </div>
            </div>
          </div>
        )
      })()}

      <div className="h-full overflow-y-auto bg-brand-bg">
      <div className="w-full px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button onClick={onBack} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={24} />
          </button>
          <p className="text-gray-800 font-bold" style={{ fontSize: 'var(--text-xl)' }}>
            Career Development Support Program (CDSP)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-md p-3 mb-4">
          <div className="flex gap-2">
            <button onClick={() => setIsFormOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue text-white rounded-md hover:bg-brand-blue-dark transition-colors text-sm">
              <Plus size={16} /><span>Add Applicant</span>
            </button>
            <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-md transition-colors text-sm">
              <Upload size={16} /><span>Import</span>
            </button>
            <div className="relative">
              <button onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-md transition-colors text-sm">
                <Download size={16} /><span>Export</span><ChevronDown size={14} />
              </button>
              {isExportDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsExportDropdownOpen(false)} />
                  <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <button onClick={exportToExcel} className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-t-lg text-sm">
                      <Download size={16} /> Excel (.xlsx)
                    </button>
                    <button onClick={exportToCSV} className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-b-lg border-t border-gray-100 text-sm">
                      <Download size={16} /> CSV (.csv)
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Import Modal */}
        {isImportModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <p className="text-gray-800 font-semibold">Import CDSP Applicants</p>
                <button onClick={() => { setIsImportModalOpen(false); setUploadedFile(null); setImportPreview([]) }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex gap-3">
                  <button onClick={() => setImportFileType('excel')} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${importFileType === 'excel' ? 'border-brand-blue bg-blue-50 text-brand-blue' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>Excel (.xlsx)</button>
                  <button onClick={() => setImportFileType('csv')} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${importFileType === 'csv' ? 'border-brand-blue bg-blue-50 text-brand-blue' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>CSV (.csv)</button>
                </div>
                <button onClick={downloadTemplate} className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50">Download Template</button>
                <label className="block w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-brand-blue hover:bg-blue-50 transition-colors">
                  <Upload size={28} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">{uploadedFile ? uploadedFile.name : 'Click to upload or drag and drop'}</p>
                  <p className="text-xs text-gray-400 mt-1">{importFileType === 'excel' ? '.xlsx' : '.csv'} files only</p>
                  <input type="file" accept={importFileType === 'excel' ? '.xlsx,.xls' : '.csv'} className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]) }} />
                </label>
                {importPreview.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Preview ({importPreview.length} records found):</p>
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                      {importPreview.slice(0, 10).map((row, i) => (
                        <div key={i} className={`px-3 py-2 flex items-center justify-between text-xs ${row.valid ? '' : 'bg-red-50'}`}>
                          <span className="text-gray-700">{row.firstName} {row.lastName}</span>
                          <span className="text-gray-500">{row.service || '—'}</span>
                          {!row.valid && <span className="text-red-500 ml-2">Invalid</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
                <button onClick={() => { setIsImportModalOpen(false); setUploadedFile(null); setImportPreview([]) }} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm">Cancel</button>
                <button onClick={handleImport} disabled={importPreview.filter((r) => r.valid).length === 0} className="flex-1 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  Import {importPreview.filter((r) => r.valid).length > 0 ? `(${importPreview.filter((r) => r.valid).length})` : ''}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search & Filter + Table */}
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="mb-4">
          <div className="flex gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search by name, barangay, or assigned activity..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-blue placeholder:text-gray-400"
              />
            </div>
            <div className="relative">
              <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors whitespace-nowrap text-sm text-gray-700">
                <Plus size={16} /><span>Filter By</span><ChevronDown size={14} className="text-gray-500" />
              </button>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    {availableFilters.map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => handleAddFilter(filter.id)}
                        disabled={activeFilters.includes(filter.id)}
                        className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${activeFilters.includes(filter.id) ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'text-gray-700'}`}
                      >
                        {filter.label}
                        {activeFilters.includes(filter.id) && <span className="ml-2 text-xs text-gray-400">(Active)</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {activeFilters.map((filterId) => {
                const filter = availableFilters.find((f) => f.id === filterId)
                return (
                  <div key={filterId} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
                    <span className="text-sm text-blue-700 font-medium">{filter?.label}:</span>
                    <select value={filterValues[filterId] || ''} onChange={(e) => handleFilterValueChange(filterId, e.target.value)} onClick={(e) => e.stopPropagation()} className="text-sm bg-transparent border-none focus:outline-none text-blue-700 font-medium pr-1 cursor-pointer">
                      {filter?.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <button onClick={() => handleRemoveFilter(filterId)} className="text-blue-700 hover:text-blue-900"><X size={14} /></button>
                  </div>
                )
              })}
            </div>
          )}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <Users size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600 text-lg">No applicants found</p>
              <p className="text-gray-400 text-sm mt-1">
                {applicants.length === 0 ? 'Click "Add Applicant" to register the first CDSP applicant.' : 'Try adjusting your search or filters.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-brand-blue">
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Name</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Barangay</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Classification</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Service Availed</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Assigned Activity</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Status</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((applicant) => (
                    <tr key={applicant.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-gray-800 font-medium">{applicant.lastName}, {applicant.firstName}{applicant.middleName ? ` ${applicant.middleName.charAt(0)}.` : ''}</p>
                        <p className="text-gray-400 text-xs">{applicant.sex} · {applicant.age} yrs</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{applicant.barangay || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {applicant.classification.slice(0, 1).map((c) => (
                            <span key={c} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{c}</span>
                          ))}
                          {applicant.classification.length > 1 && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-500 rounded text-xs">+{applicant.classification.length - 1}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded whitespace-nowrap text-xs">{applicant.serviceAvailed || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {applicant.assignedActivity ? (() => {
                          const act = cdspActivities.find(a => a.title === applicant.assignedActivity)
                          return (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm text-gray-800 line-clamp-1">{applicant.assignedActivity}</span>
                              {act && <span className={`self-start px-1.5 py-0.5 rounded-full text-xs font-medium ${activityStatusBadge(act.status)}`}>{act.status}</span>}
                            </div>
                          )
                        })() : <span className="text-gray-400 text-xs italic">Not assigned</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={getEffectiveStatus(applicant, cdspActivities)} /></td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                            const showAbove = window.innerHeight - rect.bottom < 148
                            setMenuPos({ top: showAbove ? rect.top - 148 : rect.bottom + 4, right: window.innerWidth - rect.right })
                            setOpenActionMenuId(openActionMenuId === applicant.id ? null : applicant.id)
                          }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Action dropdown menu (fixed position) */}
      {openActionMenuId !== null && menuPos && (() => {
        const applicant = applicants.find((a) => a.id === openActionMenuId)
        if (!applicant) return null
        return (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenActionMenuId(null)} />
            <div style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }} className="w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
              <button onClick={() => { setViewingApplicant(applicant); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">View</button>
              <button onClick={() => { setEditingApplicant(applicant); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">Edit</button>
              {applicant.assignedActivity
                ? <button onClick={() => { setViewingAssignedFor(applicant); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-blue-600 hover:bg-blue-50">View Assigned Activity</button>
                : <button onClick={() => { setAssignTarget(applicant); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-purple-600 hover:bg-purple-50">Assign Activity</button>
              }
              <div className="my-1 border-t border-gray-100" />
              <button onClick={() => { setDeleteConfirm({ open: true, id: applicant.id }); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-red-500 hover:bg-red-50">Delete</button>
            </div>
          </>
        )
      })()}
    </>
  )
}

