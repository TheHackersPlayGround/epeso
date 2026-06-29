// API calls for Employment Facilitation applicants.
// An applicant is a beneficiary enrolled in the Employment Facilitation service;
// the backend handles the full beneficiary spine in one transaction.
// All requests go through axiosClient, which carries the PHP session cookie.

import axiosClient from './axiosClient'
import { ENDPOINTS } from '../config/api'
import type { Applicant } from '../contexts/EmploymentContext'
import type { ApplicantFormData } from '../pages/employment/AddApplicantSidebar'

// GET /api/employment/listApplicants
export async function listApplicants(): Promise<Applicant[]> {
  const res = await axiosClient.get<{ status: string; data: Applicant[] }>(
    ENDPOINTS.employment.listApplicants,
  )
  return res.data.data ?? []
}

// GET /api/employment/getApplicant/{id}
export async function getApplicant(id: number): Promise<Applicant> {
  const res = await axiosClient.get<{ status: string; data: Applicant }>(
    `${ENDPOINTS.employment.getApplicant}/${id}`,
  )
  return res.data.data
}

// GET /api/employment/getApplicantPhoto/{id} -> 2x2 photo as a base64 data URL
// (or null). Used so the Resume Builder can embed the photo in the PDF without
// cross-origin canvas tainting.
export async function getApplicantPhoto(id: number): Promise<string | null> {
  const res = await axiosClient.get<{ status: string; data: { dataUrl: string | null } }>(
    `${ENDPOINTS.employment.getApplicantPhoto}/${id}`,
  )
  return res.data.data?.dataUrl ?? null
}

// One employer attempt in an applicant's history: a referral plus, when the
// applicant was hired through it, the resulting placement.
export type EmploymentHistoryEntry = {
  referralId: number
  employer: string
  jobTitle: string
  referralDate: string
  status: 'Pending' | 'Interviewed' | 'Hired' | 'Not Hired'
  placement: {
    placementId: number
    status: 'Active' | 'Resigned' | 'Terminated' | 'Completed'
    dateHired: string
  } | null
}

export type EmploymentHistory = {
  applicantId: number
  applicantName: string
  history: EmploymentHistoryEntry[]
}

// GET /api/employment/getApplicantHistory/{id} -> referral->placement timeline
export async function getApplicantHistory(id: number): Promise<EmploymentHistory> {
  const res = await axiosClient.get<{ status: string; data: EmploymentHistory }>(
    `${ENDPOINTS.employment.getApplicantHistory}/${id}`,
  )
  return res.data.data
}

// POST /api/employment/createApplicant -> new beneficiary id
export async function createApplicant(formData: ApplicantFormData): Promise<number> {
  const res = await axiosClient.post<{ status: string; data: { id: number } }>(
    ENDPOINTS.employment.createApplicant,
    formData,
  )
  return res.data.data.id
}

// POST /api/employment/updateApplicant/{id}
export async function updateApplicant(id: number, formData: ApplicantFormData): Promise<void> {
  await axiosClient.post(`${ENDPOINTS.employment.updateApplicant}/${id}`, formData)
}

// POST /api/employment/deleteApplicant/{id}
export async function deleteApplicant(id: number): Promise<void> {
  await axiosClient.post(`${ENDPOINTS.employment.deleteApplicant}/${id}`)
}
