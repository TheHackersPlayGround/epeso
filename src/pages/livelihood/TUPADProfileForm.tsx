import { useState } from 'react'
import { X, Upload, Users, FileText, Eye, Trash2 } from 'lucide-react'
import type { TUPADApplicant, TUPADSavedDocument } from '../../contexts/TUPADContext'
import { canManage } from '../../utils/permissions'
import DatePicker from '../../components/DatePicker'
import SearchableSelect from '../../components/SearchableSelect'
import { searchProvinces, searchCities, searchBarangaysByCity } from '../../services/locationService'

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

function AttachedDocsEditor({ docs, onChange }: { docs: TUPADSavedDocument[]; onChange: (docs: TUPADSavedDocument[]) => void }) {
  const [previewDoc, setPreviewDoc] = useState<TUPADSavedDocument | null>(null)

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
        accept=".pdf,.jpg,.jpeg,.png"
      />
      <label
        htmlFor="tupad-document-upload"
        className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-dashed border-brand-blue bg-blue-50 text-brand-blue rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
      >
        <Upload size={20} />
        <span className="font-medium">Upload Document</span>
      </label>
      <p className="text-xs text-gray-500 mt-2">Accepted formats: PDF, JPG, PNG</p>

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
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  onClick={() => setPreviewDoc(doc)}
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
                    onClick={() => setPreviewDoc(doc)}
                    className="flex-shrink-0 p-2 text-brand-blue hover:bg-blue-50 rounded-lg transition-colors"
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

      {previewDoc && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <p className="text-sm text-gray-500 truncate">{previewDoc.customName || previewDoc.fileName}</p>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                aria-label="Close preview"
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-50">
              {/(\.png|\.jpe?g|\.gif|\.webp)$/i.test(previewDoc.fileName) ? (
                <div className="flex items-center justify-center h-full">
                  <img src={previewDoc.dataUrl || previewDoc.url} alt={previewDoc.fileName} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
                </div>
              ) : /\.pdf$/i.test(previewDoc.fileName) ? (
                <iframe src={previewDoc.dataUrl || previewDoc.url} className="w-full h-full min-h-[600px] rounded-lg shadow-lg" title="PDF Preview" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <FileText size={64} className="mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">Preview not available</p>
                  <a href={previewDoc.dataUrl || previewDoc.url} target="_blank" rel="noreferrer" className="text-sm text-brand-blue underline">Open / download file</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Wizard Component ────────────────────────────────────────────────────

export default function TUPADProfileForm({ mode, initial, onSave, onClose, onEdit }: TUPADProfileFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<Omit<TUPADApplicant, 'id'>>({
    ...EMPTY_TUPAD_RECORD,
    ...initial,
  })
  const [provinceId, setProvinceId] = useState<number | null>(null)
  const [cityId, setCityId] = useState<number | null>(null)

  const isViewMode = mode === 'view'
  const isLastStep = currentStep === STEPS.length

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

  function handleNext() { if (currentStep < STEPS.length) setCurrentStep(s => s + 1) }
  function handlePrevious() { if (currentStep > 1) setCurrentStep(s => s - 1) }

  function handleSubmit() {
    if (!formData.lastName || !formData.firstName) {
      alert('Last name and first name are required.')
      return
    }
    if (!formData.sex || !formData.birthdate || !formData.civilStatus) {
      alert('Sex, birthdate, and civil status are required.')
      setCurrentStep(1)
      return
    }
    if (!formData.barangayId) {
      alert('Barangay is required.')
      setCurrentStep(2)
      return
    }
    onSave(formData)
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
            <select className={selectClass} value={formData.sex ?? ''} onChange={e => updateField({ sex: e.target.value as TUPADApplicant['sex'] })}>
              <option value=""></option>
              <option>Male</option>
              <option>Female</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Birthdate <span className="text-red-500">*</span></label>
            <DatePicker className={inputClass} value={formData.birthdate ?? ''} onChange={handleBirthdateChange} />
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

        <div className="grid grid-cols-2 gap-4">
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
          <div>
            <label className={labelClass}>Barangay <span className="text-red-500">*</span></label>
            <SearchableSelect
              value={formData.barangay}
              placeholder={cityId ? 'Search barangay...' : 'Select city first'}
              disabled={isViewMode || !cityId}
              refetchKey={cityId ?? ''}
              fetchOptions={s => searchBarangaysByCity(cityId ?? 0, s)}
              onSelect={opt => updateField({ barangay: opt.name, barangayId: opt.id })}
            />
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
          />
        </div>

        <div>
          <label className={labelClass}>Date Applied</label>
          <DatePicker className={inputClass} value={formData.dateApplied ?? ''} onChange={value => updateField({ dateApplied: value })} />
        </div>

        <div>
          <label className={labelClass}>Remarks</label>
          <textarea rows={3} className={inputClass + ' resize-none'} value={formData.remarks ?? ''} onChange={e => updateField({ remarks: e.target.value })} />
        </div>

        <div>
          <label className={labelClass}>Received By</label>
          <input className={inputClass} placeholder="Staff name" value={formData.receivedBy ?? ''} onChange={e => updateField({ receivedBy: e.target.value })} />
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
                disabled={!canManage('livelihood')}
                className="px-5 py-2 bg-brand-blue text-white text-sm font-semibold rounded-lg hover:bg-brand-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue"
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
