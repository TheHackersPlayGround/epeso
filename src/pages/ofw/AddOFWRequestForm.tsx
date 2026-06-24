import { useState, useRef } from 'react'
import type { OFWProfile } from '../../contexts/OFWContext'
import DatePicker from '../../components/DatePicker'

interface AddOFWRequestFormProps {
  onClose: () => void
  onSave: (data: Omit<OFWProfile, 'id'>) => void
  nextRefNumber: string
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

const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none placeholder:text-gray-400'
const sublbl = 'block text-xs uppercase tracking-wide text-gray-600 font-semibold mb-1'

function AttachIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
  )
}

export default function AddOFWRequestForm({ onClose, onSave, nextRefNumber }: AddOFWRequestFormProps) {
  const [form, setForm] = useState({
    referenceNumber: nextRefNumber,
    dateFiled: new Date().toISOString().split('T')[0],
    surname: '',
    firstName: '',
    middleName: '',
    suffix: '',
    contactNumber: '',
    houseStreet: '',
    barangay: '',
    municipality: 'Tangub City',
    province: 'Misamis Occidental',
    employmentStatus: '',
    typeOfRequest: [] as string[],
  })

  // Employment referral sub-panel state
  const [desiredPosition, setDesiredPosition] = useState('')
  const [typeOfSkill, setTypeOfSkill] = useState('')
  const [agencies, setAgencies] = useState<string[]>([])

  // OWWA Welfare Case attachment state
  const owwaInputRef = useRef<HTMLInputElement>(null)
  const [owwaAttachment, setOwwaAttachment] = useState<{ fileName: string; fileData: string } | null>(null)

  // PESO Office Only state
  const [dateReceived, setDateReceived] = useState('')
  const [receivedBy, setReceivedBy] = useState('')
  const [attachedDocuments, setAttachedDocuments] = useState<{ id: number; name: string; fileName: string; fileData?: string }[]>([])
  const docFileRefs = useRef<Record<number, HTMLInputElement | null>>({})

  function addDocument() {
    const id = Date.now()
    setAttachedDocuments(prev => [...prev, { id, name: '', fileName: '' }])
  }
  function removeDocument(id: number) {
    setAttachedDocuments(prev => prev.filter(d => d.id !== id))
  }
  function updateDocName(id: number, name: string) {
    setAttachedDocuments(prev => prev.map(d => d.id === id ? { ...d, name } : d))
  }
  async function updateDocFile(id: number, file: File) {
    const fileData = await readFileAsDataURL(file)
    setAttachedDocuments(prev => prev.map(d => d.id === id ? { ...d, fileName: file.name, fileData } : d))
  }

  // ELPOR attachment state
  const elporARef = useRef<HTMLInputElement>(null)
  const elporA2Ref = useRef<HTMLInputElement>(null)
  const elporBRef = useRef<HTMLInputElement>(null)
  const elporB1Ref = useRef<HTMLInputElement>(null)
  const elporCRef = useRef<HTMLInputElement>(null)
  const [elporAttachments, setElporAttachments] = useState<Record<string, { fileName: string; fileData: string }>>({})

  const elporRefs: Record<string, React.RefObject<HTMLInputElement | null>> = {
    'ELPOR Form A': elporARef,
    'ELPOR Form A2': elporA2Ref,
    'ELPOR Form B': elporBRef,
    'ELPOR Form B1': elporB1Ref,
    'ELPOR Form C': elporCRef,
  }

  const readFileAsDataURL = (file: File): Promise<string> =>
    new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = e => resolve((e.target?.result as string) ?? '')
      reader.readAsDataURL(file)
    })

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const toggleRequest = (type: string) => {
    setForm(f => ({
      ...f,
      typeOfRequest: f.typeOfRequest.includes(type)
        ? f.typeOfRequest.filter(t => t !== type)
        : [...f.typeOfRequest, type],
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const mi = form.middleName ? ' ' + form.middleName.charAt(0) + '.' : ''
    const sfx = form.suffix ? ' ' + form.suffix : ''
    const name = `${form.surname}, ${form.firstName}${mi}${sfx}`.trim()
    onSave({
      referenceNumber: form.referenceNumber,
      name,
      contactNumber: form.contactNumber,
      email: '',
      address: form.houseStreet,
      barangay: form.barangay,
      municipality: form.municipality,
      province: form.province,
      dateFiled: form.dateFiled,
      employmentStatus: form.employmentStatus,
      typeOfRequest: form.typeOfRequest,
      status: 'Pending',
      remarks: '',
      desiredPosition: desiredPosition || undefined,
      typeOfSkill: typeOfSkill || undefined,
      agencies: agencies.filter(a => a.trim()).length ? agencies.filter(a => a.trim()) : undefined,
      owwaWelfareFile: owwaAttachment ? { name: 'OFW Welfare Case Form', fileName: owwaAttachment.fileName, fileData: owwaAttachment.fileData } : undefined,
      elporFiles: Object.keys(elporAttachments).length
        ? Object.fromEntries(Object.entries(elporAttachments).map(([k, v]) => [k, { name: k, fileName: v.fileName, fileData: v.fileData }]))
        : undefined,
      dateApplicationReceived: dateReceived,
      receivedBy,
      attachedDocuments: attachedDocuments.map(({ name, fileName, fileData }) => ({ name, fileName, fileData })),
    })
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">

            {/* Date Filed | Reference No. */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Date Filed <span className="text-red-500">*</span></label>
                <DatePicker className={inp} value={form.dateFiled} onChange={value => set('dateFiled', value)} required />
              </div>
              <div>
                <label className={lbl}>Reference No.</label>
                <input className={inp} placeholder="e.g. OFW-2026-00001" value={form.referenceNumber} onChange={e => set('referenceNumber', e.target.value)} />
              </div>
            </div>

            {/* Surname | First Name | Middle Name | Suffix */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className={lbl}>Surname <span className="text-red-500">*</span></label>
                <input className={inp} value={form.surname} onChange={e => set('surname', e.target.value)} required />
              </div>
              <div>
                <label className={lbl}>First Name <span className="text-red-500">*</span></label>
                <input className={inp} value={form.firstName} onChange={e => set('firstName', e.target.value)} required />
              </div>
              <div>
                <label className={lbl}>Middle Name</label>
                <input className={inp} value={form.middleName} onChange={e => set('middleName', e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Suffix</label>
                <input className={inp} placeholder="Jr., Sr., III" value={form.suffix} onChange={e => set('suffix', e.target.value)} />
              </div>
            </div>

            {/* Contact Number */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Contact Number <span className="text-red-500">*</span></label>
                <input className={inp} value={form.contactNumber} onChange={e => set('contactNumber', e.target.value)} required />
              </div>
            </div>

            {/* Complete Address */}
            <div>
              <p className={lbl}>Complete Address</p>
              <div className="grid grid-cols-2 gap-4 mt-1">
                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">House No., Street</label>
                  <input className={inp} placeholder="House No., Street" value={form.houseStreet} onChange={e => set('houseStreet', e.target.value)} />
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
                  <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Province <span className="text-red-500">*</span></label>
                  <input className={inp} value={form.province} onChange={e => set('province', e.target.value)} required />
                </div>
              </div>
            </div>

            {/* Employment Status */}
            <div className="grid grid-cols-2 gap-4">
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
                        checked={form.typeOfRequest.includes(type)}
                        onChange={() => toggleRequest(type)}
                        className="w-4 h-4 rounded border-gray-400 accent-brand-blue"
                      />
                      {type}
                    </label>

                    {/* Employment referral sub-panel */}
                    {type === 'employment referral' && form.typeOfRequest.includes('employment referral') && (
                      <div className="ml-6 mt-1 mb-2 bg-gray-50 rounded-lg border border-gray-200 p-4">
                        <div className="space-y-3">
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
                                <button
                                  type="button"
                                  onClick={() => setAgencies(prev => prev.filter((_, j) => j !== i))}
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
                              onClick={() => setAgencies(prev => [...prev, ''])}
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
                    {type === 'OWWA Welfare Case' && form.typeOfRequest.includes('OWWA Welfare Case') && (
                      <div className="ml-6 mt-1 mb-2 bg-gray-50 rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <AttachIcon />
                          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#0077BE' }}>Attach OFW Welfare Case Form</p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <input ref={owwaInputRef} type="file" className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (f) { const fd = await readFileAsDataURL(f); setOwwaAttachment({ fileName: f.name, fileData: fd }) } }} />
                          <button
                            type="button"
                            onClick={() => owwaInputRef.current?.click()}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <AttachIcon />
                            Attach File
                          </button>
                          {owwaAttachment && <span className="text-xs text-gray-500 truncate max-w-xs">{owwaAttachment.fileName}</span>}
                        </div>
                      </div>
                    )}

                    {/* Livelihood sub-panel */}
                    {type === 'livelihood' && form.typeOfRequest.includes('livelihood') && (
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
                                  ref={elporRefs[formName]}
                                  type="file"
                                  className="hidden"
                                  onChange={async e => { const f = e.target.files?.[0]; if (f) { const fd = await readFileAsDataURL(f); setElporAttachments(prev => ({ ...prev, [formName]: { fileName: f.name, fileData: fd } })) } }}
                                />
                                <button
                                  type="button"
                                  onClick={() => elporRefs[formName]?.current?.click()}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                  <AttachIcon />
                                  Attach File
                                </button>
                                {elporAttachments[formName] && <span className="text-xs text-gray-500 truncate max-w-xs">{elporAttachments[formName].fileName}</span>}
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
                  <DatePicker className={inp} value={dateReceived} onChange={setDateReceived} />
                </div>
                <div>
                  <label className={lbl}>Received By</label>
                  <input className={inp} placeholder="Name of receiving officer" value={receivedBy} onChange={e => setReceivedBy(e.target.value)} />
                </div>
              </div>

              <div>
                <p className={lbl}>Attached Documents</p>
                <div className="space-y-3 mt-2">
                  {attachedDocuments.map(doc => (
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
                type="submit"
                className="px-5 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                style={{ backgroundColor: '#0077BE' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#0065A5')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0077BE')}
              >
                Save Profile
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

