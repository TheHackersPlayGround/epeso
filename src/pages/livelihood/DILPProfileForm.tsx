import { useState } from 'react'
import { X, Upload, Users } from 'lucide-react'
import type { LivelihoodBeneficiary, LivelihoodService, LivelihoodStatus } from '../../contexts/LivelihoodContext'
import DatePicker from '../../components/DatePicker'
import { useProgramActivities } from '../../contexts/ProgramActivitiesContext'
import type { DILPActivity } from '../../contexts/ProgramActivitiesContext'

// ─── Constants ────────────────────────────────────────────────────────────────

const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated', 'Annulled'] as const

const BENEFICIARY_CLASSIFICATION_OPTIONS = [
  'Displaced Worker', 'Transport Worker', 'Vendor',
  'Farmer', 'Fisherfolk', 'OFW', 'Solo Parent', 'PWD', 'Others',
] as const

const STATUS_OPTIONS: LivelihoodStatus[] = [
  'Accepted', 'Waitlisted', 'Rejected',
]

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V'] as const

const STEPS = [
  { id: 1, label: 'DILP PROJECT INFO' },
  { id: 2, label: 'PERSONAL INFORMATION' },
  { id: 3, label: 'ADDRESS INFORMATION' },
  { id: 4, label: 'DEPENDENT INFORMATION' },
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

// ─── Empty record — used as the initial value when adding a new profile ──────

export const EMPTY_DILP_RECORD: Omit<LivelihoodBeneficiary, 'id'> = {
  name: '',
  service: 'DILEEP (DILP)',
  status: 'Waitlisted',
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
  beneficiaryClassification: '',
  streetPurok: '',
  barangay: '',
  cityMunicipality: '',
  province: '',
  is4PsBeneficiary: false,
  yearGraduated4Ps: '',
  monthlyIncome: '',
  facebookAccount: '',
  instagramAccount: '',
  dependentNames: '',
  dependentContactNumber: '',
  pagibigNo: '',
  philhealthNo: '',
  sssNo: '',
  otherId: '',
  dateApplied: '',
  remarks: '',
  dateApplicationReceived: '',
  receivedBy: '',
  assignedDilpProjectId: null,
  dilpBeneficiaryType: '',
  attachedForms: [],
}

// ─── Props ────────────────────────────────────────────────────────────────────

type DILPProfileFormProps = {
  initial: Omit<LivelihoodBeneficiary, 'id'>
  mode: 'add' | 'edit' | 'view'
  onSave: (data: Omit<LivelihoodBeneficiary, 'id'>) => void
  onClose: () => void
  onEdit?: () => void
}

// ─── FormUploadSection — simple file attachment list for step 8 ───────────────

type FormUploadSectionProps = {
  service: LivelihoodService
  forms: string[] | undefined
  onChange: (forms: string[]) => void
}

function FormUploadSection({ forms, onChange }: FormUploadSectionProps) {
  const fileList = forms ?? []

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    onChange([...fileList, file.name])
    event.target.value = ''
  }

  function handleRemoveFile(index: number) {
    onChange(fileList.filter((_, fileIndex) => fileIndex !== index))
  }

  return (
    <div className="space-y-4">
      <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-brand-blue transition-colors">
        <Upload size={32} className="text-gray-400 mb-2" />
        <p className="text-sm font-medium text-gray-600">Click to upload</p>
        <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG files accepted</p>
        <input
          type="file"
          className="sr-only"
          onChange={handleFileChange}
          accept=".pdf,.jpg,.jpeg,.png"
        />
      </label>

      {fileList.length > 0 && (
        <ul className="space-y-2">
          {fileList.map((fileName, fileIndex) => (
            <li
              key={fileIndex}
              className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200"
            >
              <span className="text-sm text-gray-700 truncate">{fileName}</span>
              <button
                type="button"
                onClick={() => handleRemoveFile(fileIndex)}
                aria-label={`Remove ${fileName}`}
                className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Main Wizard Component ────────────────────────────────────────────────────

export default function DILPProfileForm({ initial, mode, onSave, onClose, onEdit }: DILPProfileFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<Omit<LivelihoodBeneficiary, 'id'>>({
    ...EMPTY_DILP_RECORD,
    ...initial,
  })

  const isViewMode = mode === 'view'
  const { activities } = useProgramActivities()

  const dilpProjects = activities.filter(
    (activity): activity is DILPActivity => activity.service === 'DILEEP (DILP)'
  )

  const selectedProject = formData.assignedDilpProjectId
    ? dilpProjects.find(project => project.id === formData.assignedDilpProjectId) ?? null
    : null

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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!formData.lastName || !formData.firstName) {
      alert('Last name and first name are required.')
      return
    }
    const givenNames = [formData.firstName, formData.middleName, formData.nameExtension].filter(Boolean).join(' ')
    const fullName = formData.lastName ? `${formData.lastName}, ${givenNames}` : givenNames
    onSave({ ...formData, name: fullName })
  }

  function handleSaveAsDraft() {
    const givenNames = [formData.firstName, formData.middleName, formData.nameExtension].filter(Boolean).join(' ')
    const fullName = (formData.lastName ? `${formData.lastName}, ${givenNames}` : givenNames) || 'Draft'
    onSave({ ...formData, name: fullName, status: 'Waitlisted' })
  }

  // ── Section header — inset block matching AddApplicantSidebar style ──

  function SectionHeader({ title }: { title: string }) {
    return (
      <div className="bg-brand-blue text-white px-4 py-3 font-bold uppercase text-sm">
        {title}
      </div>
    )
  }

  // ── Step content renderers ─────────────────────────────────────────

  function renderStep1() {
    return (
      <div className="space-y-5">
        <SectionHeader title="I. DILP PROJECT INFORMATION" />

        <div>
          <label className={labelClass}>
            Assigned Project <span className="text-red-500">*</span>
          </label>
          <select
            className={selectClass}
            value={formData.assignedDilpProjectId ?? ''}
            onChange={e => {
              const projectId = e.target.value ? Number(e.target.value) : null
              const chosenProject = projectId ? dilpProjects.find(p => p.id === projectId) : null
              updateField({
                assignedDilpProjectId: projectId,
                projectName: chosenProject?.projectName ?? '',
              })
            }}
          >
            <option value="">Select DILP Project</option>
            {dilpProjects.map(project => (
              <option key={project.id} value={project.id}>{project.projectName}</option>
            ))}
          </select>
          {dilpProjects.length === 0 && (
            <p className="text-xs text-gray-400 mt-1 italic">
              No DILP projects found. Create one in Maintenance first.
            </p>
          )}
        </div>

        {selectedProject && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">
              Project Details (Read-Only)
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Project ID Number', selectedProject.projectIdNumber],
                ['Project Name', selectedProject.projectName],
                ['Project Type', selectedProject.typeOfProject],
                ['Program Component', selectedProject.programComponent],
                ['Implementation Type', selectedProject.wayOfImplementation],
              ].map(([detailLabel, detailValue]) => (
                <div key={detailLabel} className={detailLabel === 'Implementation Type' ? 'col-span-2' : ''}>
                  <p className="text-xs text-gray-500">{detailLabel}</p>
                  <p className="text-sm text-gray-800 font-medium">{detailValue || '—'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className={labelClass}>
            Beneficiary Type <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-6 mt-1">
            {['Individual', 'Group'].map(beneficiaryType => (
              <label key={beneficiaryType} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dilpBeneficiaryType"
                  value={beneficiaryType}
                  checked={formData.dilpBeneficiaryType === beneficiaryType}
                  onChange={() => updateField({ dilpBeneficiaryType: beneficiaryType })}
                  className="w-4 h-4 accent-brand-blue"
                />
                <span className="text-sm text-gray-700">{beneficiaryType}</span>
              </label>
            ))}
          </div>
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
            <label htmlFor="dilp-lastName" className={labelClass}>
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              id="dilp-lastName"
              className={inputClass}
              placeholder="Enter last name"
              value={formData.lastName ?? ''}
              onChange={e => updateField({ lastName: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="dilp-firstName" className={labelClass}>
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              id="dilp-firstName"
              className={inputClass}
              placeholder="Enter first name"
              value={formData.firstName ?? ''}
              onChange={e => updateField({ firstName: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="dilp-middleName" className={labelClass}>Middle Name</label>
            <input
              id="dilp-middleName"
              className={inputClass}
              placeholder="Enter middle name"
              value={formData.middleName ?? ''}
              onChange={e => updateField({ middleName: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="dilp-nameExtension" className={labelClass}>Extension Name</label>
            <input
              id="dilp-nameExtension"
              className={inputClass}
              value={formData.nameExtension ?? ''}
              onChange={e => updateField({ nameExtension: e.target.value })}
              placeholder="Jr., Sr., III"
            />
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          <div>
            <label htmlFor="dilp-sex" className={labelClass}>
              Sex <span className="text-red-500">*</span>
            </label>
            <select
              id="dilp-sex"
              className={selectClass}
              value={formData.sex ?? ''}
              onChange={e => updateField({ sex: e.target.value })}
              required
            >
              <option value=""></option>
              <option>Male</option>
              <option>Female</option>
            </select>
          </div>
          <div>
            <label htmlFor="dilp-birthdate" className={labelClass}>
              Birthdate <span className="text-red-500">*</span>
            </label>
            <DatePicker
              id="dilp-birthdate"
              className={inputClass}
              value={formData.birthdate ?? ''}
              onChange={handleBirthdate}
              required
            />
          </div>
          <div>
            <label htmlFor="dilp-age" className={labelClass}>Age</label>
            <input
              id="dilp-age"
              type="number"
              className={inputClass + ' bg-gray-50'}
              value={formData.age || ''}
              readOnly
            />
          </div>
          <div>
            <label htmlFor="dilp-civilStatus" className={labelClass}>
              Civil Status <span className="text-red-500">*</span>
            </label>
            <select
              id="dilp-civilStatus"
              className={selectClass}
              value={formData.civilStatus ?? ''}
              onChange={e => updateField({ civilStatus: e.target.value })}
              required
            >
              <option value=""></option>
              {CIVIL_STATUS_OPTIONS.map(option => <option key={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="dilp-contactNumber" className={labelClass}>Contact Number</label>
            <input
              id="dilp-contactNumber"
              className={inputClass}
              value={formData.contactNumber ?? ''}
              onChange={e => updateField({ contactNumber: e.target.value })}
              placeholder="09XXXXXXXXX"
            />
          </div>
        </div>

        <div>
          <label htmlFor="dilp-email" className={labelClass}>Email Address</label>
          <input
            id="dilp-email"
            type="email"
            className={inputClass}
            value={formData.email ?? ''}
            onChange={e => updateField({ email: e.target.value })}
            placeholder="email@example.com"
          />
        </div>

        <div>
          <label htmlFor="dilp-classification" className={labelClass}>
            Beneficiary Classification
          </label>
          <select
            id="dilp-classification"
            className={selectClass}
            value={formData.beneficiaryClassification ?? ''}
            onChange={e => updateField({ beneficiaryClassification: e.target.value })}
          >
            <option value=""></option>
            {BENEFICIARY_CLASSIFICATION_OPTIONS.map(classification => (
              <option key={classification}>{classification}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>4Ps Beneficiary?</label>
          <div className="flex gap-6 mt-1">
            {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map(option => (
              <label key={option.label} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dilp4Ps"
                  checked={formData.is4PsBeneficiary === option.value}
                  onChange={() => updateField({ is4PsBeneficiary: option.value })}
                  className="w-4 h-4 accent-brand-blue"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {formData.is4PsBeneficiary && (
          <div>
            <label htmlFor="dilp-yearGrad4Ps" className={labelClass}>
              Year Graduated / Exited
            </label>
            <input
              id="dilp-yearGrad4Ps"
              className={inputClass}
              value={formData.yearGraduated4Ps ?? ''}
              onChange={e => updateField({ yearGraduated4Ps: e.target.value })}
              placeholder="e.g. 2023"
            />
          </div>
        )}
      </div>
    )
  }

  function renderStep3() {
    return (
      <div className="space-y-5">
        <SectionHeader title="III. ADDRESS INFORMATION" />

        <div>
          <label htmlFor="dilp-streetPurok" className={labelClass}>Street / Purok</label>
          <input
            id="dilp-streetPurok"
            className={inputClass}
            placeholder="Enter street or purok"
            value={formData.streetPurok ?? ''}
            onChange={e => updateField({ streetPurok: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label htmlFor="dilp-barangay" className={labelClass}>
              Barangay <span className="text-red-500">*</span>
            </label>
            <input
              id="dilp-barangay"
              className={inputClass}
              placeholder="Enter barangay"
              value={formData.barangay ?? ''}
              onChange={e => updateField({ barangay: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="dilp-city" className={labelClass}>City / Municipality</label>
            <input
              id="dilp-city"
              className={inputClass}
              placeholder="Enter city"
              value={formData.cityMunicipality ?? ''}
              onChange={e => updateField({ cityMunicipality: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label htmlFor="dilp-province" className={labelClass}>Province</label>
            <input
              id="dilp-province"
              className={inputClass}
              placeholder="Enter province"
              value={formData.province ?? ''}
              onChange={e => updateField({ province: e.target.value })}
            />
          </div>
        </div>
      </div>
    )
  }

  function renderStep4() {
    return (
      <div className="space-y-5">
        <SectionHeader title="IV. DEPENDENT INFORMATION" />

        <div>
          <label htmlFor="dilp-dependentNames" className={labelClass}>Dependent Name</label>
          <input
            id="dilp-dependentNames"
            className={inputClass}
            value={formData.dependentNames ?? ''}
            onChange={e => updateField({ dependentNames: e.target.value })}
            placeholder="Enter dependent's full name"
          />
        </div>
        <div>
          <label htmlFor="dilp-dependentContact" className={labelClass}>
            Contact Number of Dependent
          </label>
          <input
            id="dilp-dependentContact"
            className={inputClass}
            value={formData.dependentContactNumber ?? ''}
            onChange={e => updateField({ dependentContactNumber: e.target.value })}
            placeholder="09XXXXXXXXX"
          />
        </div>
      </div>
    )
  }

  function renderStep5() {
    return (
      <div className="space-y-5">
        <SectionHeader title="V. PESO OFFICE ONLY" />

        <div>
          <p className={labelClass}>Supporting Documents</p>
          <p className="text-xs text-gray-400">
            Attach DILP Application Form, Valid ID, and other supporting documents.
          </p>
          <FormUploadSection
            service={formData.service}
            forms={formData.attachedForms}
            onChange={attachedForms => updateField({ attachedForms })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="dilp-dateApplied" className={labelClass}>Date Applied</label>
            <DatePicker
              id="dilp-dateApplied"
              className={inputClass}
              value={formData.dateApplied ?? ''}
              onChange={value => updateField({ dateApplied: value })}
            />
          </div>
          <div>
            <label htmlFor="dilp-status" className={labelClass}>Status</label>
            <select
              id="dilp-status"
              className={selectClass}
              value={formData.status}
              onChange={e => updateField({ status: e.target.value as LivelihoodStatus })}
            >
              {STATUS_OPTIONS.map(statusOption => (
                <option key={statusOption} value={statusOption}>{statusOption}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="dilp-remarks" className={labelClass}>Remarks</label>
          <textarea
            id="dilp-remarks"
            className={inputClass + ' resize-none'}
            rows={3}
            value={formData.remarks ?? ''}
            onChange={e => updateField({ remarks: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="dilp-receivedBy" className={labelClass}>Received By</label>
          <input
            id="dilp-receivedBy"
            className={inputClass}
            placeholder="Enter name"
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
      ? 'Add new profile - DILP'
      : 'Edit profile - DILP'

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
          <div className="flex items-center gap-2">
            {isViewMode && onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="px-5 py-2 bg-brand-blue text-white text-sm font-semibold rounded-lg hover:bg-brand-blue-dark transition-colors"
              >
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close form"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={24} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Form content */}
        <form onSubmit={handleSubmit} className="px-8 py-6">
          {/* fieldset disabled={isViewMode} disables all inputs in view mode */}
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
                    onClick={handleSubmit}
                    className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-[#01a0ff] transition-colors"
                  >
                    {mode === 'add' ? 'Add Beneficiary' : 'Save Changes'}
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
