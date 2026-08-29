import axiosClient from './axiosClient'
import { ENDPOINTS } from '../config/api'

export function listBatches() {
  return axiosClient.get(ENDPOINTS.skillsTraining.listBatches).then(r => r.data)
}

export function createBatch(data: { batchName: string; description?: string }) {
  return axiosClient.post(ENDPOINTS.skillsTraining.createBatch, data).then(r => r.data)
}

export function deleteBatch(id: number) {
  return axiosClient.delete(`${ENDPOINTS.skillsTraining.deleteBatch}/${id}`).then(r => r.data)
}

export function listActivities() {
  return axiosClient.get(ENDPOINTS.skillsTraining.listActivities).then(r => r.data)
}

export function createActivity(data: Record<string, unknown>) {
  return axiosClient.post(ENDPOINTS.skillsTraining.createActivity, data).then(r => r.data)
}

export function updateActivity(id: number, data: Record<string, unknown>) {
  return axiosClient.put(`${ENDPOINTS.skillsTraining.updateActivity}/${id}`, data).then(r => r.data)
}

export function updateActivityStatus(id: number, status: string) {
  return axiosClient.patch(`${ENDPOINTS.skillsTraining.updateActivityStatus}/${id}`, { status }).then(r => r.data)
}

export function deleteActivity(id: number) {
  return axiosClient.delete(`${ENDPOINTS.skillsTraining.deleteActivity}/${id}`).then(r => r.data)
}

export function listActivityParticipants(activityId: number) {
  return axiosClient.get(`${ENDPOINTS.skillsTraining.listActivityParticipants}/${activityId}`).then(r => r.data)
}

export function addParticipant(data: { activityId: number; beneficiaryServiceId: number }) {
  return axiosClient.post(ENDPOINTS.skillsTraining.addParticipant, data).then(r => r.data)
}

export function removeParticipant(data: { activityId: number; beneficiaryServiceId: number }) {
  return axiosClient.post(ENDPOINTS.skillsTraining.removeParticipant, data).then(r => r.data)
}

export function updateAttendance(data: { activityId: number; beneficiaryServiceId: number; attended: boolean }) {
  return axiosClient.post(ENDPOINTS.skillsTraining.updateAttendance, data).then(r => r.data)
}

// One training a beneficiary was ever assigned to (present in the array even
// if they later moved on to another one -- assignments are never deleted).
export type TrainingHistoryEntry = {
  activityId: number
  activityTitle: string
  batchName: string
  activityDate: string
  status: 'Planned' | 'Ongoing' | 'Completed' | 'Cancelled'
  completedDate: string | null
  attended: boolean | null
}

export function listTrainingHistory(beneficiaryServiceId: number) {
  return axiosClient
    .get<{ status: string; data: TrainingHistoryEntry[] }>(`${ENDPOINTS.skillsTraining.listTrainingHistory}/${beneficiaryServiceId}`)
    .then(r => r.data.data ?? [])
}

export function listQualifications() {
  return axiosClient.get(ENDPOINTS.skillsTraining.listQualifications).then(r => r.data)
}

export function listPurposes() {
  return axiosClient.get(ENDPOINTS.skillsTraining.listPurposes).then(r => r.data)
}

export function listProfiles() {
  return axiosClient.get(ENDPOINTS.skillsTraining.listProfiles).then(r => r.data)
}

export function createProfile(data: Record<string, unknown>) {
  return axiosClient.post(ENDPOINTS.skillsTraining.createProfile, data).then(r => r.data)
}

export function updateProfile(id: number, data: Record<string, unknown>) {
  return axiosClient.put(`${ENDPOINTS.skillsTraining.updateProfile}/${id}`, data).then(r => r.data)
}

export function deleteProfile(id: number) {
  return axiosClient.delete(`${ENDPOINTS.skillsTraining.deleteProfile}/${id}`).then(r => r.data)
}
