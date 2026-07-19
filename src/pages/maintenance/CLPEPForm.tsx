import { useRef, useState } from 'react'
import { Upload, X, FileText, Image as ImageIcon, Eye } from 'lucide-react'
import { canManage } from '../../utils/permissions'
import type { AttachmentItem } from './DILPForm'
import DatePicker from '../../components/DatePicker'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CLPEPFormData {
  interventionName: string
  description: string
  interventionCategory: string
  interventionCategoryOther: string
  targetBeneficiaries: string
  date: string
  implementingOfficer: string
  partnerAgency: string
  partnerAgencyOther: string
  location: string
  status: 'Planned' | 'Ongoing' | 'Completed'
}

interface CLPEPFormProps {
  formData: CLPEPFormData
  onChange: (data: CLPEPFormData) => void
  onSave: () => void
  onSaveDraft: () => void
  mode?: 'add' | 'edit' | 'view'
  onCancel?: () => void
  attachments?: AttachmentItem[]
  onAddAttachment?: (att: AttachmentItem) => void
  onRemoveAttachment?: (idx: number) => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INTERVENTION_CATEGORIES = [
  'Educational Assistance',
  'Family Intervention',
  'Legal Assistance',
  'Skills Training',
  'Livelihood Support',
  'Medical / Health Assistance',
  'Psychosocial Support',
  'Financial Assistance',
  'Housing Assistance',
  'Emergency Employment / Job Placement',
  'Temporary Shelter',
  'Other',
]

const PARTNER_AGENCIES = [
  'DepEd',
  'DSWD',
  'DOH',
  'DOLE',
  'TESDA',
  'LGU',
  'DILG',
  'DOJ',
  'PNP / Law Enforcement',
  'NGO / CSO',
  'Other',
]

const STATUS_OPTIONS: CLPEPFormData['status'][] = ['Planned', 'Ongoing', 'Completed']

// Previously-saved attachments (loaded back from the server) don't carry a
// browser File's MIME type, only a fileName — fall back to the extension so
// "View" still previews them correctly, not just freshly-uploaded ones.
function isImageAttachment(att: AttachmentItem) {
  return att.fileType.startsWith('image/') || /\.(jpe?g|png|gif|webp)$/i.test(att.name)
}
function isPdfAttachment(att: AttachmentItem) {
  return att.fileType === 'application/pdf' || /\.pdf$/i.test(att.name)
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600 text-sm text-gray-900 placeholder:text-gray-400 read-only:bg-gray-50 read-only:cursor-default'
const labelCls = 'block text-sm text-gray-700 mb-1.5'
const sectionHeadingCls = 'text-xs font-semibold uppercase tracking-widest text-brand-blue mb-4'

// ─── Component ────────────────────────────────────────────────────────────────

export default function CLPEPForm({
  formData, onChange, onSave, onSaveDraft, mode = 'add', onCancel,
  attachments = [], onAddAttachment, onRemoveAttachment,
}: CLPEPFormProps) {
  const isView = mode === 'view'
  const isAdd = mode === 'add'
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewItem, setPreviewItem] = useState<AttachmentItem | null>(null)

  function field<K extends keyof CLPEPFormData>(key: K, value: CLPEPFormData[K]) {
    onChange({ ...formData, [key]: value })
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
      {/* ─── Intervention Information ─────────────────────────────────────────── */}
      <div className="mb-6">
        <p className={sectionHeadingCls}>Intervention Information</p>

        <div className="mb-4">
          <label htmlFor="clpep-interventionName" className={labelCls}>
            Intervention Name <span className="text-red-500">*</span>
          </label>
          <input
            id="clpep-interventionName"
            type="text"
            value={formData.interventionName}
            readOnly={isView}
            onChange={e => field('interventionName', e.target.value)}
            className={inputCls}
            placeholder="Enter intervention name"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="clpep-description" className={labelCls}>Description</label>
          <textarea
            id="clpep-description"
            value={formData.description}
            readOnly={isView}
            onChange={e => field('description', e.target.value)}
            className={inputCls + ' resize-none'}
            rows={3}
            placeholder="Enter intervention description"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="clpep-interventionCategory" className={labelCls}>
              Intervention Category <span className="text-red-500">*</span>
            </label>
            <select
              id="clpep-interventionCategory"
              value={formData.interventionCategory}
              disabled={isView}
              onChange={e => field('interventionCategory', e.target.value)}
              className={inputCls + ' bg-white'}
            >
              <option value="">Select Category</option>
              {INTERVENTION_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {formData.interventionCategory === 'Other' && (
              <input
                id="clpep-interventionCategoryOther"
                type="text"
                value={formData.interventionCategoryOther}
                readOnly={isView}
                onChange={e => field('interventionCategoryOther', e.target.value)}
                className={inputCls + ' mt-2'}
                placeholder="Please specify category"
              />
            )}
          </div>

          <div>
            <label htmlFor="clpep-targetBeneficiaries" className={labelCls}>Target Beneficiaries</label>
            <input
              id="clpep-targetBeneficiaries"
              type="number"
              min="0"
              value={formData.targetBeneficiaries}
              readOnly={isView}
              onChange={e => field('targetBeneficiaries', e.target.value)}
              className={inputCls}
              placeholder="Enter target number"
            />
          </div>
        </div>
      </div>

      {/* ─── Implementation Details ───────────────────────────────────────────── */}
      <div className="border-t pt-5 mb-6">
        <p className={sectionHeadingCls}>Implementation Details</p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="clpep-date" className={labelCls}>
              Date <span className="text-red-500">*</span>
            </label>
            <DatePicker
              id="clpep-date"
              className={inputCls}
              value={formData.date}
              readOnly={isView}
              onChange={value => field('date', value)}
            />
          </div>
          <div>
            <label htmlFor="clpep-implementingOfficer" className={labelCls}>
              Implementing Officer <span className="text-red-500">*</span>
            </label>
            <input
              id="clpep-implementingOfficer"
              type="text"
              value={formData.implementingOfficer}
              readOnly={isView}
              onChange={e => field('implementingOfficer', e.target.value)}
              className={inputCls}
              placeholder="Enter officer name"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="clpep-partnerAgency" className={labelCls}>Partner Agency</label>
            <select
              id="clpep-partnerAgency"
              value={formData.partnerAgency}
              disabled={isView}
              onChange={e => field('partnerAgency', e.target.value)}
              className={inputCls + ' bg-white'}
            >
              <option value="">Select Agency</option>
              {PARTNER_AGENCIES.map(agency => (
                <option key={agency} value={agency}>{agency}</option>
              ))}
            </select>
            {formData.partnerAgency === 'Other' && (
              <input
                id="clpep-partnerAgencyOther"
                type="text"
                value={formData.partnerAgencyOther}
                readOnly={isView}
                onChange={e => field('partnerAgencyOther', e.target.value)}
                className={inputCls + ' mt-2'}
                placeholder="Please specify agency"
              />
            )}
          </div>
        </div>

        <div>
          <label htmlFor="clpep-location" className={labelCls}>Location / Venue</label>
          <input
            id="clpep-location"
            type="text"
            value={formData.location}
            readOnly={isView}
            onChange={e => field('location', e.target.value)}
            className={inputCls}
            placeholder="Enter location or venue"
          />
        </div>
      </div>

      {/* ─── Intervention Status ──────────────────────────────────────────────── */}
      <div className="border-t pt-5 mb-6">
        <p className={sectionHeadingCls}>Intervention Status</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {STATUS_OPTIONS.map(s => {
            const isDisabled = isView || (isAdd && s !== 'Planned')
            return (
              <label key={s} className={`flex items-center gap-2 ${isDisabled ? 'cursor-default opacity-40' : 'cursor-pointer'}`}>
                <input
                  type="radio"
                  name="clpep-status"
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

      {/* ─── Documents ────────────────────────────────────────────────────────── */}
      <div className="border-t pt-5 mb-6">
        <p className={sectionHeadingCls}>Documents</p>
        <p className="text-sm font-medium text-gray-700 mb-1">Supporting Documents</p>
        <p className="text-xs text-gray-400 mb-3">
          Upload intervention plans, referral documents, MOAs, implementation reports, and supporting files.
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
          <>
            {mode === 'add' && (
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={!canManage('maintenance')}
                className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-200"
              >
                Save Draft
              </button>
            )}
            <button
              type="button"
              onClick={onSave}
              disabled={!canManage('maintenance')}
              className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue"
            >
              {mode === 'edit' ? 'Update Intervention' : 'Save Intervention'}
            </button>
          </>
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
