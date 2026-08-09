export type Applicant = {
  id: number;
  name: string;
  gender: string;
  age: number;
  education: string;
  skills: string;
  employmentStatus: string;
  contactNumber: string;
  email: string;
  address: string;
  civilStatus?: string;
  hasDisability?: boolean;
  isOFW?: boolean;
  isFormerOFW?: boolean;
  is4PsBeneficiary?: boolean;
  jobPreference?: string;
  language?: string;
  trainingCourses?: string;
  // Refer-action lock state computed by the backend from referrals/placements:
  // 'Refer' = free, 'Referred' = live referral, 'Hired' = active placement.
  referralState?: 'Refer' | 'Referred' | 'Hired';
  fullFormData?: Record<string, unknown>;
};

export type Employer = {
  id: number
  companyName: string
  industry: string
  industryOther: string
  companySize: string
  businessType: string
  yearsInOperation: string
  tinNumber: string
  contactPersonName: string
  position: string
  contactNumber: string
  email: string
  buildingNo: string
  street: string
  barangay: string
  city: string
  province: string
  region: string
  barangayId?: number | null
  cityId?: number | null
  provinceId?: number | null
  jobOpenings: Array<{ jobName: string; slots: string }>
  status: 'Active' | 'Inactive'
  dateRegistered: string
  remarks: string
}

export type Vacancy = {
  id: number
  jobTitle: string
  employer: string
  employerId?: number
  vacanciesCount: number      // remaining openings (derived: slotsTotal - active placements)
  slotsTotal?: number         // original openings solicited (source of truth)
  industry: string
  jobType: string
  // Atomic bounds (source of truth); salaryRange is the derived display string.
  salaryMin?: number
  salaryMax?: number
  salaryRange: string
  description: string
  requirements: string
  status: 'Open' | 'Closed'   // effective status (Closed when manually closed OR full)
  manualStatus?: 'Open' | 'Closed'  // officer's open/close intent (drives the toggle)
}

export type Referral = {
  id: number
  applicantId: number
  applicantName: string
  vacancyId: number
  jobTitle: string
  employer: string
  referralDate: string        // ISO date string, e.g. "2026-06-18"
  status: 'Pending' | 'Interviewed' | 'Not Hired'
}

export type Placement = {
  id: number
  applicantId: number
  applicantName: string
  jobTitle: string
  currentJobTitle: string
  employer: string
  dateHired: string
  status: 'Active' | 'Resigned' | 'Terminated' | 'Completed'
  employmentType?: string
  referralId?: number
  vacancyId?: number
  salaryRange?: string
}
