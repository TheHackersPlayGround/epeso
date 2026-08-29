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

// Overwrites the live database (and uploads/, if the backup has them bundled)
// with this backup's contents. A safety snapshot is taken automatically on
// the backend first, but this itself is still destructive to everything
// created/changed since the chosen backup.
export function restoreBackup(name: string) {
  return axiosClient
    .post<{ status: string; message: string; data: { uploadsRestored: boolean; safetyBackup: string } }>(
      `${ENDPOINTS.backup.restoreBackup}/${encodeURIComponent(name)}`
    )
    .then(r => r.data)
}

// For when the on-server copy was deleted and the admin only has a .sql/.zip
// saved externally (USB drive, cloud folder, etc.) -- uploads it, saves it
// into the server's backups/ folder under a fresh name, then restores from
// it the same way restoreBackup() does (including the automatic pre-restore
// safety snapshot).
export function restoreUpload(file: File) {
  const form = new FormData()
  form.append('backupFile', file)
  // axiosClient sets a blanket 'Content-Type: application/json' default on
  // every request -- overriding it to undefined here lets the browser set
  // its own multipart header (with the required boundary=... parameter) for
  // this one call instead. Without this, PHP's $_FILES ends up empty.
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

// Polled on an interval while a restore request is in flight, since that
// request itself is a single blocking call with no way to stream progress
// back mid-request. The backend writes its current step to a file as it
// goes; this just reads it.
export function getRestoreProgress() {
  return axiosClient.get<{ status: string; data: RestoreProgress }>(ENDPOINTS.backup.restoreProgress).then(r => r.data.data)
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
