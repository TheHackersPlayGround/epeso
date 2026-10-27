// API calls for the app-wide recycle bin: lists, restores, or permanently
// deletes soft-deleted records, merged across every module that supports it.

import axiosClient from './axiosClient'
import { ENDPOINTS } from '../config/api'

export type RecycleRecordType =
  | 'applicant' | 'employer' | 'referral'
  | 'gipApplicant' | 'gipWorkplace'
  | 'cdspApplicant' | 'cdspActivity'
  | 'spesApplicant' | 'spesBatch'
  | 'dilpApplicant' | 'dilpProject'
  | 'tupadApplicant' | 'tupadProject'
  | 'slpApplicant' | 'slpProject'
  | 'clpepApplicant' | 'clpepIntervention'
  | 'skillsTrainingApplicant' | 'skillsTrainingActivity'
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
  if (recordType === 'gipApplicant' || recordType === 'gipWorkplace') return ENDPOINTS.gip
  if (recordType === 'cdspApplicant' || recordType === 'cdspActivity') return ENDPOINTS.cdsp
  if (recordType === 'spesApplicant' || recordType === 'spesBatch') return ENDPOINTS.spes
  if (recordType === 'dilpApplicant' || recordType === 'dilpProject') return ENDPOINTS.dilp
  if (recordType === 'tupadApplicant' || recordType === 'tupadProject') return ENDPOINTS.tupad
  if (recordType === 'slpApplicant' || recordType === 'slpProject') return ENDPOINTS.slp
  if (recordType === 'clpepApplicant' || recordType === 'clpepIntervention') return ENDPOINTS.clpep
  if (recordType === 'skillsTrainingApplicant' || recordType === 'skillsTrainingActivity') return ENDPOINTS.skillsTraining
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

// POST restoreRecord -- returns the new name if the backend had to rename it on
// restore (Documents only, when its old name was reused), else null.
export async function restoreRecord(recordType: RecycleRecordType, id: number): Promise<string | null> {
  const res = await axiosClient.post(endpointsFor(recordType).restoreRecord, { recordType, id })
  return res.data?.data?.renamedTo ?? null
}

// POST purgeRecord -- permanent delete. `force` only matters for EF applicants
// with history (blocked with 409 unless true); a no-op for every other type.
export async function purgeRecord(recordType: RecycleRecordType, id: number, force = false): Promise<void> {
  await axiosClient.post(endpointsFor(recordType).purgeRecord, { recordType, id, force })
}
