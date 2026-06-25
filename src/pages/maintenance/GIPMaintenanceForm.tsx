import { useState, useRef } from 'react'
import { Upload, X, FileText } from 'lucide-react'
import DatePicker from '../../components/DatePicker'
import type { GIPBatch, GIPBatchDocument } from '../../contexts/GIPContext'

// ─── Re-export for consumers ──────────────────────────────────────────────────
export type { GIPBatch }

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent placeholder-gray-400'

const labelCls = 'block text-sm font-medium text-gray-700 mb-1'


const FUNDING_SOURCES = ['DOLE', 'Local Government Unit (LGU)', 'Private / CSR', 'Others']

// ─── Empty form state ─────────────────────────────────────────────────────────

function emptyBatch(): Omit<GIPBatch, 'id'> {
  return {
    batchName: '',
    batchCode: '',
    description: '',
    assignedOffice: '',
    deploymentLocation: '',
    coordinator: '',
    supervisor: '',
    slots: '',
    fundingSource: 'DOLE',
    fundingSourceOther: '',
    startDate: '',
    endDate: '',
    allowance: '',
    status: 'Planned',
    documents: [],
    isDraft: false,
  }
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span
        className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full text-white bg-brand-blue"
      >
        {title}
      </span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface GIPMaintenanceFormProps {
  mode: 'batch' | 'batch-view' | 'batch-edit'
  initialBatch?: GIPBatch
  onSaveBatch: (data: Omit<GIPBatch, 'id'>, isDraft?: boolean) => void
  onUpdateBatch?: (batch: GIPBatch) => void
  onCancel: () => void
}

const HEADING: Record<GIPMaintenanceFormProps['mode'], string> = {
  'batch':      'Add New GIP Batch',
  'batch-edit': 'Edit GIP Batch',
  'batch-view': 'GIP Batch Details',
}

export default function GIPMaintenanceForm({
  mode,
  initialBatch,
  onSaveBatch,
  onUpdateBatch,
  onCancel,
}: GIPMaintenanceFormProps) {
  const isView = mode === 'batch-view'
  const isEdit = mode === 'batch-edit'
  const isAdd  = mode === 'batch'

  const [form, setForm] = useState<Omit<GIPBatch, 'id'>>(() =>
    initialBatch
      ? { ...initialBatch }
      : emptyBatch()
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Field helpers ────────────────────────────────────────────────────────────

  const set = (field: keyof typeof form, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const Field = ({
    label, field, required, placeholder, type = 'text',
  }: {
    label: string
    field: keyof typeof form
    required?: boolean
    placeholder?: string
    type?: string
  }) => (
    <div>
      <label className={labelCls}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {isView ? (
        <p className="text-sm text-gray-800 py-2 px-3 bg-gray-50 rounded-lg min-h-[38px]">
          {(form[field] as string) || <span className="text-gray-400">—</span>}
        </p>
      ) : (
        <>
          {type === 'date' ? (
            <DatePicker
              className={`${inputCls} ${errors[field] ? 'border-red-400' : ''}`}
              value={form[field] as string}
              onChange={v => set(field, v)}
            />
          ) : (
            <input
              type={type}
              value={form[field] as string}
              onChange={e => set(field, e.target.value)}
              placeholder={placeholder}
              className={`${inputCls} ${errors[field] ? 'border-red-400' : ''}`}
            />
          )}
          {errors[field] && <p className="text-red-500 text-xs mt-1">{errors[field]}</p>}
        </>
      )}
    </div>
  )

  // ── Validation ───────────────────────────────────────────────────────────────

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.batchName.trim())     errs.batchName     = 'Batch name is required'
    if (!form.batchCode.trim())     errs.batchCode     = 'Batch code is required'
    if (!form.assignedOffice.trim()) errs.assignedOffice = 'Assigned office is required'
    if (!form.deploymentLocation.trim()) errs.deploymentLocation = 'Deployment location is required'
    if (!form.coordinator.trim())   errs.coordinator   = 'Coordinator is required'
    if (!form.slots.trim())         errs.slots         = 'Number of slots is required'
    if (!form.startDate)            errs.startDate     = 'Start date is required'
    if (!form.endDate)              errs.endDate       = 'End date is required'
    if (form.fundingSource === 'Others' && !form.fundingSourceOther.trim())
      errs.fundingSourceOther = 'Please specify the funding source'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Documents ─────────────────────────────────────────────────────────────────

  const addFiles = (files: FileList | null) => {
    if (!files) return
    const newDocs: GIPBatchDocument[] = Array.from(files).map(f => ({
      name: f.name,
      url: URL.createObjectURL(f),
      fileType: f.type,
    }))
    setForm(prev => ({ ...prev, documents: [...prev.documents, ...newDocs] }))
  }

  const removeDoc = (idx: number) =>
    setForm(prev => ({ ...prev, documents: prev.documents.filter((_, i) => i !== idx) }))

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSave = (isDraft = false) => {
    if (!isDraft && !validate()) return
    if (isEdit && initialBatch && onUpdateBatch) {
      onUpdateBatch({ ...form, id: initialBatch.id } as GIPBatch)
    } else {
      onSaveBatch(form, isDraft)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-brand-blue px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="text-white m-0 text-lg font-semibold">{HEADING[mode]}</h3>
          <p className="text-white/80 text-sm mt-0.5">
            {isAdd  && 'Fill in the details to create a new GIP batch.'}
            {isEdit && 'Update the batch information below.'}
            {isView && 'Read-only view of the GIP batch details.'}
          </p>
        </div>
        {isView && (
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              form.status === 'Planned'   ? 'bg-yellow-100 text-yellow-700' :
              form.status === 'Ongoing'   ? 'bg-green-100 text-green-700'  :
              form.status === 'Completed' ? 'bg-blue-100 text-blue-700'    :
              'bg-gray-100 text-gray-600'
            }`}
          >
            {form.status}
          </span>
        )}
      </div>

      {/* Form body */}
      <div className="p-6 space-y-8">

        {/* Section 1: Batch Information */}
        <section>
          <SectionHeader title="Batch Information" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Batch Name" field="batchName" required placeholder="e.g. Government Internship Program - Batch 1" />
            <Field label="Batch Code" field="batchCode" required placeholder="e.g. GIP-2026-001" />
          </div>
          <div className="mt-4">
            <label className={labelCls}>Description</label>
            {isView ? (
              <p className="text-sm text-gray-800 py-2 px-3 bg-gray-50 rounded-lg min-h-[60px]">
                {form.description || <span className="text-gray-400">—</span>}
              </p>
            ) : (
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={3}
                placeholder="Brief description of this batch..."
                className={inputCls}
              />
            )}
          </div>
        </section>

        {/* Section 2: Deployment Information */}
        <section>
          <SectionHeader title="Deployment Information" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Assigned Government Office" field="assignedOffice" required placeholder="e.g. City Hall" />
            <Field label="Deployment Location" field="deploymentLocation" required placeholder="e.g. Tangub City Hall and Partner Agencies" />
            <Field label="Program Coordinator / Person In Charge" field="coordinator" required placeholder="Full name" />
            <Field label="Supervisor / Immediate Head" field="supervisor" placeholder="Full name" />
            <Field label="Number of GIP Slots" field="slots" required placeholder="e.g. 25" type="number" />
            <div>
              <label className={labelCls}>Funding Source<span className="text-red-500 ml-0.5">*</span></label>
              {isView ? (
                <p className="text-sm text-gray-800 py-2 px-3 bg-gray-50 rounded-lg min-h-[38px]">
                  {form.fundingSource === 'Others' ? form.fundingSourceOther || 'Others' : form.fundingSource || '—'}
                </p>
              ) : (
                <select
                  value={form.fundingSource}
                  onChange={e => set('fundingSource', e.target.value)}
                  className={inputCls}
                >
                  {FUNDING_SOURCES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
            </div>
            {form.fundingSource === 'Others' && !isView && (
              <Field
                label="Specify Funding Source"
                field="fundingSourceOther"
                required
                placeholder="Please specify"
              />
            )}
          </div>
        </section>

        {/* Section 3: Internship Period */}
        <section>
          <SectionHeader title="Internship Period" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Start Date" field="startDate" required type="date" />
            <Field label="End Date" field="endDate" required type="date" />
            <Field label="Monthly Allowance / Stipend (₱)" field="allowance" placeholder="e.g. 5000" />
          </div>
          <div className="mt-4">
            <label className={labelCls}>Status<span className="text-red-500 ml-0.5">*</span></label>
            {isView ? (
              <p className="text-sm text-gray-800 py-2 px-3 bg-gray-50 rounded-lg">{form.status}</p>
            ) : (
              <div className="flex gap-6 mt-1">
                {(['Planned', 'Ongoing', 'Completed'] as const).map(s => {
                  const isDisabled = isAdd && s !== 'Planned'
                  return (
                  <label key={s} className={`flex items-center gap-2 text-sm text-gray-700 ${isDisabled ? 'cursor-default opacity-40' : 'cursor-pointer'}`}>
                    <input
                      type="radio"
                      name="gip-status"
                      value={s}
                      checked={form.status === s}
                      onChange={() => set('status', s)}
                      disabled={isDisabled}
                      className="accent-brand-blue disabled:cursor-default"
                    />
                    {s}
                  </label>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* Section 4: Documents */}
        <section>
          <SectionHeader title="Documents" />
          {!isView && (
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files) }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 ${
                isDragging
                  ? 'border-brand-blue bg-blue-50'
                  : 'border-gray-300 hover:border-brand-blue hover:bg-blue-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => addFiles(e.target.files)}
              />
              <Upload size={28} className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500">
                Drag & drop files here or <span className="font-medium text-brand-blue">browse</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">PDF, DOCX, PNG, JPG supported</p>
            </div>
          )}

          {form.documents.length > 0 ? (
            <ul className="space-y-2">
              {form.documents.map((doc, i) => (
                <li key={i} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                  <FileText size={16} className="text-gray-400 flex-shrink-0" />
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm flex-1 truncate hover:underline text-brand-blue"
                  >
                    {doc.name}
                  </a>
                  {!isView && (
                    <button
                      onClick={() => removeDoc(i)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No documents attached.</p>
          )}
        </section>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
        {isView ? (
          <button
            onClick={onCancel}
            className="px-6 py-2.5 text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors font-medium text-sm"
          >
            Close
          </button>
        ) : (
          <>
            <button
              onClick={onCancel}
              className="px-6 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium text-sm"
            >
              Cancel
            </button>
            {isAdd && (
              <button
                onClick={() => handleSave(true)}
                className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors font-medium text-sm"
              >
                Save as Draft
              </button>
            )}
            <button
              onClick={() => handleSave(false)}
              className="px-6 py-2.5 text-white bg-brand-blue hover:bg-blue-700 rounded-lg transition-colors font-medium text-sm"
            >
              {isAdd ? 'Save Batch' : 'Save Changes'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
