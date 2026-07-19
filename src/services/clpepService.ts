import axiosClient from './axiosClient'
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

export function getProfile(id: number) {
  return axiosClient.get(`${ENDPOINTS.clpep.getProfile}/${id}`).then(r => r.data)
}

export function createProfile(data: Record<string, unknown>) {
  return axiosClient.post(ENDPOINTS.clpep.createProfile, data).then(r => r.data)
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
