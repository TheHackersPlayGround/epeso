// Staff side of the applicant kiosk: the Pending inbox. See backend modules/submissions.php.
// All requests go through axiosClient (logged-in session).

import axiosClient from './axiosClient'
import { ENDPOINTS } from '../config/api'

export type SubmissionStatus = 'Pending' | 'Approved' | 'Rejected'

// A person already in the program with the same name and birthdate.
export interface SubmissionDuplicate {
  id: number
  name: string
  birthdate: string
  program: string
  dateApplied: string | null
  inRecycleBin: boolean
}

export interface Submission {
  id: number
  referenceNo: string
  program: string
  programLabel: string
  applicantName: string
  birthdate: string | null
  status: SubmissionStatus
  submittedAt: string
  reviewedAt: string | null
  reviewedBy: string | null
  rejectReason: string | null
  /** Rejected only: whole days left before it is deleted automatically (30 days after rejection). */
  purgeInDays: number | null
  beneficiaryId: number | null
  /** Approved only: is the saved record still there? 'recycle' = in the Recycle Bin, 'deleted' = permanently removed. */
  recordState: 'active' | 'recycle' | 'deleted' | null
  /** The signed-in user may approve / reject this one. */
  canEdit: boolean
  /** Pending only: people already in the program with this name + birthdate. */
  duplicates: SubmissionDuplicate[]
}

export interface SubmissionDetail extends Omit<Submission, 'duplicates'> {
  /** The form exactly as the applicant filled it in (the same field names as that program's staff form). */
  payload: Record<string, unknown>
}

export interface SubmissionCounts {
  total: number
  byProgram: Record<string, number>
  /** False until migration 083 has been run on this database. */
  ready: boolean
  /** Changes whenever a submission arrives, is reviewed or is deleted: lets the Pending page know when to reload. */
  signature?: string
}

// GET /api/submissions/list?status=...&program=...
export async function listSubmissions(status: SubmissionStatus | 'all', program = ''): Promise<Submission[]> {
  const res = await axiosClient.get<{ status: string; data: Submission[] }>(
    ENDPOINTS.submissions.list,
    { params: { status, ...(program ? { program } : {}) } },
  )
  return res.data.data ?? []
}

// GET /api/submissions/counts -> pending counts for the navbar badge
export async function getSubmissionCounts(): Promise<SubmissionCounts> {
  const res = await axiosClient.get<{ status: string; data: SubmissionCounts }>(ENDPOINTS.submissions.counts)
  return res.data.data
}

// GET /api/submissions/get/{id}
export async function getSubmission(id: number): Promise<SubmissionDetail> {
  const res = await axiosClient.get<{ status: string; data: SubmissionDetail }>(`${ENDPOINTS.submissions.get}/${id}`)
  return res.data.data
}

// POST /api/submissions/reject/{id}
export async function rejectSubmission(id: number, reason: string): Promise<void> {
  await axiosClient.post(`${ENDPOINTS.submissions.reject}/${id}`, { reason })
}

// POST /api/submissions/delete/{id}  (rejected submissions only; permanent)
export async function deleteSubmission(id: number): Promise<void> {
  await axiosClient.post(`${ENDPOINTS.submissions.delete}/${id}`)
}

export interface KioskProgramSetting {
  id: string
  label: string
  enabled: boolean
}

export interface KioskSettings {
  /** Master switch: the whole kiosk open or closed. */
  enabled: boolean
  /** Which services the kiosk offers (each can be closed on its own, e.g. SPES outside its season). */
  programs: KioskProgramSetting[]
}

// GET /api/submissions/kioskSettings
export async function getKioskSettings(): Promise<KioskSettings> {
  const res = await axiosClient.get<{ status: string; data: KioskSettings }>(ENDPOINTS.submissions.kioskSettings)
  return res.data.data
}

// POST /api/submissions/setKiosk  (administrators only)
export async function setKioskEnabled(enabled: boolean): Promise<boolean> {
  const res = await axiosClient.post<{ status: string; data: { enabled: boolean } }>(ENDPOINTS.submissions.setKiosk, { enabled })
  return res.data.data.enabled
}

// POST /api/submissions/setKioskPrograms  (administrators only) -> the programs listed are on, all others off
export async function setKioskPrograms(programs: string[]): Promise<KioskProgramSetting[]> {
  const res = await axiosClient.post<{ status: string; data: { programs: KioskProgramSetting[] } }>(ENDPOINTS.submissions.setKioskPrograms, { programs })
  return res.data.data.programs
}
