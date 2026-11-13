import axiosClient from './axiosClient'
import { postImportWithDuplicateCheck } from './duplicateService'
import { ENDPOINTS } from '../config/api'

export function listWorkplaces() {
  return axiosClient.get(ENDPOINTS.gip.listWorkplaces).then(r => r.data)
}

export function createWorkplace(data: Record<string, unknown>) {
  return axiosClient.post(ENDPOINTS.gip.createWorkplace, data).then(r => r.data)
}

export function updateWorkplace(id: number, data: Record<string, unknown>) {
  return axiosClient.put(`${ENDPOINTS.gip.updateWorkplace}/${id}`, data).then(r => r.data)
}

export function deleteWorkplace(id: number) {
  return axiosClient.delete(`${ENDPOINTS.gip.deleteWorkplace}/${id}`).then(r => r.data)
}

export function listProfiles() {
  return axiosClient.get(ENDPOINTS.gip.listProfiles).then(r => r.data)
}

// Pass `submissionId` when approving a kiosk submission from the Pending inbox: the backend then marks that
// submission Approved in the same transaction as the save.
export function createProfile(data: Record<string, unknown>, submissionId?: number) {
  return axiosClient.post(ENDPOINTS.gip.createProfile, submissionId !== undefined ? { ...data, submissionId } : data).then(r => r.data)
}

// One saved profile (same shape as a list item), e.g. to show an approved kiosk submission as it is in the records.
export function getProfile(id: number) {
  return axiosClient.get(`${ENDPOINTS.gip.getProfile}/${id}`).then(r => r.data.data)
}

// All-or-nothing batch create: the backend validates every row and writes
// the whole batch in one DB transaction; if any row fails, nothing is saved.
export function importProfilesBulk(rows: Record<string, unknown>[]): Promise<{ ids: number[]; skipped: number }> {
  return postImportWithDuplicateCheck(ENDPOINTS.gip.importProfilesBulk, rows)
}

export function updateProfile(id: number, data: Record<string, unknown>) {
  return axiosClient.put(`${ENDPOINTS.gip.updateProfile}/${id}`, data).then(r => r.data)
}

export function deleteProfile(id: number) {
  return axiosClient.delete(`${ENDPOINTS.gip.deleteProfile}/${id}`).then(r => r.data)
}

export function assignWorkplace(applicantId: number, workplaceId: number) {
  return axiosClient.post(ENDPOINTS.gip.assignWorkplace, { applicantId, workplaceId }).then(r => r.data)
}

export function unassignWorkplace(applicantId: number) {
  return axiosClient.post(ENDPOINTS.gip.unassignWorkplace, { applicantId }).then(r => r.data)
}

// Completing is final -- a GIP applicant only ever goes through the program
// once, so there's deliberately no reopenAssignment() counterpart.
export function completeAssignment(applicantId: number) {
  return axiosClient.post(ENDPOINTS.gip.completeAssignment, { applicantId }).then(r => r.data)
}

// Records that an applicant left their workplace/office internship early.
export function withdrawFromWorkplace(applicantId: number, reason: string, exitDate: string) {
  return axiosClient.post(ENDPOINTS.gip.withdrawFromWorkplace, { applicantId, reason, exitDate }).then(r => r.data)
}
