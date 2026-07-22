import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import * as ofwService from '../services/ofwService'

export interface OFWSavedAttachment {
  id: string
  name: string
  fileName: string
  fileSize: string
  url: string
  dataUrl?: string  // only present when a fresh file was picked in-session, not yet saved
}

export interface OFWProfile {
  id: number
  beneficiaryServiceId: number
  referenceNumber: string
  lastName: string
  firstName: string
  middleName: string
  suffix: string
  name: string
  sex: '' | 'Male' | 'Female'
  birthdate: string
  civilStatus: string
  contactNumber: string
  email: string
  address: string
  barangay: string
  barangayId: number
  municipality: string
  province: string
  region: string
  dateFiled: string
  employmentStatus: string
  typeOfRequest: string[]
  status: 'Pending' | 'Approved' | 'Ongoing' | 'Completed' | 'Rejected'
  remarks: string
  // Employment referral sub-panel
  desiredPosition?: string
  typeOfSkill?: string
  agencies?: string[]
  // "please specify" free-text sub-panels
  inquirySpecify?: string
  otherProgramSpecify?: string
  // OWWA Welfare Case attachment
  owwaWelfareFile?: OFWSavedAttachment | null
  // Livelihood ELPOR form attachments, keyed by form name (e.g. "ELPOR Form A")
  elporFiles?: Record<string, OFWSavedAttachment>
  // PESO Office Only
  dateApplicationReceived?: string
  receivedBy?: string
  attachedDocuments?: OFWSavedAttachment[]
}

export interface OFWRequestType {
  id: number
  name: string
}

interface OFWContextValue {
  profiles: OFWProfile[]
  requestTypes: OFWRequestType[]
  loading: boolean
  refreshProfiles: () => Promise<void>
  refreshRequestTypes: () => Promise<void>
}

const OFWContext = createContext<OFWContextValue | null>(null)

export function OFWProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<OFWProfile[]>([])
  const [requestTypes, setRequestTypes] = useState<OFWRequestType[]>([])
  const [loading, setLoading] = useState(true)

  const refreshProfiles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await ofwService.listProfiles()
      setProfiles(res.data ?? [])
    } catch {
      // silent — show empty list rather than crashing
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshRequestTypes = useCallback(async () => {
    try {
      const res = await ofwService.listRequestTypes()
      setRequestTypes(res.data ?? [])
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    refreshProfiles()
    refreshRequestTypes()
  }, [refreshProfiles, refreshRequestTypes])

  return (
    <OFWContext.Provider value={{ profiles, requestTypes, loading, refreshProfiles, refreshRequestTypes }}>
      {children}
    </OFWContext.Provider>
  )
}

export function useOFW() {
  const ctx = useContext(OFWContext)
  if (!ctx) throw new Error('useOFW must be used inside OFWProvider')
  return ctx
}
