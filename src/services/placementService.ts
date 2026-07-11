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

// One recorded promotion event on a placement.
export type Promotion = {
  id: number
  promotionDate: string
  newJobTitle: string
  // Atomic bounds (source of truth); newSalaryRange is the derived display string.
  newSalaryMin?: number | null
  newSalaryMax?: number | null
  newSalaryRange: string
  remarks: string
  createdAt: string
}

// What the Record Promotion form submits.
export type PromotionInput = {
  promotionDate: string
  newJobTitle: string
  newSalaryMin?: number
  newSalaryMax?: number
  remarks?: string
}

export async function listPromotions(placementId: number): Promise<Promotion[]> {
  const res = await axiosClient.get<{ status: string; data: Promotion[] }>(
    `${ENDPOINTS.employment.listPromotions}/${placementId}`,
  )
  return res.data.data ?? []
}

export async function createPromotion(
  placementId: number,
  data: PromotionInput,
): Promise<void> {
  await axiosClient.post(`${ENDPOINTS.employment.createPromotion}/${placementId}`, data)
}
