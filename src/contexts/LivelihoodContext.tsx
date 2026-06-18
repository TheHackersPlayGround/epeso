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
  // ── Attachments (stored as file name list only)
  attachedForms?: string[]
  // ── SLP fields
  slpTrack?: string
  livelihoodGrantAmount?: string
  // ── CLPEP fields
  cooperativeName?: string
  cooperativeRole?: string
}

export const LIVELIHOOD_SEED: LivelihoodBeneficiary[] = [
  {
    id: 1,
    name: 'Juan Dela Cruz',
    service: 'DILEEP (DILP)',
    status: 'Active',
    barangay: 'Barangay 1',
    dateEnrolled: '2026-01-10',
    projectName: 'Road Clearing Project',
    wageRate: '₱500/day',
    projectDuration: '10 days',
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
    attachedForms: [],
  },
  {
    id: 3,
    name: 'Ana Reyes',
    service: 'SLP',
    status: 'Active',
    barangay: 'Barangay 5',
    dateEnrolled: '2026-03-01',
    slpTrack: 'Micro-enterprise Development',
    livelihoodGrantAmount: '₱15,000',
  },
  {
    id: 4,
    name: 'Roberto Manalo',
    service: 'CLPEP',
    status: 'Pending',
    barangay: 'Barangay 2',
    dateEnrolled: '2026-04-12',
    cooperativeName: 'Tangub Farmers Cooperative',
    cooperativeRole: 'Member',
  },
]
