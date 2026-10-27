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

// Overwrites the live database (and uploads/, if bundled) with this backup's
// contents -- a safety snapshot is taken first, but this is still destructive.
export function restoreBackup(name: string) {
  return axiosClient
    .post<{ status: string; message: string; data: { uploadsRestored: boolean; safetyBackup: string } }>(
      `${ENDPOINTS.backup.restoreBackup}/${encodeURIComponent(name)}`
    )
    .then(r => r.data)
}

// For when the on-server copy is gone and the admin has only an external .zip --
// uploads it, saves it into backups/, then restores it like restoreBackup() does.
export function restoreUpload(file: File) {
  const form = new FormData()
  form.append('backupFile', file)
  // Overrides axiosClient's default JSON Content-Type so the browser sets its own
  // multipart boundary header -- without this, PHP's $_FILES ends up empty.
  return axiosClient
    .post<{ status: string; message: string; data: { uploadsRestored: boolean; safetyBackup: string } }>(
      ENDPOINTS.backup.restoreUpload,
      form,
      { headers: { 'Content-Type': undefined } }
    )
    .then(r => r.data)
}

export interface RestoreProgress {
  step: number
  total: number
  label: string
  done: boolean
  error: string | null
}

// Polled while a restore is in flight, since that request is a single blocking
// call with no progress stream -- the backend writes its step to a file; this reads it.
export function getRestoreProgress() {
  return axiosClient.get<{ status: string; data: RestoreProgress }>(ENDPOINTS.backup.restoreProgress).then(r => r.data.data)
}

// Downloads via a blob: URL (same technique as Documents Tab's download fix),
// since the file is served from a different origin than the Vite dev server.
export async function downloadBackup(name: string): Promise<void> {
  const res = await axiosClient.get(`${ENDPOINTS.backup.downloadBackup}/${encodeURIComponent(name)}`, { responseType: 'blob' })
  const blobUrl = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = blobUrl; a.download = name
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(blobUrl)
}
