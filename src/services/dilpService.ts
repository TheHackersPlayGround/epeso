import axiosClient from './axiosClient'
import { postImportWithDuplicateCheck } from './duplicateService'
import { ENDPOINTS } from '../config/api'

export function listProjects() {
  return axiosClient.get(ENDPOINTS.dilp.listProjects).then(r => r.data)
}

export function createProject(data: Record<string, unknown>) {
  return axiosClient.post(ENDPOINTS.dilp.createProject, data).then(r => r.data)
}

export function updateProject(id: number, data: Record<string, unknown>) {
  return axiosClient.put(`${ENDPOINTS.dilp.updateProject}/${id}`, data).then(r => r.data)
}

export function deleteProject(id: number) {
  return axiosClient.delete(`${ENDPOINTS.dilp.deleteProject}/${id}`).then(r => r.data)
}

export function updateProjectStatus(id: number, status: string) {
  return axiosClient.patch(`${ENDPOINTS.dilp.updateProjectStatus}/${id}`, { status }).then(r => r.data)
}

export function listProfiles() {
  return axiosClient.get(ENDPOINTS.dilp.listProfiles).then(r => r.data)
}

// Pass `submissionId` when approving a kiosk submission from the Pending inbox: the backend then marks that
// submission Approved in the same transaction as the save.
export function createProfile(data: Record<string, unknown>, submissionId?: number) {
  return axiosClient.post(ENDPOINTS.dilp.createProfile, submissionId !== undefined ? { ...data, submissionId } : data).then(r => r.data)
}

// One saved profile (same shape as a list item), e.g. to show an approved kiosk submission as it is in the records.
export function getProfile(id: number) {
  return axiosClient.get(`${ENDPOINTS.dilp.getProfile}/${id}`).then(r => r.data.data)
}

// All-or-nothing batch create: the backend validates every row and writes
// the whole batch in one DB transaction; if any row fails, nothing is saved.
export function importProfilesBulk(rows: Record<string, unknown>[]): Promise<{ ids: number[]; skipped: number }> {
  return postImportWithDuplicateCheck(ENDPOINTS.dilp.importProfilesBulk, rows)
}

export function updateProfile(id: number, data: Record<string, unknown>) {
  return axiosClient.put(`${ENDPOINTS.dilp.updateProfile}/${id}`, data).then(r => r.data)
}

export function deleteProfile(id: number) {
  return axiosClient.delete(`${ENDPOINTS.dilp.deleteProfile}/${id}`).then(r => r.data)
}

export function assignProject(applicantId: number, projectId: number) {
  return axiosClient.post(ENDPOINTS.dilp.assignProject, { applicantId, projectId }).then(r => r.data)
}

export function unassignProject(applicantId: number) {
  return axiosClient.post(ENDPOINTS.dilp.unassignProject, { applicantId }).then(r => r.data)
}
