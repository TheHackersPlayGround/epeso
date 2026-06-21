import { useRef } from 'react'
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react'
import type { AttachmentItem } from './DILPForm'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SLPFormData {
  projectName: string
  description: string
  slpTrack: string
  projectCategory: string
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
  'Micro-enterprise Development (MED)',
  'Employment Facilitation (EF)',
]

const PROJECT_CATEGORIES = [
  'Food Production',
  'Non-Food Based Enterprise',
  'Services',
  'Livelihood Kit Distribution',
  'Other',
]

const STATUS_OPTIONS: SLPFormData['status'][] = ['Planned', 'Ongoing', 'Completed', 'Cancelled']

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  function field<K extends keyof SLPFormData>(key: K, value: SLPFormData[K]) {
    onChange({ ...formData, [key]: value })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !onAddAttachment) return
    onAddAttachment({ name: file.name, url: URL.createObjectURL(file), fileType: file.type })
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
            id="slp-projectName"
            type="text"
            value={formData.projectName}
            readOnly={isView}
            onChange={e => field('projectName', e.target.value)}
            className={inputCls}
            placeholder="Enter project name"
          />
        </div>

        <div>
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
      </div>

      {/* ─── Project Classification ───────────────────────────────────────────── */}
      <div className="border-t pt-5 mb-6">
        <p className={sectionHeadingCls}>Project Classification</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="slp-slpTrack" className={labelCls}>
              SLP Track <span className="text-red-500">*</span>
            </label>
            <select
              id="slp-slpTrack"
              value={formData.slpTrack}
              disabled={isView}
              onChange={e => field('slpTrack', e.target.value)}
              className={inputCls + ' bg-white'}
            >
              <option value="">Select SLP Track</option>
              {SLP_TRACKS.map(track => (
                <option key={track} value={track}>{track}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="slp-projectCategory" className={labelCls}>
              Project Category <span className="text-red-500">*</span>
            </label>
            <select
              id="slp-projectCategory"
              value={formData.projectCategory}
              disabled={isView}
              onChange={e => field('projectCategory', e.target.value)}
              className={inputCls + ' bg-white'}
            >
              <option value="">Select Category</option>
              {PROJECT_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ─── Implementation Details ───────────────────────────────────────────── */}
      <div className="border-t pt-5 mb-6">
        <p className={sectionHeadingCls}>Implementation Details</p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="slp-dateStarted" className={labelCls}>
              Date Started <span className="text-red-500">*</span>
            </label>
            <input
              id="slp-dateStarted"
              type="date"
              value={formData.dateStarted}
              readOnly={isView}
              onChange={e => field('dateStarted', e.target.value)}
              className={inputCls}
            />
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
              id="slp-facilitator"
              type="text"
              value={formData.facilitator}
              readOnly={isView}
              onChange={e => field('facilitator', e.target.value)}
              className={inputCls}
              placeholder="Enter facilitator name"
            />
          </div>

          <div>
            <label className={labelCls}>
              Status <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-2">
              {STATUS_OPTIONS.map(s => (
                <label key={s} className={`flex items-center gap-2 ${isView ? 'cursor-default' : 'cursor-pointer'}`}>
                  <input
                    type="radio"
                    name="slp-status"
                    value={s}
                    checked={formData.status === s}
                    onChange={() => field('status', s)}
                    disabled={isView}
                    className="w-4 h-4 text-brand-blue focus:ring-brand-blue disabled:cursor-default"
                  />
                  <span className="text-sm text-gray-700">{s}</span>
                </label>
              ))}
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
                type="number"
                min="0"
                step="0.01"
                value={formData.assistanceAmount}
                readOnly={isView}
                onChange={e => field('assistanceAmount', e.target.value)}
                className={inputCls + ' pl-7'}
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label htmlFor="slp-dateReleased" className={labelCls}>Date Released</label>
            <input
              id="slp-dateReleased"
              type="date"
              value={formData.dateReleased}
              readOnly={isView}
              onChange={e => field('dateReleased', e.target.value)}
              className={inputCls}
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
                  {att.fileType.startsWith('image/') ? (
                    <ImageIcon size={16} className="text-blue-400" />
                  ) : (
                    <FileText size={16} className="text-gray-400" />
                  )}
                </div>
                <span className="flex-1 text-sm text-gray-700 truncate">{att.name}</span>
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
            onClick={onSave}
            className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors text-sm"
          >
            {mode === 'edit' ? 'Update Project' : 'Save Project'}
          </button>
        )}
      </div>
    </>
  )
}
