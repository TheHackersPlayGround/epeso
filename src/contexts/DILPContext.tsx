import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { REFRESH_GUARD_MS } from '../hooks/useRefreshOnReturn'
import type { ReactNode } from 'react'
import * as dilpService from '../services/dilpService'

export interface DILPSavedDocument {
  id: string
  documentType?: string
  customName?: string
  fileName: string
  fileSize: string
  url: string
  dataUrl?: string
}

export interface DILPApplicant {
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
  beneficiaryClassification: string
  beneficiaryClassificationOther: string
  streetPurok: string
  barangay: string
  barangayId: number
  cityId?: number // set by the server on loaded rows (used by the Address filter)
  provinceId?: number
  cityMunicipality: string
  province: string
  region: string
  is4PsBeneficiary: boolean
  yearGraduated4Ps: string
  assignedProjectId: number | null
  assignedProjectName: string
  assignedProjectStatus: string
  attachedDocuments: DILPSavedDocument[]
  dateApplied: string
  remarks: string
  receivedBy: string
  status: 'Active' | 'Inactive' | 'Completed'
}

export interface DILPProject {
  id: number
  projectIdNumber: string
  projectName: string
  typeOfProject: 'Individual' | 'Group' | ''
  programComponent: 'Formation' | 'Restoration' | 'Enhancement' | ''
  wayOfImplementation: 'ACP' | 'Direct Admin' | ''
  barangayId: number | null
  barangay: string
  cityMunicipality: string
  province: string
  region: string
  streetPurok: string
  assistanceAmount: string
  dateReleased: string
  createdDate: string // YYYY-MM-DD the project was entered; the reports place DILP projects by this date
  status: 'Planned' | 'Ongoing' | 'Completed' | 'Cancelled'
  assignedCount: number
  documents: DILPSavedDocument[]
}

interface DILPContextValue {
  applicants: DILPApplicant[]
  projects: DILPProject[]
  loading: boolean
  loadingProjects: boolean
  refreshProfiles: () => Promise<void>
  refreshProjects: () => Promise<void>
  refreshIfStale: () => Promise<void>
}

const DILPContext = createContext<DILPContextValue | null>(null)

// Provides DILP applicants and projects to the app.
export function DILPProvider({ children }: { children: ReactNode }) {
  const [applicants, setApplicants] = useState<DILPApplicant[]>([])
  const [projects, setProjects] = useState<DILPProject[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingProjects, setLoadingProjects] = useState(true)

  // Reloads the list of DILP applicants.
  const refreshProfiles = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await dilpService.listProfiles()
      setApplicants(res.data ?? [])
    } catch {
      // fail quietly
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  // Reloads the list of DILP projects.
  const refreshProjects = useCallback(async (silent = false) => {
    if (!silent) setLoadingProjects(true)
    try {
      const res = await dilpService.listProjects()
      setProjects(res.data ?? [])
    } catch {
      // silent
    } finally {
      if (!silent) setLoadingProjects(false)
    }
  }, [])

  const lastLoad = useRef(0)
  // Refreshes applicants and projects, skipping if the last load was too recent.
  const refreshIfStale = useCallback(async () => {
    if (Date.now() - lastLoad.current < REFRESH_GUARD_MS) return
    lastLoad.current = Date.now()
    await Promise.all([refreshProfiles(true), refreshProjects(true)])
  }, [refreshProfiles, refreshProjects])

  useEffect(() => {
    lastLoad.current = Date.now()
    refreshProfiles()
    refreshProjects()
  }, [refreshProfiles, refreshProjects])

  return (
    <DILPContext.Provider value={{ applicants, projects, loading, loadingProjects, refreshProfiles, refreshProjects, refreshIfStale }}>
      {children}
    </DILPContext.Provider>
  )
}

// Returns the DILP context.
export function useDILP() {
  const ctx = useContext(DILPContext)
  if (!ctx) throw new Error('useDILP must be used inside DILPProvider')
  return ctx
}
