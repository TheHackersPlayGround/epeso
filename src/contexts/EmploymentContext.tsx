import { createContext, useCallback, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { listApplicants } from '../services/applicantService'
import { listVacancies } from '../services/vacancyService'
import { listEmployers } from '../services/employerService'
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
  industry: string
  industryOther: string
  companySize: string
  businessType: string
  yearsInOperation: string
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
// Employment Facilitation used to keep all five of its lists (applicants,
// vacancies, referrals, placements, employers) inside the page and its tabs,
// so leaving the module threw them away and re-entering refetched everything
// behind a "Loading..." screen -- unlike every other program, whose data lives
// in a provider mounted once at the app root (see App.tsx). Same fix here: the
// lists load once, survive navigation, and every mutation refreshes whichever
// lists it can affect (see the refresh calls in the tabs) instead of relying on
// a fresh fetch at re-entry.

type ListKey = 'applicants' | 'vacancies' | 'employers' | 'referrals' | 'placements'

// How old the provider's copy can be before entering the module triggers a
// silent full revalidation (so another staff member's changes still show up).
const STALE_AFTER_MS = 30_000

interface EmploymentContextValue {
  applicants: Applicant[]
  vacancies: Vacancy[]
  employers: Employer[]
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
  // Runs refreshAll only if the last full refresh is older than STALE_AFTER_MS.
  refreshIfStale: () => Promise<void>
}

const EmploymentContext = createContext<EmploymentContextValue | null>(null)

const allTrue = (): Record<ListKey, boolean> => ({ applicants: true, vacancies: true, employers: true, referrals: true, placements: true })
const allFalse = (): Record<ListKey, boolean> => ({ applicants: false, vacancies: false, employers: false, referrals: false, placements: false })

export function EmploymentProvider({ children }: { children: ReactNode }) {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [vacancies, setVacancies] = useState<Vacancy[]>([])
  const [employers, setEmployers] = useState<Employer[]>([])
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [placements, setPlacements] = useState<Placement[]>([])
  const [loading, setLoading] = useState<Record<ListKey, boolean>>(allTrue)
  const [loadFailed, setLoadFailed] = useState<Record<ListKey, boolean>>(allFalse)

  // Per-list request bookkeeping: `latest` is the id of the most recently
  // STARTED refresh, and only that one may write its result -- so a slow older
  // response can never overwrite a newer one.
  const latest = useRef<Record<ListKey, number>>({ applicants: 0, vacancies: 0, employers: 0, referrals: 0, placements: 0 })
  // How many refreshes of each list are currently running.
  const inFlight = useRef<Record<ListKey, number>>({ applicants: 0, vacancies: 0, employers: 0, referrals: 0, placements: 0 })
  // Mirror of loadFailed that refreshIfStale can read without re-creating itself.
  const failed = useRef<Record<ListKey, boolean>>(allFalse())
  const lastFullRefresh = useRef(0)

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

  const refreshApplicants = useCallback(() => load('applicants', listApplicants, setApplicants), [load])
  const refreshVacancies = useCallback(() => load('vacancies', listVacancies, setVacancies), [load])
  const refreshEmployers = useCallback(() => load('employers', listEmployers, setEmployers), [load])
  const refreshReferrals = useCallback(() => load('referrals', listReferrals, setReferrals), [load])
  const refreshPlacements = useCallback(() => load('placements', listPlacements, setPlacements), [load])

  // The setters handed to the tabs for optimistic edits (e.g. dropping a row
  // the moment it's deleted). A refresh already in flight when the edit happens
  // started BEFORE it, so its response could land afterwards and undo the edit
  // (a removed row reappearing) -- and it may also carry other changes made a
  // moment earlier. So if one is running, start a fresh fetch right after the
  // edit: it supersedes the older one (see `latest`) and reflects both.
  const setReferralsOptimistic = useCallback<Dispatch<SetStateAction<Referral[]>>>(value => {
    const pending = inFlight.current.referrals > 0
    setReferrals(value)
    if (pending) void refreshReferrals()
  }, [refreshReferrals])
  const setPlacementsOptimistic = useCallback<Dispatch<SetStateAction<Placement[]>>>(value => {
    const pending = inFlight.current.placements > 0
    setPlacements(value)
    if (pending) void refreshPlacements()
  }, [refreshPlacements])
  const setEmployersOptimistic = useCallback<Dispatch<SetStateAction<Employer[]>>>(value => {
    const pending = inFlight.current.employers > 0
    setEmployers(value)
    if (pending) void refreshEmployers()
  }, [refreshEmployers])

  const refreshAll = useCallback(async () => {
    lastFullRefresh.current = Date.now()
    await Promise.all([refreshApplicants(), refreshVacancies(), refreshEmployers(), refreshReferrals(), refreshPlacements()])
  }, [refreshApplicants, refreshVacancies, refreshEmployers, refreshReferrals, refreshPlacements])

  // A list whose last load FAILED is always retried on entry, however recent
  // the last full refresh was -- otherwise a hiccup at login would leave it
  // empty for the next 30 s (the old per-tab fetch always retried on entry).
  const refreshIfStale = useCallback(async () => {
    const anyFailed = Object.values(failed.current).some(Boolean)
    if (!anyFailed && Date.now() - lastFullRefresh.current < STALE_AFTER_MS) return
    await refreshAll()
  }, [refreshAll])

  useEffect(() => { void refreshAll() }, [refreshAll])

  return (
    <EmploymentContext.Provider value={{
      applicants, vacancies, employers, referrals, placements,
      setReferrals: setReferralsOptimistic, setPlacements: setPlacementsOptimistic, setEmployers: setEmployersOptimistic,
      loading, loadFailed,
      refreshApplicants, refreshVacancies, refreshEmployers, refreshReferrals, refreshPlacements,
      refreshAll, refreshIfStale,
    }}>
      {children}
    </EmploymentContext.Provider>
  )
}

export function useEmployment() {
  const ctx = useContext(EmploymentContext)
  if (!ctx) throw new Error('useEmployment must be used inside EmploymentProvider')
  return ctx
}
