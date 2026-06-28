import axiosClient from './axiosClient'
import { ENDPOINTS } from '../config/api'
import type { Placement } from '../contexts/EmploymentContext'

export async function listPlacements(): Promise<Placement[]> {
  const res = await axiosClient.get<{ status: string; data: Placement[] }>(
    ENDPOINTS.employment.listPlacements,
  )
  return res.data.data ?? []
}

export async function updatePlacement(
  id: number,
  data: Pick<Placement, 'dateHired' | 'status'>,
): Promise<void> {
  await axiosClient.post(`${ENDPOINTS.employment.updatePlacement}/${id}`, data)
}

export async function updatePlacementStatus(
  id: number,
  status: Placement['status'],
): Promise<void> {
  await axiosClient.post(`${ENDPOINTS.employment.updatePlacementStatus}/${id}`, { status })
}
