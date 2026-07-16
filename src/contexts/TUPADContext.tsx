import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import * as tupadService from '../services/tupadService'

export interface TUPADSavedDocument {
  id: string
  documentType?: string
  customName?: string
  fileName: string
  fileSize: string
  url: string
  dataUrl?: string
}

export interface TUPADAssignmentHistory {
  projectId: number
  projectName: string
  assignedDate: string
  completedDate?: string | null
}

export interface TUPADApplicant {
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
  streetPurok: string
  barangay: string
  barangayId: number
  cityMunicipality: string
  province: string
  region: string
  assignedProjectId: number | null
  assignedProjectName: string
  assignedProjectStatus: string
  assignmentHistory: TUPADAssignmentHistory[]
  attachedDocuments: TUPADSavedDocument[]
  dateApplied: string
  remarks: string
  receivedBy: string
  status: 'Active' | 'Inactive' | 'Completed'
}

export interface TUPADProject {
  id: number
  title: string
  description: string
  date: string
  location: string
  facilitator: string
  participants: string
  status: 'Planned' | 'Ongoing' | 'Completed'
  assistanceAmount: string
  dateReleased: string
  assignedCount: number
  documents: TUPADSavedDocument[]
}

interface TUPADContextValue {
  applicants: TUPADApplicant[]
  projects: TUPADProject[]
  loading: boolean
  loadingProjects: boolean
  refreshProfiles: () => Promise<void>
  refreshProjects: () => Promise<void>
}

const TUPADContext = createContext<TUPADContextValue | null>(null)

export function TUPADProvider({ children }: { children: ReactNode }) {
  const [applicants, setApplicants] = useState<TUPADApplicant[]>([])
  const [projects, setProjects] = useState<TUPADProject[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingProjects, setLoadingProjects] = useState(true)

  const refreshProfiles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await tupadService.listProfiles()
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
      const res = await tupadService.listProjects()
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
    <TUPADContext.Provider value={{ applicants, projects, loading, loadingProjects, refreshProfiles, refreshProjects }}>
      {children}
    </TUPADContext.Provider>
  )
}

export function useTUPAD() {
  const ctx = useContext(TUPADContext)
  if (!ctx) throw new Error('useTUPAD must be used inside TUPADProvider')
  return ctx
}
