import { useRef, useState } from 'react'
import { Upload, X, FileText, Image as ImageIcon, Eye, Loader2 } from 'lucide-react'
import SearchableSelect from '../../components/SearchableSelect'
import { searchProvinces, searchCities, searchBarangaysByCity } from '../../services/locationService'
import { canManage } from '../../utils/permissions'
import DatePicker from '../../components/DatePicker'
import { useFieldValidation, type ValidationError } from '../../hooks/useFieldValidation'

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
  barangayId: number | null
  streetPurok: string
  assistanceAmount: string
  dateReleased: string
  status: 'Planned' | 'Ongoing' | 'Completed' | 'Cancelled'
}

export interface AttachmentItem {
  name: string
  url: string
  fileType: string
  dataUrl?: string
  id?: string
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
  isSaving?: boolean
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600 text-sm text-gray-900 placeholder:text-gray-400 read-only:bg-gray-50 read-only:cursor-default'
const labelCls = 'block text-sm text-gray-700 mb-1.5'
const sectionHeadingCls = 'text-xs font-semibold uppercase tracking-widest text-brand-blue mb-4'

const STATUS_OPTIONS: DILPFormData['status'][] = ['Planned', 'Ongoing', 'Completed', 'Cancelled']

// Previously-saved attachments (loaded back from the server) don't carry a
// browser File's MIME type, only a fileName — fall back to the extension so
// "View" still previews them correctly, not just freshly-uploaded ones.
function isImageAttachment(att: AttachmentItem) {
  return att.fileType.startsWith('image/') || /\.(jpe?g|png|gif|webp)$/i.test(att.name)
}
function isPdfAttachment(att: AttachmentItem) {
  return att.fileType === 'application/pdf' || /\.pdf$/i.test(att.name)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DILPForm({
  formData, onChange, onSave, mode = 'add', onCancel,
  attachments = [], onAddAttachment, onRemoveAttachment, isSaving = false,
}: DILPFormProps) {
  const isView = mode === 'view'
  const isAdd  = mode === 'add'
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewItem, setPreviewItem] = useState<AttachmentItem | null>(null)
  const [provinceId, setProvinceId] = useState<number | null>(null)
  const [cityId, setCityId] = useState<number | null>(null)
  const { clearFieldError, errCls, fieldMessage, runValidation } = useFieldValidation()

  const projectIdRef = useRef<HTMLInputElement>(null)
  const projectNameRef = useRef<HTMLInputElement>(null)
  const typeOfProjectRef = useRef<HTMLSelectElement>(null)
  const programComponentRef = useRef<HTMLSelectElement>(null)
  const wayOfImplementationRef = useRef<HTMLSelectElement>(null)

  function handleSaveClick() {
    const errors: ValidationError[] = []

    if (!formData.projectIdNumber.trim()) {
      errors.push({ field: 'projectIdNumber', message: 'Project ID Number is required.', focus: () => projectIdRef.current?.focus() })
    }
    if (!formData.projectName.trim()) {
      errors.push({ field: 'projectName', message: 'Project Name is required.', focus: () => projectNameRef.current?.focus() })
    }
    if (!formData.typeOfProject) {
      errors.push({ field: 'typeOfProject', message: 'Project Type is required.', focus: () => typeOfProjectRef.current?.focus() })
    }
    if (!formData.programComponent) {
      errors.push({ field: 'programComponent', message: 'Program Component is required.', focus: () => programComponentRef.current?.focus() })
    }
    if (!formData.wayOfImplementation) {
      errors.push({ field: 'wayOfImplementation', message: 'Implementation Type is required.', focus: () => wayOfImplementationRef.current?.focus() })
    }

    if (runValidation(errors)) return
    onSave()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onAddAttachment) return
    const reader = new FileReader()
    reader.onload = () => {
      onAddAttachment({
        name: file.name,
        url: URL.createObjectURL(file),
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
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelCls}>Project ID Number <span className="text-red-500">*</span></label>
            <input ref={projectIdRef} type="text" value={formData.projectIdNumber} readOnly={isView}
              onChange={e => { onChange({ ...formData, projectIdNumber: e.target.value }); clearFieldError('projectIdNumber') }}
              className={`${inputCls} ${errCls('projectIdNumber')}`} placeholder="Enter project ID number" />
            {fieldMessage('projectIdNumber') && <p className="text-red-500 text-xs mt-1">{fieldMessage('projectIdNumber')}</p>}
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Project Name <span className="text-red-500">*</span></label>
            <input ref={projectNameRef} type="text" value={formData.projectName} readOnly={isView}
              onChange={e => { onChange({ ...formData, projectName: e.target.value }); clearFieldError('projectName') }}
              className={`${inputCls} ${errCls('projectName')}`} placeholder="Enter project name" />
            {fieldMessage('projectName') && <p className="text-red-500 text-xs mt-1">{fieldMessage('projectName')}</p>}
          </div>
          <div>
            <label className={labelCls}>Project Type <span className="text-red-500">*</span></label>
            <select ref={typeOfProjectRef} value={formData.typeOfProject} disabled={isView}
              onChange={e => { onChange({ ...formData, typeOfProject: e.target.value }); clearFieldError('typeOfProject') }}
              className={`${inputCls} ${errCls('typeOfProject')}`}>
              <option value="">Select Project Type</option>
              <option value="Individual">Individual</option>
              <option value="Group">Group</option>
            </select>
            {fieldMessage('typeOfProject') && <p className="text-red-500 text-xs mt-1">{fieldMessage('typeOfProject')}</p>}
          </div>
          <div>
            <label className={labelCls}>Program Component <span className="text-red-500">*</span></label>
            <select ref={programComponentRef} value={formData.programComponent} disabled={isView}
              onChange={e => { onChange({ ...formData, programComponent: e.target.value }); clearFieldError('programComponent') }}
              className={`${inputCls} ${errCls('programComponent')}`}>
              <option value="">Select Component</option>
              <option value="Formation">Formation</option>
              <option value="Restoration">Restoration</option>
              <option value="Enhancement">Enhancement</option>
            </select>
            {fieldMessage('programComponent') && <p className="text-red-500 text-xs mt-1">{fieldMessage('programComponent')}</p>}
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Implementation Type <span className="text-red-500">*</span></label>
            <select ref={wayOfImplementationRef} value={formData.wayOfImplementation} disabled={isView}
              onChange={e => { onChange({ ...formData, wayOfImplementation: e.target.value }); clearFieldError('wayOfImplementation') }}
              className={`${inputCls} ${errCls('wayOfImplementation')}`}>
              <option value="">Select Implementation Type</option>
              <option value="ACP">ACP</option>
              <option value="Direct Admin">Direct Admin</option>
            </select>
            {fieldMessage('wayOfImplementation') && <p className="text-red-500 text-xs mt-1">{fieldMessage('wayOfImplementation')}</p>}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Province</label>
              <SearchableSelect
                value={formData.province}
                placeholder="Search province..."
                fetchOptions={s => searchProvinces(s)}
                onSelect={opt => {
                  setProvinceId(opt.id)
                  setCityId(null)
                  onChange({ ...formData, province: opt.name, cityMunicipality: '', barangay: '', barangayId: null, region: '' })
                }}
              />
            </div>
            <div>
              <label className={labelCls}>City / Municipality</label>
              <SearchableSelect
                value={formData.cityMunicipality}
                placeholder={provinceId ? 'Search city/municipality...' : 'Select province first'}
                disabled={!provinceId}
                refetchKey={provinceId ?? ''}
                fetchOptions={s => searchCities(provinceId ?? 0, s)}
                onSelect={opt => {
                  setCityId(opt.id)
                  onChange({ ...formData, cityMunicipality: opt.name, barangay: '', barangayId: null })
                }}
              />
            </div>
            <div>
              <label className={labelCls}>Barangay</label>
              <SearchableSelect
                value={formData.barangay}
                placeholder={cityId ? 'Search barangay...' : 'Select city first'}
                disabled={!cityId}
                refetchKey={cityId ?? ''}
                fetchOptions={s => searchBarangaysByCity(cityId ?? 0, s)}
                onSelect={opt => onChange({ ...formData, barangay: opt.name, barangayId: opt.id })}
              />
            </div>
            <div>
              <label className={labelCls}>Street / Purok #</label>
              <input
                className={inputCls}
                value={formData.streetPurok}
                onChange={e => onChange({ ...formData, streetPurok: e.target.value })}
                placeholder="e.g. Purok 3, Rizal St."
              />
            </div>
          </div>
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
            <DatePicker className={inputCls} value={formData.dateReleased} readOnly={isView}
              onChange={value => onChange({ ...formData, dateReleased: value })} />
          </div>
        </div>
      </div>

      {/* ─── Project Status ───────────────────────────────────────────────────── */}
      <div className="border-t pt-5 mb-6">
        <p className={sectionHeadingCls}>Project Status</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {STATUS_OPTIONS.map(s => {
            const isDisabled = isView || (isAdd && s !== 'Planned')
            return (
            <label key={s} className={`flex items-center gap-2 ${isDisabled ? 'cursor-default opacity-40' : 'cursor-pointer'}`}>
              <input type="radio" name="dilp-status" value={s}
                checked={formData.status === s}
                onChange={() => onChange({ ...formData, status: s })}
                disabled={isDisabled}
                className="w-4 h-4 text-brand-blue focus:ring-brand-blue disabled:cursor-default" />
              <span className="text-gray-700 text-sm">{s}</span>
            </label>
            )
          })}
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
                  {isImageAttachment(att) ? <ImageIcon size={16} className="text-blue-400" /> : <FileText size={16} className="text-gray-400" />}
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
          <button type="button" onClick={onCancel} className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm">
            {mode === 'add' ? 'Cancel' : 'Back to Projects List'}
          </button>
        )}
        {mode !== 'view' && (
          <button onClick={handleSaveClick} disabled={!canManage('livelihood-maintenance') || isSaving} className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue flex items-center gap-2">
            {isSaving && <Loader2 size={16} className="animate-spin" />}
            {isSaving ? 'Saving…' : (mode === 'edit' ? 'Update Project' : 'Save Project')}
          </button>
        )}
      </div>

      {/* ─── File preview modal ───────────────────────────────────────────────── */}
      {previewItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
          {/* PDFs render via the browser's native viewer, which needs real room for
              its own toolbar/thumbnail sidebar -- so it gets a near-fullscreen modal,
              unlike the fixed, more modest box images/fallback content use (which
              just center-fit). */}
          <div className={`bg-white rounded-xl shadow-2xl w-full flex flex-col ${isPdfAttachment(previewItem) ? 'max-w-[95vw] h-[95vh]' : 'max-w-4xl max-h-[90vh]'}`}>
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

