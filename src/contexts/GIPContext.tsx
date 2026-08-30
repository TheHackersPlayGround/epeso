import { createContext, useContext, useState, useEffect, useCallback } from 'react'
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
  status: 'Ongoing' | 'Inactive' | 'Completed' | 'Cancelled'
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
}

const GIPContext = createContext<GIPContextValue | null>(null)

export function GIPProvider({ children }: { children: ReactNode }) {
  const [applicants, setApplicants] = useState<GIPApplicant[]>([])
  const [gipWorkplaces, setGipWorkplaces] = useState<GIPWorkplace[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingWorkplaces, setLoadingWorkplaces] = useState(true)

  const refreshProfiles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await gipService.listProfiles()
      setApplicants(res.data ?? [])
    } catch {
      // silent — show empty list rather than crashing
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshWorkplaces = useCallback(async () => {
    setLoadingWorkplaces(true)
    try {
      const res = await gipService.listWorkplaces()
      setGipWorkplaces(res.data ?? [])
    } catch {
      // silent
    } finally {
      setLoadingWorkplaces(false)
    }
  }, [])

  useEffect(() => {
    refreshProfiles()
    refreshWorkplaces()
  }, [refreshProfiles, refreshWorkplaces])

  return (
    <GIPContext.Provider value={{ applicants, gipWorkplaces, loading, loadingWorkplaces, refreshProfiles, refreshWorkplaces }}>
      {children}
    </GIPContext.Provider>
  )
}

export function useGIP() {
  const ctx = useContext(GIPContext)
  if (!ctx) throw new Error('useGIP must be used inside GIPProvider')
  return ctx
}
