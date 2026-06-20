// Types and seed data for the Livelihood Programs module.
// Each tab manages its own localStorage state — no React context wrapper needed.

export type LivelihoodService = 'DILEEP (DILP)' | 'DILEEP (TUPAD)' | 'SLP' | 'CLPEP'

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
    assignedDilpProjectId: 104,
    projectName: 'Hog Raising Livelihood Project',
    dilpBeneficiaryType: 'Individual',
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
    nameExtension: '',
    sex: 'Female',
    birthdate: '1992-11-15',
    age: 33,
    civilStatus: 'Married',
    contactNumber: '09191234003',
    email: '',
    houseBlockLotNo: '',
    streetPurok: 'Purok 1',
    barangay: 'Pangabuan',
    cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental',
    is4PsBeneficiary: false,
    slpParticipantIdNumber: '',
    eligibilityType: 'Regular',
    sector: [],
    sectorOthersSpecify: '',
    educationalAttainment: '',
    sourceOfIncome: '',
    totalHouseholdMonthlyIncome: '',
    householdVulnerabilityScore: '',
    vulnerabilitySeverity: 'Low',
    assessmentResult: 'Qualified',
    assignedSlpProjectId: 1,
    projectName: 'Handicrafts',
    slpTrack: '',
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
    nameExtension: '',
    sex: 'Male',
    birthdate: '1988-05-08',
    age: 38,
    civilStatus: 'Married',
    contactNumber: '09201234004',
    email: '',
    streetPurok: 'Purok 3',
    barangay: 'Sta. Cruz',
    cityMunicipality: 'Tangub City',
    province: 'Misamis Occidental',
    dateApplied: '2026-04-01',
    cooperativeName: '',
    cooperativeRole: '',
    remarks: '',
    attachedForms: [],
    dateApplicationReceived: '2026-04-01',
    receivedBy: 'Carlo Bautista',
  },
]
