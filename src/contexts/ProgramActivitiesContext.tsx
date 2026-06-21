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
  beneficiaryType?: 'Individual' | 'Group'
  tupadDocuments?: string[]
  // SLP-specific fields (only present when service === 'SLP')
  slpTrack?: string
  projectCategory?: string
  // CLPEP-specific fields (only present when service === 'CLPEP')
  partnerAgency?: string
  referralRequired?: 'Yes' | 'No'
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

const SEED: ProgramActivity[] = [
  // ── DILP Projects ─────────────────────────────────────────────────
  {
    id: 101, title: 'DILP Road Clearing Project 2026', service: 'DILEEP (DILP)',
    date: '2026-01-10', location: 'Tangub City, Misamis Occidental', status: 'Ongoing',
    projectIdNumber: 'DILP-2026-001', projectName: 'Road Clearing Project',
    typeOfProject: 'Group', programComponent: 'Formation', wayOfImplementation: 'ACP',
    region: 'Region X (Northern Mindanao)', province: 'Misamis Occidental',
    cityMunicipality: 'Tangub City', barangay: 'Poblacion', streetPurok: 'National Highway',
    assistanceAmount: '45000', dateReleased: '2026-02-15',
  },
  {
    id: 102, title: 'DILP Community Clean-up Drive 2026', service: 'DILEEP (DILP)',
    date: '2026-02-01', location: 'Tangub City, Misamis Occidental', status: 'Completed',
    projectIdNumber: 'DILP-2026-002', projectName: 'Community Clean-up Drive',
    typeOfProject: 'Group', programComponent: 'Enhancement', wayOfImplementation: 'ACP',
    region: 'Region X (Northern Mindanao)', province: 'Misamis Occidental',
    cityMunicipality: 'Tangub City', barangay: 'Mantic', streetPurok: 'Purok 3',
    assistanceAmount: '30000', dateReleased: '2026-03-15',
  },
  {
    id: 103, title: 'DILP Drainage Improvement Project 2026', service: 'DILEEP (DILP)',
    date: '2026-03-15', location: 'Tangub City, Misamis Occidental', status: 'Planned',
    projectIdNumber: 'DILP-2026-003', projectName: 'Drainage Improvement Project',
    typeOfProject: 'Group', programComponent: 'Restoration', wayOfImplementation: 'ACP',
    region: 'Region X (Northern Mindanao)', province: 'Misamis Occidental',
    cityMunicipality: 'Tangub City', barangay: 'Pangabuan', streetPurok: 'Riverside Road',
    assistanceAmount: '60000',
  },
  {
    id: 105, title: 'Vegetable Production Project 2026', service: 'DILEEP (DILP)',
    date: '2026-04-01', location: 'Tangub City, Misamis Occidental', status: 'Ongoing',
    projectIdNumber: 'DILP-2026-005', projectName: 'Vegetable Production Project',
    typeOfProject: 'Individual', programComponent: 'Enhancement', wayOfImplementation: 'ACP',
    region: 'Region X (Northern Mindanao)', province: 'Misamis Occidental',
    cityMunicipality: 'Tangub City', barangay: 'Maloro', streetPurok: 'Purok 2',
    assistanceAmount: '35000', dateReleased: '2026-05-01',
  },
  {
    id: 104, title: 'Hog Raising Livelihood Project 2026', service: 'DILEEP (DILP)',
    date: '2026-03-01', location: 'Tangub City, Misamis Occidental', status: 'Ongoing',
    projectIdNumber: 'DILP-2026-004', projectName: 'Hog Raising Livelihood Project',
    typeOfProject: 'Group', programComponent: 'Formation', wayOfImplementation: 'Direct Admin',
    region: 'Region X (Northern Mindanao)', province: 'Misamis Occidental',
    cityMunicipality: 'Tangub City', barangay: 'Sta. Cruz', streetPurok: 'Purok 5',
    assistanceAmount: '80000', dateReleased: '2026-04-10',
  },
  // ── SLP Projects ──────────────────────────────────────────────────
  {
    id: 301, title: 'Sustainable Livelihood Program - Handicrafts', service: 'SLP',
    date: '2026-03-18', location: 'Community Center, Tangub City', status: 'Ongoing',
    description: 'Livelihood training for handicraft production.',
    projectName: 'Sustainable Livelihood Program - Handicrafts',
    slpTrack: 'Micro-enterprise Development', projectCategory: 'Non-Food Based Enterprise',
    facilitator: 'Rosa Garcia', assistanceAmount: '15000', dateReleased: '2026-04-01',
  },
  {
    id: 302, title: 'SLP Food Processing and Packaging', service: 'SLP',
    date: '2026-04-25', location: 'DOLE Training Center, Tangub City', status: 'Planned',
    description: 'Livelihood training for food processing microenterprises.',
    projectName: 'SLP Food Processing and Packaging',
    slpTrack: 'Micro-enterprise Development', projectCategory: 'Food Production',
    facilitator: 'Maribel Santos', assistanceAmount: '12000', dateReleased: '2026-06-01',
  },
  {
    id: 303, title: 'SLP Sewing and Garments Production', service: 'SLP',
    date: '2026-05-10', location: 'Barangay Hall, Tangub City', status: 'Planned',
    description: 'Skills-based livelihood training on garments and dressmaking.',
    projectName: 'SLP Sewing and Garments Production',
    slpTrack: 'Micro-enterprise Development', projectCategory: 'Non-Food Based Enterprise',
    facilitator: 'Leonora Reyes', assistanceAmount: '10000', dateReleased: '2026-06-30',
  },
  // ── TUPAD Projects ────────────────────────────────────────────────
  {
    id: 204, title: 'TUPAD Road Maintenance and Repair', service: 'DILEEP (TUPAD)',
    date: '2026-04-15', location: 'Barangay Road Network, Tangub City', status: 'Ongoing',
    description: 'Emergency employment for road infrastructure maintenance',
    facilitator: 'Ricardo Santos', participants: 40,
    assistanceAmount: '4500', dateReleased: '2026-04-20', beneficiaryType: 'Group',
  },
  {
    id: 201, title: 'TUPAD Disaster Preparedness and Response Team', service: 'DILEEP (TUPAD)',
    date: '2026-06-05', location: 'Disaster-Prone Areas, Tangub City', status: 'Planned',
    description: 'Emergency employment for disaster risk reduction and preparedness activities.',
    facilitator: 'Mario Santos', participants: 25,
    assistanceAmount: '3500', dateReleased: '2026-07-01', beneficiaryType: 'Group',
  },
  {
    id: 202, title: 'TUPAD Cemetery and Memorial Park Maintenance', service: 'DILEEP (TUPAD)',
    date: '2026-04-10', location: 'Public Cemetery, Tangub City', status: 'Ongoing',
    description: 'Temporary employment for cemetery upkeep and landscaping.',
    facilitator: 'Luisa Reyes', participants: 30,
    assistanceAmount: '4000', dateReleased: '2026-04-20', beneficiaryType: 'Group',
  },
  {
    id: 203, title: 'TUPAD Street Cleaning and Beautification', service: 'DILEEP (TUPAD)',
    date: '2026-05-15', location: 'Main Streets, Tangub City', status: 'Planned',
    description: 'Temporary employment for street cleaning and urban beautification.',
    facilitator: 'Pedro Cruz', participants: 35,
    assistanceAmount: '3800', dateReleased: '2026-06-01', beneficiaryType: 'Group',
  },
  { id: 1, program: 'CDSP', title: 'Career Coaching Batch 1 – March 2026', service: 'Career Coaching', date: '2026-03-10', startDate: '2026-03-10', endDate: '2026-03-28', location: 'PESO Main Office, Tangub City', facilitator: 'Engr. Lito Reyes', participants: 20, status: 'Planned', description: 'Career coaching batch for fresh graduates and unemployed individuals seeking career direction.' },
  { id: 2, program: 'CDSP', title: 'LEGS Orientation – March 2026', service: 'Labor Employment for Graduating Students', date: '2026-03-15', startDate: '2026-03-15', endDate: '2026-03-15', location: 'PESO Main Office, Tangub City', facilitator: 'Ms. Santos', participants: 30, status: 'Planned', description: 'Orientation for graduating students on labor employment opportunities and requirements.' },
  { id: 3, program: 'CDSP', title: 'Pre-Employment Coaching – April 2026', service: 'Pre-Employment Coaching', date: '2026-04-05', startDate: '2026-04-05', endDate: '2026-04-19', location: 'PESO Main Office, Tangub City', facilitator: 'Mr. Cruz', participants: 25, status: 'Planned', description: 'Pre-employment coaching covering resume writing, interview skills, and job application techniques.' },
  { id: 4, program: 'CDSP', title: 'LEGS Orientation – April 2026', service: 'Labor Employment for Graduating Students', date: '2026-04-15', startDate: '2026-04-15', endDate: '2026-04-15', location: 'Tangub City College, Main Hall', facilitator: 'Ms. Santos', participants: 45, status: 'Planned', description: 'Second batch orientation for graduating students preparing to enter the workforce.' },
  { id: 5, program: 'CDSP', title: 'Career Coaching Batch 2 – May 2026', service: 'Career Coaching', date: '2026-05-08', startDate: '2026-05-08', endDate: '2026-05-22', location: 'PESO Main Office, Tangub City', facilitator: 'Engr. Lito Reyes', participants: 20, status: 'Planned', description: 'Second career coaching batch focusing on career path planning and goal setting.' },
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
    const raw = localStorage.getItem('lp_program_activities_v1')
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
    localStorage.setItem('lp_program_activities_v1', JSON.stringify(activities))
  }, [activities])

  const addActivity = (activity: ProgramActivity) =>
    setActivities(prev => [...prev, activity])

  const updateActivity = (id: number, activity: ProgramActivity) =>
    setActivities(prev => prev.map(a => a.id === id ? activity : a))

  const deleteActivity = (id: number) =>
    setActivities(prev => prev.filter(a => a.id !== id))

  const CDSP_SEED_SERVICES = ['Career Coaching', 'Pre-Employment Coaching', 'Labor Employment for Graduating Students']
  const getActivitiesByProgram = (program: string) => {
    if (program === 'CDSP') {
      return activities.filter(a => a.program === 'CDSP' || CDSP_SEED_SERVICES.includes(a.service))
    }
    return activities.filter((a) => a.service.toLowerCase().includes(program.toLowerCase()))
  }

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
