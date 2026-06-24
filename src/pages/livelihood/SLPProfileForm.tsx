import { useState } from 'react'
import { X, Users, Plus, Paperclip } from 'lucide-react'
import type { LivelihoodBeneficiary } from '../../contexts/LivelihoodContext'
import DatePicker from '../../components/DatePicker'

// ─── Constants ────────────────────────────────────────────────────────────────

const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated', 'Annulled'] as const

const STATUS_BADGE: Record<string, string> = {
  Active:   'bg-green-100 text-green-700',
  Inactive: 'bg-gray-100 text-gray-500',
  Dropped:  'bg-red-100 text-red-600',
}

const ELIGIBILITY_TYPE_OPTIONS = ['Regular', 'Special'] as const

const SLP_TRACK_OPTIONS = [
  'Enterprise - Individual',
  'Enterprise - Association',
  'Employment',
] as const

const VULNERABILITY_SEVERITY_OPTIONS = ['Low', 'Medium', 'High'] as const

const ASSESSMENT_RESULT_OPTIONS = ['Qualified', 'Not Qualified'] as const

const EDUCATIONAL_ATTAINMENT_OPTIONS = [
  'No Formal Education',
  'Elementary Level',
  'Elementary Graduate',
  'High School Level',
  'High School Graduate',
  'Vocational/Technical',
  'College Level',
  'College Graduate',
  'Post Graduate',
] as const

const SECTOR_OPTIONS = [
  'Indigenous People (IP)',
  'Internally Displaced Person (IDP)',
  'Overseas Filipino Worker (OFW)',
  'Person with Disability (PWD)',
  'Senior Citizen',
  'Solo Parent',
  'Agrarian Reform Beneficiary (ARB)',
  'Farmer/Fisherfolk',
  'Others',
] as const

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const

const STEPS = [
  { id: 1, label: 'SLP INFORMATION' },
  { id: 2, label: 'PERSONAL INFORMATION' },
  { id: 3, label: 'ADDRESS INFORMATION' },
  { id: 4, label: 'SECTOR CLASSIFICATION' },
  { id: 5, label: 'ASSESSMENT SUMMARY' },
  { id: 6, label: 'ATTACHMENTS' },
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

export const EMPTY_SLP_RECORD: Omit<LivelihoodBeneficiary, 'id'> = {
  name: '',
  service: 'SLP',
  status: 'Active',
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
  is4PsBeneficiary: false,
  slpParticipantIdNumber: '',
  eligibilityType: 'Regular',
  sector: [],
  sectorOthersSpecify: '',
  educationalAttainment: '',
  sourceOfIncome: '',
  totalHouseholdMonthlyIncome: '',
  householdVulnerabilityScore: '',
  vulnerabilitySeverity: 'Low',
  assessmentResult: 'Qualified',
  slpTrack: 'Enterprise - Individual',
  remarks: '',
  dateApplied: '',
  attachedForms: [],
}

// ─── Props ────────────────────────────────────────────────────────────────────

type SLPProfileFormProps = {
  initial: Omit<LivelihoodBeneficiary, 'id'>
  mode: 'add' | 'edit' | 'view'
  onSave: (data: Omit<LivelihoodBeneficiary, 'id'>) => void
  onClose: () => void
  onEdit?: () => void
}

// ─── Main Wizard Component ────────────────────────────────────────────────────

export default function SLPProfileForm({ initial, mode, onSave, onClose, onEdit }: SLPProfileFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<Omit<LivelihoodBeneficiary, 'id'>>({
    ...EMPTY_SLP_RECORD,
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

  function handleSectorToggle(option: string) {
    if (isViewMode) return
    const current = formData.sector ?? []
    const next = current.includes(option)
      ? current.filter(s => s !== option)
      : [...current, option]
    updateField({ sector: next })
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
    const givenNames = [formData.firstName, formData.middleName, formData.nameExtension].filter(Boolean).join(' ')
    const fullName = `${formData.lastName}, ${givenNames}`
    onSave({ ...formData, name: fullName })
  }

  function handleSaveAsDraft() {
    const givenNames = [formData.firstName, formData.middleName, formData.nameExtension].filter(Boolean).join(' ')
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
        <SectionHeader title="I. SLP INFORMATION" />

        <div>
          <label htmlFor="slp-participantId" className={labelClass}>
            SLP Participant ID Number
          </label>
          <input
            id="slp-participantId"
            className={inputClass}
            placeholder="Enter participant ID number"
            value={formData.slpParticipantIdNumber ?? ''}
            onChange={e => updateField({ slpParticipantIdNumber: e.target.value })}
          />
        </div>

        <div>
          <label className={labelClass}>
            Participant Type <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-6 mt-1">
            {[{ label: '4Ps', value: true }, { label: 'Non-4Ps', value: false }].map(option => (
              <label key={option.label} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="slpParticipantType"
                  checked={formData.is4PsBeneficiary === option.value}
                  onChange={() => updateField({ is4PsBeneficiary: option.value })}
                  className="w-4 h-4 accent-brand-blue"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="slp-eligibilityType" className={labelClass}>Eligibility Type</label>
          <select
            id="slp-eligibilityType"
            className={selectClass}
            value={formData.eligibilityType ?? ''}
            onChange={e => updateField({ eligibilityType: e.target.value })}
          >
            <option value="">Select</option>
            {ELIGIBILITY_TYPE_OPTIONS.map(opt => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>
    )
  }

  function renderStep2() {
    return (
      <div className="space-y-5">
        <SectionHeader title="II. PERSONAL INFORMATION" />

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label htmlFor="slp-lastName" className={labelClass}>
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              id="slp-lastName"
              className={inputClass}
              placeholder="Enter last name"
              value={formData.lastName ?? ''}
              onChange={e => updateField({ lastName: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="slp-firstName" className={labelClass}>
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              id="slp-firstName"
              className={inputClass}
              placeholder="Enter first name"
              value={formData.firstName ?? ''}
              onChange={e => updateField({ firstName: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="slp-middleName" className={labelClass}>Middle Name</label>
            <input
              id="slp-middleName"
              className={inputClass}
              placeholder="Enter middle name"
              value={formData.middleName ?? ''}
              onChange={e => updateField({ middleName: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="slp-nameExtension" className={labelClass}>Extension Name</label>
            <input
              id="slp-nameExtension"
              className={inputClass}
              placeholder="Jr., Sr., III"
              value={formData.nameExtension ?? ''}
              onChange={e => updateField({ nameExtension: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          <div>
            <label htmlFor="slp-birthdate" className={labelClass}>
              Birthdate <span className="text-red-500">*</span>
            </label>
            <DatePicker
              id="slp-birthdate"
              className={inputClass}
              value={formData.birthdate ?? ''}
              onChange={handleBirthdate}
              required
            />
          </div>
          <div>
            <label htmlFor="slp-age" className={labelClass}>Age</label>
            <input
              id="slp-age"
              type="number"
              className={inputClass + ' bg-gray-50'}
              value={formData.age || ''}
              readOnly
            />
          </div>
          <div>
            <label htmlFor="slp-sex" className={labelClass}>
              Sex <span className="text-red-500">*</span>
            </label>
            <select
              id="slp-sex"
              className={selectClass}
              value={formData.sex ?? ''}
              onChange={e => updateField({ sex: e.target.value })}
              required
            >
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
            </select>
          </div>
          <div>
            <label htmlFor="slp-civilStatus" className={labelClass}>Civil Status</label>
            <select
              id="slp-civilStatus"
              className={selectClass}
              value={formData.civilStatus ?? ''}
              onChange={e => updateField({ civilStatus: e.target.value })}
            >
              <option value="">Select</option>
              {CIVIL_STATUS_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="slp-contactNumber" className={labelClass}>Contact Number</label>
            <input
              id="slp-contactNumber"
              className={inputClass}
              placeholder="09XXXXXXXXX"
              value={formData.contactNumber ?? ''}
              onChange={e => updateField({ contactNumber: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label htmlFor="slp-email" className={labelClass}>Email Address</label>
          <input
            id="slp-email"
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

  function renderStep3() {
    return (
      <div className="space-y-5">
        <SectionHeader title="III. ADDRESS INFORMATION" />

        <div>
          <label htmlFor="slp-houseBlockLot" className={labelClass}>
            House / Block / Lot Number
          </label>
          <input
            id="slp-houseBlockLot"
            className={inputClass}
            placeholder="Enter house, block, or lot number"
            value={formData.houseBlockLotNo ?? ''}
            onChange={e => updateField({ houseBlockLotNo: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="slp-streetPurok" className={labelClass}>Street / Purok / Zone</label>
          <input
            id="slp-streetPurok"
            className={inputClass}
            placeholder="Enter street, purok, or zone"
            value={formData.streetPurok ?? ''}
            onChange={e => updateField({ streetPurok: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="slp-barangay" className={labelClass}>
              Barangay <span className="text-red-500">*</span>
            </label>
            <input
              id="slp-barangay"
              className={inputClass}
              placeholder="Enter barangay"
              value={formData.barangay ?? ''}
              onChange={e => updateField({ barangay: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="slp-city" className={labelClass}>Municipality / City</label>
            <input
              id="slp-city"
              className={inputClass}
              value={formData.cityMunicipality ?? ''}
              onChange={e => updateField({ cityMunicipality: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="slp-province" className={labelClass}>Province</label>
            <input
              id="slp-province"
              className={inputClass}
              value={formData.province ?? ''}
              onChange={e => updateField({ province: e.target.value })}
            />
          </div>
        </div>
      </div>
    )
  }

  function renderStep4() {
    const selectedSectors = formData.sector ?? []

    return (
      <div className="space-y-5">
        <SectionHeader title="IV. SECTOR CLASSIFICATION" />

        <div>
          <label className={labelClass}>Sector (Select all that apply)</label>
          <div className="border border-gray-200 rounded-lg p-3 max-h-56 overflow-y-auto space-y-2">
            {SECTOR_OPTIONS.map(option => (
              <label key={option} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSectors.includes(option)}
                  onChange={() => handleSectorToggle(option)}
                  className="w-4 h-4 accent-brand-blue rounded"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
          {selectedSectors.includes('Others') && (
            <input
              className={inputClass + ' mt-3'}
              placeholder="Please specify"
              value={formData.sectorOthersSpecify ?? ''}
              onChange={e => updateField({ sectorOthersSpecify: e.target.value })}
            />
          )}
        </div>

        <div>
          <label htmlFor="slp-educationalAttainment" className={labelClass}>
            Educational Attainment
          </label>
          <select
            id="slp-educationalAttainment"
            className={selectClass}
            value={formData.educationalAttainment ?? ''}
            onChange={e => updateField({ educationalAttainment: e.target.value })}
          >
            <option value="">Select</option>
            {EDUCATIONAL_ATTAINMENT_OPTIONS.map(opt => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>
    )
  }

  function renderStep5() {
    return (
      <div className="space-y-5">
        <SectionHeader title="V. ASSESSMENT SUMMARY" />

        <div>
          <label htmlFor="slp-sourceOfIncome" className={labelClass}>Source of Income</label>
          <input
            id="slp-sourceOfIncome"
            className={inputClass}
            placeholder="Enter source of income"
            value={formData.sourceOfIncome ?? ''}
            onChange={e => updateField({ sourceOfIncome: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="slp-totalHouseholdIncome" className={labelClass}>
            Total Household Monthly Income
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">
              ₱
            </span>
            <input
              id="slp-totalHouseholdIncome"
              type="number"
              min="0"
              className={inputClass + ' pl-7'}
              placeholder="0.00"
              value={formData.totalHouseholdMonthlyIncome ?? ''}
              onChange={e => updateField({ totalHouseholdMonthlyIncome: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label htmlFor="slp-vulnerabilityScore" className={labelClass}>
            Household Vulnerability Score
          </label>
          <input
            id="slp-vulnerabilityScore"
            className={inputClass}
            placeholder="Enter score"
            value={formData.householdVulnerabilityScore ?? ''}
            onChange={e => updateField({ householdVulnerabilityScore: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="slp-vulnerabilitySeverity" className={labelClass}>
            Vulnerability Severity
          </label>
          <select
            id="slp-vulnerabilitySeverity"
            className={selectClass}
            value={formData.vulnerabilitySeverity ?? VULNERABILITY_SEVERITY_OPTIONS[0]}
            onChange={e => updateField({ vulnerabilitySeverity: e.target.value })}
          >
            {VULNERABILITY_SEVERITY_OPTIONS.map(opt => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="slp-assessmentResult" className={labelClass}>Assessment Result</label>
          <select
            id="slp-assessmentResult"
            className={selectClass}
            value={formData.assessmentResult ?? ASSESSMENT_RESULT_OPTIONS[0]}
            onChange={e => updateField({ assessmentResult: e.target.value })}
          >
            {ASSESSMENT_RESULT_OPTIONS.map(opt => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="slp-slpTrack" className={labelClass}>SLP Track</label>
          <select
            id="slp-slpTrack"
            className={selectClass}
            value={formData.slpTrack ?? SLP_TRACK_OPTIONS[0]}
            onChange={e => updateField({ slpTrack: e.target.value })}
          >
            {SLP_TRACK_OPTIONS.map(opt => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="slp-remarks" className={labelClass}>Remarks</label>
          <textarea
            id="slp-remarks"
            className={inputClass + ' resize-none'}
            rows={3}
            value={formData.remarks ?? ''}
            onChange={e => updateField({ remarks: e.target.value })}
          />
        </div>

      </div>
    )
  }

  function renderStep6() {
    const attachedForms = formData.attachedForms ?? []

    return (
      <div className="space-y-5">
        <SectionHeader title="VI. ATTACHMENTS" />

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
            <label htmlFor="slp-dateApplied" className={labelClass}>Date Applied</label>
            <DatePicker
              id="slp-dateApplied"
              className={inputClass}
              value={formData.dateApplied ?? ''}
              onChange={value => updateField({ dateApplied: value })}
            />
          </div>
          <div>
            <label htmlFor="slp-receivedBy" className={labelClass}>Received By</label>
            <input
              id="slp-receivedBy"
              type="text"
              className={inputClass}
              placeholder="Name of receiving officer"
              value={formData.receivedBy ?? ''}
              onChange={e => updateField({ receivedBy: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Status</label>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_BADGE[formData.status] ?? 'bg-gray-100 text-gray-500'}`}>
              {formData.status}
            </span>
          </div>
          {!isViewMode && (
            <p className="text-xs text-gray-400 mt-1.5">Active / Inactive are set automatically based on project assignment.</p>
          )}
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
      case 6: return renderStep6()
      default: return null
    }
  }

  const headerTitle = isViewMode
    ? `${formData.lastName ?? ''}, ${formData.firstName ?? ''}`
    : mode === 'add'
      ? 'Add new profile - SLP'
      : 'Edit profile - SLP'

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
