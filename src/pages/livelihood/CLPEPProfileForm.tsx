import { useState, useRef, useEffect } from 'react'
import { X, Users, Upload, FileText, Eye, Trash2, ChevronDown, Loader2 } from 'lucide-react'
import DatePicker from '../../components/DatePicker'
import SearchableSelect from '../../components/SearchableSelect'
import DocumentPreviewModal from '../../components/DocumentPreviewModal'
import { searchProvinces, searchCities, searchBarangaysByCity } from '../../services/locationService'
import { canManage } from '../../utils/permissions'
import { useFieldValidation, type ValidationError } from '../../hooks/useFieldValidation'
import { useProfileDraft } from '../../hooks/useFormDraft'
import { useDuplicateCheck } from '../../hooks/useDuplicateCheck'
import { ATTACHMENT_ACCEPT, ATTACHMENT_ACCEPT_LABEL } from '../../utils/attachments'
import type { LivelihoodBeneficiary, LivelihoodSavedDocument } from '../../contexts/LivelihoodContext'
import { sanitizeContactNumber, isValidContactNumber, CONTACT_NUMBER_MESSAGE } from '../../utils/contactNumber'
import { fmtDate, todayIso } from '../../utils/formatDate'
import { withDefaultReceivedBy } from '../../utils/currentUser'
import KioskReview, { type ReviewSection } from '../../kiosk/KioskReview'
import { fullName, joinText, yesNo } from '../../kiosk/kioskReviewUtils'

// ─── Constants ────────────────────────────────────────────────────────────────

export const CHILD_LABOR_STATUS_OPTIONS = [
  'Child Laborer',
  'At Risk of Child Labor',
  'Former Child Laborer',
  'Not Yet Assessed',
] as const

export const SCHOOL_STATUS_OPTIONS = [
  'Currently Enrolled',
  'Out of School',
  'ALS Learner',
  'ALS Graduate',
  'Graduated',
] as const

export const RELATIONSHIP_OPTIONS = ['Father', 'Mother', 'Guardian', 'Grandparent', 'Relative', 'Others'] as const

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V'] as const

function formatFileSize(bytes: number) {
  if (bytes <= 0) return '0 Bytes'
  const units = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${units[i]}`
}

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
  streetPurok: '',
  barangay: '',
  barangayId: 0,
  cityMunicipality: '',
  province: '',
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
  attachedDocuments: [],
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
  /** Applicant self-service kiosk: only the applicant's own sections, no drafts or duplicate check. */
  kiosk?: boolean
  /** Staff reviewing a kiosk submission: no saved drafts (one submission's draft would be offered for the next). */
  noDraft?: boolean
}

// ─── Main Wizard Component ────────────────────────────────────────────────────

export default function CLPEPProfileForm({ initial, mode, onSave, onClose, onEdit, kiosk = false, noDraft = false }: CLPEPProfileFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<Omit<LivelihoodBeneficiary, 'id'>>(() => withDefaultReceivedBy({ ...EMPTY_CLPEP_RECORD, ...initial }, mode === 'add' && !kiosk))
  const [previewDoc, setPreviewDoc] = useState<LivelihoodSavedDocument | null>(null)
  const [provinceId, setProvinceId] = useState<number | null>(null)
  const [cityId, setCityId] = useState<number | null>(null)
  const dup = useDuplicateCheck('clpep')
  // The last section of every form is "PESO OFFICE ONLY": applicants at the kiosk never see it.
  const steps = kiosk ? STEPS.slice(0, -1) : STEPS
  // Kiosk: the finished form, shown on the "check your information" screen before it is sent.
  const [kioskPayload, setKioskPayload] = useState<Parameters<typeof onSave>[0] | null>(null)
  const draft = useProfileDraft({
    draftKey: 'clpep-beneficiary', mode: mode, formData, setFormData,
    provinceId, setProvinceId, cityId, setCityId, onClose, enabled: !kiosk && !noDraft,
  })

  const isViewMode = mode === 'view'
  const { clearFieldError, errCls, fieldMessage, runValidation } = useFieldValidation()

  const contactNumberRef = useRef<HTMLInputElement>(null)
  const lastNameRef = useRef<HTMLInputElement>(null)
  const firstNameRef = useRef<HTMLInputElement>(null)
  const sexRef = useRef<HTMLSelectElement>(null)
  const birthdateWrapRef = useRef<HTMLDivElement>(null)
  const barangayWrapRef = useRef<HTMLDivElement>(null)

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
    if (currentStep < steps.length) setCurrentStep(step => step + 1)
  }

  function handlePrevious() {
    if (currentStep > 1) setCurrentStep(step => step - 1)
  }

  // Fields on another step aren't mounted until that step renders, so switch
  // step first and focus once the render has happened.
  function focusOnStep(step: number, run: () => void) {
    setCurrentStep(step)
    setTimeout(run, 50)
  }

  function handleSubmit(event?: React.FormEvent, advance = false) {
    event?.preventDefault()
    const errors: ValidationError[] = []

    if (!(formData.lastName ?? '').trim()) {
      errors.push({ field: 'lastName', message: 'Last Name is required.', focus: () => focusOnStep(1, () => lastNameRef.current?.focus()) })
    }
    if (!(formData.firstName ?? '').trim()) {
      errors.push({ field: 'firstName', message: 'First Name is required.', focus: () => focusOnStep(1, () => firstNameRef.current?.focus()) })
    }
    if (!formData.sex) {
      errors.push({ field: 'sex', message: 'Sex is required.', focus: () => focusOnStep(1, () => sexRef.current?.focus()) })
    }
    if (!formData.birthdate) {
      errors.push({
        field: 'birthdate',
        message: 'Birthdate is required.',
        focus: () => focusOnStep(1, () => birthdateWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })),
      })
    }
    if (!formData.barangayId) {
      errors.push({
        field: 'barangay',
        message: 'Barangay is required (Section II. Address).',
        focus: () => focusOnStep(2, () => barangayWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })),
      })
    }

    if ((formData.guardianContactNumber ?? '').trim() && !isValidContactNumber((formData.guardianContactNumber ?? ''))) {
      errors.push({ field: 'contactNumber', message: CONTACT_NUMBER_MESSAGE, focus: () => focusOnStep(4, () => contactNumberRef.current?.focus()) })
    }

    if ((formData.birthdate ?? '') > todayIso()) {
      errors.push({ field: 'birthdate', message: 'Birthdate cannot be in the future.', focus: () => {} })
    }

    if (kiosk && advance) {
      // Next: only this step's answers are checked, then on to the next step.
      const stepOf = (field: string) => (field === 'barangay' ? 2 : 1)
      if (runValidation(errors.filter(e => stepOf(e.field) === currentStep))) return
      handleNext()
      return
    }
    if (runValidation(errors)) return

    const givenNames = [formData.firstName, formData.middleName, formData.nameExtension]
      .filter(Boolean)
      .join(' ')
    const fullName = `${formData.lastName}, ${givenNames}`
    if (kiosk) { setKioskPayload({ ...formData, name: fullName }); return }
    void dup.confirmSave(mode, { firstName: formData.firstName ?? '', lastName: formData.lastName ?? '', birthdate: formData.birthdate ?? '' }, initial)
      .then(proceed => { if (proceed) draft.wrapSave(onSave)(withDefaultReceivedBy({ ...formData, name: fullName }, mode === 'add')) })
  }

  function handleDocumentUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const current = formData.attachedDocuments ?? []
      updateField({
        attachedDocuments: [...current, {
          id: Date.now().toString() + Math.random().toString(36),
          fileName: file.name,
          fileSize: formatFileSize(file.size),
          url: URL.createObjectURL(file),
          dataUrl: reader.result as string,
        }],
      })
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  function handleRemoveDocument(id: string) {
    const current = formData.attachedDocuments ?? []
    updateField({ attachedDocuments: current.filter(doc => doc.id !== id) })
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

        <div className="grid grid-cols-4 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-4">
          <div>
            <label htmlFor="clpep-lastName" className={labelClass}>
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              ref={lastNameRef}
              id="clpep-lastName"
              className={`${inputClass} ${errCls('lastName')}`}
              placeholder="Enter last name"
              value={formData.lastName ?? ''}
              onChange={e => { updateField({ lastName: e.target.value }); clearFieldError('lastName') }}
            />
            {fieldMessage('lastName') && <p className="text-red-500 text-xs mt-1">{fieldMessage('lastName')}</p>}
          </div>
          <div>
            <label htmlFor="clpep-firstName" className={labelClass}>
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              ref={firstNameRef}
              id="clpep-firstName"
              className={`${inputClass} ${errCls('firstName')}`}
              placeholder="Enter first name"
              value={formData.firstName ?? ''}
              onChange={e => { updateField({ firstName: e.target.value }); clearFieldError('firstName') }}
            />
            {fieldMessage('firstName') && <p className="text-red-500 text-xs mt-1">{fieldMessage('firstName')}</p>}
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

        <div className="grid grid-cols-3 max-sm:grid-cols-1 gap-4">
          <div ref={birthdateWrapRef}>
            <label htmlFor="clpep-birthdate" className={labelClass}>
              Birthdate <span className="text-red-500">*</span>
            </label>
            <DatePicker max={todayIso()}
              id="clpep-birthdate"
              className={`${inputClass} ${errCls('birthdate')}`}
              value={formData.birthdate ?? ''}
              onChange={value => { handleBirthdate(value); clearFieldError('birthdate') }}
            />
            {fieldMessage('birthdate') && <p className="text-red-500 text-xs mt-1">{fieldMessage('birthdate')}</p>}
          </div>
          <div>
            <label htmlFor="clpep-age" className={labelClass}>Age</label>
            <input
              id="clpep-age"
              type="number"
              className={inputClass + ' bg-gray-50'}
              placeholder="From birthdate"
              value={formData.birthdate && (formData.age ?? 0) >= 0 ? (formData.age ?? 0) : ''}
              readOnly
            />
          </div>
          <div>
            <label htmlFor="clpep-sex" className={labelClass}>
              Sex <span className="text-red-500">*</span>
            </label>
            <select
              ref={sexRef}
              id="clpep-sex"
              className={`${selectClass} ${errCls('sex')}`}
              value={formData.sex ?? ''}
              onChange={e => { updateField({ sex: e.target.value }); clearFieldError('sex') }}
            >
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
            </select>
            {fieldMessage('sex') && <p className="text-red-500 text-xs mt-1">{fieldMessage('sex')}</p>}
          </div>
        </div>
      </div>
    )
  }

  function renderStep2() {
    return (
      <div className="space-y-5">
        <SectionHeader title="II. ADDRESS INFORMATION" />

        <div className="grid grid-cols-3 max-sm:grid-cols-1 gap-4">
          <div>
            <label className={labelClass}>Province</label>
            <SearchableSelect
              value={formData.province ?? ''}
              placeholder="Search province..."
              disabled={isViewMode}
              fetchOptions={s => searchProvinces(s)}
              onSelect={opt => {
                setProvinceId(opt.id)
                setCityId(null)
                updateField({ province: opt.name, cityMunicipality: '', barangay: '', barangayId: 0 })
              }}
            />
          </div>
          <div>
            <label className={labelClass}>Municipality / City</label>
            <SearchableSelect
              value={formData.cityMunicipality ?? ''}
              placeholder={provinceId ? 'Search city/municipality...' : 'Select province first'}
              disabled={isViewMode || !provinceId}
              refetchKey={provinceId ?? ''}
              fetchOptions={s => searchCities(provinceId ?? 0, s)}
              onSelect={opt => {
                setCityId(opt.id)
                updateField({ cityMunicipality: opt.name, barangay: '', barangayId: 0 })
              }}
            />
          </div>
          <div ref={barangayWrapRef}>
            <label className={labelClass}>
              Barangay <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              value={formData.barangay ?? ''}
              placeholder={cityId ? 'Search barangay...' : 'Select city first'}
              disabled={isViewMode || !cityId}
              hasError={!!fieldMessage('barangay')}
              refetchKey={cityId ?? ''}
              fetchOptions={s => searchBarangaysByCity(cityId ?? 0, s)}
              onSelect={opt => { updateField({ barangay: opt.name, barangayId: opt.id }); clearFieldError('barangay') }}
            />
            {fieldMessage('barangay') && <p className="text-red-500 text-xs mt-1">{fieldMessage('barangay')}</p>}
          </div>
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
      </div>
    )
  }

  function renderStep3() {
    const isCurrentlyInSchool = formData.schoolStatus === 'Currently Enrolled' || formData.schoolStatus === 'ALS Learner'

    const schoolNameLabel = isCurrentlyInSchool ? 'School Name' : 'Last School Attended'
    const gradeYearLevelLabel = isCurrentlyInSchool ? 'Grade Level' : 'Last Grade Level Completed'
    const schoolNamePlaceholder = isCurrentlyInSchool ? 'Enter school name' : 'Enter last school attended'
    const gradeYearLevelPlaceholder = 'e.g. Grade 7'

    return (
      <div className="space-y-5">
        <SectionHeader title="III. CHILD LABOR INFORMATION" />

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

        <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
          <div>
            <label htmlFor="clpep-schoolName" className={labelClass}>{schoolNameLabel}</label>
            <input
              id="clpep-schoolName"
              className={inputClass}
              placeholder={schoolNamePlaceholder}
              value={formData.schoolName ?? ''}
              onChange={e => updateField({ schoolName: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="clpep-gradeYearLevel" className={labelClass}>{gradeYearLevelLabel}</label>
            <input
              id="clpep-gradeYearLevel"
              className={inputClass}
              placeholder={gradeYearLevelPlaceholder}
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

        <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
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
              ref={contactNumberRef}
              id="clpep-guardianContactNumber"
              inputMode="tel"
              className={`${inputClass} ${errCls('contactNumber')}`}
              placeholder="09XXXXXXXXX"
              value={formData.guardianContactNumber ?? ''}
              onChange={e => { updateField({ guardianContactNumber: sanitizeContactNumber(e.target.value) }); clearFieldError('contactNumber') }}
            />
            {fieldMessage('contactNumber') && <p className="text-red-500 text-xs mt-1">{fieldMessage('contactNumber')}</p>}
          </div>
        </div>
      </div>
    )
  }

  function renderStep5() {
    const attachedDocuments = formData.attachedDocuments ?? []

    return (
      <div className="space-y-5">
        <SectionHeader title="V. PESO OFFICE ONLY" />

        <div>
          <p className={labelClass}>Supporting Documents</p>
          <p className="text-xs text-gray-400 mb-3">
            Attach supporting documents / forms (optional / if applicable).
          </p>

          <input
            type="file"
            id="clpep-document-upload"
            className="hidden"
            accept={ATTACHMENT_ACCEPT}
            onChange={handleDocumentUpload}
          />
          <label
            htmlFor="clpep-document-upload"
            className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-dashed border-brand-blue bg-blue-50 text-brand-blue rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
          >
            <Upload size={20} />
            <span className="font-medium">Upload Document</span>
          </label>
          <p className="text-xs text-gray-500 mt-2">Accepted formats: {ATTACHMENT_ACCEPT_LABEL}</p>

          {attachedDocuments.length > 0 && (
            <div className="space-y-3 pt-4 mt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700">Uploaded Documents</h4>
              <div className="space-y-2">
                {attachedDocuments.map(doc => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer pointer-events-auto"
                      onClick={() => setPreviewDoc(doc)}
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <FileText size={20} className="text-brand-blue" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{doc.fileName}</p>
                        <p className="text-xs text-gray-500">{doc.fileSize}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="flex-shrink-0 p-2 text-brand-blue hover:bg-blue-50 rounded-lg transition-colors pointer-events-auto"
                        title="Preview document"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(doc.id)}
                        className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete document"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
          <div>
            <label htmlFor="clpep-dateApplied" className={labelClass}>Date Applied</label>
            <DatePicker max={todayIso()}
              id="clpep-dateApplied"
              className={inputClass}
              value={formData.dateApplied ?? ''}
              onChange={value => updateField({ dateApplied: value })}
            />
          </div>
          <div>
            <label htmlFor="clpep-receivedBy" className={labelClass}>Received By</label>
            <input
              id="clpep-receivedBy"
              className={inputClass}
              placeholder="Enter name of receiver"
              value={formData.receivedBy ?? ''}
              onChange={e => updateField({ receivedBy: e.target.value })} onBlur={() => updateField(withDefaultReceivedBy({ receivedBy: formData.receivedBy ?? '' }, mode === 'add' && !kiosk))}
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

  // What the applicant entered, grouped like the form's sections, for the kiosk review.
  const kioskSections = (): ReviewSection[] => {
    const f = formData
    return [
    { numeral: 'I', title: 'Personal Information', rows: [['Name', fullName(f.lastName, f.firstName, f.middleName, f.nameExtension)], ['Birthdate', fmtDate(f.birthdate)], ['Sex', f.sex]] },
    { numeral: 'II', title: 'Address Information', text: joinText(f.streetPurok, f.barangay, f.cityMunicipality, f.province) },
    { numeral: 'III', title: 'Child Labor Information', rows: [['Child Labor Status', f.childLaborStatus], ['Nature of Work', f.natureOfWork], ['Currently Working', yesNo(f.currentlyWorking)], ['Hours Worked Per Week', f.hoursWorkedPerWeek], ['School Status', f.schoolStatus], ['School Name', f.schoolName], ['Grade / Year Level', f.gradeYearLevel]] },
    { numeral: 'IV', title: 'Parent / Guardian', rows: [['Name', f.guardianName], ['Relationship', f.guardianRelationship], ['Contact Number', f.guardianContactNumber]] },
    ]
  }

  const headerTitle = kiosk ? 'Applicant Registration — CLPEP' : isViewMode
    ? `${formData.lastName ?? ''}, ${formData.firstName ?? ''}`
    : mode === 'add'
      ? 'Add new profile - CLPEP'
      : 'Edit profile - CLPEP'

  const isLastStep = currentStep === steps.length

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <>
    <div className="bg-white rounded-xl shadow-md flex max-lg:flex-col">

      {/* Left sidebar — section stepper (staff only: applicants at the kiosk just go step by step) */}
      {!kiosk && (
      <div className="w-72 max-lg:w-full bg-[#F8F9FA] border-r border-gray-200 pt-[88px] max-lg:pt-6 px-6 pb-6 max-lg:pb-3">
        <nav className="space-y-2">
          {steps.map((step, stepIndex) => (
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
      )}

      {/* Right content area */}
      <div className="flex-1 flex flex-col">

        {/* Header */}
        {kiosk ? (
          <div className="px-8 max-sm:px-4 py-5 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Users size={22} className="text-brand-blue" />
                <h3 className="text-gray-800 m-0 text-lg font-semibold">{headerTitle}</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">Step {currentStep} of {steps.length}</span>
                <button type="button" onClick={onClose} aria-label="Close form" className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={currentStep}>
              <div className="h-full bg-brand-blue rounded-full transition-all" style={{ width: `${(currentStep / steps.length) * 100}%` }} />
            </div>
          </div>
        ) : (
        <div className="flex items-center justify-between px-8 py-6 max-sm:px-4 max-sm:py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Users size={20} className="text-brand-blue" />
            <h3 className="text-gray-800 m-0 text-base font-medium">{headerTitle}</h3>
          </div>
          <button
            type="button"
            onClick={kiosk ? onClose : draft.requestClose}
            aria-label="Close form"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>
        )}

        {/* Form content */}
        <form onSubmit={handleSubmit} className="px-8 py-6 max-sm:px-4 max-sm:py-4">
          {/* CSS-based disabling instead of the native fieldset `disabled`
              attribute -- that cascades to every button inside it, including
              the document preview button, which should stay clickable even
              in view mode (it only opens the preview, it isn't an edit). */}
          <fieldset className={`border-0 p-0 m-0 min-w-0 ${isViewMode ? 'opacity-60 pointer-events-none' : ''}`}>
            {renderCurrentStep()}
          </fieldset>
        </form>

        {/* Footer — navigation buttons */}
        {kiosk ? (
          <div className="border-t border-gray-200 px-8 max-sm:px-4 py-4 flex items-center justify-between gap-3 max-sm:flex-col-reverse">
            <button type="button" onClick={onClose} className="px-6 py-3 text-base text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors max-sm:w-full">
              Cancel
            </button>
            <div className="flex gap-3 max-sm:w-full">
              {currentStep > 1 && (
                <button type="button" onClick={handlePrevious} className="px-8 py-3 text-base text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors max-sm:flex-1">
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={() => (isLastStep ? handleSubmit() : handleSubmit(undefined, true))}
                disabled={draft.saving}
                className="px-10 py-3 text-base font-medium bg-brand-blue text-white rounded-lg hover:bg-[#01a0ff] transition-colors max-sm:flex-1 disabled:opacity-70"
              >
                {isLastStep ? 'Submit' : 'Next'}
              </button>
            </div>
          </div>
        ) : (
        <div className="border-t border-gray-200 px-8 py-4 max-sm:px-4 flex items-center justify-between gap-3">
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
                  onClick={kiosk ? onClose : draft.requestClose}
                  className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                {onEdit && (
                  <button
                    type="button"
                    onClick={onEdit}
                    disabled={!canManage('livelihood')}
                    className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-[#01a0ff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue"
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
                  onClick={kiosk ? onClose : draft.requestClose}
                  className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                {isLastStep ? (
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={(draft.saving || dup.checking)}
                    className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-[#01a0ff] transition-colors disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    {(draft.saving || dup.checking) && <Loader2 size={16} className="animate-spin" />}
                    {kiosk ? 'Submit' : mode === 'add' ? (noDraft ? 'Approve & Save' : 'Save') : 'Save Changes'}
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
        )}

      </div>
    </div>

    {previewDoc && <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
    {draft.modals}
    {kiosk && (
      <KioskReview
        open={kioskPayload !== null}
        sections={kioskSections()}
        onBack={() => setKioskPayload(null)}
        onSubmit={() => draft.wrapSave(onSave)(kioskPayload!)}
        onDone={onClose}
      />
    )}
      {dup.modal}
    </>
  )
}
