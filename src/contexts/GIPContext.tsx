import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export interface GIPAssignmentHistory {
  batchId: number
  batchName: string
  assignedDate: string
  completedDate?: string
}

export interface GIPApplicant {
  id: number
  lastName: string
  firstName: string
  middleName: string
  sex: '' | 'Male' | 'Female'
  birthdate: string
  age: number
  civilStatus: string
  contactNumber: string
  email: string
  streetPurok: string
  barangay: string
  cityMunicipality: string
  province: string
  region: string
  classification: string[]
  classificationOther: string
  highestEducation: string
  schoolName: string
  course: string
  yearGraduated: string
  assignedBatchId: number | null
  assignmentHistory: GIPAssignmentHistory[]
  attachedDocuments: string[]
  dateApplicationReceived: string
  receivedBy: string
  status: 'Active' | 'Inactive'
  remarks: string
}

export interface GIPBatchDocument {
  name: string
  url: string
  fileType: string
}

export interface GIPBatch {
  id: number
  batchName: string
  batchCode: string
  description: string
  assignedOffice: string
  deploymentLocation: string
  coordinator: string
  supervisor: string
  slots: string
  fundingSource: string
  fundingSourceOther: string
  startDate: string
  endDate: string
  allowance: string
  status: 'Planned' | 'Ongoing' | 'Completed'
  documents: GIPBatchDocument[]
  isDraft?: boolean
}

// ─── Seed applicants ──────────────────────────────────────────────────────────

const mockApplicants: GIPApplicant[] = [
  {
    id: 1, lastName: 'Madera', firstName: 'Carlo', middleName: 'V.',
    sex: 'Male', birthdate: '2002-03-15', age: 23, civilStatus: 'Single',
    contactNumber: '09171234561', email: '',
    streetPurok: '', barangay: 'Poblacion', cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental', region: 'Region X',
    classification: ['Fresh Graduate'], classificationOther: '',
    highestEducation: 'College Graduate', schoolName: 'Tangub City College',
    course: 'BS Public Administration', yearGraduated: '2024',
    assignedBatchId: 2,
    assignmentHistory: [
      { batchId: 2, batchName: 'Government Internship Program - Batch 2', assignedDate: '2026-04-10' }
    ],
    attachedDocuments: [],
    dateApplicationReceived: '2026-04-10', receivedBy: 'Admin',
    status: 'Active', remarks: '',
  },
  {
    id: 2, lastName: 'Villanueva', firstName: 'Hazel', middleName: 'M.',
    sex: 'Female', birthdate: '2003-06-22', age: 22, civilStatus: 'Single',
    contactNumber: '09181234562', email: '',
    streetPurok: '', barangay: 'Mantic', cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental', region: 'Region X',
    classification: ['Fresh Graduate'], classificationOther: '',
    highestEducation: 'College Graduate', schoolName: 'Tangub City College',
    course: 'BS Accountancy', yearGraduated: '2025',
    assignedBatchId: 2,
    assignmentHistory: [
      { batchId: 2, batchName: 'Government Internship Program - Batch 2', assignedDate: '2026-04-10' }
    ],
    attachedDocuments: [],
    dateApplicationReceived: '2026-04-10', receivedBy: 'Admin',
    status: 'Active', remarks: '',
  },
  {
    id: 3, lastName: 'Quiñones', firstName: 'Ramon', middleName: 'D.',
    sex: 'Male', birthdate: '1999-09-10', age: 26, civilStatus: 'Single',
    contactNumber: '09191234563', email: '',
    streetPurok: '', barangay: 'Pangabuan', cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental', region: 'Region X',
    classification: ['Fresh Graduate', 'Underemployed'], classificationOther: '',
    highestEducation: 'College Graduate', schoolName: '', course: 'BS Civil Engineering', yearGraduated: '2023',
    assignedBatchId: null,
    assignmentHistory: [
      { batchId: 1, batchName: 'Government Internship Program - Batch 1', assignedDate: '2026-01-06', completedDate: '2026-04-06' }
    ],
    attachedDocuments: [],
    dateApplicationReceived: '2026-01-02', receivedBy: 'Admin',
    status: 'Inactive', remarks: '',
  },
  {
    id: 4, lastName: 'Abella', firstName: 'Kristine', middleName: 'T.',
    sex: 'Female', birthdate: '2003-11-05', age: 22, civilStatus: 'Single',
    contactNumber: '09201234564', email: '',
    streetPurok: '', barangay: 'Sta. Cruz', cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental', region: 'Region X',
    classification: ['Fresh Graduate', 'Women'], classificationOther: '',
    highestEducation: 'College Graduate', schoolName: '', course: 'BS Social Work', yearGraduated: '2025',
    assignedBatchId: 2,
    assignmentHistory: [
      { batchId: 2, batchName: 'Government Internship Program - Batch 2', assignedDate: '2026-04-11' }
    ],
    attachedDocuments: [],
    dateApplicationReceived: '2026-04-11', receivedBy: 'Admin',
    status: 'Active', remarks: '',
  },
  {
    id: 5, lastName: 'Tuazon', firstName: 'Jerico', middleName: 'A.',
    sex: 'Male', birthdate: '2001-07-18', age: 24, civilStatus: 'Single',
    contactNumber: '09211234565', email: '',
    streetPurok: '', barangay: 'Maloro', cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental', region: 'Region X',
    classification: ['Fresh Graduate'], classificationOther: '',
    highestEducation: 'College Graduate', schoolName: '', course: 'BS Agriculture', yearGraduated: '2024',
    assignedBatchId: null,
    assignmentHistory: [
      { batchId: 1, batchName: 'Government Internship Program - Batch 1', assignedDate: '2026-01-06', completedDate: '2026-04-06' }
    ],
    attachedDocuments: [],
    dateApplicationReceived: '2026-01-03', receivedBy: 'Admin',
    status: 'Inactive', remarks: 'Personal reasons',
  },
]

// ─── Seed batches ─────────────────────────────────────────────────────────────

const mockBatches: GIPBatch[] = [
  {
    id: 1,
    batchName: 'Government Internship Program - Batch 1',
    batchCode: 'GIP-2026-001',
    description: 'First batch of the Government Internship Program for 2026.',
    assignedOffice: 'Various City & Municipal Offices',
    deploymentLocation: 'Tangub City Hall and Partner Agencies',
    coordinator: 'Maria Santos',
    supervisor: 'Engr. Cruz',
    slots: '20',
    fundingSource: 'DOLE',
    fundingSourceOther: '',
    startDate: '2026-01-06',
    endDate: '2026-04-06',
    allowance: '5000',
    status: 'Completed',
    documents: [],
  },
  {
    id: 2,
    batchName: 'Government Internship Program - Batch 2',
    batchCode: 'GIP-2026-002',
    description: 'Second batch of the Government Internship Program for 2026.',
    assignedOffice: 'Various City & Municipal Offices',
    deploymentLocation: 'Tangub City Hall and Partner Agencies',
    coordinator: 'Carlo Bautista',
    supervisor: 'Ms. Reyes',
    slots: '25',
    fundingSource: 'DOLE',
    fundingSourceOther: '',
    startDate: '2026-04-15',
    endDate: '2026-07-15',
    allowance: '5000',
    status: 'Ongoing',
    documents: [],
  },
  {
    id: 3,
    batchName: 'Government Internship Program - Batch 3',
    batchCode: 'GIP-2026-003',
    description: 'Third batch of the Government Internship Program for 2026.',
    assignedOffice: 'Various City & Municipal Offices',
    deploymentLocation: 'Tangub City Hall and Partner Agencies',
    coordinator: 'Anna Rodriguez',
    supervisor: '',
    slots: '30',
    fundingSource: 'DOLE',
    fundingSourceOther: '',
    startDate: '2026-07-20',
    endDate: '2026-10-20',
    allowance: '5000',
    status: 'Planned',
    documents: [],
  },
]

// ─── Context ──────────────────────────────────────────────────────────────────

interface GIPContextValue {
  applicants: GIPApplicant[]
  setApplicants: React.Dispatch<React.SetStateAction<GIPApplicant[]>>
  gipBatches: GIPBatch[]
  setGipBatches: React.Dispatch<React.SetStateAction<GIPBatch[]>>
  updateGipBatch: (updated: GIPBatch) => void
}

const GIPContext = createContext<GIPContextValue | null>(null)

export function GIPProvider({ children }: { children: ReactNode }) {
  const [applicants, setApplicants] = useState<GIPApplicant[]>(mockApplicants)
  const [gipBatches, setGipBatches] = useState<GIPBatch[]>(mockBatches)

  const updateGipBatch = (updated: GIPBatch) => {
    if (updated.status === 'Completed') {
      setApplicants(prev => prev.map(a =>
        a.assignedBatchId === updated.id
          ? {
              ...a,
              status: 'Inactive' as const,
              assignedBatchId: null,
              assignmentHistory: a.assignmentHistory.map(h =>
                h.batchId === updated.id && !h.completedDate
                  ? { ...h, completedDate: updated.endDate || new Date().toISOString().split('T')[0] }
                  : h
              ),
            }
          : a
      ))
    }
    setGipBatches(prev => prev.map(b => b.id === updated.id ? updated : b))
  }

  return (
    <GIPContext.Provider value={{ applicants, setApplicants, gipBatches, setGipBatches, updateGipBatch }}>
      {children}
    </GIPContext.Provider>
  )
}

export function useGIP() {
  const ctx = useContext(GIPContext)
  if (!ctx) throw new Error('useGIP must be used inside GIPProvider')
  return ctx
}
