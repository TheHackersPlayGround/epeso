// Staff side of the employer portal: the portal login each employer uses, and the requests employers send
// (referral / placement status changes, company details) that staff accept or reject. See backend
// modules/employer_accounts.php and modules/employer_updates.php.
import axiosClient from './axiosClient'
import { ENDPOINTS } from '../config/api'

// ── Portal accounts (administrators only) ────────────────────────────────────

export interface EmployerPortalAccount {
  accountId: number
  employerId: number
  username: string
  status: 'Active' | 'Inactive'
  mustChangePassword: boolean
  createdAt: string
  updatedAt: string
}

// GET -> the employer's portal account, or null if it has none yet.
export async function getPortalAccount(employerId: number): Promise<EmployerPortalAccount | null> {
  const res = await axiosClient.get<{ status: string; data: EmployerPortalAccount | null }>(`${ENDPOINTS.employerAccounts.get}/${employerId}`)
  return res.data.data ?? null
}

// POST -> the new account plus its one-time temporary password (shown once, never stored in readable form).
export async function createPortalAccount(employerId: number, username: string): Promise<{ account: EmployerPortalAccount; temporaryPassword: string }> {
  const res = await axiosClient.post<{ status: string; data: { account: EmployerPortalAccount; temporaryPassword: string } }>(
    ENDPOINTS.employerAccounts.create, { employerId, username })
  return res.data.data
}

export async function resetPortalPassword(employerId: number): Promise<string> {
  const res = await axiosClient.post<{ status: string; data: { temporaryPassword: string } }>(`${ENDPOINTS.employerAccounts.resetPassword}/${employerId}`)
  return res.data.data.temporaryPassword
}

export async function setPortalAccountStatus(employerId: number, status: 'Active' | 'Inactive'): Promise<EmployerPortalAccount> {
  const res = await axiosClient.post<{ status: string; data: EmployerPortalAccount }>(`${ENDPOINTS.employerAccounts.setStatus}/${employerId}`, { status })
  return res.data.data
}

// ── Employer Activity (Security page; administrators only) ───────────────────

/** One thing an employer did in their portal: signed in or out, changed their password, opened an applicant, viewed or downloaded a shared document. */
export interface EmployerActivityEntry {
  id: number
  timestamp: string
  company: string
  account: string
  action: string
  applicantName: string | null
  documentName: string | null
  documentType: string | null
  ipAddress: string | null
}

export async function listEmployerActivity(): Promise<EmployerActivityEntry[]> {
  const res = await axiosClient.get<{ status: string; data: EmployerActivityEntry[] }>(ENDPOINTS.employerAccounts.activity)
  return res.data.data ?? []
}

// ── Employer Updates (what employers asked for) ──────────────────────────────

export type EmployerRequestType = 'referral_status' | 'placement_status' | 'company_info' | 'vacancy_new' | 'vacancy_update'
export type EmployerRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Withdrawn'

export interface EmployerRequest {
  id: number
  employerId: number
  companyName: string
  type: EmployerRequestType
  status: EmployerRequestStatus
  submittedBy: string | null
  submittedAt: string
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNote: string | null
  /** Set when a pending request can't be accepted any more because the data changed since the employer asked. */
  conflict: string | null
  applicantName: string | null
  jobTitle: string | null
  currentStatus: string | null
  requestedStatus: string | null
  requestedDateHired: string | null
  /** company details and job openings: each field with its current and requested value. */
  changes: { field: string; current: string; requested: string }[] | null
  /** New openings only: openings this employer already has with the same job title (a possible duplicate). */
  duplicates?: { id: number; jobTitle: string; status: string }[]
}

export interface EmployerUpdateCounts {
  pending: number
  /** Changes whenever anything in the list changes (new request, accepted, rejected, withdrawn). */
  signature: string
}

export async function listEmployerRequests(status: EmployerRequestStatus | 'all'): Promise<EmployerRequest[]> {
  const res = await axiosClient.get<{ status: string; data: EmployerRequest[] }>(ENDPOINTS.employerUpdates.list, { params: { status } })
  return res.data.data ?? []
}

export async function getEmployerUpdateCounts(): Promise<EmployerUpdateCounts> {
  const res = await axiosClient.get<{ status: string; data: EmployerUpdateCounts }>(ENDPOINTS.employerUpdates.counts)
  return res.data.data
}

// Accepting applies the change in the main system. For a hire, staff may adjust the date the employer proposed.
export async function acceptEmployerRequest(id: number, dateHired?: string): Promise<void> {
  await axiosClient.post(`${ENDPOINTS.employerUpdates.accept}/${id}`, dateHired ? { dateHired } : {})
}

export async function rejectEmployerRequest(id: number, reason: string): Promise<void> {
  await axiosClient.post(`${ENDPOINTS.employerUpdates.reject}/${id}`, { reason })
}
