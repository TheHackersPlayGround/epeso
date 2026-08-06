import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import * as documentsService from '../services/documentsService'

export interface FileItem {
  id: string
  name: string
  type: 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'ppt' | 'pptx' | 'jpg' | 'jpeg' | 'png' | 'gif' | 'webp' | 'bmp' | 'svg' | 'txt' | 'other'
  size: string
  uploadedBy: string
  uploadedDate: string
  category: string
  folderId: string
  fileUrl?: string
}

// Extensions the preview modal can actually render via <img> — kept in one
// place so DocumentsView's preview routing and this list can't drift apart.
export const IMAGE_TYPES: FileItem['type'][] = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']

export interface FolderItem {
  id: string
  name: string
  parentId: string | null
}

interface DocumentsContextValue {
  folders: FolderItem[]
  files: FileItem[]
  loading: boolean
  refreshFolders: () => Promise<void>
  refreshDocuments: () => Promise<void>
}

const DocumentsContext = createContext<DocumentsContextValue | null>(null)

// 'root' is a virtual folder — it never exists as a row in the backend, it's
// just the tree's entry point that real top-level folders (parentId: 'root')
// attach to.
const ROOT_FOLDER: FolderItem = { id: 'root', name: 'Documents', parentId: null }

function inferFileType(name: string): FileItem['type'] {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const known = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', ...IMAGE_TYPES]
  return (known.includes(ext) ? ext : 'other') as FileItem['type']
}

export function DocumentsProvider({ children }: { children: ReactNode }) {
  const [folders, setFolders] = useState<FolderItem[]>([ROOT_FOLDER])
  const [files, setFiles]     = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)

  const refreshFolders = useCallback(async () => {
    try {
      const res = await documentsService.listFolders()
      setFolders([ROOT_FOLDER, ...(res.data ?? [])])
    } catch {
      // silent — show empty list rather than crashing
    }
  }, [])

  const refreshDocuments = useCallback(async () => {
    try {
      const res = await documentsService.listDocuments()
      const data: FileItem[] = (res.data ?? []).map((d: any) => ({ ...d, type: inferFileType(d.name) }))
      setFiles(data)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([refreshFolders(), refreshDocuments()]).finally(() => setLoading(false))
  }, [refreshFolders, refreshDocuments])

  return (
    <DocumentsContext.Provider value={{ folders, files, loading, refreshFolders, refreshDocuments }}>
      {children}
    </DocumentsContext.Provider>
  )
}

export function useDocuments() {
  const ctx = useContext(DocumentsContext)
  if (!ctx) throw new Error('useDocuments must be used inside DocumentsProvider')
  return ctx
}
