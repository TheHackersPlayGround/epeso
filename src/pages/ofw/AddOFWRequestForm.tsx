import { useRef, useState } from 'react'
import { Eye, FileText, X } from 'lucide-react'
import type { OFWProfile, OFWSavedAttachment } from '../../contexts/OFWContext'
import DatePicker from '../../components/DatePicker'
import SearchableSelect from '../../components/SearchableSelect'
import { searchProvinces, searchCities, searchBarangaysByCity } from '../../services/locationService'
import { useFieldValidation, NAME_REGEX, type ValidationError } from '../../hooks/useFieldValidation'

interface AddOFWRequestFormProps {
  onClose: () => void
  onSave: (data: Omit<OFWProfile, 'id'>) => void
  nextRefNumber: string
}

export const REQUEST_TYPES = [
  'employment referral',
  'skills training',
  'on-line services',
  'registration',
  'accreditation',
  'annual report repatriation',
  'OWWA Scholarship – ODSP/EDSP',
  'OWWA Benefits',
  'OWWA Welfare Case',
  'inquiry (pls specify)',
  'application letter and resume-making',
  're-integration program for OFWs',
  'free clearance for 1st-time jobseekers',
  'labor Market Information (LMI)',
  'livelihood',
  'Job Vacancy for posting',
  'other DOLE program (please specify)',
]

export const ELPOR_FORMS = ['ELPOR Form A', 'ELPOR Form A2', 'ELPOR Form B', 'ELPOR Form B1', 'ELPOR Form C']
export const EMPLOYMENT_STATUS_OPTIONS = ['Employed', 'Unemployed', 'Self Employed', 'Underemployed']
export const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated', 'Divorced']

export const emptyOFWForm: Omit<OFWProfile, 'id'> = {
  beneficiaryServiceId: 0,
  referenceNumber: '',
  lastName: '', firstName: '', middleName: '', suffix: '',
  name: '',
  sex: '', birthdate: '', civilStatus: '',
  contactNumber: '', email: '',
  address: '', barangay: '', barangayId: 0, municipality: '', province: '', region: '',
  dateFiled: new Date().toISOString().split('T')[0],
  employmentStatus: '',
  typeOfRequest: [],
  status: 'Pending',
  remarks: '',
  desiredPosition: '', typeOfSkill: '', agencies: [],
  inquirySpecify: '', otherProgramSpecify: '',
  owwaWelfareFile: null,
  elporFiles: {},
  dateApplicationReceived: '', receivedBy: '',
  attachedDocuments: [],
}

function formatFileSize(bytes: number) {
  if (bytes <= 0) return '0 Bytes'
  const units = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${units[i]}`
}

function readFileAsAttachment(file: File, name: string): Promise<OFWSavedAttachment> {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => resolve({
      id: Date.now().toString() + Math.random().toString(36),
      name, fileName: file.name, fileSize: formatFileSize(file.size),
      url: '', dataUrl: (e.target?.result as string) ?? '',
    })
    reader.readAsDataURL(file)
  })
}

const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none placeholder:text-gray-400'
const sublbl = 'block text-xs uppercase tracking-wide text-gray-600 font-semibold mb-1'

function AttachIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
  )
}

// Rendered as a sibling outside any (possibly transformed/dimmed) ancestor --
// a `fixed inset-0` modal nested inside an ancestor with opacity/filter/
// transform stops being positioned relative to the viewport.
export function DocPreviewModal({ doc, onClose }: { doc: OFWSavedAttachment; onClose: () => void }) {
  const src = doc.dataUrl || doc.url
  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <p className="text-sm text-gray-500 truncate">{doc.fileName}</p>
          <button type="button" onClick={onClose} aria-label="Close preview" className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-gray-50">
          {/(\.png|\.jpe?g|\.gif|\.webp)$/i.test(doc.fileName) ? (
            <div className="flex items-center justify-center h-full">
              <img src={src} alt={doc.fileName} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
            </div>
          ) : /\.pdf$/i.test(doc.fileName) ? (
            <iframe src={src} className="w-full h-full min-h-[600px] rounded-lg shadow-lg" title="PDF Preview" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <FileText size={64} className="mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">Preview not available</p>
              <a href={src} target="_blank" rel="noreferrer" className="text-sm text-brand-blue underline">Open / download file</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PreviewButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title="Preview" className="p-1.5 text-brand-blue hover:bg-blue-50 rounded-lg transition-colors">
      <Eye size={16} />
    </button>
  )
}

export function ClearButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title="Remove file" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
      <X size={16} />
    </button>
  )
}

export default function AddOFWRequestForm({ onClose, onSave, nextRefNumber }: AddOFWRequestFormProps) {
  const [formData, setFormData] = useState<Omit<OFWProfile, 'id'>>({ ...emptyOFWForm, referenceNumber: nextRefNumber })
  const set = (updates: Partial<Omit<OFWProfile, 'id'>>) => setFormData(prev => ({ ...prev, ...updates }))
  const [provinceId, setProvinceId] = useState<number | null>(null)
  const [cityId, setCityId] = useState<number | null>(null)
  const [previewDoc, setPreviewDoc] = useState<OFWSavedAttachment | null>(null)
  const { clearFieldError, errCls, fieldMessage, runValidation } = useFieldValidation()

  const owwaInputRef = useRef<HTMLInputElement>(null)
  const docFileRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const elporRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const lastNameRef = useRef<HTMLInputElement>(null)
  const firstNameRef = useRef<HTMLInputElement>(null)
  const middleNameRef = useRef<HTMLInputElement>(null)
  const contactNumberRef = useRef<HTMLInputElement>(null)
  const sexWrapRef = useRef<HTMLDivElement>(null)
  const birthdateWrapRef = useRef<HTMLDivElement>(null)
  const civilStatusRef = useRef<HTMLSelectElement>(null)
  const barangayWrapRef = useRef<HTMLDivElement>(null)
  const employmentStatusRef = useRef<HTMLSelectElement>(null)
  const referenceNoRef = useRef<HTMLInputElement>(null)
  const dateFiledWrapRef = useRef<HTMLDivElement>(null)

  const toggleRequest = (type: string) => {
    set({ typeOfRequest: formData.typeOfRequest.includes(type) ? formData.typeOfRequest.filter(t => t !== type) : [...formData.typeOfRequest, type] })
  }

  function addDocument() {
    set({ attachedDocuments: [...(formData.attachedDocuments ?? []), { id: Date.now().toString(), name: '', fileName: '', fileSize: '', url: '' }] })
  }
  function removeDocument(id: string) {
    set({ attachedDocuments: (formData.attachedDocuments ?? []).filter(d => d.id !== id) })
  }
  function updateDocName(id: string, name: string) {
    set({ attachedDocuments: (formData.attachedDocuments ?? []).map(d => d.id === id ? { ...d, name } : d) })
  }
  async function updateDocFile(id: string, file: File) {
    const att = await readFileAsAttachment(file, '')
    set({ attachedDocuments: (formData.attachedDocuments ?? []).map(d => d.id === id ? { ...att, id, name: d.name } : d) })
  }

  const handleSave = () => {
    const lastName = formData.lastName.trim()
    const firstName = formData.firstName.trim()
    const middleName = formData.middleName.trim()
    const errors: ValidationError[] = []

    if (!lastName) {
      errors.push({ field: 'lastName', message: 'Surname is required.', focus: () => lastNameRef.current?.focus() })
    } else if (!NAME_REGEX.test(lastName)) {
      errors.push({ field: 'lastName', message: 'Surname must contain letters only (no numbers or symbols).', focus: () => lastNameRef.current?.focus() })
    }

    if (!firstName) {
      errors.push({ field: 'firstName', message: 'First Name is required.', focus: () => firstNameRef.current?.focus() })
    } else if (!NAME_REGEX.test(firstName)) {
      errors.push({ field: 'firstName', message: 'First Name must contain letters only (no numbers or symbols).', focus: () => firstNameRef.current?.focus() })
    }

    if (middleName && !NAME_REGEX.test(middleName)) {
      errors.push({ field: 'middleName', message: 'Middle Name must contain letters only (no numbers or symbols).', focus: () => middleNameRef.current?.focus() })
    }

    if (!formData.contactNumber.trim()) {
      errors.push({ field: 'contactNumber', message: 'Contact Number is required.', focus: () => contactNumberRef.current?.focus() })
    }

    if (!formData.sex) {
      errors.push({ field: 'sex', message: 'Sex is required.', focus: () => sexWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) })
    }

    if (!formData.birthdate) {
      errors.push({ field: 'birthdate', message: 'Birthdate is required.', focus: () => birthdateWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) })
    }

    if (!formData.civilStatus) {
      errors.push({ field: 'civilStatus', message: 'Civil Status is required.', focus: () => civilStatusRef.current?.focus() })
    }

    if (!formData.barangayId) {
      errors.push({ field: 'barangay', message: 'Barangay is required.', focus: () => barangayWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) })
    }

    if (!formData.employmentStatus) {
      errors.push({ field: 'employmentStatus', message: 'Employment Status is required.', focus: () => employmentStatusRef.current?.focus() })
    }

    if (!formData.referenceNumber.trim()) {
      errors.push({ field: 'referenceNumber', message: 'Reference Number is required.', focus: () => referenceNoRef.current?.focus() })
    }

    if (!formData.dateFiled) {
      errors.push({ field: 'dateFiled', message: 'Date Filed is required.', focus: () => dateFiledWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) })
    }

    if (runValidation(errors)) return

    const mi = middleName ? ' ' + middleName.charAt(0) + '.' : ''
    const sfx = formData.suffix ? ' ' + formData.suffix : ''
    onSave({ ...formData, lastName, firstName, middleName, name: `${lastName}, ${firstName}${mi}${sfx}`.trim() })
  }

  const lbl = sublbl

  return (
    <div className="h-full bg-brand-bg flex flex-col">
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}>
            <svg className="w-4 h-4" style={{ color: '#0077BE' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="text-gray-800 font-semibold" style={{ fontSize: 'var(--text-md)' }}>Add New Request — OFW</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm overflow-hidden">

          {/* Section header */}
          <div className="px-6 py-3" style={{ backgroundColor: '#0077BE' }}>
            <p className="text-white font-bold text-sm tracking-wide">PESO REQUEST FOR ASSISTANCE</p>
          </div>

          <div className="p-6 space-y-5">

            {/* Date Filed | Reference No. */}
            <div className="grid grid-cols-2 gap-4">
              <div ref={dateFiledWrapRef}>
                <label className={lbl}>Date Filed <span className="text-red-500">*</span></label>
                <div className={`rounded-lg ${fieldMessage('dateFiled') ? 'ring-2 ring-red-200' : ''}`}>
                  <DatePicker className={inp} value={formData.dateFiled} onChange={value => { set({ dateFiled: value }); clearFieldError('dateFiled') }} />
                </div>
                {fieldMessage('dateFiled') && <p className="text-red-500 text-xs mt-1">{fieldMessage('dateFiled')}</p>}
              </div>
              <div>
                <label className={lbl}>Reference No. <span className="text-red-500">*</span></label>
                <input ref={referenceNoRef} className={`${inp} ${errCls('referenceNumber')}`} placeholder="e.g. OFW-2026-00001" value={formData.referenceNumber} onChange={e => { set({ referenceNumber: e.target.value }); clearFieldError('referenceNumber') }} />
                {fieldMessage('referenceNumber') && <p className="text-red-500 text-xs mt-1">{fieldMessage('referenceNumber')}</p>}
              </div>
            </div>

            {/* Surname | First Name | Middle Name | Suffix */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className={lbl}>Surname <span className="text-red-500">*</span></label>
                <input ref={lastNameRef} className={`${inp} ${errCls('lastName')}`} value={formData.lastName} onChange={e => { set({ lastName: e.target.value }); clearFieldError('lastName') }} />
                {fieldMessage('lastName') && <p className="text-red-500 text-xs mt-1">{fieldMessage('lastName')}</p>}
              </div>
              <div>
                <label className={lbl}>First Name <span className="text-red-500">*</span></label>
                <input ref={firstNameRef} className={`${inp} ${errCls('firstName')}`} value={formData.firstName} onChange={e => { set({ firstName: e.target.value }); clearFieldError('firstName') }} />
                {fieldMessage('firstName') && <p className="text-red-500 text-xs mt-1">{fieldMessage('firstName')}</p>}
              </div>
              <div>
                <label className={lbl}>Middle Name</label>
                <input ref={middleNameRef} className={`${inp} ${errCls('middleName')}`} value={formData.middleName} onChange={e => { set({ middleName: e.target.value }); clearFieldError('middleName') }} />
                {fieldMessage('middleName') && <p className="text-red-500 text-xs mt-1">{fieldMessage('middleName')}</p>}
              </div>
              <div>
                <label className={lbl}>Suffix</label>
                <input className={inp} placeholder="Jr., Sr., III" value={formData.suffix} onChange={e => set({ suffix: e.target.value })} />
              </div>
            </div>

            {/* Sex | Birthdate | Civil Status */}
            <div className="grid grid-cols-3 gap-4">
              <div ref={sexWrapRef}>
                <label className={lbl}>Sex <span className="text-red-500">*</span></label>
                <div className={`flex gap-6 mt-2 rounded-lg ${fieldMessage('sex') ? 'ring-2 ring-red-200 p-2' : ''}`}>
                  {['Male', 'Female'].map(s => (
                    <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="ofw-add-sex" value={s} checked={formData.sex === s} onChange={() => { set({ sex: s as 'Male' | 'Female' }); clearFieldError('sex') }} className="accent-brand-blue" />
                      {s}
                    </label>
                  ))}
                </div>
                {fieldMessage('sex') && <p className="text-red-500 text-xs mt-1">{fieldMessage('sex')}</p>}
              </div>
              <div ref={birthdateWrapRef}>
                <label className={lbl}>Birthdate <span className="text-red-500">*</span></label>
                <div className={`rounded-lg ${fieldMessage('birthdate') ? 'ring-2 ring-red-200' : ''}`}>
                  <DatePicker className={inp} value={formData.birthdate} onChange={value => { set({ birthdate: value }); clearFieldError('birthdate') }} />
                </div>
                {fieldMessage('birthdate') && <p className="text-red-500 text-xs mt-1">{fieldMessage('birthdate')}</p>}
              </div>
              <div>
                <label className={lbl}>Civil Status <span className="text-red-500">*</span></label>
                <select ref={civilStatusRef} className={`${inp} bg-white ${errCls('civilStatus')}`} value={formData.civilStatus} onChange={e => { set({ civilStatus: e.target.value }); clearFieldError('civilStatus') }}>
                  <option value="">Select</option>
                  {CIVIL_STATUS_OPTIONS.map(cs => <option key={cs}>{cs}</option>)}
                </select>
                {fieldMessage('civilStatus') && <p className="text-red-500 text-xs mt-1">{fieldMessage('civilStatus')}</p>}
              </div>
            </div>

            {/* Contact Number | Email */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Contact Number <span className="text-red-500">*</span></label>
                <input ref={contactNumberRef} className={`${inp} ${errCls('contactNumber')}`} value={formData.contactNumber} onChange={e => { set({ contactNumber: e.target.value }); clearFieldError('contactNumber') }} />
                {fieldMessage('contactNumber') && <p className="text-red-500 text-xs mt-1">{fieldMessage('contactNumber')}</p>}
              </div>
              <div>
                <label className={lbl}>Email</label>
                <input className={inp} type="email" value={formData.email} onChange={e => set({ email: e.target.value })} />
              </div>
            </div>

            {/* Complete Address */}
            <div>
              <p className={lbl}>Complete Address</p>
              <div className="grid grid-cols-2 gap-4 mt-1">
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Province</label>
                  <SearchableSelect
                    value={formData.province}
                    placeholder="Search province..."
                    fetchOptions={(s) => searchProvinces(s)}
                    onSelect={(opt) => {
                      setProvinceId(opt.id)
                      setCityId(null)
                      set({ province: opt.name, municipality: '', barangay: '', barangayId: 0 })
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Municipality/City</label>
                  <SearchableSelect
                    value={formData.municipality}
                    placeholder={provinceId ? 'Search city/municipality...' : 'Select province first'}
                    disabled={!provinceId}
                    refetchKey={provinceId ?? ''}
                    fetchOptions={(s) => searchCities(provinceId ?? 0, s)}
                    onSelect={(opt) => {
                      setCityId(opt.id)
                      set({ municipality: opt.name, barangay: '', barangayId: 0 })
                    }}
                  />
                </div>
                <div ref={barangayWrapRef}>
                  <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Barangay <span className="text-red-500">*</span></label>
                  <div className={`rounded-lg ${fieldMessage('barangay') ? 'ring-2 ring-red-200' : ''}`}>
                    <SearchableSelect
                      value={formData.barangay}
                      placeholder={cityId ? 'Search barangay...' : 'Select city first'}
                      disabled={!cityId}
                      refetchKey={cityId ?? ''}
                      fetchOptions={(s) => searchBarangaysByCity(cityId ?? 0, s)}
                      onSelect={(opt) => { set({ barangay: opt.name, barangayId: opt.id }); clearFieldError('barangay') }}
                    />
                  </div>
                  {fieldMessage('barangay') && <p className="text-red-500 text-xs mt-1">{fieldMessage('barangay')}</p>}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">House No., Street</label>
                  <input className={inp} placeholder="House No., Street" value={formData.address} onChange={e => set({ address: e.target.value })} />
                </div>
              </div>
            </div>

            {/* Employment Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Employment Status <span className="text-red-500">*</span></label>
                <select ref={employmentStatusRef} className={`${inp} bg-white ${errCls('employmentStatus')}`} value={formData.employmentStatus} onChange={e => { set({ employmentStatus: e.target.value }); clearFieldError('employmentStatus') }}>
                  <option value="">Select Status</option>
                  {EMPLOYMENT_STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
                {fieldMessage('employmentStatus') && <p className="text-red-500 text-xs mt-1">{fieldMessage('employmentStatus')}</p>}
              </div>
            </div>

            {/* Type of Request */}
            <div>
              <p className={lbl}>Type of Request</p>
              <div className="mt-2">
                {REQUEST_TYPES.map(type => (
                  <div key={type}>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none py-1">
                      <input
                        type="checkbox"
                        checked={formData.typeOfRequest.includes(type)}
                        onChange={() => toggleRequest(type)}
                        className="w-4 h-4 rounded border-gray-400 accent-brand-blue"
                      />
                      {type}
                    </label>

                    {/* Employment referral sub-panel */}
                    {type === 'employment referral' && formData.typeOfRequest.includes('employment referral') && (
                      <div className="ml-6 mt-1 mb-2 bg-gray-50 rounded-lg border border-gray-200 p-4">
                        <div className="space-y-3">
                          <div>
                            <label className={lbl}>Desired Position</label>
                            <input className={inp} placeholder="Enter desired position" value={formData.desiredPosition} onChange={e => set({ desiredPosition: e.target.value })} />
                          </div>
                          <div>
                            <label className={lbl}>Type of Skill</label>
                            <input className={inp} placeholder="Enter type of skill" value={formData.typeOfSkill} onChange={e => set({ typeOfSkill: e.target.value })} />
                          </div>
                          <div>
                            <label className={lbl}>Agency</label>
                            {(formData.agencies ?? []).map((agency, i) => (
                              <div key={i} className="flex items-center gap-2 mb-2">
                                <input
                                  className={inp}
                                  placeholder={`Agency ${i + 1}`}
                                  value={agency}
                                  onChange={e => set({ agencies: (formData.agencies ?? []).map((a, j) => j === i ? e.target.value : a) })}
                                />
                                <button
                                  type="button"
                                  onClick={() => set({ agencies: (formData.agencies ?? []).filter((_, j) => j !== i) })}
                                  className="flex-shrink-0 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => set({ agencies: [...(formData.agencies ?? []), ''] })}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 transition-colors mt-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Add Agency
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* OWWA Welfare Case sub-panel */}
                    {type === 'OWWA Welfare Case' && formData.typeOfRequest.includes('OWWA Welfare Case') && (
                      <div className="ml-6 mt-1 mb-2 bg-gray-50 rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <AttachIcon />
                          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#0077BE' }}>Attach OWWA Welfare Case Form</p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <input ref={owwaInputRef} type="file" className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (f) set({ owwaWelfareFile: await readFileAsAttachment(f, 'OWWA Welfare Case Form') }) }} />
                          <button
                            type="button"
                            onClick={() => owwaInputRef.current?.click()}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <AttachIcon />
                            Attach File
                          </button>
                          {formData.owwaWelfareFile && (
                            <>
                              <span className="text-xs text-gray-500 truncate max-w-xs">{formData.owwaWelfareFile.fileName}</span>
                              <PreviewButton onClick={() => setPreviewDoc(formData.owwaWelfareFile!)} />
                              <ClearButton onClick={() => set({ owwaWelfareFile: null })} />
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Inquiry (pls specify) sub-panel */}
                    {type === 'inquiry (pls specify)' && formData.typeOfRequest.includes('inquiry (pls specify)') && (
                      <div className="ml-6 mt-1 mb-2 bg-gray-50 rounded-lg border border-gray-200 p-4">
                        <label className={lbl}>Please Specify</label>
                        <input className={inp} placeholder="Specify inquiry" value={formData.inquirySpecify} onChange={e => set({ inquirySpecify: e.target.value })} />
                      </div>
                    )}

                    {/* Other DOLE program (please specify) sub-panel */}
                    {type === 'other DOLE program (please specify)' && formData.typeOfRequest.includes('other DOLE program (please specify)') && (
                      <div className="ml-6 mt-1 mb-2 bg-gray-50 rounded-lg border border-gray-200 p-4">
                        <label className={lbl}>Please Specify</label>
                        <input className={inp} placeholder="Specify DOLE program" value={formData.otherProgramSpecify} onChange={e => set({ otherProgramSpecify: e.target.value })} />
                      </div>
                    )}

                    {/* Livelihood sub-panel */}
                    {type === 'livelihood' && formData.typeOfRequest.includes('livelihood') && (
                      <div className="ml-6 mt-1 mb-2 bg-gray-50 rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <AttachIcon />
                          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#0077BE' }}>Attach ELPOR Forms</p>
                        </div>
                        <div className="space-y-3">
                          {ELPOR_FORMS.map(formName => (
                            <div key={formName} className="flex items-center gap-4">
                              <span className="text-sm text-gray-600 w-32 shrink-0">{formName}</span>
                              <div className="flex items-center gap-3 flex-wrap">
                                <input
                                  ref={el => { elporRefs.current[formName] = el }}
                                  type="file"
                                  className="hidden"
                                  onChange={async e => { const f = e.target.files?.[0]; if (f) set({ elporFiles: { ...(formData.elporFiles ?? {}), [formName]: await readFileAsAttachment(f, formName) } }) }}
                                />
                                <button
                                  type="button"
                                  onClick={() => elporRefs.current[formName]?.click()}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                  <AttachIcon />
                                  Attach File
                                </button>
                                {formData.elporFiles?.[formName] && (
                                  <>
                                    <span className="text-xs text-gray-500 truncate max-w-xs">{formData.elporFiles[formName].fileName}</span>
                                    <PreviewButton onClick={() => setPreviewDoc(formData.elporFiles![formName])} />
                                    <ClearButton onClick={() => { const next = { ...(formData.elporFiles ?? {}) }; delete next[formName]; set({ elporFiles: next }) }} />
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* PESO Office Only */}
            <div className="border-t border-gray-200 pt-5">
              <div className="px-4 py-2 rounded-lg mb-4" style={{ backgroundColor: '#0077BE' }}>
                <p className="text-white font-bold text-sm tracking-wide">FOR PESO OFFICE ONLY</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className={lbl}>Date Applied</label>
                  <DatePicker className={inp} value={formData.dateApplicationReceived ?? ''} onChange={value => set({ dateApplicationReceived: value })} />
                </div>
                <div>
                  <label className={lbl}>Received By</label>
                  <input className={inp} placeholder="Name of receiving officer" value={formData.receivedBy ?? ''} onChange={e => set({ receivedBy: e.target.value })} />
                </div>
              </div>

              <div>
                <p className={lbl}>Attached Documents</p>
                <div className="space-y-3 mt-2">
                  {(formData.attachedDocuments ?? []).map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                      <input
                        className={`${inp} flex-1`}
                        placeholder="Document name (e.g. Birth Certificate)"
                        value={doc.name}
                        onChange={e => updateDocName(doc.id, e.target.value)}
                      />
                      <input
                        ref={el => { docFileRefs.current[doc.id] = el }}
                        type="file"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) updateDocFile(doc.id, f) }}
                      />
                      <button
                        type="button"
                        onClick={() => docFileRefs.current[doc.id]?.click()}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors whitespace-nowrap"
                      >
                        <AttachIcon />
                        {doc.fileName ? <span className="max-w-[120px] truncate text-xs text-gray-500">{doc.fileName}</span> : 'Attach File'}
                      </button>
                      {doc.fileName && <PreviewButton onClick={() => setPreviewDoc(doc)} />}
                      <button
                        type="button"
                        onClick={() => removeDocument(doc.id)}
                        className="flex-shrink-0 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addDocument}
                    className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors w-full justify-center"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Document
                  </button>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                style={{ backgroundColor: '#0077BE' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#0065A5')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0077BE')}
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      </div>
      {previewDoc && <DocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
    </div>
  )
}
