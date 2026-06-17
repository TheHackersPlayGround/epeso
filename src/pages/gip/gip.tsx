import { useState } from 'react'
import {
  ArrowLeft, Search, Plus, X, Users,
  AlertCircle, CheckCircle, Upload, Download, ChevronDown, MoreHorizontal,
  ChevronRight,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { useGIP } from '../../contexts/GIPContext'
import type { GIPApplicant, GIPBatch } from '../../contexts/GIPContext'
import AddressFields from '../../components/AddressFields'

interface GIPViewProps {
  onBack: () => void
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const CLASSIFICATION_OPTIONS = [
  'Fresh Graduate', 'Unemployed', 'Underemployed',
  'Person with Disability (PWD)', 'Women', 'Solo Parent',
  'Senior Citizen', 'Indigenous People (IP)', 'Returning OFW', 'Other',
]

const EDUCATION_OPTIONS = [
  'Elementary Level', 'Elementary Graduate',
  'High School Level', 'High School Graduate',
  'Senior High School Level', 'Senior High School Graduate',
  'Vocational / Technical',
  'College Level', 'College Level (2nd Year)', 'College Level (3rd Year)',
  'College Level (4th Year)', 'College Graduate', "Master's Level",
  "Master's Graduate", 'Doctoral',
]

const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated', 'Annulled']

const BATCH_STATUS_COLORS: Record<GIPBatch['status'], string> = {
  Planned:   'bg-yellow-100 text-yellow-700',
  Ongoing:   'bg-green-100 text-green-700',
  Completed: 'bg-gray-100 text-gray-500',
}

const emptyForm: Omit<GIPApplicant, 'id'> = {
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

// ─── Helpers ───────────────────────────────────────────────────────────────────

function deriveStatus(applicant: Omit<GIPApplicant, 'id'>, batches: GIPBatch[]): GIPApplicant['status'] {
  if (!applicant.assignedBatchId) return 'Inactive'
  const batch = batches.find(b => b.id === applicant.assignedBatchId)
  if (!batch || batch.status === 'Completed') return 'Inactive'
  return 'Active'
}

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: GIPApplicant['status'] }) {
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

// ─── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({ isOpen, type, title, message, onConfirm, onCancel, confirmText = 'Confirm' }: {
  isOpen: boolean; type: 'confirm' | 'success'; title: string; message: string
  onConfirm: () => void; onCancel: () => void; confirmText?: string
}) {
  if (!isOpen) return null
  const Icon = type === 'success' ? CheckCircle : AlertCircle
  const iconColor = type === 'success' ? 'text-green-500' : 'text-brand-blue'
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

// ─── Attached Documents Editor ─────────────────────────────────────────────────

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

// ─── Assignment Cards ──────────────────────────────────────────────────────────

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

// ─── View Panel ────────────────────────────────────────────────────────────────

function ViewApplicantPanel({ applicant, batches, onClose }: {
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

  void batches.find(b => b.id === applicant.assignedBatchId)

  return (
    <div className="h-full bg-brand-bg flex flex-col">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <Users size={18} className="text-brand-blue" />
          </div>
          <div>
            <h2 className="text-gray-800 text-lg">{applicant.lastName}, {applicant.firstName} {applicant.middleName}</h2>
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
            <Field label="Date Received" value={applicant.dateApplicationReceived} />
            <Field label="Received By" value={applicant.receivedBy} />
            <Field label="Status" value={applicant.status} />
            <Field label="Remarks" value={applicant.remarks} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Applicant Form ────────────────────────────────────────────────────────────

function ApplicantForm({ initial, mode, batches, onSave, onClose }: {
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
              <label className={lbl}>Date Application Received</label>
              <input type="date" className={inp} value={formData.dateApplicationReceived} onChange={e => set({ dateApplicationReceived: e.target.value })} />
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

// ─── Main GIPView ──────────────────────────────────────────────────────────────

export default function GIPView({ onBack }: GIPViewProps) {
  const { applicants, setApplicants, gipBatches } = useGIP()

  const [searchQuery, setSearchQuery] = useState('')
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})

  const availableFilters = [
    { id: 'status', label: 'Status', options: ['Active', 'Inactive'] as string[] },
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
  const [editingApplicant, setEditingApplicant] = useState<GIPApplicant | null>(null)
  const [viewingApplicant, setViewingApplicant] = useState<GIPApplicant | null>(null)

  // Assign batch state
  const [assignTarget, setAssignTarget] = useState<GIPApplicant | null>(null)
  const [assignStep, setAssignStep] = useState<1 | 2>(1)
  const [assignSearch, setAssignSearch] = useState('')
  const [selectedBatch, setSelectedBatch] = useState<GIPBatch | null>(null)
  // View/change assigned batch state
  const [viewBatchTarget, setViewBatchTarget] = useState<GIPApplicant | null>(null)

  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<{ lastName: string; firstName: string; barangay: string; status: string; valid: boolean }[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number | null }>({ open: false, id: null })
  const [successModal, setSuccessModal] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)

  const filtered = applicants.filter(a => {
    const fullName = `${a.lastName} ${a.firstName} ${a.middleName}`.toLowerCase()
    const lastBatch = a.assignmentHistory[a.assignmentHistory.length - 1]?.batchName ?? ''
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      a.barangay.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lastBatch.toLowerCase().includes(searchQuery.toLowerCase())
    const derivedStatus = deriveStatus(a, gipBatches)
    const matchesFilters = activeFilters.every(filterId => {
      const val = filterValues[filterId]
      if (!val) return true
      if (filterId === 'status') return derivedStatus === val
      if (filterId === 'sex') return a.sex === val
      if (filterId === 'civilStatus') return a.civilStatus === val
      return true
    })
    return matchesSearch && matchesFilters
  })

  const handleAddSave = (data: Omit<GIPApplicant, 'id'>) => {
    setApplicants(prev => [...prev, { ...data, id: Date.now() }])
    setIsFormOpen(false)
    setSuccessModal({ open: true, message: 'Applicant profile has been added successfully.' })
  }

  const handleEditSave = (data: Omit<GIPApplicant, 'id'>) => {
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

  const handleAssignBatch = (batch: GIPBatch) => {
    if (!assignTarget) return
    const today = new Date().toISOString().split('T')[0]
    setApplicants(prev => prev.map(a => a.id === assignTarget.id ? {
      ...a,
      assignedBatchId: batch.id,
      status: 'Active' as const,
      assignmentHistory: [
        ...a.assignmentHistory,
        { batchId: batch.id, batchName: batch.batchName, assignedDate: today },
      ],
    } : a))
    setAssignTarget(null)
    setAssignStep(1)
    setSelectedBatch(null)
    setAssignSearch('')
    setSuccessModal({ open: true, message: `Assigned to "${batch.batchName}" successfully.` })
  }

  const handleUnassignBatch = () => {
    if (!viewBatchTarget) return
    const today = new Date().toISOString().split('T')[0]
    const batchId = viewBatchTarget.assignedBatchId
    setApplicants(prev => prev.map(a => a.id === viewBatchTarget.id ? {
      ...a,
      assignedBatchId: null,
      status: 'Inactive' as const,
      assignmentHistory: a.assignmentHistory.map(h =>
        h.batchId === batchId && !h.completedDate
          ? { ...h, completedDate: today }
          : h
      ),
    } : a))
    setViewBatchTarget(null)
    setSuccessModal({ open: true, message: 'Applicant has been unassigned from the batch.' })
  }

  const openAssignModal = (applicant: GIPApplicant) => {
    setAssignTarget(applicant)
    setAssignStep(1)
    setSelectedBatch(null)
    setAssignSearch('')
  }

  const exportToExcel = () => {
    const data = filtered.map(a => {
      const batch = gipBatches.find(b => b.id === a.assignedBatchId)
      return {
        'Last Name': a.lastName, 'First Name': a.firstName, 'Middle Name': a.middleName,
        'Sex': a.sex, 'Birthdate': a.birthdate, 'Age': a.age, 'Civil Status': a.civilStatus,
        'Contact': a.contactNumber, 'Email': a.email, 'Barangay': a.barangay,
        'Classification': a.classification.join(', '),
        'Education': a.highestEducation, 'School': a.schoolName, 'Course': a.course,
        'Assigned Batch': batch?.batchName ?? '',
        'Batch Status': batch?.status ?? '',
        'Status': deriveStatus(a, gipBatches), 'Remarks': a.remarks,
      }
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'GIP Applicants')
    XLSX.writeFile(wb, `GIP_Applicants_${new Date().toISOString().split('T')[0]}.xlsx`)
    setIsExportDropdownOpen(false)
  }

  const exportToCSV = () => {
    const data = filtered.map(a => {
      const batch = gipBatches.find(b => b.id === a.assignedBatchId)
      return {
        'Last Name': a.lastName, 'First Name': a.firstName,
        'Barangay': a.barangay,
        'Assigned Batch': batch?.batchName ?? '',
        'Batch Status': batch?.status ?? '',
        'Status': deriveStatus(a, gipBatches),
      }
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `GIP_Applicants_${new Date().toISOString().split('T')[0]}.csv`
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
        lastName: r['Last Name'] || '', firstName: r['First Name'] || '',
        barangay: r['Barangay'] || '', status: r['Status'] || '',
        valid: !!(r['Last Name'] && r['First Name']),
      })))
    }
    reader.readAsBinaryString(file)
  }

  const closeAssignModal = () => {
    setAssignTarget(null)
    setAssignStep(1)
    setSelectedBatch(null)
    setAssignSearch('')
  }

  if (isFormOpen) return <ApplicantForm initial={emptyForm} mode="add" batches={gipBatches} onSave={handleAddSave} onClose={() => setIsFormOpen(false)} />

  if (editingApplicant) {
    const { id: _id, ...rest } = editingApplicant
    return <ApplicantForm initial={rest} mode="edit" batches={gipBatches} onSave={handleEditSave} onClose={() => setEditingApplicant(null)} />
  }

  if (viewingApplicant) return <ViewApplicantPanel applicant={viewingApplicant} batches={gipBatches} onClose={() => setViewingApplicant(null)} />

  // ── Available batches for assignment (non-completed)
  const assignableBatches = gipBatches.filter(b => b.status !== 'Completed')
  const filteredAssignBatches = assignableBatches.filter(b =>
    b.batchName.toLowerCase().includes(assignSearch.toLowerCase()) ||
    b.batchCode.toLowerCase().includes(assignSearch.toLowerCase())
  )

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

      {/* Assign Batch Modal */}
      {assignTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div>
                <h3 className="text-gray-800 font-semibold">
                  {assignStep === 1 ? 'Assign to Batch' : 'Confirm Assignment'}
                </h3>
                <p className="text-sm text-gray-400 mt-0.5">
                  {assignTarget.firstName} {assignTarget.lastName}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${assignStep >= 1 ? 'bg-brand-blue text-white' : 'bg-gray-200 text-gray-500'}`}>1</span>
                  <ChevronRight size={12} />
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${assignStep >= 2 ? 'bg-brand-blue text-white' : 'bg-gray-200 text-gray-500'}`}>2</span>
                </div>
                <button onClick={closeAssignModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
            </div>

            {assignStep === 1 && (
              <>
                <div className="px-6 pt-4 flex-shrink-0">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-blue"
                      placeholder="Search batches..."
                      value={assignSearch}
                      onChange={e => setAssignSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 pt-3 space-y-2">
                  {filteredAssignBatches.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-400">No available batches.</p>
                      <p className="text-xs text-gray-300 mt-1">Only Planned and Ongoing batches can be assigned.</p>
                    </div>
                  ) : filteredAssignBatches.map(batch => (
                    <button
                      key={batch.id}
                      onClick={() => { setSelectedBatch(batch); setAssignStep(2) }}
                      className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-brand-blue hover:bg-blue-50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">{batch.batchName}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{batch.batchCode}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {batch.assignedOffice} · {batch.startDate} – {batch.endDate}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-semibold ${BATCH_STATUS_COLORS[batch.status]}`}>
                          {batch.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
                  <button onClick={closeAssignModal} className="w-full py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                </div>
              </>
            )}

            {assignStep === 2 && selectedBatch && (
              <>
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-800">{selectedBatch.batchName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{selectedBatch.batchCode}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${BATCH_STATUS_COLORS[selectedBatch.status]}`}>
                        {selectedBatch.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div><span className="text-gray-400">Office:</span> {selectedBatch.assignedOffice || '—'}</div>
                      <div><span className="text-gray-400">Location:</span> {selectedBatch.deploymentLocation || '—'}</div>
                      <div><span className="text-gray-400">Start:</span> {selectedBatch.startDate || '—'}</div>
                      <div><span className="text-gray-400">End:</span> {selectedBatch.endDate || '—'}</div>
                      <div><span className="text-gray-400">Slots:</span> {selectedBatch.slots || '—'}</div>
                      <div><span className="text-gray-400">Allowance:</span> {selectedBatch.allowance ? `₱${selectedBatch.allowance}/mo` : '—'}</div>
                      {selectedBatch.coordinator && <div className="col-span-2"><span className="text-gray-400">Coordinator:</span> {selectedBatch.coordinator}</div>}
                    </div>
                  </div>
                  {assignTarget.assignedBatchId && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
                      This applicant is currently assigned to another batch. Assigning will replace the current assignment.
                    </div>
                  )}
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
                  <button onClick={() => setAssignStep(1)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Back</button>
                  <button
                    onClick={() => handleAssignBatch(selectedBatch)}
                    className="flex-1 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark"
                  >
                    {assignTarget.assignedBatchId ? 'Re-assign' : 'Assign'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* View / Change Assigned Batch Modal */}
      {viewBatchTarget && (() => {
        const currentBatch = gipBatches.find(b => b.id === viewBatchTarget.assignedBatchId)
        if (!currentBatch) return null
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div>
                  <h3 className="text-gray-800 font-semibold">Assigned Batch</h3>
                  <p className="text-sm text-gray-400 mt-0.5">{viewBatchTarget.firstName} {viewBatchTarget.lastName}</p>
                </div>
                <button onClick={() => setViewBatchTarget(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="p-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">{currentBatch.batchName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{currentBatch.batchCode}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${BATCH_STATUS_COLORS[currentBatch.status]}`}>
                      {currentBatch.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div><span className="text-gray-400">Office:</span> {currentBatch.assignedOffice || '—'}</div>
                    <div><span className="text-gray-400">Location:</span> {currentBatch.deploymentLocation || '—'}</div>
                    <div><span className="text-gray-400">Start:</span> {currentBatch.startDate || '—'}</div>
                    <div><span className="text-gray-400">End:</span> {currentBatch.endDate || '—'}</div>
                    <div><span className="text-gray-400">Slots:</span> {currentBatch.slots || '—'}</div>
                    <div><span className="text-gray-400">Allowance:</span> {currentBatch.allowance ? `₱${currentBatch.allowance}/mo` : '—'}</div>
                    {currentBatch.coordinator && <div className="col-span-2"><span className="text-gray-400">Coordinator:</span> {currentBatch.coordinator}</div>}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
                <button
                  onClick={handleUnassignBatch}
                  className="flex-1 py-2 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50"
                >
                  Unassign
                </button>
                <button
                  onClick={() => {
                    setViewBatchTarget(null)
                    openAssignModal(viewBatchTarget)
                  }}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Change Batch
                </button>
                <button
                  onClick={() => setViewBatchTarget(null)}
                  className="flex-1 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      })()}

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
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-brand-blue hover:bg-blue-50 transition-colors"
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f) }}
                onClick={() => document.getElementById('gip-file-input')?.click()}
              >
                <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">Drop your Excel or CSV file here</p>
                <p className="text-xs text-gray-400 mt-1">or click to browse</p>
                <input id="gip-file-input" type="file" accept=".xlsx,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} />
              </div>
              {uploadedFile && importPreview.length > 0 && (
                <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Last Name</th>
                        <th className="px-3 py-2 text-left">First Name</th>
                        <th className="px-3 py-2 text-left">Barangay</th>
                        <th className="px-3 py-2 text-left">Valid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((r, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-3 py-2">{r.lastName}</td>
                          <td className="px-3 py-2">{r.firstName}</td>
                          <td className="px-3 py-2">{r.barangay}</td>
                          <td className="px-3 py-2">{r.valid ? '✓' : '✗'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => { setIsImportModalOpen(false); setUploadedFile(null); setImportPreview([]) }} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button
                disabled={!uploadedFile}
                onClick={() => { setIsImportModalOpen(false); setUploadedFile(null); setImportPreview([]); setSuccessModal({ open: true, message: 'File imported successfully.' }) }}
                className="flex-1 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark disabled:opacity-40"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="h-full overflow-y-auto bg-brand-bg">
      <div className="w-full px-6 py-8">
        <div className="mb-6 flex items-center gap-4">
          <button onClick={onBack} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><ArrowLeft size={24} /></button>
          <p className="text-gray-800 font-bold" style={{ fontSize: 'var(--text-xl)' }}>Government Internship Program (GIP)</p>
        </div>

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
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-blue placeholder:text-gray-900"
                  placeholder="Search by name, barangay, or batch..."
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
              <p className="text-gray-400 text-sm mt-1">
                {applicants.length === 0 ? 'Click "Add Applicant" to register the first GIP applicant.' : 'Try adjusting your search or filters.'}
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
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Assigned Batch</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Status</th>
                    <th className="px-4 py-4 text-left text-white whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(applicant => {
                    const batch = gipBatches.find(b => b.id === applicant.assignedBatchId)
                    const derivedStatus = deriveStatus(applicant, gipBatches)
                    return (
                      <tr key={applicant.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-gray-800 font-medium">{applicant.lastName}, {applicant.firstName} {applicant.middleName}</p>
                          <p className="text-gray-400 text-xs">{applicant.sex} &middot; {applicant.age} yrs</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{applicant.barangay}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {applicant.classification.slice(0, 1).map(c => (
                              <span key={c} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{c}</span>
                            ))}
                            {applicant.classification.length > 1 && (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-500 rounded text-xs">+{applicant.classification.length - 1}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          {batch ? (
                            <div>
                              <p className="text-gray-800 text-sm leading-tight">{batch.batchName}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold mt-1 inline-block ${BATCH_STATUS_COLORS[batch.status]}`}>
                                {batch.status}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={derivedStatus} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={e => {
                              const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                              const menuHeight = 160
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
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Action dropdown portal */}
      {openActionMenuId !== null && menuPos && (() => {
        const applicant = applicants.find(a => a.id === openActionMenuId)
        if (!applicant) return null
        const hasAssignment = applicant.assignedBatchId !== null
        return (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenActionMenuId(null)} />
            <div
              style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}
              className="w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1"
            >
              <button onClick={() => { setViewingApplicant(applicant); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">View</button>
              <button onClick={() => { setEditingApplicant(applicant); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">Edit</button>
              {hasAssignment ? (
                <button
                  onClick={() => { setViewBatchTarget(applicant); setOpenActionMenuId(null) }}
                  className="w-full px-3 py-2 text-left text-xs text-blue-600 hover:bg-blue-50"
                >
                  View / Change Batch
                </button>
              ) : (
                <button
                  onClick={() => { openAssignModal(applicant); setOpenActionMenuId(null) }}
                  className="w-full px-3 py-2 text-left text-xs text-purple-600 hover:bg-purple-50"
                >
                  Assign Batch
                </button>
              )}
              <div className="my-1 border-t border-gray-100" />
              <button onClick={() => { setDeleteConfirm({ open: true, id: applicant.id }); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-red-500 hover:bg-red-50">Delete</button>
            </div>
          </>
        )
      })()}
    </>
  )
}
