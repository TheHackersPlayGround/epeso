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
