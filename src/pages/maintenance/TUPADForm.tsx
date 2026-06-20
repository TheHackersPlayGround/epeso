import { useRef } from 'react'
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react'
import type { AttachmentItem } from './DILPForm'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TUPADFormData {
  title: string
  description: string
  date: string
  location: string
  facilitator: string
  participants: string
  status: 'Planned' | 'Ongoing' | 'Completed'
  assistanceAmount: string
  dateReleased: string
  beneficiaryType: 'Individual' | 'Group' | ''
}

interface TUPADFormProps {
  formData: TUPADFormData
  onChange: (data: TUPADFormData) => void
  onSave: () => void
  mode?: 'add' | 'edit' | 'view'
  onCancel?: () => void
  attachments?: AttachmentItem[]
  onAddAttachment?: (att: AttachmentItem) => void
  onRemoveAttachment?: (idx: number) => void
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600 text-sm text-gray-900 placeholder:text-gray-400 read-only:bg-gray-50 read-only:cursor-default'
const labelCls = 'block text-sm text-gray-700 mb-1.5'
const sectionHeadingCls = 'text-xs font-semibold uppercase tracking-widest text-brand-blue mb-4'

// ─── Component ────────────────────────────────────────────────────────────────

export default function TUPADForm({
  formData, onChange, onSave, mode = 'add', onCancel,
  attachments = [], onAddAttachment, onRemoveAttachment,
}: TUPADFormProps) {
  const isView = mode === 'view'
  const fileInputRef = useRef<HTMLInputElement>(null)

  function field<K extends keyof TUPADFormData>(key: K, value: TUPADFormData[K]) {
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
      {/* ─── Activity Information ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <p className={sectionHeadingCls}>Activity Information</p>

        <div className="mb-4">
          <label htmlFor="tupad-title" className={labelCls}>
            Title / Name <span className="text-red-500">*</span>
          </label>
          <input
            id="tupad-title"
            type="text"
            value={formData.title}
            readOnly={isView}
            onChange={e => field('title', e.target.value)}
            className={inputCls}
            placeholder="Enter activity title"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="tupad-description" className={labelCls}>Description</label>
          <textarea
            id="tupad-description"
            value={formData.description}
            readOnly={isView}
            onChange={e => field('description', e.target.value)}
            className={inputCls + ' resize-none'}
            rows={3}
            placeholder="Enter activity description"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="tupad-date" className={labelCls}>Date</label>
            <input
              id="tupad-date"
              type="date"
              value={formData.date}
              readOnly={isView}
              onChange={e => field('date', e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="tupad-location" className={labelCls}>Location / Venue</label>
            <input
              id="tupad-location"
              type="text"
              value={formData.location}
              readOnly={isView}
              onChange={e => field('location', e.target.value)}
              className={inputCls}
              placeholder="Enter location"
            />
          </div>
        </div>
      </div>

      {/* ─── Implementation Details ───────────────────────────────────────────── */}
      <div className="border-t pt-5 mb-6">
        <p className={sectionHeadingCls}>Implementation Details</p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="tupad-facilitator" className={labelCls}>Person In Charge / Facilitator</label>
            <input
              id="tupad-facilitator"
              type="text"
              value={formData.facilitator}
              readOnly={isView}
              onChange={e => field('facilitator', e.target.value)}
              className={inputCls}
              placeholder="Enter person in charge"
            />
          </div>
          <div>
            <label htmlFor="tupad-participants" className={labelCls}>Number of Participants / Beneficiaries</label>
            <input
              id="tupad-participants"
              type="number"
              min="0"
              value={formData.participants}
              readOnly={isView}
              onChange={e => field('participants', e.target.value)}
              className={inputCls}
              placeholder="Enter number"
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>
            Status <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-6 mt-1">
            {(['Planned', 'Ongoing', 'Completed'] as const).map(s => (
              <label key={s} className={`flex items-center gap-2 ${isView ? 'cursor-default' : 'cursor-pointer'}`}>
                <input
                  type="radio"
                  name="tupad-status"
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

      {/* ─── Assistance Information ───────────────────────────────────────────── */}
      <div className="border-t pt-5 mb-6">
        <p className={sectionHeadingCls}>Assistance Information</p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="tupad-assistanceAmount" className={labelCls}>Assistance Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">₱</span>
              <input
                id="tupad-assistanceAmount"
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
            <label htmlFor="tupad-dateReleased" className={labelCls}>Date Released</label>
            <input
              id="tupad-dateReleased"
              type="date"
              value={formData.dateReleased}
              readOnly={isView}
              onChange={e => field('dateReleased', e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Beneficiary Type</label>
          <div className="flex gap-6 mt-1">
            {(['Individual', 'Group'] as const).map(t => (
              <label key={t} className={`flex items-center gap-2 ${isView ? 'cursor-default' : 'cursor-pointer'}`}>
                <input
                  type="radio"
                  name="tupad-beneficiaryType"
                  value={t}
                  checked={formData.beneficiaryType === t}
                  onChange={() => field('beneficiaryType', t)}
                  disabled={isView}
                  className="w-4 h-4 text-brand-blue focus:ring-brand-blue disabled:cursor-default"
                />
                <span className="text-sm text-gray-700">{t}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Documents ────────────────────────────────────────────────────────── */}
      <div className="border-t pt-5 mb-6">
        <p className={sectionHeadingCls}>Documents</p>
        <p className="text-sm font-medium text-gray-700 mb-1">Photos &amp; Documents</p>
        <p className="text-xs text-gray-400 mb-3">
          Optional – upload activity photos, signed forms, distribution lists, and supporting documents.
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
              multiple
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
