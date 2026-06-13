import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Search, ChevronDown, Printer, Download, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface ApplicantData {
  id: number;
  surname: string;
  firstName: string;
  middleName: string;
  suffix: string;
  dateOfBirth: string;
  sex: string;
  religion: string;
  civilStatus: string;
  height: string;
  houseNo: string;
  barangay: string;
  municipality: string;
  province: string;
  hasDisability: string[];
  disabilityOther: string;
  tin: string;
  contactNumber: string;
  email: string;
  isOFW: string;
  ofwCountry: string;
  isFormerOFW: string;
  formerOFWCountry: string;
  formerOFWReturnDate: string;
  is4PsBeneficiary: string;
  householdIdNo: string;
  jobPreferences: Array<{
    occupation: string;
    employmentType: string[];
    workLocation: string[];
  }>;
  languages: Array<{
    language: string;
    read: boolean;
    write: boolean;
    speak: boolean;
    understand: boolean;
  }>;
  currentlyInSchool: string;
  elementary: {
    schoolName?: string;
    schoolCity?: string;
    schoolProvince?: string;
    graduated: string;
    yearGraduated: string;
    levelReached: string;
    yearLastAttended: string;
  };
  secondary: {
    schoolName?: string;
    schoolCity?: string;
    schoolProvince?: string;
    type: string;
    seniorHighStrand: string;
    graduated: string;
    yearGraduated: string;
    levelReached: string;
    yearLastAttended: string;
  };
  tertiary: {
    schoolName?: string;
    schoolCity?: string;
    schoolProvince?: string;
    course: string;
    graduated: string;
    yearGraduated: string;
    levelReached: string;
    yearLastAttended: string;
  };
  graduateStudies: Array<{
    schoolName?: string;
    schoolCity?: string;
    schoolProvince?: string;
    course: string;
    graduated: string;
    yearGraduated: string;
    levelReached: string;
    yearLastAttended: string;
  }>;
  trainings: Array<{
    course: string;
    hoursOfTraining: string;
    institution: string;
    skillsAcquired: string;
    certificateReceived: string;
  }>;
  eligibilities: Array<{
    eligibility: string;
    dateTaken: string;
  }>;
  professionalLicenses: Array<{
    license: string;
    validUntil: string;
  }>;
  workExperiences: Array<{
    companyName: string;
    position: string;
    from: string;
    to: string;
    status: string;
  }>;
  otherSkills: string[];
  otherSkillsSpecify: string;
  referredProgram: string;
  cdspPrograms: string[];
  projectIdNumber: string;
  projectLocation: string;
  projectRegion: string;
  projectCity: string;
  projectDetails: {
    type: string[];
    programComponent: string[];
    wayOfImplementation: string[];
    nameOfProject: string;
  };
  pagIbigNo: string;
  philHealthNo: string;
  sssNo: string;
  otherProgramName: string;
  otherProgramNo: string;
  uploadedDocuments?: Array<{
    id: string;
    documentType: string;
    customName?: string;
    fileName: string;
    fileSize: string;
  }>;
  profileImage?: string;
}

interface ResumeMakerProps {
  applicants: ApplicantData[];
  onBack: () => void;
}

interface FieldSelection {
  profilePicture: boolean;
  fullName: boolean;
  age: boolean;
  sex: boolean;
  civilStatus: boolean;
  dateOfBirth: boolean;
  placeOfBirth: boolean;
  address: boolean;
  contactNumber: boolean;
  email: boolean;
  elementary: boolean;
  highSchool: boolean;
  college: boolean;
  graduateStudies: boolean;
  workExperience1: boolean;
  workExperience2: boolean;
  skillsCompetencies: boolean;
  employmentStatus: boolean;
  trainings: boolean;
  eligibilities: boolean;
  languages: boolean;
}

export default function ResumeMaker({ applicants, onBack }: ResumeMakerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicantData | null>(null);
  const resumeRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [selectedFields, setSelectedFields] = useState<FieldSelection>({
    profilePicture: true,
    fullName: true,
    age: true,
    sex: true,
    civilStatus: true,
    dateOfBirth: true,
    placeOfBirth: false,
    address: true,
    contactNumber: true,
    email: true,
    elementary: true,
    highSchool: true,
    college: true,
    graduateStudies: false,
    workExperience1: true,
    workExperience2: false,
    skillsCompetencies: true,
    employmentStatus: false,
    trainings: false,
    eligibilities: false,
    languages: false,
  });

  const filteredApplicants = searchQuery.trim() === ''
    ? applicants
    : applicants.filter(
        (a) =>
          a.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.surname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          `${a.firstName} ${a.surname}`.toLowerCase().includes(searchQuery.toLowerCase())
      );

  function handleApplicantSelect(applicant: ApplicantData) {
    setSelectedApplicant(applicant);
    setSearchQuery(`${applicant.firstName} ${applicant.middleName ? applicant.middleName + ' ' : ''}${applicant.surname}`);
    setShowDropdown(false);
  }

  function toggleField(field: keyof FieldSelection) {
    setSelectedFields((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  function isFieldAvailable(field: keyof FieldSelection): boolean {
    if (!selectedApplicant) return false;
    switch (field) {
      case 'profilePicture': return true;
      case 'fullName':       return !!(selectedApplicant.firstName || selectedApplicant.surname);
      case 'age':
      case 'dateOfBirth':    return !!selectedApplicant.dateOfBirth && selectedApplicant.dateOfBirth !== 'N/A';
      case 'sex':            return !!selectedApplicant.sex && selectedApplicant.sex !== 'N/A';
      case 'civilStatus':    return !!selectedApplicant.civilStatus && selectedApplicant.civilStatus !== 'N/A';
      case 'placeOfBirth':   return !!selectedApplicant.municipality;
      case 'address':        return !!(selectedApplicant.houseNo || selectedApplicant.barangay || selectedApplicant.municipality);
      case 'contactNumber':  return !!selectedApplicant.contactNumber && selectedApplicant.contactNumber !== 'N/A';
      case 'email':          return !!selectedApplicant.email && selectedApplicant.email !== 'N/A';
      case 'elementary':     return !!selectedApplicant.elementary?.graduated && selectedApplicant.elementary.graduated === 'Yes';
      case 'highSchool':     return !!selectedApplicant.secondary?.graduated && selectedApplicant.secondary.graduated === 'Yes';
      case 'college':        return !!selectedApplicant.tertiary?.course && selectedApplicant.tertiary.course !== 'N/A';
      case 'graduateStudies':return selectedApplicant.graduateStudies?.length > 0;
      case 'workExperience1':return selectedApplicant.workExperiences?.length > 0;
      case 'workExperience2':return selectedApplicant.workExperiences?.length > 1;
      case 'skillsCompetencies': return selectedApplicant.otherSkills?.length > 0;
      case 'employmentStatus':   return selectedApplicant.jobPreferences?.length > 0;
      case 'trainings':      return selectedApplicant.trainings?.length > 0;
      case 'eligibilities':  return selectedApplicant.eligibilities?.length > 0;
      case 'languages':      return selectedApplicant.languages?.length > 0;
      default:               return true;
    }
  }

  function calculateAge(birthDate: string): number {
    if (!birthDate || birthDate === 'N/A') return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  function formatDate(dateString: string): string {
    if (!dateString || dateString === 'N/A') return '';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function handlePrint() {
    window.print();
  }

  async function handleDownloadPDF() {
    if (!resumeRef.current || !selectedApplicant) return;
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const canvas = await html2canvas(resumeRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 15000,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pdfWidth / (canvas.width * 0.264583), pdfHeight / (canvas.height * 0.264583));
      const scaledWidth = canvas.width * 0.264583 * ratio;
      const scaledHeight = canvas.height * 0.264583 * ratio;
      pdf.addImage(imgData, 'PNG', (pdfWidth - scaledWidth) / 2, 0, scaledWidth, scaledHeight);
      pdf.save(`${selectedApplicant.firstName}_${selectedApplicant.surname}_Resume.pdf`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to generate PDF: ${msg}. Please try the Print button instead.`);
    }
  }

  const ResumeCheckbox = ({ field, label }: { field: keyof FieldSelection; label: string }) => {
    const available = isFieldAvailable(field);
    return (
      <label className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all ${available ? 'hover:bg-blue-50' : 'opacity-40 cursor-not-allowed'}`}>
        <input
          type="checkbox"
          checked={selectedFields[field] && available}
          onChange={() => available && toggleField(field)}
          disabled={!available}
          className="w-4 h-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue disabled:opacity-50 flex-shrink-0"
        />
        <span className={`text-sm ${available ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
      </label>
    );
  };

  return (
    <>
      <div className="min-h-full bg-gray-200">
        {/* Top bar */}
        <div className="flex-shrink-0 px-6 py-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-brand-blue hover:text-brand-blue-dark transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Applicants
          </button>
        </div>

        <div className="flex flex-col gap-3 px-5 py-4">
          {/* Title card */}
          <div className="flex-shrink-0 bg-white rounded-2xl shadow px-5 py-3 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                <FileText size={18} className="text-brand-blue" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 m-0">Resume Builder</p>
                <p className="text-xs text-gray-500 m-0">Select applicant and customize resume fields</p>
              </div>
            </div>
          </div>

          {/* Main panels */}
          <div className="flex gap-4 items-start">
            {/* Left panel — unified card */}
            <div className="w-72 flex-shrink-0 sticky top-4 max-h-[calc(100vh-5rem)] bg-white rounded-2xl shadow border border-gray-200 flex flex-col overflow-hidden">
              {/* Step 1 */}
              <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200">
                <p className="mb-2 text-base font-bold text-gray-800">Step 1: Select Applicant</p>
                <label className="block mb-1 text-sm text-gray-500">Search or select applicant:</label>
                <div className="relative" ref={dropdownRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input
                      type="text"
                      placeholder="Type to search..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                      onClick={() => setShowDropdown(true)}
                      onFocus={() => setShowDropdown(true)}
                      className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none"
                    />
                    <button
                      onClick={() => setShowDropdown((p) => !p)}
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      style={{ transform: showDropdown ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)' }}
                    >
                      <ChevronDown size={15} />
                    </button>
                  </div>

                  {showDropdown && (
                    <div
                      className="absolute left-0 right-0 z-[9999] mt-1 bg-white border-2 border-brand-blue rounded-lg shadow-2xl"
                      style={{ maxHeight: '260px', overflowY: 'auto' }}
                    >
                      {filteredApplicants.length > 0 ? filteredApplicants.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => handleApplicantSelect(a)}
                          className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 bg-white block"
                        >
                          <div className="font-medium text-sm text-gray-900">
                            {a.firstName} {a.middleName ? a.middleName + ' ' : ''}{a.surname}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{a.email || 'No email'}</div>
                        </button>
                      )) : (
                        <div className="px-3 py-4 text-center text-sm text-gray-500">No applicants found</div>
                      )}
                    </div>
                  )}
                </div>

                {selectedApplicant && (
                  <div className="mt-2 px-2.5 py-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs text-green-800 font-medium">
                      {selectedApplicant.firstName} {selectedApplicant.surname} selected
                    </span>
                  </div>
                )}
              </div>

              {/* Step 2 or placeholder */}
              {selectedApplicant ? (
                <>
                  <div className="flex-shrink-0 px-4 py-2.5 border-b border-gray-200">
                    <p className="text-sm font-bold text-gray-800">Step 2: Select Fields to Include</p>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-4">
                    <div>
                      <p className="mb-2 px-3 text-xs font-bold uppercase text-brand-blue tracking-wide">Personal Information</p>
                      <div>
                        <ResumeCheckbox field="profilePicture" label="Profile Picture" />
                        <ResumeCheckbox field="fullName" label="Full Name" />
                        <ResumeCheckbox field="age" label="Age" />
                        <ResumeCheckbox field="sex" label="Sex" />
                        <ResumeCheckbox field="civilStatus" label="Civil Status" />
                        <ResumeCheckbox field="dateOfBirth" label="Date of Birth" />
                        <ResumeCheckbox field="placeOfBirth" label="Place of Birth" />
                        <ResumeCheckbox field="address" label="Address" />
                        <ResumeCheckbox field="contactNumber" label="Contact Number" />
                        <ResumeCheckbox field="email" label="Email Address" />
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 px-3 text-xs font-bold uppercase text-brand-blue tracking-wide">Education</p>
                      <div>
                        <ResumeCheckbox field="elementary" label="Elementary" />
                        <ResumeCheckbox field="highSchool" label="High School" />
                        <ResumeCheckbox field="college" label="College" />
                        {isFieldAvailable('graduateStudies') && <ResumeCheckbox field="graduateStudies" label="Graduate Studies" />}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 px-3 text-xs font-bold uppercase text-brand-blue tracking-wide">Professional</p>
                      <div>
                        {isFieldAvailable('workExperience1') && <ResumeCheckbox field="workExperience1" label="Work Experience 1" />}
                        {isFieldAvailable('workExperience2') && <ResumeCheckbox field="workExperience2" label="Work Experience 2" />}
                        <ResumeCheckbox field="skillsCompetencies" label="Skills & Competencies" />
                        {isFieldAvailable('employmentStatus') && <ResumeCheckbox field="employmentStatus" label="Employment Preferences" />}
                        {isFieldAvailable('trainings') && <ResumeCheckbox field="trainings" label="Trainings & Certifications" />}
                        {isFieldAvailable('eligibilities') && <ResumeCheckbox field="eligibilities" label="Eligibilities" />}
                        {isFieldAvailable('languages') && <ResumeCheckbox field="languages" label="Language Proficiency" />}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center px-4 text-center">
                  <p className="text-sm text-gray-400">Select an applicant to customize resume fields</p>
                </div>
              )}

              {/* Action buttons */}
              {selectedApplicant && (
                <div className="flex-shrink-0 px-4 py-2.5 border-t border-gray-200 space-y-2">
                  <button
                    onClick={handleDownloadPDF}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full font-semibold text-sm text-white bg-brand-blue hover:bg-brand-blue-dark transition-colors shadow-sm"
                  >
                    <Download size={15} />
                    Download PDF
                  </button>
                  <button
                    onClick={handlePrint}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full font-semibold text-sm border-2 border-brand-blue text-brand-blue hover:bg-blue-50 transition-colors"
                  >
                    <Printer size={15} />
                    Print Resume
                  </button>
                </div>
              )}
            </div>

            {/* Right panel — Resume Preview */}
            <div className="flex-1 bg-white rounded-2xl shadow border border-gray-200 flex flex-col">
              <div className="flex-shrink-0 px-5 py-3 border-b border-gray-200">
                <p className="text-sm font-semibold text-gray-700 m-0">Resume Preview</p>
              </div>
              <div className="p-5 bg-gray-100 rounded-b-2xl">
                {!selectedApplicant ? (
                  <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText size={36} className="text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-500">Select an applicant to preview resume</p>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <div
                      id="resume-preview"
                      ref={resumeRef}
                      className="w-full max-w-[210mm] shadow-xl p-12 space-y-6"
                      style={{ fontFamily: 'Arial, sans-serif', color: 'rgb(31,41,55)', backgroundColor: 'rgb(255,255,255)', border: '1px solid rgb(229,231,235)' }}
                    >
                      {/* Resume header */}
                      <div className="flex gap-6 pb-6" style={{ borderBottom: '4px solid rgb(0,119,190)' }}>
                        {selectedFields.profilePicture && (
                          <div className="flex-shrink-0">
                            <div className="w-32 h-32 rounded-lg overflow-hidden" style={{ backgroundColor: 'rgb(229,231,235)', border: '4px solid rgb(0,119,190)' }}>
                              <img
                                src={selectedApplicant.profileImage || `https://ui-avatars.com/api/?name=${selectedApplicant.firstName}+${selectedApplicant.surname}&size=200&background=0077BE&color=fff&bold=true`}
                                alt="Profile"
                                className="w-full h-full object-cover"
                                crossOrigin="anonymous"
                              />
                            </div>
                          </div>
                        )}
                        <div className="flex-1">
                          {selectedFields.fullName && isFieldAvailable('fullName') && (
                            <h1 className="text-3xl font-bold mb-2 uppercase tracking-wide" style={{ fontFamily: 'Arial, sans-serif', color: 'rgb(17,24,39)' }}>
                              {selectedApplicant.firstName} {selectedApplicant.middleName && `${selectedApplicant.middleName} `}{selectedApplicant.surname}
                            </h1>
                          )}
                          <div className="space-y-1 text-sm" style={{ color: 'rgb(0,119,190)' }}>
                            {selectedFields.address && isFieldAvailable('address') && (
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'rgb(0,119,190)' }}>
                                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                                <span>{[selectedApplicant.houseNo, selectedApplicant.barangay, selectedApplicant.municipality, selectedApplicant.province].filter(Boolean).join(', ')}</span>
                              </div>
                            )}
                            {selectedFields.contactNumber && isFieldAvailable('contactNumber') && (
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'rgb(0,119,190)' }}>
                                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                </svg>
                                <span>{selectedApplicant.contactNumber}</span>
                              </div>
                            )}
                            {selectedFields.email && isFieldAvailable('email') && (
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'rgb(0,119,190)' }}>
                                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                </svg>
                                <span>{selectedApplicant.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Personal Information */}
                      {(selectedFields.age || selectedFields.sex || selectedFields.civilStatus || selectedFields.dateOfBirth || selectedFields.placeOfBirth) && (
                        <div>
                          <h2 className="text-xl font-bold mb-3 uppercase tracking-wider pb-2" style={{ fontFamily: 'Arial, sans-serif', color: 'rgb(0,119,190)', borderBottom: '2px solid rgb(0,119,190)' }}>Personal Information</h2>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                            {selectedFields.age && isFieldAvailable('age') && (
                              <div><span className="font-semibold" style={{ color: 'rgb(31,41,55)' }}>Age:</span>{' '}<span style={{ color: 'rgb(55,65,81)' }}>{calculateAge(selectedApplicant.dateOfBirth)} years old</span></div>
                            )}
                            {selectedFields.sex && isFieldAvailable('sex') && (
                              <div><span className="font-semibold" style={{ color: 'rgb(31,41,55)' }}>Sex:</span>{' '}<span style={{ color: 'rgb(55,65,81)' }}>{selectedApplicant.sex}</span></div>
                            )}
                            {selectedFields.civilStatus && isFieldAvailable('civilStatus') && (
                              <div><span className="font-semibold" style={{ color: 'rgb(31,41,55)' }}>Civil Status:</span>{' '}<span style={{ color: 'rgb(55,65,81)' }}>{selectedApplicant.civilStatus}</span></div>
                            )}
                            {selectedFields.dateOfBirth && isFieldAvailable('dateOfBirth') && (
                              <div><span className="font-semibold" style={{ color: 'rgb(31,41,55)' }}>Date of Birth:</span>{' '}<span style={{ color: 'rgb(55,65,81)' }}>{formatDate(selectedApplicant.dateOfBirth)}</span></div>
                            )}
                            {selectedFields.placeOfBirth && isFieldAvailable('placeOfBirth') && (
                              <div><span className="font-semibold" style={{ color: 'rgb(31,41,55)' }}>Place of Birth:</span>{' '}<span style={{ color: 'rgb(55,65,81)' }}>{[selectedApplicant.municipality, selectedApplicant.province].filter(Boolean).join(', ')}</span></div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Educational Background */}
                      {(selectedFields.elementary || selectedFields.highSchool || selectedFields.college || selectedFields.graduateStudies) && (
                        <div>
                          <h2 className="text-xl font-bold mb-3 uppercase tracking-wider pb-2" style={{ fontFamily: 'Arial, sans-serif', color: 'rgb(0,119,190)', borderBottom: '2px solid rgb(0,119,190)' }}>Educational Background</h2>
                          <div className="space-y-3">
                            {selectedFields.college && isFieldAvailable('college') && selectedApplicant.tertiary?.course && (
                              <div>
                                <div className="font-bold text-base" style={{ color: 'rgb(17,24,39)' }}>{selectedApplicant.tertiary.course}</div>
                                {selectedApplicant.tertiary.schoolName && <div className="text-sm mt-1" style={{ color: 'rgb(55,65,81)' }}>{selectedApplicant.tertiary.schoolName}</div>}
                                <div className="text-sm mt-1" style={{ color: 'rgb(0,119,190)' }}>
                                  {[selectedApplicant.tertiary.schoolCity, selectedApplicant.tertiary.schoolProvince].filter(Boolean).join(', ') || [selectedApplicant.municipality, selectedApplicant.province].filter(Boolean).join(', ')}
                                </div>
                                {selectedApplicant.tertiary.yearGraduated && <div className="text-sm italic mt-1" style={{ color: 'rgb(0,119,190)' }}>{selectedApplicant.tertiary.yearGraduated}</div>}
                              </div>
                            )}
                            {selectedFields.graduateStudies && isFieldAvailable('graduateStudies') && selectedApplicant.graduateStudies?.map((study, idx) => (
                              <div key={idx}>
                                <div className="font-bold text-base" style={{ color: 'rgb(17,24,39)' }}>{study.course}</div>
                                {study.schoolName && <div className="text-sm mt-1" style={{ color: 'rgb(55,65,81)' }}>{study.schoolName}</div>}
                                <div className="text-sm mt-1" style={{ color: 'rgb(0,119,190)' }}>
                                  {[study.schoolCity, study.schoolProvince].filter(Boolean).join(', ') || [selectedApplicant.municipality, selectedApplicant.province].filter(Boolean).join(', ')}
                                </div>
                                {study.yearGraduated && <div className="text-sm italic mt-1" style={{ color: 'rgb(0,119,190)' }}>{study.yearGraduated}</div>}
                              </div>
                            ))}
                            {selectedFields.highSchool && isFieldAvailable('highSchool') && (
                              <div>
                                <div className="font-bold text-base" style={{ color: 'rgb(17,24,39)' }}>
                                  High School{selectedApplicant.secondary?.seniorHighStrand ? ` — ${selectedApplicant.secondary.seniorHighStrand} Strand` : ''}
                                </div>
                                {selectedApplicant.secondary?.schoolName && <div className="text-sm mt-1" style={{ color: 'rgb(55,65,81)' }}>{selectedApplicant.secondary.schoolName}</div>}
                                <div className="text-sm mt-1" style={{ color: 'rgb(0,119,190)' }}>
                                  {[selectedApplicant.secondary?.schoolCity, selectedApplicant.secondary?.schoolProvince].filter(Boolean).join(', ') || [selectedApplicant.municipality, selectedApplicant.province].filter(Boolean).join(', ')}
                                </div>
                                {selectedApplicant.secondary?.yearGraduated && <div className="text-sm italic mt-1" style={{ color: 'rgb(0,119,190)' }}>{selectedApplicant.secondary.yearGraduated}</div>}
                              </div>
                            )}
                            {selectedFields.elementary && isFieldAvailable('elementary') && (
                              <div>
                                <div className="font-bold text-base" style={{ color: 'rgb(17,24,39)' }}>Elementary</div>
                                {selectedApplicant.elementary?.schoolName && <div className="text-sm mt-1" style={{ color: 'rgb(55,65,81)' }}>{selectedApplicant.elementary.schoolName}</div>}
                                <div className="text-sm mt-1" style={{ color: 'rgb(0,119,190)' }}>
                                  {[selectedApplicant.elementary?.schoolCity, selectedApplicant.elementary?.schoolProvince].filter(Boolean).join(', ') || [selectedApplicant.municipality, selectedApplicant.province].filter(Boolean).join(', ')}
                                </div>
                                {selectedApplicant.elementary?.yearGraduated && <div className="text-sm italic mt-1" style={{ color: 'rgb(0,119,190)' }}>{selectedApplicant.elementary.yearGraduated}</div>}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Work Experience */}
                      {(selectedFields.workExperience1 || selectedFields.workExperience2) && selectedApplicant.workExperiences?.length > 0 && (
                        <div>
                          <h2 className="text-xl font-bold mb-3 uppercase tracking-wider pb-2" style={{ fontFamily: 'Arial, sans-serif', color: 'rgb(0,119,190)', borderBottom: '2px solid rgb(0,119,190)' }}>Work Experience</h2>
                          <div className="space-y-4">
                            {selectedFields.workExperience1 && selectedApplicant.workExperiences[0] && (
                              <div>
                                <div className="font-bold text-base" style={{ color: 'rgb(17,24,39)' }}>{selectedApplicant.workExperiences[0].position}</div>
                                <div className="text-sm mt-1" style={{ color: 'rgb(55,65,81)' }}>{selectedApplicant.workExperiences[0].companyName}</div>
                                <div className="text-sm italic mt-1" style={{ color: 'rgb(0,119,190)' }}>{selectedApplicant.workExperiences[0].from} - {selectedApplicant.workExperiences[0].to}</div>
                              </div>
                            )}
                            {selectedFields.workExperience2 && selectedApplicant.workExperiences[1] && (
                              <div>
                                <div className="font-bold text-base" style={{ color: 'rgb(17,24,39)' }}>{selectedApplicant.workExperiences[1].position}</div>
                                <div className="text-sm mt-1" style={{ color: 'rgb(55,65,81)' }}>{selectedApplicant.workExperiences[1].companyName}</div>
                                <div className="text-sm italic mt-1" style={{ color: 'rgb(0,119,190)' }}>{selectedApplicant.workExperiences[1].from} - {selectedApplicant.workExperiences[1].to}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Skills */}
                      {selectedFields.skillsCompetencies && isFieldAvailable('skillsCompetencies') && selectedApplicant.otherSkills?.length > 0 && (
                        <div>
                          <h2 className="text-xl font-bold mb-3 uppercase tracking-wider pb-2" style={{ fontFamily: 'Arial, sans-serif', color: 'rgb(0,119,190)', borderBottom: '2px solid rgb(0,119,190)' }}>Skills & Competencies</h2>
                          <div className="text-sm leading-relaxed" style={{ color: 'rgb(55,65,81)' }}>
                            {selectedApplicant.otherSkills.join(' • ')}
                          </div>
                        </div>
                      )}

                      {/* Employment Preferences */}
                      {selectedFields.employmentStatus && isFieldAvailable('employmentStatus') && selectedApplicant.jobPreferences?.length > 0 && (
                        <div>
                          <h2 className="text-xl font-bold mb-3 uppercase tracking-wider pb-2" style={{ fontFamily: 'Arial, sans-serif', color: 'rgb(0,119,190)', borderBottom: '2px solid rgb(0,119,190)' }}>Employment Preferences</h2>
                          <div className="space-y-3">
                            {selectedApplicant.jobPreferences.map((pref, idx) => (
                              <div key={idx}>
                                <div className="font-bold text-base" style={{ color: 'rgb(17,24,39)' }}>{pref.occupation}</div>
                                {pref.employmentType?.length > 0 && <div className="text-sm mt-1" style={{ color: 'rgb(55,65,81)' }}><span className="font-semibold">Type:</span> {pref.employmentType.join(', ')}</div>}
                                {pref.workLocation?.length > 0 && <div className="text-sm mt-1" style={{ color: 'rgb(75,85,99)' }}><span className="font-semibold">Preferred Location:</span> {pref.workLocation.join(', ')}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Trainings */}
                      {selectedFields.trainings && isFieldAvailable('trainings') && selectedApplicant.trainings?.length > 0 && (
                        <div>
                          <h2 className="text-xl font-bold mb-3 uppercase tracking-wider pb-2" style={{ fontFamily: 'Arial, sans-serif', color: 'rgb(0,119,190)', borderBottom: '2px solid rgb(0,119,190)' }}>Trainings & Certifications</h2>
                          <div className="space-y-3">
                            {selectedApplicant.trainings.map((t, idx) => (
                              <div key={idx}>
                                <div className="font-bold text-base" style={{ color: 'rgb(17,24,39)' }}>{t.course}</div>
                                <div className="text-sm mt-1" style={{ color: 'rgb(55,65,81)' }}>{t.institution}</div>
                                <div className="text-sm mt-1" style={{ color: 'rgb(75,85,99)' }}>{t.hoursOfTraining} hours • {t.skillsAcquired}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Eligibilities */}
                      {selectedFields.eligibilities && isFieldAvailable('eligibilities') && selectedApplicant.eligibilities?.length > 0 && (
                        <div>
                          <h2 className="text-xl font-bold mb-3 uppercase tracking-wider pb-2" style={{ fontFamily: 'Arial, sans-serif', color: 'rgb(0,119,190)', borderBottom: '2px solid rgb(0,119,190)' }}>Professional Eligibility</h2>
                          <div className="space-y-2">
                            {selectedApplicant.eligibilities.map((e, idx) => (
                              <div key={idx} className="text-sm" style={{ color: 'rgb(55,65,81)' }}>
                                <span className="font-semibold">{e.eligibility}</span> - {formatDate(e.dateTaken)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Languages */}
                      {selectedFields.languages && isFieldAvailable('languages') && selectedApplicant.languages?.length > 0 && (
                        <div>
                          <h2 className="text-xl font-bold mb-3 uppercase tracking-wider pb-2" style={{ fontFamily: 'Arial, sans-serif', color: 'rgb(0,119,190)', borderBottom: '2px solid rgb(0,119,190)' }}>Language Proficiency</h2>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {selectedApplicant.languages
                              .filter((lang) => lang.read || lang.write || lang.speak || lang.understand)
                              .map((lang, idx) => (
                                <div key={idx} style={{ color: 'rgb(55,65,81)' }}>
                                  <span className="font-semibold">{lang.language}</span>{' - '}
                                  {[lang.read && 'Read', lang.write && 'Write', lang.speak && 'Speak', lang.understand && 'Understand'].filter(Boolean).join(', ')}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="mt-12 pt-6 text-center" style={{ borderTop: '1px solid rgb(209,213,219)' }}>
                        <p className="text-xs" style={{ color: 'rgb(0,119,190)' }}>Generated by PESO Tangub City - Comprehensive Profiling System</p>
                        <p className="text-xs" style={{ color: 'rgb(0,119,190)' }}>Public Employment Service Office | Tangub City, Misamis Occidental</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @media print {
            @page { size: A4; margin: 0; }
            body * { visibility: hidden; }
            #resume-preview, #resume-preview * { visibility: visible; }
            #resume-preview {
              position: absolute; left: 0; top: 0;
              width: 210mm; margin: 0; padding: 15mm;
              box-shadow: none !important; border: none !important;
            }
            #resume-preview img, #resume-preview * {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        `}</style>
      </div>
    </>
  );
}
