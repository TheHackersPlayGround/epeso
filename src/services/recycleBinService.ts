// API calls for the app-wide recycle bin (soft-deleted records).
// Deleting an EF applicant/employer/referral, a GIP applicant, a CDSP
// applicant, a SPES applicant, or a DILP/TUPAD beneficiary now soft-deletes
// it on the backend; these functions list, restore, or permanently delete
// those records, merging results from every module that supports soft
// delete. All requests go through axiosClient, which carries the PHP
// session cookie.

import axiosClient from './axiosClient'
import { ENDPOINTS } from '../config/api'

export type RecycleRecordType =
  | 'applicant' | 'employer' | 'referral'
  | 'gipApplicant' | 'gipBatch'
  | 'cdspApplicant' | 'cdspActivity'
  | 'spesApplicant' | 'spesBatch'
  | 'dilpApplicant' | 'dilpProject'
  | 'tupadApplicant' | 'tupadProject'
  | 'slpApplicant' | 'slpProject'
  | 'clpepApplicant' | 'clpepIntervention'
  | 'skillsTrainingApplicant' | 'skillsTrainingBatch' | 'skillsTrainingActivity'
  | 'ofwProfile'
  | 'documentsFolder' | 'documentsDocument'

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
  if (recordType === 'gipApplicant' || recordType === 'gipBatch') return ENDPOINTS.gip
  if (recordType === 'cdspApplicant' || recordType === 'cdspActivity') return ENDPOINTS.cdsp
  if (recordType === 'spesApplicant' || recordType === 'spesBatch') return ENDPOINTS.spes
  if (recordType === 'dilpApplicant' || recordType === 'dilpProject') return ENDPOINTS.dilp
  if (recordType === 'tupadApplicant' || recordType === 'tupadProject') return ENDPOINTS.tupad
  if (recordType === 'slpApplicant' || recordType === 'slpProject') return ENDPOINTS.slp
  if (recordType === 'clpepApplicant' || recordType === 'clpepIntervention') return ENDPOINTS.clpep
  if (recordType === 'skillsTrainingApplicant' || recordType === 'skillsTrainingBatch' || recordType === 'skillsTrainingActivity') return ENDPOINTS.skillsTraining
  if (recordType === 'ofwProfile') return ENDPOINTS.ofw
  if (recordType === 'documentsFolder' || recordType === 'documentsDocument') return ENDPOINTS.documents
  return ENDPOINTS.employment
}

// GET listDeleted from every module that supports soft delete, merged newest-first.
export async function listDeleted(): Promise<RecycleBinRecord[]> {
  const [efRes, gipRes, cdspRes, spesRes, dilpRes, tupadRes, slpRes, clpepRes, skillsRes, ofwRes, docsRes] = await Promise.all([
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
    axiosClient.get<{ status: string; data: RecycleBinRecord[] }>(ENDPOINTS.documents.listDeleted),
  ])
  const merged = [
    ...(efRes.data.data ?? []), ...(gipRes.data.data ?? []), ...(cdspRes.data.data ?? []),
    ...(spesRes.data.data ?? []), ...(dilpRes.data.data ?? []), ...(tupadRes.data.data ?? []),
    ...(slpRes.data.data ?? []), ...(clpepRes.data.data ?? []), ...(skillsRes.data.data ?? []),
    ...(ofwRes.data.data ?? []), ...(docsRes.data.data ?? []),
  ]
  merged.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
  return merged
}

// POST {module}/restoreRecord  { recordType, id }
export async function restoreRecord(recordType: RecycleRecordType, id: number): Promise<void> {
  await axiosClient.post(endpointsFor(recordType).restoreRecord, { recordType, id })
}

// POST {module}/purgeRecord  { recordType, id, force? }  — permanent delete.
// `force` is only meaningful for EF applicants with placement/referral
// history — the backend blocks the first attempt (409, detail.code ===
// 'has_history') unless force is true. Harmless no-op for every other type.
export async function purgeRecord(recordType: RecycleRecordType, id: number, force = false): Promise<void> {
  await axiosClient.post(endpointsFor(recordType).purgeRecord, { recordType, id, force })
}
