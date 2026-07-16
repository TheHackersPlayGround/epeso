import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

export interface ProgramActivity {
  id: number
  title: string
  service: string
  date: string
  location: string
  status: 'Planned' | 'Ongoing' | 'Completed' | 'Cancelled'
  assignedOffice?: string
  startDate?: string
  endDate?: string
  allowance?: string
  program?: string
  facilitator?: string
  description?: string
  participants?: number
  counselor?: string
  sessionDuration?: string
  // DILP-specific fields (only present when service === 'DILEEP (DILP)')
  projectIdNumber?: string
  projectName?: string
  typeOfProject?: string
  programComponent?: string
  wayOfImplementation?: string
  region?: string
  province?: string
  cityMunicipality?: string
  barangay?: string
  streetPurok?: string
  // TUPAD-specific fields (only present when service === 'DILEEP (TUPAD)')
  assistanceAmount?: string
  dateReleased?: string
  tupadDocuments?: string[]
  // SLP-specific fields (only present when service === 'SLP')
  slpTrack?: string
  // CLPEP-specific fields (only present when service === 'CLPEP')
  partnerAgency?: string
  partnerAgencyOther?: string
  interventionCategoryOther?: string
}

// Narrowed type for DILP activities — used in the DILP beneficiary form
// to populate the "Assigned Project" dropdown.
export type DILPActivity = ProgramActivity & {
  service: 'DILEEP (DILP)'
  projectIdNumber: string
  projectName: string
  typeOfProject: string
  programComponent: string
  wayOfImplementation: string
}

// Note: DILP/TUPAD no longer seed sample projects here — those programs are
// backend-persisted (dilp_projects/tupad_projects via DILPContext/TUPADContext),
// so fake local entries would just be dead, misleading data.
const SEED: ProgramActivity[] = [
  // ── SLP Projects ──────────────────────────────────────────────────
  {
    id: 301, title: 'Sustainable Livelihood Program - Handicrafts', service: 'SLP',
    date: '2026-03-18', location: 'Community Center, Tangub City', status: 'Ongoing',
    description: 'Livelihood training for handicraft production.',
    projectName: 'Sustainable Livelihood Program - Handicrafts',
    slpTrack: 'Enterprise - Individual',
    facilitator: 'Rosa Garcia', assistanceAmount: '15000', dateReleased: '2026-04-01',
  },
  {
    id: 302, title: 'SLP Food Processing and Packaging', service: 'SLP',
    date: '2026-04-25', location: 'DOLE Training Center, Tangub City', status: 'Planned',
    description: 'Livelihood training for food processing microenterprises.',
    projectName: 'SLP Food Processing and Packaging',
    slpTrack: 'Enterprise - Individual',
    facilitator: 'Maribel Santos', assistanceAmount: '12000', dateReleased: '2026-06-01',
  },
  {
    id: 303, title: 'SLP Sewing and Garments Production', service: 'SLP',
    date: '2026-05-10', location: 'Barangay Hall, Tangub City', status: 'Planned',
    description: 'Skills-based livelihood training on garments and dressmaking.',
    projectName: 'SLP Sewing and Garments Production',
    slpTrack: 'Enterprise - Individual',
    facilitator: 'Leonora Reyes', assistanceAmount: '10000', dateReleased: '2026-06-30',
  },
  {
    id: 6, title: 'Government Internship Program - Batch 1',
    service: 'Government Internship Program (GIP)', date: '2026-01-06',
    location: 'Various City & Municipal Offices, Tangub City', status: 'Completed',
    assignedOffice: 'Various City & Municipal Offices', startDate: '2026-01-06', endDate: '2026-04-06', allowance: '5000',
  },
  {
    id: 7, title: 'Government Internship Program - Batch 2',
    service: 'Government Internship Program (GIP)', date: '2026-04-15',
    location: 'Various City & Municipal Offices, Tangub City', status: 'Planned',
    assignedOffice: 'Various City & Municipal Offices', startDate: '2026-04-15', endDate: '2026-07-15', allowance: '5000',
  },
  {
    id: 8, title: 'Government Internship Program - Batch 3',
    service: 'Government Internship Program (GIP)', date: '2026-07-20',
    location: 'Various City & Municipal Offices, Tangub City', status: 'Planned',
    assignedOffice: 'Various City & Municipal Offices', startDate: '2026-07-20', endDate: '2026-10-20', allowance: '5000',
  },
  {
    id: 9, title: 'Special Program for Employment of Students 2026',
    service: 'Special Program for Employment of Students (SPES)', date: '2026-04-15',
    location: 'Multiple Offices, Tangub City', status: 'Planned',
    assignedOffice: 'Multiple Offices', startDate: '2026-04-15', endDate: '2026-05-15', allowance: '3500',
  },
  {
    id: 10, title: 'SPES Summer Program - Wave 2',
    service: 'Special Program for Employment of Students (SPES)', date: '2026-05-20',
    location: 'DepEd District Office, Tangub City', status: 'Planned',
    assignedOffice: 'DepEd District Office', startDate: '2026-05-20', endDate: '2026-06-20', allowance: '3500',
  },
  {
    id: 11, title: 'Cookery NC II',
    service: 'BATCH-001', date: '2026-04-01',
    location: 'PESO Training Center, Tangub City', status: 'Ongoing',
    program: 'Skills Training', facilitator: 'Lourdes Reyes', participants: 20,
    description: 'TESDA-certified cookery training program',
  },
  {
    id: 12, title: 'Bread & Pastry Production NC II',
    service: 'BATCH-001', date: '2026-04-08',
    location: 'PESO Training Center, Tangub City', status: 'Completed',
    program: 'Skills Training', facilitator: 'Maricel Santos', participants: 25,
    description: 'Professional bread and pastry production course',
  },
  {
    id: 13, title: 'Food & Beverage Services NC II',
    service: 'BATCH-002', date: '2026-04-12',
    location: 'Hotel Training Facility, Ozamiz City', status: 'Planned',
    program: 'Skills Training', facilitator: 'Isabel Navarro', participants: 18,
    description: 'Hospitality and food service training',
  },
  {
    id: 14, title: 'Electrical Installation & Maintenance NC II',
    service: 'BATCH-001', date: '2026-03-18',
    location: 'TESDA Training Center, Tangub City', status: 'Ongoing',
    program: 'Skills Training', facilitator: 'Ramon Cruz', participants: 22,
    description: 'TESDA qualification for electrical work',
  },
  {
    id: 15, title: 'Dressmaking NC II',
    service: 'BATCH-003', date: '2026-05-05',
    location: 'PESO Training Center, Tangub City', status: 'Planned',
    program: 'Skills Training', facilitator: 'Rosario Villanueva', participants: 15,
    description: 'Dressmaking and fashion design certification',
  },
]

interface ActivitiesContextValue {
  activities: ProgramActivity[]
  setActivities: React.Dispatch<React.SetStateAction<ProgramActivity[]>>
  addActivity: (activity: ProgramActivity) => void
  updateActivity: (id: number, activity: ProgramActivity) => void
  deleteActivity: (id: number) => void
  getActivitiesByProgram: (program: string) => ProgramActivity[]
}

const ProgramActivitiesContext = createContext<ActivitiesContextValue | null>(null)

function loadActivities(): ProgramActivity[] {
  try {
    const raw = localStorage.getItem('lp_program_activities_v4')
    if (!raw) return SEED
    const saved = JSON.parse(raw) as ProgramActivity[]
    if (saved.length === 0) return SEED
    const seedById = new Map(SEED.map(s => [s.id, s]))
    return saved.map(stored => {
      const seedEntry = seedById.get(stored.id)
      return seedEntry ? { ...seedEntry, ...stored } : stored
    })
  } catch {
    return SEED
  }
}

export function ProgramActivitiesProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<ProgramActivity[]>(loadActivities)

  useEffect(() => {
    localStorage.setItem('lp_program_activities_v4', JSON.stringify(activities))
  }, [activities])

  const addActivity = (activity: ProgramActivity) =>
    setActivities(prev => [...prev, activity])

  const updateActivity = (id: number, activity: ProgramActivity) =>
    setActivities(prev => prev.map(a => a.id === id ? activity : a))

  const deleteActivity = (id: number) =>
    setActivities(prev => prev.filter(a => a.id !== id))

  const getActivitiesByProgram = (program: string) =>
    activities.filter((a) => a.service.toLowerCase().includes(program.toLowerCase()))

  return (
    <ProgramActivitiesContext.Provider value={{ activities, setActivities, addActivity, updateActivity, deleteActivity, getActivitiesByProgram }}>
      {children}
    </ProgramActivitiesContext.Provider>
  )
}

export function useProgramActivities() {
  const ctx = useContext(ProgramActivitiesContext)
  if (!ctx) throw new Error('useProgramActivities must be used inside ProgramActivitiesProvider')
  return ctx
}
