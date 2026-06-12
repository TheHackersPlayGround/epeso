import { useState } from 'react'
import {
  ArrowLeft, Search, Plus, X, Users,
  AlertCircle, CheckCircle, Upload, Download, ChevronDown, MoreHorizontal,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { useSPES } from '../../contexts/SPESContext'
import type { SPESApplicant } from '../../contexts/SPESContext'
import { useProgramActivities } from '../../contexts/ProgramActivitiesContext'
import type { ProgramActivity } from '../../contexts/ProgramActivitiesContext'
import AddressFields from '../../components/AddressFields'

interface SPESViewProps {
  onBack: () => void
}

const SCHOOL_TYPE_OPTIONS = [
  'Junior High School',
  'Senior High School',
  'College',
  'Alternative Learning System (ALS)',
  'Technical / Vocational',
]

const GRADE_YEAR_LEVEL_OPTIONS = [
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
  'Grade 11', 'Grade 12',
  '1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year',
  'ALS Level',
]

const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated']
const STATUS_OPTIONS: SPESApplicant['status'][] = ['Active', 'Completed', 'Dropped', 'Suspended']
const WORKING_HOURS_OPTIONS = ['4', '6', '8']

const emptyForm: Omit<SPESApplicant, 'id'> = {
  lastName: '', firstName: '', middleName: '',
  sex: '', birthdate: '', age: 0, civilStatus: 'Single',
  contactNumber: '', email: '',
  streetPurok: '', barangay: '', cityMunicipality: 'Tangub City', province: 'Misamis Occidental', region: 'Region X',
  schoolName: '', schoolType: '', gradeYearLevel: '', course: '',
  annualFamilyIncome: '', numberOfDependents: 0,
  employer: '', employerDepartment: '', position: '',
  workStartDate: '', workEndDate: '', stipend: '3,500', workingHoursPerDay: '4',
  assignedActivity: '',
  attachedDocuments: [],
  dateApplicationReceived: '', receivedBy: '',
  status: 'Active', remarks: '',
}

// ─── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SPESApplicant['status'] }) {
  const colors: Record<string, string> = {
    Active: 'bg-blue-100 text-blue-700',
    Completed: 'bg-green-100 text-green-700',
    Dropped: 'bg-red-100 text-red-600',
    Suspended: 'bg-yellow-100 text-yellow-700',
  }
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({ isOpen, type, title, message, onConfirm, onCancel, confirmText = 'Confirm' }: {
  isOpen: boolean; type: 'confirm' | 'success'; title: string; message: string
  onConfirm: () => void; onCancel: () => void; confirmText?: string
}) {
  if (!isOpen) return null
  const Icon = type === 'success' ? CheckCircle : AlertCircle
  const iconColor = type === 'success' ? 'text-green-500' : 'text-[#0077BE]'
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 text-center">
        <Icon size={56} className={`mx-auto mb-4 ${iconColor}`} />
        <h3 className="text-xl text-gray-800 mb-3">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          {type === 'confirm' ? (
            <>
              <button onClick={onCancel} className="px-6 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">Cancel</button>
              <button onClick={onConfirm} className="px-6 py-2 bg-[#0077BE] text-white rounded-lg hover:bg-[#0065A5]">{confirmText}</button>
            </>
          ) : (
            <button onClick={onConfirm} className="px-6 py-2 bg-[#0077BE] text-white rounded-lg hover:bg-[#0065A5]">OK</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Attached Documents Editor ────────────────────────────────────────────────

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
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0077BE] focus:border-transparent outline-none placeholder:text-gray-800"
          placeholder="Document name (e.g. Resume, Birth Certificate...)"
          value={docName}
          onChange={e => setDocName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDoc() } }}
        />
        <button
          type="button"
          onClick={addDoc}
          className="flex items-center gap-2 px-4 py-2 bg-[#0077BE] text-white rounded-lg hover:bg-[#0065A5] text-sm whitespace-nowrap"
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

// ─── View Panel ───────────────────────────────────────────────────────────────

function ViewApplicantPanel({ applicant, onClose }: { applicant: SPESApplicant; onClose: () => void }) {
  const Field = ({ label, value }: { label: string; value: string | number | undefined }) => (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-gray-800 text-sm">{value || '—'}</p>
    </div>
  )
  const Sec = ({ num, title, gray }: { num: string; title: string; gray?: boolean }) => (
    <div className={`flex items-center gap-2 mt-8 mb-4 rounded px-4 py-2.5 ${gray ? 'bg-gray-500' : 'bg-[#0077BE]'}`}>
      <span className="text-white text-xs font-bold">{num}.</span>
      <span className="text-white text-xs font-bold uppercase tracking-wide">{title}</span>
    </div>
  )
  return (
    <div className="h-full bg-[#E6E7E8] flex flex-col">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <Users size={18} className="text-[#0077BE]" />
          </div>
          <div>
            <h2 className="text-gray-800 text-lg">{applicant.lastName}, {applicant.firstName} {applicant.middleName}</h2>
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
          <Sec num="V" title="Employment Details" />
          <div className="grid grid-cols-2 gap-5">
            <Field label="Employer / Agency" value={applicant.employer} />
            <Field label="Department / Office" value={applicant.employerDepartment} />
            <Field label="Position / Job Title" value={applicant.position} />
            <Field label="Stipend" value={applicant.stipend ? `₱${applicant.stipend}` : ''} />
            <Field label="Work Start Date" value={applicant.workStartDate} />
            <Field label="Work End Date" value={applicant.workEndDate} />
            <Field label="Working Hours / Day" value={applicant.workingHoursPerDay ? `${applicant.workingHoursPerDay} hrs` : ''} />
          </div>
          <Sec num="VI" title="Assignment" />
          <Field label="Assigned Activity" value={applicant.assignedActivity} />
          <Sec num="VII" title="Attached Documents" />
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
          <Sec num="VIII" title="For PESO Office Only" gray />
          <div className="grid grid-cols-2 gap-5">
            <Field label="Date Application Received" value={applicant.dateApplicationReceived} />
            <Field label="Received By" value={applicant.receivedBy} />
            <Field label="Status" value={applicant.status} />
            <Field label="Remarks" value={applicant.remarks} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Applicant Form ───────────────────────────────────────────────────────────

function ApplicantForm({ initial, mode, onSave, onClose }: {
  initial: Omit<SPESApplicant, 'id'>
  mode: 'add' | 'edit'
  onSave: (data: Omit<SPESApplicant, 'id'>) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState(initial)
  const set = (patch: Partial<Omit<SPESApplicant, 'id'>>) => setFormData(p => ({ ...p, ...patch }))

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

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0077BE] focus:border-transparent outline-none placeholder:text-gray-800'
  const lbl = 'block text-xs uppercase tracking-wide text-gray-900 font-semibold mb-1'
  const sel = `${inp} bg-white`

  const SectionDivider = ({ num, title, gray }: { num: string; title: string; gray?: boolean }) => (
    <div className={`flex items-center gap-2 mt-8 mb-4 rounded px-4 py-2.5 ${gray ? 'bg-gray-500' : 'bg-[#0077BE]'}`}>
      <span className="text-white text-xs font-bold">{num}.</span>
      <span className="text-white text-xs font-bold uppercase tracking-wide">{title}</span>
    </div>
  )

  return (
    <div className="h-full bg-[#E6E7E8] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <Users size={18} className="text-[#0077BE]" />
          </div>
          <p className="text-gray-800 font-semibold" style={{ fontSize: 'var(--text-md)' }}>
            {mode === 'edit' ? 'Edit Applicant Profile' : 'Add New Applicant — SPES'}
          </p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
      </div>

      {/* Scrollable Form */}
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
              <input type="date" className={inp} value={formData.birthdate} onChange={e => handleBirthdate(e.target.value)} />
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

          <SectionDivider num="V" title="Employment Details" />
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <label className={lbl}>Employer / Agency</label>
              <input className={inp} value={formData.employer} onChange={e => set({ employer: e.target.value })} placeholder="e.g. City Hall" />
            </div>
            <div>
              <label className={lbl}>Department / Office</label>
              <input className={inp} value={formData.employerDepartment} onChange={e => set({ employerDepartment: e.target.value })} placeholder="e.g. MIS / IT Department" />
            </div>
            <div>
              <label className={lbl}>Position / Job Title</label>
              <input className={inp} value={formData.position} onChange={e => set({ position: e.target.value })} placeholder="e.g. IT Assistant" />
            </div>
            <div>
              <label className={lbl}>Stipend (₱)</label>
              <input className={inp} value={formData.stipend} onChange={e => set({ stipend: e.target.value })} placeholder="e.g. 3,500" />
            </div>
            <div>
              <label className={lbl}>Working Hours / Day</label>
              <select className={sel} value={formData.workingHoursPerDay} onChange={e => set({ workingHoursPerDay: e.target.value })}>
                {WORKING_HOURS_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Work Start Date</label>
              <input type="date" className={inp} value={formData.workStartDate} onChange={e => set({ workStartDate: e.target.value })} />
            </div>
            <div>
              <label className={lbl}>Work End Date</label>
              <input type="date" className={inp} value={formData.workEndDate} onChange={e => set({ workEndDate: e.target.value })} />
            </div>
          </div>

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
              <input type="date" className={inp} value={formData.dateApplicationReceived} onChange={e => set({ dateApplicationReceived: e.target.value })} />
            </div>
            <div>
              <label className={lbl}>Received By</label>
              <input className={inp} value={formData.receivedBy} onChange={e => set({ receivedBy: e.target.value })} placeholder="Staff name" />
            </div>
            <div>
              <label className={lbl}>Status</label>
              <select className={sel} value={formData.status} onChange={e => set({ status: e.target.value as SPESApplicant['status'] })}>
                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Remarks</label>
              <input className={inp} value={formData.remarks} onChange={e => set({ remarks: e.target.value })} placeholder="Optional" />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-10 pt-6 border-t border-gray-100">
            <button onClick={onClose} className="px-6 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">Cancel</button>
            <button onClick={handleSave} className="px-8 py-2.5 bg-[#0077BE] text-white rounded-lg hover:bg-[#0065A5] text-sm">
              {mode === 'edit' ? 'Save Changes' : 'Save Profile'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

// ─── Main SPESView ────────────────────────────────────────────────────────────

export default function SPESView({ onBack }: SPESViewProps) {
  const { applicants, setApplicants } = useSPES()
  const { getActivitiesByProgram } = useProgramActivities()
  const spesActivities = getActivitiesByProgram('SPES') as ProgramActivity[]

  const [searchQuery, setSearchQuery] = useState('')
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})

  const availableFilters = [
    { id: 'status', label: 'Status', options: STATUS_OPTIONS as string[] },
    { id: 'schoolType', label: 'School Type', options: SCHOOL_TYPE_OPTIONS },
    { id: 'sex', label: 'Sex', options: ['Male', 'Female'] },
    { id: 'civilStatus', label: 'Civil Status', options: CIVIL_STATUS_OPTIONS },
  ]

  const handleAddFilter = (filterId: string) => {
    if (!activeFilters.includes(filterId)) {
      const filter = availableFilters.find(f => f.id === filterId)
      setActiveFilters(prev => [...prev, filterId])
      setFilterValues(prev => ({ ...prev, [filterId]: filter?.options[0] ?? '' }))
    }
    setIsFilterDropdownOpen(false)
  }

  const handleRemoveFilter = (filterId: string) => {
    setActiveFilters(prev => prev.filter(id => id !== filterId))
    setFilterValues(prev => { const n = { ...prev }; delete n[filterId]; return n })
  }

  const handleFilterValueChange = (filterId: string, value: string) => {
    setFilterValues(prev => ({ ...prev, [filterId]: value }))
  }

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingApplicant, setEditingApplicant] = useState<SPESApplicant | null>(null)
  const [viewingApplicant, setViewingApplicant] = useState<SPESApplicant | null>(null)
  const [assignTarget, setAssignTarget] = useState<SPESApplicant | null>(null)

  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<{ lastName: string; firstName: string; school: string; status: string; valid: boolean }[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number | null }>({ open: false, id: null })
  const [successModal, setSuccessModal] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)

  const filtered = applicants.filter(a => {
    const fullName = `${a.lastName} ${a.firstName} ${a.middleName}`.toLowerCase()
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      a.barangay.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.schoolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.employer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.assignedActivity.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilters = activeFilters.every(filterId => {
      const val = filterValues[filterId]
      if (!val) return true
      if (filterId === 'status') return a.status === val
      if (filterId === 'schoolType') return a.schoolType === val
      if (filterId === 'sex') return a.sex === val
      if (filterId === 'civilStatus') return a.civilStatus === val
      return true
    })
    return matchesSearch && matchesFilters
  })

  const handleAddSave = (data: Omit<SPESApplicant, 'id'>) => {
    setApplicants(prev => [...prev, { ...data, id: Date.now() }])
    setIsFormOpen(false)
    setSuccessModal({ open: true, message: 'Applicant profile has been added successfully.' })
  }

  const handleEditSave = (data: Omit<SPESApplicant, 'id'>) => {
    if (!editingApplicant) return
    setApplicants(prev => prev.map(a => a.id === editingApplicant.id ? { ...data, id: a.id } : a))
    setEditingApplicant(null)
    setSuccessModal({ open: true, message: 'Applicant profile has been updated successfully.' })
  }

  const handleDelete = (id: number) => {
    setApplicants(prev => prev.filter(a => a.id !== id))
    setDeleteConfirm({ open: false, id: null })
    setSuccessModal({ open: true, message: 'Applicant profile has been deleted.' })
  }

  const handleAssign = (activity: ProgramActivity) => {
    if (!assignTarget) return
    setApplicants(prev => prev.map(a => a.id === assignTarget.id ? { ...a, assignedActivity: activity.title } : a))
    setAssignTarget(null)
    setSuccessModal({ open: true, message: `Assigned to "${activity.title}" successfully.` })
  }

  const handleUnassign = () => {
    if (!assignTarget) return
    setApplicants(prev => prev.map(a => a.id === assignTarget.id ? { ...a, assignedActivity: '' } : a))
    setAssignTarget(null)
    setSuccessModal({ open: true, message: 'Assigned activity has been removed.' })
  }

  const exportToExcel = () => {
    const data = filtered.map(a => ({
      'Last Name': a.lastName, 'First Name': a.firstName, 'Middle Name': a.middleName,
      'Sex': a.sex, 'Birthdate': a.birthdate, 'Age': a.age, 'Civil Status': a.civilStatus,
      'Contact Number': a.contactNumber, 'Email': a.email,
      'Barangay': a.barangay, 'City / Municipality': a.cityMunicipality, 'Province': a.province,
      'School Name': a.schoolName, 'School Type': a.schoolType,
      'Grade / Year Level': a.gradeYearLevel, 'Course': a.course,
      'Annual Family Income': a.annualFamilyIncome, 'Number of Dependents': a.numberOfDependents,
      'Employer': a.employer, 'Department': a.employerDepartment, 'Position': a.position,
      'Work Start Date': a.workStartDate, 'Work End Date': a.workEndDate,
      'Stipend': a.stipend, 'Working Hours / Day': a.workingHoursPerDay,
      'Assigned Activity': a.assignedActivity,
      'Status': a.status, 'Remarks': a.remarks,
      'Date Received': a.dateApplicationReceived, 'Received By': a.receivedBy,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'SPES Applicants')
    XLSX.writeFile(wb, `SPES_Applicants_${new Date().toISOString().split('T')[0]}.xlsx`)
    setIsExportDropdownOpen(false)
  }

  const exportToCSV = () => {
    const data = filtered.map(a => ({
      'Last Name': a.lastName, 'First Name': a.firstName,
      'School': a.schoolName, 'Grade / Year Level': a.gradeYearLevel,
      'Employer': a.employer, 'Stipend': a.stipend,
      'Assigned Activity': a.assignedActivity, 'Status': a.status,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `SPES_Applicants_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    setIsExportDropdownOpen(false)
  }

  const handleFileUpload = (file: File) => {
    setUploadedFile(file)
    const reader = new FileReader()
    reader.onload = e => {
      const data = e.target?.result
      const wb = XLSX.read(data, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws) as Record<string, string>[]
      setImportPreview(rows.slice(0, 5).map(r => ({
        lastName: r['Last Name'] || '',
        firstName: r['First Name'] || '',
        school: r['School Name'] || '',
        status: r['Status'] || '',
        valid: !!(r['Last Name'] && r['First Name']),
      })))
    }
    reader.readAsBinaryString(file)
  }

  // Full-page form for add
  if (isFormOpen) return <ApplicantForm initial={emptyForm} mode="add" onSave={handleAddSave} onClose={() => setIsFormOpen(false)} />

  // Full-page form for edit
  if (editingApplicant) {
    const { id: _id, ...rest } = editingApplicant
    return <ApplicantForm initial={rest} mode="edit" onSave={handleEditSave} onClose={() => setEditingApplicant(null)} />
  }

  // Full-page view
  if (viewingApplicant) return <ViewApplicantPanel applicant={viewingApplicant} onClose={() => setViewingApplicant(null)} />

  return (
    <>
      <ConfirmModal
        isOpen={deleteConfirm.open} type="confirm"
        title="Delete Applicant Profile"
        message="Are you sure you want to delete this applicant's profile? This action cannot be undone."
        confirmText="Delete"
        onConfirm={() => deleteConfirm.id !== null && handleDelete(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
      />
      <ConfirmModal
        isOpen={successModal.open} type="success"
        title="Success" message={successModal.message}
        onConfirm={() => setSuccessModal({ open: false, message: '' })}
        onCancel={() => setSuccessModal({ open: false, message: '' })}
      />

      {/* Assign Activity Modal */}
      {assignTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-gray-800">Assign Activity</h3>
                <p className="text-sm text-gray-400 mt-0.5">{assignTarget.firstName} {assignTarget.lastName}</p>
              </div>
              <button onClick={() => setAssignTarget(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
              {(() => {
                const planned = spesActivities.filter(a => a.status === 'Planned')
                if (planned.length === 0) return (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-400">No planned SPES activities available.</p>
                    <p className="text-xs text-gray-300 mt-1">Only planned activities can be assigned to applicants.</p>
                  </div>
                )
                return planned.map(activity => (
                  <button key={activity.id} onClick={() => handleAssign(activity)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all hover:border-[#0077BE] hover:bg-blue-50 ${
                      assignTarget.assignedActivity === activity.title ? 'border-[#0077BE] bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800">{activity.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {activity.assignedOffice && `${activity.assignedOffice} · `}{activity.startDate} – {activity.endDate}
                        </p>
                        {activity.allowance && <p className="text-xs text-gray-400">Stipend: ₱{activity.allowance}</p>}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 bg-gray-100 text-gray-600">Planned</span>
                    </div>
                    {assignTarget.assignedActivity === activity.title && <p className="text-xs text-[#0077BE] mt-1">Currently assigned</p>}
                  </button>
                ))
              })()}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex flex-col gap-2">
              {assignTarget.assignedActivity && (
                <button onClick={handleUnassign} className="w-full py-2 border border-red-200 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors">
                  Remove Assigned Activity
                </button>
              )}
              <button onClick={() => setAssignTarget(null)} className="w-full py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-gray-800">Import Applicants</h3>
              <button onClick={() => { setIsImportModalOpen(false); setUploadedFile(null); setImportPreview([]) }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6">
              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-[#0077BE] hover:bg-blue-50 transition-colors"
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f) }}
                onClick={() => document.getElementById('spes-file-input')?.click()}
              >
                <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">Drop your Excel or CSV file here</p>
                <p className="text-xs text-gray-400 mt-1">or click to browse</p>
                <input id="spes-file-input" type="file" accept=".xlsx,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} />
              </div>
              {uploadedFile && importPreview.length > 0 && (
                <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full">
                    <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left">Last Name</th><th className="px-3 py-2 text-left">First Name</th><th className="px-3 py-2 text-left">School</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Valid</th></tr></thead>
                    <tbody>{importPreview.map((r, i) => <tr key={i} className="border-t border-gray-100"><td className="px-3 py-2">{r.lastName}</td><td className="px-3 py-2">{r.firstName}</td><td className="px-3 py-2">{r.school}</td><td className="px-3 py-2">{r.status}</td><td className="px-3 py-2">{r.valid ? '✓' : '✗'}</td></tr>)}</tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => { setIsImportModalOpen(false); setUploadedFile(null); setImportPreview([]) }} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button disabled={!uploadedFile} onClick={() => { setIsImportModalOpen(false); setUploadedFile(null); setImportPreview([]); setSuccessModal({ open: true, message: 'File imported successfully.' }) }} className="flex-1 py-2 bg-[#0077BE] text-white rounded-lg text-sm hover:bg-[#0065A5] disabled:opacity-40">Import</button>
            </div>
          </div>
        </div>
      )}

      {/* Main List */}
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-6 flex items-center gap-4">
            <button onClick={onBack} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><ArrowLeft size={24} /></button>
            <p className="text-gray-800 font-bold" style={{ fontSize: 'var(--text-xl)' }}>Special Program for Employment of Students (SPES)</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 mb-4">
            <div className="flex gap-3">
              <button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0077BE] text-white rounded-lg hover:bg-[#0065A5] transition-colors">
                <Plus size={20} /><span>Add Applicant</span>
              </button>
              <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg transition-colors">
                <Upload size={20} /><span>Import</span>
              </button>
              <div className="relative">
                <button onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg transition-colors">
                  <Download size={20} /><span>Export</span><ChevronDown size={16} />
                </button>
                {isExportDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsExportDropdownOpen(false)} />
                    <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <button onClick={exportToExcel} className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-t-lg"><Download size={16} /> Excel (.xlsx)</button>
                      <button onClick={exportToCSV} className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-b-lg border-t border-gray-100"><Download size={16} /> CSV (.csv)</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="mb-4">
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-48">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#0077BE]"
                    placeholder="Search by name, barangay, school, or employer..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <button
                    onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors whitespace-nowrap text-sm text-gray-700"
                  >
                    <Plus size={16} />
                    <span>Filter By</span>
                    <ChevronDown size={14} className="text-gray-500" />
                  </button>
                  {isFilterDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsFilterDropdownOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        {availableFilters.map(filter => (
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
                  {activeFilters.map(filterId => {
                    const filter = availableFilters.find(f => f.id === filterId)
                    return (
                      <div key={filterId} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
                        <span className="text-sm text-blue-700 font-medium">{filter?.label}:</span>
                        <select
                          value={filterValues[filterId] || ''}
                          onChange={e => handleFilterValueChange(filterId, e.target.value)}
                          className="text-sm bg-transparent border-none focus:outline-none text-blue-700 font-medium pr-1 cursor-pointer"
                          onClick={e => e.stopPropagation()}
                        >
                          {filter?.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <button onClick={() => handleRemoveFilter(filterId)} className="text-blue-700 hover:text-blue-900 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <Users size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No applicants found</p>
                <p className="text-gray-400 text-sm mt-1">{applicants.length === 0 ? 'Click "Add Applicant" to register the first SPES applicant.' : 'Try adjusting your search or filters.'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#0077BE]">
                      <th className="px-3 py-3 text-left text-white whitespace-nowrap">Name</th>
                      <th className="px-3 py-3 text-left text-white whitespace-nowrap">School</th>
                      <th className="px-3 py-3 text-left text-white whitespace-nowrap">Grade / Year Level</th>
                      <th className="px-3 py-3 text-left text-white whitespace-nowrap">Employer</th>
                      <th className="px-3 py-3 text-left text-white whitespace-nowrap">Allowance</th>
                      <th className="px-3 py-3 text-left text-white whitespace-nowrap">Assigned Activity</th>
                      <th className="px-3 py-3 text-left text-white whitespace-nowrap">Status</th>
                      <th className="px-3 py-3 text-left text-white whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(applicant => (
                      <tr key={applicant.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <p className="text-gray-800 font-medium">{applicant.lastName}, {applicant.firstName} {applicant.middleName}</p>
                          <p className="text-gray-400">{applicant.sex} · {applicant.age} yrs</p>
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          <p className="whitespace-nowrap">{applicant.schoolName || '—'}</p>
                          {applicant.schoolType && <p className="text-gray-400">{applicant.schoolType}</p>}
                        </td>
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{applicant.gradeYearLevel || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">
                          <p className="whitespace-nowrap">{applicant.employer || '—'}</p>
                          {applicant.employerDepartment && <p className="text-gray-400">{applicant.employerDepartment}</p>}
                        </td>
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                          {applicant.stipend ? `₱${applicant.stipend}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-gray-600 max-w-[160px]">
                          <span className="line-clamp-2">{applicant.assignedActivity || '—'}</span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap"><StatusBadge status={applicant.status} /></td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <button
                            onClick={e => {
                              const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                              const menuHeight = 140
                              const showAbove = window.innerHeight - rect.bottom < menuHeight + 8
                              setMenuPos({
                                top: showAbove ? rect.top - menuHeight - 4 : rect.bottom + 4,
                                right: window.innerWidth - rect.right,
                              })
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

      {/* Action dropdown portal — rendered outside overflow to avoid clipping */}
      {openActionMenuId !== null && menuPos && (() => {
        const applicant = applicants.find(a => a.id === openActionMenuId)
        if (!applicant) return null
        return (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenActionMenuId(null)} />
            <div
              style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}
              className="w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1"
            >
              <button onClick={() => { setViewingApplicant(applicant); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">View</button>
              <button onClick={() => { setEditingApplicant(applicant); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">Edit</button>
              <button onClick={() => { setAssignTarget(applicant); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-purple-600 hover:bg-purple-50">Assign Activity</button>
              <div className="my-1 border-t border-gray-100" />
              <button onClick={() => { setDeleteConfirm({ open: true, id: applicant.id }); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-red-500 hover:bg-red-50">Delete</button>
            </div>
          </>
        )
      })()}
    </>
  )
}
