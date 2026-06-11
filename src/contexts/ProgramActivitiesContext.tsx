import { createContext, useContext, useState, ReactNode } from 'react'

export interface ProgramActivity {
  id: number
  title: string
  service: string
  date: string
  location: string
  status: 'Planned' | 'Ongoing' | 'Completed'
}

const SEED: ProgramActivity[] = [
  { id: 1, title: 'Career Coaching Batch 1 – March 2026', service: 'Career Coaching', date: '2026-03-10', location: 'PESO Office, Tangub City', status: 'Planned' },
  { id: 2, title: 'LEGS Orientation – March 2026', service: 'Labor Employment for Graduating Students', date: '2026-03-15', location: 'PESO Office, Tangub City', status: 'Planned' },
  { id: 3, title: 'Pre-Employment Coaching – April 2026', service: 'Pre-Employment Coaching', date: '2026-04-05', location: 'PESO Office, Tangub City', status: 'Planned' },
  { id: 4, title: 'LEGS Orientation – April 2026', service: 'Labor Employment for Graduating Students', date: '2026-04-12', location: 'PESO Office, Tangub City', status: 'Planned' },
  { id: 5, title: 'Career Coaching Batch 2 – May 2026', service: 'Career Coaching', date: '2026-05-08', location: 'PESO Office, Tangub City', status: 'Planned' },
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
