import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export interface CDSPApplicant {
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
  employmentStatus: string
  currentOccupation: string
  employerName: string
  employmentType: string
  monthlyIncome: string
  serviceAvailed: string
  assignedActivity: string
  careerGoal: string
  coachingType: string
  careerAssessmentResult: string
  targetJob: string
  industriesOfInterest: string[]
  preEmploymentRequirements: string[]
  school: string
  courseProgram: string
  yearLevel: string
  expectedGraduation: string
  applicantSignature: string
  dateSignature: string
  dateApplicationReceived: string
  receivedBy: string
  counselorName: string
  status: 'Active' | 'Inactive'
  remarks: string
  attachedDocuments: { name: string; file: File; url: string }[]
}

const SEED: CDSPApplicant[] = [
  {
    id: 1, lastName: 'Dela Cruz', firstName: 'Juan', middleName: 'M.',
    sex: 'Male', birthdate: '2003-05-14', age: 23, civilStatus: 'Single',
    contactNumber: '09171234567', email: 'juan@gmail.com',
    streetPurok: 'Purok 3', barangay: 'Poblacion', cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental', region: 'Region X – Northern Mindanao',
    classification: ['Fresh Graduate'], classificationOther: '',
    highestEducation: 'College Graduate', schoolName: 'Tangub City College', course: 'BS Information Technology', yearGraduated: '2024',
    employmentStatus: 'Unemployed', currentOccupation: '', employerName: '', employmentType: '', monthlyIncome: '',
    serviceAvailed: 'Career Coaching', assignedActivity: 'Career Coaching Batch 1 – March 2026',
    careerGoal: 'Software Developer', coachingType: 'Career Path Planning', careerAssessmentResult: '',
    targetJob: '', industriesOfInterest: [], preEmploymentRequirements: [],
    school: '', courseProgram: '', yearLevel: '', expectedGraduation: '',
    applicantSignature: '', dateSignature: '',
    dateApplicationReceived: '2026-03-10', receivedBy: 'Admin', counselorName: 'Engr. Lito Reyes',
    status: 'Active', remarks: '', attachedDocuments: [],
  },
  {
    id: 2, lastName: 'Reyes', firstName: 'Ana', middleName: 'D.',
    sex: 'Female', birthdate: '2004-02-20', age: 22, civilStatus: 'Single',
    contactNumber: '09181234567', email: '',
    streetPurok: '', barangay: 'Sta. Cruz', cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental', region: 'Region X – Northern Mindanao',
    classification: ['Student'], classificationOther: '',
    highestEducation: 'College Level (4th Year)', schoolName: '', course: 'BS Education', yearGraduated: '',
    employmentStatus: 'Student', currentOccupation: '', employerName: '', employmentType: '', monthlyIncome: '',
    serviceAvailed: 'Labor Employment for Graduating Students', assignedActivity: 'LEGS Orientation – March 2026',
    careerGoal: '', coachingType: '', careerAssessmentResult: '',
    targetJob: '', industriesOfInterest: [], preEmploymentRequirements: [],
    school: 'Tangub City College', courseProgram: 'BS Education', yearLevel: '4th Year', expectedGraduation: '2026-06',
    applicantSignature: '', dateSignature: '',
    dateApplicationReceived: '2026-03-12', receivedBy: 'Admin', counselorName: 'Ms. Santos',
    status: 'Active', remarks: '', attachedDocuments: [],
  },
  {
    id: 3, lastName: 'Garcia', firstName: 'Pedro', middleName: 'S.',
    sex: 'Male', birthdate: '1999-07-08', age: 27, civilStatus: 'Married',
    contactNumber: '09191234567', email: '',
    streetPurok: '', barangay: 'Maloro', cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental', region: 'Region X – Northern Mindanao',
    classification: ['Underemployed'], classificationOther: '',
    highestEducation: 'College Graduate', schoolName: '', course: 'BS Commerce', yearGraduated: '2020',
    employmentStatus: 'Underemployed', currentOccupation: 'Part-time Sales', employerName: '', employmentType: 'Part-Time', monthlyIncome: '',
    serviceAvailed: 'Pre-Employment Coaching', assignedActivity: 'Pre-Employment Coaching – April 2026',
    careerGoal: '', coachingType: '', careerAssessmentResult: '',
    targetJob: 'Marketing Officer', industriesOfInterest: ['Retail & Commerce'], preEmploymentRequirements: [],
    school: '', courseProgram: '', yearLevel: '', expectedGraduation: '',
    applicantSignature: '', dateSignature: '',
    dateApplicationReceived: '2026-03-15', receivedBy: 'Admin', counselorName: 'Mr. Cruz',
    status: 'Inactive', remarks: '', attachedDocuments: [],
  },
  {
    id: 4, lastName: 'Santos', firstName: 'Maria', middleName: 'L.',
    sex: 'Female', birthdate: '2001-09-03', age: 25, civilStatus: 'Single',
    contactNumber: '09201234567', email: '',
    streetPurok: '', barangay: 'Panalsalan', cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental', region: 'Region X – Northern Mindanao',
    classification: ['Fresh Graduate', 'Women'], classificationOther: '',
    highestEducation: 'College Graduate', schoolName: '', course: 'BS Nursing', yearGraduated: '2025',
    employmentStatus: 'Unemployed', currentOccupation: '', employerName: '', employmentType: '', monthlyIncome: '',
    serviceAvailed: 'Career Coaching', assignedActivity: 'Career Coaching Batch 1 – March 2026',
    careerGoal: 'Registered Nurse', coachingType: 'Career Path Planning', careerAssessmentResult: '',
    targetJob: '', industriesOfInterest: [], preEmploymentRequirements: [],
    school: '', courseProgram: '', yearLevel: '', expectedGraduation: '',
    applicantSignature: '', dateSignature: '',
    dateApplicationReceived: '2026-03-18', receivedBy: 'Admin', counselorName: 'Engr. Lito Reyes',
    status: 'Active', remarks: '', attachedDocuments: [],
  },
  {
    id: 5, lastName: 'Torres', firstName: 'Miguel', middleName: 'A.',
    sex: 'Male', birthdate: '2005-04-11', age: 21, civilStatus: 'Single',
    contactNumber: '09211234567', email: '',
    streetPurok: '', barangay: 'Bongbong', cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental', region: 'Region X – Northern Mindanao',
    classification: ['Student'], classificationOther: '',
    highestEducation: 'College Level (3rd Year)', schoolName: '', course: 'BS Civil Engineering', yearGraduated: '',
    employmentStatus: 'Student', currentOccupation: '', employerName: '', employmentType: '', monthlyIncome: '',
    serviceAvailed: 'Labor Employment for Graduating Students', assignedActivity: 'LEGS Orientation – April 2026',
    careerGoal: '', coachingType: '', careerAssessmentResult: '',
    targetJob: '', industriesOfInterest: [], preEmploymentRequirements: [],
    school: 'Western Mindanao State University', courseProgram: 'BS Civil Engineering', yearLevel: '3rd Year', expectedGraduation: '2027-03',
    applicantSignature: '', dateSignature: '',
    dateApplicationReceived: '2026-03-20', receivedBy: 'Admin', counselorName: 'Ms. Santos',
    status: 'Active', remarks: '', attachedDocuments: [],
  },
  {
    id: 6, lastName: 'Mendoza', firstName: 'Liza', middleName: 'B.',
    sex: 'Female', birthdate: '1995-11-25', age: 31, civilStatus: 'Married',
    contactNumber: '09221234567', email: '',
    streetPurok: '', barangay: 'Caniangan', cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental', region: 'Region X – Northern Mindanao',
    classification: ['Unemployed', 'Women', 'Solo Parent'], classificationOther: '',
    highestEducation: 'College Graduate', schoolName: '', course: 'BS Education', yearGraduated: '2015',
    employmentStatus: 'Unemployed', currentOccupation: '', employerName: '', employmentType: '', monthlyIncome: '',
    serviceAvailed: 'Pre-Employment Coaching', assignedActivity: 'Pre-Employment Coaching – April 2026',
    careerGoal: '', coachingType: '', careerAssessmentResult: '',
    targetJob: 'Teacher', industriesOfInterest: ['Education'], preEmploymentRequirements: [],
    school: '', courseProgram: '', yearLevel: '', expectedGraduation: '',
    applicantSignature: '', dateSignature: '',
    dateApplicationReceived: '2026-03-22', receivedBy: 'Admin', counselorName: 'Mr. Cruz',
    status: 'Inactive', remarks: 'Referred to DepEd Tangub', attachedDocuments: [],
  },
]

interface CDSPContextValue {
  applicants: CDSPApplicant[]
  setApplicants: React.Dispatch<React.SetStateAction<CDSPApplicant[]>>
}

const CDSPContext = createContext<CDSPContextValue | null>(null)

export function CDSPProvider({ children }: { children: ReactNode }) {
  const [applicants, setApplicants] = useState<CDSPApplicant[]>(SEED)
  return <CDSPContext.Provider value={{ applicants, setApplicants }}>{children}</CDSPContext.Provider>
}

export function useCDSP() {
  const ctx = useContext(CDSPContext)
  if (!ctx) throw new Error('useCDSP must be used inside CDSPProvider')
  return ctx
}
