import { useRef, useState } from 'react'
import { Upload, X, FileText, Image as ImageIcon, Eye } from 'lucide-react'
import { canManage } from '../../utils/permissions'
import type { AttachmentItem } from './DILPForm'
import DatePicker from '../../components/DatePicker'
import { useFieldValidation, NAME_REGEX, type ValidationError } from '../../hooks/useFieldValidation'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SLPFormData {
  projectName: string
  description: string
  slpTrack: string
  dateStarted: string
  location: string
  facilitator: string
  status: 'Planned' | 'Ongoing' | 'Completed' | 'Cancelled'
  assistanceAmount: string
  dateReleased: string
}

interface SLPFormProps {
  formData: SLPFormData
  onChange: (data: SLPFormData) => void
  onSave: () => void
  mode?: 'add' | 'edit' | 'view'
  onCancel?: () => void
  attachments?: AttachmentItem[]
  onAddAttachment?: (att: AttachmentItem) => void
  onRemoveAttachment?: (idx: number) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SLP_TRACKS = [
  'Enterprise - Association',
  'Enterprise - Individual',
  'Employment',
]

const STATUS_OPTIONS: SLPFormData['status'][] = ['Planned', 'Ongoing', 'Completed', 'Cancelled']

// Previously-saved attachments (loaded back from the server) don't carry a
// browser File's MIME type, only a fileName — fall back to the extension so
// "View" still previews them correctly, not just freshly-uploaded ones.
function isImageAttachment(att: AttachmentItem) {
  return att.fileType.startsWith('image/') || /\.(jpe?g|png|gif|webp)$/i.test(att.name)
}
function isPdfAttachment(att: AttachmentItem) {
  return att.fileType === 'application/pdf' || /\.pdf$/i.test(att.name)
}

// Display-only comma formatting for the Assistance Amount input -- the
// underlying value stays a plain numeric string (no commas), matching what
// the backend expects (slp.php's slpMoneyOrNull strips commas anyway, but
// keeping the stored value clean avoids depending on that).
function formatAmountDisplay(raw: string): string {
  if (!raw) return ''
  const [intPart, decPart] = raw.split('.')
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas
}
function sanitizeAmountInput(v: string): string {
  let s = v.replace(/,/g, '').replace(/[^\d.]/g, '')
  const firstDot = s.indexOf('.')
  if (firstDot !== -1) s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '')
  return s
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600 text-sm text-gray-900 placeholder:text-gray-400 read-only:bg-gray-50 read-only:cursor-default'
const labelCls = 'block text-sm text-gray-700 mb-1.5'
const sectionHeadingCls = 'text-xs font-semibold uppercase tracking-widest text-brand-blue mb-4'

// ─── Component ────────────────────────────────────────────────────────────────

export default function SLPForm({
  formData, onChange, onSave, mode = 'add', onCancel,
  attachments = [], onAddAttachment, onRemoveAttachment,
}: SLPFormProps) {
  const isView = mode === 'view'
  const isAdd = mode === 'add'
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewItem, setPreviewItem] = useState<AttachmentItem | null>(null)
  const { clearFieldError, errCls, fieldMessage, runValidation } = useFieldValidation()

  const projectNameRef = useRef<HTMLInputElement>(null)
  const slpTrackRef = useRef<HTMLSelectElement>(null)
  const dateStartedWrapRef = useRef<HTMLDivElement>(null)
  const facilitatorRef = useRef<HTMLInputElement>(null)

  function field<K extends keyof SLPFormData>(key: K, value: SLPFormData[K]) {
    onChange({ ...formData, [key]: value })
  }

  function handleSaveClick() {
    const errors: ValidationError[] = []
    const facilitator = formData.facilitator.trim()

    if (!formData.projectName.trim()) {
      errors.push({ field: 'projectName', message: 'Project Name is required.', focus: () => projectNameRef.current?.focus() })
    }
    if (!formData.slpTrack) {
      errors.push({ field: 'slpTrack', message: 'SLP Track is required.', focus: () => slpTrackRef.current?.focus() })
    }
    if (!formData.dateStarted) {
      errors.push({ field: 'dateStarted', message: 'Date Started is required.', focus: () => dateStartedWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) })
    }
    if (!facilitator) {
      errors.push({ field: 'facilitator', message: 'Facilitator / Person In Charge is required.', focus: () => facilitatorRef.current?.focus() })
    } else if (!NAME_REGEX.test(facilitator)) {
      errors.push({ field: 'facilitator', message: 'Facilitator / Person In Charge must contain letters only (no numbers or symbols).', focus: () => facilitatorRef.current?.focus() })
    }

    if (runValidation(errors)) return
    onSave()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !onAddAttachment) return
    const reader = new FileReader()
    reader.onload = () => {
      onAddAttachment({
        name: file.name,
        url: reader.result as string,
        dataUrl: reader.result as string,
        fileType: file.type,
        id: Date.now().toString() + Math.random().toString(36),
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <>
      {/* ─── Project Information ──────────────────────────────────────────────── */}
      <div className="mb-6">
        <p className={sectionHeadingCls}>Project Information</p>

        <div className="mb-4">
          <label htmlFor="slp-projectName" className={labelCls}>
            Project Name <span className="text-red-500">*</span>
          </label>
          <input
            ref={projectNameRef}
            id="slp-projectName"
            type="text"
            value={formData.projectName}
            readOnly={isView}
            onChange={e => { field('projectName', e.target.value); clearFieldError('projectName') }}
            className={`${inputCls} ${errCls('projectName')}`}
            placeholder="Enter project name"
          />
          {fieldMessage('projectName') && <p className="text-red-500 text-xs mt-1">{fieldMessage('projectName')}</p>}
        </div>

        <div className="mb-4">
          <label htmlFor="slp-description" className={labelCls}>Description</label>
          <textarea
            id="slp-description"
            value={formData.description}
            readOnly={isView}
            onChange={e => field('description', e.target.value)}
            className={inputCls + ' resize-none'}
            rows={3}
            placeholder="Enter project description"
          />
        </div>

        <div>
          <label htmlFor="slp-slpTrack" className={labelCls}>
            SLP Track <span className="text-red-500">*</span>
          </label>
          <select
            ref={slpTrackRef}
            id="slp-slpTrack"
            value={formData.slpTrack}
            disabled={isView}
            onChange={e => { field('slpTrack', e.target.value); clearFieldError('slpTrack') }}
            className={`${inputCls} bg-white ${errCls('slpTrack')}`}
          >
            <option value="">Select SLP Track</option>
            {SLP_TRACKS.map(track => (
              <option key={track} value={track}>{track}</option>
            ))}
          </select>
          {fieldMessage('slpTrack') && <p className="text-red-500 text-xs mt-1">{fieldMessage('slpTrack')}</p>}
        </div>
      </div>

      {/* ─── Implementation Details ───────────────────────────────────────────── */}
      <div className="border-t pt-5 mb-6">
        <p className={sectionHeadingCls}>Implementation Details</p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div ref={dateStartedWrapRef}>
            <label htmlFor="slp-dateStarted" className={labelCls}>
              Date Started <span className="text-red-500">*</span>
            </label>
            <div className={`rounded-lg ${fieldMessage('dateStarted') ? 'ring-2 ring-red-200' : ''}`}>
              <DatePicker
                id="slp-dateStarted"
                className={inputCls}
                value={formData.dateStarted}
                readOnly={isView}
                onChange={value => { field('dateStarted', value); clearFieldError('dateStarted') }}
              />
            </div>
            {fieldMessage('dateStarted') && <p className="text-red-500 text-xs mt-1">{fieldMessage('dateStarted')}</p>}
          </div>
          <div>
            <label htmlFor="slp-location" className={labelCls}>Location / Venue</label>
            <input
              id="slp-location"
              type="text"
              value={formData.location}
              readOnly={isView}
              onChange={e => field('location', e.target.value)}
              className={inputCls}
              placeholder="Enter location"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="slp-facilitator" className={labelCls}>
              Facilitator / Person In Charge <span className="text-red-500">*</span>
            </label>
            <input
              ref={facilitatorRef}
              id="slp-facilitator"
              type="text"
              value={formData.facilitator}
              readOnly={isView}
              onChange={e => { field('facilitator', e.target.value); clearFieldError('facilitator') }}
              className={`${inputCls} ${errCls('facilitator')}`}
              placeholder="Enter facilitator name"
            />
            {fieldMessage('facilitator') && <p className="text-red-500 text-xs mt-1">{fieldMessage('facilitator')}</p>}
          </div>

          <div>
            <label className={labelCls}>
              Status <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-2">
              {STATUS_OPTIONS.map(s => {
                const isDisabled = isView || (isAdd && s !== 'Planned')
                return (
                  <label key={s} className={`flex items-center gap-2 ${isDisabled ? 'cursor-default opacity-40' : 'cursor-pointer'}`}>
                    <input
                      type="radio"
                      name="slp-status"
                      value={s}
                      checked={formData.status === s}
                      onChange={() => field('status', s)}
                      disabled={isDisabled}
                      className="w-4 h-4 text-brand-blue focus:ring-brand-blue disabled:cursor-default"
                    />
                    <span className="text-sm text-gray-700">{s}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Assistance Information ───────────────────────────────────────────── */}
      <div className="border-t pt-5 mb-6">
        <p className={sectionHeadingCls}>Assistance Information</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="slp-assistanceAmount" className={labelCls}>Assistance Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">₱</span>
              <input
                id="slp-assistanceAmount"
                type="text"
                inputMode="decimal"
                value={formatAmountDisplay(formData.assistanceAmount)}
                readOnly={isView}
                onChange={e => field('assistanceAmount', sanitizeAmountInput(e.target.value))}
                className={inputCls + ' pl-7'}
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label htmlFor="slp-dateReleased" className={labelCls}>Date Released</label>
            <DatePicker
              id="slp-dateReleased"
              className={inputCls}
              value={formData.dateReleased}
              readOnly={isView}
              onChange={value => field('dateReleased', value)}
            />
          </div>
        </div>
      </div>

      {/* ─── Documents ────────────────────────────────────────────────────────── */}
      <div className="border-t pt-5 mb-6">
        <p className={sectionHeadingCls}>Documents</p>
        <p className="text-sm font-medium text-gray-700 mb-1">Photos &amp; Documents</p>
        <p className="text-xs text-gray-400 mb-3">
          Optional – upload proposal, MOA, beneficiary lists, distribution records, photos, and supporting documents.
        </p>

        {attachments.length > 0 && (
          <div className="space-y-2 mb-3">
            {attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex-shrink-0">
                  {isImageAttachment(att) ? (
                    <ImageIcon size={16} className="text-blue-400" />
                  ) : (
                    <FileText size={16} className="text-gray-400" />
                  )}
                </div>
                <span className="flex-1 text-sm text-gray-700 truncate">{att.name}</span>
                <button
                  type="button"
                  onClick={() => setPreviewItem(att)}
                  className="text-brand-blue hover:text-brand-blue-dark text-sm font-medium flex items-center gap-1 flex-shrink-0"
                >
                  <Eye size={14} /> View
                </button>
                {!isView && onRemoveAttachment && (
                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(i)}
                    aria-label={`Remove ${att.name}`}
                    className="text-gray-400 hover:text-red-500 flex-shrink-0 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {!isView && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-brand-blue hover:text-brand-blue transition-colors w-full justify-center"
            >
              <Upload size={16} />
              Upload File
            </button>
            <p className="text-xs text-gray-400 mt-1.5 text-center">
              JPG, PNG, PDF, DOC, DOCX, XLS, XLSX
            </p>
          </>
        )}

        {isView && attachments.length === 0 && (
          <p className="text-sm text-gray-400 italic">No documents attached.</p>
        )}
      </div>

      {/* ─── Buttons ──────────────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 border-t pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            {mode === 'add' ? 'Cancel' : 'Back to Projects'}
          </button>
        )}
        {mode !== 'view' && (
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={!canManage('livelihood-maintenance')}
            className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue"
          >
            {mode === 'edit' ? 'Update Project' : 'Save Project'}
          </button>
        )}
      </div>

      {/* ─── File preview modal ───────────────────────────────────────────────── */}
      {previewItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <p className="text-sm font-semibold text-gray-800 truncate max-w-lg">{previewItem.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{previewItem.fileType || 'Document'}</p>
              </div>
              <button onClick={() => setPreviewItem(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-50 min-h-[300px]">
              {isImageAttachment(previewItem) ? (
                <div className="flex items-center justify-center h-full">
                  <img src={previewItem.url} alt={previewItem.name} className="max-w-full max-h-[70vh] object-contain rounded-lg shadow" />
                </div>
              ) : isPdfAttachment(previewItem) ? (
                <iframe src={previewItem.url} className="w-full min-h-[600px] rounded-lg shadow" title="PDF Preview" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
                  <FileText size={56} className="mb-4" />
                  <p className="text-base font-medium text-gray-600 mb-1">Preview not available</p>
                  <p className="text-sm">This file type cannot be previewed directly.</p>
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex justify-end">
              <button onClick={() => setPreviewItem(null)} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
