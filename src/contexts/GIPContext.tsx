import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import * as gipService from '../services/gipService'

export interface GIPAssignmentHistory {
  batchId: number
  batchName: string
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
  assignedBatchId: number | null
  assignmentHistory: GIPAssignmentHistory[]
  attachedDocuments: GIPSavedDocument[]
  dateApplicationReceived: string
  receivedBy: string
  status: 'Active' | 'Inactive' | 'Completed' | 'Cancelled'
  remarks: string
}

export interface GIPBatch {
  id: number
  batchName: string
  batchCode: string
  description: string
  assignedOffice: string
  deploymentLocation: string
  coordinator: string
  supervisor: string
  slots: string
  assignedCount: number
  fundingSource: string
  fundingSourceOther: string
  startDate: string
  endDate: string
  allowance: string
  status: 'Planned' | 'Ongoing' | 'Completed'
  documents: GIPSavedDocument[]
  isDraft?: boolean
}

interface GIPContextValue {
  applicants: GIPApplicant[]
  gipBatches: GIPBatch[]
  loading: boolean
  loadingBatches: boolean
  refreshProfiles: () => Promise<void>
  refreshBatches: () => Promise<void>
}

const GIPContext = createContext<GIPContextValue | null>(null)

export function GIPProvider({ children }: { children: ReactNode }) {
  const [applicants, setApplicants] = useState<GIPApplicant[]>([])
  const [gipBatches, setGipBatches] = useState<GIPBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingBatches, setLoadingBatches] = useState(true)

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

  const refreshBatches = useCallback(async () => {
    setLoadingBatches(true)
    try {
      const res = await gipService.listBatches()
      setGipBatches(res.data ?? [])
    } catch {
      // silent
    } finally {
      setLoadingBatches(false)
    }
  }, [])

  useEffect(() => {
    refreshProfiles()
    refreshBatches()
  }, [refreshProfiles, refreshBatches])

  return (
    <GIPContext.Provider value={{ applicants, gipBatches, loading, loadingBatches, refreshProfiles, refreshBatches }}>
      {children}
    </GIPContext.Provider>
  )
}

export function useGIP() {
  const ctx = useContext(GIPContext)
  if (!ctx) throw new Error('useGIP must be used inside GIPProvider')
  return ctx
}
