import { createContext, useContext, useState, useEffect, useCallback } from 'react'
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
}

const DILPContext = createContext<DILPContextValue | null>(null)

export function DILPProvider({ children }: { children: ReactNode }) {
  const [applicants, setApplicants] = useState<DILPApplicant[]>([])
  const [projects, setProjects] = useState<DILPProject[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingProjects, setLoadingProjects] = useState(true)

  const refreshProfiles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await dilpService.listProfiles()
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
      const res = await dilpService.listProjects()
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
    <DILPContext.Provider value={{ applicants, projects, loading, loadingProjects, refreshProfiles, refreshProjects }}>
      {children}
    </DILPContext.Provider>
  )
}

export function useDILP() {
  const ctx = useContext(DILPContext)
  if (!ctx) throw new Error('useDILP must be used inside DILPProvider')
  return ctx
}
