import { useState, useRef } from 'react'
import type { RefObject } from 'react'
import { Upload, X, FileText, Eye, Loader2 } from 'lucide-react'
import DatePicker from '../../components/DatePicker'
import DocumentPreviewModal from '../../components/DocumentPreviewModal'
import { canManage } from '../../utils/permissions'
import type { GIPWorkplace, GIPSavedDocument } from '../../contexts/GIPContext'
import { useFieldValidation, NAME_REGEX, type ValidationError } from '../../hooks/useFieldValidation'

// ─── Re-export for consumers ──────────────────────────────────────────────────
export type { GIPWorkplace }

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent placeholder-gray-400'

const labelCls = 'block text-sm font-medium text-gray-700 mb-1'


const FUNDING_SOURCES = ['DOLE', 'Local Government Unit (LGU)', 'Private / CSR', 'Others']

// ─── Empty form state ─────────────────────────────────────────────────────────

function emptyWorkplace(): Omit<GIPWorkplace, 'id'> {
  return {
    workplaceName: '',
    description: '',
    deploymentLocation: '',
    supervisor: '',
    assignedCount: 0,
    fundingSource: 'DOLE',
    fundingSourceOther: '',
    allowance: '',
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

type WorkplaceFormState = Omit<GIPWorkplace, 'id'>

function Field({
  label, field, required, placeholder, type = 'text', min, form, errors, isView, onChange, containerRef,
}: {
  label: string
  field: keyof WorkplaceFormState
  required?: boolean
  placeholder?: string
  type?: string
  min?: number
  form: WorkplaceFormState
  errors: Record<string, string>
  isView: boolean
  onChange: (field: keyof WorkplaceFormState, value: string) => void
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
              min={min}
              value={form[field] as string}
              onChange={e => {
                const v = type === 'number' ? e.target.value.replace(/[^0-9]/g, '') : e.target.value
                onChange(field, v)
              }}
              onKeyDown={type === 'number' ? (e => { if (e.key === '-' || e.key === 'e' || e.key === '+') e.preventDefault() }) : undefined}
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
  mode: 'workplace' | 'workplace-view' | 'workplace-edit'
  initialWorkplace?: GIPWorkplace
  onSaveWorkplace: (data: Omit<GIPWorkplace, 'id'>) => void
  onUpdateWorkplace?: (workplace: GIPWorkplace) => void
  onCancel: () => void
  isSaving?: boolean
}

const HEADING: Record<GIPMaintenanceFormProps['mode'], string> = {
  'workplace':      'Add New GIP Workplace/Office',
  'workplace-edit': 'Edit GIP Workplace/Office',
  'workplace-view': 'GIP Workplace/Office Details',
}

export default function GIPMaintenanceForm({
  mode,
  initialWorkplace,
  onSaveWorkplace,
  onUpdateWorkplace,
  onCancel,
  isSaving = false,
}: GIPMaintenanceFormProps) {
  const isView = mode === 'workplace-view'
  const isEdit = mode === 'workplace-edit'
  const isAdd  = mode === 'workplace'

  const [form, setForm] = useState<Omit<GIPWorkplace, 'id'>>(() =>
    initialWorkplace
      ? { ...initialWorkplace }
      : emptyWorkplace()
  )
  const { fieldErrors: errors, clearFieldError, runValidation } = useFieldValidation()
  const [isDragging, setIsDragging] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<GIPSavedDocument | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const workplaceNameRef = useRef<HTMLDivElement>(null)
  const deploymentLocationRef = useRef<HTMLDivElement>(null)
  const supervisorRef = useRef<HTMLDivElement>(null)
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
    if (!form.workplaceName.trim())      errs.push({ field: 'workplaceName', message: 'Workplace/office name is required', focus: scrollTo(workplaceNameRef) })
    if (!form.deploymentLocation.trim()) errs.push({ field: 'deploymentLocation', message: 'Deployment location is required', focus: scrollTo(deploymentLocationRef) })
    if (!form.supervisor.trim()) {
      errs.push({ field: 'supervisor', message: 'Supervisor is required', focus: scrollTo(supervisorRef) })
    } else if (!NAME_REGEX.test(form.supervisor.trim())) {
      errs.push({ field: 'supervisor', message: 'Supervisor must contain letters only (no numbers or symbols)', focus: scrollTo(supervisorRef) })
    }
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
          // workplace is saved — Chrome/Brave block opening data: URIs in a
          // new tab, which would otherwise show a blank "Untitled" tab.
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
    if (isSaving || !validate()) return
    if (isEdit && initialWorkplace && onUpdateWorkplace) {
      onUpdateWorkplace({ ...form, id: initialWorkplace.id } as GIPWorkplace)
    } else {
      onSaveWorkplace(form)
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
            {isAdd  && 'Fill in the details to create a new GIP workplace/office.'}
            {isEdit && 'Update the workplace/office information below.'}
            {isView && 'Read-only view of the GIP workplace/office details.'}
          </p>
        </div>
      </div>

      {/* Form body */}
      <div className="p-6 space-y-8">

        {/* Section 1: Workplace/Office Information */}
        <section>
          <SectionHeader title="Workplace/Office Information" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field label="Workplace/Office Name" field="workplaceName" required placeholder="e.g. City Hall" form={form} errors={errors} isView={isView} onChange={set} containerRef={workplaceNameRef} />
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
                placeholder="Brief description of this workplace/office..."
                className={inputCls}
              />
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Field label="Workplace/Office Address" field="deploymentLocation" required placeholder="e.g. Tangub City Hall and Partner Agencies" form={form} errors={errors} isView={isView} onChange={set} containerRef={deploymentLocationRef} />
            <Field label="Supervisor / Immediate Head" field="supervisor" required placeholder="Full name" form={form} errors={errors} isView={isView} onChange={set} containerRef={supervisorRef} />
            <Field label="Monthly Allowance / Stipend (₱)" field="allowance" placeholder="e.g. 5000" form={form} errors={errors} isView={isView} onChange={set} />
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

        {/* Section 2: Documents */}
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
              disabled={!canManage('gip-maintenance') || isSaving}
              className="px-6 py-2.5 text-white bg-brand-blue hover:bg-blue-700 rounded-lg transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue flex items-center gap-2"
            >
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              {isSaving ? 'Saving…' : (isAdd ? 'Save Workplace/Office' : 'Save Changes')}
            </button>
          </>
        )}
      </div>
    </div>
    {previewDoc && <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
    </>
  )
}
