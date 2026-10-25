import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { REFRESH_GUARD_MS } from '../hooks/useRefreshOnReturn'
import type { ReactNode } from 'react'
import * as clpepService from '../services/clpepService'

export interface CLPEPSavedDocument {
  id: string
  fileName: string
  fileSize: string
  url: string
  dataUrl?: string
}

export interface CLPEPAssignmentHistory {
  interventionId: number
  interventionName: string
  assignedDate: string
  completedDate?: string | null
}

export interface CLPEPApplicant {
  id: number
  beneficiaryServiceId: number
  lastName: string
  firstName: string
  middleName: string
  nameExtension: string
  sex: '' | 'Male' | 'Female'
  birthdate: string
  age: number
  streetPurok: string
  barangay: string
  barangayId: number
  cityMunicipality: string
  province: string
  region: string
  childLaborStatus: string
  schoolStatus: string
  natureOfWork: string
  currentlyWorking: boolean | null
  hoursWorkedPerWeek: string
  schoolName: string
  gradeYearLevel: string
  guardianName: string
  guardianRelationship: string
  guardianContactNumber: string
  assignedInterventionId: number | null
  assignedInterventionName: string
  assignedInterventionStatus: string
  assignmentHistory: CLPEPAssignmentHistory[]
  attachedDocuments: CLPEPSavedDocument[]
  dateApplied: string
  remarks: string
  receivedBy: string
  status: 'Active' | 'Inactive' | 'Completed'
}

export interface CLPEPIntervention {
  id: number
  interventionName: string
  description: string
  interventionCategory: string
  interventionCategoryOther: string
  targetBeneficiaries: string
  date: string
  implementingOfficer: string
  partnerAgency: string
  partnerAgencyOther: string
  location: string
  status: 'Planned' | 'Ongoing' | 'Completed'
  assignedCount: number
  documents: { id: string; name: string; fileType: string; url: string }[]
}

interface CLPEPContextValue {
  applicants: CLPEPApplicant[]
  interventions: CLPEPIntervention[]
  loading: boolean
  loadingInterventions: boolean
  refreshProfiles: () => Promise<void>
  refreshInterventions: () => Promise<void>
  refreshIfStale: () => Promise<void>
}

const CLPEPContext = createContext<CLPEPContextValue | null>(null)

// Provides CLPEP applicants and interventions to the app.
export function CLPEPProvider({ children }: { children: ReactNode }) {
  const [applicants, setApplicants] = useState<CLPEPApplicant[]>([])
  const [interventions, setInterventions] = useState<CLPEPIntervention[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingInterventions, setLoadingInterventions] = useState(true)

  // Reloads the list of CLPEP applicants.
  const refreshProfiles = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await clpepService.listProfiles()
      setApplicants(res.data ?? [])
    } catch {
      // keep list empty on error
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  // Reloads the list of CLPEP interventions.
  const refreshInterventions = useCallback(async (silent = false) => {
    if (!silent) setLoadingInterventions(true)
    try {
      const res = await clpepService.listInterventions()
      setInterventions(res.data ?? [])
    } catch {
      // silent
    } finally {
      if (!silent) setLoadingInterventions(false)
    }
  }, [])

  const lastLoad = useRef(0)
  // Refreshes applicants and interventions, skipping if the last load was too recent.
  const refreshIfStale = useCallback(async () => {
    if (Date.now() - lastLoad.current < REFRESH_GUARD_MS) return
    lastLoad.current = Date.now()
    await Promise.all([refreshProfiles(true), refreshInterventions(true)])
  }, [refreshProfiles, refreshInterventions])

  useEffect(() => {
    lastLoad.current = Date.now()
    refreshProfiles()
    refreshInterventions()
  }, [refreshProfiles, refreshInterventions])

  return (
    <CLPEPContext.Provider value={{ applicants, interventions, loading, loadingInterventions, refreshProfiles, refreshInterventions, refreshIfStale }}>
      {children}
    </CLPEPContext.Provider>
  )
}

// Returns the CLPEP context.
export function useCLPEP() {
  const ctx = useContext(CLPEPContext)
  if (!ctx) throw new Error('useCLPEP must be used inside CLPEPProvider')
  return ctx
}
