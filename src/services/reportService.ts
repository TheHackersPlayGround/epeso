import axiosClient from './axiosClient'
import { ENDPOINTS } from '../config/api'

// ── PESO Monthly LMI/SPRS report data (live, from the backend) ──

export type EfReportRegistered = {
  name: string
  occupation: string
  sex: string
  birthdate: string
  age: number | null
  civilStatus: string
  educationalAttainment: string
  yearsWorkExperience: string
  employmentStatus: string
}

export type EfReportReferred = { name: string; occupation: string; sex: string }
export type EfReportPlaced = { name: string; placedAs: string; sex: string }

export type EfReportPeriodCounts = {
  vacancies: number
  registered: number
  referred: number
  placed: number
  placementRate: number
}

export type EfMonthlyReport = {
  from: string
  to: string
  summary: {
    vacanciesSolicited: number
    applicantsRegistered: number
    applicantsReferred: number
    applicantsPlaced: number
    placementRate: number
    local: number
    overseas: number
    registeredBySex: { male: number; female: number }
    referredBySex: { male: number; female: number }
    placedBySex: { male: number; female: number }
  }
  comparison: {
    currentYear: number
    previousYear: number
    current: EfReportPeriodCounts
    previous: EfReportPeriodCounts
  }
  registered: EfReportRegistered[]
  referred: EfReportReferred[]
  placed: EfReportPlaced[]
}

// Fetch the PESO/LMI report over a date range (Monthly / Annual / Custom).
export async function fetchEfReport(from: string, to: string): Promise<EfMonthlyReport> {
  const res = await axiosClient.get<{ status: string; data: EfMonthlyReport }>(
    `${ENDPOINTS.employment.monthlyReport}?from=${from}&to=${to}`,
  )
  return res.data.data
}

// ── General PESO Report (cross-program summary, live from the backend) ──

export type GeneralPesoProgramRow = {
  key: string
  program: string
  participants: number
  male: number
  female: number
  activities: number | null
  placements: number | null
}

export type GeneralPesoReport = {
  from: string
  to: string
  programs: GeneralPesoProgramRow[]
}

// Fetch the cross-program summary for the given date range and program keys
// (the same ids used in REPORT_CATEGORIES, e.g. 'cdsp', 'gip', 'livelihood').
export async function fetchGeneralPesoReport(from: string, to: string, programs: string[]): Promise<GeneralPesoReport> {
  const res = await axiosClient.get<{ status: string; data: GeneralPesoReport }>(
    `${ENDPOINTS.reports.summary}?from=${from}&to=${to}&programs=${programs.join(',')}`,
  )
  return res.data.data
}

// ── Skills Training Aging Report (live from the backend, not period-scoped —
// a snapshot of "how long since completion" as of right now) ──

export type SkillsAgingRow = {
  beneficiaryServiceId: number
  name: string
  sex: string
  trainingsCompleted: number
  lastCompletedTrainingTitle: string
  completedDate: string
  placed: boolean
  jobTitle: string | null
  employer: string | null
  dateHired: string | null
}

// One row per beneficiary who has genuinely completed (status Completed AND
// attended) at least one Skills Training -- beneficiaries with no real
// completion aren't included, since there's nothing to measure aging from.
export async function fetchSkillsAgingReport(): Promise<SkillsAgingRow[]> {
  const res = await axiosClient.get<{ status: string; data: SkillsAgingRow[] }>(ENDPOINTS.skillsTraining.agingReport)
  return res.data.data ?? []
}

// ── CDSP Aging Report (live from the backend, not period-scoped) ──
// Unlike Skills Training, CDSP has sub-services (Career Coaching /
// Pre-Employment Coaching / Labor Employment for Graduating Students), so
// each row also carries which one the beneficiary is enrolled under.

export type CdspAgingRow = {
  beneficiaryServiceId: number
  name: string
  sex: string
  subService: string
  activitiesCompleted: number
  lastCompletedActivityTitle: string
  completedDate: string
  placed: boolean
  jobTitle: string | null
  employer: string | null
  dateHired: string | null
}

// One row per beneficiary who has genuinely completed (status Completed AND
// attended) at least one CDSP activity -- beneficiaries with no real
// completion aren't included, since there's nothing to measure aging from.
export async function fetchCdspAgingReport(): Promise<CdspAgingRow[]> {
  const res = await axiosClient.get<{ status: string; data: CdspAgingRow[] }>(ENDPOINTS.cdsp.agingReport)
  return res.data.data ?? []
}

// ── GIP Aging Report (live from the backend, not period-scoped) ──
// GIP is one-shot -- an applicant only ever goes through the program once --
// so unlike Skills Training/CDSP there's no "trainings/activities completed"
// count worth showing here; it would always just be 1.

export type GipAgingRow = {
  beneficiaryServiceId: number
  name: string
  sex: string
  lastCompletedWorkplaceTitle: string
  completedDate: string
  placed: boolean
  jobTitle: string | null
  employer: string | null
  dateHired: string | null
}

// One row per applicant whose internship is Completed -- anyone still
// Ongoing/Inactive isn't included, since there's nothing to measure aging from.
export async function fetchGipAgingReport(): Promise<GipAgingRow[]> {
  const res = await axiosClient.get<{ status: string; data: GipAgingRow[] }>(ENDPOINTS.gip.agingReport)
  return res.data.data ?? []
}
