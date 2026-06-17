import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export interface ProgramActivity {
  id: number
  title: string
  service: string
  date: string
  location: string
  status: 'Planned' | 'Ongoing' | 'Completed'
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
}

const SEED: ProgramActivity[] = [
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

export function ProgramActivitiesProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<ProgramActivity[]>(SEED)

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
