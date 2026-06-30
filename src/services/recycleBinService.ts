// API calls for the Employment Facilitation recycle bin (soft-deleted records).
// Deleting an applicant, employer, or referral now soft-deletes it on the backend;
// these endpoints list, restore, or permanently delete those records.
// All requests go through axiosClient, which carries the PHP session cookie.

import axiosClient from './axiosClient'
import { ENDPOINTS } from '../config/api'

export type RecycleRecordType = 'applicant' | 'employer' | 'referral'

export type RecycleBinRecord = {
  recordType: RecycleRecordType
  id: number
  name: string
  module: string
  description: string
  deletedBy: string
  deletedAt: string
}

// GET /api/employment/listDeleted
export async function listDeleted(): Promise<RecycleBinRecord[]> {
  const res = await axiosClient.get<{ status: string; data: RecycleBinRecord[] }>(
    ENDPOINTS.employment.listDeleted,
  )
  return res.data.data ?? []
}

// POST /api/employment/restoreRecord  { recordType, id }
export async function restoreRecord(recordType: RecycleRecordType, id: number): Promise<void> {
  await axiosClient.post(ENDPOINTS.employment.restoreRecord, { recordType, id })
}

// POST /api/employment/purgeRecord  { recordType, id }  — permanent delete
export async function purgeRecord(recordType: RecycleRecordType, id: number): Promise<void> {
  await axiosClient.post(ENDPOINTS.employment.purgeRecord, { recordType, id })
}
