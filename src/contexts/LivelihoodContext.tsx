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
  barangayId?: number
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

