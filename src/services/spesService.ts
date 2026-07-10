import axiosClient from './axiosClient'
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

export function getProfile(id: number) {
  return axiosClient.get(`${ENDPOINTS.spes.getProfile}/${id}`).then(r => r.data)
}

export function createProfile(data: Record<string, unknown>) {
  return axiosClient.post(ENDPOINTS.spes.createProfile, data).then(r => r.data)
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
