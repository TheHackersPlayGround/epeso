import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { REFRESH_GUARD_MS } from '../hooks/useRefreshOnReturn'
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
  status: 'Active' | 'Inactive' | 'Completed' | 'Cancelled' | 'Withdrawn'
  // Set only when status is 'Withdrawn' (left an Ongoing batch early).
  exitedAt?: string | null
  exitReason?: string
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
  refreshIfStale: () => Promise<void>
}

const SPESContext = createContext<SPESContextValue | null>(null)

export function SPESProvider({ children }: { children: ReactNode }) {
  const [applicants, setApplicants] = useState<SPESApplicant[]>([])
  const [spesBatches, setSpesBatches] = useState<SPESBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingBatches, setLoadingBatches] = useState(true)

  const refreshProfiles = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await spesService.listProfiles()
      setApplicants(res.data ?? [])
    } catch {
      // silent — show empty list rather than crashing
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  const refreshBatches = useCallback(async (silent = false) => {
    if (!silent) setLoadingBatches(true)
    try {
      const res = await spesService.listBatches()
      setSpesBatches(res.data ?? [])
    } catch {
      // silent
    } finally {
      if (!silent) setLoadingBatches(false)
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
    await Promise.all([refreshProfiles(true), refreshBatches(true)])
  }, [refreshProfiles, refreshBatches])

  useEffect(() => {
    lastLoad.current = Date.now()
    refreshProfiles()
    refreshBatches()
  }, [refreshProfiles, refreshBatches])

  return (
    <SPESContext.Provider value={{ applicants, spesBatches, loading, loadingBatches, refreshProfiles, refreshBatches, refreshIfStale }}>
      {children}
    </SPESContext.Provider>
  )
}

export function useSPES() {
  const ctx = useContext(SPESContext)
  if (!ctx) throw new Error('useSPES must be used inside SPESProvider')
  return ctx
}
