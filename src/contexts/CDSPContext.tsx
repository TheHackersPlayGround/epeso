import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { REFRESH_GUARD_MS } from '../hooks/useRefreshOnReturn'
import type { ReactNode } from 'react'
import * as cdspService from '../services/cdspService'

export interface CDSPAssignment {
  activityId: number
  activityTitle: string
  assignedDate: string
  completedDate?: string | null
  attended: boolean | null
}

export interface CDSPSavedDocument {
  id: string
  documentType?: string
  customName?: string
  fileName: string
  fileSize: string
  url: string
  dataUrl?: string
}

export interface CDSPApplicant {
  id: number
  beneficiaryServiceId: number
  serviceId: number
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
  yearGraduated: string
  employmentStatus: string
  currentOccupation: string
  serviceAvailed: string
  assignedActivity: string
  assignedActivityId: number | null
  assignedActivityStatus: 'Planned' | 'Ongoing' | 'Completed' | 'Absent' | null
  lastCompletedActivityTitle: string
  lastCompletedDate: string | null
  placed: boolean
  assignmentHistory: CDSPAssignment[]
  yearLevel: string
  dateApplicationReceived: string
  receivedBy: string
  status: 'Active' | 'Inactive'
  remarks: string
  attachedDocuments: CDSPSavedDocument[]
}

export interface CdspActivity {
  id: number
  serviceId: number
  service: string
  title: string
  description: string
  date: string
  location: string
  facilitator: string
  participants: number | null
  assignedCount: number
  status: 'Planned' | 'Ongoing' | 'Completed'
  counselor: string
  sessionDuration: string
}

export interface CdspService {
  id: number
  code: string
  name: string
}

export interface CdspProgramInfo {
  code: string
  name: string
}

interface CDSPContextValue {
  applicants: CDSPApplicant[]
  activities: CdspActivity[]
  services: CdspService[]
  programInfo: CdspProgramInfo | null
  loading: boolean
  loadingActivities: boolean
  refreshProfiles: () => Promise<void>
  refreshActivities: () => Promise<void>
  refreshServices: () => Promise<void>
  refreshIfStale: () => Promise<void>
}

const CDSPContext = createContext<CDSPContextValue | null>(null)

// Provides CDSP applicants, activities, and services to the app.
export function CDSPProvider({ children }: { children: ReactNode }) {
  const [applicants, setApplicants] = useState<CDSPApplicant[]>([])
  const [activities, setActivities] = useState<CdspActivity[]>([])
  const [services, setServices] = useState<CdspService[]>([])
  const [programInfo, setProgramInfo] = useState<CdspProgramInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingActivities, setLoadingActivities] = useState(true)

  // Reloads the list of CDSP applicants.
  const refreshProfiles = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await cdspService.listProfiles()
      setApplicants(res.data ?? [])
    } catch {
      // ignore, keep list empty
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  // Reloads the list of CDSP activities.
  const refreshActivities = useCallback(async (silent = false) => {
    if (!silent) setLoadingActivities(true)
    try {
      const res = await cdspService.listActivities()
      setActivities(res.data ?? [])
    } catch {
      // silent
    } finally {
      if (!silent) setLoadingActivities(false)
    }
  }, [])

  // Reloads the list of CDSP services and program info.
  const refreshServices = useCallback(async () => {
    try {
      const res = await cdspService.listCdspServices()
      setServices(res.data ?? [])
      setProgramInfo(res.program ?? null)
    } catch {
      // silent
    }
  }, [])

  const lastLoad = useRef(0)
  // Refreshes applicants, activities, and services, skipping if the last load was too recent.
  const refreshIfStale = useCallback(async () => {
    if (Date.now() - lastLoad.current < REFRESH_GUARD_MS) return
    lastLoad.current = Date.now()
    await Promise.all([refreshProfiles(true), refreshActivities(true), refreshServices()])
  }, [refreshProfiles, refreshActivities, refreshServices])

  useEffect(() => {
    lastLoad.current = Date.now()
    refreshProfiles()
    refreshActivities()
    refreshServices()
  }, [refreshProfiles, refreshActivities, refreshServices])

  return (
    <CDSPContext.Provider value={{ applicants, activities, services, programInfo, loading, loadingActivities, refreshProfiles, refreshActivities, refreshServices, refreshIfStale }}>
      {children}
    </CDSPContext.Provider>
  )
}

// Returns the CDSP context.
export function useCDSP() {
  const ctx = useContext(CDSPContext)
  if (!ctx) throw new Error('useCDSP must be used inside CDSPProvider')
  return ctx
}
