// Types and seed data for the Livelihood Programs module.
// Each tab manages its own localStorage state — no React context wrapper needed.

export type LivelihoodService = 'DILEEP (DILP)' | 'DILEEP (TUPAD)' | 'SLP' | 'CLPEP'

export interface LivelihoodSavedDocument {
  id: string
  fileName: string
  fileSize: string
  url: string
  dataUrl?: string
}

// ─── SLP Project ──────────────────────────────────────────────────────────────

export type SLPProject = {
  id: number
  title: string
  date: string
  location: string
  description: string
  status: 'Planned' | 'Ongoing' | 'Completed'
  facilitator?: string
  participants?: number
  assistanceAmount?: string
  dateReleased?: string
}

export const SLP_PROJECTS_SEED: SLPProject[] = [
  {
    id: 301, title: 'Sustainable Livelihood Program - Handicrafts', date: '2026-03-18',
    location: 'Community Center, Tangub City',
    description: 'Livelihood training for handicraft production.',
    status: 'Ongoing', facilitator: 'Rosa Garcia',
    assistanceAmount: '15000', dateReleased: '2026-04-01',
  },
  {
    id: 302, title: 'SLP Food Processing and Packaging', date: '2026-04-25',
    location: 'DOLE Training Center, Tangub City',
    description: 'Livelihood training for food processing microenterprises.',
    status: 'Planned', facilitator: 'Maribel Santos',
    assistanceAmount: '12000', dateReleased: '2026-06-01',
  },
  {
    id: 303, title: 'SLP Sewing and Garments Production', date: '2026-05-10',
    location: 'Barangay Hall, Tangub City',
    description: 'Skills-based livelihood training on garments and dressmaking.',
    status: 'Planned', facilitator: 'Leonora Reyes',
    assistanceAmount: '10000', dateReleased: '2026-06-30',
  },
]

// ─── CLPEP Intervention ───────────────────────────────────────────────────────

export type CLPEPIntervention = {
  id: number
  title: string
  type: string
  status: 'Planned' | 'Ongoing' | 'Completed'
  location: string
  description: string
  targetBeneficiaries?: number
  date?: string
  implementingOfficer?: string
  partnerAgency?: string
  partnerAgencyOther?: string
  typeOther?: string
}

export const CLPEP_INTERVENTIONS_SEED: CLPEPIntervention[] = [
  {
    id: 1, title: 'Educational Assistance Program',
    type: 'Educational Assistance', status: 'Ongoing',
    location: 'Barangay Community Center, Tangub City',
    description: 'Provides educational support and school supplies to child laborers and at-risk children.',
    targetBeneficiaries: 15, date: '2026-03-22',
    implementingOfficer: 'Angela Martinez', partnerAgency: 'DepEd',
  },
  {
    id: 2, title: 'Family Development Session',
    type: 'Family Intervention', status: 'Planned',
    location: 'Community Hall, Tangub City',
    description: 'Educational program for families to prevent child labor through awareness and livelihood support.',
    targetBeneficiaries: 20, date: '2026-04-15',
    implementingOfficer: 'Roberto Dela Cruz', partnerAgency: 'DSWD',
  },
]

export type LivelihoodStatus =
  | 'Active'
  | 'Completed'
  | 'Dropped'
  | 'Pending'
  | 'Closed'
  | 'Approved'
  | 'Released'
  | 'Inactive'
  | 'Accepted'
  | 'Waitlisted'
  | 'Rejected'

export type LivelihoodBeneficiary = {
  id: number
  name: string              // display name — computed from firstName + lastName on save
  service: LivelihoodService
  status: LivelihoodStatus
  // ── Personal identity
  firstName?: string
  lastName?: string
  middleName?: string
  nameExtension?: string    // Jr., Sr., III, etc.
  sex?: string
  birthdate?: string        // ISO date, e.g. "1990-05-15"
  age?: number              // auto-calculated from birthdate
  civilStatus?: string
  contactNumber?: string
  email?: string
  beneficiaryClassification?: string  // Displaced Worker, Farmer, OFW, etc.
  // ── Address
  streetPurok?: string
  barangay?: string
  cityMunicipality?: string
  province?: string
  address?: string          // legacy combined address string
  // ── Social & economic
  is4PsBeneficiary?: boolean
  yearGraduated4Ps?: string
  monthlyIncome?: string
  facebookAccount?: string
  instagramAccount?: string
  // ── Dependent
  dependentNames?: string
  dependentContactNumber?: string
  // ── Government membership
  pagibigNo?: string
  philhealthNo?: string
  sssNo?: string
  otherId?: string
  // ── Application details
  dateApplied?: string
  dateEnrolled?: string     // kept for backward compatibility with seed data
  remarks?: string
  notes?: string
  // ── PESO office fields
  dateApplicationReceived?: string
  receivedBy?: string
  // ── DILP / TUPAD specific
  assignedDilpProjectId?: number | null   // links to ProgramActivity id
  dilpBeneficiaryType?: string            // "Individual" or "Group"
  projectName?: string                    // kept for display in table
  projectAssignmentHistory?: { projectName: string; projectId?: number | null; assignedDate: string; completedDate?: string }[]
  projectDuration?: string               // e.g. "10 days"
  wageRate?: string                      // e.g. "₱500/day"
  region?: string
  assistanceAmount?: string
  dateReleased?: string
  // ── Attachments (stored as file name list only)
  // ── SLP fields
  assignedSlpProjectId?: number | null
  slpTrack?: string
  livelihoodGrantAmount?: string
  slpParticipantIdNumber?: string
  eligibilityType?: string           // "Regular", "Disaster-affected", "Area-Based Convergence", "Walk-in", "Referral"
  referringParty?: string           // free-text when eligibilityType is "Referral"
  sector?: string[]                  // multi-select: IP, IDP, OFW, PWD, etc.
  sectorOthersSpecify?: string       // free-text when "Others" is checked
  sectorIpGroupSpecify?: string      // free-text when "Indigenous People (IP)" is checked
  sectorDisabilitySpecify?: string   // free-text when "Person with Disability (PWD)" is checked
  educationalAttainment?: string
  sourceOfIncome?: string
  totalHouseholdMonthlyIncome?: string
  householdVulnerabilityScore?: string
  vulnerabilitySeverity?: string     // "Low", "Medium", "High"
  assessmentResult?: string          // "Qualified", "Not Qualified"
  // ── CLPEP fields
  assignedInterventionId?: number | null
  cooperativeName?: string
  cooperativeRole?: string
  childLaborStatus?: string
  schoolStatus?: string
  natureOfWork?: string
  currentlyWorking?: boolean
  hoursWorkedPerWeek?: string
  schoolName?: string
  gradeYearLevel?: string
  guardianName?: string
  guardianRelationship?: string
  guardianContactNumber?: string
  caseReportFile?: string
  attachedDocuments?: LivelihoodSavedDocument[]
}

export const LIVELIHOOD_SEED: LivelihoodBeneficiary[] = [
  {
    id: 5,
    name: 'Santos, Maria C.',
    service: 'DILEEP (DILP)',
    status: 'Active',
    firstName: 'Maria',
    lastName: 'Santos',
    middleName: 'C.',
    sex: 'Female',
    birthdate: '1995-03-12',
    age: 31,
    civilStatus: 'Single',
    contactNumber: '09171234005',
    assignedDilpProjectId: 104,
    projectName: 'Hog Raising Livelihood Project',
    dilpBeneficiaryType: 'Individual',
    wageRate: '₱500/day',
    projectDuration: '10 days',
    region: 'Region X (Northern Mindanao)',
    province: 'Misamis Occidental',
    cityMunicipality: 'Tangub City',
    barangay: 'Poblacion',
    streetPurok: 'Purok 2',
    assistanceAmount: '50000',
    dateReleased: '2026-04-05',
    dateApplied: '2026-03-01',
  },
  {
    id: 2,
    name: 'Reyes, Juan B.',
    service: 'DILEEP (TUPAD)',
    status: 'Active',
    firstName: 'Juan',
    lastName: 'Reyes',
    middleName: 'B.',
    sex: 'Male',
    birthdate: '1990-07-20',
    age: 35,
    civilStatus: 'Single',
    contactNumber: '09181234002',
    streetPurok: 'Purok 4',
    barangay: 'Mantic',
    cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental',
    dateApplied: '2026-03-05',
    dateApplicationReceived: '2026-03-05',
    receivedBy: 'Carlo Bautista',
    assignedDilpProjectId: 204,
    projectName: 'TUPAD Road Maintenance and Repair',
    projectAssignmentHistory: [
      { projectId: 202, projectName: 'TUPAD Cemetery and Memorial Park Maintenance', assignedDate: '2026-01-20', completedDate: '2026-02-28' },
      { projectId: 204, projectName: 'TUPAD Road Maintenance and Repair', assignedDate: '2026-03-05' },
    ],
  },
  {
    id: 3,
    name: 'Cruz, Ana T.',
    service: 'SLP',
    status: 'Active',
    firstName: 'Ana',
    lastName: 'Cruz',
    middleName: 'T.',
    sex: 'Female',
    birthdate: '1992-11-15',
    age: 33,
    civilStatus: 'Married',
    contactNumber: '09191234003',
    streetPurok: 'Purok 1',
    barangay: 'Pangabuan',
    cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental',
    is4PsBeneficiary: false,
    slpParticipantIdNumber: 'SLP-2026-003',
    eligibilityType: 'Regular',
    sector: ['Solo Parent'],
    educationalAttainment: 'College Graduate',
    sourceOfIncome: 'Sari-sari Store',
    totalHouseholdMonthlyIncome: '8000',
    householdVulnerabilityScore: '3',
    vulnerabilitySeverity: 'Low',
    assessmentResult: 'Qualified',
    assignedSlpProjectId: 301,
    projectName: 'Sustainable Livelihood Program - Handicrafts',
    slpTrack: 'Enterprise - Individual',
    remarks: 'Successfully completed SLP training.',
    dateApplied: '2026-02-20',
    dateApplicationReceived: '2026-02-20',
    receivedBy: 'Maria Santos',
  },
  {
    id: 4,
    name: 'Dela Torre, Carlos M.',
    service: 'CLPEP',
    status: 'Waitlisted',
    firstName: 'Carlos',
    lastName: 'Dela Torre',
    middleName: 'M.',
    sex: 'Male',
    birthdate: '1988-05-08',
    age: 38,
    civilStatus: 'Married',
    contactNumber: '09201234004',
    streetPurok: 'Purok 3',
    barangay: 'Sta. Cruz',
    cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental',
    assignedInterventionId: null,
    childLaborStatus: 'At Risk',
    schoolStatus: 'Enrolled',
    natureOfWork: 'Informal Trade',
    currentlyWorking: true,
    hoursWorkedPerWeek: '20',
    schoolName: 'Tangub City National High School',
    gradeYearLevel: 'Grade 10',
    guardianName: 'Rosa Dela Torre',
    guardianRelationship: 'Mother',
    guardianContactNumber: '09201234100',
    dateApplied: '2026-04-01',
    dateApplicationReceived: '2026-04-01',
    receivedBy: 'Carlo Bautista',
  },
  // ── DILEEP (DILP) additional ─────────────────────────────────────────────
  {
    id: 6,
    name: 'Gonzales, Rosa L.',
    service: 'DILEEP (DILP)',
    status: 'Active',
    firstName: 'Rosa',
    lastName: 'Gonzales',
    middleName: 'L.',
    sex: 'Female',
    birthdate: '1993-06-18',
    age: 32,
    civilStatus: 'Single',
    contactNumber: '09171234006',
    streetPurok: 'Purok 1',
    barangay: 'Biasong',
    cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental',
    assignedDilpProjectId: 101,
    projectName: 'Road Clearing Project',
    dilpBeneficiaryType: 'Group',
    wageRate: '₱500/day',
    projectDuration: '10 days',
    region: 'Region X (Northern Mindanao)',
    assistanceAmount: '5000',
    dateReleased: '2026-02-15',
    dateApplied: '2026-01-20',
  },
  {
    id: 7,
    name: 'Bautista, Pedro A.',
    service: 'DILEEP (DILP)',
    status: 'Active',
    firstName: 'Pedro',
    lastName: 'Bautista',
    middleName: 'A.',
    sex: 'Male',
    birthdate: '1985-11-03',
    age: 40,
    civilStatus: 'Married',
    contactNumber: '09181234007',
    streetPurok: 'Purok 5',
    barangay: 'Maloro',
    cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental',
    assignedDilpProjectId: 103,
    projectName: 'Drainage Improvement Project',
    dilpBeneficiaryType: 'Group',
    wageRate: '₱500/day',
    projectDuration: '15 days',
    region: 'Region X (Northern Mindanao)',
    assistanceAmount: '7500',
    dateApplied: '2026-03-10',
  },
  {
    id: 8,
    name: 'Villanueva, Elena S.',
    service: 'DILEEP (DILP)',
    status: 'Inactive',
    firstName: 'Elena',
    lastName: 'Villanueva',
    middleName: 'S.',
    sex: 'Female',
    birthdate: '1998-04-22',
    age: 28,
    civilStatus: 'Single',
    contactNumber: '09191234008',
    streetPurok: 'Purok 2',
    barangay: 'Pangabuan',
    cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental',
    assignedDilpProjectId: 102,
    projectName: 'Community Clean-up Drive',
    dilpBeneficiaryType: 'Group',
    wageRate: '₱500/day',
    projectDuration: '5 days',
    region: 'Region X (Northern Mindanao)',
    assistanceAmount: '2500',
    dateReleased: '2026-02-28',
    dateApplied: '2026-02-05',
  },
  {
    id: 9,
    name: 'Torres, Roberto F.',
    service: 'DILEEP (DILP)',
    status: 'Active',
    firstName: 'Roberto',
    lastName: 'Torres',
    middleName: 'F.',
    sex: 'Male',
    birthdate: '1991-09-30',
    age: 34,
    civilStatus: 'Married',
    contactNumber: '09201234009',
    streetPurok: 'Purok 4',
    barangay: 'Bocator',
    cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental',
    assignedDilpProjectId: 105,
    projectName: 'Vegetable Production Project',
    dilpBeneficiaryType: 'Individual',
    wageRate: '₱500/day',
    projectDuration: '20 days',
    region: 'Region X (Northern Mindanao)',
    assistanceAmount: '10000',
    dateApplied: '2026-04-02',
  },
  // ── DILEEP (TUPAD) additional ────────────────────────────────────────────
  {
    id: 10,
    name: 'Ramirez, Carmen D.',
    service: 'DILEEP (TUPAD)',
    status: 'Active',
    firstName: 'Carmen',
    lastName: 'Ramirez',
    middleName: 'D.',
    sex: 'Female',
    birthdate: '1996-02-14',
    age: 30,
    civilStatus: 'Single',
    contactNumber: '09221234010',
    streetPurok: 'Purok 3',
    barangay: 'Mantic',
    cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental',
    assignedDilpProjectId: 202,
    projectName: 'TUPAD Cemetery and Memorial Park Maintenance',
    dateApplied: '2026-04-12',
    dateApplicationReceived: '2026-04-12',
    receivedBy: 'Maria Santos',
    projectAssignmentHistory: [
      { projectId: 202, projectName: 'TUPAD Cemetery and Memorial Park Maintenance', assignedDate: '2026-04-12' },
    ],
  },
  {
    id: 11,
    name: 'Navarro, Jose G.',
    service: 'DILEEP (TUPAD)',
    status: 'Inactive',
    firstName: 'Jose',
    lastName: 'Navarro',
    middleName: 'G.',
    sex: 'Male',
    birthdate: '1989-07-07',
    age: 36,
    civilStatus: 'Married',
    contactNumber: '09231234011',
    streetPurok: 'Purok 1',
    barangay: 'Sta. Cruz',
    cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental',
    assignedDilpProjectId: null,
    dateApplied: '2026-03-20',
    dateApplicationReceived: '2026-03-20',
    receivedBy: 'Carlo Bautista',
    projectAssignmentHistory: [
      { projectId: 203, projectName: 'TUPAD Street Cleaning and Beautification', assignedDate: '2026-03-20', completedDate: '2026-04-10' },
    ],
  },
  {
    id: 12,
    name: 'Aquino, Lourdes M.',
    service: 'DILEEP (TUPAD)',
    status: 'Active',
    firstName: 'Lourdes',
    lastName: 'Aquino',
    middleName: 'M.',
    sex: 'Female',
    birthdate: '2000-12-01',
    age: 25,
    civilStatus: 'Single',
    contactNumber: '09241234012',
    streetPurok: 'Purok 6',
    barangay: 'Poblacion',
    cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental',
    assignedDilpProjectId: 204,
    projectName: 'TUPAD Road Maintenance and Repair',
    dateApplied: '2026-04-16',
    dateApplicationReceived: '2026-04-16',
    receivedBy: 'Maria Santos',
    projectAssignmentHistory: [
      { projectId: 204, projectName: 'TUPAD Road Maintenance and Repair', assignedDate: '2026-04-16' },
    ],
  },
  {
    id: 13,
    name: 'Mendez, Miguel R.',
    service: 'DILEEP (TUPAD)',
    status: 'Active',
    firstName: 'Miguel',
    lastName: 'Mendez',
    middleName: 'R.',
    sex: 'Male',
    birthdate: '1994-03-25',
    age: 32,
    civilStatus: 'Single',
    contactNumber: '09251234013',
    streetPurok: 'Purok 2',
    barangay: 'Biasong',
    cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental',
    assignedDilpProjectId: 203,
    projectName: 'TUPAD Street Cleaning and Beautification',
    dateApplied: '2026-05-16',
    dateApplicationReceived: '2026-05-16',
    receivedBy: 'Carlo Bautista',
    projectAssignmentHistory: [
      { projectId: 203, projectName: 'TUPAD Street Cleaning and Beautification', assignedDate: '2026-05-16' },
    ],
  },
  // ── SLP additional ───────────────────────────────────────────────────────
  {
    id: 14,
    name: 'Flores, Jasmine O.',
    service: 'SLP',
    status: 'Active',
    firstName: 'Jasmine',
    lastName: 'Flores',
    middleName: 'O.',
    sex: 'Female',
    birthdate: '1997-08-10',
    age: 28,
    civilStatus: 'Single',
    contactNumber: '09261234014',
    streetPurok: 'Purok 3',
    barangay: 'Bocator',
    cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental',
    slpParticipantIdNumber: 'SLP-2026-014',
    eligibilityType: 'Regular',
    sector: ['Women'],
    educationalAttainment: 'College Graduate',
    sourceOfIncome: 'Sewing',
    totalHouseholdMonthlyIncome: '6000',
    vulnerabilitySeverity: 'Low',
    assessmentResult: 'Qualified',
    assignedSlpProjectId: 302,
    projectName: 'SLP Food Processing and Packaging',
    slpTrack: 'Enterprise - Individual',
    dateApplied: '2026-04-26',
    dateApplicationReceived: '2026-04-26',
    receivedBy: 'Maria Santos',
  },
  {
    id: 15,
    name: 'Bernardo, Roel P.',
    service: 'SLP',
    status: 'Inactive',
    firstName: 'Roel',
    lastName: 'Bernardo',
    middleName: 'P.',
    sex: 'Male',
    birthdate: '1990-01-15',
    age: 36,
    civilStatus: 'Married',
    contactNumber: '09271234015',
    streetPurok: 'Purok 4',
    barangay: 'Maloro',
    cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental',
    slpParticipantIdNumber: 'SLP-2026-015',
    eligibilityType: 'Regular',
    educationalAttainment: 'High School Graduate (Junior High-4 Years)',
    assessmentResult: 'Not Qualified',
    assignedSlpProjectId: null,
    dateApplied: '2026-03-15',
  },
  {
    id: 16,
    name: 'Castillo, Teresita G.',
    service: 'SLP',
    status: 'Active',
    firstName: 'Teresita',
    lastName: 'Castillo',
    middleName: 'G.',
    sex: 'Female',
    birthdate: '1985-05-20',
    age: 41,
    civilStatus: 'Widowed',
    contactNumber: '09281234016',
    streetPurok: 'Purok 2',
    barangay: 'Panalsalan',
    cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental',
    is4PsBeneficiary: true,
    slpParticipantIdNumber: 'SLP-2026-016',
    eligibilityType: 'Regular',
    sector: ['Solo Parent', 'Women'],
    educationalAttainment: 'Elementary Graduate',
    totalHouseholdMonthlyIncome: '4500',
    vulnerabilitySeverity: 'High',
    assessmentResult: 'Qualified',
    assignedSlpProjectId: 303,
    projectName: 'SLP Sewing and Garments Production',
    slpTrack: 'Enterprise - Group',
    dateApplied: '2026-05-11',
    dateApplicationReceived: '2026-05-11',
    receivedBy: 'Maria Santos',
  },
  {
    id: 17,
    name: 'Magno, Alfonso K.',
    service: 'SLP',
    status: 'Active',
    firstName: 'Alfonso',
    lastName: 'Magno',
    middleName: 'K.',
    sex: 'Male',
    birthdate: '1992-10-05',
    age: 33,
    civilStatus: 'Single',
    contactNumber: '09291234017',
    streetPurok: 'Purok 5',
    barangay: 'Mantic',
    cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental',
    slpParticipantIdNumber: 'SLP-2026-017',
    eligibilityType: 'Regular',
    sector: ['Unemployed Youth'],
    educationalAttainment: 'College Level',
    totalHouseholdMonthlyIncome: '5000',
    vulnerabilitySeverity: 'Medium',
    assessmentResult: 'Qualified',
    assignedSlpProjectId: 301,
    projectName: 'Sustainable Livelihood Program - Handicrafts',
    slpTrack: 'Enterprise - Individual',
    dateApplied: '2026-03-19',
    dateApplicationReceived: '2026-03-19',
    receivedBy: 'Carlo Bautista',
  },
  // ── CLPEP additional ─────────────────────────────────────────────────────
  {
    id: 18,
    name: 'Lacuesta, Maricris N.',
    service: 'CLPEP',
    status: 'Accepted',
    firstName: 'Maricris',
    lastName: 'Lacuesta',
    middleName: 'N.',
    sex: 'Female',
    birthdate: '2010-03-12',
    age: 16,
    civilStatus: 'Single',
    contactNumber: '09301234018',
    streetPurok: 'Purok 1',
    barangay: 'Poblacion',
    cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental',
    assignedInterventionId: 1,
    cooperativeName: 'Educational Assistance Program',
    childLaborStatus: 'Child Laborer',
    schoolStatus: 'Enrolled',
    natureOfWork: 'Street Vending',
    currentlyWorking: true,
    hoursWorkedPerWeek: '15',
    schoolName: 'Tangub City Central School',
    gradeYearLevel: 'Grade 10',
    guardianName: 'Nora Lacuesta',
    guardianRelationship: 'Mother',
    guardianContactNumber: '09301234100',
    dateApplied: '2026-03-25',
    dateApplicationReceived: '2026-03-25',
    receivedBy: 'Maria Santos',
  },
  {
    id: 19,
    name: 'Ramos, Anton J.',
    service: 'CLPEP',
    status: 'Accepted',
    firstName: 'Anton',
    lastName: 'Ramos',
    middleName: 'J.',
    sex: 'Male',
    birthdate: '2012-07-19',
    age: 13,
    civilStatus: 'Single',
    contactNumber: '09311234019',
    streetPurok: 'Purok 6',
    barangay: 'Biasong',
    cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental',
    assignedInterventionId: 2,
    cooperativeName: 'Family Development Session',
    childLaborStatus: 'At Risk',
    schoolStatus: 'Enrolled',
    natureOfWork: 'Farm Work',
    currentlyWorking: false,
    hoursWorkedPerWeek: '0',
    schoolName: 'Tangub City National High School',
    gradeYearLevel: 'Grade 7',
    guardianName: 'Ernesto Ramos',
    guardianRelationship: 'Father',
    guardianContactNumber: '09311234200',
    dateApplied: '2026-04-18',
    dateApplicationReceived: '2026-04-18',
    receivedBy: 'Carlo Bautista',
  },
  {
    id: 20,
    name: 'Fernandez, Luisa B.',
    service: 'CLPEP',
    status: 'Waitlisted',
    firstName: 'Luisa',
    lastName: 'Fernandez',
    middleName: 'B.',
    sex: 'Female',
    birthdate: '2009-11-25',
    age: 16,
    civilStatus: 'Single',
    contactNumber: '09321234020',
    streetPurok: 'Purok 3',
    barangay: 'Maloro',
    cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental',
    assignedInterventionId: null,
    childLaborStatus: 'At Risk',
    schoolStatus: 'Dropped Out',
    natureOfWork: 'Domestic Work',
    currentlyWorking: true,
    hoursWorkedPerWeek: '30',
    schoolName: '',
    gradeYearLevel: 'Grade 8',
    guardianName: 'Perla Fernandez',
    guardianRelationship: 'Grandmother',
    guardianContactNumber: '09321234300',
    dateApplied: '2026-03-30',
    dateApplicationReceived: '2026-03-30',
    receivedBy: 'Maria Santos',
  },
  {
    id: 21,
    name: 'Salazar, Domingo V.',
    service: 'CLPEP',
    status: 'Accepted',
    firstName: 'Domingo',
    lastName: 'Salazar',
    middleName: 'V.',
    sex: 'Male',
    birthdate: '2011-05-04',
    age: 15,
    civilStatus: 'Single',
    contactNumber: '09331234021',
    streetPurok: 'Purok 4',
    barangay: 'Bocator',
    cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental',
    assignedInterventionId: 1,
    cooperativeName: 'Educational Assistance Program',
    childLaborStatus: 'Child Laborer',
    schoolStatus: 'Enrolled',
    natureOfWork: 'Scavenging',
    currentlyWorking: true,
    hoursWorkedPerWeek: '12',
    schoolName: 'Bocator Elementary School',
    gradeYearLevel: 'Grade 9',
    guardianName: 'Carla Salazar',
    guardianRelationship: 'Aunt',
    guardianContactNumber: '09331234400',
    dateApplied: '2026-04-05',
    dateApplicationReceived: '2026-04-05',
    receivedBy: 'Carlo Bautista',
  },
]
