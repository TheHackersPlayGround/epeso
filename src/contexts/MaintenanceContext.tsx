import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { PROGRAM_SERVICES } from '../config/programServices'

interface MaintenanceContextValue {
  services: Record<string, string[]>
  setServices: React.Dispatch<React.SetStateAction<Record<string, string[]>>>
}

const MaintenanceContext = createContext<MaintenanceContextValue | null>(null)

export function MaintenanceProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<Record<string, string[]>>({ ...PROGRAM_SERVICES })
  return (
    <MaintenanceContext.Provider value={{ services, setServices }}>
      {children}
    </MaintenanceContext.Provider>
  )
}

export function useMaintenance() {
  const ctx = useContext(MaintenanceContext)
  if (!ctx) throw new Error('useMaintenance must be used inside MaintenanceProvider')
  return ctx
}
