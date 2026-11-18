import { useRef, useState } from 'react'
import { X, Upload, Users, FileText, Eye, Trash2, Loader2 } from 'lucide-react'
import type { TUPADApplicant, TUPADSavedDocument } from '../../contexts/TUPADContext'
import { canManage } from '../../utils/permissions'
import DatePicker from '../../components/DatePicker'
import SearchableSelect from '../../components/SearchableSelect'
import DocumentPreviewModal from '../../components/DocumentPreviewModal'
import { searchProvinces, searchCities, searchBarangaysByCity } from '../../services/locationService'
import { useFieldValidation, NAME_REGEX, type ValidationError } from '../../hooks/useFieldValidation'
import { useProfileDraft } from '../../hooks/useFormDraft'
import { useDuplicateCheck } from '../../hooks/useDuplicateCheck'
import { ATTACHMENT_ACCEPT, ATTACHMENT_ACCEPT_LABEL } from '../../utils/attachments'
import { sanitizeContactNumber, isValidContactNumber, CONTACT_NUMBER_MESSAGE } from '../../utils/contactNumber'
import { fmtDate, todayIso } from '../../utils/formatDate'
import { withDefaultReceivedBy } from '../../utils/currentUser'
import KioskReview, { type ReviewSection } from '../../kiosk/KioskReview'
import { fullName, joinText } from '../../kiosk/kioskReviewUtils'

// ─── Constants ────────────────────────────────────────────────────────────────

const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated', 'Annulled'] as const

const STEPS = [
  { id: 1, label: 'PERSONAL INFORMATION' },
  { id: 2, label: 'ADDRESS INFORMATION' },
  { id: 3, label: 'PESO OFFICE ONLY' },
] as const

const ROMAN_NUMERALS = ['I', 'II', 'III'] as const

export const EMPTY_TUPAD_RECORD: Omit<TUPADApplicant, 'id'> = {
  beneficiaryServiceId: 0,
  firstName: '',
  lastName: '',
  middleName: '',
  nameExtension: '',
  sex: '',
  birthdate: '',
  age: 0,
  civilStatus: '',
  contactNumber: '',
  streetPurok: '',
  barangay: '',
  barangayId: 0,
  cityMunicipality: '',
  province: '',
  region: '',
  assignedProjectId: null,
  assignedProjectName: '',
  assignedProjectStatus: '',
  assignmentHistory: [],
  attachedDocuments: [],
  dateApplied: '',
  remarks: '',
  receivedBy: '',
  status: 'Inactive',
}

// ─── Types ────────────────────────────────────────────────────────────────────

type TUPADProfileFormProps = {
  mode: 'add' | 'edit' | 'view'
  initial: Omit<TUPADApplicant, 'id'>
  onSave: (data: Omit<TUPADApplicant, 'id'>) => void
  onClose: () => void
  onEdit?: () => void
  /** Applicant self-service kiosk: only the applicant's own sections, no drafts or duplicate check. */
  kiosk?: boolean
  /** Staff reviewing a kiosk submission: no saved drafts (one submission's draft would be offered for the next). */
  noDraft?: boolean
}

// ─── Shared CSS ───────────────────────────────────────────────────────────────

const inputClass = [
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900',
  'focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none',
  'placeholder:text-gray-500 disabled:bg-gray-50 disabled:cursor-default',
].join(' ')

const selectClass = inputClass + ' bg-white'
const labelClass = 'block text-gray-700 mb-2 text-xs font-semibold uppercase'

// ─── Document upload section (base64, matches SPES/GIP's backend contract) ───

function formatFileSize(bytes: number) {
  if (bytes <= 0) return '0 Bytes'
  const units = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${units[i]}`
}

type AttachedDocsEditorProps = {
  docs: TUPADSavedDocument[]
  onChange: (docs: TUPADSavedDocument[]) => void
  onPreview: (doc: TUPADSavedDocument) => void
}

// previewDoc renders in the parent, not nested here -- a view-mode-dimmed
// ancestor's opacity/filter/transform would break this modal's fixed positioning.
function AttachedDocsEditor({ docs, onChange, onPreview }: AttachedDocsEditorProps) {
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      onChange([...docs, {
        id: Date.now().toString() + Math.random().toString(36),
        customName: file.name,
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        url: URL.createObjectURL(file),
        dataUrl,
      }])
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleRemoveFile(index: number) {
    onChange(docs.filter((_, i) => i !== index))
  }

  return (
    <div>
      <input
        type="file"
        id="tupad-document-upload"
        className="hidden"
        onChange={handleFileChange}
        accept={ATTACHMENT_ACCEPT}
      />
      <label
        htmlFor="tupad-document-upload"
        className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-dashed border-brand-blue bg-blue-50 text-brand-blue rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
      >
        <Upload size={20} />
        <span className="font-medium">Upload Document</span>
      </label>
      <p className="text-xs text-gray-500 mt-2">Accepted formats: {ATTACHMENT_ACCEPT_LABEL}</p>

      {docs.length > 0 && (
        <div className="space-y-3 pt-4 mt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700">Uploaded Documents</h4>
          <div className="space-y-2">
            {docs.map((doc, index) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer pointer-events-auto"
                  onClick={() => onPreview(doc)}
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <FileText size={20} className="text-brand-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{doc.customName || doc.fileName}</p>
                    <p className="text-xs text-gray-500">{doc.fileSize}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onPreview(doc)}
                    className="flex-shrink-0 p-2 text-brand-blue hover:bg-blue-50 rounded-lg transition-colors pointer-events-auto"
                    title="Preview document"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
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
  )
}

// ─── Main Wizard Component ────────────────────────────────────────────────────

export default function TUPADProfileForm({ mode, initial, onSave, onClose, onEdit, kiosk = false, noDraft = false }: TUPADProfileFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<Omit<TUPADApplicant, 'id'>>(() => withDefaultReceivedBy({ ...EMPTY_TUPAD_RECORD, ...initial }, mode === 'add' && !kiosk))
  const [provinceId, setProvinceId] = useState<number | null>(null)
  const [cityId, setCityId] = useState<number | null>(null)
  const dup = useDuplicateCheck('tupad')
  // The last section of every form is "PESO OFFICE ONLY": applicants at the kiosk never see it.
  const steps = kiosk ? STEPS.slice(0, -1) : STEPS
  // Kiosk: the finished form, shown on the "check your information" screen before it is sent.
  const [kioskPayload, setKioskPayload] = useState<Parameters<typeof onSave>[0] | null>(null)
  const draft = useProfileDraft({
    draftKey: 'tupad-beneficiary', mode: mode, formData, setFormData,
    provinceId, setProvinceId, cityId, setCityId, onClose, enabled: !kiosk && !noDraft,
  })
  const [previewDoc, setPreviewDoc] = useState<TUPADSavedDocument | null>(null)
  const { clearFieldError, errCls, fieldMessage, runValidation } = useFieldValidation()

  const contactNumberRef = useRef<HTMLInputElement>(null)
  const lastNameRef = useRef<HTMLInputElement>(null)
  const firstNameRef = useRef<HTMLInputElement>(null)
  const middleNameRef = useRef<HTMLInputElement>(null)
  const sexRef = useRef<HTMLSelectElement>(null)
  const birthdateWrapRef = useRef<HTMLDivElement>(null)
  const civilStatusRef = useRef<HTMLSelectElement>(null)
  const barangayWrapRef = useRef<HTMLDivElement>(null)

  const isViewMode = mode === 'view'
  const isLastStep = currentStep === steps.length

  function updateField(fields: Partial<Omit<TUPADApplicant, 'id'>>) {
    if (isViewMode) return
    setFormData(prev => ({ ...prev, ...fields }))
  }

  function handleBirthdateChange(value: string) {
    const ageCalculated = value
      ? Math.floor((Date.now() - new Date(value).getTime()) / (365.25 * 24 * 3600 * 1000))
      : 0
    updateField({ birthdate: value, age: ageCalculated })
  }

  function handleNext() { if (currentStep < steps.length) setCurrentStep(s => s + 1) }
  function handlePrevious() { if (currentStep > 1) setCurrentStep(s => s - 1) }

  function handleSubmit(advance = false) {
    const lastName = (formData.lastName ?? '').trim()
    const firstName = (formData.firstName ?? '').trim()
    const middleName = (formData.middleName ?? '').trim()
    const errors: ValidationError[] = []

    const focusStep1 = (fn: () => void) => () => { setCurrentStep(1); setTimeout(fn, 0) }
    const focusStep2 = (fn: () => void) => () => { setCurrentStep(2); setTimeout(fn, 0) }

    if (!lastName) {
      errors.push({ field: 'lastName', message: 'Last Name is required.', focus: focusStep1(() => lastNameRef.current?.focus()) })
    } else if (!NAME_REGEX.test(lastName)) {
      errors.push({ field: 'lastName', message: 'Last Name must contain letters only (no numbers or symbols).', focus: focusStep1(() => lastNameRef.current?.focus()) })
    }

    if (!firstName) {
      errors.push({ field: 'firstName', message: 'First Name is required.', focus: focusStep1(() => firstNameRef.current?.focus()) })
    } else if (!NAME_REGEX.test(firstName)) {
      errors.push({ field: 'firstName', message: 'First Name must contain letters only (no numbers or symbols).', focus: focusStep1(() => firstNameRef.current?.focus()) })
    }

    if (middleName && !NAME_REGEX.test(middleName)) {
      errors.push({ field: 'middleName', message: 'Middle Name must contain letters only (no numbers or symbols).', focus: focusStep1(() => middleNameRef.current?.focus()) })
    }

    if (!formData.sex) {
      errors.push({ field: 'sex', message: 'Sex is required.', focus: focusStep1(() => sexRef.current?.focus()) })
    }

    if (!formData.birthdate) {
      errors.push({ field: 'birthdate', message: 'Birthdate is required.', focus: focusStep1(() => birthdateWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })) })
    }

    if (!formData.civilStatus) {
      errors.push({ field: 'civilStatus', message: 'Civil Status is required.', focus: focusStep1(() => civilStatusRef.current?.focus()) })
    }

    if (!formData.barangayId) {
      errors.push({ field: 'barangay', message: 'Barangay is required.', focus: focusStep2(() => barangayWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })) })
    }

    if ((formData.contactNumber ?? '').trim() && !isValidContactNumber((formData.contactNumber ?? ''))) {
      errors.push({ field: 'contactNumber', message: CONTACT_NUMBER_MESSAGE, focus: focusStep1(() => contactNumberRef.current?.focus()) })
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

    if (kiosk) { setKioskPayload(formData); return }
    void dup.confirmSave(mode, { firstName: formData.firstName, lastName: formData.lastName, birthdate: formData.birthdate }, initial)
      .then(proceed => { if (proceed) draft.wrapSave(onSave)(withDefaultReceivedBy(formData, mode === 'add')) })
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

        <div className="grid grid-cols-4 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-4">
          <div>
            <label className={labelClass}>Last Name <span className="text-red-500">*</span></label>
            <input ref={lastNameRef} className={`${inputClass} ${errCls('lastName')}`} placeholder="Enter last name" value={formData.lastName ?? ''} onChange={e => { updateField({ lastName: e.target.value }); clearFieldError('lastName') }} />
            {fieldMessage('lastName') && <p className="text-red-500 text-xs mt-1">{fieldMessage('lastName')}</p>}
          </div>
          <div>
            <label className={labelClass}>First Name <span className="text-red-500">*</span></label>
            <input ref={firstNameRef} className={`${inputClass} ${errCls('firstName')}`} placeholder="Enter first name" value={formData.firstName ?? ''} onChange={e => { updateField({ firstName: e.target.value }); clearFieldError('firstName') }} />
            {fieldMessage('firstName') && <p className="text-red-500 text-xs mt-1">{fieldMessage('firstName')}</p>}
          </div>
          <div>
            <label className={labelClass}>Middle Name</label>
            <input ref={middleNameRef} className={`${inputClass} ${errCls('middleName')}`} placeholder="Enter middle name" value={formData.middleName ?? ''} onChange={e => { updateField({ middleName: e.target.value }); clearFieldError('middleName') }} />
            {fieldMessage('middleName') && <p className="text-red-500 text-xs mt-1">{fieldMessage('middleName')}</p>}
          </div>
          <div>
            <label className={labelClass}>Extension Name</label>
            <input className={inputClass} placeholder="Jr., Sr., III" value={formData.nameExtension ?? ''} onChange={e => updateField({ nameExtension: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-5 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-4">
          <div>
            <label className={labelClass}>Sex <span className="text-red-500">*</span></label>
            <select ref={sexRef} className={`${selectClass} ${errCls('sex')}`} value={formData.sex ?? ''} onChange={e => { updateField({ sex: e.target.value as TUPADApplicant['sex'] }); clearFieldError('sex') }}>
              <option value=""></option>
              <option>Male</option>
              <option>Female</option>
            </select>
            {fieldMessage('sex') && <p className="text-red-500 text-xs mt-1">{fieldMessage('sex')}</p>}
          </div>
          <div ref={birthdateWrapRef}>
            <label className={labelClass}>Birthdate <span className="text-red-500">*</span></label>
            <div className={`rounded-lg ${fieldMessage('birthdate') ? 'ring-2 ring-red-200' : ''}`}>
              <DatePicker max={todayIso()} className={inputClass} value={formData.birthdate ?? ''} onChange={value => { handleBirthdateChange(value); clearFieldError('birthdate') }} />
            </div>
            {fieldMessage('birthdate') && <p className="text-red-500 text-xs mt-1">{fieldMessage('birthdate')}</p>}
          </div>
          <div>
            <label className={labelClass}>Age</label>
            <input type="number" className={inputClass + ' bg-gray-50'} placeholder="From birthdate" value={formData.birthdate && (formData.age ?? 0) >= 0 ? (formData.age ?? 0) : ''} readOnly />
          </div>
          <div>
            <label className={labelClass}>Civil Status <span className="text-red-500">*</span></label>
            <select ref={civilStatusRef} className={`${selectClass} ${errCls('civilStatus')}`} value={formData.civilStatus ?? ''} onChange={e => { updateField({ civilStatus: e.target.value }); clearFieldError('civilStatus') }}>
              <option value=""></option>
              {CIVIL_STATUS_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
            {fieldMessage('civilStatus') && <p className="text-red-500 text-xs mt-1">{fieldMessage('civilStatus')}</p>}
          </div>
          <div>
            <label className={labelClass}>Contact Number</label>
            <input ref={contactNumberRef} inputMode="tel" className={`${inputClass} ${errCls('contactNumber')}`} placeholder="09XXXXXXXXX" value={formData.contactNumber ?? ''} onChange={e => { updateField({ contactNumber: sanitizeContactNumber(e.target.value) }); clearFieldError('contactNumber') }} />
            {fieldMessage('contactNumber') && <p className="text-red-500 text-xs mt-1">{fieldMessage('contactNumber')}</p>}
          </div>
        </div>
      </div>
    )
  }

  function renderStep2() {
    return (
      <div className="space-y-5">
        <SectionHeader title="II. ADDRESS INFORMATION" />

        <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
          <div>
            <label className={labelClass}>Province</label>
            <SearchableSelect
              value={formData.province}
              placeholder="Search province..."
              disabled={isViewMode}
              fetchOptions={s => searchProvinces(s)}
              onSelect={opt => {
                setProvinceId(opt.id)
                setCityId(null)
                updateField({ province: opt.name, cityMunicipality: '', barangay: '', barangayId: 0, region: '' })
              }}
            />
          </div>
          <div>
            <label className={labelClass}>City / Municipality</label>
            <SearchableSelect
              value={formData.cityMunicipality}
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
            <label className={labelClass}>Barangay <span className="text-red-500">*</span></label>
            <div className={`rounded-lg ${fieldMessage('barangay') ? 'ring-2 ring-red-200' : ''}`}>
              <SearchableSelect
                value={formData.barangay}
                placeholder={cityId ? 'Search barangay...' : 'Select city first'}
                disabled={isViewMode || !cityId}
                refetchKey={cityId ?? ''}
                fetchOptions={s => searchBarangaysByCity(cityId ?? 0, s)}
                onSelect={opt => { updateField({ barangay: opt.name, barangayId: opt.id }); clearFieldError('barangay') }}
              />
            </div>
            {fieldMessage('barangay') && <p className="text-red-500 text-xs mt-1">{fieldMessage('barangay')}</p>}
          </div>
          <div>
            <label className={labelClass}>Street / Purok</label>
            <input className={inputClass} placeholder="Enter street or purok" value={formData.streetPurok ?? ''} onChange={e => updateField({ streetPurok: e.target.value })} />
          </div>
        </div>
      </div>
    )
  }

  function renderStep3() {
    return (
      <div className="space-y-5">
        <SectionHeader title="III. PESO OFFICE ONLY" />

        <div>
          <p className={labelClass}>Supporting Documents</p>
          <p className="text-xs text-gray-400">Attach TUPAD Application Form, Valid ID, and other supporting documents.</p>
          <AttachedDocsEditor
            docs={formData.attachedDocuments ?? []}
            onChange={attachedDocuments => updateField({ attachedDocuments })}
            onPreview={setPreviewDoc}
          />
        </div>

        <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
          <div>
            <label className={labelClass}>Date Applied</label>
            <DatePicker max={todayIso()} className={inputClass} value={formData.dateApplied ?? ''} onChange={value => updateField({ dateApplied: value })} />
          </div>
          <div>
            <label className={labelClass}>Received By</label>
            <input className={inputClass} placeholder="Staff name" value={formData.receivedBy ?? ''} onChange={e => updateField({ receivedBy: e.target.value })} onBlur={() => updateField(withDefaultReceivedBy({ receivedBy: formData.receivedBy ?? '' }, mode === 'add' && !kiosk))} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Remarks</label>
          <textarea rows={3} className={inputClass + ' resize-none'} value={formData.remarks ?? ''} onChange={e => updateField({ remarks: e.target.value })} />
        </div>
      </div>
    )
  }

  function renderCurrentStep() {
    switch (currentStep) {
      case 1: return renderStep1()
      case 2: return renderStep2()
      case 3: return renderStep3()
      default: return null
    }
  }

  // What the applicant entered, grouped like the form's sections, for the kiosk review.
  const kioskSections = (): ReviewSection[] => {
    const f = formData
    return [
    { numeral: 'I', title: 'Personal Information', rows: [['Name', fullName(f.lastName, f.firstName, f.middleName, f.nameExtension)], ['Birthdate', fmtDate(f.birthdate)], ['Sex', f.sex], ['Civil Status', f.civilStatus], ['Contact Number', f.contactNumber]] },
    { numeral: 'II', title: 'Address Information', text: joinText(f.streetPurok, f.barangay, f.cityMunicipality, f.province) },
    ]
  }

  const headerTitle = kiosk ? 'Applicant Registration — TUPAD' : isViewMode
    ? `${formData.lastName ?? ''}, ${formData.firstName ?? ''}`
    : mode === 'add' ? 'Add new profile - TUPAD' : 'Edit profile - TUPAD'

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
    <div className="bg-white rounded-xl shadow-md flex max-lg:flex-col">

      {/* Left sidebar — step selector (staff only: applicants at the kiosk just go step by step) */}
      {!kiosk && (
      <div className="w-72 max-lg:w-full bg-[#F8F9FA] border-r border-gray-200 pt-[88px] max-lg:pt-6 px-6 pb-6 max-lg:pb-3">
        <nav className="space-y-2">
          {steps.map((step, idx) => (
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
          <div className="flex items-center gap-2">
            {isViewMode && onEdit && (
              <button
                type="button"
                onClick={onEdit}
                disabled={!canManage('livelihood')}
                className="px-5 py-2 bg-brand-blue text-white text-sm font-semibold rounded-lg hover:bg-brand-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue"
              >
                Edit
              </button>
            )}
            <button type="button" onClick={kiosk ? onClose : draft.requestClose} aria-label="Close form" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={24} className="text-gray-600" />
            </button>
          </div>
        </div>
        )}

        {/* Step content */}
        <div className="flex-1 px-8 py-6 max-sm:px-4 max-sm:py-4 overflow-y-auto">
          {/* CSS-based disabling instead of the native fieldset `disabled`
              attribute -- that cascades to every button inside it, including
              the document preview button, which should stay clickable even
              in view mode (it only opens the preview, it isn't an edit). */}
          <fieldset className={`border-0 p-0 m-0 min-w-0 ${isViewMode ? 'opacity-60 pointer-events-none' : ''}`}>
            {renderCurrentStep()}
          </fieldset>
        </div>

        {/* Footer — navigation */}
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
                onClick={() => (isLastStep ? handleSubmit() : handleSubmit(true))}
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
              <button type="button" onClick={handlePrevious} className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Previous
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isViewMode ? (
              <>
                <button type="button" onClick={kiosk ? onClose : draft.requestClose} className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
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
                <button type="button" onClick={kiosk ? onClose : draft.requestClose} className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                {isLastStep ? (
                  <button type="button" onClick={() => handleSubmit()} disabled={(draft.saving || dup.checking)} className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-[#01a0ff] transition-colors disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2">
                    {(draft.saving || dup.checking) && <Loader2 size={16} className="animate-spin" />}
                    {kiosk ? 'Submit' : mode === 'add' ? (noDraft ? 'Approve & Save' : 'Add Beneficiary') : 'Save Changes'}
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
