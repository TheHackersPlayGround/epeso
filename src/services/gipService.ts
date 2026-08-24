import axiosClient from './axiosClient'
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

export function createProfile(data: Record<string, unknown>) {
  return axiosClient.post(ENDPOINTS.gip.createProfile, data).then(r => r.data)
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

export function completeAssignment(applicantId: number) {
  return axiosClient.post(ENDPOINTS.gip.completeAssignment, { applicantId }).then(r => r.data)
}

export function reopenAssignment(applicantId: number) {
  return axiosClient.post(ENDPOINTS.gip.reopenAssignment, { applicantId }).then(r => r.data)
}
