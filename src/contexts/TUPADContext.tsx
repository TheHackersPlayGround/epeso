import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { REFRESH_GUARD_MS } from '../hooks/useRefreshOnReturn'
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
  exitedAt?: string | null
  exitReason?: string
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
  cityId?: number // set by the server on loaded rows (used by the Address filter)
  provinceId?: number
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
  status: 'Active' | 'Inactive' | 'Completed' | 'Withdrawn'
  // Set only when status is 'Withdrawn' (left an Ongoing project early).
  exitedAt?: string | null
  exitReason?: string
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
  refreshIfStale: () => Promise<void>
}

const TUPADContext = createContext<TUPADContextValue | null>(null)

export function TUPADProvider({ children }: { children: ReactNode }) {
  const [applicants, setApplicants] = useState<TUPADApplicant[]>([])
  const [projects, setProjects] = useState<TUPADProject[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingProjects, setLoadingProjects] = useState(true)

  const refreshProfiles = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await tupadService.listProfiles()
      setApplicants(res.data ?? [])
    } catch {
      // silent — show empty list rather than crashing
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  const refreshProjects = useCallback(async (silent = false) => {
    if (!silent) setLoadingProjects(true)
    try {
      const res = await tupadService.listProjects()
      setProjects(res.data ?? [])
    } catch {
      // silent
    } finally {
      if (!silent) setLoadingProjects(false)
    }
  }, [])

  // Re-fetch (silently: no spinner, so an open form is never replaced) every
  // time the module is opened or the window regains focus, so other staff
  // members' changes show up. A call within REFRESH_GUARD_MS of the previous
  // one is skipped: it is the same user action firing several triggers.
  const lastLoad = useRef(0) // set when the initial load starts (below)
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
    <TUPADContext.Provider value={{ applicants, projects, loading, loadingProjects, refreshProfiles, refreshProjects, refreshIfStale }}>
      {children}
    </TUPADContext.Provider>
  )
}

export function useTUPAD() {
  const ctx = useContext(TUPADContext)
  if (!ctx) throw new Error('useTUPAD must be used inside TUPADProvider')
  return ctx
}
