// API calls for the app-wide recycle bin (soft-deleted records).
// Deleting an EF applicant/employer/referral, a GIP applicant, a CDSP
// applicant, a SPES applicant, or a DILP/TUPAD beneficiary now soft-deletes
// it on the backend; these functions list, restore, or permanently delete
// those records, merging results from every module that supports soft
// delete. All requests go through axiosClient, which carries the PHP
// session cookie.

import axiosClient from './axiosClient'
import { ENDPOINTS } from '../config/api'

export type RecycleRecordType = 'applicant' | 'employer' | 'referral' | 'gipApplicant' | 'cdspApplicant' | 'spesApplicant' | 'dilpApplicant' | 'tupadApplicant' | 'slpApplicant' | 'clpepApplicant' | 'skillsTrainingApplicant' | 'ofwProfile'

export type RecycleBinRecord = {
  recordType: RecycleRecordType
  id: number
  name: string
  module: string
  description: string
  deletedBy: string
  deletedAt: string
}

// Which module's endpoints handle a given record type.
function endpointsFor(recordType: RecycleRecordType) {
  if (recordType === 'gipApplicant') return ENDPOINTS.gip
  if (recordType === 'cdspApplicant') return ENDPOINTS.cdsp
  if (recordType === 'spesApplicant') return ENDPOINTS.spes
  if (recordType === 'dilpApplicant') return ENDPOINTS.dilp
  if (recordType === 'tupadApplicant') return ENDPOINTS.tupad
  if (recordType === 'slpApplicant') return ENDPOINTS.slp
  if (recordType === 'clpepApplicant') return ENDPOINTS.clpep
  if (recordType === 'skillsTrainingApplicant') return ENDPOINTS.skillsTraining
  if (recordType === 'ofwProfile') return ENDPOINTS.ofw
  return ENDPOINTS.employment
}

// GET listDeleted from every module that supports soft delete, merged newest-first.
export async function listDeleted(): Promise<RecycleBinRecord[]> {
  const [efRes, gipRes, cdspRes, spesRes, dilpRes, tupadRes, slpRes, clpepRes, skillsRes, ofwRes] = await Promise.all([
    axiosClient.get<{ status: string; data: RecycleBinRecord[] }>(ENDPOINTS.employment.listDeleted),
    axiosClient.get<{ status: string; data: RecycleBinRecord[] }>(ENDPOINTS.gip.listDeleted),
    axiosClient.get<{ status: string; data: RecycleBinRecord[] }>(ENDPOINTS.cdsp.listDeleted),
    axiosClient.get<{ status: string; data: RecycleBinRecord[] }>(ENDPOINTS.spes.listDeleted),
    axiosClient.get<{ status: string; data: RecycleBinRecord[] }>(ENDPOINTS.dilp.listDeleted),
    axiosClient.get<{ status: string; data: RecycleBinRecord[] }>(ENDPOINTS.tupad.listDeleted),
    axiosClient.get<{ status: string; data: RecycleBinRecord[] }>(ENDPOINTS.slp.listDeleted),
    axiosClient.get<{ status: string; data: RecycleBinRecord[] }>(ENDPOINTS.clpep.listDeleted),
    axiosClient.get<{ status: string; data: RecycleBinRecord[] }>(ENDPOINTS.skillsTraining.listDeleted),
    axiosClient.get<{ status: string; data: RecycleBinRecord[] }>(ENDPOINTS.ofw.listDeleted),
  ])
  const merged = [
    ...(efRes.data.data ?? []), ...(gipRes.data.data ?? []), ...(cdspRes.data.data ?? []),
    ...(spesRes.data.data ?? []), ...(dilpRes.data.data ?? []), ...(tupadRes.data.data ?? []),
    ...(slpRes.data.data ?? []), ...(clpepRes.data.data ?? []), ...(skillsRes.data.data ?? []),
    ...(ofwRes.data.data ?? []),
  ]
  merged.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
  return merged
}

// POST {module}/restoreRecord  { recordType, id }
export async function restoreRecord(recordType: RecycleRecordType, id: number): Promise<void> {
  await axiosClient.post(endpointsFor(recordType).restoreRecord, { recordType, id })
}

// POST {module}/purgeRecord  { recordType, id }  — permanent delete
export async function purgeRecord(recordType: RecycleRecordType, id: number): Promise<void> {
  await axiosClient.post(endpointsFor(recordType).purgeRecord, { recordType, id })
}
