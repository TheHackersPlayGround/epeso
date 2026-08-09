import axiosClient from './axiosClient'
import { ENDPOINTS } from '../config/api'

export function listRequestTypes() {
  return axiosClient.get(ENDPOINTS.ofw.listRequestTypes).then(r => r.data)
}

export function listProfiles() {
  return axiosClient.get(ENDPOINTS.ofw.listProfiles).then(r => r.data)
}

export function createProfile(data: Record<string, unknown>) {
  return axiosClient.post(ENDPOINTS.ofw.createProfile, data).then(r => r.data)
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
