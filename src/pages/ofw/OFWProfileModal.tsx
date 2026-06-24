import { useState, useRef } from 'react'
import type { OFWProfile, OFWAttachment } from '../../contexts/OFWContext'
import DatePicker from '../../components/DatePicker'

interface OFWProfileModalProps {
  profile: OFWProfile
  mode: 'view' | 'edit'
  onClose: () => void
  onSave: (updated: OFWProfile) => void
}

const REQUEST_TYPES = [
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

const ELPOR_FORMS = ['ELPOR Form A', 'ELPOR Form A2', 'ELPOR Form B', 'ELPOR Form B1', 'ELPOR Form C']

const STATUS_OPTIONS: OFWProfile['status'][] = ['Pending', 'Ongoing', 'Approved', 'Completed', 'Rejected']

const STATUS_COLORS: Record<OFWProfile['status'], string> = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Ongoing: 'bg-blue-100 text-blue-700',
  Approved: 'bg-green-100 text-green-700',
  Completed: 'bg-gray-100 text-gray-700',
  Rejected: 'bg-red-100 text-red-700',
}

const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none placeholder:text-gray-400'
const lbl = 'block text-xs uppercase tracking-wide text-gray-600 font-semibold mb-1'

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

function DownloadButton({ attachment }: { attachment: OFWAttachment }) {
  const handleDownload = () => {
    if (!attachment.fileData) return
    const a = document.createElement('a')
    a.href = attachment.fileData
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
      {attachment.fileData ? (
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

  // Edit mode: employment referral sub-panel
  const [desiredPosition, setDesiredPosition] = useState(profile.desiredPosition ?? '')
  const [typeOfSkill, setTypeOfSkill] = useState(profile.typeOfSkill ?? '')
  const [agencies, setAgencies] = useState<string[]>(profile.agencies ?? [])

  // Edit mode: OWWA welfare case
  const owwaInputRef = useRef<HTMLInputElement>(null)
  const [owwaAttachment, setOwwaAttachment] = useState<OFWAttachment | null>(profile.owwaWelfareFile ?? null)

  // Edit mode: ELPOR files
  const elporARef = useRef<HTMLInputElement>(null)
  const elporA2Ref = useRef<HTMLInputElement>(null)
  const elporBRef = useRef<HTMLInputElement>(null)
  const elporB1Ref = useRef<HTMLInputElement>(null)
  const elporCRef = useRef<HTMLInputElement>(null)
  const [elporAttachments, setElporAttachments] = useState<Record<string, OFWAttachment>>(profile.elporFiles ?? {})
  const elporRefs: Record<string, React.RefObject<HTMLInputElement | null>> = {
    'ELPOR Form A': elporARef,
    'ELPOR Form A2': elporA2Ref,
    'ELPOR Form B': elporBRef,
    'ELPOR Form B1': elporB1Ref,
    'ELPOR Form C': elporCRef,
  }

  // Edit mode: attached documents (PESO Office Only)
  const [attachedDocuments, setAttachedDocuments] = useState<{ id: number; name: string; fileName: string; fileData?: string }[]>(
    (profile.attachedDocuments ?? []).map((d, i) => ({ ...d, id: i + 1 }))
  )
  const docFileRefs = useRef<Record<number, HTMLInputElement | null>>({})

  const readFileAsDataURL = (file: File): Promise<string> =>
    new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = e => resolve((e.target?.result as string) ?? '')
      reader.readAsDataURL(file)
    })

  const set = (field: keyof OFWProfile, value: string) =>
    setForm(f => ({ ...f, [field]: value }))

  const toggleRequest = (type: string) =>
    setForm(f => ({
      ...f,
      typeOfRequest: f.typeOfRequest.includes(type)
        ? f.typeOfRequest.filter(t => t !== type)
        : [...f.typeOfRequest, type],
    }))

  const addDocument = () => {
    const id = Date.now()
    setAttachedDocuments(prev => [...prev, { id, name: '', fileName: '' }])
  }
  const removeDocument = (id: number) => setAttachedDocuments(prev => prev.filter(d => d.id !== id))
  const updateDocName = (id: number, name: string) =>
    setAttachedDocuments(prev => prev.map(d => d.id === id ? { ...d, name } : d))
  const updateDocFile = async (id: number, file: File) => {
    const fileData = await readFileAsDataURL(file)
    setAttachedDocuments(prev => prev.map(d => d.id === id ? { ...d, fileName: file.name, fileData } : d))
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...form,
      desiredPosition: desiredPosition || undefined,
      typeOfSkill: typeOfSkill || undefined,
      agencies: agencies.filter(a => a.trim()).length ? agencies.filter(a => a.trim()) : undefined,
      owwaWelfareFile: owwaAttachment ?? undefined,
      elporFiles: Object.keys(elporAttachments).length ? elporAttachments : undefined,
      attachedDocuments: attachedDocuments.map(({ name, fileName, fileData }) => ({ name, fileName, fileData })),
    })
  }

  const isView = mode === 'view'
  const hasEmploymentReferral = profile.typeOfRequest.includes('employment referral')
  const hasOwwa = profile.typeOfRequest.includes('OWWA Welfare Case')
  const hasLivelihood = profile.typeOfRequest.includes('livelihood')

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
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Field label="Full Name" value={profile.name} /></div>
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
                {profile.typeOfRequest.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {profile.typeOfRequest.map(t => (
                      <span key={t} className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-medium capitalize">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic mb-4">None specified</p>
                )}

                {/* Employment referral sub-panel */}
                {hasEmploymentReferral && (
                  <div className="ml-0 bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#0077BE' }}>Employment Referral Details</p>
                    <div className="grid grid-cols-2 gap-4 mb-2">
                      <Field label="Desired Position" value={profile.desiredPosition} />
                      <Field label="Type of Skill" value={profile.typeOfSkill} />
                    </div>
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

                {/* OWWA Welfare Case sub-panel */}
                {hasOwwa && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#0077BE' }}>OFW Welfare Case Form</p>
                    {profile.owwaWelfareFile ? (
                      <DownloadButton attachment={profile.owwaWelfareFile} />
                    ) : (
                      <p className="text-sm text-gray-400 italic">No file attached</p>
                    )}
                  </div>
                )}

                {/* Livelihood ELPOR sub-panel */}
                {hasLivelihood && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#0077BE' }}>ELPOR Forms</p>
                    <div className="space-y-2">
                      {ELPOR_FORMS.map(formName => {
                        const att = profile.elporFiles?.[formName]
                        return att ? (
                          <DownloadButton key={formName} attachment={{ ...att, name: formName }} />
                        ) : (
                          <div key={formName} className="flex items-center gap-3 bg-white border border-gray-100 rounded-lg px-3 py-2">
                            <span className="text-sm text-gray-500 flex-1">{formName}</span>
                            <span className="text-xs text-gray-400 italic">No file</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
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
                        <DownloadButton key={i} attachment={doc} />
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
            <form id="ofw-edit-form" onSubmit={handleSave} className="px-6 py-6 space-y-5">

              {/* Request Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Date Filed <span className="text-red-500">*</span></label>
                  <DatePicker className={inp} value={form.dateFiled} onChange={value => set('dateFiled', value)} required />
                </div>
                <div>
                  <label className={lbl}>Reference No.</label>
                  <input className={inp + ' bg-gray-50'} value={form.referenceNumber} readOnly />
                </div>
                <div>
                  <label className={lbl}>Employment Status <span className="text-red-500">*</span></label>
                  <select className={inp} value={form.employmentStatus} onChange={e => set('employmentStatus', e.target.value)} required>
                    <option value="">Select Status</option>
                    <option>employed</option>
                    <option>self-employed</option>
                    <option>unemployed</option>
                    <option>underemployed</option>
                  </select>
                </div>
                <div>
                  <label className={lbl}>Status <span className="text-red-500">*</span></label>
                  <select className={inp} value={form.status} onChange={e => set('status', e.target.value as OFWProfile['status'])} required>
                    {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Personal Info */}
              <div>
                <label className={lbl}>Full Name <span className="text-red-500">*</span></label>
                <input className={inp} placeholder="Last Name, First Name M.I." value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Contact Number <span className="text-red-500">*</span></label>
                  <input className={inp} placeholder="09XXXXXXXXX" value={form.contactNumber} onChange={e => set('contactNumber', e.target.value)} required />
                </div>
                <div>
                  <label className={lbl}>Email Address</label>
                  <input type="email" className={inp} placeholder="email@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
              </div>

              {/* Address */}
              <div>
                <p className={lbl}>Complete Address</p>
                <div className="grid grid-cols-2 gap-4 mt-1">
                  <div>
                    <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">House No., Street</label>
                    <input className={inp} placeholder="House No., Street" value={form.address} onChange={e => set('address', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Barangay <span className="text-red-500">*</span></label>
                    <input className={inp} value={form.barangay} onChange={e => set('barangay', e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Municipality/City <span className="text-red-500">*</span></label>
                    <input className={inp} value={form.municipality} onChange={e => set('municipality', e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Province</label>
                    <input className={inp} value={form.province} onChange={e => set('province', e.target.value)} />
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
                            <input className={inp} placeholder="Enter desired position" value={desiredPosition} onChange={e => setDesiredPosition(e.target.value)} />
                          </div>
                          <div>
                            <label className={lbl}>Type of Skill</label>
                            <input className={inp} placeholder="Enter type of skill" value={typeOfSkill} onChange={e => setTypeOfSkill(e.target.value)} />
                          </div>
                          <div>
                            <label className={lbl}>Agency</label>
                            {agencies.map((agency, i) => (
                              <div key={i} className="flex items-center gap-2 mb-2">
                                <input
                                  className={inp}
                                  placeholder={`Agency ${i + 1}`}
                                  value={agency}
                                  onChange={e => setAgencies(prev => prev.map((a, j) => j === i ? e.target.value : a))}
                                />
                                <button type="button" onClick={() => setAgencies(prev => prev.filter((_, j) => j !== i))} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            ))}
                            <button type="button" onClick={() => setAgencies(prev => [...prev, ''])} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 mt-1">
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
                            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#0077BE' }}>Attach OFW Welfare Case Form</p>
                          </div>
                          {owwaAttachment && <DownloadButton attachment={owwaAttachment} />}
                          <div className="flex items-center gap-3 mt-2">
                            <input ref={owwaInputRef} type="file" className="hidden"
                              onChange={async e => { const f = e.target.files?.[0]; if (f) { const fd = await readFileAsDataURL(f); setOwwaAttachment({ name: 'OFW Welfare Case Form', fileName: f.name, fileData: fd }) } }}
                            />
                            <button type="button" onClick={() => owwaInputRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100">
                              <AttachIcon />{owwaAttachment ? 'Replace File' : 'Attach File'}
                            </button>
                          </div>
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
                                {elporAttachments[formName] && <DownloadButton attachment={{ ...elporAttachments[formName], name: formName }} />}
                                {!elporAttachments[formName] && (
                                  <span className="text-sm text-gray-500 w-32 inline-block">{formName}</span>
                                )}
                                <div className="flex items-center gap-3 mt-1">
                                  <input ref={elporRefs[formName]} type="file" className="hidden"
                                    onChange={async e => { const f = e.target.files?.[0]; if (f) { const fd = await readFileAsDataURL(f); setElporAttachments(prev => ({ ...prev, [formName]: { name: formName, fileName: f.name, fileData: fd } })) } }}
                                  />
                                  <button type="button" onClick={() => elporRefs[formName]?.current?.click()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100">
                                    <AttachIcon />{elporAttachments[formName] ? 'Replace' : 'Attach File'}
                                  </button>
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
                <textarea className={inp + ' resize-none'} rows={3} placeholder="Additional notes or remarks..." value={form.remarks} onChange={e => set('remarks', e.target.value)} />
              </div>

              {/* PESO Office Only */}
              <div className="border-t border-gray-200 pt-5">
                <div className="px-4 py-2 rounded-lg mb-4" style={{ backgroundColor: '#0077BE' }}>
                  <p className="text-white font-bold text-sm tracking-wide">FOR PESO OFFICE ONLY</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className={lbl}>Date Applied</label>
                    <DatePicker className={inp} value={form.dateApplicationReceived ?? ''} onChange={value => set('dateApplicationReceived', value)} />
                  </div>
                  <div>
                    <label className={lbl}>Received By</label>
                    <input className={inp} placeholder="Name of receiving officer" value={form.receivedBy ?? ''} onChange={e => set('receivedBy', e.target.value)} />
                  </div>
                </div>
                <div>
                  <p className={lbl}>Attached Documents</p>
                  <div className="space-y-3 mt-2">
                    {attachedDocuments.map(doc => (
                      <div key={doc.id} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                        <input className={`${inp} flex-1`} placeholder="Document name (e.g. Birth Certificate)" value={doc.name} onChange={e => updateDocName(doc.id, e.target.value)} />
                        <input ref={el => { docFileRefs.current[doc.id] = el }} type="file" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) updateDocFile(doc.id, f) }}
                        />
                        {doc.fileData && (
                          <button type="button" onClick={() => { const a = document.createElement('a'); a.href = doc.fileData!; a.download = doc.fileName; a.click() }}
                            className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1.5 border border-blue-300 rounded-lg text-blue-600 text-xs hover:bg-blue-50">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          </button>
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
                <button type="submit" className="px-5 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                  style={{ backgroundColor: '#0077BE' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#0065A5')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0077BE')}
                >
                  Save Changes
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
