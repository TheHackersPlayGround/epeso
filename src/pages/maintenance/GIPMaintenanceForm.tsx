import { useState, useRef } from 'react'
import type { RefObject } from 'react'
import { Upload, X, FileText, Eye } from 'lucide-react'
import DatePicker from '../../components/DatePicker'
import { canManage } from '../../utils/permissions'
import type { GIPBatch, GIPSavedDocument } from '../../contexts/GIPContext'
import { useFieldValidation, NAME_REGEX, type ValidationError } from '../../hooks/useFieldValidation'

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
    description: '',
    assignedOffice: '',
    deploymentLocation: '',
    supervisor: '',
    slots: '',
    assignedCount: 0,
    fundingSource: 'DOLE',
    fundingSourceOther: '',
    startDate: '',
    endDate: '',
    allowance: '',
    status: 'Planned',
    documents: [],
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

// ─── Field ────────────────────────────────────────────────────────────────────
// Defined at module scope (not inside the form component) so its identity is
// stable across renders — otherwise React treats it as a brand-new component
// type on every keystroke and remounts the underlying <input>, losing focus
// after a single character.

type BatchFormState = Omit<GIPBatch, 'id'>

// Rendered as a sibling of the whole form, not nested inside it -- a
// `fixed inset-0` modal nested inside an ancestor with opacity/filter/
// transform stops being positioned relative to the viewport.
function DocPreviewModal({ doc, onClose }: { doc: GIPSavedDocument; onClose: () => void }) {
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

function Field({
  label, field, required, placeholder, type = 'text', form, errors, isView, onChange, containerRef,
}: {
  label: string
  field: keyof BatchFormState
  required?: boolean
  placeholder?: string
  type?: string
  form: BatchFormState
  errors: Record<string, string>
  isView: boolean
  onChange: (field: keyof BatchFormState, value: string) => void
  containerRef?: RefObject<HTMLDivElement | null>
}) {
  return (
    <div ref={containerRef}>
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
              onChange={v => onChange(field, v)}
            />
          ) : (
            <input
              type={type}
              value={form[field] as string}
              onChange={e => onChange(field, e.target.value)}
              placeholder={placeholder}
              className={`${inputCls} ${errors[field] ? 'border-red-400' : ''}`}
            />
          )}
          {errors[field] && <p className="text-red-500 text-xs mt-1">{errors[field]}</p>}
        </>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface GIPMaintenanceFormProps {
  mode: 'batch' | 'batch-view' | 'batch-edit'
  initialBatch?: GIPBatch
  onSaveBatch: (data: Omit<GIPBatch, 'id'>) => void
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
  const { fieldErrors: errors, clearFieldError, runValidation } = useFieldValidation()
  const [isDragging, setIsDragging] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<GIPSavedDocument | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const batchNameRef = useRef<HTMLDivElement>(null)
  const assignedOfficeRef = useRef<HTMLDivElement>(null)
  const deploymentLocationRef = useRef<HTMLDivElement>(null)
  const supervisorRef = useRef<HTMLDivElement>(null)
  const slotsRef = useRef<HTMLDivElement>(null)
  const startDateRef = useRef<HTMLDivElement>(null)
  const endDateRef = useRef<HTMLDivElement>(null)
  const fundingSourceOtherRef = useRef<HTMLDivElement>(null)

  // ── Field helpers ────────────────────────────────────────────────────────────

  const set = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    clearFieldError(field)
  }

  // ── Validation ───────────────────────────────────────────────────────────────

  const scrollTo = (ref: RefObject<HTMLDivElement | null>) => () =>
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  const validate = () => {
    const errs: ValidationError[] = []
    if (!form.batchName.trim())     errs.push({ field: 'batchName', message: 'Batch name is required', focus: scrollTo(batchNameRef) })
    if (!form.assignedOffice.trim()) errs.push({ field: 'assignedOffice', message: 'Assigned office is required', focus: scrollTo(assignedOfficeRef) })
    if (!form.deploymentLocation.trim()) errs.push({ field: 'deploymentLocation', message: 'Deployment location is required', focus: scrollTo(deploymentLocationRef) })
    if (!form.supervisor.trim()) {
      errs.push({ field: 'supervisor', message: 'Supervisor is required', focus: scrollTo(supervisorRef) })
    } else if (!NAME_REGEX.test(form.supervisor.trim())) {
      errs.push({ field: 'supervisor', message: 'Supervisor must contain letters only (no numbers or symbols)', focus: scrollTo(supervisorRef) })
    }
    if (!form.slots.trim())         errs.push({ field: 'slots', message: 'Number of slots is required', focus: scrollTo(slotsRef) })
    if (!form.startDate)            errs.push({ field: 'startDate', message: 'Start date is required', focus: scrollTo(startDateRef) })
    if (!form.endDate)              errs.push({ field: 'endDate', message: 'End date is required', focus: scrollTo(endDateRef) })
    if (form.fundingSource === 'Others' && !form.fundingSourceOther.trim())
      errs.push({ field: 'fundingSourceOther', message: 'Please specify the funding source', focus: scrollTo(fundingSourceOtherRef) })
    return !runValidation(errs)
  }

  // ── Documents ─────────────────────────────────────────────────────────────────

  function formatFileSize(bytes: number) {
    if (bytes <= 0) return '0 Bytes'
    const units = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
    return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${units[i]}`
  }

  const addFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const newDoc: GIPSavedDocument = {
          id: Date.now().toString() + Math.random().toString(36),
          fileName: file.name,
          fileSize: formatFileSize(file.size),
          // A blob: URL (not the data: dataUrl) so "View" works before the
          // batch is saved — Chrome/Brave block opening data: URIs in a new
          // tab, which would otherwise show a blank "Untitled" tab.
          url: URL.createObjectURL(file),
          dataUrl,
        }
        setForm(prev => ({ ...prev, documents: [...prev.documents, newDoc] }))
      }
      reader.readAsDataURL(file)
    })
  }

  const removeDoc = (idx: number) =>
    setForm(prev => ({ ...prev, documents: prev.documents.filter((_, i) => i !== idx) }))

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!validate()) return
    if (isEdit && initialBatch && onUpdateBatch) {
      onUpdateBatch({ ...form, id: initialBatch.id } as GIPBatch)
    } else {
      onSaveBatch(form)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
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
            <div className="md:col-span-2">
              <Field label="Batch Name" field="batchName" required placeholder="e.g. Government Internship Program - Batch 1" form={form} errors={errors} isView={isView} onChange={set} containerRef={batchNameRef} />
            </div>
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
            <Field label="Assigned Government Office" field="assignedOffice" required placeholder="e.g. City Hall" form={form} errors={errors} isView={isView} onChange={set} containerRef={assignedOfficeRef} />
            <Field label="Deployment Location" field="deploymentLocation" required placeholder="e.g. Tangub City Hall and Partner Agencies" form={form} errors={errors} isView={isView} onChange={set} containerRef={deploymentLocationRef} />
            <Field label="Supervisor / Immediate Head" field="supervisor" required placeholder="Full name" form={form} errors={errors} isView={isView} onChange={set} containerRef={supervisorRef} />
            <Field label="Number of GIP Slots" field="slots" required placeholder="e.g. 25" type="number" form={form} errors={errors} isView={isView} onChange={set} containerRef={slotsRef} />
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
                form={form} errors={errors} isView={isView} onChange={set}
                containerRef={fundingSourceOtherRef}
              />
            )}
          </div>
        </section>

        {/* Section 3: Internship Period */}
        <section>
          <SectionHeader title="Internship Period" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Start Date" field="startDate" required type="date" form={form} errors={errors} isView={isView} onChange={set} containerRef={startDateRef} />
            <Field label="End Date" field="endDate" required type="date" form={form} errors={errors} isView={isView} onChange={set} containerRef={endDateRef} />
            <Field label="Monthly Allowance / Stipend (₱)" field="allowance" placeholder="e.g. 5000" form={form} errors={errors} isView={isView} onChange={set} />
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
                <li key={doc.id} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                  <FileText size={16} className="text-gray-400 flex-shrink-0" />
                  <span className="text-sm flex-1 truncate text-gray-700">{doc.fileName}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">({doc.fileSize})</span>
                  {(doc.url || doc.dataUrl) && (
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(doc)}
                      className="p-1.5 text-brand-blue hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                      title="Preview"
                    >
                      <Eye size={16} />
                    </button>
                  )}
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
            <button
              onClick={handleSave}
              disabled={!canManage('gip-maintenance')}
              className="px-6 py-2.5 text-white bg-brand-blue hover:bg-blue-700 rounded-lg transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue"
            >
              {isAdd ? 'Save Batch' : 'Save Changes'}
            </button>
          </>
        )}
      </div>
    </div>
    {previewDoc && <DocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
    </>
  )
}
