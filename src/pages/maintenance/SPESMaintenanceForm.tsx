import { useState, useRef, type RefObject } from 'react'
import { ArrowLeft, Upload, X, FileText } from 'lucide-react'
import DatePicker from '../../components/DatePicker'
import { canManage } from '../../utils/permissions'
import type { SPESBatch, SPESSavedDocument } from '../../contexts/SPESContext'
import { useFieldValidation, NAME_REGEX, type ValidationError } from '../../hooks/useFieldValidation'

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

function Field({ label, required, error, containerRef, children }: {
  label: string
  required?: boolean
  error?: string
  containerRef?: RefObject<HTMLDivElement | null>
  children: React.ReactNode
}) {
  return (
    <div ref={containerRef}>
      <label className="block text-sm text-gray-600 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
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
  value, onChange, disabled, lockToOpen,
}: {
  value: SPESBatch['status']
  onChange: (v: SPESBatch['status']) => void
  disabled?: boolean
  // When adding a new batch, it can only ever start Open — same rule as
  // GIP/CDSP (a batch can't be created already Ongoing/Closed/Completed).
  lockToOpen?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-3">
      {STATUS_OPTIONS.map(({ value: v, desc }) => {
        const isDisabled = disabled || (lockToOpen && v !== 'Open')
        return (
        <label
          key={v}
          className={`flex items-start gap-2 select-none ${isDisabled ? 'cursor-default opacity-40' : 'cursor-pointer'}`}
        >
          <input
            type="radio"
            name="spes-batch-status"
            checked={value === v}
            onChange={() => !isDisabled && onChange(v)}
            disabled={isDisabled}
            className="accent-brand-blue w-4 h-4 mt-0.5 flex-shrink-0"
          />
          <div>
            <span className="text-sm text-gray-700">{v}</span>
            <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
          </div>
        </label>
        )
      })}
    </div>
  )
}

// ─── Document Upload ──────────────────────────────────────────────────────────

function formatFileSize(bytes: number) {
  if (bytes <= 0) return '0 Bytes'
  const units = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${units[i]}`
}

function DocumentUpload({
  docs, onChange, readOnly,
}: {
  docs: SPESSavedDocument[]
  onChange: (d: SPESSavedDocument[]) => void
  readOnly?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList | null) => {
    if (!files || readOnly) return
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const newDoc: SPESSavedDocument = {
          id: Date.now().toString() + Math.random().toString(36),
          fileName: file.name,
          fileSize: formatFileSize(file.size),
          url: '',
          dataUrl,
        }
        onChange([...docs, newDoc])
      }
      reader.readAsDataURL(file)
    })
  }

  return (
    <div>
      {docs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          {docs.map((d, i) => (
            <div key={d.id} className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              <div className="w-full h-20 flex flex-col items-center justify-center gap-1 px-2">
                <FileText size={24} className="text-gray-400" />
                <span className="text-xs text-gray-500 text-center leading-tight line-clamp-2">{d.fileName}</span>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onChange(docs.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={11} />
                </button>
              )}
              {d.url && (
                <a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-brand-blue hover:underline px-2 py-1 truncate border-t border-gray-100 block text-center">View</a>
              )}
            </div>
          ))}
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
  assignedCount: 0,
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
  const [form, setForm] = useState<Omit<SPESBatch, 'id'>>(
    initialBatch ? { ...initialBatch } : emptyBatch
  )
  const set = (key: keyof typeof emptyBatch, val: unknown) => {
    setForm(f => ({ ...f, [key]: val }))
    clearFieldError(key)
  }

  const isView = mode === 'batch-view'
  const isEdit = mode === 'batch-edit'
  const isAdd  = mode === 'batch'

  const headings: Record<typeof mode, string> = {
    'batch':      'Add New SPES Batch',
    'batch-view': 'View SPES Batch Details',
    'batch-edit': 'Edit SPES Batch',
  }

  const { clearFieldError, errCls, fieldMessage, runValidation } = useFieldValidation()
  const batchNameRef = useRef<HTMLDivElement>(null)
  const applicationStartDateRef = useRef<HTMLDivElement>(null)
  const applicationEndDateRef = useRef<HTMLDivElement>(null)
  const programStartDateRef = useRef<HTMLDivElement>(null)
  const programEndDateRef = useRef<HTMLDivElement>(null)
  const availableSlotsRef = useRef<HTMLDivElement>(null)
  const employerRef = useRef<HTMLDivElement>(null)
  const deploymentLocationRef = useRef<HTMLDivElement>(null)
  const coordinatorRef = useRef<HTMLDivElement>(null)
  const fundingSourceRef = useRef<HTMLDivElement>(null)
  const fundingSourceOtherRef = useRef<HTMLDivElement>(null)

  const scrollTo = (ref: RefObject<HTMLDivElement | null>) => () =>
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  const validate = (): boolean => {
    const coordinator = form.coordinator.trim()
    const errors: ValidationError[] = []

    if (!form.batchName.trim())          errors.push({ field: 'batchName', message: 'Batch Name is required.', focus: scrollTo(batchNameRef) })
    if (!form.applicationStartDate)      errors.push({ field: 'applicationStartDate', message: 'Application Start Date is required.', focus: scrollTo(applicationStartDateRef) })
    if (!form.applicationEndDate)        errors.push({ field: 'applicationEndDate', message: 'Application End Date is required.', focus: scrollTo(applicationEndDateRef) })
    if (!form.programStartDate)          errors.push({ field: 'programStartDate', message: 'Program Start Date is required.', focus: scrollTo(programStartDateRef) })
    if (!form.programEndDate)            errors.push({ field: 'programEndDate', message: 'Program End Date is required.', focus: scrollTo(programEndDateRef) })
    if (!form.availableSlots.trim())     errors.push({ field: 'availableSlots', message: 'Available Slots is required.', focus: scrollTo(availableSlotsRef) })
    if (!form.employer.trim())           errors.push({ field: 'employer', message: 'Participating Employer / Agency is required.', focus: scrollTo(employerRef) })
    if (!form.deploymentLocation.trim()) errors.push({ field: 'deploymentLocation', message: 'Deployment Location is required.', focus: scrollTo(deploymentLocationRef) })
    if (!coordinator) {
      errors.push({ field: 'coordinator', message: 'Program Coordinator is required.', focus: scrollTo(coordinatorRef) })
    } else if (!NAME_REGEX.test(coordinator)) {
      errors.push({ field: 'coordinator', message: 'Program Coordinator must contain letters only (no numbers or symbols).', focus: scrollTo(coordinatorRef) })
    }
    if (!form.fundingSource)             errors.push({ field: 'fundingSource', message: 'Funding Source is required.', focus: scrollTo(fundingSourceRef) })
    if (form.fundingSource === 'Other' && !form.fundingSourceOther.trim())
      errors.push({ field: 'fundingSourceOther', message: 'Please specify the funding source.', focus: scrollTo(fundingSourceOtherRef) })

    return !runValidation(errors)
  }

  // Status here is just part of the whole-form save — the backend's
  // spesCascadeBatchStatus() applies the actual side effects (stamping
  // completed_at, flipping assigned applicants Active/Completed) on save.
  // Quick one-off status transitions with a confirmation dialog are handled
  // separately by the batch list's status wizard in Maintenance.tsx.
  const handleStatusChange = (newStatus: SPESBatch['status']) => {
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
                  <Field label="Batch Name" required containerRef={batchNameRef} error={fieldMessage('batchName')}>
                    <input
                      className={`${inputCls} ${errCls('batchName')}`}
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
                  <Field label="Application Start Date" required containerRef={applicationStartDateRef} error={fieldMessage('applicationStartDate')}>
                    <DatePicker className={`${inputCls} ${errCls('applicationStartDate')}`} value={form.applicationStartDate} onChange={value => set('applicationStartDate', value)} />
                  </Field>
                  <Field label="Application End Date" required containerRef={applicationEndDateRef} error={fieldMessage('applicationEndDate')}>
                    <DatePicker className={`${inputCls} ${errCls('applicationEndDate')}`} value={form.applicationEndDate} onChange={value => set('applicationEndDate', value)} />
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
                  <Field label="Program Start Date" required containerRef={programStartDateRef} error={fieldMessage('programStartDate')}>
                    <DatePicker className={`${inputCls} ${errCls('programStartDate')}`} value={form.programStartDate} onChange={value => set('programStartDate', value)} />
                  </Field>
                  <Field label="Program End Date" required containerRef={programEndDateRef} error={fieldMessage('programEndDate')}>
                    <DatePicker className={`${inputCls} ${errCls('programEndDate')}`} value={form.programEndDate} onChange={value => set('programEndDate', value)} />
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
                  <Field label="Available Slots" required containerRef={availableSlotsRef} error={fieldMessage('availableSlots')}>
                    <input
                      type="number"
                      min="1"
                      className={`${inputCls} ${errCls('availableSlots')}`}
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
                    <Field label="Participating Employer / Agency" required containerRef={employerRef} error={fieldMessage('employer')}>
                      <input
                        className={`${inputCls} ${errCls('employer')}`}
                        placeholder="Enter employer, company, government office, or establishment"
                        value={form.employer}
                        onChange={e => set('employer', e.target.value)}
                      />
                    </Field>
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Deployment Location" required containerRef={deploymentLocationRef} error={fieldMessage('deploymentLocation')}>
                      <input
                        className={`${inputCls} ${errCls('deploymentLocation')}`}
                        placeholder="Enter deployment location"
                        value={form.deploymentLocation}
                        onChange={e => set('deploymentLocation', e.target.value)}
                      />
                    </Field>
                  </div>
                  <Field label="Program Coordinator / Person In Charge" required containerRef={coordinatorRef} error={fieldMessage('coordinator')}>
                    <input
                      className={`${inputCls} ${errCls('coordinator')}`}
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
                  <Field label="Funding Source" required containerRef={fundingSourceRef} error={fieldMessage('fundingSource')}>
                    <select
                      className={`${inputCls} ${errCls('fundingSource')}`}
                      value={form.fundingSource}
                      onChange={e => set('fundingSource', e.target.value)}
                    >
                      <option value="">Select funding source</option>
                      {FUNDING_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  {form.fundingSource === 'Other' && (
                    <Field label="Specify Funding Source" required containerRef={fundingSourceOtherRef} error={fieldMessage('fundingSourceOther')}>
                      <input
                        className={`${inputCls} ${errCls('fundingSourceOther')}`}
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
                lockToOpen={isAdd}
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
                  disabled={!canManage('maintenance')}
                  className="px-6 py-2.5 text-sm bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue"
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
