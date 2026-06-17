import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export interface SkillsTrainingBatch {
  id: number
  batchName: string
  status: 'Planned' | 'Ongoing' | 'Completed'
  startDate?: string
  endDate?: string
  description?: string
}

const SEED_BATCHES: SkillsTrainingBatch[] = [
  { id: 1, batchName: 'BATCH-001', status: 'Completed', startDate: '2026-01-10', endDate: '2026-03-10' },
  { id: 2, batchName: 'BATCH-002', status: 'Ongoing',   startDate: '2026-03-15', endDate: '2026-05-15' },
  { id: 3, batchName: 'BATCH-003', status: 'Planned',   startDate: '2026-06-01', endDate: '2026-08-01' },
]

export interface SkillsTrainingProfile {
  id: number
  lastName: string
  firstName: string
  middleName: string
  birthdate: string
  age: number
  sex: string
  civilStatus: string
  address: string
  contactNumber: string
  classification: string[]
  classificationOther: string[]
  desiredQualification: string[]
  qualificationOther: string[]
  purposeOfTraining: string[]
  purposeOther: string[]
  attachedDocuments: string[]
  applicantSignature: string
  dateSignature: string
  dateApplicationReceived: string
  receivedBy: string
  trainingBatchNo: string
  assignedTrainingId: number | null
  status: 'Accepted' | 'Waitlisted'
  assessmentResult: string
  remarks: string
}

const SEED: SkillsTrainingProfile[] = [
  {
    id: 1, lastName: 'Dela Cruz', firstName: 'Juan', middleName: 'M.',
    birthdate: '2002-05-14', age: 23, sex: 'Male', civilStatus: 'Single',
    address: 'Purok 3, Brgy. Poblacion, Tangub City', contactNumber: '09171234567',
    classification: ['Student'], classificationOther: [],
    desiredQualification: ['COOKERY'], qualificationOther: [],
    purposeOfTraining: ['For employment'], purposeOther: [],
    attachedDocuments: [], applicantSignature: 'Juan Dela Cruz', dateSignature: '2026-04-10',
    dateApplicationReceived: '2026-04-10', receivedBy: 'Maria Santos',
    trainingBatchNo: 'BATCH-001', assignedTrainingId: 11,
    status: 'Accepted', assessmentResult: 'Passed', remarks: '',
  },
  {
    id: 2, lastName: 'Santos', firstName: 'Maria', middleName: 'L.',
    birthdate: '1995-08-20', age: 30, sex: 'Female', civilStatus: 'Married',
    address: 'Purok 5, Brgy. Mantic, Tangub City', contactNumber: '09181234568',
    classification: ['Employed', 'Women'], classificationOther: [],
    desiredQualification: ['BREAD AND PASTRY'], qualificationOther: [],
    purposeOfTraining: ['To enhance existing skills'], purposeOther: [],
    attachedDocuments: [], applicantSignature: 'Maria Santos', dateSignature: '2026-04-11',
    dateApplicationReceived: '2026-04-11', receivedBy: 'Ana Reyes',
    trainingBatchNo: 'BATCH-001', assignedTrainingId: 12,
    status: 'Accepted', assessmentResult: '', remarks: '',
  },
  {
    id: 3, lastName: 'Garcia', firstName: 'Pedro', middleName: 'R.',
    birthdate: '2000-11-03', age: 25, sex: 'Male', civilStatus: 'Single',
    address: 'Purok 1, Brgy. Maloro, Tangub City', contactNumber: '09191234569',
    classification: ['Out of School Youth', 'Unemployed'], classificationOther: [],
    desiredQualification: ['FORKLIFT'], qualificationOther: [],
    purposeOfTraining: ['For employment', 'For local or overseas work'], purposeOther: [],
    attachedDocuments: [], applicantSignature: 'Pedro Garcia', dateSignature: '2026-04-15',
    dateApplicationReceived: '2026-04-15', receivedBy: 'Maria Santos',
    trainingBatchNo: '', assignedTrainingId: null,
    status: 'Waitlisted', assessmentResult: '', remarks: 'Pending slot availability',
  },
  {
    id: 4, lastName: 'Reyes', firstName: 'Ana', middleName: 'C.',
    birthdate: '1998-03-25', age: 28, sex: 'Female', civilStatus: 'Single',
    address: 'Purok 2, Brgy. Panalsalan, Tangub City', contactNumber: '09201234570',
    classification: ['Women', 'Unemployed'], classificationOther: [],
    desiredQualification: ['EIM/ELECTRICAL'], qualificationOther: [],
    purposeOfTraining: ['For local or overseas work', 'For employment'], purposeOther: [],
    attachedDocuments: [], applicantSignature: 'Ana Reyes', dateSignature: '2026-04-16',
    dateApplicationReceived: '2026-04-16', receivedBy: 'Ana Reyes',
    trainingBatchNo: 'BATCH-002', assignedTrainingId: 14,
    status: 'Accepted', assessmentResult: '', remarks: '',
  },
  {
    id: 5, lastName: 'Ramos', firstName: 'Carlos', middleName: 'T.',
    birthdate: '1993-07-12', age: 32, sex: 'Male', civilStatus: 'Married',
    address: 'Purok 4, Brgy. Bocator, Tangub City', contactNumber: '09211234571',
    classification: ['Unemployed'], classificationOther: [],
    desiredQualification: ['EIM/ELECTRICAL'], qualificationOther: [],
    purposeOfTraining: ['For employment', 'To start a livelihood / business'], purposeOther: [],
    attachedDocuments: [], applicantSignature: 'Carlos Ramos', dateSignature: '2026-04-20',
    dateApplicationReceived: '2026-04-20', receivedBy: 'Maria Santos',
    trainingBatchNo: 'BATCH-003', assignedTrainingId: 15,
    status: 'Waitlisted', assessmentResult: '', remarks: '',
  },
  {
    id: 6, lastName: 'Mendoza', firstName: 'Liza', middleName: 'V.',
    birthdate: '2001-01-30', age: 25, sex: 'Female', civilStatus: 'Single',
    address: 'Purok 6, Brgy. Biasong, Tangub City', contactNumber: '09221234572',
    classification: ['Out of School Youth', 'Women'], classificationOther: [],
    desiredQualification: ['BREAD AND PASTRY'], qualificationOther: [],
    purposeOfTraining: ['For employment', 'To start a livelihood / business'], purposeOther: [],
    attachedDocuments: [], applicantSignature: 'Liza Mendoza', dateSignature: '2026-04-22',
    dateApplicationReceived: '2026-04-22', receivedBy: 'Ana Reyes',
    trainingBatchNo: 'BATCH-003', assignedTrainingId: 15,
    status: 'Accepted', assessmentResult: '', remarks: '',
  },
]

interface SkillsTrainingContextValue {
  profiles: SkillsTrainingProfile[]
  setProfiles: React.Dispatch<React.SetStateAction<SkillsTrainingProfile[]>>
  skillsTrainingBatches: SkillsTrainingBatch[]
  setSkillsTrainingBatches: React.Dispatch<React.SetStateAction<SkillsTrainingBatch[]>>
  updateSkillsTrainingBatch: (updated: SkillsTrainingBatch) => void
}

const SkillsTrainingContext = createContext<SkillsTrainingContextValue | null>(null)

export function SkillsTrainingProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<SkillsTrainingProfile[]>(SEED)
  const [skillsTrainingBatches, setSkillsTrainingBatches] = useState<SkillsTrainingBatch[]>(SEED_BATCHES)

  const updateSkillsTrainingBatch = (updated: SkillsTrainingBatch) => {
    setSkillsTrainingBatches(prev => prev.map(b => b.id === updated.id ? updated : b))
  }

  return (
    <SkillsTrainingContext.Provider value={{
      profiles, setProfiles,
      skillsTrainingBatches, setSkillsTrainingBatches, updateSkillsTrainingBatch,
    }}>
      {children}
    </SkillsTrainingContext.Provider>
  )
}

export function useSkillsTraining() {
  const ctx = useContext(SkillsTrainingContext)
  if (!ctx) throw new Error('useSkillsTraining must be used inside SkillsTrainingProvider')
  return ctx
}
