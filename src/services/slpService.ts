import axiosClient from './axiosClient'
import { ENDPOINTS } from '../config/api'

export function listProjects() {
  return axiosClient.get(ENDPOINTS.slp.listProjects).then(r => r.data)
}

export function createProject(data: Record<string, unknown>) {
  return axiosClient.post(ENDPOINTS.slp.createProject, data).then(r => r.data)
}

export function updateProject(id: number, data: Record<string, unknown>) {
  return axiosClient.put(`${ENDPOINTS.slp.updateProject}/${id}`, data).then(r => r.data)
}

export function deleteProject(id: number) {
  return axiosClient.delete(`${ENDPOINTS.slp.deleteProject}/${id}`).then(r => r.data)
}

export function updateProjectStatus(id: number, status: string) {
  return axiosClient.patch(`${ENDPOINTS.slp.updateProjectStatus}/${id}`, { status }).then(r => r.data)
}

export function listProfiles() {
  return axiosClient.get(ENDPOINTS.slp.listProfiles).then(r => r.data)
}

export function createProfile(data: Record<string, unknown>) {
  return axiosClient.post(ENDPOINTS.slp.createProfile, data).then(r => r.data)
}

export function updateProfile(id: number, data: Record<string, unknown>) {
  return axiosClient.put(`${ENDPOINTS.slp.updateProfile}/${id}`, data).then(r => r.data)
}

export function deleteProfile(id: number) {
  return axiosClient.delete(`${ENDPOINTS.slp.deleteProfile}/${id}`).then(r => r.data)
}

export function assignProject(applicantId: number, projectId: number) {
  return axiosClient.post(ENDPOINTS.slp.assignProject, { applicantId, projectId }).then(r => r.data)
}

export function unassignProject(applicantId: number) {
  return axiosClient.post(ENDPOINTS.slp.unassignProject, { applicantId }).then(r => r.data)
}
