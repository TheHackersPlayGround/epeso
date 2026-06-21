import { useRef, useState } from 'react'
import { Upload, X, FileText, Image as ImageIcon, Eye } from 'lucide-react'
import AddressFields, { type AddressValue } from '../../components/AddressFields'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DILPFormData {
  projectIdNumber: string
  projectName: string
  typeOfProject: string
  programComponent: string
  wayOfImplementation: string
  region: string
  province: string
  cityMunicipality: string
  barangay: string
  streetPurok: string
  assistanceAmount: string
  dateReleased: string
  status: 'Planned' | 'Ongoing' | 'Completed' | 'Cancelled'
}

export interface AttachmentItem {
  name: string
  url: string
  fileType: string
}

interface DILPFormProps {
  formData: DILPFormData
  onChange: (data: DILPFormData) => void
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

const STATUS_OPTIONS: DILPFormData['status'][] = ['Planned', 'Ongoing', 'Completed', 'Cancelled']

// ─── Component ────────────────────────────────────────────────────────────────

export default function DILPForm({
  formData, onChange, onSave, mode = 'add', onCancel,
  attachments = [], onAddAttachment, onRemoveAttachment,
}: DILPFormProps) {
  const isView = mode === 'view'
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewItem, setPreviewItem] = useState<AttachmentItem | null>(null)

  const addressValue: AddressValue = {
    region: formData.region,
    province: formData.province,
    cityMunicipality: formData.cityMunicipality,
    barangay: formData.barangay,
    streetPurok: formData.streetPurok,
  }

  const handleAddressChange = (partial: Partial<AddressValue>) => {
    onChange({ ...formData, ...partial })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelCls}>Project ID Number <span className="text-red-500">*</span></label>
            <input type="text" value={formData.projectIdNumber} readOnly={isView}
              onChange={e => onChange({ ...formData, projectIdNumber: e.target.value })}
              className={inputCls} placeholder="Enter project ID number" />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Project Name <span className="text-red-500">*</span></label>
            <input type="text" value={formData.projectName} readOnly={isView}
              onChange={e => onChange({ ...formData, projectName: e.target.value })}
              className={inputCls} placeholder="Enter project name" />
          </div>
          <div>
            <label className={labelCls}>Project Type <span className="text-red-500">*</span></label>
            <select value={formData.typeOfProject} disabled={isView}
              onChange={e => onChange({ ...formData, typeOfProject: e.target.value })}
              className={inputCls}>
              <option value="">Select Project Type</option>
              <option value="Individual">Individual</option>
              <option value="Group">Group</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Program Component <span className="text-red-500">*</span></label>
            <select value={formData.programComponent} disabled={isView}
              onChange={e => onChange({ ...formData, programComponent: e.target.value })}
              className={inputCls}>
              <option value="">Select Component</option>
              <option value="Formation">Formation</option>
              <option value="Restoration">Restoration</option>
              <option value="Enhancement">Enhancement</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Implementation Type <span className="text-red-500">*</span></label>
            <select value={formData.wayOfImplementation} disabled={isView}
              onChange={e => onChange({ ...formData, wayOfImplementation: e.target.value })}
              className={inputCls}>
              <option value="">Select Implementation Type</option>
              <option value="ACP">ACP</option>
              <option value="Direct Admin">Direct Admin</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── Project Location ─────────────────────────────────────────────────── */}
      <div className="border-t pt-5 mb-6">
        <p className={sectionHeadingCls}>Project Location</p>
        {isView ? (
          <div className="grid grid-cols-2 gap-4">
            {[
              ['Region', formData.region],
              ['Province', formData.province],
              ['City / Municipality', formData.cityMunicipality],
              ['Barangay', formData.barangay],
              ['Street / Purok', formData.streetPurok],
            ].map(([label, val]) => (
              <div key={label}>
                <label className={labelCls}>{label}</label>
                <div className="px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700">{val || '—'}</div>
              </div>
            ))}
          </div>
        ) : (
          <AddressFields
            value={addressValue}
            onChange={handleAddressChange}
            inputClass="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent text-sm text-gray-900"
            labelClass={labelCls}
          />
        )}
      </div>

      {/* ─── Assistance Information ───────────────────────────────────────────── */}
      <div className="border-t pt-5 mb-6">
        <p className={sectionHeadingCls}>Assistance Information</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Assistance Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₱</span>
              <input type="number" min="0" step="0.01" value={formData.assistanceAmount} readOnly={isView}
                onChange={e => onChange({ ...formData, assistanceAmount: e.target.value })}
                className={inputCls + ' pl-7'} placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Date Released</label>
            <input type="date" value={formData.dateReleased} readOnly={isView}
              onChange={e => onChange({ ...formData, dateReleased: e.target.value })}
              className={inputCls} />
          </div>
        </div>
      </div>

      {/* ─── Project Status ───────────────────────────────────────────────────── */}
      <div className="border-t pt-5 mb-6">
        <p className={sectionHeadingCls}>Project Status</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {STATUS_OPTIONS.map(s => (
            <label key={s} className={`flex items-center gap-2 ${isView ? 'cursor-default' : 'cursor-pointer'}`}>
              <input type="radio" name="dilp-status" value={s}
                checked={formData.status === s}
                onChange={() => onChange({ ...formData, status: s })}
                disabled={isView}
                className="w-4 h-4 text-brand-blue focus:ring-brand-blue disabled:cursor-default" />
              <span className="text-gray-700 text-sm">{s}</span>
            </label>
          ))}
        </div>
      </div>

      {/* ─── Documents ────────────────────────────────────────────────────────── */}
      <div className="border-t pt-5 mb-6">
        <p className={sectionHeadingCls}>Documents</p>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-700">Project Documents</span>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Upload project proposal, MOA, distribution lists, accomplishment reports, project photos, and supporting documents.
        </p>
        {attachments.length > 0 && (
          <div className="space-y-2 mb-3">
            {attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex-shrink-0">
                  {att.fileType.startsWith('image/') ? <ImageIcon size={16} className="text-blue-400" /> : <FileText size={16} className="text-gray-400" />}
                </div>
                <span className="flex-1 text-sm text-gray-700 truncate">{att.name}</span>
                <button type="button" onClick={() => setPreviewItem(att)}
                  className="text-brand-blue hover:text-brand-blue-dark text-sm font-medium flex items-center gap-1 flex-shrink-0">
                  <Eye size={14} /> View
                </button>
                {!isView && onRemoveAttachment && (
                  <button type="button" onClick={() => onRemoveAttachment(i)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {!isView && (
          <>
            <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={handleFileChange} />
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-brand-blue hover:text-brand-blue transition-colors w-full justify-center">
              <Upload size={15} /> Upload File
            </button>
            <p className="text-xs text-gray-400 mt-1 text-center">JPG, PNG, PDF, DOC, DOCX, XLS, XLSX</p>
          </>
        )}
        {isView && attachments.length === 0 && (
          <p className="text-sm text-gray-400 italic">No documents attached.</p>
        )}
      </div>

      {/* ─── Buttons ──────────────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 border-t pt-4">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            {mode === 'add' ? 'Cancel' : 'Back to Projects List'}
          </button>
        )}
        {mode !== 'view' && (
          <button onClick={onSave} className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors">
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
              {previewItem.fileType.startsWith('image/') ? (
                <div className="flex items-center justify-center h-full">
                  <img src={previewItem.url} alt={previewItem.name} className="max-w-full max-h-[70vh] object-contain rounded-lg shadow" />
                </div>
              ) : previewItem.fileType === 'application/pdf' ? (
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

