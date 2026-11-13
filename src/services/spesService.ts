import axiosClient from './axiosClient'
import { postImportWithDuplicateCheck } from './duplicateService'
import { ENDPOINTS } from '../config/api'

export function listBatches() {
  return axiosClient.get(ENDPOINTS.spes.listBatches).then(r => r.data)
}

export function createBatch(data: Record<string, unknown>) {
  return axiosClient.post(ENDPOINTS.spes.createBatch, data).then(r => r.data)
}

export function updateBatch(id: number, data: Record<string, unknown>) {
  return axiosClient.put(`${ENDPOINTS.spes.updateBatch}/${id}`, data).then(r => r.data)
}

export function deleteBatch(id: number) {
  return axiosClient.delete(`${ENDPOINTS.spes.deleteBatch}/${id}`).then(r => r.data)
}

export function updateBatchStatus(id: number, status: string) {
  return axiosClient.patch(`${ENDPOINTS.spes.updateBatchStatus}/${id}`, { status }).then(r => r.data)
}

export function listProfiles() {
  return axiosClient.get(ENDPOINTS.spes.listProfiles).then(r => r.data)
}

// Pass `submissionId` when approving a kiosk submission from the Pending inbox: the backend then marks that
// submission Approved in the same transaction as the save.
export function createProfile(data: Record<string, unknown>, submissionId?: number) {
  return axiosClient.post(ENDPOINTS.spes.createProfile, submissionId !== undefined ? { ...data, submissionId } : data).then(r => r.data)
}

// One saved profile (same shape as a list item), e.g. to show an approved kiosk submission as it is in the records.
export function getProfile(id: number) {
  return axiosClient.get(`${ENDPOINTS.spes.getProfile}/${id}`).then(r => r.data.data)
}

// All-or-nothing batch create: the backend validates every row and writes
// the whole batch in one DB transaction; if any row fails, nothing is saved.
export function importProfilesBulk(rows: Record<string, unknown>[]): Promise<{ ids: number[]; skipped: number }> {
  return postImportWithDuplicateCheck(ENDPOINTS.spes.importProfilesBulk, rows)
}

export function updateProfile(id: number, data: Record<string, unknown>) {
  return axiosClient.put(`${ENDPOINTS.spes.updateProfile}/${id}`, data).then(r => r.data)
}

export function deleteProfile(id: number) {
  return axiosClient.delete(`${ENDPOINTS.spes.deleteProfile}/${id}`).then(r => r.data)
}

export function assignBatch(applicantId: number, batchId: number) {
  return axiosClient.post(ENDPOINTS.spes.assignBatch, { applicantId, batchId }).then(r => r.data)
}

export function unassignBatch(applicantId: number) {
  return axiosClient.post(ENDPOINTS.spes.unassignBatch, { applicantId }).then(r => r.data)
}

// Records that an applicant left an already-started (Ongoing) batch early.
export function withdrawFromBatch(applicantId: number, reason: string, exitDate: string) {
  return axiosClient.post(ENDPOINTS.spes.withdrawFromBatch, { applicantId, reason, exitDate }).then(r => r.data)
}
