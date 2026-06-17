import { useState, useRef } from 'react'
import { ArrowLeft, Upload, X, FileText } from 'lucide-react'
import { useSPES } from '../../contexts/SPESContext'
import type { SPESBatch, Attachment } from '../../contexts/SPESContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SPESMaintenanceFormProps {
  mode: 'batch' | 'batch-view' | 'batch-edit'
  initialBatch?: SPESBatch
  onSaveBatch: (batch: Omit<SPESBatch, 'id'>, isDraft?: boolean) => void
  onUpdateBatch?: (batch: SPESBatch) => void
  onCancel: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FUNDING_SOURCES = ['DOLE', 'LGU', 'DOLE + LGU', 'Partner Agency', 'Other']

const STATUS_OPTIONS: { value: SPESBatch['status']; desc: string }[] = [
  { value: 'Open',      desc: 'Accepting applications'      },
  { value: 'Closed',    desc: 'Application period ended'    },
  { value: 'Ongoing',   desc: 'Students currently deployed' },
  { value: 'Completed', desc: 'Program completed'           },
]

const ACCEPT = 'image/jpeg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

// ─── Small shared components ──────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-5 w-1 rounded-full bg-brand-blue" />
      <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h4>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-sm text-gray-500 mb-1">{label}</label>
      <div className="px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-800 min-h-[40px]">
        {value || <span className="text-gray-400 italic">—</span>}
      </div>
    </div>
  )
}

const inputCls = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition bg-white'
const textareaCls = `${inputCls} resize-none`

function StatusRadioGroup({
  value, onChange, disabled,
}: {
  value: SPESBatch['status']
  onChange: (v: SPESBatch['status']) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-3">
      {STATUS_OPTIONS.map(({ value: v, desc }) => (
        <label
          key={v}
          className={`flex items-start gap-2 select-none ${disabled ? 'cursor-default opacity-70' : 'cursor-pointer'}`}
        >
          <input
            type="radio"
            name="spes-batch-status"
            checked={value === v}
            onChange={() => !disabled && onChange(v)}
            disabled={disabled}
            className="accent-brand-blue w-4 h-4 mt-0.5 flex-shrink-0"
          />
          <div>
            <span className="text-sm text-gray-700">{v}</span>
            <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
          </div>
        </label>
      ))}
    </div>
  )
}

// ─── Document Upload ──────────────────────────────────────────────────────────

function DocumentUpload({
  docs, onChange, readOnly,
}: {
  docs: Attachment[]
  onChange: (d: Attachment[]) => void
  readOnly?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList | null) => {
    if (!files || readOnly) return
    const newDocs = Array.from(files).map(f => ({
      name: f.name,
      url: URL.createObjectURL(f),
      fileType: f.type,
    }))
    onChange([...docs, ...newDocs])
  }

  return (
    <div>
      {docs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          {docs.map((d, i) => {
            const isImg = d.fileType.startsWith('image/')
            return (
              <div key={i} className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                {isImg ? (
                  <img src={d.url} alt={d.name} className="w-full h-20 object-cover" />
                ) : (
                  <div className="w-full h-20 flex flex-col items-center justify-center gap-1 px-2">
                    <FileText size={24} className="text-gray-400" />
                    <span className="text-xs text-gray-500 text-center leading-tight line-clamp-2">{d.name}</span>
                  </div>
                )}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => onChange(docs.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={11} />
                  </button>
                )}
                {isImg && (
                  <p className="text-xs text-gray-500 px-2 py-1 truncate border-t border-gray-100">{d.name}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!readOnly && (
        <>
          <label
            className="flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed border-gray-300 rounded-xl py-8 cursor-pointer hover:border-brand-blue hover:bg-blue-50 transition-colors text-sm text-gray-400 hover:text-brand-blue"
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
          >
            <Upload size={28} />
            <span>Drag & drop files here, or <span className="font-medium text-brand-blue">click to browse</span></span>
            <span className="text-xs text-center text-gray-400 max-w-xs">
              Upload MOA, endorsement letters, funding approvals, deployment agreements, and supporting documents.
            </span>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="hidden"
              onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
            />
          </label>
          <p className="text-xs text-gray-400 mt-1.5">Supported: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX</p>
        </>
      )}

      {readOnly && docs.length === 0 && (
        <p className="text-sm text-gray-400 italic">No documents attached.</p>
      )}
    </div>
  )
}

// ─── Empty form default ───────────────────────────────────────────────────────

const emptyBatch: Omit<SPESBatch, 'id'> = {
  batchName: '',
  description: '',
  applicationStartDate: '',
  applicationEndDate: '',
  programStartDate: '',
  programEndDate: '',
  availableSlots: '',
  targetBeneficiaries: '',
  employer: '',
  deploymentLocation: '',
  coordinator: '',
  supervisor: '',
  fundingSource: '',
  fundingSourceOther: '',
  status: 'Open',
  documents: [],
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SPESMaintenanceForm({
  mode, initialBatch, onSaveBatch, onUpdateBatch, onCancel,
}: SPESMaintenanceFormProps) {
  const { updateSpesBatch } = useSPES()
  const [form, setForm] = useState<Omit<SPESBatch, 'id'>>(
    initialBatch ? { ...initialBatch } : emptyBatch
  )
  const set = (key: keyof typeof emptyBatch, val: unknown) =>
    setForm(f => ({ ...f, [key]: val }))

  const isView = mode === 'batch-view'
  const isEdit = mode === 'batch-edit'
  const isAdd  = mode === 'batch'

  const headings: Record<typeof mode, string> = {
    'batch':      'Add New SPES Batch',
    'batch-view': 'View SPES Batch Details',
    'batch-edit': 'Edit SPES Batch',
  }

  const validate = (): boolean => {
    const required: [boolean, string][] = [
      [!form.batchName.trim(),          'Batch Name is required.'],
      [!form.applicationStartDate,      'Application Start Date is required.'],
      [!form.applicationEndDate,        'Application End Date is required.'],
      [!form.programStartDate,          'Program Start Date is required.'],
      [!form.programEndDate,            'Program End Date is required.'],
      [!form.availableSlots.trim(),     'Available Slots is required.'],
      [!form.employer.trim(),           'Participating Employer / Agency is required.'],
      [!form.deploymentLocation.trim(), 'Deployment Location is required.'],
      [!form.coordinator.trim(),        'Program Coordinator is required.'],
      [!form.fundingSource,             'Funding Source is required.'],
      [form.fundingSource === 'Other' && !form.fundingSourceOther.trim(), 'Please specify the funding source.'],
    ]
    for (const [fail, msg] of required) {
      if (fail) {
        alert(msg)
        return false
      }
    }
    return true
  }

  const handleStatusChange = (newStatus: SPESBatch['status']) => {
    if (newStatus === form.status) return

    if (newStatus === 'Completed') {
      if (!confirm('Mark Batch as Completed?\n\nThis will permanently close the batch and automatically set all currently assigned applicants to Inactive. This action cannot be undone.')) return
      if (initialBatch) updateSpesBatch({ ...initialBatch, ...form, status: 'Completed' })
      set('status', 'Completed')
      return
    }

    if (newStatus === 'Ongoing') {
      if (!confirm('Set Batch as Ongoing?\n\nAll applicants currently assigned to this batch will automatically be set to Active.')) return
      if (initialBatch) updateSpesBatch({ ...initialBatch, ...form, status: 'Ongoing' })
      set('status', 'Ongoing')
      return
    }

    if (newStatus === 'Open') {
      if (!confirm('Set Batch as Open?\n\nPreviously assigned applicants will be restored to Active status.')) return
      if (initialBatch) updateSpesBatch({ ...initialBatch, ...form, status: 'Open' })
      set('status', 'Open')
      return
    }

    if (newStatus === 'Closed') {
      if (!confirm('Close This Batch?\n\nClosing the batch will end the application period. Assigned applicants will remain active.')) return
    }

    set('status', newStatus)
  }

  const handleSave = () => {
    if (!validate()) return
    if (isEdit && onUpdateBatch && initialBatch) {
      onUpdateBatch({ ...initialBatch, ...form })
    } else {
      onSaveBatch(form)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">

      {/* Orange Header */}
      <div className="bg-brand-blue px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-1 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h3 className="text-white m-0">{headings[mode]}</h3>
            <p className="text-white/70 text-sm mt-0.5">Special Program for Employment of Students (SPES)</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-8">

          {/* I. Batch Information */}
          <div>
            <SectionHeader title="Batch Information" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                {isView ? (
                  <ReadOnlyField label="Batch Name" value={form.batchName} />
                ) : (
                  <Field label="Batch Name" required>
                    <input
                      className={inputCls}
                      placeholder="e.g. SPES Summer Batch 2026"
                      value={form.batchName}
                      onChange={e => set('batchName', e.target.value)}
                    />
                  </Field>
                )}
              </div>
              <div className="md:col-span-2">
                {isView ? (
                  <ReadOnlyField label="Description" value={form.description} />
                ) : (
                  <Field label="Description">
                    <textarea
                      className={textareaCls}
                      rows={3}
                      placeholder="Enter batch description"
                      value={form.description}
                      onChange={e => set('description', e.target.value)}
                    />
                  </Field>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* II. Application Period */}
          <div>
            <SectionHeader title="Application Period" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {isView ? (
                <>
                  <ReadOnlyField label="Application Start Date" value={form.applicationStartDate} />
                  <ReadOnlyField label="Application End Date" value={form.applicationEndDate} />
                </>
              ) : (
                <>
                  <Field label="Application Start Date" required>
                    <input type="date" className={inputCls} value={form.applicationStartDate} onChange={e => set('applicationStartDate', e.target.value)} />
                  </Field>
                  <Field label="Application End Date" required>
                    <input type="date" className={inputCls} value={form.applicationEndDate} onChange={e => set('applicationEndDate', e.target.value)} />
                  </Field>
                </>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* III. Employment Period */}
          <div>
            <SectionHeader title="Employment Period" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {isView ? (
                <>
                  <ReadOnlyField label="Program Start Date" value={form.programStartDate} />
                  <ReadOnlyField label="Program End Date" value={form.programEndDate} />
                </>
              ) : (
                <>
                  <Field label="Program Start Date" required>
                    <input type="date" className={inputCls} value={form.programStartDate} onChange={e => set('programStartDate', e.target.value)} />
                  </Field>
                  <Field label="Program End Date" required>
                    <input type="date" className={inputCls} value={form.programEndDate} onChange={e => set('programEndDate', e.target.value)} />
                  </Field>
                </>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* IV. Slot Information */}
          <div>
            <SectionHeader title="Slot Information" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {isView ? (
                <>
                  <ReadOnlyField label="Available Slots" value={form.availableSlots} />
                  <ReadOnlyField label="Target Beneficiaries" value={form.targetBeneficiaries} />
                </>
              ) : (
                <>
                  <Field label="Available Slots" required>
                    <input
                      type="number"
                      min="1"
                      className={inputCls}
                      placeholder="e.g. 100"
                      value={form.availableSlots}
                      onChange={e => set('availableSlots', e.target.value)}
                    />
                  </Field>
                  <Field label="Target Beneficiaries">
                    <input
                      type="number"
                      min="0"
                      className={inputCls}
                      placeholder="e.g. 100"
                      value={form.targetBeneficiaries}
                      onChange={e => set('targetBeneficiaries', e.target.value)}
                    />
                  </Field>
                </>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* V. Employer / Deployment Information */}
          <div>
            <SectionHeader title="Employer / Deployment Information" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {isView ? (
                <>
                  <div className="md:col-span-2">
                    <ReadOnlyField label="Participating Employer / Agency" value={form.employer} />
                  </div>
                  <div className="md:col-span-2">
                    <ReadOnlyField label="Deployment Location" value={form.deploymentLocation} />
                  </div>
                  <ReadOnlyField label="Program Coordinator / Person In Charge" value={form.coordinator} />
                  <ReadOnlyField label="Supervisor / Immediate Head" value={form.supervisor} />
                </>
              ) : (
                <>
                  <div className="md:col-span-2">
                    <Field label="Participating Employer / Agency" required>
                      <input
                        className={inputCls}
                        placeholder="Enter employer, company, government office, or establishment"
                        value={form.employer}
                        onChange={e => set('employer', e.target.value)}
                      />
                    </Field>
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Deployment Location" required>
                      <input
                        className={inputCls}
                        placeholder="Enter deployment location"
                        value={form.deploymentLocation}
                        onChange={e => set('deploymentLocation', e.target.value)}
                      />
                    </Field>
                  </div>
                  <Field label="Program Coordinator / Person In Charge" required>
                    <input
                      className={inputCls}
                      placeholder="Full name"
                      value={form.coordinator}
                      onChange={e => set('coordinator', e.target.value)}
                    />
                  </Field>
                  <Field label="Supervisor / Immediate Head">
                    <input
                      className={inputCls}
                      placeholder="Full name"
                      value={form.supervisor}
                      onChange={e => set('supervisor', e.target.value)}
                    />
                  </Field>
                </>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* VI. Funding Information */}
          <div>
            <SectionHeader title="Funding Information" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {isView ? (
                <ReadOnlyField
                  label="Funding Source"
                  value={
                    form.fundingSource === 'Other' && form.fundingSourceOther
                      ? `Other — ${form.fundingSourceOther}`
                      : form.fundingSource
                  }
                />
              ) : (
                <>
                  <Field label="Funding Source" required>
                    <select
                      className={inputCls}
                      value={form.fundingSource}
                      onChange={e => set('fundingSource', e.target.value)}
                    >
                      <option value="">Select funding source</option>
                      {FUNDING_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  {form.fundingSource === 'Other' && (
                    <Field label="Specify Funding Source" required>
                      <input
                        className={inputCls}
                        placeholder="Please specify..."
                        value={form.fundingSourceOther}
                        onChange={e => set('fundingSourceOther', e.target.value)}
                      />
                    </Field>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* VII. Batch Status */}
          <div>
            <SectionHeader title="Batch Status" />
            <Field label="Status">
              <StatusRadioGroup
                value={form.status}
                onChange={v => handleStatusChange(v)}
                disabled={isView}
              />
            </Field>
          </div>

          <div className="border-t border-gray-100" />

          {/* VIII. Documents */}
          <div>
            <SectionHeader title="Documents" />
            {!isView && (
              <p className="text-xs text-gray-500 mb-4">
                Upload MOA, endorsement letters, funding approvals, deployment agreements, and supporting documents.
              </p>
            )}
            <DocumentUpload
              docs={form.documents}
              onChange={d => set('documents', d)}
              readOnly={isView}
            />
          </div>

          {/* Footer Actions */}
          <div className="border-t border-gray-200 pt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {isView ? 'Close' : 'Cancel'}
            </button>
            {!isView && (
              <>
                {isAdd && (
                  <button
                    type="button"
                    onClick={() => onSaveBatch({ ...form, isDraft: true }, true)}
                    className="px-5 py-2.5 text-sm text-gray-600 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Save Draft
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-6 py-2.5 text-sm bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors font-medium"
                >
                  {isEdit ? 'Update Batch' : 'Save Batch'}
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
