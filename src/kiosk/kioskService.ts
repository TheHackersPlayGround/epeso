// Public (no login) calls for the applicant kiosk. See backend modules/kiosk.php.

import axiosClient from '../services/axiosClient'
import { ENDPOINTS } from '../config/api'

export interface KioskProgram {
  id: string
  label: string
}

export interface KioskStatus {
  enabled: boolean
  /** Only the programs an administrator has switched on. */
  programs: KioskProgram[]
}

export interface KioskLookup {
  id: number
  name: string
}

// GET /api/kiosk/status
export async function getKioskStatus(): Promise<KioskStatus> {
  const res = await axiosClient.get<{ status: string; data: KioskStatus }>(ENDPOINTS.kiosk.status)
  return res.data.data
}

// GET /api/kiosk/cdspServices -> the service choices on the CDSP form
export async function getCdspServices(): Promise<string[]> {
  const res = await axiosClient.get<{ status: string; data: string[] }>(ENDPOINTS.kiosk.cdspServices)
  return res.data.data ?? []
}

// GET /api/kiosk/skillsOptions -> the qualification / purpose lists on the Skills Training form
export async function getSkillsOptions(): Promise<{ qualifications: KioskLookup[]; purposes: KioskLookup[] }> {
  const res = await axiosClient.get<{ status: string; data: { qualifications: KioskLookup[]; purposes: KioskLookup[] } }>(ENDPOINTS.kiosk.skillsOptions)
  return res.data.data
}

// POST /api/kiosk/submit -> the reference number the applicant can quote to staff.
// `website` is a hidden honeypot field: it is always empty for a real person.
export async function submitApplication(program: string, data: object, website = ''): Promise<string> {
  const res = await axiosClient.post<{ status: string; data: { referenceNo: string } }>(
    ENDPOINTS.kiosk.submit,
    { program, data, website },
  )
  return res.data.data.referenceNo
}
