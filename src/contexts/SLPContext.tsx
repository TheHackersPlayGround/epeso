import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import * as slpService from '../services/slpService'

export interface SLPSavedDocument {
  id: string
  fileName: string
  fileSize: string
  url: string
  dataUrl?: string
}

export interface SLPAssignmentHistory {
  projectId: number
  projectName: string
  assignedDate: string
  completedDate?: string | null
}

export interface SLPApplicant {
  id: number
  beneficiaryServiceId: number
  lastName: string
  firstName: string
  middleName: string
  nameExtension: string
  sex: '' | 'Male' | 'Female'
  birthdate: string
  age: number
  civilStatus: string
  contactNumber: string
  email: string
  streetPurok: string
  barangay: string
  barangayId: number
  cityMunicipality: string
  province: string
  region: string
  is4PsBeneficiary: boolean
  slpParticipantIdNumber: string
  eligibilityType: string
  referringParty: string
  sector: string[]
  sectorOthersSpecify: string
  sectorIpGroupSpecify: string
  sectorDisabilitySpecify: string
  educationalAttainment: string
  sourceOfIncome: string
  totalHouseholdMonthlyIncome: string
  householdVulnerabilityScore: string
  vulnerabilitySeverity: string
  assessmentResult: string
  slpTrack: string
  remarks: string
  assignedSlpProjectId: number | null
  projectName: string
  assignedProjectStatus: string
  assignmentHistory: SLPAssignmentHistory[]
  attachedDocuments: SLPSavedDocument[]
  dateApplied: string
  receivedBy: string
  status: 'Active' | 'Inactive' | 'Completed'
}

export interface SLPProject {
  id: number
  projectName: string
  description: string
  slpTrack: string
  dateStarted: string
  location: string
  facilitator: string
  status: 'Planned' | 'Ongoing' | 'Completed' | 'Cancelled'
  assistanceAmount: string
  dateReleased: string
  assignedCount: number
  documents: { id: string; name: string; fileType: string; url: string }[]
}

interface SLPContextValue {
  applicants: SLPApplicant[]
  projects: SLPProject[]
  loading: boolean
  loadingProjects: boolean
  refreshProfiles: () => Promise<void>
  refreshProjects: () => Promise<void>
}

const SLPContext = createContext<SLPContextValue | null>(null)

export function SLPProvider({ children }: { children: ReactNode }) {
  const [applicants, setApplicants] = useState<SLPApplicant[]>([])
  const [projects, setProjects] = useState<SLPProject[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingProjects, setLoadingProjects] = useState(true)

  const refreshProfiles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await slpService.listProfiles()
      setApplicants(res.data ?? [])
    } catch {
      // silent — show empty list rather than crashing
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshProjects = useCallback(async () => {
    setLoadingProjects(true)
    try {
      const res = await slpService.listProjects()
      setProjects(res.data ?? [])
    } catch {
      // silent
    } finally {
      setLoadingProjects(false)
    }
  }, [])

  useEffect(() => {
    refreshProfiles()
    refreshProjects()
  }, [refreshProfiles, refreshProjects])

  return (
    <SLPContext.Provider value={{ applicants, projects, loading, loadingProjects, refreshProfiles, refreshProjects }}>
      {children}
    </SLPContext.Provider>
  )
}

export function useSLP() {
  const ctx = useContext(SLPContext)
  if (!ctx) throw new Error('useSLP must be used inside SLPProvider')
  return ctx
}
