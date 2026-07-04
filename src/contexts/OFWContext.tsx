import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export interface OFWAttachment {
  name: string
  fileName: string
  fileData?: string  // base64 data URL — only present when uploaded in-session
}

export interface OFWProfile {
  id: number
  referenceNumber: string
  name: string
  contactNumber: string
  email: string
  address: string
  barangay: string
  municipality: string
  province: string
  dateFiled: string
  employmentStatus: string
  typeOfRequest: string[]
  status: 'Pending' | 'Ongoing' | 'Approved' | 'Completed' | 'Rejected'
  remarks: string
  // Employment referral sub-panel
  desiredPosition?: string
  typeOfSkill?: string
  agencies?: string[]
  // "please specify" free-text sub-panels
  inquirySpecify?: string
  otherProgramSpecify?: string
  // OWWA Welfare Case attachment
  owwaWelfareFile?: OFWAttachment
  // Livelihood ELPOR form attachments
  elporFiles?: Record<string, OFWAttachment>
  // PESO Office Only
  dateApplicationReceived?: string
  receivedBy?: string
  attachedDocuments?: OFWAttachment[]
}

const SEED: OFWProfile[] = [
  {
    id: 1, referenceNumber: 'OFW-2026-00001',
    name: 'Santos, Maria L.', contactNumber: '09171234501', email: 'maria.santos@email.com',
    address: 'Purok 2, Sunrise St.', barangay: 'Poblacion', municipality: 'Tangub City', province: 'Misamis Occidental',
    dateFiled: '2026-01-10', employmentStatus: 'Repatriated',
    typeOfRequest: ['Livelihood Assistance'],
    status: 'Pending', remarks: '',
  },
  {
    id: 2, referenceNumber: 'OFW-2026-00002',
    name: 'Reyes, Juan P.', contactNumber: '09181234502', email: '',
    address: 'Purok 5, Bagong Silang', barangay: 'Mantic', municipality: 'Tangub City', province: 'Misamis Occidental',
    dateFiled: '2026-01-15', employmentStatus: 'Distressed',
    typeOfRequest: ['Legal Assistance', 'OWWA Benefits'],
    status: 'Ongoing', remarks: 'Coordinating with OWWA regional office',
  },
  {
    id: 3, referenceNumber: 'OFW-2026-00003',
    name: 'Cruz, Elena M.', contactNumber: '09191234503', email: 'elena.cruz@email.com',
    address: 'Blk 3, Lot 5, Maharlika St.', barangay: 'Maloro', municipality: 'Tangub City', province: 'Misamis Occidental',
    dateFiled: '2026-02-05', employmentStatus: 'Employed Abroad',
    typeOfRequest: ['Document Assistance'],
    status: 'Approved', remarks: 'OEC processed',
  },
  {
    id: 4, referenceNumber: 'OFW-2026-00004',
    name: 'Dela Cruz, Roberto K.', contactNumber: '09201234504', email: '',
    address: 'Purok 1, Mapayapa', barangay: 'Panalsalan', municipality: 'Tangub City', province: 'Misamis Occidental',
    dateFiled: '2026-02-12', employmentStatus: 'Repatriated',
    typeOfRequest: ['Livelihood Assistance', 'Skills Training'],
    status: 'Completed', remarks: 'Enrolled in TESDA welding course',
  },
  {
    id: 5, referenceNumber: 'OFW-2026-00005',
    name: 'Garcia, Ana R.', contactNumber: '09211234505', email: 'ana.garcia@email.com',
    address: 'Purok 3, Rizal St.', barangay: 'Sta. Cruz', municipality: 'Tangub City', province: 'Misamis Occidental',
    dateFiled: '2026-02-20', employmentStatus: 'Unemployed',
    typeOfRequest: ['Livelihood Assistance'],
    status: 'Pending', remarks: '',
  },
  {
    id: 6, referenceNumber: 'OFW-2026-00006',
    name: 'Bautista, Carlos T.', contactNumber: '09221234506', email: '',
    address: 'Zone 4, Burgos St.', barangay: 'Bocator', municipality: 'Tangub City', province: 'Misamis Occidental',
    dateFiled: '2026-03-01', employmentStatus: 'Repatriated',
    typeOfRequest: ['OWWA Benefits', 'Medical Assistance'],
    status: 'Ongoing', remarks: 'Medical evaluation scheduled',
  },
  {
    id: 7, referenceNumber: 'OFW-2026-00007',
    name: 'Fernandez, Rosa G.', contactNumber: '09231234507', email: 'rosa.fernandez@email.com',
    address: 'Purok 6, Landless', barangay: 'Biasong', municipality: 'Tangub City', province: 'Misamis Occidental',
    dateFiled: '2026-03-08', employmentStatus: 'Distressed',
    typeOfRequest: ['Repatriation Assistance', 'Legal Assistance'],
    status: 'Rejected', remarks: 'Ineligible — documents not complete',
  },
  {
    id: 8, referenceNumber: 'OFW-2026-00008',
    name: 'Ramos, Pedro N.', contactNumber: '09241234508', email: '',
    address: 'Purok 4, New Village', barangay: 'Migcanaway', municipality: 'Tangub City', province: 'Misamis Occidental',
    dateFiled: '2026-03-15', employmentStatus: 'Employed Abroad',
    typeOfRequest: ['Document Assistance', 'OWWA Benefits'],
    status: 'Completed', remarks: 'All documents released',
  },
  {
    id: 9, referenceNumber: 'OFW-2026-00009',
    name: 'Mendoza, Luisa C.', contactNumber: '09251234509', email: 'luisa.mendoza@email.com',
    address: 'Purok 2, Dalisay', barangay: 'Silongon', municipality: 'Tangub City', province: 'Misamis Occidental',
    dateFiled: '2026-04-02', employmentStatus: 'Repatriated',
    typeOfRequest: ['Livelihood Assistance'],
    status: 'Pending', remarks: '',
  },
  {
    id: 10, referenceNumber: 'OFW-2026-00010',
    name: 'Torres, Benjamin S.', contactNumber: '09261234510', email: '',
    address: 'Zone 2, Camia St.', barangay: 'Bongabong', municipality: 'Tangub City', province: 'Misamis Occidental',
    dateFiled: '2026-04-10', employmentStatus: 'Unemployed',
    typeOfRequest: ['Skills Training'],
    status: 'Ongoing', remarks: 'Referred to TESDA for assessment',
  },
]

interface OFWContextValue {
  profiles: OFWProfile[]
  setProfiles: React.Dispatch<React.SetStateAction<OFWProfile[]>>
}

const OFWContext = createContext<OFWContextValue | null>(null)

export function OFWProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<OFWProfile[]>(SEED)
  return <OFWContext.Provider value={{ profiles, setProfiles }}>{children}</OFWContext.Provider>
}

export function useOFW() {
  const ctx = useContext(OFWContext)
  if (!ctx) throw new Error('useOFW must be used inside OFWProvider')
  return ctx
}
