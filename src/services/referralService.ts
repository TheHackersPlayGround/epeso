import axiosClient from './axiosClient'
import { ENDPOINTS } from '../config/api'
import type { Referral } from '../contexts/EmploymentContext'

export async function listReferrals(): Promise<Referral[]> {
  const res = await axiosClient.get<{ status: string; data: Referral[] }>(
    ENDPOINTS.employment.listReferrals,
  )
  return res.data.data ?? []
}

export async function createReferral(applicantId: number, vacancyId: number): Promise<number> {
  const res = await axiosClient.post<{ status: string; data: { id: number } }>(
    ENDPOINTS.employment.createReferral,
    { applicantId, vacancyId },
  )
  return res.data.data.id
}

export async function updateReferralStatus(
  id: number,
  status: Referral['status'] | 'Hired',
): Promise<void> {
  await axiosClient.post(`${ENDPOINTS.employment.updateReferralStatus}/${id}`, { status })
}

export async function deleteReferral(id: number): Promise<void> {
  await axiosClient.post(`${ENDPOINTS.employment.deleteReferral}/${id}`)
}

// Has this applicant already been referred to / placed at the same employer for the
// same position before? Used to confirm before creating a duplicate referral.
export type DuplicateReferral =
  | { hasDuplicate: false }
  | { hasDuplicate: true; employer: string; position: string; date: string; kind: 'referral' | 'placement'; outcome: string }

export async function checkDuplicateReferral(applicantId: number, vacancyId: number): Promise<DuplicateReferral> {
  const res = await axiosClient.get<{ status: string; data: DuplicateReferral }>(
    `${ENDPOINTS.employment.checkDuplicateReferral}?applicantId=${applicantId}&vacancyId=${vacancyId}`,
  )
  return res.data.data
}
