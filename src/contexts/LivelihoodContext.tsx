// Types and seed data for the Livelihood Programs module.
// Each tab manages its own localStorage state — no React context wrapper needed.

export type LivelihoodService = 'DILEEP (DILP)' | 'DILEEP (TUPAD)' | 'SLP' | 'CLPEP'

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
    id: 1, title: 'Handicrafts', date: '2026-03-18',
    location: 'Community Center, Tangub City',
    description: 'Livelihood training for handicraft production',
    status: 'Ongoing', facilitator: 'Rosa Garcia', participants: 20,
    assistanceAmount: '10000', dateReleased: '2026-04-01',
  },
  {
    id: 2, title: 'SLP Food Processing and Packaging', date: '2026-04-25',
    location: 'DOLE Training Center, Tangub City',
    description: 'Livelihood training for food processing microenterprises',
    status: 'Planned', facilitator: 'Maribel Cruz', participants: 15,
    assistanceAmount: '8000', dateReleased: '2026-05-10',
  },
  {
    id: 3, title: 'SLP Sewing and Garments Production', date: '2026-05-10',
    location: 'Barangay Hall, Tangub City',
    description: 'Skills-based livelihood training on garments and dressmaking',
    status: 'Planned', facilitator: 'Leonora Reyes', participants: 12,
    assistanceAmount: '7500', dateReleased: '2026-06-15',
  },
]

// ─── CLPEP Intervention ───────────────────────────────────────────────────────

export type CLPEPIntervention = {
  id: number
  title: string
  type: string
  status: 'Planned' | 'Active' | 'Completed'
  location: string
  description: string
  targetBeneficiaries?: number
  startDate?: string
  endDate?: string
  implementingOfficer?: string
  partnerAgency?: string
}

export const CLPEP_INTERVENTIONS_SEED: CLPEPIntervention[] = [
  {
    id: 1, title: 'Educational Assistance Program',
    type: 'Educational Assistance', status: 'Active',
    location: 'Barangay Community Center, Tangub City',
    description: 'Provides educational support and school supplies to child laborers and at-risk children.',
    targetBeneficiaries: 15, startDate: '2026-03-22', endDate: '2026-12-22',
    implementingOfficer: 'Angela Martinez', partnerAgency: 'DepEd',
  },
  {
    id: 2, title: 'Family Development Session',
    type: 'Family Intervention', status: 'Planned',
    location: 'Community Hall, Tangub City',
    description: 'Educational program for families to prevent child labor through awareness and livelihood support.',
    targetBeneficiaries: 20, startDate: '2026-04-15', endDate: '2026-12-15',
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
  projectDuration?: string               // e.g. "10 days"
  wageRate?: string                      // e.g. "₱500/day"
  region?: string
  assistanceAmount?: string
  dateReleased?: string
  // ── Attachments (stored as file name list only)
  attachedForms?: string[]
  // ── SLP fields
  assignedSlpProjectId?: number | null
  slpTrack?: string
  livelihoodGrantAmount?: string
  slpParticipantIdNumber?: string
  eligibilityType?: string           // "Regular", "Special", etc.
  houseBlockLotNo?: string
  sector?: string[]                  // multi-select: IP, IDP, OFW, PWD, etc.
  sectorOthersSpecify?: string       // free-text when "Others" is checked
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
    attachedForms: [],
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
    attachedForms: [],
  },
  {
    id: 3,
    name: 'Cruz, Ana T.',
    service: 'SLP',
    status: 'Completed',
    firstName: 'Ana',
    lastName: 'Cruz',
    middleName: 'T.',
    sex: 'Female',
    birthdate: '1992-11-15',
    age: 33,
    civilStatus: 'Married',
    contactNumber: '09191234003',
    houseBlockLotNo: '12',
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
    assignedSlpProjectId: 1,
    projectName: 'Handicrafts',
    slpTrack: 'Enterprise - Individual',
    remarks: 'Successfully completed SLP training.',
    dateApplied: '2026-02-20',
    dateApplicationReceived: '2026-02-20',
    receivedBy: 'Maria Santos',
    attachedForms: [],
  },
  {
    id: 4,
    name: 'Dela Torre, Carlos M.',
    service: 'CLPEP',
    status: 'Active',
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
    assignedInterventionId: 1,
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
    attachedForms: [],
    dateApplicationReceived: '2026-04-01',
    receivedBy: 'Carlo Bautista',
  },
]
