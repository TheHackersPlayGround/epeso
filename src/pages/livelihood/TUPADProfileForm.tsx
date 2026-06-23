import { useState } from 'react'
import { X, Upload, Users } from 'lucide-react'
import type { LivelihoodBeneficiary, LivelihoodStatus } from '../../contexts/LivelihoodContext'

// ─── Constants ────────────────────────────────────────────────────────────────

const TUPAD_STATUS_OPTIONS: LivelihoodStatus[] = [
  'Accepted', 'Waitlisted', 'Rejected',
]

const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated', 'Annulled'] as const

const STEPS = [
  { id: 1, label: 'PERSONAL INFORMATION' },
  { id: 2, label: 'ADDRESS INFORMATION' },
  { id: 3, label: 'APPLICATION DETAILS' },
  { id: 4, label: 'ATTACHMENTS' },
  { id: 5, label: 'PESO OFFICE ONLY' },
] as const

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V'] as const

export const EMPTY_TUPAD_RECORD: Omit<LivelihoodBeneficiary, 'id'> = {
  name: '',
  service: 'DILEEP (TUPAD)',
  status: 'Waitlisted',
  firstName: '',
  lastName: '',
  middleName: '',
  nameExtension: '',
  sex: '',
  birthdate: '',
  age: undefined,
  civilStatus: '',
  contactNumber: '',
  streetPurok: '',
  barangay: '',
  cityMunicipality: 'Tangub City',
  province: 'Misamis Occidental',
  dateApplied: '',
  remarks: '',
  attachedForms: [],
  dateApplicationReceived: '',
  receivedBy: '',
  projectName: '',
  projectDuration: '',
  wageRate: '',
}

// ─── Types ────────────────────────────────────────────────────────────────────

type TUPADProfileFormProps = {
  mode: 'add' | 'edit' | 'view'
  initial: Omit<LivelihoodBeneficiary, 'id'>
  onSave: (data: Omit<LivelihoodBeneficiary, 'id'>) => void
  onClose: () => void
  onEdit?: () => void
}

// ─── Shared CSS ───────────────────────────────────────────────────────────────

const inputClass = [
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900',
  'focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none',
  'placeholder:text-gray-500 disabled:bg-gray-50 disabled:cursor-default',
].join(' ')

const selectClass = inputClass + ' bg-white'
const labelClass = 'block text-gray-700 mb-2 text-xs font-semibold uppercase'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveInitial(initial: Omit<LivelihoodBeneficiary, 'id'>): Omit<LivelihoodBeneficiary, 'id'> {
  const base = { ...EMPTY_TUPAD_RECORD }
  for (const key of Object.keys(initial) as (keyof typeof initial)[]) {
    if (initial[key] !== undefined) {
      (base as Record<string, unknown>)[key] = initial[key]
    }
  }
  if (!base.firstName && !base.lastName && base.name) {
    const commaIdx = base.name.indexOf(', ')
    if (commaIdx > -1) {
      base.lastName = base.name.slice(0, commaIdx)
      const parts = base.name.slice(commaIdx + 2).split(' ')
      base.firstName = parts[0] ?? ''
      base.middleName = parts.slice(1).join(' ')
    } else {
      base.firstName = base.name
    }
  }
  return base
}

// ─── File upload section ──────────────────────────────────────────────────────

function FormUploadSection({ forms, onChange }: { forms: string[] | undefined; onChange: (f: string[]) => void }) {
  const fileList = forms ?? []

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    onChange([...fileList, file.name])
    e.target.value = ''
  }

  function handleRemoveFile(index: number) {
    onChange(fileList.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-brand-blue transition-colors">
        <Upload size={32} className="text-gray-400 mb-2" />
        <p className="text-sm font-medium text-gray-600">Click to upload</p>
        <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG files accepted</p>
        <input type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" />
      </label>
      {fileList.length > 0 && (
        <ul className="space-y-2">
          {fileList.map((fileName, i) => (
            <li key={i} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-sm text-gray-700 truncate">{fileName}</span>
              <button type="button" onClick={() => handleRemoveFile(i)} className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0">
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

export default function TUPADProfileForm({ mode, initial, onSave, onClose, onEdit }: TUPADProfileFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<Omit<LivelihoodBeneficiary, 'id'>>(resolveInitial(initial))

  const isViewMode = mode === 'view'
  const isLastStep = currentStep === STEPS.length

  function updateField(fields: Partial<Omit<LivelihoodBeneficiary, 'id'>>) {
    if (isViewMode) return
    setFormData(prev => ({ ...prev, ...fields }))
  }

  function handleBirthdateChange(value: string) {
    let calculatedAge: number | undefined
    if (value) {
      const birth = new Date(value)
      const today = new Date()
      let age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--
      calculatedAge = age >= 0 ? age : undefined
    }
    updateField({ birthdate: value, age: calculatedAge })
  }

  function handleNext() { if (currentStep < STEPS.length) setCurrentStep(s => s + 1) }
  function handlePrevious() { if (currentStep > 1) setCurrentStep(s => s - 1) }

  function handleSubmit() {
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
    const fullName = (formData.lastName ? `${formData.lastName}, ${givenNames}` : givenNames) || 'Draft'
    onSave({ ...formData, name: fullName, status: 'Waitlisted' })
  }

  function SectionHeader({ title }: { title: string }) {
    return (
      <div className="bg-brand-blue text-white px-4 py-3 font-bold uppercase text-sm">
        {title}
      </div>
    )
  }

  // ── Step renderers ────────────────────────────────────────────────────────────

  function renderStep1() {
    return (
      <div className="space-y-5">
        <SectionHeader title="I. PERSONAL INFORMATION" />

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>Last Name <span className="text-red-500">*</span></label>
            <input className={inputClass} placeholder="Dela Cruz" value={formData.lastName ?? ''} onChange={e => updateField({ lastName: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>First Name <span className="text-red-500">*</span></label>
            <input className={inputClass} placeholder="Juan" value={formData.firstName ?? ''} onChange={e => updateField({ firstName: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Middle Name</label>
            <input className={inputClass} placeholder="M." value={formData.middleName ?? ''} onChange={e => updateField({ middleName: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Extension Name</label>
            <input className={inputClass} placeholder="Jr., Sr., III" value={formData.nameExtension ?? ''} onChange={e => updateField({ nameExtension: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4">
          <div>
            <label className={labelClass}>Sex <span className="text-red-500">*</span></label>
            <select className={selectClass} value={formData.sex ?? ''} onChange={e => updateField({ sex: e.target.value })}>
              <option value=""></option>
              <option>Male</option>
              <option>Female</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Birthdate <span className="text-red-500">*</span></label>
            <input type="date" className={inputClass} value={formData.birthdate ?? ''} onChange={e => handleBirthdateChange(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Age</label>
            <input type="number" className={inputClass + ' bg-gray-50'} value={formData.age ?? ''} readOnly />
          </div>
          <div>
            <label className={labelClass}>Civil Status <span className="text-red-500">*</span></label>
            <select className={selectClass} value={formData.civilStatus ?? ''} onChange={e => updateField({ civilStatus: e.target.value })}>
              <option value=""></option>
              {CIVIL_STATUS_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Contact Number</label>
            <input className={inputClass} placeholder="09XXXXXXXXX" value={formData.contactNumber ?? ''} onChange={e => updateField({ contactNumber: e.target.value })} />
          </div>
        </div>
      </div>
    )
  }

  function renderStep2() {
    return (
      <div className="space-y-5">
        <SectionHeader title="II. ADDRESS INFORMATION" />

        <div>
          <label className={labelClass}>Street / Purok</label>
          <input className={inputClass} placeholder="Enter street or purok" value={formData.streetPurok ?? ''} onChange={e => updateField({ streetPurok: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Barangay <span className="text-red-500">*</span></label>
            <input className={inputClass} placeholder="Enter barangay" value={formData.barangay ?? ''} onChange={e => updateField({ barangay: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>City / Municipality</label>
            <input className={inputClass} placeholder="Tangub City" value={formData.cityMunicipality ?? ''} onChange={e => updateField({ cityMunicipality: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Province</label>
            <input className={inputClass} placeholder="Misamis Occidental" value={formData.province ?? ''} onChange={e => updateField({ province: e.target.value })} />
          </div>
        </div>
      </div>
    )
  }

  function renderStep3() {
    return (
      <div className="space-y-5">
        <SectionHeader title="III. APPLICATION DETAILS" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Date Applied</label>
            <input type="date" className={inputClass} value={formData.dateApplied ?? ''} onChange={e => updateField({ dateApplied: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select className={selectClass} value={formData.status} onChange={e => updateField({ status: e.target.value as LivelihoodStatus })}>
              {TUPAD_STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Remarks</label>
          <textarea rows={3} className={inputClass + ' resize-none'} value={formData.remarks ?? ''} onChange={e => updateField({ remarks: e.target.value })} />
        </div>
      </div>
    )
  }

  function renderStep4() {
    return (
      <div className="space-y-5">
        <SectionHeader title="IV. ATTACHMENTS" />
        <p className="text-xs text-gray-400">Attach TUPAD Application Form, Valid ID, and other supporting documents.</p>
        <FormUploadSection
          forms={formData.attachedForms}
          onChange={attachedForms => updateField({ attachedForms })}
        />
      </div>
    )
  }

  function renderStep5() {
    return (
      <div className="space-y-5">
        <SectionHeader title="V. PESO OFFICE ONLY" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Date Application Received</label>
            <input type="date" className={inputClass} value={formData.dateApplicationReceived ?? ''} onChange={e => updateField({ dateApplicationReceived: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Received By</label>
            <input className={inputClass} placeholder="Staff name" value={formData.receivedBy ?? ''} onChange={e => updateField({ receivedBy: e.target.value })} />
          </div>
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
    : mode === 'add' ? 'Add new profile - TUPAD' : 'Edit profile - TUPAD'

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl shadow-md flex">

      {/* Left sidebar — step selector */}
      <div className="w-72 bg-[#F8F9FA] border-r border-gray-200 pt-[88px] px-6 pb-6">
        <nav className="space-y-2">
          {STEPS.map((step, idx) => (
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
              {ROMAN_NUMERALS[idx]}. {step.label}
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
            <button type="button" onClick={onClose} aria-label="Close form" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={24} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 px-8 py-6 overflow-y-auto">
          <fieldset disabled={isViewMode} className="border-0 p-0 m-0 min-w-0">
            {renderCurrentStep()}
          </fieldset>
        </div>

        {/* Footer — navigation */}
        <div className="border-t border-gray-200 px-8 py-4 flex items-center justify-between gap-3">
          <div>
            {currentStep > 1 && (
              <button type="button" onClick={handlePrevious} className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Previous
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isViewMode ? (
              <>
                <button type="button" onClick={onClose} className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  Close
                </button>
                {!isLastStep && (
                  <button type="button" onClick={handleNext} className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-[#01a0ff] transition-colors">
                    Next
                  </button>
                )}
              </>
            ) : (
              <>
                <button type="button" onClick={onClose} className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={handleSaveAsDraft} className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  Save as Draft
                </button>
                {isLastStep ? (
                  <button type="button" onClick={handleSubmit} className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-[#01a0ff] transition-colors">
                    {mode === 'add' ? 'Add Beneficiary' : 'Save Changes'}
                  </button>
                ) : (
                  <button type="button" onClick={handleNext} className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-[#01a0ff] transition-colors">
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
