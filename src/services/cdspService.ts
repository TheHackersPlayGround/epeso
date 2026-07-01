import axiosClient from './axiosClient'
import { ENDPOINTS } from '../config/api'

export function listCdspServices() {
  return axiosClient.get(ENDPOINTS.cdsp.listServices).then(r => r.data)
}

export function createService(data: { serviceName: string; serviceCode?: string }) {
  return axiosClient.post(ENDPOINTS.cdsp.createService, data).then(r => r.data)
}

export function deleteService(id: number) {
  return axiosClient.delete(`${ENDPOINTS.cdsp.deleteService}/${id}`).then(r => r.data)
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

export function listProfiles() {
  return axiosClient.get(ENDPOINTS.cdsp.listProfiles).then(r => r.data)
}

export function getProfile(id: number) {
  return axiosClient.get(`${ENDPOINTS.cdsp.getProfile}/${id}`).then(r => r.data)
}

export function createProfile(data: Record<string, unknown>) {
  return axiosClient.post(ENDPOINTS.cdsp.createProfile, data).then(r => r.data)
}

export function updateProfile(id: number, data: Record<string, unknown>) {
  return axiosClient.put(`${ENDPOINTS.cdsp.updateProfile}/${id}`, data).then(r => r.data)
}

export function deleteProfile(id: number) {
  return axiosClient.delete(`${ENDPOINTS.cdsp.deleteProfile}/${id}`).then(r => r.data)
}
