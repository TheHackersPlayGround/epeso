import { X, FileText, FileSpreadsheet } from 'lucide-react'

// Minimal document shape needed to preview a file.
export interface PreviewableDocument {
  id: string
  fileName: string
  fileSize?: string
  url?: string
  dataUrl?: string
  customName?: string
}

interface DocumentPreviewModalProps {
  doc: PreviewableDocument
  onClose: () => void
}

const IMAGE_RE = /\.(png|jpe?g|gif|webp)$/i
const PDF_RE = /\.pdf$/i
const EXCEL_RE = /\.(xlsx|xls|csv)$/i

// Renders a modal preview of a document (image, PDF, or a fallback message).
export default function DocumentPreviewModal({ doc, onClose }: DocumentPreviewModalProps) {
  const isImage = IMAGE_RE.test(doc.fileName)
  const isPdf = PDF_RE.test(doc.fileName)
  const isExcel = EXCEL_RE.test(doc.fileName)
  const src = doc.url || doc.dataUrl

  // PDFs get a near-fullscreen modal for the browser's native viewer toolbar;
  // images/fallback content use a smaller, fixed box.
  const fullscreen = isPdf

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[9999] p-4">
      <div className={`bg-white rounded-xl shadow-2xl w-full flex flex-col ${fullscreen ? 'max-w-[95vw] h-[95vh]' : 'max-w-4xl max-h-[90vh]'}`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <p className="text-sm text-gray-500 truncate">{doc.customName || doc.fileName}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-gray-50">
          {isImage ? (
            <div className="flex items-center justify-center h-full">
              <img src={src} alt={doc.fileName} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
            </div>
          ) : isPdf ? (
            <iframe src={src} className="w-full h-full min-h-[600px] rounded-lg shadow-lg" title="PDF Preview" />
          ) : isExcel ? (
            // Excel/CSV isn't an accepted upload type, but a pre-existing
            // attachment can still have one; show a specific message for it.
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <FileSpreadsheet size={64} className="mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">Excel preview isn't supported</p>
              <p className="text-sm text-gray-400 mb-4">Download the file to view its contents.</p>
              {src && <a href={src} target="_blank" rel="noreferrer" className="text-sm text-brand-blue underline">Open / download file</a>}
            </div>
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
