import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { REFRESH_GUARD_MS } from '../hooks/useRefreshOnReturn'
import type { ReactNode } from 'react'
import * as gipService from '../services/gipService'

export interface GIPAssignmentHistory {
  workplaceId: number
  workplaceName: string
  assignedDate: string
  completedDate?: string | null
}

export interface GIPSavedDocument {
  id: string
  documentType?: string
  customName?: string
  fileName: string
  fileSize: string
  url: string
  dataUrl?: string
}

export interface GIPApplicant {
  id: number
  gipProfileId: number | null
  beneficiaryServiceId: number
  lastName: string
  firstName: string
  middleName: string
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
  classification: string[]
  classificationOther: string
  highestEducation: string
  schoolName: string
  course: string
  strand: string
  yearLevel: string
  yearGraduated: string
  assignedWorkplaceId: number | null
  assignmentHistory: GIPAssignmentHistory[]
  lastCompletedWorkplaceTitle: string | null
  lastCompletedDate: string | null
  placed: boolean
  attachedDocuments: GIPSavedDocument[]
  dateApplicationReceived: string
  receivedBy: string
  status: 'Ongoing' | 'Inactive' | 'Completed' | 'Withdrawn'
  // Set only when status is 'Withdrawn' (left the workplace/office early).
  exitedAt?: string | null
  exitReason?: string
  remarks: string
}

export interface GIPWorkplace {
  id: number
  workplaceName: string
  description: string
  deploymentLocation: string
  supervisor: string
  assignedCount: number
  fundingSource: string
  fundingSourceOther: string
  allowance: string
  documents: GIPSavedDocument[]
}

interface GIPContextValue {
  applicants: GIPApplicant[]
  gipWorkplaces: GIPWorkplace[]
  loading: boolean
  loadingWorkplaces: boolean
  refreshProfiles: () => Promise<void>
  refreshWorkplaces: () => Promise<void>
  refreshIfStale: () => Promise<void>
}

const GIPContext = createContext<GIPContextValue | null>(null)

export function GIPProvider({ children }: { children: ReactNode }) {
  const [applicants, setApplicants] = useState<GIPApplicant[]>([])
  const [gipWorkplaces, setGipWorkplaces] = useState<GIPWorkplace[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingWorkplaces, setLoadingWorkplaces] = useState(true)

  const refreshProfiles = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await gipService.listProfiles()
      setApplicants(res.data ?? [])
    } catch {
      // silent — show empty list rather than crashing
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  const refreshWorkplaces = useCallback(async (silent = false) => {
    if (!silent) setLoadingWorkplaces(true)
    try {
      const res = await gipService.listWorkplaces()
      setGipWorkplaces(res.data ?? [])
    } catch {
      // silent
    } finally {
      if (!silent) setLoadingWorkplaces(false)
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
    await Promise.all([refreshProfiles(true), refreshWorkplaces(true)])
  }, [refreshProfiles, refreshWorkplaces])

  useEffect(() => {
    lastLoad.current = Date.now()
    refreshProfiles()
    refreshWorkplaces()
  }, [refreshProfiles, refreshWorkplaces])

  return (
    <GIPContext.Provider value={{ applicants, gipWorkplaces, loading, loadingWorkplaces, refreshProfiles, refreshWorkplaces, refreshIfStale }}>
      {children}
    </GIPContext.Provider>
  )
}

export function useGIP() {
  const ctx = useContext(GIPContext)
  if (!ctx) throw new Error('useGIP must be used inside GIPProvider')
  return ctx
}
