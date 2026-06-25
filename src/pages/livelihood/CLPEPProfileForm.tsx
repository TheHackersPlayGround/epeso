import { useState, useRef, useEffect } from 'react'
import { X, Users, Plus, Paperclip, Upload, ChevronDown } from 'lucide-react'
import DatePicker from '../../components/DatePicker'
import type { LivelihoodBeneficiary, LivelihoodStatus } from '../../contexts/LivelihoodContext'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: LivelihoodStatus[] = ['Accepted', 'Waitlisted', 'Rejected']

const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated', 'Annulled'] as const

const CHILD_LABOR_STATUS_OPTIONS = [
  'Child Laborer',
  'At Risk of Child Labor',
  'Former Child Laborer',
  'Not Yet Assessed',
] as const

const SCHOOL_STATUS_OPTIONS = [
  'Currently Enrolled',
  'Out of School',
  'ALS Learner',
  'Graduated',
] as const

const RELATIONSHIP_OPTIONS = ['Father', 'Mother', 'Guardian', 'Grandparent', 'Relative', 'Others'] as const

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V'] as const

// ─── Custom Select Dropdown ───────────────────────────────────────────────────

type SelectDropdownProps = {
  id: string
  value: string
  options: readonly string[]
  placeholder?: string
  onChange: (value: string) => void
  disabled?: boolean
}

function SelectDropdown({ id, value, options, placeholder = 'Select', onChange, disabled }: SelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  function handleToggle() {
    if (disabled) return
    if (!isOpen && ref.current) {
      const rect = ref.current.getBoundingClientRect()
      const estimatedHeight = Math.min((options.length + 1) * 42, 240)
      setDropUp(window.innerHeight - rect.bottom < estimatedHeight + 8)
    }
    setIsOpen(o => !o)
  }

  return (
    <div ref={ref} className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between px-4 py-2 border rounded-full text-sm text-gray-900 bg-white transition-colors outline-none disabled:bg-gray-50 disabled:cursor-default ${
          isOpen ? 'border-brand-blue ring-2 ring-brand-blue/20' : 'border-gray-300 hover:border-brand-blue'
        }`}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>{value || placeholder}</span>
        <ChevronDown size={16} className={`text-gray-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className={`absolute left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1 max-h-60 overflow-y-auto ${
            dropUp ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          <li
            role="option"
            aria-selected={value === ''}
            onClick={() => { onChange(''); setIsOpen(false) }}
            className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
              value === '' ? 'bg-blue-100 text-brand-blue font-medium' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {placeholder}
          </li>
          {options.map(opt => (
            <li
              key={opt}
              role="option"
              aria-selected={value === opt}
              onClick={() => { onChange(opt); setIsOpen(false) }}
              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                value === opt ? 'bg-blue-100 text-brand-blue font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const STEPS = [
  { id: 1, label: 'PERSONAL INFORMATION' },
  { id: 2, label: 'ADDRESS INFORMATION' },
  { id: 3, label: 'CHILD LABOR INFORMATION' },
  { id: 4, label: 'PARENT / GUARDIAN' },
  { id: 5, label: 'PESO OFFICE ONLY' },
] as const

// ─── Shared CSS class strings ─────────────────────────────────────────────────

const inputClass = [
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900',
  'focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none',
  'placeholder:text-gray-500 disabled:bg-gray-50 disabled:cursor-default',
].join(' ')

const selectClass = inputClass + ' bg-white'

const labelClass = 'block text-gray-700 mb-2 text-xs font-semibold uppercase'

// ─── Empty record ─────────────────────────────────────────────────────────────

export const EMPTY_CLPEP_RECORD: Omit<LivelihoodBeneficiary, 'id'> = {
  name: '',
  service: 'CLPEP',
  status: 'Accepted',
  firstName: '',
  lastName: '',
  middleName: '',
  nameExtension: '',
  sex: '',
  birthdate: '',
  age: 0,
  civilStatus: '',
  contactNumber: '',
  email: '',
  houseBlockLotNo: '',
  streetPurok: '',
  barangay: '',
  cityMunicipality: 'Tangub City',
  province: 'Misamis Occidental',
  childLaborStatus: '',
  schoolStatus: '',
  natureOfWork: '',
  currentlyWorking: undefined,
  hoursWorkedPerWeek: '',
  schoolName: '',
  gradeYearLevel: '',
  guardianName: '',
  guardianRelationship: '',
  guardianContactNumber: '',
  dateApplied: '',
  cooperativeName: '',
  cooperativeRole: '',
  remarks: '',
  caseReportFile: '',
  attachedForms: [],
  dateApplicationReceived: '',
  receivedBy: '',
}

// ─── Props ────────────────────────────────────────────────────────────────────

type CLPEPProfileFormProps = {
  initial: Omit<LivelihoodBeneficiary, 'id'>
  mode: 'add' | 'edit' | 'view'
  onSave: (data: Omit<LivelihoodBeneficiary, 'id'>) => void
  onClose: () => void
  onEdit?: () => void
}

// ─── Main Wizard Component ────────────────────────────────────────────────────

export default function CLPEPProfileForm({ initial, mode, onSave, onClose, onEdit }: CLPEPProfileFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<Omit<LivelihoodBeneficiary, 'id'>>({
    ...EMPTY_CLPEP_RECORD,
    ...initial,
  })
  const [newFormName, setNewFormName] = useState('')
  const [isAddingForm, setIsAddingForm] = useState(false)

  const isViewMode = mode === 'view'

  // ── Helpers ────────────────────────────────────────────────────────

  function updateField(changes: Partial<Omit<LivelihoodBeneficiary, 'id'>>) {
    if (isViewMode) return
    setFormData(prev => ({ ...prev, ...changes }))
  }

  function handleBirthdate(value: string) {
    const ageCalculated = value
      ? Math.floor((Date.now() - new Date(value).getTime()) / (365.25 * 24 * 3600 * 1000))
      : 0
    updateField({ birthdate: value, age: ageCalculated })
  }

  function handleNext() {
    if (currentStep < STEPS.length) setCurrentStep(step => step + 1)
  }

  function handlePrevious() {
    if (currentStep > 1) setCurrentStep(step => step - 1)
  }

  function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault()
    if (!formData.lastName || !formData.firstName) {
      alert('Last name and first name are required.')
      return
    }
    const givenNames = [formData.firstName, formData.middleName, formData.nameExtension]
      .filter(Boolean)
      .join(' ')
    const fullName = `${formData.lastName}, ${givenNames}`
    onSave({ ...formData, name: fullName })
  }

  function handleSaveAsDraft() {
    const givenNames = [formData.firstName, formData.middleName, formData.nameExtension]
      .filter(Boolean)
      .join(' ')
    const fullName = (formData.lastName
      ? `${formData.lastName}, ${givenNames}`
      : givenNames) || 'Draft'
    onSave({ ...formData, name: fullName, status: 'Pending' })
  }

  function handleStartAddingForm() {
    setIsAddingForm(true)
    setNewFormName('')
  }

  function handleCommitForm() {
    if (!newFormName.trim()) return
    const current = formData.attachedForms ?? []
    updateField({ attachedForms: [...current, newFormName.trim()] })
    setNewFormName('')
    setIsAddingForm(false)
  }

  function handleCancelAddingForm() {
    setNewFormName('')
    setIsAddingForm(false)
  }

  function handleAttachFileToForm(index: number, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const current = [...(formData.attachedForms ?? [])]
    current[index] = file.name
    updateField({ attachedForms: current })
    event.target.value = ''
  }

  function handleRemoveAttachment(index: number) {
    const current = formData.attachedForms ?? []
    updateField({ attachedForms: current.filter((_, i) => i !== index) })
  }

  function handleCaseReportUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    updateField({ caseReportFile: file.name })
    event.target.value = ''
  }

  // ── Section header ─────────────────────────────────────────────────

  function SectionHeader({ title }: { title: string }) {
    return (
      <div className="bg-brand-blue text-white px-4 py-3 font-bold uppercase text-sm">
        {title}
      </div>
    )
  }

  // ── Step renderers ─────────────────────────────────────────────────

  function renderStep1() {
    return (
      <div className="space-y-5">
        <SectionHeader title="I. PERSONAL INFORMATION" />

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label htmlFor="clpep-lastName" className={labelClass}>
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              id="clpep-lastName"
              className={inputClass}
              placeholder="Enter last name"
              value={formData.lastName ?? ''}
              onChange={e => updateField({ lastName: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="clpep-firstName" className={labelClass}>
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              id="clpep-firstName"
              className={inputClass}
              placeholder="Enter first name"
              value={formData.firstName ?? ''}
              onChange={e => updateField({ firstName: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="clpep-middleName" className={labelClass}>Middle Name</label>
            <input
              id="clpep-middleName"
              className={inputClass}
              placeholder="Enter middle name"
              value={formData.middleName ?? ''}
              onChange={e => updateField({ middleName: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="clpep-nameExtension" className={labelClass}>Extension Name</label>
            <input
              id="clpep-nameExtension"
              className={inputClass}
              placeholder="Jr., Sr., III"
              value={formData.nameExtension ?? ''}
              onChange={e => updateField({ nameExtension: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          <div>
            <label htmlFor="clpep-birthdate" className={labelClass}>
              Birthdate <span className="text-red-500">*</span>
            </label>
            <DatePicker
              id="clpep-birthdate"
              className={inputClass}
              value={formData.birthdate ?? ''}
              onChange={handleBirthdate}
            />
          </div>
          <div>
            <label htmlFor="clpep-age" className={labelClass}>Age</label>
            <input
              id="clpep-age"
              type="number"
              className={inputClass + ' bg-gray-50'}
              value={formData.age || ''}
              readOnly
            />
          </div>
          <div>
            <label htmlFor="clpep-sex" className={labelClass}>
              Sex <span className="text-red-500">*</span>
            </label>
            <select
              id="clpep-sex"
              className={selectClass}
              value={formData.sex ?? ''}
              onChange={e => updateField({ sex: e.target.value })}
            >
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
            </select>
          </div>
          <div>
            <label htmlFor="clpep-civilStatus" className={labelClass}>Civil Status</label>
            <select
              id="clpep-civilStatus"
              className={selectClass}
              value={formData.civilStatus ?? ''}
              onChange={e => updateField({ civilStatus: e.target.value })}
            >
              <option value="">Select</option>
              {CIVIL_STATUS_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="clpep-contactNumber" className={labelClass}>Contact Number</label>
            <input
              id="clpep-contactNumber"
              className={inputClass}
              placeholder="09XXXXXXXXX"
              value={formData.contactNumber ?? ''}
              onChange={e => updateField({ contactNumber: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label htmlFor="clpep-email" className={labelClass}>Email Address</label>
          <input
            id="clpep-email"
            type="email"
            className={inputClass}
            placeholder="juan.delacruz@example.com"
            value={formData.email ?? ''}
            onChange={e => updateField({ email: e.target.value })}
          />
        </div>
      </div>
    )
  }

  function renderStep2() {
    return (
      <div className="space-y-5">
        <SectionHeader title="II. ADDRESS INFORMATION" />

        <div>
          <label htmlFor="clpep-houseBlockLot" className={labelClass}>
            House / Block / Lot Number
          </label>
          <input
            id="clpep-houseBlockLot"
            className={inputClass}
            placeholder="Enter house, block, or lot number"
            value={formData.houseBlockLotNo ?? ''}
            onChange={e => updateField({ houseBlockLotNo: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="clpep-streetPurok" className={labelClass}>Street / Purok / Zone</label>
          <input
            id="clpep-streetPurok"
            className={inputClass}
            placeholder="Enter street, purok, or zone"
            value={formData.streetPurok ?? ''}
            onChange={e => updateField({ streetPurok: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="clpep-barangay" className={labelClass}>
              Barangay <span className="text-red-500">*</span>
            </label>
            <input
              id="clpep-barangay"
              className={inputClass}
              placeholder="Enter barangay"
              value={formData.barangay ?? ''}
              onChange={e => updateField({ barangay: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="clpep-city" className={labelClass}>Municipality / City</label>
            <input
              id="clpep-city"
              className={inputClass}
              value={formData.cityMunicipality ?? ''}
              onChange={e => updateField({ cityMunicipality: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="clpep-province" className={labelClass}>Province</label>
            <input
              id="clpep-province"
              className={inputClass}
              value={formData.province ?? ''}
              onChange={e => updateField({ province: e.target.value })}
            />
          </div>
        </div>
      </div>
    )
  }

  function renderStep3() {
    return (
      <div className="space-y-5">
        <SectionHeader title="III. CHILD LABOR INFORMATION" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="clpep-childLaborStatus" className={labelClass}>Child Labor Status</label>
            <SelectDropdown
              id="clpep-childLaborStatus"
              value={formData.childLaborStatus ?? ''}
              options={CHILD_LABOR_STATUS_OPTIONS}
              onChange={v => updateField({ childLaborStatus: v })}
              disabled={isViewMode}
            />
          </div>
          <div>
            <label htmlFor="clpep-schoolStatus" className={labelClass}>School Status</label>
            <SelectDropdown
              id="clpep-schoolStatus"
              value={formData.schoolStatus ?? ''}
              options={SCHOOL_STATUS_OPTIONS}
              onChange={v => updateField({ schoolStatus: v })}
              disabled={isViewMode}
            />
          </div>
        </div>

        <div>
          <label htmlFor="clpep-natureOfWork" className={labelClass}>Nature of Work</label>
          <input
            id="clpep-natureOfWork"
            className={inputClass}
            placeholder="Enter nature of work"
            value={formData.natureOfWork ?? ''}
            onChange={e => updateField({ natureOfWork: e.target.value })}
          />
        </div>

        <div>
          <label className={labelClass}>Currently Working?</label>
          <div className="flex gap-6 mt-1">
            {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map(option => (
              <label key={option.label} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="clpep-currentlyWorking"
                  checked={formData.currentlyWorking === option.value}
                  onChange={() => updateField({ currentlyWorking: option.value })}
                  className="w-4 h-4 accent-brand-blue"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="clpep-hoursWorkedPerWeek" className={labelClass}>Hours Worked Per Week</label>
          <input
            id="clpep-hoursWorkedPerWeek"
            type="number"
            min="0"
            className={inputClass}
            placeholder="Enter hours per week"
            value={formData.hoursWorkedPerWeek ?? ''}
            onChange={e => updateField({ hoursWorkedPerWeek: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="clpep-schoolName" className={labelClass}>School Name</label>
            <input
              id="clpep-schoolName"
              className={inputClass}
              placeholder="Enter school name"
              value={formData.schoolName ?? ''}
              onChange={e => updateField({ schoolName: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="clpep-gradeYearLevel" className={labelClass}>Grade / Year Level</label>
            <input
              id="clpep-gradeYearLevel"
              className={inputClass}
              placeholder="e.g. Grade 7, 2nd Year"
              value={formData.gradeYearLevel ?? ''}
              onChange={e => updateField({ gradeYearLevel: e.target.value })}
            />
          </div>
        </div>
      </div>
    )
  }

  function renderStep4() {
    return (
      <div className="space-y-5">
        <SectionHeader title="IV. PARENT / GUARDIAN INFORMATION" />

        <div>
          <label htmlFor="clpep-guardianName" className={labelClass}>
            Parent / Guardian Name <span className="text-red-500">*</span>
          </label>
          <input
            id="clpep-guardianName"
            className={inputClass}
            placeholder="Enter parent or guardian name"
            value={formData.guardianName ?? ''}
            onChange={e => updateField({ guardianName: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="clpep-guardianRelationship" className={labelClass}>Relationship</label>
            <SelectDropdown
              id="clpep-guardianRelationship"
              value={formData.guardianRelationship ?? ''}
              options={RELATIONSHIP_OPTIONS}
              onChange={v => updateField({ guardianRelationship: v })}
              disabled={isViewMode}
            />
          </div>
          <div>
            <label htmlFor="clpep-guardianContactNumber" className={labelClass}>Contact Number</label>
            <input
              id="clpep-guardianContactNumber"
              className={inputClass}
              placeholder="09XXXXXXXXX"
              value={formData.guardianContactNumber ?? ''}
              onChange={e => updateField({ guardianContactNumber: e.target.value })}
            />
          </div>
        </div>
      </div>
    )
  }

  function renderStep5() {
    const attachedForms = formData.attachedForms ?? []

    return (
      <div className="space-y-5">
        <SectionHeader title="V. PESO OFFICE ONLY" />

        <div>
          <p className={labelClass}>Case Report / Referral Form</p>
          <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-lg py-8 cursor-pointer hover:border-brand-blue hover:bg-blue-50 transition-colors">
            {formData.caseReportFile ? (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Paperclip size={16} className="text-brand-blue" />
                <span className="font-medium">{formData.caseReportFile}</span>
                <button
                  type="button"
                  onClick={e => { e.preventDefault(); updateField({ caseReportFile: '' }) }}
                  aria-label="Remove case report file"
                  className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <Upload size={28} className="text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-400 mt-1">PDF, JPG, JPEG, PNG (max. 10MB)</p>
              </>
            )}
            <input
              type="file"
              className="sr-only"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleCaseReportUpload}
            />
          </label>
        </div>

        <div>
          <p className={labelClass}>Supporting Documents</p>
          <p className="text-xs text-gray-400 mb-3">
            Attach supporting documents / forms (optional / if applicable).
          </p>

          <div>
            {attachedForms.map((name, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-2 border border-dashed border-brand-blue rounded-lg mt-5 bg-gray-50"
              >
                <span className="text-sm text-gray-700 truncate flex-1">{name}</span>
                <label className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 border border-gray-300 rounded-full cursor-pointer hover:bg-gray-50 transition-colors flex-shrink-0">
                  <Paperclip size={13} />
                  Attach File
                  <input
                    type="file"
                    className="sr-only"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e => handleAttachFileToForm(idx, e)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(idx)}
                  aria-label={`Remove ${name}`}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ))}

            {isAddingForm ? (
              <div className="flex items-center gap-2 px-3 py-2 border border-dashed border-brand-blue rounded-lg bg-blue-50 mt-5">
                <input
                  type="text"
                  autoFocus
                  className="flex-1 text-sm text-gray-700 outline-none bg-transparent placeholder:text-gray-400"
                  placeholder="Enter form name..."
                  value={newFormName}
                  onChange={e => setNewFormName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCommitForm()
                    if (e.key === 'Escape') handleCancelAddingForm()
                  }}
                />
                <button
                  type="button"
                  onClick={handleCommitForm}
                  disabled={!newFormName.trim()}
                  className="px-3 py-1 text-sm text-white bg-brand-blue rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex-shrink-0"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={handleCancelAddingForm}
                  aria-label="Cancel adding form"
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStartAddingForm}
                className="w-full flex items-center mt-5 justify-center gap-1.5 py-2.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-brand-blue hover:text-brand-blue transition-colors"
              >
                <Plus size={14} />
                Add form
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="clpep-dateApplied" className={labelClass}>Date Applied</label>
            <DatePicker
              id="clpep-dateApplied"
              className={inputClass}
              value={formData.dateApplied ?? ''}
              onChange={value => updateField({ dateApplied: value })}
            />
          </div>
          <div>
            <label htmlFor="clpep-status" className={labelClass}>Status</label>
            <SelectDropdown
              id="clpep-status"
              value={formData.status}
              options={STATUS_OPTIONS}
              placeholder="Select"
              onChange={v => updateField({ status: v as LivelihoodStatus })}
              disabled={isViewMode}
            />
          </div>
        </div>

        <div>
          <label htmlFor="clpep-remarks" className={labelClass}>Remarks</label>
          <textarea
            id="clpep-remarks"
            className={inputClass + ' resize-none'}
            rows={4}
            placeholder="Enter remarks"
            value={formData.remarks ?? ''}
            onChange={e => updateField({ remarks: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="clpep-receivedBy" className={labelClass}>Received By</label>
          <input
            id="clpep-receivedBy"
            className={inputClass}
            placeholder="Enter name of receiver"
            value={formData.receivedBy ?? ''}
            onChange={e => updateField({ receivedBy: e.target.value })}
          />
        </div>
      </div>
    )
  }

  function renderCurrentStep() {
    switch (currentStep) {
      case 1: return renderStep1()
      case 2: return renderStep2()
      case 3: return renderStep3()
      case 4: return renderStep4()
      case 5: return renderStep5()
      default: return null
    }
  }

  const headerTitle = isViewMode
    ? `${formData.lastName ?? ''}, ${formData.firstName ?? ''}`
    : mode === 'add'
      ? 'Add new profile - CLPEP'
      : 'Edit profile - CLPEP'

  const isLastStep = currentStep === STEPS.length

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl shadow-md flex">

      {/* Left sidebar — section stepper */}
      <div className="w-72 bg-[#F8F9FA] border-r border-gray-200 pt-[88px] px-6 pb-6">
        <nav className="space-y-2">
          {STEPS.map((step, stepIndex) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setCurrentStep(step.id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors text-xs ${
                currentStep === step.id
                  ? 'bg-brand-blue text-white font-semibold'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              {ROMAN_NUMERALS[stepIndex]}. {step.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Right content area */}
      <div className="flex-1 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Users size={20} className="text-brand-blue" />
            <h3 className="text-gray-800 m-0 text-base font-medium">{headerTitle}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close form"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Form content */}
        <form onSubmit={handleSubmit} className="px-8 py-6">
          <fieldset disabled={isViewMode} className="border-0 p-0 m-0 min-w-0">
            {renderCurrentStep()}
          </fieldset>
        </form>

        {/* Footer — navigation buttons */}
        <div className="border-t border-gray-200 px-8 py-4 flex items-center justify-between gap-3">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevious}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Previous
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isViewMode ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                {onEdit && (
                  <button
                    type="button"
                    onClick={onEdit}
                    className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-[#01a0ff] transition-colors"
                  >
                    Edit
                  </button>
                )}
                {!isLastStep && (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-[#01a0ff] transition-colors"
                  >
                    Next
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAsDraft}
                  className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Save as Draft
                </button>
                {isLastStep ? (
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-[#01a0ff] transition-colors"
                  >
                    {mode === 'add' ? 'Save Beneficiary' : 'Save Changes'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-[#01a0ff] transition-colors"
                  >
                    Next
                  </button>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
