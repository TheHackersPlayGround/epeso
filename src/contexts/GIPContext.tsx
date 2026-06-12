import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

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
  assignedOffice: string
  department: string
  position: string
  supervisorName: string
  startDate: string
  endDate: string
  allowance: string
  assignedActivity: string
  attachedDocuments: string[]
  dateApplicationReceived: string
  receivedBy: string
  status: 'Active' | 'Completed' | 'Withdrawn' | 'On Hold'
  remarks: string
}

const SEED: GIPApplicant[] = [
  {
    id: 1, lastName: 'Madera', firstName: 'Carlo', middleName: 'V.',
    sex: 'Male', birthdate: '2002-03-15', age: 23, civilStatus: 'Single',
    contactNumber: '09171234561', email: '',
    streetPurok: '', barangay: 'Poblacion', cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental', region: 'Region X',
    classification: ['Fresh Graduate'], classificationOther: '',
    highestEducation: 'College Graduate', schoolName: 'Tangub City College',
    course: 'BS Public Administration', yearGraduated: '2024',
    assignedOffice: 'City Hall', department: 'Human Resources Department',
    position: 'Administrative Intern', supervisorName: 'Mr. Santos',
    startDate: '2026-04-15', endDate: '2026-07-15', allowance: '5000',
    assignedActivity: 'Government Internship Program - Batch 2',
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
    assignedOffice: 'City Hall', department: 'Finance Department',
    position: 'Accounting Intern', supervisorName: 'Ms. Reyes',
    startDate: '2026-04-15', endDate: '2026-07-15', allowance: '5000',
    assignedActivity: 'Government Internship Program - Batch 2',
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
    assignedOffice: 'Municipal Office', department: 'Engineering Department',
    position: 'Engineering Intern', supervisorName: 'Engr. Cruz',
    startDate: '2026-01-06', endDate: '2026-04-06', allowance: '5000',
    assignedActivity: 'Government Internship Program - Batch 1',
    attachedDocuments: [],
    dateApplicationReceived: '2026-01-02', receivedBy: 'Admin',
    status: 'Completed', remarks: '',
  },
  {
    id: 4, lastName: 'Abella', firstName: 'Kristine', middleName: 'T.',
    sex: 'Female', birthdate: '2003-11-05', age: 22, civilStatus: 'Single',
    contactNumber: '09201234564', email: '',
    streetPurok: '', barangay: 'Sta. Cruz', cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental', region: 'Region X',
    classification: ['Fresh Graduate', 'Women'], classificationOther: '',
    highestEducation: 'College Graduate', schoolName: '', course: 'BS Social Work', yearGraduated: '2025',
    assignedOffice: 'Municipal Hall', department: 'Social Welfare & Development Office',
    position: 'Social Work Intern', supervisorName: 'Ms. Garcia',
    startDate: '2026-04-15', endDate: '2026-07-15', allowance: '5000',
    assignedActivity: 'Government Internship Program - Batch 2',
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
    assignedOffice: 'Municipal Agriculture Office', department: 'Crops & Livestock Division',
    position: 'Agriculture Intern', supervisorName: 'Mr. Dela Rosa',
    startDate: '2026-01-06', endDate: '2026-04-06', allowance: '5000',
    assignedActivity: 'Government Internship Program - Batch 1',
    attachedDocuments: [],
    dateApplicationReceived: '2026-01-03', receivedBy: 'Admin',
    status: 'Withdrawn', remarks: 'Personal reasons',
  },
]

interface GIPContextValue {
  applicants: GIPApplicant[]
  setApplicants: React.Dispatch<React.SetStateAction<GIPApplicant[]>>
}

const GIPContext = createContext<GIPContextValue | null>(null)

export function GIPProvider({ children }: { children: ReactNode }) {
  const [applicants, setApplicants] = useState<GIPApplicant[]>(SEED)
  return <GIPContext.Provider value={{ applicants, setApplicants }}>{children}</GIPContext.Provider>
}

export function useGIP() {
  const ctx = useContext(GIPContext)
  if (!ctx) throw new Error('useGIP must be used inside GIPProvider')
  return ctx
}
