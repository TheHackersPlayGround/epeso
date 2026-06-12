import { useState } from 'react'
import ReactDOM from 'react-dom'
import {
  ArrowLeft, Search, Plus, X, ChevronDown,
  Upload, Download, AlertCircle, MoreHorizontal, Users,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import type { ProgramActivity } from '../../contexts/ProgramActivitiesContext'
import { useProgramActivities } from '../../contexts/ProgramActivitiesContext'
import type { SkillsTrainingProfile } from '../../contexts/SkillsTrainingContext'
import { useSkillsTraining } from '../../contexts/SkillsTrainingContext'
import ConfirmModal from '../shared/ConfirmModal'

interface SkillsTrainingViewProps {
  onBack: () => void
}

const BRAND = '#0077BE'
const BRAND_DARK = '#0077BE'

const BATCH_OPTIONS = ['BATCH-001', 'BATCH-002', 'BATCH-003']
const CLASSIFICATION_OPTIONS = ['Student', 'Out of School Youth', 'Women', 'PWD', 'Employed', 'Unemployed']
const QUALIFICATION_OPTIONS = ['EIM/ELECTRICAL', 'COOKERY', 'FORKLIFT', 'BREAD AND PASTRY']
const PURPOSE_OPTIONS = ['For employment', 'For local or overseas work', 'To start a livelihood / business', 'To enhance existing skills']
const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated']

const emptyForm: Omit<SkillsTrainingProfile, 'id'> = {
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

// ─── Shared primitives ─────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: SkillsTrainingProfile['status'] }) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status === 'Accepted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
      {status}
    </span>
  )
}

function SectionDivider({ numeral, title, gray }: { numeral: string; title: string; gray?: boolean }) {
  return (
    <div className={`flex items-center gap-2 mt-8 mb-4 rounded px-4 py-2.5 ${gray ? 'bg-gray-500' : ''}`} style={gray ? {} : { backgroundColor: BRAND }}>
      <span className="text-white text-xs font-bold">{numeral}.</span>
      <span className="text-white text-xs font-bold uppercase tracking-wide">{title}</span>
    </div>
  )
}

const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:border-transparent outline-none placeholder:text-gray-400'
const inpFocus = `${inp} focus:ring-[#0077BE]`
const lbl = 'block text-xs uppercase tracking-wide text-gray-900 font-semibold mb-1'

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

// ─── View Profile Panel ────────────────────────────────────────────────────────
function ViewProfilePanel({ profile, onClose }: { profile: SkillsTrainingProfile; onClose: () => void }) {
  const fullName = `${profile.lastName}, ${profile.firstName}${profile.middleName ? ' ' + profile.middleName : ''}`.trim()

  return (
    <div className="h-full bg-[#E6E7E8] flex flex-col">
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
            <Field label="Assessment Result" value={profile.assessmentResult} />
            <Field label="Remarks" value={profile.remarks} />
          </div>
        </div>
      </div>
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

  const OtherSpecifyField = ({
    field,
    otherField,
    placeholder,
  }: {
    field: 'classificationOther' | 'qualificationOther' | 'purposeOther'
    otherField: keyof Pick<typeof formData, 'classificationOther' | 'qualificationOther' | 'purposeOther'>
    placeholder: string
  }) => {
    const values = formData[otherField] as string[]
    const list = values.length === 0 ? [''] : values
    return (
      <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
        <label className="block text-xs font-medium text-gray-600 mb-2">Others, please specify:</label>
        <div className="space-y-2">
          {list.map((val, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text" value={val}
                onChange={e => {
                  const u = [...list]; u[idx] = e.target.value
                  set({ [field]: u } as Partial<Omit<SkillsTrainingProfile, 'id'>>)
                }}
                className={`${inpFocus} flex-1`} placeholder={placeholder}
              />
              {values.length > 1 && (
                <button type="button" onClick={() => set({ [field]: values.filter((_, i) => i !== idx) } as Partial<Omit<SkillsTrainingProfile, 'id'>>)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => set({ [field]: [...list, ''] } as Partial<Omit<SkillsTrainingProfile, 'id'>>)} className="text-xs mt-1 hover:underline" style={{ color: BRAND }}>+ Add another</button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-[#E6E7E8] flex flex-col">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EDE9FE' }}>
            <Users size={18} style={{ color: BRAND }} />
          </div>
          <p className="text-gray-800 font-semibold" style={{ fontSize: 'var(--text-md)' }}>
            {mode === 'edit' ? 'Edit Profile' : 'Add New Profile — Skills Training'}
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
              <input type="date" className={inpFocus} value={formData.birthdate} onChange={e => handleBirthdate(e.target.value)} />
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

          {/* II. Classification */}
          <SectionDivider numeral="II" title="Classification" />
          <p className="text-xs text-gray-400 -mt-1 mb-3 italic">Please check the box(es) that best apply to you.</p>
          <div className="grid grid-cols-2 gap-3">
            {CLASSIFICATION_OPTIONS.map(opt => (
              <CheckItem key={opt} label={opt} checked={formData.classification.includes(opt)} onChange={() => toggleArr('classification', opt)} />
            ))}
          </div>
          <OtherSpecifyField field="classificationOther" otherField="classificationOther" placeholder="Specify other classification..." />

          {/* III. Desired Qualification */}
          <SectionDivider numeral="III" title="Desired Qualification" />
          <p className="text-xs text-gray-400 -mt-1 mb-3 italic">Select the qualification(s) you wish to train for.</p>
          <div className="grid grid-cols-2 gap-3">
            {QUALIFICATION_OPTIONS.map(opt => (
              <CheckItem key={opt} label={opt} checked={formData.desiredQualification.includes(opt)} onChange={() => toggleArr('desiredQualification', opt)} />
            ))}
          </div>
          <OtherSpecifyField field="qualificationOther" otherField="qualificationOther" placeholder="Specify other qualification..." />

          {/* IV. Purpose of Training */}
          <SectionDivider numeral="IV" title="Purpose of Training" />
          <p className="text-xs text-gray-400 -mt-1 mb-3 italic">Select all purposes that apply to your training application.</p>
          <div className="space-y-3">
            {PURPOSE_OPTIONS.map(opt => (
              <CheckItem key={opt} label={opt} checked={formData.purposeOfTraining.includes(opt)} onChange={() => toggleArr('purposeOfTraining', opt)} />
            ))}
          </div>
          <OtherSpecifyField field="purposeOther" otherField="purposeOther" placeholder="Specify other purpose..." />

          {/* V. Attached Documents */}
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
                const inp = e.currentTarget.previousSibling as HTMLInputElement
                const val = inp?.value?.trim()
                if (val) { set({ attachedDocuments: [...formData.attachedDocuments, val] }); inp.value = '' }
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

          {/* VI. PESO Office Only */}
          <SectionDivider numeral="VI" title="For PESO Office Only" gray />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Date Application Received</label>
              <input type="date" className={inpFocus} value={formData.dateApplicationReceived} onChange={e => set({ dateApplicationReceived: e.target.value })} />
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
            <div>
              <label className={lbl}>Assessment Result</label>
              <input className={inpFocus} value={formData.assessmentResult} onChange={e => set({ assessmentResult: e.target.value })} placeholder="e.g. Passed, Failed, Not yet assessed" />
            </div>
            <div>
              <label className={lbl}>Remarks</label>
              <input className={inpFocus} value={formData.remarks} onChange={e => set({ remarks: e.target.value })} placeholder="Optional" />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">Cancel</button>
            <button onClick={handleSave} className="px-8 py-2 text-white rounded-lg text-sm" style={{ backgroundColor: BRAND }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = BRAND_DARK)} onMouseLeave={e => (e.currentTarget.style.backgroundColor = BRAND)}>
              {mode === 'edit' ? 'Save Changes' : 'Save Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main List View ────────────────────────────────────────────────────────────
export default function SkillsTrainingView({ onBack }: SkillsTrainingViewProps) {
  const { activities } = useProgramActivities()
  const skillsTrainings = activities.filter((a): a is ProgramActivity => a.program === 'Skills Training')
  const plannedTrainings = skillsTrainings.filter(t => t.status === 'Planned')

  const { profiles, setProfiles } = useSkillsTraining()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [viewingProfile, setViewingProfile] = useState<SkillsTrainingProfile | null>(null)
  const [editingProfile, setEditingProfile] = useState<SkillsTrainingProfile | null>(null)

  const [assigningProfile, setAssigningProfile] = useState<SkillsTrainingProfile | null>(null)
  const [assignSearch, setAssignSearch] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false)
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})

  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<{ lastName: string; firstName: string; batchNo: string; status: string; valid: boolean }[]>([])
  const [importAllRows, setImportAllRows] = useState<Record<string, string>[]>([])

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number | null }>({ open: false, id: null })
  const [successModal, setSuccessModal] = useState<{ open: boolean; message: string }>({ open: false, message: '' })

  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)

  const availableFilters = [
    { id: 'classification', label: 'Classification', options: CLASSIFICATION_OPTIONS },
    { id: 'desiredQualification', label: 'Desired Qualification', options: [...QUALIFICATION_OPTIONS, 'Others'] },
    { id: 'purposeOfTraining', label: 'Purpose of Training', options: [...PURPOSE_OPTIONS, 'Others'] },
    { id: 'status', label: 'Status', options: ['Accepted', 'Waitlisted'] },
    { id: 'batchNo', label: 'Training Batch No.', options: BATCH_OPTIONS },
    { id: 'sex', label: 'Sex', options: ['Male', 'Female'] },
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

  const filteredProfiles = profiles.filter(p => {
    const fullName = `${p.firstName} ${p.lastName} ${p.middleName}`.toLowerCase()
    const matchesSearch = searchQuery === '' ||
      fullName.includes(searchQuery.toLowerCase()) ||
      p.classification.join(' ').toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.desiredQualification.join(' ').toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.trainingBatchNo.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilters = activeFilters.every(filterId => {
      const val = filterValues[filterId]
      if (!val) return true
      switch (filterId) {
        case 'classification': return p.classification.includes(val)
        case 'desiredQualification': return p.desiredQualification.includes(val) || (val === 'Others' && p.qualificationOther.length > 0)
        case 'purposeOfTraining': return p.purposeOfTraining.includes(val) || (val === 'Others' && p.purposeOther.length > 0)
        case 'status': return p.status === val
        case 'batchNo': return p.trainingBatchNo === val
        case 'sex': return p.sex === val
        default: return true
      }
    })
    return matchesSearch && matchesFilters
  })

  const getTrainingName = (id: number | null): string => {
    if (!id) return '—'
    return skillsTrainings.find(a => a.id === id)?.title ?? '—'
  }
  const getTrainingStatus = (id: number | null): string | null => {
    if (!id) return null
    return skillsTrainings.find(a => a.id === id)?.status ?? null
  }
  const trainingStatusBadge = (s: string) =>
    s === 'Planned' ? 'bg-yellow-100 text-yellow-700' : s === 'Ongoing' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'

  // ── Export ──────────────────────────────────────────────────────────────────
  const exportRows = (rows: SkillsTrainingProfile[]) => rows.map(p => ({
    'Last Name': p.lastName, 'First Name': p.firstName, 'Middle Name': p.middleName,
    'Birthdate': p.birthdate, 'Age': p.age, 'Sex': p.sex, 'Civil Status': p.civilStatus,
    'Address': p.address, 'Contact #': p.contactNumber,
    'Classification': p.classification.join(', '),
    'Desired Qualification': p.desiredQualification.join(', '),
    'Purpose of Training': p.purposeOfTraining.join(', '),
    'Batch No.': p.trainingBatchNo, 'Status': p.status,
    'Assessment Result': p.assessmentResult,
    'Date Applied': p.dateApplicationReceived, 'Remarks': p.remarks,
  }))

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows(filteredProfiles))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Skills Training')
    XLSX.writeFile(wb, `SkillsTraining_${new Date().toISOString().split('T')[0]}.xlsx`)
    setIsExportDropdownOpen(false)
  }
  const exportToCSV = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows(filteredProfiles))
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([XLSX.utils.sheet_to_csv(ws)], { type: 'text/csv;charset=utf-8;' }))
    link.download = `SkillsTraining_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    setIsExportDropdownOpen(false)
  }

  // ── Import ──────────────────────────────────────────────────────────────────
  const handleFileUpload = (file: File) => {
    setUploadedFile(file)
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary' })
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as Record<string, string>[]
        setImportAllRows(rows)
        setImportPreview(rows.slice(0, 5).map(r => ({
          lastName: r['Last Name'] || '',
          firstName: r['First Name'] || '',
          batchNo: r['Batch No.'] || '',
          status: r['Status'] || '',
          valid: !!(r['Last Name'] && r['First Name']),
        })))
      } catch { alert('Error reading file. Please use the correct format.') }
    }
    reader.readAsBinaryString(file)
  }

  const closeImportModal = () => {
    setIsImportModalOpen(false); setUploadedFile(null); setImportPreview([]); setImportAllRows([])
  }

  const handleImport = () => {
    const valid = importAllRows.filter(r => r['Last Name'] && r['First Name'])
    const newProfiles: SkillsTrainingProfile[] = valid.map((r, i) => ({
      ...emptyForm, id: Date.now() + i,
      lastName: r['Last Name'] || '', firstName: r['First Name'] || '',
      middleName: r['Middle Name'] || '', address: r['Address'] || '',
      contactNumber: r['Contact #'] || '', trainingBatchNo: r['Batch No.'] || '',
      status: (['Accepted', 'Waitlisted'].includes(r['Status']) ? r['Status'] : 'Waitlisted') as SkillsTrainingProfile['status'],
      dateApplicationReceived: r['Date Applied'] || '',
      assessmentResult: r['Assessment Result'] || '', remarks: r['Remarks'] || '',
    }))
    setProfiles(prev => [...newProfiles, ...prev])
    closeImportModal()
    setSuccessModal({ open: true, message: `Successfully imported ${newProfiles.length} profile(s)!` })
  }

  // ── Assign ──────────────────────────────────────────────────────────────────
  const handleAssignTraining = (trainingId: number) => {
    if (!assigningProfile) return
    setProfiles(prev => prev.map(p => p.id === assigningProfile.id ? { ...p, assignedTrainingId: trainingId } : p))
    setAssigningProfile(null); setAssignSearch('')
    setSuccessModal({ open: true, message: 'Training activity assigned successfully.' })
  }
  const handleUnassignTraining = () => {
    if (!assigningProfile) return
    setProfiles(prev => prev.map(p => p.id === assigningProfile.id ? { ...p, assignedTrainingId: null } : p))
    setAssigningProfile(null); setAssignSearch('')
    setSuccessModal({ open: true, message: 'Assigned activity has been removed.' })
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = (id: number) => {
    setProfiles(prev => prev.filter(p => p.id !== id))
    setDeleteConfirm({ open: false, id: null })
    setSuccessModal({ open: true, message: 'Profile has been deleted.' })
  }

  // ── Sub-views ───────────────────────────────────────────────────────────────
  if (isFormOpen) {
    return (
      <AddProfileForm
        onClose={() => setIsFormOpen(false)}
        onSave={data => {
          setProfiles(prev => [{ ...data, id: Date.now() }, ...prev])
          setIsFormOpen(false)
          setSuccessModal({ open: true, message: 'Profile added successfully!' })
        }}
      />
    )
  }
  if (editingProfile) {
    const { id: _id, ...rest } = editingProfile
    return (
      <AddProfileForm mode="edit" initialData={rest}
        onClose={() => setEditingProfile(null)}
        onSave={data => {
          setProfiles(prev => prev.map(p => p.id === editingProfile.id ? { ...data, id: editingProfile.id } : p))
          setEditingProfile(null)
          setSuccessModal({ open: true, message: 'Profile updated successfully!' })
        }}
      />
    )
  }
  if (viewingProfile) {
    return <ViewProfilePanel profile={viewingProfile} onClose={() => setViewingProfile(null)} />
  }

  // ── Main list view ──────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .st-scroll::-webkit-scrollbar { height: 10px; }
        .st-scroll::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 5px; }
        .st-scroll::-webkit-scrollbar-thumb { background: #8B5CF6; border-radius: 5px; }
        .st-scroll::-webkit-scrollbar-thumb:hover { background: #7C3AED; }
      `}</style>

      <ConfirmModal
        isOpen={deleteConfirm.open} type="confirm"
        title="Delete Profile"
        message="Are you sure you want to delete this profile? This action cannot be undone."
        confirmText="Delete" cancelText="Cancel"
        onConfirm={() => deleteConfirm.id !== null && handleDelete(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
      />
      <ConfirmModal
        isOpen={successModal.open} type="success"
        title="Success" message={successModal.message}
        confirmText="OK"
        onConfirm={() => setSuccessModal({ open: false, message: '' })}
        onCancel={() => setSuccessModal({ open: false, message: '' })}
      />

      {/* Assign Training Modal */}
      {assigningProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div>
                <p className="text-gray-800 font-semibold">Assign Activity</p>
                <p className="text-sm text-gray-400 mt-0.5">{assigningProfile.firstName} {assigningProfile.lastName}</p>
              </div>
              <button onClick={() => { setAssigningProfile(null); setAssignSearch('') }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            {assigningProfile.assignedTrainingId && (() => {
              const assigned = skillsTrainings.find(t => t.id === assigningProfile.assignedTrainingId)
              return assigned ? (
                <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
                  <div className="border border-gray-200 rounded-lg px-4 py-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">{assigned.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{assigned.date}{assigned.facilitator ? ` · ${assigned.facilitator}` : ''}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${trainingStatusBadge(assigned.status)}`}>{assigned.status}</span>
                  </div>
                </div>
              ) : null
            })()}
            <div className="px-6 py-2 bg-amber-50 border-b border-amber-100 flex-shrink-0 flex items-center gap-2">
              <AlertCircle size={13} className="text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700">Only <span className="font-semibold">Planned</span> trainings can be assigned.</p>
            </div>
            <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" placeholder="Search trainings..." value={assignSearch} onChange={e => setAssignSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent outline-none" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {plannedTrainings.filter(t => assignSearch === '' || t.title.toLowerCase().includes(assignSearch.toLowerCase())).map(training => {
                const isAssigned = assigningProfile.assignedTrainingId === training.id
                return (
                  <button key={training.id} onClick={() => handleAssignTraining(training.id)} className={`w-full px-6 py-4 text-left border-b border-gray-100 transition-colors flex items-start justify-between gap-4 ${isAssigned ? 'bg-purple-50' : 'hover:bg-purple-50'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-gray-800 font-medium">{training.title}</span>
                        {isAssigned && <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full">Currently assigned</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">{training.date}</span>
                        {training.facilitator && <><span className="text-xs text-gray-400">·</span><span className="text-xs text-gray-500">{training.facilitator}</span></>}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 bg-yellow-100 text-yellow-700">Planned</span>
                  </button>
                )
              })}
              {plannedTrainings.filter(t => assignSearch === '' || t.title.toLowerCase().includes(assignSearch.toLowerCase())).length === 0 && (
                <div className="py-12 text-center">
                  <AlertCircle size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-gray-400 text-sm">{assignSearch ? 'No planned trainings match your search' : 'No planned trainings available'}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 flex flex-col gap-2">
              {assigningProfile.assignedTrainingId && (
                <button onClick={handleUnassignTraining} className="w-full py-2.5 border border-red-200 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors">Remove Assigned Activity</button>
              )}
              <button onClick={() => { setAssigningProfile(null); setAssignSearch('') }} className="w-full py-2.5 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <p className="text-gray-800 font-semibold">Import Skills Training Profiles</p>
              <button onClick={closeImportModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <label className="block w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-[#8B5CF6] hover:bg-purple-50 transition-colors"
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f) }}>
                <Upload size={28} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">{uploadedFile ? uploadedFile.name : 'Click to upload or drag and drop'}</p>
                <p className="text-xs text-gray-400 mt-1">.xlsx or .csv files</p>
                <input type="file" accept=".xlsx,.csv" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]) }} />
              </label>
              {importPreview.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Preview ({importPreview.length} records found):</p>
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {importPreview.map((row, i) => (
                      <div key={i} className={`px-3 py-2 flex items-center justify-between text-xs ${row.valid ? '' : 'bg-red-50'}`}>
                        <span className="text-gray-700">{row.firstName} {row.lastName}</span>
                        <span className="text-gray-500">{row.batchNo || '—'}</span>
                        {!row.valid && <span className="text-red-500 ml-2">Invalid</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={closeImportModal} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={handleImport} disabled={importPreview.filter(r => r.valid).length === 0} className="flex-1 py-2 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: BRAND }}>
                Import {importPreview.filter(r => r.valid).length > 0 ? `(${importPreview.filter(r => r.valid).length})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main scrollable content */}
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="mb-6 flex items-center gap-4">
            <button onClick={onBack} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft size={24} />
            </button>
            <p className="text-gray-800 font-bold" style={{ fontSize: 'var(--text-xl)' }}>
              Skills Training Program
            </p>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-xl shadow-md p-4 mb-4">
            <div className="flex gap-3">
              <button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors" style={{ backgroundColor: BRAND }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = BRAND_DARK)} onMouseLeave={e => (e.currentTarget.style.backgroundColor = BRAND)}>
                <Plus size={20} /><span>Add Profile</span>
              </button>
              <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg transition-colors">
                <Upload size={20} /><span>Import</span>
              </button>
              <div className="relative">
                <button onClick={() => setIsExportDropdownOpen(v => !v)} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg transition-colors">
                  <Download size={20} /><span>Export</span>
                </button>
                {isExportDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsExportDropdownOpen(false)} />
                    <div className="absolute left-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <button onClick={exportToExcel} className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-t-lg text-sm"><Download size={16} /> Excel (.xlsx)</button>
                      <button onClick={exportToCSV} className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2 rounded-b-lg border-t border-gray-100 text-sm"><Download size={16} /> CSV (.csv)</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Search + Filter */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name, classification, batch, or qualification..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent outline-none"
                />
              </div>
              <div className="relative">
                <button onClick={() => setIsFilterDropdownOpen(v => !v)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors whitespace-nowrap text-sm text-gray-700">
                  <Plus size={16} /><span>Filter By</span><ChevronDown size={14} className="text-gray-500" />
                </button>
                {isFilterDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsFilterDropdownOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      {availableFilters.map(filter => (
                        <button key={filter.id} onClick={() => handleAddFilter(filter.id)} disabled={activeFilters.includes(filter.id)} className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${activeFilters.includes(filter.id) ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'text-gray-700'}`}>
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
                    <div key={filterId} className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-full">
                      <span className="text-sm text-purple-700 font-medium">{filter?.label}:</span>
                      <select value={filterValues[filterId] || ''} onChange={e => setFilterValues(prev => ({ ...prev, [filterId]: e.target.value }))} onClick={e => e.stopPropagation()} className="text-sm bg-transparent border-none focus:outline-none text-purple-700 font-medium pr-1 cursor-pointer">
                        {filter?.options.map(opt => <option key={opt}>{opt}</option>)}
                      </select>
                      <button onClick={() => handleRemoveFilter(filterId)} className="text-purple-700 hover:text-purple-900"><X size={14} /></button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {filteredProfiles.length === 0 ? (
              <div className="text-center py-20">
                <Users size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-600 text-lg">No profiles found</p>
                <p className="text-gray-400 text-sm mt-1">
                  {profiles.length === 0 ? 'Click "Add Profile" to register the first applicant.' : 'Try adjusting your search or filters.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto st-scroll">
                <table className="w-full" style={{ tableLayout: 'auto' }}>
                  <thead>
                    <tr style={{ backgroundColor: BRAND }}>
                      <th className="px-4 py-3 text-left text-white font-semibold text-xs whitespace-nowrap" style={{ minWidth: 180 }}>Applicant Name</th>
                      <th className="px-4 py-3 text-left text-white font-semibold text-xs whitespace-nowrap" style={{ minWidth: 130 }}>Classification</th>
                      <th className="px-4 py-3 text-left text-white font-semibold text-xs whitespace-nowrap" style={{ minWidth: 160 }}>Desired Qualification</th>
                      <th className="px-4 py-3 text-left text-white font-semibold text-xs whitespace-nowrap" style={{ minWidth: 200 }}>Purpose of Training</th>
                      <th className="px-4 py-3 text-left text-white font-semibold text-xs whitespace-nowrap" style={{ minWidth: 200 }}>Assigned Training</th>
                      <th className="px-4 py-3 text-left text-white font-semibold text-xs whitespace-nowrap" style={{ minWidth: 100 }}>Status</th>
                      <th className="px-4 py-3 text-left text-white font-semibold text-xs whitespace-nowrap" style={{ minWidth: 110 }}>Date Applied</th>
                      <th className="px-4 py-3 text-left text-white font-semibold text-xs whitespace-nowrap" style={{ minWidth: 80 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProfiles.map(profile => (
                      <tr key={profile.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-gray-800 font-medium text-sm">{profile.lastName}, {profile.firstName}{profile.middleName ? ` ${profile.middleName.charAt(0)}.` : ''}</p>
                          <p className="text-gray-400 text-xs">{profile.sex}{profile.age ? ` · ${profile.age} yrs` : ''}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {profile.classification.slice(0, 1).map(c => <span key={c} className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">{c}</span>)}
                            {(profile.classification.length + profile.classificationOther.filter(Boolean).length) > 1 && (
                              <span className="px-1.5 py-0.5 bg-purple-50 text-purple-500 rounded text-xs">+{profile.classification.length + profile.classificationOther.filter(Boolean).length - 1}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {profile.desiredQualification.slice(0, 1).map(q => <span key={q} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{q}</span>)}
                            {(profile.desiredQualification.length + profile.qualificationOther.filter(Boolean).length) > 1 && (
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded text-xs">+{profile.desiredQualification.length + profile.qualificationOther.filter(Boolean).length - 1}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {profile.purposeOfTraining.slice(0, 1).map(pt => <span key={pt} className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-xs max-w-[120px] truncate inline-block">{pt}</span>)}
                            {profile.purposeOfTraining.length > 1 && <span className="px-1.5 py-0.5 bg-green-50 text-green-500 rounded text-xs">+{profile.purposeOfTraining.length - 1}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {profile.assignedTrainingId ? (
                            <div>
                              <p className="text-sm text-gray-800 line-clamp-1">{getTrainingName(profile.assignedTrainingId)}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {profile.trainingBatchNo && <span className="text-xs text-gray-400">{profile.trainingBatchNo}</span>}
                                {(() => { const ts = getTrainingStatus(profile.assignedTrainingId); return ts ? <span className={`px-1.5 py-0.5 rounded-full text-xs ${trainingStatusBadge(ts)}`}>{ts}</span> : null })()}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={profile.status} /></td>
                        <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">{profile.dateApplicationReceived || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={e => {
                              const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                              const showAbove = window.innerHeight - rect.bottom < 148
                              setMenuPos({ top: showAbove ? rect.top - 148 : rect.bottom + 4, right: window.innerWidth - rect.right })
                              setOpenActionMenuId(openActionMenuId === profile.id ? null : profile.id)
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

      {/* Action dropdown menu (portal) */}
      {openActionMenuId !== null && menuPos && (() => {
        const profile = profiles.find(p => p.id === openActionMenuId)
        if (!profile) return null
        return ReactDOM.createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenActionMenuId(null)} />
            <div style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }} className="w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
              <button onClick={() => { setViewingProfile(profile); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">View</button>
              <button onClick={() => { setEditingProfile(profile); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">Edit</button>
              <button onClick={() => { setAssigningProfile(profile); setAssignSearch(''); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-purple-600 hover:bg-purple-50">Assign Activity</button>
              <div className="my-1 border-t border-gray-100" />
              <button onClick={() => { setDeleteConfirm({ open: true, id: profile.id }); setOpenActionMenuId(null) }} className="w-full px-3 py-2 text-left text-xs text-red-500 hover:bg-red-50">Delete</button>
            </div>
          </>,
          document.body
        )
      })()}
    </>
  )
}
