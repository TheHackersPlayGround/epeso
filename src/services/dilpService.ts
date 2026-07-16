import axiosClient from './axiosClient'
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

export function getProfile(id: number) {
  return axiosClient.get(`${ENDPOINTS.dilp.getProfile}/${id}`).then(r => r.data)
}

export function createProfile(data: Record<string, unknown>) {
  return axiosClient.post(ENDPOINTS.dilp.createProfile, data).then(r => r.data)
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
