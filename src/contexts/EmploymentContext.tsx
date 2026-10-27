import { createContext, useCallback, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { listApplicants } from '../services/applicantService'
import { listVacancies } from '../services/vacancyService'
import { listEmployers, listIndustries, type IndustryOptions } from '../services/employerService'
import { listReferrals } from '../services/referralService'
import { listPlacements } from '../services/placementService'

export type Applicant = {
  id: number;
  name: string;
  gender: string;
  age: number;
  education: string;
  skills: string;
  employmentStatus: string;
  contactNumber: string;
  email: string;
  address: string;
  civilStatus?: string;
  hasDisability?: boolean;
  isOFW?: boolean;
  isFormerOFW?: boolean;
  is4PsBeneficiary?: boolean;
  jobPreference?: string;
  language?: string;
  trainingCourses?: string;
  // Refer-action lock state computed by the backend from referrals/placements:
  // 'Refer' = free, 'Referred' = live referral, 'Hired' = active placement.
  referralState?: 'Refer' | 'Referred' | 'Hired';
  dateApplicationReceived?: string;
  fullFormData?: Record<string, unknown>;
};

export type Employer = {
  id: number
  companyName: string
  industry: string        // the form's dropdown value ("Other" for a custom industry)
  industryOther: string   // the typed name when industry is "Other"
  industryName?: string   // the real industry name, for lists, filters and exports (from the server)
  businessType: string
  tinNumber: string
  contactPersonName: string
  position: string
  contactNumber: string
  email: string
  buildingNo: string
  street: string
  barangay: string
  city: string
  province: string
  region: string
  barangayId?: number | null
  cityId?: number | null
  provinceId?: number | null
  status: 'Active' | 'Inactive'
  dateRegistered: string
  remarks: string
}

export type Vacancy = {
  id: number
  jobTitle: string
  employer: string
  employerId?: number
  vacanciesCount: number      // remaining openings (derived: slotsTotal - active placements)
  slotsTotal?: number         // original openings solicited (source of truth)
  industry: string
  jobType: string
  // Atomic bounds (source of truth); salaryRange is the derived display string.
  salaryMin?: number
  salaryMax?: number
  salaryRange: string
  description: string
  requirements: string
  status: 'Open' | 'Closed'   // effective status (Closed when manually closed OR full)
  manualStatus?: 'Open' | 'Closed'  // officer's open/close intent (drives the toggle)
}

export type Referral = {
  id: number
  applicantId: number
  applicantName: string
  vacancyId: number
  jobTitle: string
  employer: string
  referralDate: string        // ISO date string, e.g. "2026-06-18"
  status: 'Pending' | 'Interviewed' | 'Not Hired'
}

export type Placement = {
  id: number
  applicantId: number
  applicantName: string
  jobTitle: string
  currentJobTitle: string
  employer: string
  dateHired: string
  status: 'Active' | 'Resigned' | 'Terminated' | 'Completed'
  employmentType?: string
  referralId?: number
  vacancyId?: number
  salaryRange?: string
}

// ─── Provider ──────────────────────────────────────────────────────────────────
// Keeps all five lists loaded once and surviving navigation; mutations refresh only the affected list.

type ListKey = 'applicants' | 'vacancies' | 'employers' | 'referrals' | 'placements'

// Re-syncs silently on entering/returning to the module so other staff's changes
// show up; calls within this window of the last refresh are skipped as duplicates.
const REFRESH_GUARD_MS = 2_500

interface EmploymentContextValue {
  applicants: Applicant[]
  vacancies: Vacancy[]
  employers: Employer[]
  // Choices for the industry dropdowns and filters (standard names + custom ones in use).
  industryOptions: IndustryOptions
  referrals: Referral[]
  placements: Placement[]
  // Optimistic local edits (e.g. dropping a referral the moment it's removed)
  // for the tabs that already did that before this became shared state.
  setReferrals: Dispatch<SetStateAction<Referral[]>>
  setPlacements: Dispatch<SetStateAction<Placement[]>>
  setEmployers: Dispatch<SetStateAction<Employer[]>>
  // True only until each list's FIRST load finishes -- later refreshes are
  // silent, so a save never flashes a "Loading..." screen over the table.
  loading: Record<ListKey, boolean>
  // True when the most recent load of that list failed.
  loadFailed: Record<ListKey, boolean>
  refreshApplicants: () => Promise<void>
  refreshVacancies: () => Promise<void>
  refreshEmployers: () => Promise<void>
  refreshReferrals: () => Promise<void>
  refreshPlacements: () => Promise<void>
  refreshAll: () => Promise<void>
  // Runs refreshAll only if the last full refresh is older than REFRESH_GUARD_MS.
  refreshIfStale: () => Promise<void>
}

const EmploymentContext = createContext<EmploymentContextValue | null>(null)

const allTrue = (): Record<ListKey, boolean> => ({ applicants: true, vacancies: true, employers: true, referrals: true, placements: true })
const allFalse = (): Record<ListKey, boolean> => ({ applicants: false, vacancies: false, employers: false, referrals: false, placements: false })

// Provides Employment Facilitation's applicants, vacancies, employers,
// referrals, and placements to the app.
export function EmploymentProvider({ children }: { children: ReactNode }) {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [vacancies, setVacancies] = useState<Vacancy[]>([])
  const [employers, setEmployers] = useState<Employer[]>([])
  const [industryOptions, setIndustryOptions] = useState<IndustryOptions>({ standard: [], custom: [] })
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [placements, setPlacements] = useState<Placement[]>([])
  const [loading, setLoading] = useState<Record<ListKey, boolean>>(allTrue)
  const [loadFailed, setLoadFailed] = useState<Record<ListKey, boolean>>(allFalse)

  // `latest` tracks the id of the most recently started refresh per list -- only
  // that one may write its result, so a slow older response can't overwrite a newer one.
  const latest = useRef<Record<ListKey, number>>({ applicants: 0, vacancies: 0, employers: 0, referrals: 0, placements: 0 })
  // How many refreshes of each list are currently running.
  const inFlight = useRef<Record<ListKey, number>>({ applicants: 0, vacancies: 0, employers: 0, referrals: 0, placements: 0 })
  // Mirror of loadFailed that refreshIfStale can read without re-creating itself.
  const failed = useRef<Record<ListKey, boolean>>(allFalse())
  const lastFullRefresh = useRef(0)

  // Loads one list and applies the result, discarding stale responses.
  const load = useCallback(async <T,>(key: ListKey, fetcher: () => Promise<T[]>, apply: (rows: T[]) => void) => {
    const mine = ++latest.current[key]
    inFlight.current[key]++
    const mayWrite = () => mine === latest.current[key]
    try {
      const rows = await fetcher()
      if (!mayWrite()) return
      apply(rows)
      failed.current[key] = false
      setLoadFailed(prev => (prev[key] ? { ...prev, [key]: false } : prev))
    } catch {
      if (!mayWrite()) return
      failed.current[key] = true
      setLoadFailed(prev => (prev[key] ? prev : { ...prev, [key]: true }))
    } finally {
      inFlight.current[key]--
      // `loading` only tracks the FIRST load, so clear it as soon as the latest
      // request settles -- even if its data was discarded above.
      if (mine === latest.current[key]) setLoading(prev => (prev[key] ? { ...prev, [key]: false } : prev))
    }
  }, [])

  // Reloads the list of applicants.
  const refreshApplicants = useCallback(() => load('applicants', listApplicants, setApplicants), [load])
  // Reloads the list of vacancies.
  const refreshVacancies = useCallback(() => load('vacancies', listVacancies, setVacancies), [load])
  // Reloads the industry dropdown options.
  const refreshIndustries = useCallback(async () => {
    try { setIndustryOptions(await listIndustries()) } catch { /* keep the previous choices */ }
  }, [])
  // Reloads the list of employers and their industry options.
  const refreshEmployers = useCallback(async () => {
    await Promise.all([load('employers', listEmployers, setEmployers), refreshIndustries()])
  }, [load, refreshIndustries])
  // Reloads the list of referrals.
  const refreshReferrals = useCallback(() => load('referrals', listReferrals, setReferrals), [load])
  // Reloads the list of placements.
  const refreshPlacements = useCallback(() => load('placements', listPlacements, setPlacements), [load])

  // Applies an optimistic referral edit, then re-syncs if a refresh was in flight.
  const setReferralsOptimistic = useCallback<Dispatch<SetStateAction<Referral[]>>>(value => {
    const pending = inFlight.current.referrals > 0
    setReferrals(value)
    if (pending) void refreshReferrals()
  }, [refreshReferrals])
  // Applies an optimistic placement edit, then re-syncs if a refresh was in flight.
  const setPlacementsOptimistic = useCallback<Dispatch<SetStateAction<Placement[]>>>(value => {
    const pending = inFlight.current.placements > 0
    setPlacements(value)
    if (pending) void refreshPlacements()
  }, [refreshPlacements])
  // Applies an optimistic employer edit, then re-syncs if a refresh was in flight.
  const setEmployersOptimistic = useCallback<Dispatch<SetStateAction<Employer[]>>>(value => {
    const pending = inFlight.current.employers > 0
    setEmployers(value)
    if (pending) void refreshEmployers()
  }, [refreshEmployers])

  // Reloads every list.
  const refreshAll = useCallback(async () => {
    lastFullRefresh.current = Date.now()
    await Promise.all([refreshApplicants(), refreshVacancies(), refreshEmployers(), refreshReferrals(), refreshPlacements()])
  }, [refreshApplicants, refreshVacancies, refreshEmployers, refreshReferrals, refreshPlacements])

  // Reloads every list, skipping if a recent refresh succeeded.
  const refreshIfStale = useCallback(async () => {
    const anyFailed = Object.values(failed.current).some(Boolean)
    if (!anyFailed && Date.now() - lastFullRefresh.current < REFRESH_GUARD_MS) return
    await refreshAll()
  }, [refreshAll])

  useEffect(() => { void refreshAll() }, [refreshAll])

  return (
    <EmploymentContext.Provider value={{
      applicants, vacancies, employers, industryOptions, referrals, placements,
      setReferrals: setReferralsOptimistic, setPlacements: setPlacementsOptimistic, setEmployers: setEmployersOptimistic,
      loading, loadFailed,
      refreshApplicants, refreshVacancies, refreshEmployers, refreshReferrals, refreshPlacements,
      refreshAll, refreshIfStale,
    }}>
      {children}
    </EmploymentContext.Provider>
  )
}

// Returns the Employment context.
export function useEmployment() {
  const ctx = useContext(EmploymentContext)
  if (!ctx) throw new Error('useEmployment must be used inside EmploymentProvider')
  return ctx
}
