import { useState, useEffect } from 'react'
import type { OFWProfile } from '../../contexts/OFWContext'

interface OFWProfileModalProps {
  profile: OFWProfile
  mode: 'view' | 'edit'
  onClose: () => void
  onSave: (updated: OFWProfile) => void
}

const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none placeholder:text-gray-800'
const lbl = 'block text-xs uppercase tracking-wide text-gray-900 font-semibold mb-1'

const REQUEST_TYPES = [
  'Livelihood Assistance',
  'Legal Assistance',
  'Document Assistance',
  'OWWA Benefits',
  'Skills Training',
  'Medical Assistance',
  'Repatriation Assistance',
  'Others',
]

const STATUS_OPTIONS: OFWProfile['status'][] = ['Pending', 'Ongoing', 'Approved', 'Completed', 'Rejected']

function statusBadge(status: OFWProfile['status']) {
  const map: Record<OFWProfile['status'], string> = {
    Pending: 'bg-yellow-100 text-yellow-700',
    Ongoing: 'bg-blue-100 text-blue-700',
    Approved: 'bg-green-100 text-green-700',
    Completed: 'bg-gray-100 text-gray-700',
    Rejected: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status]}`}>
      {status}
    </span>
  )
}

export default function OFWProfileModal({ profile, mode, onClose, onSave }: OFWProfileModalProps) {
  const [form, setForm] = useState<OFWProfile>(profile)

  useEffect(() => { setForm(profile) }, [profile])

  const set = (field: keyof OFWProfile, value: string) =>
    setForm(f => ({ ...f, [field]: value }))

  const toggleRequest = (type: string) => {
    setForm(f => ({
      ...f,
      typeOfRequest: f.typeOfRequest.includes(type)
        ? f.typeOfRequest.filter(t => t !== type)
        : [...f.typeOfRequest, type],
    }))
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0" style={{ backgroundColor: '#0077BE' }}>
          <div>
            <p className="text-white font-semibold text-sm">{mode === 'edit' ? 'Edit OFW Profile' : 'OFW Profile Details'}</p>
            <p className="text-blue-100 text-xs mt-0.5">{profile.referenceNumber}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal body */}
        <div className="flex-1 overflow-y-auto">
          {mode === 'view' ? (
            <div className="p-6 space-y-5">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Status</span>
                {statusBadge(profile.status)}
              </div>

              <hr className="border-gray-100" />

              {/* Request Info */}
              <div>
                <p className="text-xs font-semibold text-brand-blue uppercase tracking-wide mb-3">Request Information</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Reference Number</p>
                    <p className="text-sm text-gray-800 font-medium">{profile.referenceNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Date Filed</p>
                    <p className="text-sm text-gray-800">{profile.dateFiled}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Employment Status</p>
                    <p className="text-sm text-gray-800">{profile.employmentStatus}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Type of Request</p>
                    <p className="text-sm text-gray-800">{profile.typeOfRequest.join(', ') || '—'}</p>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Personal Info */}
              <div>
                <p className="text-xs font-semibold text-brand-blue uppercase tracking-wide mb-3">Personal Information</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Full Name</p>
                    <p className="text-sm text-gray-800 font-medium">{profile.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Contact Number</p>
                    <p className="text-sm text-gray-800">{profile.contactNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm text-gray-800">{profile.email || '—'}</p>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Address */}
              <div>
                <p className="text-xs font-semibold text-brand-blue uppercase tracking-wide mb-3">Address</p>
                <p className="text-sm text-gray-800">
                  {[profile.address, profile.barangay, profile.municipality, profile.province].filter(Boolean).join(', ')}
                </p>
              </div>

              {profile.remarks && (
                <>
                  <hr className="border-gray-100" />
                  <div>
                    <p className="text-xs font-semibold text-brand-blue uppercase tracking-wide mb-2">Remarks</p>
                    <p className="text-sm text-gray-800">{profile.remarks}</p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <form id="ofw-edit-form" onSubmit={handleSave} className="p-6 space-y-5">
              {/* Request Info */}
              <div>
                <p className="text-xs font-semibold text-brand-blue uppercase tracking-wide mb-3">Request Information</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Reference Number</label>
                    <input className={inp + ' bg-gray-50'} value={form.referenceNumber} readOnly />
                  </div>
                  <div>
                    <label className={lbl}>Date Filed</label>
                    <input type="date" className={inp} value={form.dateFiled} onChange={e => set('dateFiled', e.target.value)} required />
                  </div>
                  <div>
                    <label className={lbl}>Employment Status</label>
                    <select className={inp} value={form.employmentStatus} onChange={e => set('employmentStatus', e.target.value)} required>
                      <option value="">Select status</option>
                      <option>Employed Abroad</option>
                      <option>Unemployed</option>
                      <option>Repatriated</option>
                      <option>Distressed</option>
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Status</label>
                    <select className={inp} value={form.status} onChange={e => set('status', e.target.value as OFWProfile['status'])} required>
                      {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className={lbl}>Type of Request</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {REQUEST_TYPES.map(type => (
                        <label key={type} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.typeOfRequest.includes(type)}
                            onChange={() => toggleRequest(type)}
                            className="w-4 h-4 rounded border-gray-300 accent-brand-blue"
                          />
                          {type}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Personal Info */}
              <div>
                <p className="text-xs font-semibold text-brand-blue uppercase tracking-wide mb-3">Personal Information</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className={lbl}>Full Name</label>
                    <input className={inp} placeholder="Last Name, First Name M.I." value={form.name} onChange={e => set('name', e.target.value)} required />
                  </div>
                  <div>
                    <label className={lbl}>Contact Number</label>
                    <input className={inp} placeholder="09XXXXXXXXX" value={form.contactNumber} onChange={e => set('contactNumber', e.target.value)} required />
                  </div>
                  <div>
                    <label className={lbl}>Email Address</label>
                    <input type="email" className={inp} placeholder="email@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Address */}
              <div>
                <p className="text-xs font-semibold text-brand-blue uppercase tracking-wide mb-3">Address</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className={lbl}>Address / Street / Purok</label>
                    <input className={inp} placeholder="House No., Street, Purok" value={form.address} onChange={e => set('address', e.target.value)} required />
                  </div>
                  <div>
                    <label className={lbl}>Barangay</label>
                    <input className={inp} placeholder="Barangay" value={form.barangay} onChange={e => set('barangay', e.target.value)} required />
                  </div>
                  <div>
                    <label className={lbl}>Municipality / City</label>
                    <input className={inp} value={form.municipality} onChange={e => set('municipality', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className={lbl}>Province</label>
                    <input className={inp} value={form.province} onChange={e => set('province', e.target.value)} />
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Remarks */}
              <div>
                <label className={lbl}>Remarks</label>
                <textarea
                  className={inp + ' resize-none'}
                  rows={3}
                  placeholder="Additional notes or remarks..."
                  value={form.remarks}
                  onChange={e => set('remarks', e.target.value)}
                />
              </div>
            </form>
          )}
        </div>

        {/* Modal footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition-colors"
          >
            {mode === 'view' ? 'Close' : 'Cancel'}
          </button>
          {mode === 'edit' && (
            <button
              type="submit"
              form="ofw-edit-form"
              className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
              style={{ backgroundColor: '#0077BE' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#0065A5')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0077BE')}
            >
              Save Changes
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
