import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import * as cdspService from '../services/cdspService'

export interface CDSPAssignment {
  activityId: number
  activityTitle: string
  assignedDate: string
  completedDate?: string | null
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
  employerName: string
  employmentType: string
  monthlyIncome: string
  serviceAvailed: string
  assignedActivity: string
  assignedActivityId: number | null
  assignmentHistory: CDSPAssignment[]
  careerGoal: string
  coachingType: string
  careerAssessmentResult: string
  targetJob: string
  industriesOfInterest: string[]
  preEmploymentRequirements: string[]
  school: string
  courseProgram: string
  yearLevel: string
  expectedGraduation: string
  applicantSignature: string
  dateSignature: string
  dateApplicationReceived: string
  receivedBy: string
  counselorName: string
  status: 'Active' | 'Inactive'
  remarks: string
  attachedDocuments: { name: string; file: File; url: string }[]
}

export interface CdspActivity {
  id: number
  serviceId: number
  service: string
  program: string
  title: string
  description: string
  date: string
  location: string
  facilitator: string
  participants: number | null
  status: 'Planned' | 'Ongoing' | 'Completed'
  counselor: string
  sessionDuration: string
}

export interface CdspService {
  id: number
  code: string
  name: string
}

interface CDSPContextValue {
  applicants: CDSPApplicant[]
  activities: CdspActivity[]
  services: CdspService[]
  loading: boolean
  loadingActivities: boolean
  refreshProfiles: () => Promise<void>
  refreshActivities: () => Promise<void>
  refreshServices: () => Promise<void>
}

const CDSPContext = createContext<CDSPContextValue | null>(null)

export function CDSPProvider({ children }: { children: ReactNode }) {
  const [applicants, setApplicants] = useState<CDSPApplicant[]>([])
  const [activities, setActivities] = useState<CdspActivity[]>([])
  const [services, setServices] = useState<CdspService[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingActivities, setLoadingActivities] = useState(true)

  const refreshProfiles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await cdspService.listProfiles()
      setApplicants(res.data ?? [])
    } catch {
      // silent — show empty list rather than crashing
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshActivities = useCallback(async () => {
    setLoadingActivities(true)
    try {
      const res = await cdspService.listActivities()
      setActivities(res.data ?? [])
    } catch {
      // silent
    } finally {
      setLoadingActivities(false)
    }
  }, [])

  const refreshServices = useCallback(async () => {
    try {
      const res = await cdspService.listCdspServices()
      setServices(res.data ?? [])
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    refreshProfiles()
    refreshActivities()
    refreshServices()
  }, [refreshProfiles, refreshActivities, refreshServices])

  return (
    <CDSPContext.Provider value={{ applicants, activities, services, loading, loadingActivities, refreshProfiles, refreshActivities, refreshServices }}>
      {children}
    </CDSPContext.Provider>
  )
}

export function useCDSP() {
  const ctx = useContext(CDSPContext)
  if (!ctx) throw new Error('useCDSP must be used inside CDSPProvider')
  return ctx
}
