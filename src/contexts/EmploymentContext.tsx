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
  jobOpenings: Array<{ jobName: string; slots: string }>
  status: 'Active' | 'Inactive'
  dateRegistered: string
  remarks: string
}

export const EMPLOYER_SEED: Employer[] = [
  { id: 1, companyName: 'ABC Corporation', industry: 'Manufacturing', industryOther: '', companySize: 'Large (201+ employees)', businessType: 'Corporation', yearsInOperation: '15', tinNumber: '123-456-789-000', contactPersonName: 'Maria Santos', position: 'HR Manager', contactNumber: '09123456789', email: 'hr@abccorp.com', buildingNo: '1', street: 'Rizal St', barangay: 'Poblacion', city: 'Tangub City', province: 'Misamis Occidental', region: 'Region X', jobOpenings: [{ jobName: 'Accountant', slots: '3' }], status: 'Active', dateRegistered: '2020-01-15', remarks: '' },
  { id: 2, companyName: 'TechHub Solutions', industry: 'Information Technology', industryOther: '', companySize: 'Medium (51-200 employees)', businessType: 'Corporation', yearsInOperation: '8', tinNumber: '234-567-890-000', contactPersonName: 'John Reyes', position: 'CEO', contactNumber: '09234567890', email: 'jobs@techhub.com', buildingNo: '2', street: 'Mabini St', barangay: 'Mantic', city: 'Tangub City', province: 'Misamis Occidental', region: 'Region X', jobOpenings: [{ jobName: 'IT Support', slots: '2' }], status: 'Active', dateRegistered: '2021-03-10', remarks: '' },
  { id: 3, companyName: 'Green Valley Farm', industry: 'Agriculture', industryOther: '', companySize: 'Small (1-50 employees)', businessType: 'Sole Proprietorship', yearsInOperation: '20', tinNumber: '345-678-901-000', contactPersonName: 'Rosa Garcia', position: 'Owner', contactNumber: '09345678901', email: 'hr@greenvalley.ph', buildingNo: '3', street: 'National Highway', barangay: 'Maloro', city: 'Tangub City', province: 'Misamis Occidental', region: 'Region X', jobOpenings: [{ jobName: 'Farm Worker', slots: '10' }], status: 'Active', dateRegistered: '2019-06-01', remarks: '' },
  { id: 4, companyName: 'City Hospital', industry: 'Healthcare', industryOther: '', companySize: 'Large (201+ employees)', businessType: 'Corporation', yearsInOperation: '30', tinNumber: '456-789-012-000', contactPersonName: 'Dr. Pedro Lim', position: 'Administrator', contactNumber: '09456789012', email: 'admin@cityhospital.gov.ph', buildingNo: '1', street: 'Hospital Road', barangay: 'Poblacion', city: 'Tangub City', province: 'Misamis Occidental', region: 'Region X', jobOpenings: [{ jobName: 'Nurse', slots: '2' }, { jobName: 'Nurse Aide', slots: '3' }], status: 'Active', dateRegistered: '2018-01-01', remarks: '' },
  { id: 5, companyName: 'XYZ School', industry: 'Education', industryOther: '', companySize: 'Medium (51-200 employees)', businessType: 'Corporation', yearsInOperation: '25', tinNumber: '567-890-123-000', contactPersonName: 'Ana Cruz', position: 'Principal', contactNumber: '09567890123', email: 'hr@xyzschool.edu.ph', buildingNo: '10', street: 'School St', barangay: 'Banglay', city: 'Tangub City', province: 'Misamis Occidental', region: 'Region X', jobOpenings: [{ jobName: 'Teacher', slots: '5' }], status: 'Active', dateRegistered: '2019-08-01', remarks: '' },
]

export type Vacancy = {
  id: number
  jobTitle: string
  employer: string
  vacanciesCount: number
  industry: string
  jobType: string
  salaryRange: string
  description: string
  requirements: string
  status: 'Open' | 'Closed'
}

export const VACANCY_SEED: Vacancy[] = [
  { id: 1, jobTitle: 'Accountant',           employer: 'ABC Corporation',       vacanciesCount: 3,  industry: 'Manufacturing',          jobType: 'Full-time', salaryRange: '₱20,000 - ₱30,000', description: 'Responsible for financial records and reporting.', requirements: 'BS Accountancy graduate, CPA preferred.', status: 'Open' },
  { id: 2, jobTitle: 'Teacher',              employer: 'XYZ School',            vacanciesCount: 5,  industry: 'Education',              jobType: 'Full-time', salaryRange: '₱18,000 - ₱25,000', description: 'Teach core subjects to elementary students.', requirements: 'LET passer, BS Education graduate.', status: 'Open' },
  { id: 3, jobTitle: 'Construction Worker',  employer: 'BuildCo',               vacanciesCount: 10, industry: 'Construction',           jobType: 'Contract',  salaryRange: '₱12,000 - ₱18,000', description: 'Assist in building construction projects.', requirements: 'With experience in construction work.', status: 'Open' },
  { id: 4, jobTitle: 'Nurse',               employer: 'City Hospital',          vacanciesCount: 2,  industry: 'Healthcare',             jobType: 'Full-time', salaryRange: '₱22,000 - ₱28,000', description: 'Provide patient care and medical assistance.', requirements: 'RN licensed, at least 1 year experience.', status: 'Open' },
  { id: 5, jobTitle: 'Administrative Asst', employer: 'City Hall',              vacanciesCount: 1,  industry: 'Government',             jobType: 'Full-time', salaryRange: '₱15,000 - ₱20,000', description: 'Provide administrative support to the office.', requirements: 'College graduate, computer literate.', status: 'Open' },
  { id: 6, jobTitle: 'Welder',              employer: 'ABC Construction',       vacanciesCount: 4,  industry: 'Construction',           jobType: 'Contract',  salaryRange: '₱15,000 - ₱22,000', description: 'Perform welding tasks on construction sites.', requirements: 'NC II holder in welding, with experience.', status: 'Open' },
  { id: 7, jobTitle: 'Nurse Aide',          employer: 'Tangub City Hospital',   vacanciesCount: 3,  industry: 'Healthcare',             jobType: 'Part-time', salaryRange: '₱10,000 - ₱14,000', description: 'Assist nurses in patient care duties.', requirements: 'Nursing aide certificate, willing to work shifts.', status: 'Open' },
  { id: 8, jobTitle: 'IT Support',          employer: 'DOST Regional Office',   vacanciesCount: 2,  industry: 'Information Technology', jobType: 'Full-time', salaryRange: '₱20,000 - ₱28,000', description: 'Provide technical support and maintain IT systems.', requirements: 'BS Computer Science or IT graduate.', status: 'Open' },
  { id: 9, jobTitle: 'Cook',               employer: 'Tangub City Restaurant', vacanciesCount: 6,  industry: 'Hospitality',            jobType: 'Full-time', salaryRange: '₱12,000 - ₱16,000', description: 'Prepare and cook meals for restaurant service.', requirements: 'With experience in food preparation, TESDA NC II preferred.', status: 'Open' },
]

export type Referral = {
  id: number
  applicantId: number
  applicantName: string
  vacancyId: number
  jobTitle: string
  employer: string
  referralDate: string        // ISO date string, e.g. "2026-06-18"
  status: 'Pending' | 'Interviewed' | 'Not Hired'
  notes?: string
}

export const REFERRAL_SEED: Referral[] = [
  { id: 1, applicantId: 1, applicantName: 'Maria Santos',          vacancyId: 4, jobTitle: 'Nurse',      employer: 'City Hospital',        referralDate: '2026-06-10', status: 'Pending',     notes: '' },
  { id: 2, applicantId: 2, applicantName: 'Juan Santos Dela Cruz', vacancyId: 1, jobTitle: 'Accountant', employer: 'ABC Corporation',      referralDate: '2026-06-08', status: 'Interviewed', notes: '' },
  { id: 4, applicantId: 4, applicantName: 'Roberto Manalo',        vacancyId: 8, jobTitle: 'IT Support', employer: 'DOST Regional Office', referralDate: '2026-06-01', status: 'Not Hired',   notes: 'Position filled by another candidate.' },
  { id: 5, applicantId: 5, applicantName: 'Ligaya Flores',         vacancyId: 7, jobTitle: 'Nurse Aide', employer: 'Tangub City Hospital', referralDate: '2026-06-12', status: 'Pending',     notes: '' },
]

export type Placement = {
  id: number
  applicantId: number
  applicantName: string
  jobTitle: string
  employer: string
  dateHired: string
  status: 'Active' | 'Resigned' | 'Terminated' | 'Completed'
  employmentType?: string
  source?: string
  referralId?: number
  vacancyId?: number
  salaryRange?: string
  notes?: string
}

export const PLACEMENT_SEED: Placement[] = [
  { id: 1, applicantId: 3, applicantName: 'Ana Reyes', jobTitle: 'Cook', employer: 'Tangub City Restaurant', dateHired: '2026-06-05', status: 'Active', employmentType: 'Full-time', source: 'Referral', referralId: 3, vacancyId: 9, salaryRange: '₱12,000 - ₱16,000', notes: 'Passed interview and accepted the offer.' },
]

export const SEED: Applicant[] = [
  {
    id: 1,
    name: "Maria Santos",
    gender: "Female",
    age: 28,
    education: "Bachelor of Science in Nursing (Tertiary)",
    skills: "Caregiving, Healthcare, Patient Assessment",
    employmentStatus: "Unemployed",
    contactNumber: "09171234567",
    email: "maria.santos@email.com",
    address: "Brgy. Maloro, Tangub City",
    civilStatus: "Single",
    hasDisability: false,
    isOFW: false,
    isFormerOFW: false,
    is4PsBeneficiary: false,
    jobPreference: "Healthcare",
    language: "Filipino",
    fullFormData: {
      firstName: "Maria",
      middleName: "Cruz",
      surname: "Santos",
      suffix: "",
      dateOfBirth: "1998-05-10",
      sex: "Female",
      religion: "Roman Catholic",
      civilStatus: "Single",
      height: "5'4\"",
      houseNo: "Blk 3",
      barangay: "Maloro",
      municipality: "Tangub City",
      province: "Misamis Occidental",
      contactNumber: "09171234567",
      email: "maria.santos@email.com",
      tin: "",
      isOFW: "No",
      ofwCountry: "",
      isFormerOFW: "No",
      formerOFWCountry: "",
      formerOFWReturnDate: "",
      is4PsBeneficiary: "No",
      householdIdNo: "",
      hasDisability: [],
      disabilityOther: "",
      currentlyInSchool: "No",
      elementary: {
        schoolName: "Maloro Elementary School",
        schoolCity: "Tangub City",
        schoolProvince: "Misamis Occidental",
        graduated: "Yes",
        yearGraduated: "2010",
        levelReached: "",
        yearLastAttended: "2010",
      },
      secondary: {
        schoolName: "Tangub City National High School",
        schoolCity: "Tangub City",
        schoolProvince: "Misamis Occidental",
        type: "Public",
        seniorHighStrand: "HUMSS",
        graduated: "Yes",
        yearGraduated: "2016",
        levelReached: "",
        yearLastAttended: "2016",
      },
      tertiary: {
        schoolName: "Misamis University",
        schoolCity: "Ozamiz City",
        schoolProvince: "Misamis Occidental",
        course: "Bachelor of Science in Nursing",
        graduated: "Yes",
        yearGraduated: "2020",
        levelReached: "",
        yearLastAttended: "2020",
      },
      graduateStudies: [],
      trainings: [
        {
          course: "Basic Life Support & CPR",
          hoursOfTraining: "16",
          institution: "Philippine Red Cross",
          skillsAcquired: "CPR, First Aid",
          certificateReceived: "Yes",
        },
      ],
      eligibilities: [],
      professionalLicenses: [],
      workExperiences: [
        {
          companyName: "Tangub City Rural Health Unit",
          position: "Community Health Nurse",
          from: "2021-01",
          to: "2023-06",
          status: "Regular",
        },
      ],
      otherSkills: ["Caregiving", "Healthcare", "Patient Assessment", "Vital Signs Monitoring"],
      otherSkillsSpecify: [],
      jobPreferences: [
        {
          occupation: "Nurse",
          employmentType: ["Regular", "Part-time"],
          workLocation: ["Local", "Abroad"],
        },
      ],
      languages: [
        { language: "Filipino", read: true, write: true, speak: true, understand: true },
        { language: "English", read: true, write: true, speak: true, understand: true },
        { language: "Bisaya", read: false, write: false, speak: true, understand: true },
      ],
      referredProgram: "",
      cdspPrograms: [],
      projectIdNumber: "",
      projectLocation: "",
      projectRegion: "",
      projectCity: "",
      projectDetails: { type: [], programComponent: [], wayOfImplementation: [], nameOfProject: "" },
      pagIbigNo: "",
      philHealthNo: "",
      sssNo: "",
      otherProgramName: "",
      otherProgramNo: "",
    },
  },
  {
    id: 2,
    name: "Juan Santos Dela Cruz",
    gender: "Male",
    age: 27,
    education: "Bachelor of Science in Accountancy (Tertiary)",
    skills: "Accounting, MS Excel, Bookkeeping, QuickBooks, Financial Analysis",
    employmentStatus: "Unemployed",
    contactNumber: "09171234567",
    email: "juan.delacruz@gmail.com",
    address: "P-4, Mantic, Tangub City",
    civilStatus: "Single",
    hasDisability: false,
    isOFW: false,
    isFormerOFW: false,
    is4PsBeneficiary: false,
    jobPreference: "Accounting",
    language: "Filipino",
    fullFormData: {
      firstName: "Juan",
      middleName: "Santos",
      surname: "Dela Cruz",
      suffix: "",
      dateOfBirth: "1999-03-15",
      sex: "Male",
      religion: "Roman Catholic",
      civilStatus: "Single",
      height: "5'7\"",
      houseNo: "P-4",
      barangay: "Mantic",
      municipality: "Tangub City",
      province: "Misamis Occidental",
      contactNumber: "09171234567",
      email: "juan.delacruz@gmail.com",
      tin: "",
      isOFW: "No",
      ofwCountry: "",
      isFormerOFW: "No",
      formerOFWCountry: "",
      formerOFWReturnDate: "",
      is4PsBeneficiary: "No",
      householdIdNo: "",
      hasDisability: [],
      disabilityOther: "",
      currentlyInSchool: "No",
      elementary: {
        schoolName: "Mantic Elementary School",
        schoolCity: "Tangub City",
        schoolProvince: "Misamis Occidental",
        graduated: "Yes",
        yearGraduated: "2013",
        levelReached: "",
        yearLastAttended: "2013",
      },
      secondary: {
        schoolName: "Tangub City National High School",
        schoolCity: "Tangub City",
        schoolProvince: "Misamis Occidental",
        type: "Public",
        seniorHighStrand: "ABM",
        graduated: "Yes",
        yearGraduated: "2019",
        levelReached: "",
        yearLastAttended: "2019",
      },
      tertiary: {
        schoolName: "Misamis University",
        schoolCity: "Ozamiz City",
        schoolProvince: "Misamis Occidental",
        course: "Bachelor of Science in Accountancy",
        graduated: "Yes",
        yearGraduated: "2023",
        levelReached: "",
        yearLastAttended: "2023",
      },
      graduateStudies: [],
      trainings: [],
      eligibilities: [],
      professionalLicenses: [],
      workExperiences: [
        {
          companyName: "Tangub City Local Government Unit",
          position: "Accounting Staff",
          from: "2023-01",
          to: "2024-06",
          status: "Regular",
        },
      ],
      otherSkills: ["Accounting", "MS Excel", "Bookkeeping", "QuickBooks", "Financial Analysis"],
      otherSkillsSpecify: [],
      jobPreferences: [
        {
          occupation: "Accountant",
          employmentType: ["Regular"],
          workLocation: ["Local"],
        },
      ],
      languages: [
        { language: "Filipino", read: true, write: true, speak: true, understand: true },
        { language: "English", read: true, write: true, speak: true, understand: true },
      ],
      referredProgram: "",
      cdspPrograms: [],
      projectIdNumber: "",
      projectLocation: "",
      projectRegion: "",
      projectCity: "",
      projectDetails: { type: [], programComponent: [], wayOfImplementation: [], nameOfProject: "" },
      pagIbigNo: "",
      philHealthNo: "",
      sssNo: "",
      otherProgramName: "",
      otherProgramNo: "",
    },
  },
  {
    id: 3,
    name: "Ana Reyes",
    gender: "Female",
    age: 22,
    education: "Senior High School Graduate",
    skills: "Cooking, Customer Service",
    employmentStatus: "Unemployed",
    contactNumber: "09351112233",
    email: "ana.reyes@email.com",
    address: "Brgy. Bocator, Tangub City",
    civilStatus: "Single",
    hasDisability: false,
    isOFW: false,
    isFormerOFW: false,
    is4PsBeneficiary: true,
    jobPreference: "Service Industry",
    language: "Filipino",
    fullFormData: {
      firstName: "Ana",
      middleName: "Lim",
      surname: "Reyes",
      suffix: "",
      dateOfBirth: "2004-08-22",
      sex: "Female",
      religion: "Roman Catholic",
      civilStatus: "Single",
      height: "5'2\"",
      houseNo: "Blk 5",
      barangay: "Bocator",
      municipality: "Tangub City",
      province: "Misamis Occidental",
      contactNumber: "09351112233",
      email: "ana.reyes@email.com",
      tin: "",
      isOFW: "No",
      ofwCountry: "",
      isFormerOFW: "No",
      formerOFWCountry: "",
      formerOFWReturnDate: "",
      is4PsBeneficiary: "Yes",
      householdIdNo: "4PS-2024-00123",
      hasDisability: [],
      disabilityOther: "",
      currentlyInSchool: "No",
      elementary: {
        schoolName: "Bocator Elementary School",
        schoolCity: "Tangub City",
        schoolProvince: "Misamis Occidental",
        graduated: "Yes",
        yearGraduated: "2016",
        levelReached: "",
        yearLastAttended: "2016",
      },
      secondary: {
        schoolName: "Tangub City National High School",
        schoolCity: "Tangub City",
        schoolProvince: "Misamis Occidental",
        type: "Public",
        seniorHighStrand: "TVL",
        graduated: "Yes",
        yearGraduated: "2022",
        levelReached: "",
        yearLastAttended: "2022",
      },
      tertiary: {
        schoolName: "",
        schoolCity: "",
        schoolProvince: "",
        course: "",
        graduated: "No",
        yearGraduated: "",
        levelReached: "",
        yearLastAttended: "",
      },
      graduateStudies: [],
      trainings: [
        {
          course: "Food and Beverage Services NCII",
          hoursOfTraining: "80",
          institution: "TESDA Tangub City",
          skillsAcquired: "Food Service, Customer Relations",
          certificateReceived: "Yes",
        },
      ],
      eligibilities: [],
      professionalLicenses: [],
      workExperiences: [],
      otherSkills: ["Cooking", "Customer Service", "Food Preparation", "Barista"],
      otherSkillsSpecify: [],
      jobPreferences: [
        {
          occupation: "Food Service Worker",
          employmentType: ["Regular", "Part-time"],
          workLocation: ["Local"],
        },
      ],
      languages: [
        { language: "Filipino", read: true, write: true, speak: true, understand: true },
        { language: "Bisaya", read: false, write: false, speak: true, understand: true },
      ],
      referredProgram: "",
      cdspPrograms: [],
      projectIdNumber: "",
      projectLocation: "",
      projectRegion: "",
      projectCity: "",
      projectDetails: { type: [], programComponent: [], wayOfImplementation: [], nameOfProject: "" },
      pagIbigNo: "",
      philHealthNo: "",
      sssNo: "",
      otherProgramName: "",
      otherProgramNo: "",
    },
  },
  {
    id: 4,
    name: "Roberto Manalo",
    gender: "Male",
    age: 45,
    education: "Bachelor of Science in Information Technology (Tertiary)",
    skills: "IT / Technology, Computer Literacy, Network Administration",
    employmentStatus: "Employed",
    contactNumber: "09456667788",
    email: "roberto.manalo@email.com",
    address: "Brgy. San Pablo, Tangub City",
    civilStatus: "Married",
    hasDisability: true,
    isOFW: false,
    isFormerOFW: false,
    is4PsBeneficiary: false,
    jobPreference: "IT / Technology",
    language: "English",
    fullFormData: {
      firstName: "Roberto",
      middleName: "Garcia",
      surname: "Manalo",
      suffix: "",
      dateOfBirth: "1981-11-03",
      sex: "Male",
      religion: "Roman Catholic",
      civilStatus: "Married",
      height: "5'9\"",
      houseNo: "123",
      barangay: "San Pablo",
      municipality: "Tangub City",
      province: "Misamis Occidental",
      contactNumber: "09456667788",
      email: "roberto.manalo@email.com",
      tin: "",
      isOFW: "No",
      ofwCountry: "",
      isFormerOFW: "No",
      formerOFWCountry: "",
      formerOFWReturnDate: "",
      is4PsBeneficiary: "No",
      householdIdNo: "",
      hasDisability: ["Visual Disability"],
      disabilityOther: "",
      currentlyInSchool: "No",
      elementary: {
        schoolName: "San Pablo Elementary School",
        schoolCity: "Tangub City",
        schoolProvince: "Misamis Occidental",
        graduated: "Yes",
        yearGraduated: "1993",
        levelReached: "",
        yearLastAttended: "1993",
      },
      secondary: {
        schoolName: "Tangub City National High School",
        schoolCity: "Tangub City",
        schoolProvince: "Misamis Occidental",
        type: "Public",
        seniorHighStrand: "",
        graduated: "Yes",
        yearGraduated: "1997",
        levelReached: "",
        yearLastAttended: "1997",
      },
      tertiary: {
        schoolName: "Capitol University",
        schoolCity: "Cagayan de Oro",
        schoolProvince: "Misamis Oriental",
        course: "Bachelor of Science in Information Technology",
        graduated: "Yes",
        yearGraduated: "2001",
        levelReached: "",
        yearLastAttended: "2001",
      },
      graduateStudies: [],
      trainings: [
        {
          course: "Cisco Certified Network Associate (CCNA)",
          hoursOfTraining: "120",
          institution: "Cisco Networking Academy",
          skillsAcquired: "Network Configuration, Routing, Switching",
          certificateReceived: "Yes",
        },
      ],
      eligibilities: [],
      professionalLicenses: [],
      workExperiences: [
        {
          companyName: "DOST Regional Office X",
          position: "IT Support Specialist",
          from: "2015-06",
          to: "Present",
          status: "Regular",
        },
        {
          companyName: "Tangub City Hall",
          position: "Systems Administrator",
          from: "2003-01",
          to: "2015-05",
          status: "Regular",
        },
      ],
      otherSkills: ["Network Administration", "IT Support", "Computer Literacy", "Web Development", "Database Management"],
      otherSkillsSpecify: [],
      jobPreferences: [
        {
          occupation: "IT Manager",
          employmentType: ["Regular"],
          workLocation: ["Local"],
        },
      ],
      languages: [
        { language: "English", read: true, write: true, speak: true, understand: true },
        { language: "Filipino", read: true, write: true, speak: true, understand: true },
      ],
      referredProgram: "",
      cdspPrograms: [],
      projectIdNumber: "",
      projectLocation: "",
      projectRegion: "",
      projectCity: "",
      projectDetails: { type: [], programComponent: [], wayOfImplementation: [], nameOfProject: "" },
      pagIbigNo: "",
      philHealthNo: "",
      sssNo: "",
      otherProgramName: "",
      otherProgramNo: "",
    },
  },
  {
    id: 5,
    name: "Ligaya Flores",
    gender: "Female",
    age: 31,
    education: "Bachelor of Science in Nursing (Tertiary)",
    skills: "Caregiving, Healthcare",
    employmentStatus: "Unemployed",
    contactNumber: "09561234000",
    email: "ligaya.flores@email.com",
    address: "Brgy. Hoyohoy, Tangub City",
    civilStatus: "Widowed",
    hasDisability: false,
    isOFW: true,
    isFormerOFW: false,
    is4PsBeneficiary: false,
    jobPreference: "Healthcare",
    language: "Filipino",
    fullFormData: {
      firstName: "Ligaya",
      middleName: "Bautista",
      surname: "Flores",
      suffix: "",
      dateOfBirth: "1995-02-14",
      sex: "Female",
      religion: "Roman Catholic",
      civilStatus: "Widowed",
      height: "5'3\"",
      houseNo: "56",
      barangay: "Hoyohoy",
      municipality: "Tangub City",
      province: "Misamis Occidental",
      contactNumber: "09561234000",
      email: "ligaya.flores@email.com",
      tin: "",
      isOFW: "Yes",
      ofwCountry: "Saudi Arabia",
      isFormerOFW: "No",
      formerOFWCountry: "",
      formerOFWReturnDate: "",
      is4PsBeneficiary: "No",
      householdIdNo: "",
      hasDisability: [],
      disabilityOther: "",
      currentlyInSchool: "No",
      elementary: {
        schoolName: "Hoyohoy Elementary School",
        schoolCity: "Tangub City",
        schoolProvince: "Misamis Occidental",
        graduated: "Yes",
        yearGraduated: "2007",
        levelReached: "",
        yearLastAttended: "2007",
      },
      secondary: {
        schoolName: "Tangub City National High School",
        schoolCity: "Tangub City",
        schoolProvince: "Misamis Occidental",
        type: "Public",
        seniorHighStrand: "",
        graduated: "Yes",
        yearGraduated: "2013",
        levelReached: "",
        yearLastAttended: "2013",
      },
      tertiary: {
        schoolName: "Misamis University",
        schoolCity: "Ozamiz City",
        schoolProvince: "Misamis Occidental",
        course: "Bachelor of Science in Nursing",
        graduated: "Yes",
        yearGraduated: "2017",
        levelReached: "",
        yearLastAttended: "2017",
      },
      graduateStudies: [],
      trainings: [
        {
          course: "Elderly Care Management",
          hoursOfTraining: "40",
          institution: "TESDA",
          skillsAcquired: "Geriatric Care, Medication Administration",
          certificateReceived: "Yes",
        },
      ],
      eligibilities: [],
      professionalLicenses: [],
      workExperiences: [
        {
          companyName: "King Fahad Medical City",
          position: "Staff Nurse",
          from: "2019-03",
          to: "Present",
          status: "Regular",
        },
      ],
      otherSkills: ["Caregiving", "Healthcare", "Patient Care", "Medication Administration", "Wound Care"],
      otherSkillsSpecify: [],
      jobPreferences: [
        {
          occupation: "Registered Nurse",
          employmentType: ["Regular"],
          workLocation: ["Abroad"],
        },
      ],
      languages: [
        { language: "Filipino", read: true, write: true, speak: true, understand: true },
        { language: "English", read: true, write: true, speak: true, understand: true },
        { language: "Arabic", read: false, write: false, speak: false, understand: true },
      ],
      referredProgram: "",
      cdspPrograms: [],
      projectIdNumber: "",
      projectLocation: "",
      projectRegion: "",
      projectCity: "",
      projectDetails: { type: [], programComponent: [], wayOfImplementation: [], nameOfProject: "" },
      pagIbigNo: "",
      philHealthNo: "",
      sssNo: "",
      otherProgramName: "",
      otherProgramNo: "",
    },
  },
];
