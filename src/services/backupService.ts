import axiosClient from './axiosClient'
import { ENDPOINTS } from '../config/api'

export interface BackupFile {
  name: string
  size: string
  createdAt: string
}

export function listBackups() {
  return axiosClient.get<{ status: string; data: BackupFile[] }>(ENDPOINTS.backup.listBackups).then(r => r.data)
}

export function createBackup() {
  return axiosClient.post<{ status: string; message: string; data: { name: string; size: string } }>(ENDPOINTS.backup.createBackup).then(r => r.data)
}

export function deleteBackup(name: string) {
  return axiosClient.delete(`${ENDPOINTS.backup.deleteBackup}/${encodeURIComponent(name)}`).then(r => r.data)
}

// Downloads the backup file as a real browser save (not a tab navigation) —
// same blob: URL technique used by Documents Tab's download fix, since the
// file is served from a different origin than the Vite dev server.
export async function downloadBackup(name: string): Promise<void> {
  const res = await axiosClient.get(`${ENDPOINTS.backup.downloadBackup}/${encodeURIComponent(name)}`, { responseType: 'blob' })
  const blobUrl = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = blobUrl; a.download = name
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(blobUrl)
}
