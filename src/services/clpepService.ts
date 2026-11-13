import axiosClient from './axiosClient'
import { postImportWithDuplicateCheck } from './duplicateService'
import { ENDPOINTS } from '../config/api'

export function listInterventions() {
  return axiosClient.get(ENDPOINTS.clpep.listInterventions).then(r => r.data)
}

export function createIntervention(data: Record<string, unknown>) {
  return axiosClient.post(ENDPOINTS.clpep.createIntervention, data).then(r => r.data)
}

export function updateIntervention(id: number, data: Record<string, unknown>) {
  return axiosClient.put(`${ENDPOINTS.clpep.updateIntervention}/${id}`, data).then(r => r.data)
}

export function deleteIntervention(id: number) {
  return axiosClient.delete(`${ENDPOINTS.clpep.deleteIntervention}/${id}`).then(r => r.data)
}

export function updateInterventionStatus(id: number, status: string) {
  return axiosClient.patch(`${ENDPOINTS.clpep.updateInterventionStatus}/${id}`, { status }).then(r => r.data)
}

export function listProfiles() {
  return axiosClient.get(ENDPOINTS.clpep.listProfiles).then(r => r.data)
}

// Pass `submissionId` when approving a kiosk submission from the Pending inbox: the backend then marks that
// submission Approved in the same transaction as the save.
export function createProfile(data: Record<string, unknown>, submissionId?: number) {
  return axiosClient.post(ENDPOINTS.clpep.createProfile, submissionId !== undefined ? { ...data, submissionId } : data).then(r => r.data)
}

// One saved profile (same shape as a list item), e.g. to show an approved kiosk submission as it is in the records.
export function getProfile(id: number) {
  return axiosClient.get(`${ENDPOINTS.clpep.getProfile}/${id}`).then(r => r.data.data)
}

// All-or-nothing batch create: the backend validates every row and writes
// the whole batch in one DB transaction; if any row fails, nothing is saved.
export function importProfilesBulk(rows: Record<string, unknown>[]): Promise<{ ids: number[]; skipped: number }> {
  return postImportWithDuplicateCheck(ENDPOINTS.clpep.importProfilesBulk, rows)
}

export function updateProfile(id: number, data: Record<string, unknown>) {
  return axiosClient.put(`${ENDPOINTS.clpep.updateProfile}/${id}`, data).then(r => r.data)
}

export function deleteProfile(id: number) {
  return axiosClient.delete(`${ENDPOINTS.clpep.deleteProfile}/${id}`).then(r => r.data)
}

export function assignIntervention(applicantId: number, interventionId: number) {
  return axiosClient.post(ENDPOINTS.clpep.assignIntervention, { applicantId, interventionId }).then(r => r.data)
}

export function unassignIntervention(applicantId: number) {
  return axiosClient.post(ENDPOINTS.clpep.unassignIntervention, { applicantId }).then(r => r.data)
}
