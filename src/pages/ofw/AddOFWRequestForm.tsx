import { useState, useRef } from 'react'
import type { OFWProfile } from '../../contexts/OFWContext'

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

const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0077BE] focus:border-transparent outline-none placeholder:text-gray-400'
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
  const [owwaFile, setOwwaFile] = useState('')

  // ELPOR attachment state
  const elporARef = useRef<HTMLInputElement>(null)
  const elporA2Ref = useRef<HTMLInputElement>(null)
  const elporBRef = useRef<HTMLInputElement>(null)
  const elporB1Ref = useRef<HTMLInputElement>(null)
  const elporCRef = useRef<HTMLInputElement>(null)
  const [elporFiles, setElporFiles] = useState<Record<string, string>>({})

  const elporRefs: Record<string, React.RefObject<HTMLInputElement | null>> = {
    'ELPOR Form A': elporARef,
    'ELPOR Form A2': elporA2Ref,
    'ELPOR Form B': elporBRef,
    'ELPOR Form B1': elporB1Ref,
    'ELPOR Form C': elporCRef,
  }

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
    })
  }

  const lbl = sublbl

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="px-6 py-6">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm overflow-hidden">

          {/* Panel header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" style={{ color: '#0077BE' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="font-semibold text-gray-800 text-sm">PESO Request for Assistance</span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Section I header */}
          <div className="px-6 py-3" style={{ backgroundColor: '#0077BE' }}>
            <p className="text-white font-bold text-sm tracking-wide">I. PESO REQUEST FOR ASSISTANCE</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">

            {/* Date Filed | Reference No. */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Date Filed <span className="text-red-500">*</span></label>
                <input type="date" className={inp} value={form.dateFiled} onChange={e => set('dateFiled', e.target.value)} required />
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
                  <option>Employed Abroad</option>
                  <option>Unemployed</option>
                  <option>Repatriated</option>
                  <option>Distressed</option>
                  <option>Self-employed</option>
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
                        className="w-4 h-4 rounded border-gray-400 accent-[#0077BE]"
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
                          <input ref={owwaInputRef} type="file" className="hidden" onChange={e => setOwwaFile(e.target.files?.[0]?.name ?? '')} />
                          <button
                            type="button"
                            onClick={() => owwaInputRef.current?.click()}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <AttachIcon />
                            Attach File
                          </button>
                          {owwaFile && <span className="text-xs text-gray-500 truncate max-w-xs">{owwaFile}</span>}
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
                                  onChange={e => setElporFiles(prev => ({ ...prev, [formName]: e.target.files?.[0]?.name ?? '' }))}
                                />
                                <button
                                  type="button"
                                  onClick={() => elporRefs[formName]?.current?.click()}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                  <AttachIcon />
                                  Attach File
                                </button>
                                {elporFiles[formName] && <span className="text-xs text-gray-500 truncate max-w-xs">{elporFiles[formName]}</span>}
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
