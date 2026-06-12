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
}

const SEED: ProgramActivity[] = [
  { id: 1, title: 'Career Coaching Batch 1 – March 2026', service: 'Career Coaching', date: '2026-03-10', location: 'PESO Office, Tangub City', status: 'Planned' },
  { id: 2, title: 'LEGS Orientation – March 2026', service: 'Labor Employment for Graduating Students', date: '2026-03-15', location: 'PESO Office, Tangub City', status: 'Planned' },
  { id: 3, title: 'Pre-Employment Coaching – April 2026', service: 'Pre-Employment Coaching', date: '2026-04-05', location: 'PESO Office, Tangub City', status: 'Planned' },
  { id: 4, title: 'LEGS Orientation – April 2026', service: 'Labor Employment for Graduating Students', date: '2026-04-12', location: 'PESO Office, Tangub City', status: 'Planned' },
  { id: 5, title: 'Career Coaching Batch 2 – May 2026', service: 'Career Coaching', date: '2026-05-08', location: 'PESO Office, Tangub City', status: 'Planned' },
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
]

interface ActivitiesContextValue {
  activities: ProgramActivity[]
  setActivities: React.Dispatch<React.SetStateAction<ProgramActivity[]>>
  getActivitiesByProgram: (program: string) => ProgramActivity[]
}

const ProgramActivitiesContext = createContext<ActivitiesContextValue | null>(null)

export function ProgramActivitiesProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<ProgramActivity[]>(SEED)

  const getActivitiesByProgram = (program: string) =>
    activities.filter((a) => a.service.toLowerCase().includes(program.toLowerCase()) || program === 'CDSP')

  return (
    <ProgramActivitiesContext.Provider value={{ activities, setActivities, getActivitiesByProgram }}>
      {children}
    </ProgramActivitiesContext.Provider>
  )
}

export function useProgramActivities() {
  const ctx = useContext(ProgramActivitiesContext)
  if (!ctx) throw new Error('useProgramActivities must be used inside ProgramActivitiesProvider')
  return ctx
}
