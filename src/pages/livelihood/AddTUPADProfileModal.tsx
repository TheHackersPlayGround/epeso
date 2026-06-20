import { useState } from 'react'
import { X } from 'lucide-react'
import type { LivelihoodBeneficiary, LivelihoodStatus } from '../../contexts/LivelihoodContext'

// ─── Constants ────────────────────────────────────────────────────────────────

const TUPAD_STATUS_OPTIONS: LivelihoodStatus[] = [
  'Active', 'Completed', 'Dropped', 'Pending', 'Inactive',
]

const SEX_OPTIONS = ['Male', 'Female']

const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated', 'Annulled']

export const EMPTY_TUPAD_RECORD: Omit<LivelihoodBeneficiary, 'id'> = {
  name: '',
  service: 'DILEEP (TUPAD)',
  status: 'Pending',
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

type TUPADModalProps = {
  mode: 'add' | 'edit' | 'view'
  initial: Omit<LivelihoodBeneficiary, 'id'>
  onSave: (data: Omit<LivelihoodBeneficiary, 'id'>) => void
  onClose: () => void
  onEdit?: () => void
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputClass = [
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900',
  'focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none',
  'placeholder:text-gray-400',
].join(' ')

const selectClass = inputClass + ' bg-white'
const labelClass = 'block text-gray-600 mb-1.5 text-sm font-medium'

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

// ─── View-mode sub-components ─────────────────────────────────────────────────

function ViewSection({ title }: { title: string }) {
  return (
    <div className="border-b border-gray-200 pb-2 mb-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
    </div>
  )
}

function ViewField({ label, value }: { label: string; value?: string | number }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value || '—'}</p>
    </div>
  )
}

// ─── Form section header ──────────────────────────────────────────────────────

function SectionHeader({ numeral, title }: { numeral: string; title: string }) {
  return (
    <div className="flex items-center gap-3 bg-blue-50 rounded-lg px-4 py-3 mb-5">
      <span className="bg-brand-blue text-white text-xs font-bold w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0">
        {numeral}
      </span>
      <span className="text-brand-blue font-semibold text-base">{title}</span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AddTUPADProfileModal({ mode, initial, onSave, onClose, onEdit }: TUPADModalProps) {
  const [formData, setFormData] = useState<Omit<LivelihoodBeneficiary, 'id'>>(resolveInitial(initial))
  const [attachmentInput, setAttachmentInput] = useState('')

  const isViewMode = mode === 'view'

  function updateField(fields: Partial<Omit<LivelihoodBeneficiary, 'id'>>) {
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

  function handleAddAttachment() {
    if (!attachmentInput.trim()) return
    updateField({ attachedForms: [...(formData.attachedForms ?? []), attachmentInput.trim()] })
    setAttachmentInput('')
  }

  function handleRemoveAttachment(index: number) {
    updateField({ attachedForms: (formData.attachedForms ?? []).filter((_, i) => i !== index) })
  }

  function handleSubmit() {
    if (!formData.lastName || !formData.firstName) {
      alert('Last name and first name are required.')
      return
    }
    const givenNames = [formData.firstName, formData.middleName, formData.nameExtension].filter(Boolean).join(' ')
    const fullName = `${formData.lastName}, ${givenNames}`
    onSave({ ...formData, name: fullName })
  }

  // ── View mode ────────────────────────────────────────────────────────────────

  if (isViewMode) {
    const displayName = [formData.lastName, [formData.firstName, formData.middleName].filter(Boolean).join(' ')]
      .filter(Boolean).join(', ') || formData.name
    const forms = formData.attachedForms ?? []

    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

          {/* View header */}
          <div className="flex items-start justify-between px-8 py-5 border-b border-gray-200">
            <div>
              <h2 className="font-bold text-xl" style={{ color: '#000' }}>{displayName}</h2>
              <p className="text-brand-blue text-sm mt-0.5">DILEEP – TUPAD</p>
            </div>
            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="px-5 py-2 bg-brand-blue text-white text-sm font-semibold rounded-lg hover:bg-[#01a0ff] transition-colors"
                >
                  Edit
                </button>
              )}
              <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* View body */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">

            <section>
              <ViewSection title="Personal Information" />
              <div className="grid grid-cols-3 gap-x-6 gap-y-5 mb-5">
                <ViewField label="Last Name"   value={formData.lastName} />
                <ViewField label="First Name"  value={formData.firstName} />
                <ViewField label="Middle Name" value={formData.middleName} />
              </div>
              <div className="grid grid-cols-3 gap-x-6 gap-y-5 mb-5">
                <ViewField label="Sex"          value={formData.sex} />
                <ViewField label="Birthdate"    value={formData.birthdate} />
                <ViewField label="Age"          value={formData.age} />
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <ViewField label="Civil Status"    value={formData.civilStatus} />
                <ViewField label="Contact Number"  value={formData.contactNumber} />
              </div>
            </section>

            <section>
              <ViewSection title="Address" />
              <div className="grid grid-cols-2 gap-x-6 gap-y-5 mb-5">
                <ViewField label="Street / Purok" value={formData.streetPurok} />
                <ViewField label="Barangay"        value={formData.barangay} />
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <ViewField label="City / Municipality" value={formData.cityMunicipality} />
                <ViewField label="Province"             value={formData.province} />
              </div>
            </section>

            <section>
              <ViewSection title="Application Details" />
              <div className="grid grid-cols-3 gap-x-6 gap-y-5">
                <ViewField label="Date Applied" value={formData.dateApplied} />
                <ViewField label="Status"       value={formData.status} />
                <ViewField label="Remarks"      value={formData.remarks} />
              </div>
            </section>

            <section>
              <ViewSection title="Attached Forms" />
              {forms.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No forms attached</p>
              ) : (
                <ul className="space-y-2">
                  {forms.map((f, i) => (
                    <li key={i} className="text-sm text-gray-800 px-4 py-2.5 border border-gray-200 rounded-lg">{f}</li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <ViewSection title="PESO Office" />
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <ViewField label="Date Application Received" value={formData.dateApplicationReceived} />
                <ViewField label="Received By"               value={formData.receivedBy} />
              </div>
            </section>

          </div>
        </div>
      </div>
    )
  }

  // ── Add / Edit mode ───────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-8 py-5 border-b border-gray-200">
          <div>
            <h2 className="font-bold text-xl text-black">
              {mode === 'add' ? 'Add Beneficiary' : 'Edit Beneficiary'}
            </h2>
            <p className="text-brand-blue text-sm mt-0.5">DILEEP – TUPAD</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="space-y-8">

            {/* I — Personal Information */}
            <section>
              <SectionHeader numeral="I" title="Personal Information" />
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className={labelClass}>Last Name <span className="text-red-500">*</span></label>
                  <input className={inputClass} placeholder="Dela Cruz" value={formData.lastName ?? ''} onChange={e => updateField({ lastName: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>First Name <span className="text-red-500">*</span></label>
                  <input className={inputClass} placeholder="Juan" value={formData.firstName ?? ''} onChange={e => updateField({ firstName: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Middle Name <span className="text-gray-400 font-normal text-xs">(if applicable)</span></label>
                  <input className={inputClass} placeholder="M." value={formData.middleName ?? ''} onChange={e => updateField({ middleName: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <label className={labelClass}>Sex</label>
                  <select className={selectClass} value={formData.sex ?? ''} onChange={e => updateField({ sex: e.target.value })}>
                    <option value="">Select</option>
                    {SEX_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Birthdate</label>
                  <input type="date" className={inputClass} value={formData.birthdate ?? ''} onChange={e => handleBirthdateChange(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Age</label>
                  <input type="number" className={inputClass} placeholder="—" value={formData.age ?? ''} readOnly tabIndex={-1} />
                </div>
                <div>
                  <label className={labelClass}>Civil Status</label>
                  <select className={selectClass} value={formData.civilStatus ?? ''} onChange={e => updateField({ civilStatus: e.target.value })}>
                    <option value="">Select</option>
                    {CIVIL_STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Contact Number</label>
                  <input className={inputClass} placeholder="09XXXXXXXXX" value={formData.contactNumber ?? ''} onChange={e => updateField({ contactNumber: e.target.value })} />
                </div>
              </div>
            </section>

            {/* II — Address */}
            <section>
              <SectionHeader numeral="II" title="Address" />
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelClass}>Street / Purok</label>
                  <input className={inputClass} placeholder="" value={formData.streetPurok ?? ''} onChange={e => updateField({ streetPurok: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Barangay</label>
                  <input className={inputClass} placeholder="" value={formData.barangay ?? ''} onChange={e => updateField({ barangay: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>City / Municipality</label>
                  <input className={inputClass} placeholder="Tangub City" value={formData.cityMunicipality ?? ''} onChange={e => updateField({ cityMunicipality: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Province</label>
                  <input className={inputClass} placeholder="Misamis Occidental" value={formData.province ?? ''} onChange={e => updateField({ province: e.target.value })} />
                </div>
              </div>
            </section>

            {/* III — Application Details */}
            <section>
              <SectionHeader numeral="III" title="Application Details" />
              <div className="grid grid-cols-2 gap-4 mb-4">
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
            </section>

            {/* IV — Attach Forms */}
            <section>
              <SectionHeader numeral="IV" title="Attach Forms" />
              <p className="text-sm text-gray-400 mb-3">Attach supporting documents / forms (optional / if applicable).</p>
              <div className="flex items-center border border-dashed border-brand-blue rounded-lg px-3 py-2.5 mb-3 gap-2 bg-blue-50">
                <input
                  type="text"
                  value={attachmentInput}
                  onChange={e => setAttachmentInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddAttachment() } }}
                  placeholder="Enter form name..."
                  className="flex-1 text-sm text-gray-700 outline-none placeholder:text-gray-400 bg-transparent"
                />
                <button
                  type="button"
                  onClick={handleAddAttachment}
                  disabled={!attachmentInput.trim()}
                  className="px-3 py-1 bg-brand-blue text-white text-xs font-semibold rounded-md hover:bg-[#01a0ff] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Add
                </button>
                <button type="button" onClick={() => setAttachmentInput('')} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={14} />
                </button>
              </div>
              {(formData.attachedForms ?? []).map((formItem, idx) => (
                <div key={idx} className="flex items-center justify-between px-4 py-2.5 border border-gray-200 rounded-lg mb-2 text-sm text-gray-700">
                  <span>{formItem}</span>
                  <button type="button" onClick={() => handleRemoveAttachment(idx)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </section>

            {/* V — PESO Office Only */}
            <section>
              <SectionHeader numeral="V" title="PESO Office Only" />
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
            </section>

          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-gray-200 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-3 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} className="flex-1 py-3 bg-brand-blue text-white rounded-xl text-sm font-semibold hover:bg-[#01a0ff] transition-colors">
            {mode === 'add' ? 'Add Beneficiary' : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  )
}
