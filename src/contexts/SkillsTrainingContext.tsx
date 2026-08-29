import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import * as skillsTrainingService from '../services/skillsTrainingService'

export interface SkillsTrainingSavedDocument {
  id: string
  documentType?: string
  customName?: string
  fileName: string
  fileSize: string
  url: string
  dataUrl?: string
}

export interface SkillsTrainingProfile {
  id: number
  beneficiaryServiceId: number
  lastName: string
  firstName: string
  middleName: string
  sex: '' | 'Male' | 'Female'
  birthdate: string
  age: number
  civilStatus: string
  contactNumber: string
  streetPurok: string
  barangay: string
  barangayId: number
  cityMunicipality: string
  province: string
  region: string
  classification: string[]
  classificationOther: string[]
  desiredQualification: string[]
  qualificationOther: string[]
  purposeOfTraining: string[]
  purposeOther: string[]
  assignedTrainingId: number | null
  assignedTrainingTitle: string
  assignedTrainingStatus: 'Planned' | 'Ongoing' | 'Completed' | 'Cancelled' | 'Absent' | null
  lastCompletedTrainingTitle: string
  lastCompletedDate: string | null
  placed: boolean
  dateApplicationReceived: string
  receivedBy: string
  status: 'Pending' | 'Accepted' | 'Waitlisted' | 'Rejected'
  attachedDocuments: SkillsTrainingSavedDocument[]
}

export interface SkillsTrainingBatch {
  id: number
  batchName: string
  description: string
  isActive: boolean
  trainingCount: number
}

export interface SkillsTrainingActivity {
  id: number
  batchId: number
  service: string
  program: string
  title: string
  description: string
  date: string
  location: string
  facilitator: string
  participants: number | null
  assignedCount: number
  // Only meaningful once status is 'Completed' -- attended is still mostly
  // unset for a Planned/Ongoing training, so these read 0/0 until then.
  presentCount: number
  absentCount: number
  status: 'Planned' | 'Ongoing' | 'Completed' | 'Cancelled'
}

export interface SkillsTrainingLookup {
  id: number
  name: string
}

interface SkillsTrainingContextValue {
  profiles: SkillsTrainingProfile[]
  batches: SkillsTrainingBatch[]
  activities: SkillsTrainingActivity[]
  qualifications: SkillsTrainingLookup[]
  purposes: SkillsTrainingLookup[]
  loading: boolean
  loadingBatches: boolean
  loadingActivities: boolean
  refreshProfiles: () => Promise<void>
  refreshBatches: () => Promise<void>
  refreshActivities: () => Promise<void>
  refreshLookups: () => Promise<void>
}

const SkillsTrainingContext = createContext<SkillsTrainingContextValue | null>(null)

export function SkillsTrainingProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<SkillsTrainingProfile[]>([])
  const [batches, setBatches] = useState<SkillsTrainingBatch[]>([])
  const [activities, setActivities] = useState<SkillsTrainingActivity[]>([])
  const [qualifications, setQualifications] = useState<SkillsTrainingLookup[]>([])
  const [purposes, setPurposes] = useState<SkillsTrainingLookup[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingBatches, setLoadingBatches] = useState(true)
  const [loadingActivities, setLoadingActivities] = useState(true)

  const refreshProfiles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await skillsTrainingService.listProfiles()
      setProfiles(res.data ?? [])
    } catch {
      // silent — show empty list rather than crashing
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshBatches = useCallback(async () => {
    setLoadingBatches(true)
    try {
      const res = await skillsTrainingService.listBatches()
      setBatches(res.data ?? [])
    } catch {
      // silent
    } finally {
      setLoadingBatches(false)
    }
  }, [])

  const refreshActivities = useCallback(async () => {
    setLoadingActivities(true)
    try {
      const res = await skillsTrainingService.listActivities()
      setActivities(res.data ?? [])
    } catch {
      // silent
    } finally {
      setLoadingActivities(false)
    }
  }, [])

  const refreshLookups = useCallback(async () => {
    try {
      const [qRes, pRes] = await Promise.all([
        skillsTrainingService.listQualifications(),
        skillsTrainingService.listPurposes(),
      ])
      setQualifications(qRes.data ?? [])
      setPurposes(pRes.data ?? [])
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    refreshProfiles()
    refreshBatches()
    refreshActivities()
    refreshLookups()
  }, [refreshProfiles, refreshBatches, refreshActivities, refreshLookups])

  return (
    <SkillsTrainingContext.Provider value={{
      profiles, batches, activities, qualifications, purposes,
      loading, loadingBatches, loadingActivities,
      refreshProfiles, refreshBatches, refreshActivities, refreshLookups,
    }}>
      {children}
    </SkillsTrainingContext.Provider>
  )
}

export function useSkillsTraining() {
  const ctx = useContext(SkillsTrainingContext)
  if (!ctx) throw new Error('useSkillsTraining must be used inside SkillsTrainingProvider')
  return ctx
}
