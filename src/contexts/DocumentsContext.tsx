import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export interface FileItem {
  id: string
  name: string
  type: 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'jpg' | 'png' | 'other'
  size: string
  uploadedBy: string
  uploadedDate: string
  category: string
  folderId: string
  fileUrl?: string
}

export interface FolderItem {
  id: string
  name: string
  parentId: string | null
}

interface DocumentsContextValue {
  folders: FolderItem[]
  setFolders: React.Dispatch<React.SetStateAction<FolderItem[]>>
  files: FileItem[]
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>
}

const DocumentsContext = createContext<DocumentsContextValue | null>(null)

const SEED_FOLDERS: FolderItem[] = [
  { id: 'root', name: 'Documents', parentId: null },
]

export function DocumentsProvider({ children }: { children: ReactNode }) {
  const [folders, setFolders] = useState<FolderItem[]>(SEED_FOLDERS)
  const [files, setFiles] = useState<FileItem[]>([])

  return (
    <DocumentsContext.Provider value={{ folders, setFolders, files, setFiles }}>
      {children}
    </DocumentsContext.Provider>
  )
}

export function useDocuments() {
  const ctx = useContext(DocumentsContext)
  if (!ctx) throw new Error('useDocuments must be used inside DocumentsProvider')
  return ctx
}
