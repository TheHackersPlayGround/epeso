// Shared across every program module (starting with Skills Training) --
// one service, one backend table (job_placements), not a copy per module.
// Any module's applicant list can call this the same way, passing that
// applicant's own beneficiaryServiceId.

import axiosClient from './axiosClient'
import { ENDPOINTS } from '../config/api'

export interface JobPlacement {
  id: number
  beneficiaryServiceId: number
  jobTitle: string
  employer: string
  dateHired: string
  employmentType: string
  remarks: string
}

export type JobPlacementInput = Omit<JobPlacement, 'id'>

export async function listByApplicant(beneficiaryServiceId: number): Promise<JobPlacement[]> {
  const res = await axiosClient.get<{ status: string; data: JobPlacement[] }>(
    ENDPOINTS.jobPlacements.listByApplicant,
    { params: { beneficiaryServiceId } }
  )
  return res.data.data ?? []
}

export function createPlacement(data: JobPlacementInput) {
  return axiosClient.post(ENDPOINTS.jobPlacements.create, data).then(r => r.data)
}

export function updatePlacement(id: number, data: Omit<JobPlacementInput, 'beneficiaryServiceId'>) {
  return axiosClient.put(`${ENDPOINTS.jobPlacements.update}/${id}`, data).then(r => r.data)
}

export function deletePlacement(id: number) {
  return axiosClient.delete(`${ENDPOINTS.jobPlacements.delete}/${id}`).then(r => r.data)
}
