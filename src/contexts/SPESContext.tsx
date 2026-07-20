import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import * as spesService from '../services/spesService'

export interface SPESAssignmentHistory {
  batchId: number
  batchName: string
  assignedDate: string
  completedDate?: string | null
}

export interface SPESSavedDocument {
  id: string
  documentType?: string
  customName?: string
  fileName: string
  fileSize: string
  url: string
  dataUrl?: string
}

export interface SPESApplicant {
  id: number
  spesProfileId: number | null
  beneficiaryServiceId: number
  // I. Personal Information
  lastName: string
  firstName: string
  middleName: string
  sex: '' | 'Male' | 'Female'
  birthdate: string
  age: number
  civilStatus: string
  contactNumber: string
  email: string
  // II. Address
  streetPurok: string
  barangay: string
  barangayId: number
  cityMunicipality: string
  province: string
  region: string
  // III. Classification
  classification: string[]
  classificationOther: string
  // IV. Educational Information
  schoolName: string
  schoolType: string
  gradeYearLevel: string
  course: string
  // V. Family / Economic Information
  annualFamilyIncome: string
  numberOfDependents: number
  // VI. Current Assignment
  assignedBatchId: number | null
  // VII. Assignment History
  assignmentHistory: SPESAssignmentHistory[]
  // VIII. Attached Documents
  attachedDocuments: SPESSavedDocument[]
  // IX. PESO Office
  dateApplicationReceived: string
  receivedBy: string
  status: 'Active' | 'Inactive' | 'Completed' | 'Cancelled'
  remarks: string
}

export interface SPESBatch {
  id: number
  batchName: string
  description: string
  programStartDate: string
  programEndDate: string
  availableSlots: string
  assignedCount: number
  employer: string
  deploymentLocation: string
  coordinator: string
  fundingSource: string
  fundingSourceOther: string
  status: 'Planned' | 'Ongoing' | 'Completed'
  documents: SPESSavedDocument[]
}

interface SPESContextValue {
  applicants: SPESApplicant[]
  spesBatches: SPESBatch[]
  loading: boolean
  loadingBatches: boolean
  refreshProfiles: () => Promise<void>
  refreshBatches: () => Promise<void>
}

const SPESContext = createContext<SPESContextValue | null>(null)

export function SPESProvider({ children }: { children: ReactNode }) {
  const [applicants, setApplicants] = useState<SPESApplicant[]>([])
  const [spesBatches, setSpesBatches] = useState<SPESBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingBatches, setLoadingBatches] = useState(true)

  const refreshProfiles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await spesService.listProfiles()
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
      const res = await spesService.listBatches()
      setSpesBatches(res.data ?? [])
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
    <SPESContext.Provider value={{ applicants, spesBatches, loading, loadingBatches, refreshProfiles, refreshBatches }}>
      {children}
    </SPESContext.Provider>
  )
}

export function useSPES() {
  const ctx = useContext(SPESContext)
  if (!ctx) throw new Error('useSPES must be used inside SPESProvider')
  return ctx
}
