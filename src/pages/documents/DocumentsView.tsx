import { useState, useRef, useEffect } from 'react'
import {
  ArrowLeft, Upload, FolderPlus, Search, MoreVertical, Download, Eye,
  Edit2, Move, Trash2, X, File, FileText, Image as ImageIcon,
  FileSpreadsheet, Folder, ChevronRight, Grid3x3, List,
} from 'lucide-react'
import { renderAsync } from 'docx-preview'
import * as XLSX from 'xlsx'
import { canManage } from '../../utils/permissions'
import type { FileItem, FolderItem } from '../../contexts/DocumentsContext'
import { useDocuments } from '../../contexts/DocumentsContext'
import ConfirmModal from '../shared/ConfirmModal'

const BRAND = '#0077BE'
const BRAND_DARK = '#0065A5'

interface DocumentsViewProps {
  onBack: () => void
  onAddToRecycleBin?: (item: {
    name: string; module: string; description: string; deletedBy: string; deletedAt: string
  }) => void
}

type SortKey = 'date' | 'name' | 'type' | 'size'

interface ExcelData {
  sheetNames: string[]
  sheets: Record<string, string[][]>
}

export default function DocumentsView({ onBack, onAddToRecycleBin }: DocumentsViewProps) {
  const { folders, setFolders, files, setFiles } = useDocuments()

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedFolder, setSelectedFolder] = useState('root')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('date')

  const [expandedFolders, setExpandedFolders] = useState<string[]>(['root'])
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [activeFolderMenuId, setActiveFolderMenuId] = useState<string | null>(null)

  // Modals – folder
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderParent, setNewFolderParent] = useState('root')
  const [isEditFolderModalOpen, setIsEditFolderModalOpen] = useState(false)
  const [folderToEdit, setFolderToEdit] = useState<FolderItem | null>(null)
  const [editFolderName, setEditFolderName] = useState('')

  // Modals – file
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false)
  const [fileToMove, setFileToMove] = useState<FileItem | null>(null)
  const [moveDestination, setMoveDestination] = useState('root')
  const [isRenameFileModalOpen, setIsRenameFileModalOpen] = useState(false)
  const [fileToRename, setFileToRename] = useState<FileItem | null>(null)
  const [renameFileValue, setRenameFileValue] = useState('')

  // Confirm / success modals
  const [deleteFileConfirm, setDeleteFileConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })
  const [deleteFolderConfirm, setDeleteFolderConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })
  const [successModal, setSuccessModal] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const [errorModal, setErrorModal] = useState<{ open: boolean; message: string }>({ open: false, message: '' })

  // DOCX preview
  const [docxPreview, setDocxPreview] = useState<{ isOpen: boolean; fileName: string; fileUrl: string }>({ isOpen: false, fileName: '', fileUrl: '' })
  const docxContainerRef = useRef<HTMLDivElement>(null)

  // Excel preview
  const [excelPreview, setExcelPreview] = useState<{ isOpen: boolean; fileName: string }>({ isOpen: false, fileName: '' })

  // Image / generic file preview
  const [filePreview, setFilePreview] = useState<{ isOpen: boolean; fileName: string; fileUrl: string; type: string }>({ isOpen: false, fileName: '', fileUrl: '', type: '' })
  const [excelData, setExcelData] = useState<ExcelData | null>(null)
  const [currentSheetIndex, setCurrentSheetIndex] = useState(0)

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const getFolderDepth = (folderId: string): number => {
    let depth = 0
    let cur = folderId
    while (cur && cur !== 'root') {
      const f = folders.find(x => x.id === cur)
      if (f?.parentId) { depth++; cur = f.parentId } else break
    }
    return depth
  }

  const getChildFolders = (parentId: string) => folders.filter(f => f.parentId === parentId)

  const getFolderItemCount = (folderId: string) => files.filter(f => f.folderId === folderId).length

  const getBreadcrumb = () => {
    const path: FolderItem[] = []
    let cur = selectedFolder
    while (cur) {
      const f = folders.find(x => x.id === cur)
      if (f) { path.unshift(f); cur = f.parentId ?? '' } else break
    }
    return path
  }

  const toggleFolder = (id: string) =>
    setExpandedFolders(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const getFileIcon = (type: string, size = 40) => {
    switch (type) {
      case 'pdf': return <FileText size={size} className="text-red-500" />
      case 'doc': case 'docx': return <FileText size={size} className="text-blue-500" />
      case 'xls': case 'xlsx': return <FileSpreadsheet size={size} className="text-green-600" />
      case 'jpg': case 'png': return <ImageIcon size={size} className="text-purple-500" />
      default: return <File size={size} className="text-gray-500" />
    }
  }

  const sizeInBytes = (s: string) => {
    const v = parseFloat(s)
    return s.includes('MB') ? v * 1024 * 1024 : v * 1024
  }

  // ── Upload ────────────────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return

    const ext = f.name.split('.').pop()?.toLowerCase() ?? 'other'
    const type = (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'png'].includes(ext)
      ? ext : 'other') as FileItem['type']

    const kb = f.size / 1024
    const size = kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`

    const newFile: FileItem = {
      id: Date.now().toString(),
      name: f.name, type, size,
      uploadedBy: 'Current User',
      uploadedDate: new Date().toISOString().split('T')[0],
      category: 'Uncategorized',
      folderId: selectedFolder,
      fileUrl: URL.createObjectURL(f),
    }
    setFiles(prev => [...prev, newFile])
    setSuccessModal({ open: true, message: `"${f.name}" uploaded successfully!` })
    e.target.value = ''
  }

  // ── Folder CRUD ───────────────────────────────────────────────────────────────
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return
    if (getFolderDepth(newFolderParent) >= 2) {
      setErrorModal({ open: true, message: 'Cannot create folder: maximum nesting depth (2 levels) reached.' })
      return
    }
    setFolders(prev => [...prev, { id: `folder_${Date.now()}`, name: newFolderName.trim(), parentId: newFolderParent }])
    setExpandedFolders(prev => [...prev, newFolderParent])
    setIsNewFolderModalOpen(false)
    setNewFolderName('')
    setSuccessModal({ open: true, message: 'Folder created successfully!' })
  }

  const handleEditFolder = () => {
    if (!folderToEdit || !editFolderName.trim()) return
    setFolders(prev => prev.map(f => f.id === folderToEdit.id ? { ...f, name: editFolderName.trim() } : f))
    setIsEditFolderModalOpen(false)
    setFolderToEdit(null)
    setSuccessModal({ open: true, message: 'Folder renamed successfully!' })
  }

  const handleDeleteFolder = (folderId: string) => {
    const filesInside = files.filter(f => f.folderId === folderId).length
    if (filesInside > 0) {
      setErrorModal({ open: true, message: `Cannot delete folder: it contains ${filesInside} file(s). Move or delete the files first.` })
      setDeleteFolderConfirm({ open: false, id: null })
      return
    }
    const subfolders = folders.filter(f => f.parentId === folderId).length
    if (subfolders > 0) {
      setErrorModal({ open: true, message: `Cannot delete folder: it contains ${subfolders} subfolder(s). Delete the subfolders first.` })
      setDeleteFolderConfirm({ open: false, id: null })
      return
    }
    setFolders(prev => prev.filter(f => f.id !== folderId))
    if (selectedFolder === folderId) setSelectedFolder('root')
    setDeleteFolderConfirm({ open: false, id: null })
    setSuccessModal({ open: true, message: 'Folder deleted successfully!' })
  }

  // ── File CRUD ─────────────────────────────────────────────────────────────────
  const handleDeleteFile = (fileId: string) => {
    const f = files.find(x => x.id === fileId)
    if (f) {
      onAddToRecycleBin?.({
        name: f.name, module: 'Documents',
        description: `File: ${f.name} (${f.type.toUpperCase()}) – ${f.size}`,
        deletedBy: 'Current User',
        deletedAt: new Date().toISOString().split('T')[0],
      })
      if (f.fileUrl) URL.revokeObjectURL(f.fileUrl)
    }
    setFiles(prev => prev.filter(x => x.id !== fileId))
    setDeleteFileConfirm({ open: false, id: null })
    setSuccessModal({ open: true, message: 'File deleted successfully.' })
  }

  const handleDownloadFile = (file: FileItem) => {
    if (!file.fileUrl) return
    const a = document.createElement('a')
    a.href = file.fileUrl; a.download = file.name
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  const handleMoveFile = () => {
    if (!fileToMove) return
    setFiles(prev => prev.map(f => f.id === fileToMove.id ? { ...f, folderId: moveDestination } : f))
    setIsMoveModalOpen(false); setFileToMove(null)
    setSuccessModal({ open: true, message: 'File moved successfully!' })
  }

  const handleRenameFile = () => {
    if (!fileToRename || !renameFileValue.trim()) return
    setFiles(prev => prev.map(f => f.id === fileToRename.id ? { ...f, name: renameFileValue.trim() } : f))
    setIsRenameFileModalOpen(false); setFileToRename(null)
    setSuccessModal({ open: true, message: 'File renamed successfully!' })
  }

  // ── File preview ──────────────────────────────────────────────────────────────
  // useEffect triggers AFTER the modal DOM mounts, so the ref is guaranteed to exist
  useEffect(() => {
    if (!docxPreview.isOpen || !docxPreview.fileUrl) return
    const url = docxPreview.fileUrl
    const container = docxContainerRef.current
    if (!container) return
    container.innerHTML = ''
    ;(async () => {
      try {
        const blob = await (await fetch(url)).blob()
        await renderAsync(blob, container, undefined, {
          className: 'docx-wrapper', inWrapper: true, breakPages: true,
          ignoreWidth: false, ignoreHeight: false, ignoreFonts: false,
          ignoreLastRenderedPageBreak: false, experimental: true, trimXmlDeclaration: true,
        })
      } catch {
        container.innerHTML = '<p style="color:#dc2626;padding:20px;text-align:center;">Unable to preview this document. Please download it to view.</p>'
      }
    })()
  }, [docxPreview.isOpen, docxPreview.fileUrl])

  const renderExcel = async (fileUrl: string) => {
    try {
      const ab = await (await fetch(fileUrl)).arrayBuffer()
      const wb = XLSX.read(ab, { type: 'array' })
      const sheets: Record<string, string[][]> = {}
      wb.SheetNames.forEach(name => {
        sheets[name] = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[name], { header: 1 })
      })
      setExcelData({ sheetNames: wb.SheetNames, sheets })
    } catch {
      setErrorModal({ open: true, message: 'Unable to preview this Excel file. Please download it to view.' })
    }
  }

  const handleViewFile = async (file: FileItem) => {
    if (!file.fileUrl) return
    if (file.type === 'docx' || file.type === 'doc') {
      setDocxPreview({ isOpen: true, fileName: file.name, fileUrl: file.fileUrl })
    } else if (file.type === 'xls' || file.type === 'xlsx') {
      setCurrentSheetIndex(0)
      setExcelPreview({ isOpen: true, fileName: file.name })
      await renderExcel(file.fileUrl)
    } else {
      setFilePreview({ isOpen: true, fileName: file.name, fileUrl: file.fileUrl, type: file.type })
    }
  }

  // ── Filtered + sorted files ───────────────────────────────────────────────────
  const filteredFiles = files
    .filter(f => {
      const inFolder = f.folderId === selectedFolder
      const matchSearch = searchQuery === '' ||
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.category.toLowerCase().includes(searchQuery.toLowerCase())
      return inFolder && matchSearch
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name)
        case 'date': return new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime()
        case 'type': return a.type.localeCompare(b.type)
        case 'size': return sizeInBytes(b.size) - sizeInBytes(a.size)
        default: return 0
      }
    })

  // ── Folder tree ───────────────────────────────────────────────────────────────
  const renderFolderTree = (parentId: string, level = 0): React.ReactNode => {
    return getChildFolders(parentId).map(folder => {
      const hasChildren = getChildFolders(folder.id).length > 0
      const isExpanded = expandedFolders.includes(folder.id)
      const isSelected = selectedFolder === folder.id

      return (
        <div key={folder.id}>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors relative group"
            style={{
              paddingLeft: `${12 + level * 16}px`,
              backgroundColor: isSelected ? BRAND : undefined,
              color: isSelected ? 'white' : '#374151',
            }}
            onClick={() => setSelectedFolder(folder.id)}
          >
            {hasChildren ? (
              <div onClick={e => { e.stopPropagation(); toggleFolder(folder.id) }} className="p-0.5 hover:bg-white/20 rounded cursor-pointer">
                <ChevronRight size={16} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </div>
            ) : <div className="w-5" />}
            <Folder size={16} className={isSelected ? 'text-white' : 'text-gray-500'} />
            <span className="text-sm flex-1">{folder.name}</span>
            <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>{getFolderItemCount(folder.id)}</span>
            <div
              onClick={e => { e.stopPropagation(); setActiveFolderMenuId(activeFolderMenuId === folder.id ? null : folder.id) }}
              className={`p-1 rounded hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity ${activeFolderMenuId === folder.id ? 'opacity-100' : ''}`}
            >
              <MoreVertical size={14} className={isSelected ? 'text-white' : 'text-gray-600'} />
            </div>
            {activeFolderMenuId === folder.id && (
              <>
                <div className="fixed inset-0 z-10" onClick={e => { e.stopPropagation(); setActiveFolderMenuId(null) }} />
                <div className="absolute right-2 top-full mt-1 w-40 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20">
                  <button onClick={e => { e.stopPropagation(); setFolderToEdit(folder); setEditFolderName(folder.name); setIsEditFolderModalOpen(true); setActiveFolderMenuId(null) }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <Edit2 size={14} /> Rename
                  </button>
                  <div className="border-t border-gray-200 my-1" />
                  <button onClick={e => { e.stopPropagation(); setActiveFolderMenuId(null); setDeleteFolderConfirm({ open: true, id: folder.id }) }} disabled={!canManage('documents')}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
          {hasChildren && isExpanded && renderFolderTree(folder.id, level + 1)}
        </div>
      )
    })
  }

  // ── File action menu shared ───────────────────────────────────────────────────
  const FileMenu = ({ file }: { file: FileItem }) => (
    <>
      <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20">
        <button onClick={() => { handleViewFile(file); setActiveMenuId(null) }}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
          <Eye size={16} /> View
        </button>
        <button onClick={() => { handleDownloadFile(file); setActiveMenuId(null) }}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
          <Download size={16} /> Download
        </button>
        <button onClick={() => { setFileToRename(file); setRenameFileValue(file.name); setIsRenameFileModalOpen(true); setActiveMenuId(null) }} disabled={!canManage('documents')}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">
          <Edit2 size={16} /> Rename
        </button>
        <button onClick={() => { setFileToMove(file); setMoveDestination(file.folderId); setIsMoveModalOpen(true); setActiveMenuId(null) }} disabled={!canManage('documents')}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">
          <Move size={16} /> Move
        </button>
        <div className="border-t border-gray-200 my-1" />
        <button onClick={() => { setDeleteFileConfirm({ open: true, id: file.id }); setActiveMenuId(null) }} disabled={!canManage('documents')}
          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">
          <Trash2 size={16} /> Delete
        </button>
      </div>
    </>
  )

  // ── Modal helper ──────────────────────────────────────────────────────────────
  const ModalShell = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} className="text-gray-500" /></button>
        </div>
        {children}
      </div>
    </div>
  )

  const inpCls = `w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400`
  const inpStyle = { '--tw-ring-color': BRAND } as React.CSSProperties

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .docx-preview-container .docx-wrapper { background: #d1d5db; padding: 24px; display: flex; flex-direction: column; align-items: center; }
        .docx-preview-container section.docx { box-shadow: 0 2px 8px rgba(0,0,0,.2); margin-bottom: 20px; }
      `}</style>

      {/* Confirm modals */}
      <ConfirmModal
        isOpen={deleteFileConfirm.open} type="confirm"
        title="Delete File" message="Move this file to Recycle Bin? This cannot be undone."
        confirmText="Delete" cancelText="Cancel"
        onConfirm={() => deleteFileConfirm.id && handleDeleteFile(deleteFileConfirm.id)}
        onCancel={() => setDeleteFileConfirm({ open: false, id: null })}
      />
      <ConfirmModal
        isOpen={deleteFolderConfirm.open} type="confirm"
        title="Delete Folder" message="Are you sure you want to delete this folder?"
        confirmText="Delete" cancelText="Cancel"
        onConfirm={() => deleteFolderConfirm.id && handleDeleteFolder(deleteFolderConfirm.id)}
        onCancel={() => setDeleteFolderConfirm({ open: false, id: null })}
      />
      <ConfirmModal
        isOpen={successModal.open} type="success"
        title="Success" message={successModal.message} confirmText="OK"
        onConfirm={() => setSuccessModal({ open: false, message: '' })}
        onCancel={() => setSuccessModal({ open: false, message: '' })}
      />
      <ConfirmModal
        isOpen={errorModal.open} type="confirm"
        title="Cannot Complete" message={errorModal.message} confirmText="OK"
        onConfirm={() => setErrorModal({ open: false, message: '' })}
        onCancel={() => setErrorModal({ open: false, message: '' })}
      />

      {/* New Folder Modal */}
      {isNewFolderModalOpen && (
        <ModalShell title="Create New Folder" onClose={() => { setIsNewFolderModalOpen(false); setNewFolderName('') }}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Folder Name <span className="text-red-500">*</span></label>
              <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                className={inpCls} style={inpStyle} placeholder="Enter folder name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Parent Folder</label>
              <select value={newFolderParent} onChange={e => setNewFolderParent(e.target.value)}
                className={`${inpCls} bg-white`} style={inpStyle}>
                <option value="root">Documents (Root)</option>
                {folders.filter(f => f.id !== 'root').map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>
          <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
            <button onClick={() => { setIsNewFolderModalOpen(false); setNewFolderName('') }}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
            <button onClick={handleCreateFolder} disabled={!canManage('documents')}
              className="px-6 py-2.5 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: BRAND }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = BRAND_DARK)} onMouseLeave={e => (e.currentTarget.style.backgroundColor = BRAND)}>
              Create Folder
            </button>
          </div>
        </ModalShell>
      )}

      {/* Edit Folder Modal */}
      {isEditFolderModalOpen && folderToEdit && (
        <ModalShell title="Rename Folder" onClose={() => { setIsEditFolderModalOpen(false); setFolderToEdit(null) }}>
          <div className="p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Folder Name <span className="text-red-500">*</span></label>
            <input autoFocus value={editFolderName} onChange={e => setEditFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEditFolder()}
              className={inpCls} style={inpStyle} placeholder="Enter folder name" />
          </div>
          <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
            <button onClick={() => { setIsEditFolderModalOpen(false); setFolderToEdit(null) }}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
            <button onClick={handleEditFolder}
              className="px-6 py-2.5 text-white rounded-lg text-sm"
              style={{ backgroundColor: BRAND }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = BRAND_DARK)} onMouseLeave={e => (e.currentTarget.style.backgroundColor = BRAND)}>
              Rename
            </button>
          </div>
        </ModalShell>
      )}

      {/* Move File Modal */}
      {isMoveModalOpen && fileToMove && (
        <ModalShell title="Move File" onClose={() => { setIsMoveModalOpen(false); setFileToMove(null) }}>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              {getFileIcon(fileToMove.type, 32)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{fileToMove.name}</p>
                <p className="text-xs text-gray-500">{fileToMove.size}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Move to Folder <span className="text-red-500">*</span></label>
              <select value={moveDestination} onChange={e => setMoveDestination(e.target.value)}
                className={`${inpCls} bg-white`} style={inpStyle}>
                <option value="root">Documents (Root)</option>
                {folders.filter(f => f.id !== 'root').map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>
          <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
            <button onClick={() => { setIsMoveModalOpen(false); setFileToMove(null) }}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
            <button onClick={handleMoveFile} disabled={!canManage('documents')}
              className="px-6 py-2.5 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: BRAND }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = BRAND_DARK)} onMouseLeave={e => (e.currentTarget.style.backgroundColor = BRAND)}>
              Move File
            </button>
          </div>
        </ModalShell>
      )}

      {/* Rename File Modal */}
      {isRenameFileModalOpen && fileToRename && (
        <ModalShell title="Rename File" onClose={() => { setIsRenameFileModalOpen(false); setFileToRename(null) }}>
          <div className="p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">File Name <span className="text-red-500">*</span></label>
            <input autoFocus value={renameFileValue} onChange={e => setRenameFileValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRenameFile()}
              className={inpCls} style={inpStyle} />
          </div>
          <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
            <button onClick={() => { setIsRenameFileModalOpen(false); setFileToRename(null) }}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
            <button onClick={handleRenameFile} disabled={!canManage('documents')}
              className="px-6 py-2.5 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: BRAND }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = BRAND_DARK)} onMouseLeave={e => (e.currentTarget.style.backgroundColor = BRAND)}>
              Rename
            </button>
          </div>
        </ModalShell>
      )}

      {/* Image / Generic File Preview Modal */}
      {filePreview.isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header bar */}
            <div className="flex items-center justify-between bg-white rounded-t-xl px-6 py-4 flex-shrink-0">
              <p className="text-gray-800 font-semibold text-base truncate pr-4">{filePreview.fileName}</p>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleDownloadFile({ fileUrl: filePreview.fileUrl, name: filePreview.fileName } as FileItem)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                >
                  <Download size={16} /> Download
                </button>
                <button
                  onClick={() => setFilePreview({ isOpen: false, fileName: '', fileUrl: '', type: '' })}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-auto bg-gray-900 rounded-b-xl flex items-center justify-center p-4">
              {filePreview.type === 'pdf' ? (
                <embed src={filePreview.fileUrl} type="application/pdf" className="w-full rounded bg-white" style={{ height: '75vh' }} />
              ) : (filePreview.type === 'jpg' || filePreview.type === 'png' || filePreview.type === 'other') ? (
                <img src={filePreview.fileUrl} alt={filePreview.fileName} className="max-w-full max-h-[70vh] object-contain rounded shadow-lg" />
              ) : (
                <div className="text-center text-white">
                  <File size={48} className="mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-300 mb-4">Preview not available for this file type.</p>
                  <button onClick={() => handleDownloadFile({ fileUrl: filePreview.fileUrl, name: filePreview.fileName } as FileItem)}
                    className="px-6 py-2.5 text-white rounded-lg text-sm" style={{ backgroundColor: BRAND }}>
                    Download File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DOCX Preview Modal */}
      {docxPreview.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div>
                <p className="text-lg font-semibold text-gray-800">{docxPreview.fileName}</p>
                <p className="text-sm text-gray-500 mt-0.5">Document Preview</p>
              </div>
              <button onClick={() => setDocxPreview({ isOpen: false, fileName: '', fileUrl: '' })} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} className="text-gray-500" /></button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100 p-6">
              <div ref={docxContainerRef} className="docx-preview-container" />
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end flex-shrink-0">
              <button onClick={() => setDocxPreview({ isOpen: false, fileName: '', fileUrl: '' })} className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Preview Modal */}
      {excelPreview.isOpen && excelData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div>
                <p className="text-lg font-semibold text-gray-800">{excelPreview.fileName}</p>
                <p className="text-sm text-gray-500 mt-0.5">Spreadsheet Preview</p>
              </div>
              <button onClick={() => { setExcelPreview({ isOpen: false, fileName: '' }); setExcelData(null); setCurrentSheetIndex(0) }} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} className="text-gray-500" /></button>
            </div>
            {excelData.sheetNames.length > 1 && (
              <div className="px-6 py-3 border-b border-gray-200 flex gap-2 overflow-x-auto flex-shrink-0">
                {excelData.sheetNames.map((name, i) => (
                  <button key={i} onClick={() => setCurrentSheetIndex(i)}
                    className="px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors"
                    style={currentSheetIndex === i ? { backgroundColor: BRAND, color: 'white' } : { backgroundColor: '#f3f4f6', color: '#374151' }}>
                    {name}
                  </button>
                ))}
              </div>
            )}
            <div className="flex-1 overflow-auto bg-gray-100 p-6">
              <div className="bg-white shadow-lg overflow-auto">
                <table className="border-collapse w-full text-sm">
                  <tbody>
                    {(excelData.sheets[excelData.sheetNames[currentSheetIndex]] ?? []).map((row, ri) => (
                      <tr key={ri} className={ri === 0 ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'}>
                        {(row as string[]).map((cell, ci) => (
                          <td key={ci} className="px-3 py-2 border border-gray-200 whitespace-nowrap min-w-[80px]">
                            {cell ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end flex-shrink-0">
              <button onClick={() => { setExcelPreview({ isOpen: false, fileName: '' }); setExcelData(null); setCurrentSheetIndex(0) }} className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main layout ─────────────────────────────────────────────────────────── */}
      <div className="h-full flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft size={24} className="text-gray-700" />
            </button>
            <p className="text-gray-900 font-bold" style={{ fontSize: 'var(--text-xl)' }}>Documents</p>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0">
            <div className="p-4">
              <p className="text-base font-bold text-gray-700 uppercase tracking-wide mb-3">Folders</p>
              {renderFolderTree('root')}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Action bar */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <input type="file" id="doc-upload" onChange={handleFileSelect} disabled={!canManage('documents')} className="hidden" />
                <label htmlFor={canManage('documents') ? 'doc-upload' : undefined}
                  className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors text-sm ${canManage('documents') ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed pointer-events-none'}`}
                  style={{ backgroundColor: BRAND }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = BRAND_DARK)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = BRAND)}>
                  <Upload size={18} /> Upload
                </label>
                <button onClick={() => { setNewFolderName(''); setNewFolderParent(selectedFolder); setIsNewFolderModalOpen(true) }} disabled={!canManage('documents')}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">
                  <FolderPlus size={18} /> New Folder
                </button>
                <div className="flex-1 relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search documents..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 placeholder:text-gray-400"
                    style={inpStyle} />
                </div>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 bg-white"
                  style={inpStyle}>
                  <option value="date">Sort by Date</option>
                  <option value="name">Sort by Name</option>
                  <option value="type">Sort by Type</option>
                  <option value="size">Sort by Size</option>
                </select>
                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  <button onClick={() => setViewMode('grid')} className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>
                    <Grid3x3 size={18} className="text-gray-700" />
                  </button>
                  <button onClick={() => setViewMode('list')} className={`p-2 border-l border-gray-300 transition-colors ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>
                    <List size={18} className="text-gray-700" />
                  </button>
                </div>
              </div>
            </div>

            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
              <div className="flex items-center gap-2 font-bold" style={{ fontSize: '16px' }}>
                {getBreadcrumb().map((folder, i) => (
                  <div key={folder.id} className="flex items-center gap-2">
                    {i > 0 && <ChevronRight size={16} className="text-gray-400" />}
                    <button onClick={() => setSelectedFolder(folder.id)}
                      className="text-gray-600 transition-colors hover:text-[#0077BE]">
                      {folder.name}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* File area */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Folder size={64} className="text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg mb-2">No documents in this folder</p>
                  <p className="text-gray-400 text-sm">Upload files to get started</p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredFiles.map(file => (
                    <div key={file.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all group relative"
                      style={{ borderColor: undefined }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = BRAND)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = '')}>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity relative">
                        <button onClick={e => { e.stopPropagation(); setActiveMenuId(activeMenuId === file.id ? null : file.id) }}
                          className="p-1.5 bg-white rounded-lg shadow-md hover:bg-gray-50">
                          <MoreVertical size={16} className="text-gray-700" />
                        </button>
                        {activeMenuId === file.id && <FileMenu file={file} />}
                      </div>
                      <div className="flex flex-col items-center text-center">
                        <div className="mb-3">{getFileIcon(file.type)}</div>
                        <p className="text-sm font-medium text-gray-800 mb-1 line-clamp-2 w-full">{file.name}</p>
                        <p className="text-xs text-gray-500">{file.uploadedDate}</p>
                        <p className="text-xs text-gray-500">{file.size}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200">
                  {filteredFiles.map((file, i) => (
                    <div key={file.id} className={`flex items-center gap-4 p-4 hover:bg-gray-50 group ${i !== filteredFiles.length - 1 ? 'border-b border-gray-200' : ''}`}>
                      <div className="flex-shrink-0">{getFileIcon(file.type, 32)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{file.uploadedDate} · {file.size} · {file.uploadedBy}</p>
                      </div>
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity relative">
                        <button onClick={e => { e.stopPropagation(); setActiveMenuId(activeMenuId === file.id ? null : file.id) }}
                          className="p-2 hover:bg-gray-200 rounded-lg">
                          <MoreVertical size={18} className="text-gray-700" />
                        </button>
                        {activeMenuId === file.id && <FileMenu file={file} />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
