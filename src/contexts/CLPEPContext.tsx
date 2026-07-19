import { createContext, useContext, useState, useEffect, useCallback } from 'react'
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
}

const CLPEPContext = createContext<CLPEPContextValue | null>(null)

export function CLPEPProvider({ children }: { children: ReactNode }) {
  const [applicants, setApplicants] = useState<CLPEPApplicant[]>([])
  const [interventions, setInterventions] = useState<CLPEPIntervention[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingInterventions, setLoadingInterventions] = useState(true)

  const refreshProfiles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await clpepService.listProfiles()
      setApplicants(res.data ?? [])
    } catch {
      // silent — show empty list rather than crashing
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshInterventions = useCallback(async () => {
    setLoadingInterventions(true)
    try {
      const res = await clpepService.listInterventions()
      setInterventions(res.data ?? [])
    } catch {
      // silent
    } finally {
      setLoadingInterventions(false)
    }
  }, [])

  useEffect(() => {
    refreshProfiles()
    refreshInterventions()
  }, [refreshProfiles, refreshInterventions])

  return (
    <CLPEPContext.Provider value={{ applicants, interventions, loading, loadingInterventions, refreshProfiles, refreshInterventions }}>
      {children}
    </CLPEPContext.Provider>
  )
}

export function useCLPEP() {
  const ctx = useContext(CLPEPContext)
  if (!ctx) throw new Error('useCLPEP must be used inside CLPEPProvider')
  return ctx
}
