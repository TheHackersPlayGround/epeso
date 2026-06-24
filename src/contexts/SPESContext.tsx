import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

export interface Attachment {
  name: string
  url: string
  fileType: string
}

export interface SPESBatch {
  id: number
  batchName: string
  description: string
  applicationStartDate: string
  applicationEndDate: string
  programStartDate: string
  programEndDate: string
  availableSlots: string
  targetBeneficiaries: string
  employer: string
  deploymentLocation: string
  coordinator: string
  supervisor: string
  fundingSource: string
  fundingSourceOther: string
  status: 'Open' | 'Ongoing' | 'Completed' | 'Closed'
  isDraft?: boolean
  documents: Attachment[]
}

export interface SPESBatchAssignment {
  batchId: number
  batchName: string
  assignedDate: string
  completedDate?: string
}

export interface SPESApplicant {
  id: number
  // I. Personal Information
  lastName: string
  firstName: string
  middleName: string
  sex: '' | 'Male' | 'Female'
  birthdate: string
  age: number
  civilStatus: string
  contactNumber: string
  email: string
  // II. Address
  streetPurok: string
  barangay: string
  cityMunicipality: string
  province: string
  region: string
  // III. Educational Information
  schoolName: string
  schoolType: string
  gradeYearLevel: string
  course: string
  // IV. Family / Economic Information
  annualFamilyIncome: string
  numberOfDependents: number
  // V. Current Assignment
  assignedActivity: string
  assignedBatchId: number | null
  // VI. Assignment History
  assignmentHistory: SPESBatchAssignment[]
  // VII. Attached Documents
  attachedDocuments: string[]
  // VIII. PESO Office
  dateApplicationReceived: string
  receivedBy: string
  status: 'Active' | 'Inactive'
  remarks: string
}

// ─── Seed data ───────────────────────────────────────────────────────────────

const mockSpesBatches: SPESBatch[] = [
  {
    id: 1,
    batchName: 'Special Program for Employment of Students 2026',
    description: 'Summer employment program for students — Wave 1',
    applicationStartDate: '2026-03-15',
    applicationEndDate: '2026-04-10',
    programStartDate: '2026-04-15',
    programEndDate: '2026-05-15',
    availableSlots: '50',
    targetBeneficiaries: '50',
    employer: 'Various Government Offices — Tangub City',
    deploymentLocation: 'Tangub City Hall and Partner Agencies',
    coordinator: 'Jane Smith',
    supervisor: '',
    fundingSource: 'DOLE',
    fundingSourceOther: '',
    status: 'Ongoing',
    documents: [],
  },
  {
    id: 2,
    batchName: 'SPES Summer Program - Wave 2',
    description: 'Second wave of the student employment program',
    applicationStartDate: '2026-04-20',
    applicationEndDate: '2026-05-15',
    programStartDate: '2026-05-20',
    programEndDate: '2026-06-20',
    availableSlots: '40',
    targetBeneficiaries: '40',
    employer: 'Public Schools — DepEd District Office',
    deploymentLocation: 'Various Public Schools, Tangub City',
    coordinator: 'Anna Rodriguez',
    supervisor: '',
    fundingSource: 'DOLE',
    fundingSourceOther: '',
    status: 'Open',
    documents: [],
  },
]

const mockApplicants: SPESApplicant[] = [
  {
    id: 1,
    lastName: 'Flores', firstName: 'Jay', middleName: 'R.',
    sex: 'Male', birthdate: '2007-03-12', age: 19, civilStatus: 'Single',
    contactNumber: '09171234101', email: 'jay.flores@gmail.com',
    streetPurok: 'Purok 1', barangay: 'Poblacion', cityMunicipality: 'Tangub City', province: 'Misamis Occidental', region: 'Region X',
    schoolName: 'Tangub City College', schoolType: 'College', gradeYearLevel: '2nd Year', course: 'BS Information Technology',
    annualFamilyIncome: '80,000', numberOfDependents: 4,
    assignedActivity: 'Special Program for Employment of Students 2026', assignedBatchId: 1,
    assignmentHistory: [
      { batchId: 2, batchName: 'SPES Summer Program - Wave 2', assignedDate: '2026-03-10', completedDate: '2026-03-31' },
      { batchId: 1, batchName: 'Special Program for Employment of Students 2026', assignedDate: '2026-04-01' },
    ],
    attachedDocuments: [],
    dateApplicationReceived: '2026-04-01', receivedBy: 'Maria Santos',
    status: 'Active', remarks: 'Working satisfactorily',
  },
  {
    id: 2,
    lastName: 'Oporto', firstName: 'Leah', middleName: 'S.',
    sex: 'Female', birthdate: '2008-07-22', age: 17, civilStatus: 'Single',
    contactNumber: '09187654102', email: '',
    streetPurok: 'Purok 3', barangay: 'Mantic', cityMunicipality: 'Tangub City', province: 'Misamis Occidental', region: 'Region X',
    schoolName: 'Tangub National High School', schoolType: 'Senior High School', gradeYearLevel: 'Grade 12', course: '',
    annualFamilyIncome: '60,000', numberOfDependents: 5,
    assignedActivity: 'Special Program for Employment of Students 2026', assignedBatchId: 1,
    assignmentHistory: [{ batchId: 1, batchName: 'Special Program for Employment of Students 2026', assignedDate: '2026-04-03' }],
    attachedDocuments: [],
    dateApplicationReceived: '2026-04-03', receivedBy: 'Carlo Bautista',
    status: 'Active', remarks: 'Diligent and punctual',
  },
  {
    id: 3,
    lastName: 'Bañares', firstName: 'Eugene', middleName: 'C.',
    sex: 'Male', birthdate: '2005-11-05', age: 20, civilStatus: 'Single',
    contactNumber: '09211234103', email: 'eugene.banares@gmail.com',
    streetPurok: 'Purok 6', barangay: 'Pangabuan', cityMunicipality: 'Tangub City', province: 'Misamis Occidental', region: 'Region X',
    schoolName: 'Tangub City College', schoolType: 'College', gradeYearLevel: '3rd Year', course: 'BS Nursing',
    annualFamilyIncome: '75,000', numberOfDependents: 3,
    assignedActivity: 'Special Program for Employment of Students 2026', assignedBatchId: 1,
    assignmentHistory: [{ batchId: 1, batchName: 'Special Program for Employment of Students 2026', assignedDate: '2026-04-03' }],
    attachedDocuments: [],
    dateApplicationReceived: '2026-04-03', receivedBy: 'Maria Santos',
    status: 'Active', remarks: 'Performing well',
  },
  {
    id: 4,
    lastName: 'Largo', firstName: 'Sheila', middleName: 'M.',
    sex: 'Female', birthdate: '2008-01-30', age: 18, civilStatus: 'Single',
    contactNumber: '09301234104', email: '',
    streetPurok: 'Purok 2', barangay: 'Sta. Cruz', cityMunicipality: 'Tangub City', province: 'Misamis Occidental', region: 'Region X',
    schoolName: 'Tangub National High School', schoolType: 'Senior High School', gradeYearLevel: 'Grade 11', course: '',
    annualFamilyIncome: '55,000', numberOfDependents: 6,
    assignedActivity: 'SPES Summer Program - Wave 2', assignedBatchId: 2,
    assignmentHistory: [{ batchId: 2, batchName: 'SPES Summer Program - Wave 2', assignedDate: '2026-05-05' }],
    attachedDocuments: [],
    dateApplicationReceived: '2026-05-05', receivedBy: 'Carlo Bautista',
    status: 'Active', remarks: 'Enrolled in Wave 2',
  },
  {
    id: 5,
    lastName: 'Pabayo', firstName: 'Renz', middleName: 'A.',
    sex: 'Male', birthdate: '2009-08-14', age: 16, civilStatus: 'Single',
    contactNumber: '09171234105', email: '',
    streetPurok: 'Purok 4', barangay: 'Maloro', cityMunicipality: 'Tangub City', province: 'Misamis Occidental', region: 'Region X',
    schoolName: 'Maloro National High School', schoolType: 'Junior High School', gradeYearLevel: 'Grade 10', course: '',
    annualFamilyIncome: '48,000', numberOfDependents: 7,
    assignedActivity: '', assignedBatchId: null,
    assignmentHistory: [{ batchId: 1, batchName: 'Special Program for Employment of Students 2026', assignedDate: '2026-04-05', completedDate: '2026-05-30' }],
    attachedDocuments: [],
    dateApplicationReceived: '2026-04-05', receivedBy: 'Maria Santos',
    status: 'Inactive', remarks: 'Withdrew from program due to school conflict',
  },
]

// ─── Context ──────────────────────────────────────────────────────────────────

interface SPESContextType {
  applicants: SPESApplicant[]
  setApplicants: React.Dispatch<React.SetStateAction<SPESApplicant[]>>
  spesBatches: SPESBatch[]
  setSpesBatches: React.Dispatch<React.SetStateAction<SPESBatch[]>>
  updateSpesBatch: (updated: SPESBatch) => void
}

const SPESContext = createContext<SPESContextType | undefined>(undefined)

const SCHEMA_VERSION = 'v2'

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    if (localStorage.getItem('spes_schema') !== SCHEMA_VERSION) {
      localStorage.removeItem('spes_applicants')
      localStorage.removeItem('spes_batches')
      localStorage.setItem('spes_schema', SCHEMA_VERSION)
      return fallback
    }
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function SPESProvider({ children }: { children: ReactNode }) {
  const [applicants, setApplicants] = useState<SPESApplicant[]>(() =>
    loadFromStorage('spes_applicants', mockApplicants)
  )
  const [spesBatches, setSpesBatches] = useState<SPESBatch[]>(() =>
    loadFromStorage('spes_batches', mockSpesBatches)
  )

  useEffect(() => {
    localStorage.setItem('spes_batches', JSON.stringify(spesBatches))
  }, [spesBatches])

  useEffect(() => {
    localStorage.setItem('spes_applicants', JSON.stringify(applicants))
  }, [applicants])

  const updateSpesBatch = (updated: SPESBatch) => {
    const today = new Date().toISOString().split('T')[0]
    const batchId = updated.id

    if (updated.status === 'Completed') {
      updated = { ...updated, programEndDate: today }
      setApplicants(prev => prev.map(a => {
        if (a.assignedBatchId !== batchId) return a
        return {
          ...a,
          assignedBatchId: null,
          assignedActivity: '',
          status: 'Inactive' as const,
          assignmentHistory: a.assignmentHistory.map(h =>
            h.batchId === batchId ? { ...h, completedDate: today } : h
          ),
        }
      }))
    } else if (updated.status === 'Ongoing' || updated.status === 'Open') {
      setApplicants(prev => prev.map(a => {
        const historyEntry = a.assignmentHistory.find(h => h.batchId === batchId)
        if (!historyEntry) return a
        if (a.assignedBatchId === batchId) {
          return { ...a, status: 'Active' as const }
        }
        if (a.assignedBatchId === null && historyEntry.completedDate) {
          return {
            ...a,
            assignedBatchId: batchId,
            assignedActivity: updated.batchName,
            status: 'Active' as const,
            assignmentHistory: a.assignmentHistory.map(h =>
              h.batchId === batchId ? { ...h, completedDate: undefined } : h
            ),
          }
        }
        return a
      }))
    }

    setSpesBatches(prev => prev.map(b => b.id === batchId ? updated : b))
  }

  return (
    <SPESContext.Provider value={{ applicants, setApplicants, spesBatches, setSpesBatches, updateSpesBatch }}>
      {children}
    </SPESContext.Provider>
  )
}

export function useSPES() {
  const ctx = useContext(SPESContext)
  if (!ctx) throw new Error('useSPES must be used within SPESProvider')
  return ctx
}
