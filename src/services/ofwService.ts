import axiosClient from './axiosClient'
import { ENDPOINTS } from '../config/api'

export function listRequestTypes() {
  return axiosClient.get(ENDPOINTS.ofw.listRequestTypes).then(r => r.data)
}

export function listProfiles() {
  return axiosClient.get(ENDPOINTS.ofw.listProfiles).then(r => r.data)
}

// Pass `submissionId` when approving a kiosk submission from the Pending inbox: the backend then marks that
// submission Approved in the same transaction as the save.
export function createProfile(data: Record<string, unknown>, submissionId?: number) {
  return axiosClient.post(ENDPOINTS.ofw.createProfile, submissionId !== undefined ? { ...data, submissionId } : data).then(r => r.data)
}

// One saved profile (same shape as a list item), e.g. to show an approved kiosk submission as it is in the records.
export function getProfile(id: number) {
  return axiosClient.get(`${ENDPOINTS.ofw.getProfile}/${id}`).then(r => r.data.data)
}

export function updateProfile(id: number, data: Record<string, unknown>) {
  return axiosClient.put(`${ENDPOINTS.ofw.updateProfile}/${id}`, data).then(r => r.data)
}

export function updateStatus(id: number, status: string) {
  return axiosClient.patch(`${ENDPOINTS.ofw.updateStatus}/${id}`, { status }).then(r => r.data)
}

export function deleteProfile(id: number) {
  return axiosClient.delete(`${ENDPOINTS.ofw.deleteProfile}/${id}`).then(r => r.data)
}
