import axiosClient from './axiosClient'
import { postImportWithDuplicateCheck } from './duplicateService'
import { ENDPOINTS } from '../config/api'

export function listCdspServices() {
  return axiosClient.get(ENDPOINTS.cdsp.listServices).then(r => r.data)
}

export function listActivities() {
  return axiosClient.get(ENDPOINTS.cdsp.listActivities).then(r => r.data)
}

export function createActivity(data: Record<string, unknown>) {
  return axiosClient.post(ENDPOINTS.cdsp.createActivity, data).then(r => r.data)
}

export function updateActivity(id: number, data: Record<string, unknown>) {
  return axiosClient.put(`${ENDPOINTS.cdsp.updateActivity}/${id}`, data).then(r => r.data)
}

export function updateActivityStatus(id: number, status: string) {
  return axiosClient.patch(`${ENDPOINTS.cdsp.updateActivityStatus}/${id}`, { status }).then(r => r.data)
}

export function deleteActivity(id: number) {
  return axiosClient.delete(`${ENDPOINTS.cdsp.deleteActivity}/${id}`).then(r => r.data)
}

export function listActivityParticipants(activityId: number) {
  return axiosClient.get(`${ENDPOINTS.cdsp.listActivityParticipants}/${activityId}`).then(r => r.data)
}

export function addParticipant(data: { activityId: number; beneficiaryServiceId: number }) {
  return axiosClient.post(ENDPOINTS.cdsp.addParticipant, data).then(r => r.data)
}

export function removeParticipant(data: { activityId: number; beneficiaryServiceId: number }) {
  return axiosClient.post(ENDPOINTS.cdsp.removeParticipant, data).then(r => r.data)
}

export function updateAttendance(data: { activityId: number; beneficiaryServiceId: number; attended: boolean }) {
  return axiosClient.post(ENDPOINTS.cdsp.updateAttendance, data).then(r => r.data)
}

export function listProfiles() {
  return axiosClient.get(ENDPOINTS.cdsp.listProfiles).then(r => r.data)
}

// Pass `submissionId` when approving a kiosk submission from the Pending inbox: the backend then marks that
// submission Approved in the same transaction as the save.
export function createProfile(data: Record<string, unknown>, submissionId?: number) {
  return axiosClient.post(ENDPOINTS.cdsp.createProfile, submissionId !== undefined ? { ...data, submissionId } : data).then(r => r.data)
}

// One saved profile (same shape as a list item), e.g. to show an approved kiosk submission as it is in the records.
export function getProfile(id: number) {
  return axiosClient.get(`${ENDPOINTS.cdsp.getProfile}/${id}`).then(r => r.data.data)
}

// All-or-nothing batch create: the backend validates every row and writes
// the whole batch in one DB transaction; if any row fails, nothing is saved.
export function importProfilesBulk(rows: Record<string, unknown>[]): Promise<{ ids: number[]; skipped: number }> {
  return postImportWithDuplicateCheck(ENDPOINTS.cdsp.importProfilesBulk, rows)
}

export function updateProfile(id: number, data: Record<string, unknown>) {
  return axiosClient.put(`${ENDPOINTS.cdsp.updateProfile}/${id}`, data).then(r => r.data)
}

export function deleteProfile(id: number) {
  return axiosClient.delete(`${ENDPOINTS.cdsp.deleteProfile}/${id}`).then(r => r.data)
}
