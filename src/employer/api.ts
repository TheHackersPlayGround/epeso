// The employer portal's API (modules employer_auth.php and employer_portal.php of the ePESO backend).
// Cookies carry the sign-in (a cookie of its own, never the staff one); every call also sends X-Portal, which the server
// requires on writes so a request forged from another website is refused.
import axios from 'axios'
import { API_BASE } from '../config/api'


const http = axios.create({ baseURL: API_BASE, withCredentials: true, headers: { 'X-Portal': '1' } })

export class ApiError extends Error {
  status: number
  code: string | null
  /** Seconds until sign-in may be tried again, when the server has locked it after too many wrong passwords. */
  retryAfter: number | null
  constructor(message: string, status: number, code: string | null, retryAfter: number | null = null) {
    super(message)
    this.status = status
    this.code = code
    this.retryAfter = retryAfter
  }
}

// The app listens for this to return to the sign-in page when the session ends. detail.reason is 'inactive' when the PESO
// switched the account (or the company) off, otherwise 'session' (idle too long, or signed out elsewhere).
export const SESSION_ENDED = 'portal:session-ended'
export type SessionEndReason = 'session' | 'inactive'

http.interceptors.response.use(
  res => res,
  err => {
    const status: number = err?.response?.status ?? 0
    const data = err?.response?.data
    const message = typeof data?.error === 'string' ? data.error : status === 0 ? 'Could not reach the portal. Check your connection and try again.' : 'Something went wrong. Please try again.'
    const code = typeof data?.detail?.code === 'string' ? data.detail.code : null
    // 401 on anything but sign-in means the session ended (idle, signed out elsewhere, or the account was switched off).
    if (status === 401 && !String(err?.config?.url ?? '').includes('/employer_auth/login')) window.dispatchEvent(new CustomEvent<{ reason: SessionEndReason }>(SESSION_ENDED, { detail: { reason: code === 'ACCOUNT_INACTIVE' ? 'inactive' : 'session' } }))
    const retryAfter = typeof data?.detail?.retryAfter === 'number' ? data.detail.retryAfter : null
    return Promise.reject(new ApiError(message, status, code, retryAfter))
  },
)

async function get<T>(path: string): Promise<T> {
  const res = await http.get<{ data: T }>(path)
  return res.data.data
}
async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await http.post<{ data: T }>(path, body ?? {})
  return res.data.data
}

// ── types ──
export interface Me { username: string; mustChangePassword: boolean; employerId: number; companyName: string }

export type ReferralStatus = 'Pending' | 'Interviewed' | 'Hired' | 'Not Hired'
export type PlacementStatus = 'Active' | 'Resigned' | 'Terminated' | 'Completed'
export type RequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Withdrawn'

export interface OpenRequest {
  id: number; requestedStatus: string | null; dateHired: string | null; submittedAt: string
  /** 'placement_status' or 'placement_promotion' on a placement; the new job title is set for a promotion request. */
  type?: string; newJobTitle?: string | null
}

export interface Referral {
  id: number; applicantId: number; applicantName: string; jobTitle: string | null; dateReferred: string | null
  status: ReferralStatus; openRequest: OpenRequest | null
}
export interface Placement {
  /** The job opening this person was hired into (so the Vacancies tab can list who is hired for each opening). */
  id: number; vacancyId: number; applicantId: number; applicantName: string; jobTitle: string | null; dateHired: string | null
  /** The position the person was hired into (the opening's title). `jobTitle` is the position now, which differs after a promotion. */
  hiredAs: string | null
  status: PlacementStatus; openRequest: OpenRequest | null
}
export interface Vacancy {
  id: number; jobTitle: string; jobType: string | null; description: string | null; requirements: string | null
  status: string | null; salaryMin: number | null; salaryMax: number | null; slotsTotal: number | null
  /** People currently hired into this opening. */
  hired: number
  /** 'Staff' = entered by the PESO; 'Employer' = requested by your company and accepted by the PESO. */
  source: 'Staff' | 'Employer'
  /** A change you asked for that the PESO has not decided yet. */
  openRequest: { id: number; changes: Record<string, string | number>; submittedAt: string } | null
}
export interface Company {
  id: number; companyName: string; industry: string | null; businessType: string | null; tinNumber: string | null
  contactPersonName: string | null; contactPersonPosition: string | null; contactNumber: string | null; emailAddress: string | null
  buildingNo: string | null; street: string | null; address: string | null; status: string; dateRegistered: string | null
  openRequest: { id: number; changes: Record<string, string>; submittedAt: string } | null
}
export interface PortalRequest {
  id: number; type: 'referral_status' | 'placement_status' | 'placement_promotion' | 'company_info' | 'vacancy_new' | 'vacancy_update'; status: RequestStatus
  applicantName: string | null; jobTitle: string | null; requestedStatus: string | null; dateHired: string | null
  /** What a referral / placement status was before the change (as it is now while pending; as it was when approved). */
  currentStatus: string | null
  changes: Record<string, string | number> | null
  /** What each changed field of a company / opening request was before, by the same keys as `changes` (empty text = unknown or blank). */
  before: Record<string, string> | null
  reviewNote: string | null; submittedAt: string | null; reviewedAt: string | null
}
export interface Overview {
  companyName: string; openReferrals: number; activePlacements: number; openVacancies: number; pendingRequests: number
  recentDecisions: PortalRequest[]
}
/** A document the PESO chose to send to your company for this application. */
export interface SharedDocument { id: number; label: string; type: string; fileName: string; fileSize: number; previewable: boolean }
export interface ApplicantRecord { id: number; name: string; data: Record<string, unknown>; documents: SharedDocument[] }
/** Which referral or placement the employer opened the profile from, so it can say "Referred for Reloader · 11/14/2026 · Hired". */
export interface ApplicantContext { jobTitle: string | null; verb: 'Referred' | 'Hired'; date: string | null; status: string; hiredAs?: string | null }

/** The address of a shared document. Files are served by the portal after its checks; open it in a new tab (view) or with download=true. */
export const documentUrl = (id: number, download = false, view = false) => `${API_BASE}/employer_portal/document/${id}${download ? '?download=1' : view ? '?view=1' : ''}`

// ── calls ──
export const login = (username: string, password: string) => post<Me>('/employer_auth/login', { username, password })
export const logout = () => post<null>('/employer_auth/logout')
export const getMe = () => get<Me>('/employer_auth/me')
// The first-login change needs only the new password (the server skips the current-password check while the account must change it).
export const changePassword = (newPassword: string, currentPassword?: string) => post<null>('/employer_auth/changePassword', { newPassword, ...(currentPassword ? { currentPassword } : {}) })

export const getOverview = () => get<Overview>('/employer_portal/overview')
export const getCompany = () => get<Company>('/employer_portal/company')
export const listVacancies = () => get<Vacancy[]>('/employer_portal/vacancies')
export const listReferrals = () => get<Referral[]>('/employer_portal/referrals')
export const listPlacements = () => get<Placement[]>('/employer_portal/placements')
export const listRequests = () => get<PortalRequest[]>('/employer_portal/requests')
export const getApplicant = (id: number) => get<ApplicantRecord>(`/employer_portal/applicant/${id}`)

/** What an employer types for a job opening. */
export interface VacancyInput {
  jobTitle: string; jobType: string; description: string; requirements: string
  salaryMin: string; salaryMax: string; slotsTotal: string
}

/** What an employer types to ask for a promotion (the salary and remarks are optional). */
export interface PromotionInput { promotionDate: string; newJobTitle: string; newSalaryMin?: string; newSalaryMax?: string; remarks?: string }

export type NewRequest =
  | { type: 'referral_status'; referralId: number; payload: { status: string; dateHired?: string } }
  | { type: 'placement_status'; placementId: number; payload: { status: string } }
  | { type: 'placement_promotion'; placementId: number; payload: PromotionInput }
  | { type: 'company_info'; payload: Record<string, string> }
  | { type: 'vacancy_new'; payload: VacancyInput }
  | { type: 'vacancy_update'; vacancyId: number; payload: Partial<VacancyInput> & { status?: string } }
export const submitRequest = (r: NewRequest) => post<{ id: number }>('/employer_portal/submitRequest', r)
export const withdrawRequest = (id: number) => post<null>(`/employer_portal/withdrawRequest/${id}`)
