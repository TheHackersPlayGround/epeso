import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { REFRESH_GUARD_MS } from '../hooks/useRefreshOnReturn'
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
  refreshIfStale: () => Promise<void>
}

const OFWContext = createContext<OFWContextValue | null>(null)

export function OFWProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<OFWProfile[]>([])
  const [requestTypes, setRequestTypes] = useState<OFWRequestType[]>([])
  const [loading, setLoading] = useState(true)

  const refreshProfiles = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await ofwService.listProfiles()
      setProfiles(res.data ?? [])
    } catch {
      // silent — show empty list rather than crashing
    } finally {
      if (!silent) setLoading(false)
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

  // Re-fetch (silently: no spinner, so an open form is never replaced) every
  // time the module is opened or the window regains focus, so other staff
  // members' changes show up. A call within REFRESH_GUARD_MS of the previous
  // one is skipped: it is the same user action firing several triggers.
  const lastLoad = useRef(0) // set when the initial load starts (below)
  const refreshIfStale = useCallback(async () => {
    if (Date.now() - lastLoad.current < REFRESH_GUARD_MS) return
    lastLoad.current = Date.now()
    await Promise.all([refreshProfiles(true), refreshRequestTypes()])
  }, [refreshProfiles, refreshRequestTypes])

  useEffect(() => {
    lastLoad.current = Date.now()
    refreshProfiles()
    refreshRequestTypes()
  }, [refreshProfiles, refreshRequestTypes])

  return (
    <OFWContext.Provider value={{ profiles, requestTypes, loading, refreshProfiles, refreshRequestTypes, refreshIfStale }}>
      {children}
    </OFWContext.Provider>
  )
}

export function useOFW() {
  const ctx = useContext(OFWContext)
  if (!ctx) throw new Error('useOFW must be used inside OFWProvider')
  return ctx
}
