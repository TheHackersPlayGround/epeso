import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export interface SPESApplicant {
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
  schoolName: string
  schoolType: string
  gradeYearLevel: string
  course: string
  annualFamilyIncome: string
  numberOfDependents: number
  employer: string
  employerDepartment: string
  position: string
  workStartDate: string
  workEndDate: string
  stipend: string
  workingHoursPerDay: string
  assignedActivity: string
  attachedDocuments: string[]
  dateApplicationReceived: string
  receivedBy: string
  status: 'Active' | 'Completed' | 'Dropped' | 'Suspended'
  remarks: string
}

const SEED: SPESApplicant[] = [
  {
    id: 1, lastName: 'Flores', firstName: 'Jay', middleName: 'R.',
    sex: 'Male', birthdate: '2007-04-10', age: 19, civilStatus: 'Single',
    contactNumber: '09171234561', email: '',
    streetPurok: '', barangay: 'Poblacion', cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental', region: 'Region X',
    schoolName: 'Tangub City College', schoolType: 'College', gradeYearLevel: '2nd Year', course: 'BS Information Technology',
    annualFamilyIncome: '60000', numberOfDependents: 3,
    employer: 'City Hall', employerDepartment: 'MIS / IT Department', position: 'IT Assistant',
    workStartDate: '2026-04-15', workEndDate: '2026-05-15', stipend: '3,500', workingHoursPerDay: '4',
    assignedActivity: 'Special Program for Employment of Students 2026',
    attachedDocuments: [],
    dateApplicationReceived: '2026-04-10', receivedBy: 'Admin',
    status: 'Active', remarks: '',
  },
  {
    id: 2, lastName: 'Oporto', firstName: 'Leah', middleName: 'S.',
    sex: 'Female', birthdate: '2009-02-18', age: 17, civilStatus: 'Single',
    contactNumber: '09181234562', email: '',
    streetPurok: '', barangay: 'Sta. Cruz', cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental', region: 'Region X',
    schoolName: 'Tangub National High School', schoolType: 'Senior High School', gradeYearLevel: 'Grade 12', course: '',
    annualFamilyIncome: '55000', numberOfDependents: 4,
    employer: 'DepEd District Office', employerDepartment: 'Administrative Division', position: 'Clerical Aide',
    workStartDate: '2026-04-15', workEndDate: '2026-05-15', stipend: '3,500', workingHoursPerDay: '4',
    assignedActivity: 'Special Program for Employment of Students 2026',
    attachedDocuments: [],
    dateApplicationReceived: '2026-04-10', receivedBy: 'Admin',
    status: 'Active', remarks: '',
  },
  {
    id: 3, lastName: 'Bañares', firstName: 'Eugene', middleName: 'C.',
    sex: 'Male', birthdate: '2006-08-05', age: 20, civilStatus: 'Single',
    contactNumber: '09191234563', email: '',
    streetPurok: '', barangay: 'Mantic', cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental', region: 'Region X',
    schoolName: 'Tangub City College', schoolType: 'College', gradeYearLevel: '3rd Year', course: 'BS Nursing',
    annualFamilyIncome: '48000', numberOfDependents: 5,
    employer: 'Tangub City Hospital', employerDepartment: 'Nursing Department', position: 'Nursing Aide',
    workStartDate: '2026-04-15', workEndDate: '2026-05-15', stipend: '3,500', workingHoursPerDay: '4',
    assignedActivity: 'Special Program for Employment of Students 2026',
    attachedDocuments: [],
    dateApplicationReceived: '2026-04-10', receivedBy: 'Admin',
    status: 'Completed', remarks: '',
  },
  {
    id: 4, lastName: 'Largo', firstName: 'Sheila', middleName: 'M.',
    sex: 'Female', birthdate: '2008-11-22', age: 18, civilStatus: 'Single',
    contactNumber: '09201234564', email: '',
    streetPurok: '', barangay: 'Panalsalan', cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental', region: 'Region X',
    schoolName: 'Tangub National High School', schoolType: 'Senior High School', gradeYearLevel: 'Grade 11', course: '',
    annualFamilyIncome: '42000', numberOfDependents: 6,
    employer: 'Municipal Social Welfare', employerDepartment: 'DSWD Office', position: 'Social Welfare Aide',
    workStartDate: '2026-05-20', workEndDate: '2026-06-20', stipend: '3,500', workingHoursPerDay: '4',
    assignedActivity: 'SPES Summer Program - Wave 2',
    attachedDocuments: [],
    dateApplicationReceived: '2026-05-15', receivedBy: 'Admin',
    status: 'Active', remarks: '',
  },
  {
    id: 5, lastName: 'Pabayo', firstName: 'Renz', middleName: 'A.',
    sex: 'Male', birthdate: '2010-06-30', age: 16, civilStatus: 'Single',
    contactNumber: '09211234565', email: '',
    streetPurok: '', barangay: 'Maloro', cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental', region: 'Region X',
    schoolName: 'Maloro National High School', schoolType: 'Junior High School', gradeYearLevel: 'Grade 10', course: '',
    annualFamilyIncome: '38000', numberOfDependents: 5,
    employer: 'Barangay Hall', employerDepartment: 'Barangay Administration', position: 'Barangay Aide',
    workStartDate: '2026-04-15', workEndDate: '2026-05-15', stipend: '3,500', workingHoursPerDay: '4',
    assignedActivity: 'Special Program for Employment of Students 2026',
    attachedDocuments: [],
    dateApplicationReceived: '2026-04-10', receivedBy: 'Admin',
    status: 'Dropped', remarks: 'Unable to report for work',
  },
]

interface SPESContextValue {
  applicants: SPESApplicant[]
  setApplicants: React.Dispatch<React.SetStateAction<SPESApplicant[]>>
}

const SPESContext = createContext<SPESContextValue | null>(null)

export function SPESProvider({ children }: { children: ReactNode }) {
  const [applicants, setApplicants] = useState<SPESApplicant[]>(SEED)
  return <SPESContext.Provider value={{ applicants, setApplicants }}>{children}</SPESContext.Provider>
}

export function useSPES() {
  const ctx = useContext(SPESContext)
  if (!ctx) throw new Error('useSPES must be used inside SPESProvider')
  return ctx
}
