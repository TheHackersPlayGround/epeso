import { useRef, useState } from 'react'
import { Eye } from 'lucide-react'
import type { OFWProfile, OFWSavedAttachment } from '../../contexts/OFWContext'
import DatePicker from '../../components/DatePicker'
import SearchableSelect from '../../components/SearchableSelect'
import { searchProvinces, searchCities, searchBarangaysByCity } from '../../services/locationService'
import { useFieldValidation, NAME_REGEX, type ValidationError } from '../../hooks/useFieldValidation'
import { ATTACHMENT_ACCEPT } from '../../utils/attachments'
import { REQUEST_TYPES, ELPOR_FORMS, EMPLOYMENT_STATUS_OPTIONS, CIVIL_STATUS_OPTIONS, ClearButton } from './AddOFWRequestForm'
import DocumentPreviewModal from '../../components/DocumentPreviewModal'

interface OFWProfileModalProps {
  profile: OFWProfile
  mode: 'view' | 'edit'
  onClose: () => void
  onSave: (updated: OFWProfile) => void
}

const STATUS_OPTIONS: OFWProfile['status'][] = ['Pending', 'Approved', 'Ongoing', 'Completed', 'Rejected']

const STATUS_COLORS: Record<OFWProfile['status'], string> = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Ongoing: 'bg-blue-100 text-blue-700',
  Approved: 'bg-green-100 text-green-700',
  Completed: 'bg-gray-100 text-gray-700',
  Rejected: 'bg-red-100 text-red-700',
}

const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none placeholder:text-gray-400'
const lbl = 'block text-xs uppercase tracking-wide text-gray-600 font-semibold mb-1'

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

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value || '—'}</p>
    </div>
  )
}

function AttachIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
  )
}

function DownloadButton({ attachment, onPreview }: { attachment: OFWSavedAttachment; onPreview?: () => void }) {
  const href = attachment.dataUrl || attachment.url

  const handleDownload = () => {
    if (!href) return
    const a = document.createElement('a')
    a.href = href
    a.download = attachment.fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 font-medium truncate">{attachment.name || attachment.fileName || '(unnamed)'}</p>
        {attachment.fileName && attachment.name !== attachment.fileName && (
          <p className="text-xs text-gray-400 truncate">{attachment.fileName}</p>
        )}
      </div>
      {href && onPreview && (
        <button
          type="button"
          onClick={onPreview}
          className="flex-shrink-0 p-1.5 text-brand-blue hover:bg-blue-50 rounded-lg transition-colors"
          title="Preview"
        >
          <Eye size={16} />
        </button>
      )}
      {href ? (
        <button
          type="button"
          onClick={handleDownload}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-300 text-blue-600 text-xs hover:bg-blue-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </button>
      ) : (
        <span className="flex-shrink-0 px-3 py-1.5 text-xs text-gray-400 italic">No file</span>
      )}
    </div>
  )
}

export default function OFWProfileModal({ profile, mode, onClose, onSave }: OFWProfileModalProps) {
  const [form, setForm] = useState<OFWProfile>(profile)
  const set = (updates: Partial<OFWProfile>) => setForm(f => ({ ...f, ...updates }))
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
  const dateFiledWrapRef = useRef<HTMLDivElement>(null)

  const toggleRequest = (type: string) =>
    set({ typeOfRequest: form.typeOfRequest.includes(type) ? form.typeOfRequest.filter(t => t !== type) : [...form.typeOfRequest, type] })

  function addDocument() {
    set({ attachedDocuments: [...(form.attachedDocuments ?? []), { id: Date.now().toString(), name: '', fileName: '', fileSize: '', url: '' }] })
  }
  function removeDocument(id: string) {
    set({ attachedDocuments: (form.attachedDocuments ?? []).filter(d => d.id !== id) })
  }
  function updateDocName(id: string, name: string) {
    set({ attachedDocuments: (form.attachedDocuments ?? []).map(d => d.id === id ? { ...d, name } : d) })
  }
  async function updateDocFile(id: string, file: File) {
    const att = await readFileAsAttachment(file, '')
    set({ attachedDocuments: (form.attachedDocuments ?? []).map(d => d.id === id ? { ...att, id, name: d.name } : d) })
  }

  const handleSave = () => {
    const lastName = form.lastName.trim()
    const firstName = form.firstName.trim()
    const middleName = form.middleName.trim()
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

    if (!form.contactNumber.trim()) {
      errors.push({ field: 'contactNumber', message: 'Contact Number is required.', focus: () => contactNumberRef.current?.focus() })
    }

    if (!form.sex) {
      errors.push({ field: 'sex', message: 'Sex is required.', focus: () => sexWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) })
    }

    if (!form.birthdate) {
      errors.push({ field: 'birthdate', message: 'Birthdate is required.', focus: () => birthdateWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) })
    }

    if (!form.civilStatus) {
      errors.push({ field: 'civilStatus', message: 'Civil Status is required.', focus: () => civilStatusRef.current?.focus() })
    }

    if (!form.barangayId) {
      errors.push({ field: 'barangay', message: 'Barangay is required.', focus: () => barangayWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) })
    }

    if (!form.employmentStatus) {
      errors.push({ field: 'employmentStatus', message: 'Employment Status is required.', focus: () => employmentStatusRef.current?.focus() })
    }

    if (!form.dateFiled) {
      errors.push({ field: 'dateFiled', message: 'Date Filed is required.', focus: () => dateFiledWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) })
    }

    if (runValidation(errors)) return

    const mi = middleName ? ' ' + middleName.charAt(0) + '.' : ''
    const sfx = form.suffix ? ' ' + form.suffix : ''
    onSave({ ...form, lastName, firstName, middleName, name: `${lastName}, ${firstName}${mi}${sfx}`.trim() })
  }

  const isView = mode === 'view'

  return (
    <div className="h-full bg-brand-bg flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}>
            <svg className="w-4 h-4" style={{ color: '#0077BE' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p className="text-gray-800 font-semibold" style={{ fontSize: 'var(--text-md)' }}>
              {isView ? 'View OFW Profile' : 'Edit OFW Profile'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{profile.referenceNumber}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm overflow-hidden">

          {/* Section bar */}
          <div className="px-6 py-3" style={{ backgroundColor: '#0077BE' }}>
            <p className="text-white font-bold text-sm tracking-wide">PESO REQUEST FOR ASSISTANCE</p>
          </div>

          {isView ? (
            /* ── VIEW MODE ─────────────────────────────────── */
            <div className="px-6 py-6 space-y-6">

              {/* Request Info */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Reference No." value={profile.referenceNumber} />
                <Field label="Date Filed" value={profile.dateFiled} />
                <Field label="Employment Status" value={profile.employmentStatus} />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Status</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[profile.status]}`}>
                    {profile.status}
                  </span>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Personal Info */}
              <div className="grid grid-cols-3 gap-4">
                <Field label="Last Name" value={profile.lastName} />
                <Field label="First Name" value={profile.firstName} />
                <Field label="Middle Name" value={profile.middleName} />
                <Field label="Sex" value={profile.sex} />
                <Field label="Birthdate" value={profile.birthdate} />
                <Field label="Civil Status" value={profile.civilStatus} />
                <Field label="Contact Number" value={profile.contactNumber} />
                <Field label="Email Address" value={profile.email} />
              </div>

              <hr className="border-gray-100" />

              {/* Address */}
              <Field
                label="Complete Address"
                value={[profile.address, profile.barangay, profile.municipality, profile.province].filter(Boolean).join(', ')}
              />

              <hr className="border-gray-100" />

              {/* Type of Request */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">Type of Request</p>
                <div className="space-y-1">
                  {REQUEST_TYPES.map(type => {
                    const checked = profile.typeOfRequest.includes(type)
                    return (
                      <div key={type}>
                        <label className="flex items-center gap-2 text-sm select-none py-1">
                          <input type="checkbox" checked={checked} disabled className="w-4 h-4 rounded border-gray-300 accent-brand-blue disabled:opacity-80" />
                          <span className={checked ? 'text-gray-800' : 'text-gray-400'}>{type}</span>
                        </label>

                        {/* Employment referral sub-panel — only shown if at least one of its
                            fields actually has something in it, not just because the checkbox
                            is ticked (a blank "Desired Position: —" box tells the viewer nothing). */}
                        {type === 'employment referral' && checked
                          && (profile.desiredPosition || profile.typeOfSkill || (profile.agencies ?? []).length > 0) && (
                          <div className="ml-6 mt-1 mb-2 bg-gray-50 rounded-lg border border-gray-200 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#0077BE' }}>Employment Referral Details</p>
                            {(profile.desiredPosition || profile.typeOfSkill) && (
                              <div className="grid grid-cols-2 gap-4 mb-2">
                                {profile.desiredPosition && <Field label="Desired Position" value={profile.desiredPosition} />}
                                {profile.typeOfSkill && <Field label="Type of Skill" value={profile.typeOfSkill} />}
                              </div>
                            )}
                            {(profile.agencies ?? []).length > 0 && (
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Agencies</p>
                                <ul className="list-disc list-inside space-y-1">
                                  {profile.agencies!.map((a, i) => (
                                    <li key={i} className="text-sm text-gray-800">{a}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {/* OWWA Welfare Case sub-panel — only shown when a file was actually attached. */}
                        {type === 'OWWA Welfare Case' && checked && profile.owwaWelfareFile && (
                          <div className="ml-6 mt-1 mb-2 bg-gray-50 rounded-lg border border-gray-200 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#0077BE' }}>OWWA Welfare Case Form</p>
                            <DownloadButton attachment={profile.owwaWelfareFile} onPreview={() => setPreviewDoc(profile.owwaWelfareFile!)} />
                          </div>
                        )}

                        {/* Inquiry (pls specify) sub-panel — only shown when specified. */}
                        {type === 'inquiry (pls specify)' && checked && profile.inquirySpecify && (
                          <div className="ml-6 mt-1 mb-2 bg-gray-50 rounded-lg border border-gray-200 p-4">
                            <Field label="Please Specify" value={profile.inquirySpecify} />
                          </div>
                        )}

                        {/* Other DOLE program (please specify) sub-panel — only shown when specified. */}
                        {type === 'other DOLE program (please specify)' && checked && profile.otherProgramSpecify && (
                          <div className="ml-6 mt-1 mb-2 bg-gray-50 rounded-lg border border-gray-200 p-4">
                            <Field label="Please Specify" value={profile.otherProgramSpecify} />
                          </div>
                        )}

                        {/* Livelihood ELPOR sub-panel — only shown when at least one ELPOR
                            form was actually attached, and then only lists the ones that were
                            (no "No file" placeholders for the rest). */}
                        {type === 'livelihood' && checked && ELPOR_FORMS.some(f => profile.elporFiles?.[f]) && (
                          <div className="ml-6 mt-1 mb-2 bg-gray-50 rounded-lg border border-gray-200 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#0077BE' }}>ELPOR Forms</p>
                            <div className="space-y-2">
                              {ELPOR_FORMS.filter(formName => profile.elporFiles?.[formName]).map(formName => {
                                const att = profile.elporFiles![formName]
                                return (
                                  <DownloadButton key={formName} attachment={{ ...att, name: formName }} onPreview={() => setPreviewDoc({ ...att, name: formName })} />
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {profile.remarks && (
                <>
                  <hr className="border-gray-100" />
                  <Field label="Remarks" value={profile.remarks} />
                </>
              )}

              {/* PESO Office Only */}
              <hr className="border-gray-100" />
              <div>
                <div className="-mx-6 px-6 py-2.5 mb-4" style={{ backgroundColor: '#EFF6FF' }}>
                  <p className="text-sm font-bold tracking-wide" style={{ color: '#0077BE' }}>FOR PESO OFFICE ONLY</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Field label="Date Applied" value={profile.dateApplicationReceived} />
                  <Field label="Received By" value={profile.receivedBy} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Attached Documents</p>
                  {(profile.attachedDocuments ?? []).length > 0 ? (
                    <div className="space-y-2">
                      {profile.attachedDocuments!.map((doc, i) => (
                        <DownloadButton key={i} attachment={doc} onPreview={() => setPreviewDoc(doc)} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No documents attached</p>
                  )}
                </div>
              </div>
            </div>

          ) : (
            /* ── EDIT MODE ─────────────────────────────────── */
            <div className="px-6 py-6 space-y-5">

              {/* Request Info */}
              <div className="grid grid-cols-2 gap-4">
                <div ref={dateFiledWrapRef}>
                  <label className={lbl}>Date Filed <span className="text-red-500">*</span></label>
                  <div className={`rounded-lg ${fieldMessage('dateFiled') ? 'ring-2 ring-red-200' : ''}`}>
                    <DatePicker className={inp} value={form.dateFiled} onChange={value => { set({ dateFiled: value }); clearFieldError('dateFiled') }} />
                  </div>
                  {fieldMessage('dateFiled') && <p className="text-red-500 text-xs mt-1">{fieldMessage('dateFiled')}</p>}
                </div>
                <div>
                  <label className={lbl}>Reference No.</label>
                  <input className={inp + ' bg-gray-50'} value={form.referenceNumber} readOnly />
                </div>
                <div>
                  <label className={lbl}>Employment Status <span className="text-red-500">*</span></label>
                  <select ref={employmentStatusRef} className={`${inp} bg-white ${errCls('employmentStatus')}`} value={form.employmentStatus} onChange={e => { set({ employmentStatus: e.target.value }); clearFieldError('employmentStatus') }}>
                    <option value="">Select Status</option>
                    {EMPLOYMENT_STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                  {fieldMessage('employmentStatus') && <p className="text-red-500 text-xs mt-1">{fieldMessage('employmentStatus')}</p>}
                </div>
                <div>
                  <label className={lbl}>Status <span className="text-red-500">*</span></label>
                  <select className={`${inp} bg-white`} value={form.status} onChange={e => set({ status: e.target.value as OFWProfile['status'] })}>
                    {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Personal Info */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className={lbl}>Surname <span className="text-red-500">*</span></label>
                  <input ref={lastNameRef} className={`${inp} ${errCls('lastName')}`} value={form.lastName} onChange={e => { set({ lastName: e.target.value }); clearFieldError('lastName') }} />
                  {fieldMessage('lastName') && <p className="text-red-500 text-xs mt-1">{fieldMessage('lastName')}</p>}
                </div>
                <div>
                  <label className={lbl}>First Name <span className="text-red-500">*</span></label>
                  <input ref={firstNameRef} className={`${inp} ${errCls('firstName')}`} value={form.firstName} onChange={e => { set({ firstName: e.target.value }); clearFieldError('firstName') }} />
                  {fieldMessage('firstName') && <p className="text-red-500 text-xs mt-1">{fieldMessage('firstName')}</p>}
                </div>
                <div>
                  <label className={lbl}>Middle Name</label>
                  <input ref={middleNameRef} className={`${inp} ${errCls('middleName')}`} value={form.middleName} onChange={e => { set({ middleName: e.target.value }); clearFieldError('middleName') }} />
                  {fieldMessage('middleName') && <p className="text-red-500 text-xs mt-1">{fieldMessage('middleName')}</p>}
                </div>
                <div>
                  <label className={lbl}>Suffix</label>
                  <input className={inp} placeholder="Jr., Sr., III" value={form.suffix} onChange={e => set({ suffix: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div ref={sexWrapRef}>
                  <label className={lbl}>Sex <span className="text-red-500">*</span></label>
                  <div className={`flex gap-6 mt-2 rounded-lg ${fieldMessage('sex') ? 'ring-2 ring-red-200 p-2' : ''}`}>
                    {['Male', 'Female'].map(s => (
                      <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="ofw-edit-sex" value={s} checked={form.sex === s} onChange={() => { set({ sex: s as 'Male' | 'Female' }); clearFieldError('sex') }} className="accent-brand-blue" />
                        {s}
                      </label>
                    ))}
                  </div>
                  {fieldMessage('sex') && <p className="text-red-500 text-xs mt-1">{fieldMessage('sex')}</p>}
                </div>
                <div ref={birthdateWrapRef}>
                  <label className={lbl}>Birthdate <span className="text-red-500">*</span></label>
                  <div className={`rounded-lg ${fieldMessage('birthdate') ? 'ring-2 ring-red-200' : ''}`}>
                    <DatePicker className={inp} value={form.birthdate} onChange={value => { set({ birthdate: value }); clearFieldError('birthdate') }} />
                  </div>
                  {fieldMessage('birthdate') && <p className="text-red-500 text-xs mt-1">{fieldMessage('birthdate')}</p>}
                </div>
                <div>
                  <label className={lbl}>Civil Status <span className="text-red-500">*</span></label>
                  <select ref={civilStatusRef} className={`${inp} bg-white ${errCls('civilStatus')}`} value={form.civilStatus} onChange={e => { set({ civilStatus: e.target.value }); clearFieldError('civilStatus') }}>
                    <option value="">Select</option>
                    {CIVIL_STATUS_OPTIONS.map(cs => <option key={cs}>{cs}</option>)}
                  </select>
                  {fieldMessage('civilStatus') && <p className="text-red-500 text-xs mt-1">{fieldMessage('civilStatus')}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Contact Number <span className="text-red-500">*</span></label>
                  <input ref={contactNumberRef} className={`${inp} ${errCls('contactNumber')}`} placeholder="09XXXXXXXXX" value={form.contactNumber} onChange={e => { set({ contactNumber: e.target.value }); clearFieldError('contactNumber') }} />
                  {fieldMessage('contactNumber') && <p className="text-red-500 text-xs mt-1">{fieldMessage('contactNumber')}</p>}
                </div>
                <div>
                  <label className={lbl}>Email Address</label>
                  <input type="email" className={inp} placeholder="email@example.com" value={form.email} onChange={e => set({ email: e.target.value })} />
                </div>
              </div>

              {/* Address */}
              <div>
                <p className={lbl}>Complete Address</p>
                <div className="grid grid-cols-2 gap-4 mt-1">
                  <div>
                    <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Province</label>
                    <SearchableSelect
                      value={form.province}
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
                      value={form.municipality}
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
                        value={form.barangay}
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
                    <input className={inp} placeholder="House No., Street" value={form.address} onChange={e => set({ address: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Type of Request */}
              <div>
                <p className={lbl}>Type of Request</p>
                <div className="mt-2 space-y-1">
                  {REQUEST_TYPES.map(type => (
                    <div key={type}>
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none py-1">
                        <input
                          type="checkbox"
                          checked={form.typeOfRequest.includes(type)}
                          onChange={() => toggleRequest(type)}
                          className="w-4 h-4 rounded border-gray-400 accent-brand-blue"
                        />
                        {type}
                      </label>

                      {/* Employment referral sub-panel */}
                      {type === 'employment referral' && form.typeOfRequest.includes('employment referral') && (
                        <div className="ml-6 mt-1 mb-2 bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
                          <div>
                            <label className={lbl}>Desired Position</label>
                            <input className={inp} placeholder="Enter desired position" value={form.desiredPosition} onChange={e => set({ desiredPosition: e.target.value })} />
                          </div>
                          <div>
                            <label className={lbl}>Type of Skill</label>
                            <input className={inp} placeholder="Enter type of skill" value={form.typeOfSkill} onChange={e => set({ typeOfSkill: e.target.value })} />
                          </div>
                          <div>
                            <label className={lbl}>Agency</label>
                            {(form.agencies ?? []).map((agency, i) => (
                              <div key={i} className="flex items-center gap-2 mb-2">
                                <input
                                  className={inp}
                                  placeholder={`Agency ${i + 1}`}
                                  value={agency}
                                  onChange={e => set({ agencies: (form.agencies ?? []).map((a, j) => j === i ? e.target.value : a) })}
                                />
                                <button type="button" onClick={() => set({ agencies: (form.agencies ?? []).filter((_, j) => j !== i) })} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            ))}
                            <button type="button" onClick={() => set({ agencies: [...(form.agencies ?? []), ''] })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 mt-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                              Add Agency
                            </button>
                          </div>
                        </div>
                      )}

                      {/* OWWA Welfare Case sub-panel */}
                      {type === 'OWWA Welfare Case' && form.typeOfRequest.includes('OWWA Welfare Case') && (
                        <div className="ml-6 mt-1 mb-2 bg-gray-50 rounded-lg border border-gray-200 p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <AttachIcon />
                            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#0077BE' }}>Attach OWWA Welfare Case Form</p>
                          </div>
                          {form.owwaWelfareFile && <DownloadButton attachment={form.owwaWelfareFile} onPreview={() => setPreviewDoc(form.owwaWelfareFile!)} />}
                          <div className="flex items-center gap-3 mt-2">
                            <input ref={owwaInputRef} type="file" accept={ATTACHMENT_ACCEPT} className="hidden"
                              onChange={async e => { const f = e.target.files?.[0]; if (f) set({ owwaWelfareFile: await readFileAsAttachment(f, 'OWWA Welfare Case Form') }) }}
                            />
                            <button type="button" onClick={() => owwaInputRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100">
                              <AttachIcon />{form.owwaWelfareFile ? 'Replace File' : 'Attach File'}
                            </button>
                            {form.owwaWelfareFile && <ClearButton onClick={() => set({ owwaWelfareFile: null })} />}
                          </div>
                        </div>
                      )}

                      {/* Inquiry (pls specify) sub-panel */}
                      {type === 'inquiry (pls specify)' && form.typeOfRequest.includes('inquiry (pls specify)') && (
                        <div className="ml-6 mt-1 mb-2 bg-gray-50 rounded-lg border border-gray-200 p-4">
                          <label className={lbl}>Please Specify</label>
                          <input className={inp} placeholder="Specify inquiry" value={form.inquirySpecify} onChange={e => set({ inquirySpecify: e.target.value })} />
                        </div>
                      )}

                      {/* Other DOLE program (please specify) sub-panel */}
                      {type === 'other DOLE program (please specify)' && form.typeOfRequest.includes('other DOLE program (please specify)') && (
                        <div className="ml-6 mt-1 mb-2 bg-gray-50 rounded-lg border border-gray-200 p-4">
                          <label className={lbl}>Please Specify</label>
                          <input className={inp} placeholder="Specify DOLE program" value={form.otherProgramSpecify} onChange={e => set({ otherProgramSpecify: e.target.value })} />
                        </div>
                      )}

                      {/* Livelihood sub-panel */}
                      {type === 'livelihood' && form.typeOfRequest.includes('livelihood') && (
                        <div className="ml-6 mt-1 mb-2 bg-gray-50 rounded-lg border border-gray-200 p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <AttachIcon />
                            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#0077BE' }}>ELPOR Forms</p>
                          </div>
                          <div className="space-y-3">
                            {ELPOR_FORMS.map(formName => (
                              <div key={formName} className="space-y-1">
                                {form.elporFiles?.[formName] && <DownloadButton attachment={{ ...form.elporFiles[formName], name: formName }} onPreview={() => setPreviewDoc({ ...form.elporFiles![formName], name: formName })} />}
                                {!form.elporFiles?.[formName] && (
                                  <span className="text-sm text-gray-500 w-32 inline-block">{formName}</span>
                                )}
                                <div className="flex items-center gap-3 mt-1">
                                  <input ref={el => { elporRefs.current[formName] = el }} type="file" accept={ATTACHMENT_ACCEPT} className="hidden"
                                    onChange={async e => { const f = e.target.files?.[0]; if (f) set({ elporFiles: { ...(form.elporFiles ?? {}), [formName]: await readFileAsAttachment(f, formName) } }) }}
                                  />
                                  <button type="button" onClick={() => elporRefs.current[formName]?.click()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100">
                                    <AttachIcon />{form.elporFiles?.[formName] ? 'Replace' : 'Attach File'}
                                  </button>
                                  {form.elporFiles?.[formName] && (
                                    <ClearButton onClick={() => { const next = { ...(form.elporFiles ?? {}) }; delete next[formName]; set({ elporFiles: next }) }} />
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

              {/* Remarks */}
              <div>
                <label className={lbl}>Remarks</label>
                <textarea className={inp + ' resize-none'} rows={3} placeholder="Additional notes or remarks..." value={form.remarks} onChange={e => set({ remarks: e.target.value })} />
              </div>

              {/* PESO Office Only */}
              <div className="border-t border-gray-200 pt-5">
                <div className="px-4 py-2 rounded-lg mb-4" style={{ backgroundColor: '#0077BE' }}>
                  <p className="text-white font-bold text-sm tracking-wide">FOR PESO OFFICE ONLY</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className={lbl}>Date Applied</label>
                    <DatePicker className={inp} value={form.dateApplicationReceived ?? ''} onChange={value => set({ dateApplicationReceived: value })} />
                  </div>
                  <div>
                    <label className={lbl}>Received By</label>
                    <input className={inp} placeholder="Name of receiving officer" value={form.receivedBy ?? ''} onChange={e => set({ receivedBy: e.target.value })} />
                  </div>
                </div>
                <div>
                  <p className={lbl}>Attached Documents</p>
                  <div className="space-y-3 mt-2">
                    {(form.attachedDocuments ?? []).map(doc => (
                      <div key={doc.id} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                        <input className={`${inp} flex-1`} placeholder="Document name (e.g. Birth Certificate)" value={doc.name} onChange={e => updateDocName(doc.id, e.target.value)} />
                        <input ref={el => { docFileRefs.current[doc.id] = el }} type="file" accept={ATTACHMENT_ACCEPT} className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) updateDocFile(doc.id, f) }}
                        />
                        {(doc.dataUrl || doc.url) && (
                          <>
                            <button type="button" onClick={() => setPreviewDoc(doc)} title="Preview"
                              className="flex-shrink-0 p-1.5 text-brand-blue hover:bg-blue-50 rounded-lg">
                              <Eye size={16} />
                            </button>
                            <button type="button" onClick={() => { const a = document.createElement('a'); a.href = (doc.dataUrl || doc.url)!; a.download = doc.fileName; a.click() }}
                              className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1.5 border border-blue-300 rounded-lg text-blue-600 text-xs hover:bg-blue-50">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </button>
                          </>
                        )}
                        <button type="button" onClick={() => docFileRefs.current[doc.id]?.click()}
                          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 whitespace-nowrap">
                          <AttachIcon />
                          {doc.fileName ? <span className="max-w-[100px] truncate text-xs text-gray-500">{doc.fileName}</span> : 'Attach File'}
                        </button>
                        <button type="button" onClick={() => removeDocument(doc.id)} className="flex-shrink-0 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={addDocument} className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 w-full justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Add Document
                    </button>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50">Cancel</button>
                <button type="button" onClick={handleSave} className="px-5 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                  style={{ backgroundColor: '#0077BE' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#0065A5')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0077BE')}
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {previewDoc && <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
    </div>
  )
}
