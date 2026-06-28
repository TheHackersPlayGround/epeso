import { useState } from 'react';
import Swal from 'sweetalert2';
import { X, Users, Plus, Upload, Trash2, FileText, Eye } from 'lucide-react';
import DatePicker from '../../components/DatePicker';
import BarangayCombobox from '../../components/BarangayCombobox';
import ApplicantReviewModal from './ApplicantReviewModal';

interface ApplicantFormData {
  // Personal Information
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
  barangayId: number | null;
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
  
  // Job Preference
  jobPrefEmploymentType: string[];
  jobPrefWorkLocation: string[];
  jobPreferences: Array<{
    occupation: string;
    localCity: string;
    overseasCountry: string;
  }>;
  
  // Language Proficiency
  languages: Array<{
    language: string;
    read: boolean;
    write: boolean;
    speak: boolean;
    understand: boolean;
  }>;
  
  // Educational Background
  currentlyInSchool: string;
  elementary: {
    schoolName: string;
    schoolCity: string;
    schoolProvince: string;
    graduated: string;
    yearGraduated: string;
    levelReached: string;
    yearLastAttended: string;
  };
  secondary: {
    schoolName: string;
    schoolCity: string;
    schoolProvince: string;
    type: string;
    seniorHighStrand: string;
    graduated: string;
    yearGraduated: string;
    levelReached: string;
    yearLastAttended: string;
  };
  tertiary: {
    schoolName: string;
    schoolCity: string;
    schoolProvince: string;
    course: string;
    graduated: string;
    yearGraduated: string;
    levelReached: string;
    yearLastAttended: string;
  };
  graduateStudies: Array<{
    schoolName: string;
    schoolCity: string;
    schoolProvince: string;
    course: string;
    graduated: string;
    yearGraduated: string;
    levelReached: string;
    yearLastAttended: string;
  }>;
  
  // Technical/Vocational Training
  trainings: Array<{
    course: string;
    hoursOfTraining: string;
    institution: string;
    skillsAcquired: string;
    certificateReceived: string;
  }>;
  
  // Eligibility/Professional License
  eligibilities: Array<{
    eligibility: string;
    dateTaken: string;
  }>;
  professionalLicenses: Array<{
    license: string;
    validUntil: string;
  }>;
  
  // Work Experience
  workExperiences: Array<{
    companyName: string;
    position: string;
    from: string;
    to: string;
    status: string;
  }>;
  
  // Other Skills
  otherSkills: string[];
  otherSkillsSpecify: string[];
  
  // Referred Program
  referredProgram: string;
  referredProgramOther: string;
  cdspPrograms: string[];
  livelihoodPrograms: string[];
  dileepPrograms: string[];
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

  // Documents / Attachments
  documentType: string;
  documentOtherSpecify: string;
  savedDocuments: Array<{
    id: string;
    documentType: string;
    customName?: string;
    fileName: string;
    fileSize: string;
    dataUrl?: string; // base64 content for newly-uploaded files (sent to the backend)
    url?: string;     // public URL for files already stored in the documents table
  }>;

  // 2x2 ID Photo
  profileImage?: string;
}

export type { ApplicantFormData }

interface AddApplicantSidebarProps {
  onSave: (data: ApplicantFormData) => void | Promise<void>;
  onClose: () => void;
  initialData?: ApplicantFormData;
  isEditMode?: boolean;
}

type Section = 'personalInfo' | 'jobPreference' | 'language' | 'education' | 'training' | 'eligibility' | 'workExperience' | 'otherSkills' | 'referredProgram' | 'documents';

interface UploadedDocument {
  id: string;
  documentType: string;
  customName?: string;
  file?: File;
  fileName?: string;
  fileSize?: string;
  dataUrl?: string; // base64 content for new uploads
  url?: string;     // public URL for already-stored files
}

export default function AddApplicantSidebar({ onSave, onClose, initialData, isEditMode = false }: AddApplicantSidebarProps) {
  const [activeSection, setActiveSection] = useState<Section>('personalInfo');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>(
    initialData?.savedDocuments?.map(d => ({ id: d.id, documentType: d.documentType, customName: d.customName, fileName: d.fileName, fileSize: d.fileSize, url: d.url })) ?? []
  );
  const [currentDocType, setCurrentDocType] = useState('');
  const [currentCustomName, setCurrentCustomName] = useState('');
  const [previewDocument, setPreviewDocument] = useState<UploadedDocument | null>(null);
  const [hasDisabilityStatus, setHasDisabilityStatus] = useState<'Yes' | 'No'>(
    initialData?.hasDisability && initialData.hasDisability.length > 0 ? 'Yes' : 'No'
  );
  const [profileImage, setProfileImage] = useState<string>(initialData?.profileImage ?? '');
  const defaultFormData: ApplicantFormData = {
    surname: '',
    firstName: '',
    middleName: '',
    suffix: '',
    dateOfBirth: '',
    sex: '',
    religion: '',
    civilStatus: '',
    height: '',
    houseNo: '',
    barangay: '',
    barangayId: null,
    municipality: '',
    province: '',
    hasDisability: [],
    disabilityOther: '',
    tin: '',
    contactNumber: '',
    email: '',
    isOFW: 'No',
    ofwCountry: '',
    isFormerOFW: 'No',
    formerOFWCountry: '',
    formerOFWReturnDate: '',
    is4PsBeneficiary: 'No',
    householdIdNo: '',
    jobPrefEmploymentType: [],
    jobPrefWorkLocation: [],
    jobPreferences: [
      { occupation: '', localCity: '', overseasCountry: '' },
      { occupation: '', localCity: '', overseasCountry: '' },
      { occupation: '', localCity: '', overseasCountry: '' },
    ],
    languages: [
      { language: 'ENGLISH', read: false, write: false, speak: false, understand: false },
      { language: 'FILIPINO', read: false, write: false, speak: false, understand: false },
      { language: 'MANDARIN', read: false, write: false, speak: false, understand: false },
    ],
    currentlyInSchool: '',
    elementary: { schoolName: '', schoolCity: '', schoolProvince: '', graduated: '', yearGraduated: '', levelReached: '', yearLastAttended: '' },
    secondary: { schoolName: '', schoolCity: '', schoolProvince: '', type: '', seniorHighStrand: '', graduated: '', yearGraduated: '', levelReached: '', yearLastAttended: '' },
    tertiary: { schoolName: '', schoolCity: '', schoolProvince: '', course: '', graduated: '', yearGraduated: '', levelReached: '', yearLastAttended: '' },
    graduateStudies: [],
    trainings: [],
    eligibilities: [],
    professionalLicenses: [],
    workExperiences: [],
    otherSkills: [],
    otherSkillsSpecify: [''],
    referredProgram: '',
    referredProgramOther: '',
    cdspPrograms: [],
    livelihoodPrograms: [],
    dileepPrograms: [],
    projectIdNumber: '',
    projectLocation: '',
    projectRegion: '',
    projectCity: '',
    projectDetails: { type: [], programComponent: [], wayOfImplementation: [], nameOfProject: '' },
    pagIbigNo: '',
    philHealthNo: '',
    sssNo: '',
    otherProgramName: '',
    otherProgramNo: '',
    documentType: '',
    documentOtherSpecify: '',
    savedDocuments: [],
  };
  const [formData, setFormData] = useState<ApplicantFormData>(() => {
    const merged = { ...defaultFormData, ...initialData };
    // Guard: old saved data may have otherSkillsSpecify as a plain string
    if (!Array.isArray(merged.otherSkillsSpecify)) {
      merged.otherSkillsSpecify = merged.otherSkillsSpecify
        ? [merged.otherSkillsSpecify as unknown as string]
        : [''];
    }
    return merged;
  });

  const sections = [
    { id: 'personalInfo' as Section, label: 'I. PERSONAL INFORMATION' },
    { id: 'jobPreference' as Section, label: 'II. JOB PREFERENCE' },
    { id: 'language' as Section, label: 'III. LANGUAGE / DIALECT PROFICIENCY' },
    { id: 'education' as Section, label: 'IV. EDUCATIONAL BACKGROUND' },
    { id: 'training' as Section, label: 'V. TECHNICAL/VOCATIONAL AND OTHER TRAINING' },
    { id: 'eligibility' as Section, label: 'VI. ELIGIBILITY/PROFESSIONAL LICENSE' },
    { id: 'workExperience' as Section, label: 'VII. WORK EXPERIENCE' },
    { id: 'otherSkills' as Section, label: 'VIII. OTHER SKILLS ACQUIRED WITHOUT CERTIFICATE' },
    { id: 'referredProgram' as Section, label: 'IX. REFERRED PROGRAM' },
    { id: 'documents' as Section, label: 'X. DOCUMENTS / ATTACHMENTS' },
  ];

  const [showFieldErrors, setShowFieldErrors] = useState(false);

  const requiredKeys = ['firstName', 'surname', 'dateOfBirth', 'sex', 'civilStatus', 'contactNumber', 'barangay', 'municipality', 'province'] as const;

  function hasRequiredErrors() {
    return requiredKeys.some(k => !String(formData[k] ?? '').trim());
  }

  function fieldError(key: typeof requiredKeys[number]) {
    return showFieldErrors && !String(formData[key] ?? '').trim();
  }

  const inputClass = (key: typeof requiredKeys[number]) =>
    `w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500 transition-colors ${
      fieldError(key)
        ? 'border-red-500 ring-2 ring-red-200 focus:ring-red-300'
        : 'border-gray-300 focus:ring-brand-blue'
    }`;

  const ErrorMsg = ({ k }: { k: typeof requiredKeys[number] }) =>
    fieldError(k) ? <p className="text-red-500 text-xs mt-1">This field is required.</p> : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasRequiredErrors()) { setShowFieldErrors(true); setActiveSection('personalInfo'); return; }
    setShowConfirmation(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirmation(false);
    try {
      // onSave persists to the backend; await so a failure doesn't show success.
      await onSave({ ...formData, profileImage });
      setShowSuccess(true);
    } catch {
      Swal.fire({ icon: 'error', title: 'Save failed', text: 'Could not save the applicant. Please try again.' });
    }
  };

  const handleNext = () => {
    const currentIndex = sections.findIndex(s => s.id === activeSection);
    if (currentIndex < sections.length - 1) {
      if (activeSection === 'personalInfo' && hasRequiredErrors()) {
        setShowFieldErrors(true);
        return;
      }
      setActiveSection(sections[currentIndex + 1].id);
    } else {
      if (hasRequiredErrors()) { setShowFieldErrors(true); setActiveSection('personalInfo'); return; }
      setShowConfirmation(true);
    }
  };

  const isLastSection = () => {
    const currentIndex = sections.findIndex(s => s.id === activeSection);
    return currentIndex === sections.length - 1;
  };

  type CheckboxField = 'hasDisability' | 'otherSkills' | 'cdspPrograms' | 'livelihoodPrograms' | 'dileepPrograms';
  const toggleCheckbox = (field: CheckboxField, value: string) => {
    const current = formData[field];
    setFormData({
      ...formData,
      [field]: current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    });
  };

  const addLanguageRow = () => {
    setFormData({
      ...formData,
      languages: [...formData.languages, { language: '', read: false, write: false, speak: false, understand: false }]
    });
  };

  const addGraduateStudyRow = () => {
    setFormData({
      ...formData,
      graduateStudies: [...formData.graduateStudies, { schoolName: '', schoolCity: '', schoolProvince: '', course: '', graduated: '', yearGraduated: '', levelReached: '', yearLastAttended: '' }]
    });
  };

  const addTrainingRow = () => {
    setFormData({
      ...formData,
      trainings: [...formData.trainings, { course: '', hoursOfTraining: '', institution: '', skillsAcquired: '', certificateReceived: '' }]
    });
  };

  const addEligibilityRow = () => {
    setFormData({
      ...formData,
      eligibilities: [...formData.eligibilities, { eligibility: '', dateTaken: '' }]
    });
  };

  const addProfessionalLicenseRow = () => {
    setFormData({
      ...formData,
      professionalLicenses: [...formData.professionalLicenses, { license: '', validUntil: '' }]
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validation: Check if document type is selected
    if (!currentDocType) {
      alert('Please select a document type first');
      return;
    }

    // Validation: If "Others" is selected, check if custom name is provided
    if (currentDocType === 'Others (Specify)' && !currentCustomName.trim()) {
      alert('Please specify the document name for "Others"');
      return;
    }

    const file = files[0];

    // Validate file type by MIME, with an extension fallback (browsers report
    // Office MIME types inconsistently — sometimes empty or octet-stream).
    const allowedTypes = [
      'application/pdf',
      'image/jpeg', 'image/jpg', 'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const allowedExt = /\.(pdf|jpe?g|png|docx?|xlsx?)$/i;
    if (!allowedTypes.includes(file.type) && !allowedExt.test(file.name)) {
      alert('Only PDF, Word, Excel, JPG, and PNG files are allowed');
      return;
    }

    // Read the file as base64 so the backend can store it in the documents table.
    const input = event.target;
    const docType = currentDocType;
    const docCustomName = currentDocType === 'Others (Specify)' ? currentCustomName : undefined;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;

      const newDocument: UploadedDocument = {
        id: Date.now().toString() + Math.random().toString(36),
        documentType: docType,
        customName: docCustomName,
        file,
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        dataUrl,
      };

      const nextDocs = [...uploadedDocuments, newDocument];
      setUploadedDocuments(nextDocs);
      setFormData(prev => ({
        ...prev,
        savedDocuments: nextDocs.map(d => ({
          id: d.id,
          documentType: d.documentType,
          customName: d.customName,
          fileName: d.fileName ?? d.file?.name ?? '',
          fileSize: d.fileSize ?? formatFileSize(d.file?.size ?? 0),
          dataUrl: d.dataUrl,
          url: d.url,
        })),
      }));

      // For a 2x2 ID Picture, also build a small compressed preview (profileImage).
      if (docType === '2x2 ID Picture') {
        const img = new Image();
        img.onload = () => {
          const MAX = 400;
          const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * ratio);
          canvas.height = Math.round(img.height * ratio);
          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
          setProfileImage(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = dataUrl;
      }

      // Reset current selection to allow uploading more documents
      setCurrentDocType('');
      setCurrentCustomName('');
      input.value = '';
    };
    reader.readAsDataURL(file);
  };

  function handleDeleteDocument(documentId: string) {
    const doc = uploadedDocuments.find(d => d.id === documentId);
    if (doc?.documentType === '2x2 ID Picture') setProfileImage('');
    const nextDocs = uploadedDocuments.filter(d => d.id !== documentId);
    setUploadedDocuments(nextDocs);
    setFormData(prev => ({
      ...prev,
      savedDocuments: nextDocs.map(d => ({
        id: d.id,
        documentType: d.documentType,
        customName: d.customName,
        fileName: d.fileName ?? d.file?.name ?? '',
        fileSize: d.fileSize ?? formatFileSize(d.file?.size ?? 0),
        dataUrl: d.dataUrl,
        url: d.url,
      })),
    }));
  }

  const handlePreviewDocument = (doc: UploadedDocument) => {
    setPreviewDocument(doc);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'personalInfo':
        return (
          <div className="space-y-6">
            <div className="bg-brand-blue text-white px-4 py-3 font-bold uppercase text-sm">
              I. PERSONAL INFORMATION
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Surname <span className="text-red-500">*</span></label>
                <input
                  placeholder="Enter surname"
                  type="text"
                  value={formData.surname}
                  onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                  className={inputClass('surname')}
                />
                <ErrorMsg k="surname" />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">First Name <span className="text-red-500">*</span></label>
                <input
                  placeholder="Enter first name"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className={inputClass('firstName')}
                />
                <ErrorMsg k="firstName" />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Middle Name</label>
                <input
                  placeholder="Enter middle name"
                  type="text"
                  value={formData.middleName}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Suffix</label>
                <input
                  placeholder="Enter suffix"
                  type="text"
                  value={formData.suffix}
                  onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-5 gap-4">
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Date of Birth <span className="text-red-500">*</span></label>
                <DatePicker
                  className={inputClass('dateOfBirth')}
                  value={formData.dateOfBirth}
                  onChange={(value) => setFormData({ ...formData, dateOfBirth: value })}
                />
                <ErrorMsg k="dateOfBirth" />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Sex <span className="text-red-500">*</span></label>
                <select
                  value={formData.sex}
                  onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                  className={inputClass('sex')}
                >
                  <option value=""></option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                <ErrorMsg k="sex" />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Religion</label>
                <input
                  type="text"
                  value={formData.religion}
                  onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Civil Status <span className="text-red-500">*</span></label>
                <select
                  value={formData.civilStatus}
                  onChange={(e) => setFormData({ ...formData, civilStatus: e.target.value })}
                  className={inputClass('civilStatus')}
                >
                  <option value=""></option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Widowed">Widowed</option>
                  <option value="Separated">Separated</option>
                </select>
                <ErrorMsg k="civilStatus" />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Height</label>
                <input
                  placeholder="Enter Height"
                  type="text"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Present Address</label>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-gray-600 mb-1 text-xs uppercase">House No./Street</label>
                  <input
                    placeholder="Enter house no. and street"
                    type="text"
                    value={formData.houseNo}
                    onChange={(e) => setFormData({ ...formData, houseNo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1 text-xs uppercase">Barangay <span className="text-red-500">*</span></label>
                  <BarangayCombobox
                    value={formData.barangay}
                    hasError={fieldError('barangay')}
                    onTextChange={(text) =>
                      // Typing clears the resolved city/province/id until a real
                      // barangay is picked, so we never keep a mismatched address.
                      setFormData({ ...formData, barangay: text, municipality: '', province: '', barangayId: null })
                    }
                    onSelect={(m) =>
                      setFormData({
                        ...formData,
                        barangay: m.barangay,
                        barangayId: m.id,
                        municipality: m.city,
                        province: m.province,
                      })
                    }
                  />
                  <ErrorMsg k="barangay" />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1 text-xs uppercase">Municipality/City <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    readOnly
                    placeholder="Auto-filled from barangay"
                    value={formData.municipality}
                    className={`${inputClass('municipality')} bg-gray-50 cursor-not-allowed`}
                  />
                  <ErrorMsg k="municipality" />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1 text-xs uppercase">Province <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    readOnly
                    placeholder="Auto-filled from barangay"
                    value={formData.province}
                    className={`${inputClass('province')} bg-gray-50 cursor-not-allowed`}
                  />
                  <ErrorMsg k="province" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Has Disability?</label>
                <select
                  value={hasDisabilityStatus}
                  onChange={(e) => {
                    const value = e.target.value as 'Yes' | 'No';
                    setHasDisabilityStatus(value);
                    if (value === 'No') {
                      setFormData({ ...formData, hasDisability: [], disabilityOther: '' });
                    }
                  }}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-sm mb-3"
                >
                  <option>Yes</option>
                  <option>No</option>
                </select>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                  <label className={`flex items-center text-sm ${hasDisabilityStatus === 'No' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={formData.hasDisability.includes('Visual')}
                      onChange={() => toggleCheckbox('hasDisability', 'Visual')}
                      disabled={hasDisabilityStatus === 'No'}
                    />
                    <span>Visual</span>
                  </label>
                  <label className={`flex items-center text-sm ${hasDisabilityStatus === 'No' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={formData.hasDisability.includes('Speech')}
                      onChange={() => toggleCheckbox('hasDisability', 'Speech')}
                      disabled={hasDisabilityStatus === 'No'}
                    />
                    <span>Speech</span>
                  </label>
                  <label className={`flex items-center text-sm ${hasDisabilityStatus === 'No' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={formData.hasDisability.includes('Hearing')}
                      onChange={() => toggleCheckbox('hasDisability', 'Hearing')}
                      disabled={hasDisabilityStatus === 'No'}
                    />
                    <span>Hearing</span>
                  </label>
                  <label className={`flex items-center text-sm ${hasDisabilityStatus === 'No' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={formData.hasDisability.includes('Physical')}
                      onChange={() => toggleCheckbox('hasDisability', 'Physical')}
                      disabled={hasDisabilityStatus === 'No'}
                    />
                    <span>Physical</span>
                  </label>
                  <label className={`flex items-center text-sm ${hasDisabilityStatus === 'No' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={formData.hasDisability.includes('Other')}
                      onChange={() => {
                        const isCurrentlyChecked = formData.hasDisability.includes('Other');
                        const updatedDisabilities = isCurrentlyChecked
                          ? formData.hasDisability.filter(d => d !== 'Other')
                          : [...formData.hasDisability, 'Other'];
                        setFormData({
                          ...formData,
                          hasDisability: updatedDisabilities,
                          disabilityOther: isCurrentlyChecked ? '' : formData.disabilityOther
                        });
                      }}
                      disabled={hasDisabilityStatus === 'No'}
                    />
                    <span>Other</span>
                  </label>
                  <label className={`flex items-center text-sm ${hasDisabilityStatus === 'No' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={formData.hasDisability.includes('Mental')}
                      onChange={() => toggleCheckbox('hasDisability', 'Mental')}
                      disabled={hasDisabilityStatus === 'No'}
                    />
                    <span>Mental</span>
                  </label>
                  {formData.hasDisability.includes('Other') && (
                    <div className="col-span-2">
                      <input
                        type="text"
                        placeholder="Please specify"
                        value={formData.disabilityOther}
                        onChange={(e) => setFormData({ ...formData, disabilityOther: e.target.value })}
                        className="w-full px-3 py-1 border border-gray-300 rounded text-xs italic text-gray-900 placeholder:text-gray-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">TIN</label>
                  <input
                    placeholder="Enter TIN"
                    type="text"
                    value={formData.tin}
                    onChange={(e) => setFormData({ ...formData, tin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Contact Number <span className="text-red-500">*</span></label>
                  <input
                    placeholder="Enter contact number"
                    type="text"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    className={inputClass('contactNumber')}
                  />
                  <ErrorMsg k="contactNumber" />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Email</label>
                  <input
                    placeholder="Enter Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <label className="block text-gray-700 text-xs font-semibold uppercase">An OFW?</label>
                  <label className="flex items-center text-sm">
                    <input
                      type="radio"
                      name="isOFW"
                      value="Yes"
                      checked={formData.isOFW === 'Yes'}
                      onChange={(e) => setFormData({ ...formData, isOFW: e.target.value })}
                      className="mr-1"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="flex items-center text-sm">
                    <input
                      type="radio"
                      name="isOFW"
                      value="No"
                      checked={formData.isOFW === 'No'}
                      onChange={(e) => setFormData({ ...formData, isOFW: e.target.value, ofwCountry: '' })}
                      className="mr-1"
                    />
                    <span>No</span>
                  </label>
                </div>
                <div className={`text-xs text-gray-600 mb-1 ${formData.isOFW !== 'Yes' ? 'opacity-50' : ''}`}>Specify the country</div>
                <input
                  type="text"
                  value={formData.ofwCountry}
                  onChange={(e) => setFormData({ ...formData, ofwCountry: e.target.value })}
                  disabled={formData.isOFW !== 'Yes'}
                  className={`text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-sm ${formData.isOFW !== 'Yes' ? 'bg-gray-100 cursor-not-allowed opacity-50' : ''}`}
                />
              </div>
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <label className="block text-gray-700 text-xs font-semibold uppercase">A former OFW?</label>
                  <label className="flex items-center text-sm">
                    <input
                      type="radio"
                      name="isFormerOFW"
                      value="Yes"
                      checked={formData.isFormerOFW === 'Yes'}
                      onChange={(e) => setFormData({ ...formData, isFormerOFW: e.target.value })}
                      className="mr-1"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="flex items-center text-sm">
                    <input
                      type="radio"
                      name="isFormerOFW"
                      value="No"
                      checked={formData.isFormerOFW === 'No'}
                      onChange={(e) => setFormData({ ...formData, isFormerOFW: e.target.value, formerOFWCountry: '', formerOFWReturnDate: '' })}
                      className="mr-1"
                    />
                    <span>No</span>
                  </label>
                </div>
                <div className={`text-xs text-gray-600 mb-1 ${formData.isFormerOFW !== 'Yes' ? 'opacity-50' : ''}`}>Latest country of deployment</div>
                <input
                  type="text"
                  value={formData.formerOFWCountry}
                  onChange={(e) => setFormData({ ...formData, formerOFWCountry: e.target.value })}
                  disabled={formData.isFormerOFW !== 'Yes'}
                  className={`text-black w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500 ${formData.isFormerOFW !== 'Yes' ? 'bg-gray-100 cursor-not-allowed opacity-50' : ''}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <label className="block text-gray-700 text-xs font-semibold uppercase">A 4Ps beneficiary?</label>
                  <label className="flex items-center text-sm">
                    <input
                      type="radio"
                      name="is4Ps"
                      value="Yes"
                      checked={formData.is4PsBeneficiary === 'Yes'}
                      onChange={(e) => setFormData({ ...formData, is4PsBeneficiary: e.target.value })}
                      className="mr-1"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="flex items-center text-sm">
                    <input
                      type="radio"
                      name="is4Ps"
                      value="No"
                      checked={formData.is4PsBeneficiary === 'No'}
                      onChange={(e) => setFormData({ ...formData, is4PsBeneficiary: e.target.value, householdIdNo: '' })}
                      className="mr-1"
                    />
                    <span>No</span>
                  </label>
                </div>
                <div className={`text-xs text-gray-600 mb-1 ${formData.is4PsBeneficiary !== 'Yes' ? 'opacity-50' : ''}`}>Household ID No.</div>
                <input
                  type="text"
                  value={formData.householdIdNo}
                  onChange={(e) => setFormData({ ...formData, householdIdNo: e.target.value })}
                  disabled={formData.is4PsBeneficiary !== 'Yes'}
                  className={`text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-sm ${formData.is4PsBeneficiary !== 'Yes' ? 'bg-gray-100 cursor-not-allowed opacity-50' : ''}`}
                />
              </div>
              <div>
                <label className={`block text-gray-700 mb-2 text-xs font-semibold ${formData.isFormerOFW !== 'Yes' ? 'opacity-50' : ''}`}>Month and year of return to Philippines</label>
                <input
                  type="text"
                  placeholder="mm/yy"
                  value={formData.formerOFWReturnDate}
                  onChange={(e) => setFormData({ ...formData, formerOFWReturnDate: e.target.value })}
                  disabled={formData.isFormerOFW !== 'Yes'}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500 ${formData.isFormerOFW !== 'Yes' ? 'bg-gray-100 cursor-not-allowed opacity-50' : ''}`}
                />
              </div>
            </div>
          </div>
        );

      case 'jobPreference':
        return (
          <div className="space-y-4">
            <div className="bg-brand-blue text-white px-4 py-3 font-bold uppercase text-sm">
              II. JOB PREFERENCE
            </div>

            <div className="border border-gray-300 overflow-hidden">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-300 bg-gray-50 px-4 py-3 text-center font-bold uppercase text-xs text-gray-900" style={{ width: '38%' }}>
                      Preferred Occupation
                    </th>
                    <th className="border border-gray-300 bg-gray-50 px-4 py-3 text-center font-bold uppercase text-xs text-gray-900" colSpan={2}>
                      Preferred Work Location
                    </th>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-3">
                      <div className="flex items-center gap-6">
                        {['Part-time', 'Full-time'].map(type => (
                          <label key={type} className="flex items-center gap-2 cursor-pointer text-sm select-none text-gray-900">
                            <input type="checkbox"
                              checked={formData.jobPrefEmploymentType[0] === type}
                              onChange={() => setFormData({ ...formData, jobPrefEmploymentType: formData.jobPrefEmploymentType[0] === type ? [] : [type] })}
                            />
                            {type}
                          </label>
                        ))}
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <label className="flex items-center gap-2 cursor-pointer text-sm select-none text-gray-900">
                        <input type="checkbox"
                          checked={formData.jobPrefWorkLocation[0] === 'Local'}
                          onChange={() => setFormData({ ...formData, jobPrefWorkLocation: formData.jobPrefWorkLocation[0] === 'Local' ? [] : ['Local'] })}
                        />
                        Local (specify cities/municipalities)
                      </label>
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <label className="flex items-center gap-2 cursor-pointer text-sm select-none text-gray-900">
                        <input type="checkbox"
                          checked={formData.jobPrefWorkLocation[0] === 'Overseas'}
                          onChange={() => setFormData({ ...formData, jobPrefWorkLocation: formData.jobPrefWorkLocation[0] === 'Overseas' ? [] : ['Overseas'] })}
                        />
                        Overseas, (specify countries):
                      </label>
                    </td>
                  </tr>
                </thead>
                <tbody>
                  {formData.jobPreferences.map((row, idx) => (
                    <tr key={idx}>
                      {(['occupation', 'localCity', 'overseasCountry'] as const).map(field => (
                        <td key={field} className="border border-gray-300 px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-900 text-xs flex-shrink-0">{idx + 1}.</span>
                            <input
                              type="text"
                              value={row[field]}
                              onChange={e => {
                                const rows = [...formData.jobPreferences];
                                rows[idx] = { ...rows[idx], [field]: e.target.value };
                                setFormData({ ...formData, jobPreferences: rows });
                              }}
                              className="flex-1 border-0 border-b border-gray-300 focus:border-brand-blue focus:outline-none text-sm text-gray-900 py-1 bg-transparent"
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, jobPreferences: [...formData.jobPreferences, { occupation: '', localCity: '', overseasCountry: '' }] })}
              className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded hover:opacity-90 transition-opacity text-sm"
            >
              <Plus size={16} />
              Add Row
            </button>
          </div>
        );

      case 'language':
        return (
          <div className="space-y-6">
            <div className="bg-brand-blue text-white px-4 py-3 font-bold uppercase text-sm">
              III. LANGUAGE / DIALECT PROFICIENCY (check if applicable)
            </div>
            
            <div className="border border-gray-300 rounded overflow-hidden">
              <div className="grid grid-cols-5 bg-brand-blue text-white">
                <div className="px-4 py-3 border-r border-white font-bold uppercase text-xs">Language/Dialect</div>
                <div className="px-4 py-3 border-r border-white font-bold uppercase text-xs text-center">Read</div>
                <div className="px-4 py-3 border-r border-white font-bold uppercase text-xs text-center">Write</div>
                <div className="px-4 py-3 border-r border-white font-bold uppercase text-xs text-center">Speak</div>
                <div className="px-4 py-3 font-bold uppercase text-xs text-center">Understand</div>
              </div>
              
              {formData.languages.map((lang, index) => (
                <div key={index} className="grid grid-cols-5 border-t border-gray-300">
                  <div className="px-2 py-2 border-r border-gray-300 flex items-center">
                    {lang.language && index < 3 ? (
                      <span className="font-medium text-sm px-2">{lang.language}</span>
                    ) : (
                      <input
                        type="text"
                        value={lang.language}
                        placeholder="Language/Dialect"
                        onChange={(e) => {
                          const newLanguages = [...formData.languages];
                          newLanguages[index] = { ...newLanguages[index], language: e.target.value.toUpperCase() };
                          setFormData({ ...formData, languages: newLanguages });
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500"
                      />
                    )}
                  </div>
                  <div className="px-4 py-3 border-r border-gray-300 flex justify-center">
                    <input type="checkbox" checked={lang.read} onChange={() => {
                      const newLanguages = [...formData.languages];
                      newLanguages[index].read = !newLanguages[index].read;
                      setFormData({ ...formData, languages: newLanguages });
                    }} />
                  </div>
                  <div className="px-4 py-3 border-r border-gray-300 flex justify-center">
                    <input type="checkbox" checked={lang.write} onChange={() => {
                      const newLanguages = [...formData.languages];
                      newLanguages[index].write = !newLanguages[index].write;
                      setFormData({ ...formData, languages: newLanguages });
                    }} />
                  </div>
                  <div className="px-4 py-3 border-r border-gray-300 flex justify-center">
                    <input type="checkbox" checked={lang.speak} onChange={() => {
                      const newLanguages = [...formData.languages];
                      newLanguages[index].speak = !newLanguages[index].speak;
                      setFormData({ ...formData, languages: newLanguages });
                    }} />
                  </div>
                  <div className="px-4 py-3 flex justify-center">
                    <input type="checkbox" checked={lang.understand} onChange={() => {
                      const newLanguages = [...formData.languages];
                      newLanguages[index].understand = !newLanguages[index].understand;
                      setFormData({ ...formData, languages: newLanguages });
                    }} />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addLanguageRow}
              className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded hover:bg-[#01a0ff] transition-colors text-sm"
            >
              <Plus size={16} />
              Add Row
            </button>
          </div>
        );

      case 'education':
        return (
          <div className="space-y-6">
            <div className="bg-brand-blue text-white px-4 py-3 font-bold uppercase text-sm">
              IV. EDUCATIONAL BACKGROUND
            </div>

            <div className="flex items-center gap-4 mb-4">
              <label className="block text-gray-700 text-xs font-semibold uppercase">Currently in school?</label>
              <label className="flex items-center text-sm">
                <input 
                  type="radio" 
                  name="currentlyInSchool" 
                  value="Yes" 
                  checked={formData.currentlyInSchool === 'Yes'}
                  onChange={(e) => setFormData({ ...formData, currentlyInSchool: e.target.value })}
                  className="mr-1" 
                />
                <span>Yes</span>
              </label>
              <label className="flex items-center text-sm">
                <input 
                  type="radio" 
                  name="currentlyInSchool" 
                  value="No" 
                  checked={formData.currentlyInSchool === 'No'}
                  onChange={(e) => setFormData({ ...formData, currentlyInSchool: e.target.value })}
                  className="mr-1" 
                />
                <span>No</span>
              </label>
            </div>

            {/* Elementary */}
            <div className="border border-gray-300 rounded p-4 space-y-3">
              <div className="font-bold text-sm uppercase">Elementary</div>
              <div>
                <label className="block text-gray-600 mb-1 text-xs uppercase">School Name</label>
                <input
                  type="text"
                  placeholder="Enter school name"
                  value={formData.elementary.schoolName}
                  onChange={(e) => setFormData({ ...formData, elementary: { ...formData.elementary, schoolName: e.target.value }})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="block text-gray-700 text-xs">Graduated?</label>
                <label className="flex items-center text-sm">
                  <input 
                    type="radio" 
                    name="elementaryGraduated"
                    checked={formData.elementary.graduated === 'Yes'}
                    onChange={() => setFormData({ ...formData, elementary: { ...formData.elementary, graduated: 'Yes', levelReached: '', yearLastAttended: '' }})}
                    className="mr-1" 
                  />
                  <span>Yes</span>
                </label>
                <label className="flex items-center text-sm">
                  <input 
                    type="radio" 
                    name="elementaryGraduated"
                    checked={formData.elementary.graduated === 'No'}
                    onChange={() => setFormData({ ...formData, elementary: { ...formData.elementary, graduated: 'No', yearGraduated: '' }})}
                    className="mr-1" 
                  />
                  <span>No</span>
                </label>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-600 mb-1 text-xs uppercase">Year Graduated</label>
                  <input
                    placeholder="Enter year graduated"
                    type="text"
                    value={formData.elementary.yearGraduated}
                    onChange={(e) => setFormData({ ...formData, elementary: { ...formData.elementary, yearGraduated: e.target.value }})}
                    disabled={formData.elementary.graduated === 'No'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1 text-xs uppercase">Level Reached</label>
                  <input
                    placeholder="Enter level reached"
                    type="text"
                    value={formData.elementary.levelReached}
                    onChange={(e) => setFormData({ ...formData, elementary: { ...formData.elementary, levelReached: e.target.value }})}
                    disabled={formData.elementary.graduated !== 'No'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-sm text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1 text-xs uppercase">Year Last Attended</label>
                  <input
                    placeholder="Enter year last attended"
                    type="text"
                    value={formData.elementary.yearLastAttended}
                    onChange={(e) => setFormData({ ...formData, elementary: { ...formData.elementary, yearLastAttended: e.target.value }})}
                    disabled={formData.elementary.graduated !== 'No'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-sm text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Secondary */}
            <div className="border border-gray-300 rounded p-4 space-y-3">
              <div className="font-bold text-sm uppercase">Secondary</div>
              <div>
                <label className="block text-gray-600 mb-1 text-xs uppercase">School Name</label>
                <input
                  type="text"
                  placeholder="Enter school name"
                  value={formData.secondary.schoolName}
                  onChange={(e) => setFormData({ ...formData, secondary: { ...formData.secondary, schoolName: e.target.value }})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center text-sm">
                  <input 
                    type="radio" 
                    name="secondaryType"
                    checked={formData.secondary.type === 'Non-K12'}
                    onChange={() => setFormData({ ...formData, secondary: { ...formData.secondary, type: 'Non-K12', seniorHighStrand: '' }})}
                    className="mr-1" 
                  />
                  <span>Non-K12</span>
                </label>
                <label className="flex items-center text-sm">
                  <input 
                    type="radio" 
                    name="secondaryType"
                    checked={formData.secondary.type === 'K-12'}
                    onChange={() => setFormData({ ...formData, secondary: { ...formData.secondary, type: 'K-12' }})}
                    className="mr-1" 
                  />
                  <span>K-12 (Senior High)</span>
                </label>
              </div>
              {formData.secondary.type === 'K-12' && (
                <div>
                  <label className="block text-gray-600 mb-1 text-xs uppercase">Senior High Strand / Track</label>
                  <input 
                    type="text" 
                    placeholder="e.g. ABM, STEM, HUMSS, TVL, GAS..." 
                    value={formData.secondary.seniorHighStrand}
                    onChange={(e) => setFormData({ ...formData, secondary: { ...formData.secondary, seniorHighStrand: e.target.value }})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500" 
                  />
                </div>
              )}
              <div className="flex items-center gap-4">
                <label className="block text-gray-700 text-xs">Graduated?</label>
                <label className="flex items-center text-sm">
                  <input 
                    placeholder="Enter year graduated"
                    type="radio" 
                    name="secondaryGraduated"
                    checked={formData.secondary.graduated === 'Yes'}
                    onChange={() => setFormData({ ...formData, secondary: { ...formData.secondary, graduated: 'Yes', levelReached: '', yearLastAttended: '' }})}
                    className="mr-1" 
                  />
                  <span>Yes</span>
                </label>
                <label className="flex items-center text-sm">
                  <input 
                    type="radio" 
                    name="secondaryGraduated"
                    checked={formData.secondary.graduated === 'No'}
                    onChange={() => setFormData({ ...formData, secondary: { ...formData.secondary, graduated: 'No', yearGraduated: '' }})}
                    className="mr-1" 
                  />
                  <span>No</span>
                </label>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-600 mb-1 text-xs uppercase">Year Graduated</label>
                  <input
                    type="text"
                    value={formData.secondary.yearGraduated}
                    onChange={(e) => setFormData({ ...formData, secondary: { ...formData.secondary, yearGraduated: e.target.value }})}
                    placeholder="Enter year graduated"
                    disabled={formData.secondary.graduated === 'No'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1 text-xs uppercase">Level Reached</label>
                  <input
                    placeholder="Enter level reached"
                    type="text"
                    value={formData.secondary.levelReached}
                    onChange={(e) => setFormData({ ...formData, secondary: { ...formData.secondary, levelReached: e.target.value }})}
                    disabled={formData.secondary.graduated !== 'No'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-sm text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1 text-xs uppercase">Year Last Attended</label>
                  <input
                    placeholder="Enter year last attended"
                    type="text"
                    value={formData.secondary.yearLastAttended}
                    onChange={(e) => setFormData({ ...formData, secondary: { ...formData.secondary, yearLastAttended: e.target.value }})}
                    disabled={formData.secondary.graduated !== 'No'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-sm text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Tertiary */}
            <div className="border border-gray-300 rounded p-4 space-y-3">
              <div className="font-bold text-sm uppercase">Tertiary</div>
              <div>
                <label className="block text-gray-600 mb-1 text-xs uppercase">School Name</label>
                <input
                  type="text"
                  placeholder="Enter school name"
                  value={formData.tertiary.schoolName}
                  onChange={(e) => setFormData({ ...formData, tertiary: { ...formData.tertiary, schoolName: e.target.value }})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-gray-600 mb-1 text-xs uppercase">Course / Degree</label>
                <input 
                  type="text" 
                  placeholder="e.g. Bachelor of Science in Nursing, BSBA, AB Communication..."
                  value={formData.tertiary.course}
                  onChange={(e) => setFormData({ ...formData, tertiary: { ...formData.tertiary, course: e.target.value }})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500" 
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="block text-gray-700 text-xs">Graduated?</label>
                <label className="flex items-center text-sm">
                  <input 
                    type="radio" 
                    name="tertiaryGraduated"
                    checked={formData.tertiary.graduated === 'Yes'}
                    onChange={() => setFormData({ ...formData, tertiary: { ...formData.tertiary, graduated: 'Yes', levelReached: '', yearLastAttended: '' }})}
                    className="mr-1" 
                  />
                  <span>Yes</span>
                </label>
                <label className="flex items-center text-sm">
                  <input 
                    type="radio" 
                    name="tertiaryGraduated"
                    checked={formData.tertiary.graduated === 'No'}
                    onChange={() => setFormData({ ...formData, tertiary: { ...formData.tertiary, graduated: 'No', yearGraduated: '' }})}
                    className="mr-1" 
                  />
                  <span>No</span>
                </label>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-600 mb-1 text-xs uppercase">Year Graduated</label>
                  <input
                    placeholder="Enter year graduated"
                    type="text"
                    value={formData.tertiary.yearGraduated}
                    onChange={(e) => setFormData({ ...formData, tertiary: { ...formData.tertiary, yearGraduated: e.target.value }})}
                    disabled={formData.tertiary.graduated === 'No'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1 text-xs uppercase">Level Reached</label>
                  <input
                    placeholder="Enter level reached"
                    type="text"
                    value={formData.tertiary.levelReached}
                    onChange={(e) => setFormData({ ...formData, tertiary: { ...formData.tertiary, levelReached: e.target.value }})}
                    disabled={formData.tertiary.graduated !== 'No'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-sm text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1 text-xs uppercase">Year Last Attended</label>
                  <input
                    placeholder="Enter year last attended"
                    type="text"
                    value={formData.tertiary.yearLastAttended}
                    onChange={(e) => setFormData({ ...formData, tertiary: { ...formData.tertiary, yearLastAttended: e.target.value }})}
                    disabled={formData.tertiary.graduated !== 'No'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-sm text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Graduate Studies */}
            {formData.graduateStudies.map((gs, gsIdx) => (
              <div key={gsIdx} className="border border-gray-300 rounded p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm uppercase">Graduate Studies/Post-Graduate #{gsIdx + 1}</div>
                  <button type="button" onClick={() => setFormData({ ...formData, graduateStudies: formData.graduateStudies.filter((_, i) => i !== gsIdx) })}
                    className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                </div>
                <div>
                  <label className="block text-gray-600 mb-1 text-xs uppercase">School Name</label>
                  <input type="text" placeholder="Enter school name"
                    value={gs.schoolName}
                    onChange={(e) => { const u=[...formData.graduateStudies]; u[gsIdx]={...u[gsIdx],schoolName:e.target.value}; setFormData({...formData,graduateStudies:u}); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500" />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1 text-xs uppercase">Course / Degree</label>
                  <input type="text" placeholder="e.g. Master of Arts in Education"
                    value={gs.course}
                    onChange={(e) => { const u=[...formData.graduateStudies]; u[gsIdx]={...u[gsIdx],course:e.target.value}; setFormData({...formData,graduateStudies:u}); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="block text-gray-700 text-xs">Graduated?</label>
                  <label className="flex items-center text-sm">
                    <input type="radio" name={`gsGraduated-${gsIdx}`} checked={gs.graduated==='Yes'}
                      onChange={() => { const u=[...formData.graduateStudies]; u[gsIdx]={...u[gsIdx],graduated:'Yes',levelReached:'',yearLastAttended:''}; setFormData({...formData,graduateStudies:u}); }}
                      className="mr-1" /><span>Yes</span>
                  </label>
                  <label className="flex items-center text-sm">
                    <input type="radio" name={`gsGraduated-${gsIdx}`} checked={gs.graduated==='No'}
                      onChange={() => { const u=[...formData.graduateStudies]; u[gsIdx]={...u[gsIdx],graduated:'No',yearGraduated:''}; setFormData({...formData,graduateStudies:u}); }}
                      className="mr-1" /><span>No</span>
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-600 mb-1 text-xs uppercase">Year Graduated</label>
                    <input type="text" value={gs.yearGraduated}
                      onChange={(e) => { const u=[...formData.graduateStudies]; u[gsIdx]={...u[gsIdx],yearGraduated:e.target.value}; setFormData({...formData,graduateStudies:u}); }}
                      disabled={gs.graduated === 'No'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500 disabled:bg-gray-100 disabled:cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1 text-xs uppercase">Level Reached</label>
                    <input type="text" value={gs.levelReached}
                      onChange={(e) => { const u=[...formData.graduateStudies]; u[gsIdx]={...u[gsIdx],levelReached:e.target.value}; setFormData({...formData,graduateStudies:u}); }}
                      disabled={gs.graduated !== 'No'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-sm text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1 text-xs uppercase">Year Last Attended</label>
                    <input type="text" value={gs.yearLastAttended}
                      onChange={(e) => { const u=[...formData.graduateStudies]; u[gsIdx]={...u[gsIdx],yearLastAttended:e.target.value}; setFormData({...formData,graduateStudies:u}); }}
                      disabled={gs.graduated !== 'No'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-sm text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed" />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addGraduateStudyRow}
              className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded hover:bg-[#01a0ff] transition-colors text-sm"
            >
              <Plus size={16} />
              Add Another Graduate Study
            </button>
          </div>
        );

      case 'training':
        return (
          <div className="space-y-6">
            <div className="bg-brand-blue text-white px-4 py-3 font-bold uppercase text-sm">
              V. TECHNICAL/VOCATIONAL AND OTHER TRAINING
            </div>
            
            <div className="border border-gray-300 rounded overflow-hidden">
              <div className="grid grid-cols-5 bg-gray-200 text-black">
                <div className="px-3 py-2 border-r border-gray-300 font-bold uppercase text-xs">Training/Vocational Course</div>
                <div className="px-3 py-2 border-r border-gray-300 font-bold uppercase text-xs">Hours of Training</div>
                <div className="px-3 py-2 border-r border-gray-300 font-bold uppercase text-xs">Training Institution</div>
                <div className="px-3 py-2 border-r border-gray-300 font-bold uppercase text-xs">Skills Acquired</div>
                <div className="px-3 py-2 font-bold uppercase text-xs">Certificate Received</div>
              </div>
              
              {formData.trainings.map((training, index) => (
                <div key={index} className="grid grid-cols-5 border-t border-gray-300">
                  <div className="p-2 border-r border-gray-300">
                    <input
                      type="text"
                      value={training.course}
                      onChange={(e) => {
                        const newTrainings = [...formData.trainings];
                        newTrainings[index].course = e.target.value;
                        setFormData({ ...formData, trainings: newTrainings });
                      }}
                      className="text-black w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-sm"
                    />
                  </div>
                  <div className="p-2 border-r border-gray-300">
                    <input
                      type="text"
                      value={training.hoursOfTraining}
                      onChange={(e) => {
                        const newTrainings = [...formData.trainings];
                        newTrainings[index].hoursOfTraining = e.target.value;
                        setFormData({ ...formData, trainings: newTrainings });
                      }}
                      className="text-black w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-sm"
                    />
                  </div>
                  <div className="p-2 border-r border-gray-300">
                    <input
                      type="text"
                      value={training.institution}
                      onChange={(e) => {
                        const newTrainings = [...formData.trainings];
                        newTrainings[index].institution = e.target.value;
                        setFormData({ ...formData, trainings: newTrainings });
                      }}
                      className=" text-black w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-sm"
                    />
                  </div>
                  <div className="p-2 border-r border-gray-300">
                    <input
                      type="text"
                      value={training.skillsAcquired}
                      onChange={(e) => {
                        const newTrainings = [...formData.trainings];
                        newTrainings[index].skillsAcquired = e.target.value;
                        setFormData({ ...formData, trainings: newTrainings });
                      }}
                      className="text-black w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-sm"
                    />
                  </div>
                  <div className="p-2">
                    <input
                      type="text"
                      value={training.certificateReceived}
                      onChange={(e) => {
                        const newTrainings = [...formData.trainings];
                        newTrainings[index].certificateReceived = e.target.value;
                        setFormData({ ...formData, trainings: newTrainings });
                      }}
                      className="text-black w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addTrainingRow}
              className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded hover:bg-[#01a0ff] transition-colors text-sm"
            >
              <Plus size={16} />
              Add Row
            </button>
          </div>
        );

      case 'eligibility':
        return (
          <div className="space-y-6">
            <div className="bg-brand-blue text-white px-4 py-3 font-bold uppercase text-sm">
              VI. ELIGIBILITY/PROFESSIONAL LICENSE
            </div>
            
            {/* Eligibility Section */}
            <div className="border border-gray-300 rounded p-4">
              <div className="grid grid-cols-2 gap-4 mb-3 bg-gray-200 p-3 rounded">
                <div className="text-black font-bold uppercase text-xs">Eligibility (Civil Service)</div>
                <div className="text-black font-bold uppercase text-xs">Date Taken</div>
              </div>
              {formData.eligibilities.map((elig, index) => (
                <div key={index} className="grid grid-cols-2 gap-4 mb-2">
                  <input
                    type="text"
                    value={elig.eligibility}
                    onChange={(e) => {
                      const newEligibilities = [...formData.eligibilities];
                      newEligibilities[index].eligibility = e.target.value;
                      setFormData({ ...formData, eligibilities: newEligibilities });
                    }}
                    className="text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-sm"
                  />
                  <DatePicker
                    className="text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-sm"
                    value={elig.dateTaken}
                    onChange={(value) => {
                      const newEligibilities = [...formData.eligibilities];
                      newEligibilities[index].dateTaken = value;
                      setFormData({ ...formData, eligibilities: newEligibilities });
                    }}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addEligibilityRow}
                className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded hover:bg-[#01a0ff] transition-colors text-sm mt-3"
              >
                <Plus size={16} />
                Add Row
              </button>
            </div>

            {/* Professional License Section */}
            <div className="border border-gray-300 rounded p-4">
              <div className="grid grid-cols-2 gap-4 mb-3 bg-gray-200 p-3 rounded">
                <div className="text-black font-bold uppercase text-xs">Professional License (PRC)</div>
                <div className="text-black font-bold uppercase text-xs">Valid Until</div>
              </div>
              {formData.professionalLicenses.map((license, index) => (
                <div key={index} className="grid grid-cols-2 gap-4 mb-2">
                  <input
                    type="text"
                    value={license.license}
                    onChange={(e) => {
                      const newLicenses = [...formData.professionalLicenses];
                      newLicenses[index].license = e.target.value;
                      setFormData({ ...formData, professionalLicenses: newLicenses });
                    }}
                    className="text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-sm"
                  />
                  <DatePicker
                    className="text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-sm"
                    value={license.validUntil}
                    onChange={(value) => {
                      const newLicenses = [...formData.professionalLicenses];
                      newLicenses[index].validUntil = value;
                      setFormData({ ...formData, professionalLicenses: newLicenses });
                    }}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addProfessionalLicenseRow}
                className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded hover:bg-[#01a0ff] transition-colors text-sm mt-3"
              >
                <Plus size={16} />
                Add Row
              </button>
            </div>
          </div>
        );

      case 'workExperience':
        return (
          <div className="space-y-6">
            <div className="bg-brand-blue text-white px-4 py-3 font-bold uppercase text-sm">
              VII. WORK EXPERIENCE (within last 10 years only)
            </div>
            
            <div className="border border-gray-300 rounded p-4">
              <div className="text-black grid grid-cols-5 gap-4 mb-3 bg-gray-200 p-3 rounded">
                <div className="font-bold uppercase text-xs">Company Name</div>
                <div className="font-bold uppercase text-xs">Position</div>
                <div className="font-bold uppercase text-xs">From</div>
                <div className="font-bold uppercase text-xs">To</div>
                <div className="font-bold uppercase text-xs">Status</div>
              </div>
              {formData.workExperiences.map((exp, index) => (
                <div key={index} className="grid grid-cols-5 gap-4 mb-2">
                  <input
                    type="text"
                    value={exp.companyName}
                    onChange={(e) => {
                      const newExperiences = [...formData.workExperiences];
                      newExperiences[index].companyName = e.target.value;
                      setFormData({ ...formData, workExperiences: newExperiences });
                    }}
                    className="text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-sm"
                  />
                  <input
                    type="text"
                    value={exp.position}
                    onChange={(e) => {
                      const newExperiences = [...formData.workExperiences];
                      newExperiences[index].position = e.target.value;
                      setFormData({ ...formData, workExperiences: newExperiences });
                    }}
                    className="text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-sm"
                  />
                  <input
                    type="month"
                    value={exp.from}
                    onChange={(e) => {
                      const newExperiences = [...formData.workExperiences];
                      newExperiences[index].from = e.target.value;
                      setFormData({ ...formData, workExperiences: newExperiences });
                    }}
                    className="text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-sm"
                  />
                  <input
                    type="month"
                    value={exp.to}
                    onChange={(e) => {
                      const newExperiences = [...formData.workExperiences];
                      newExperiences[index].to = e.target.value;
                      setFormData({ ...formData, workExperiences: newExperiences });
                    }}
                    className="text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-sm"
                  />
                  <select
                    value={exp.status}
                    onChange={(e) => {
                      const newExperiences = [...formData.workExperiences];
                      newExperiences[index].status = e.target.value;
                      setFormData({ ...formData, workExperiences: newExperiences });
                    }}
                    className="text-black px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-sm bg-white"
                  >
                    <option value="">Select</option>
                    <option value="FULLTIME">Full-time</option>
                    <option value="PARTTIME">Part-time</option>
                    <option value="CONTRACT">Contract</option>
                  </select>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    workExperiences: [
                      ...formData.workExperiences,
                      { companyName: '', position: '', from: '', to: '', status: '' }
                    ]
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded hover:bg-[#01a0ff] transition-colors text-sm mt-3"
              >
                <Plus size={16} />
                Add Row
              </button>
            </div>
          </div>
        );

      case 'otherSkills':
        return (
          <div className="space-y-6">
            <div className="bg-brand-blue text-white px-4 py-3 font-bold uppercase text-sm">
              VIII. OTHER SKILLS ACQUIRED WITHOUT CERTIFICATE
            </div>
            
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {['AUTO MECHANIC', 'BEAUTICIAN', 'CARPENTRY WORK', 'COMPUTER LITERATE', 'DOMESTIC CHORES', 
                'DRIVER', 'ELECTRICIAN', 'EMBROIDERY', 'GARDENING', 'MASONRY', 'PAINTER/ARTIST', 'PAINTING JOBS',
                'PHOTOGRAPHY', 'PLUMBING', 'SEWING DRESSES', 'STENOGRAPHY', 'TAILORING'].map((skill) => (
                <label key={skill} className="flex items-center text-sm">
                  <input 
                    type="checkbox" 
                    className="mr-2"
                    checked={formData.otherSkills.includes(skill)}
                    onChange={() => toggleCheckbox('otherSkills', skill)}
                  />
                  <span>{skill}</span>
                </label>
              ))}
              <div className="col-span-2 space-y-2">
                <div className="flex items-center gap-2">
                  <label className="flex items-center text-sm flex-shrink-0">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={formData.otherSkills.includes('OTHERS')}
                      onChange={() => toggleCheckbox('otherSkills', 'OTHERS')}
                    />
                    <span>OTHERS:</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Please specify"
                    value={formData.otherSkillsSpecify[0] ?? ''}
                    onChange={e => {
                      const updated = [...formData.otherSkillsSpecify];
                      updated[0] = e.target.value;
                      setFormData({ ...formData, otherSkillsSpecify: updated });
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, otherSkillsSpecify: [...formData.otherSkillsSpecify, ''] })}
                    className="flex items-center gap-2 px-4 py-2 border border-brand-blue text-brand-blue rounded hover:bg-blue-50 transition-colors text-sm whitespace-nowrap"
                  >
                    <Plus size={16} />
                    Add Another Input
                  </button>
                </div>
                {formData.otherSkillsSpecify.slice(1).map((val, i) => (
                  <div key={i + 1} className="flex items-center gap-2 pl-[calc(1rem+0.5rem+6ch)]">
                    <input
                      type="text"
                      placeholder="Please specify"
                      value={val}
                      onChange={e => {
                        const updated = [...formData.otherSkillsSpecify];
                        updated[i + 1] = e.target.value;
                        setFormData({ ...formData, otherSkillsSpecify: updated });
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, otherSkillsSpecify: formData.otherSkillsSpecify.filter((_, j) => j !== i + 1) })}
                      className="text-red-400 hover:text-red-600 text-lg leading-none px-1"
                    >×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'referredProgram':
        return (
          <div className="space-y-6">
            <div className="bg-brand-blue text-white px-4 py-3 font-bold uppercase text-sm">
              IX. REFERRED PROGRAM
            </div>
            <div className="space-y-4">
              {(['SPES', 'GIP', 'DILEEP', 'TESDA Training', 'TUPAD', 'JobStart'] as const).map((prog) => (
                <label key={prog} className="flex items-center text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={formData.referredProgram === prog}
                    onChange={(e) => setFormData({ ...formData, referredProgram: e.target.checked ? prog : '' })}
                  />
                  <span className="font-semibold">{prog}</span>
                </label>
              ))}
              <label className="flex items-center text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={formData.referredProgram === 'Others'}
                  onChange={(e) => setFormData({ ...formData, referredProgram: e.target.checked ? 'Others' : '', referredProgramOther: '' })}
                />
                <span className="font-semibold">Others, specify:</span>
              </label>
              {formData.referredProgram === 'Others' && (
                <div className="ml-6">
                  <input
                    type="text"
                    value={formData.referredProgramOther}
                    onChange={(e) => setFormData({ ...formData, referredProgramOther: e.target.value })}
                    placeholder="Please specify"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500"
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 'documents':
        return (
          <div className="space-y-6">
            <div className="bg-brand-blue text-white px-4 py-3 font-bold uppercase text-sm">
              X. DOCUMENTS / ATTACHMENTS
            </div>

            <div className="px-4 space-y-4">
              {/* Document Type Dropdown */}
              <div>
                <label className="block text-gray-700 mb-2 text-sm font-semibold">Document Type</label>
                <select
                  value={currentDocType}
                  onChange={(e) => {
                    setCurrentDocType(e.target.value);
                    if (e.target.value !== 'Others') {
                      setCurrentCustomName('');
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none"
                >
                  <option value="">Select Document</option>
                  <option value="Resume / Curriculum Vitae">Resume / Curriculum Vitae</option>
                  <option value="Birth Certificate">Birth Certificate</option>
                  <option value="Valid ID">Valid ID</option>
                  <option value="2x2 ID Picture">2x2 ID Picture</option>
                  <option value="Application Letter">Application Letter</option>
                  <option value="Biodata / Personal Data Sheet">Biodata / Personal Data Sheet</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Transcript of Records">Transcript of Records</option>
                  <option value="Certificate of Graduation">Certificate of Graduation</option>
                  <option value="Training Certificate">Training Certificate</option>
                  <option value="TESDA Certificate / NC">TESDA Certificate / NC</option>
                  <option value="Skills Certificate">Skills Certificate</option>
                  <option value="Barangay Clearance">Barangay Clearance</option>
                  <option value="Police Clearance">Police Clearance</option>
                  <option value="NBI Clearance">NBI Clearance</option>
                  <option value="Voter's Certificate">Voter's Certificate</option>
                  <option value="Medical Certificate">Medical Certificate</option>
                  <option value="Drug Test Result">Drug Test Result</option>
                  <option value="Certificate of Employment">Certificate of Employment</option>
                  <option value="Passport (for OFW)">Passport (for OFW)</option>
                  <option value="Visa / Work Permit (for OFW)">Visa / Work Permit (for OFW)</option>
                  <option value="Employment Contract (for OFW)">Employment Contract (for OFW)</option>
                  <option value="Others (Specify)">Others (Specify)</option>
                </select>
              </div>

              {/* Custom Name Input for "Others" */}
              {currentDocType === 'Others (Specify)' && (
                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-semibold">
                    Specify Document Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={currentCustomName}
                    onChange={(e) => setCurrentCustomName(e.target.value)}
                    placeholder="Enter document name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500"
                  />
                </div>
              )}

              {/* File Upload Button */}
              <div>
                <input
                  type="file"
                  id="documentUpload"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="documentUpload"
                  className={`flex items-center justify-center gap-2 px-6 py-3 border-2 border-dashed rounded-lg transition-all cursor-pointer ${
                    !currentDocType || (currentDocType === 'Others (Specify)' && !currentCustomName.trim())
                      ? 'border-gray-300 bg-gray-50 text-gray-400 cursor-not-allowed'
                      : 'border-brand-blue bg-blue-50 text-brand-blue hover:bg-blue-100'
                  }`}
                  onClick={(e) => {
                    if (!currentDocType || (currentDocType === 'Others (Specify)' && !currentCustomName.trim())) {
                      e.preventDefault();
                      alert('Please select a document type' + (currentDocType === 'Others (Specify)' ? ' and specify the document name' : '') + ' first');
                    }
                  }}
                >
                  <Upload size={20} />
                  <span className="font-medium">Upload Document</span>
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  Accepted formats: PDF, JPG, PNG
                  {!currentDocType && ' â¢ Please select a document type first'}
                  {currentDocType === 'Others (Specify)' && !currentCustomName.trim() && ' â¢ Please specify the document name'}
                </p>
              </div>

              {/* Uploaded Documents List */}
              {uploadedDocuments.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700">Uploaded Documents</h4>
                  <div className="space-y-2">
                    {uploadedDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div
                          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                          onClick={() => handlePreviewDocument(doc)}
                        >
                          <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                            <FileText size={20} className="text-brand-blue" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="inline-block px-2 py-0.5 bg-brand-blue text-white text-xs rounded font-medium">
                                {doc.customName || doc.documentType}
                              </span>
                            </div>
                            <p className="text-sm text-gray-800 truncate">{doc.file?.name ?? doc.fileName}</p>
                            <p className="text-xs text-gray-500">{doc.file ? formatFileSize(doc.file.size) : doc.fileSize}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handlePreviewDocument(doc)}
                            className="flex-shrink-0 p-2 text-brand-blue hover:bg-blue-50 rounded-lg transition-colors"
                            title="Preview document"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete document"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderSummary = () => (
    <div className="space-y-6">
      {/* Personal Information */}
      <div>
        <h4 className="text-sm font-bold text-white bg-brand-blue px-3 py-2 uppercase mb-3">I. Personal Information</h4>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div><span className="font-semibold">Name:</span> {formData.surname}, {formData.firstName} {formData.middleName} {formData.suffix}</div>
          <div><span className="font-semibold">Date of Birth:</span> {formData.dateOfBirth}</div>
          <div><span className="font-semibold">Sex:</span> {formData.sex}</div>
          <div><span className="font-semibold">Civil Status:</span> {formData.civilStatus}</div>
          <div><span className="font-semibold">Contact:</span> {formData.contactNumber}</div>
          <div><span className="font-semibold">Email:</span> {formData.email}</div>
        </div>
      </div>

      {/* Job Preference */}
      {(formData.jobPrefEmploymentType.length > 0 || formData.jobPrefWorkLocation.length > 0 || formData.jobPreferences.some(p => p.occupation)) && (
        <div>
          <h4 className="text-sm font-bold text-white bg-brand-blue px-3 py-2 uppercase mb-3">II. Job Preference</h4>
          <div className="text-sm space-y-1">
            {formData.jobPrefEmploymentType.length > 0 && <div><span className="font-semibold">Type:</span> {formData.jobPrefEmploymentType.join(', ')}</div>}
            {formData.jobPrefWorkLocation.length > 0 && <div><span className="font-semibold">Location:</span> {formData.jobPrefWorkLocation.join(', ')}</div>}
            {formData.jobPreferences.filter(p => p.occupation).map((pref, idx) => (
              <div key={idx}>
                {(idx > 0 || formData.jobPrefEmploymentType.length > 0 || formData.jobPrefWorkLocation.length > 0) && <hr className="border-t border-gray-300 my-2" />}
                <div><span className="font-semibold">Occupation {idx + 1}:</span> {pref.occupation}</div>
                {pref.localCity && <div><span className="font-semibold">Local:</span> {pref.localCity}</div>}
                {pref.overseasCountry && <div><span className="font-semibold">Overseas:</span> {pref.overseasCountry}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Language */}
      {formData.languages.some(l => l.language && (l.read || l.write || l.speak || l.understand)) && (
        <div>
          <h4 className="text-sm font-bold text-white bg-brand-blue px-3 py-2 uppercase mb-3">III. Language / Dialect Proficiency</h4>
          <div className="text-sm space-y-1">
            {formData.languages.filter(l => l.language && (l.read || l.write || l.speak || l.understand)).map((l, idx) => (
              <div key={idx}>
                <span className="font-semibold uppercase">{l.language}:</span>{' '}
                {[l.read && 'Read', l.write && 'Write', l.speak && 'Speak', l.understand && 'Understand'].filter(Boolean).join(', ')}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      <div>
        <h4 className="text-sm font-bold text-white bg-brand-blue px-3 py-2 uppercase mb-3">IV. Educational Background</h4>
        <div className="text-sm space-y-2">
          {formData.elementary.graduated && (
            <div>
              <div className="font-semibold">Elementary</div>
              {formData.elementary.graduated === 'Yes'
                ? <div><span className="font-semibold">Graduated:</span> {formData.elementary.yearGraduated}</div>
                : <><div><span className="font-semibold">Level Reached:</span> {formData.elementary.levelReached}</div><div><span className="font-semibold">Last Attended:</span> {formData.elementary.yearLastAttended}</div></>}
            </div>
          )}
          {formData.secondary.graduated && (
            <div>
              {formData.elementary.graduated && <hr className="border-t border-gray-300 my-2" />}
              <div className="font-semibold">Secondary</div>
              {formData.secondary.type && <div><span className="font-semibold">Type:</span> {formData.secondary.type}{formData.secondary.seniorHighStrand && <span> ({formData.secondary.seniorHighStrand})</span>}</div>}
              {formData.secondary.graduated === 'Yes'
                ? <div><span className="font-semibold">Graduated:</span> {formData.secondary.yearGraduated}</div>
                : <><div><span className="font-semibold">Level Reached:</span> {formData.secondary.levelReached}</div><div><span className="font-semibold">Last Attended:</span> {formData.secondary.yearLastAttended}</div></>}
            </div>
          )}
          {formData.tertiary.graduated && (
            <div>
              {(formData.elementary.graduated || formData.secondary.graduated) && <hr className="border-t border-gray-300 my-2" />}
              <div className="font-semibold">Tertiary</div>
              {formData.tertiary.course && <div><span className="font-semibold">Course:</span> {formData.tertiary.course}</div>}
              {formData.tertiary.graduated === 'Yes'
                ? <div><span className="font-semibold">Graduated:</span> {formData.tertiary.yearGraduated}</div>
                : <><div><span className="font-semibold">Level Reached:</span> {formData.tertiary.levelReached}</div><div><span className="font-semibold">Last Attended:</span> {formData.tertiary.yearLastAttended}</div></>}
            </div>
          )}
        </div>
      </div>

      {/* Technical/Vocational Training */}
      {formData.trainings.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-white bg-brand-blue px-3 py-2 uppercase mb-3">V. Technical/Vocational and Other Training</h4>
          <div className="text-sm space-y-1">
            {formData.trainings.map((t, idx) => (
              t.course && (
                <div key={idx}>
                  {idx > 0 && <hr className="border-t border-gray-300 my-2" />}
                  <div><span className="font-semibold">Course:</span> {t.course}</div>
                  {t.institution && <div><span className="font-semibold">Institution:</span> {t.institution}</div>}
                  {t.hoursOfTraining && <div><span className="font-semibold">Hours:</span> {t.hoursOfTraining} hrs</div>}
                  {t.skillsAcquired && <div><span className="font-semibold">Skills:</span> {t.skillsAcquired}</div>}
                  {t.certificateReceived && <div><span className="font-semibold">Certificate:</span> {t.certificateReceived}</div>}
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Eligibility / Professional License */}
      {(formData.eligibilities.length > 0 || formData.professionalLicenses.length > 0) && (
        <div>
          <h4 className="text-sm font-bold text-white bg-brand-blue px-3 py-2 uppercase mb-3">VI. Eligibility / Professional License</h4>
          <div className="text-sm space-y-1">
            {formData.eligibilities.map((e, idx) => (
              e.eligibility && (
                <div key={idx}>
                  <span className="font-semibold">{e.eligibility}</span>
                  {e.dateTaken && <span className="text-gray-600"> · {e.dateTaken}</span>}
                </div>
              )
            ))}
            {formData.professionalLicenses.map((l, idx) => (
              l.license && (
                <div key={idx}>
                  <span className="font-semibold">{l.license}</span>
                  {l.validUntil && <span className="text-gray-600"> · Valid until {l.validUntil}</span>}
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Work Experience */}
      {formData.workExperiences.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-white bg-brand-blue px-3 py-2 uppercase mb-3">VII. Work Experience</h4>
          {formData.workExperiences.map((exp, idx) => (
            exp.companyName && (
              <div key={idx} className="mb-2 text-sm">
                <span className="font-semibold">{exp.companyName}</span> - {exp.position} ({exp.from} to {exp.to})
              </div>
            )
          ))}
        </div>
      )}

      {/* Other Skills */}
      {(formData.otherSkills.length > 0 || formData.otherSkillsSpecify.some(v => v)) && (
        <div>
          <h4 className="text-sm font-bold text-white bg-brand-blue px-3 py-2 uppercase mb-3">VIII. Other Skills Acquired Without Certificate</h4>
          <div className="text-sm space-y-1">
            {formData.otherSkills.filter(s => s !== 'OTHERS').map((s, idx) => (
              <div key={idx}>{s}</div>
            ))}
            {formData.otherSkills.includes('OTHERS') && formData.otherSkillsSpecify.filter(v => v).map((v, idx) => (
              <div key={idx}><span className="font-semibold">Others:</span> {v}</div>
            ))}
          </div>
        </div>
      )}

      {/* Referred Program */}
      {formData.referredProgram && (
        <div>
          <h4 className="text-sm font-bold text-white bg-brand-blue px-3 py-2 uppercase mb-3">IX. Referred Program</h4>
          <div className="text-sm">
            <span className="font-semibold">Program:</span> {formData.referredProgram}
          </div>
        </div>
      )}

      {/* Documents / Attachments */}
      {uploadedDocuments.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-white bg-brand-blue px-3 py-2 uppercase mb-3">X. Documents / Attachments</h4>
          <div className="text-sm space-y-1">
            {uploadedDocuments.map((doc, idx) => (
              <div key={doc.id}>
                <span className="font-semibold">{idx + 1}. {doc.customName || doc.documentType}:</span> {doc.file?.name ?? doc.fileName} ({doc.file ? formatFileSize(doc.file.size) : doc.fileSize})
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="bg-white rounded-xl shadow-md flex">
          {/* Left Navigation */}
          <div className="w-72 bg-[#F8F9FA] border-r border-gray-200 pt-[88px] px-6 pb-6 overflow-y-auto">
            <nav className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors text-xs ${
                    activeSection === section.id
                      ? 'bg-brand-blue text-white font-semibold'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Users size={20} className="text-brand-blue" />
                <h3 className="text-gray-800 m-0 text-base font-medium">{isEditMode ? 'Edit applicant' : 'Add new applicant'}</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-6">
              {renderSectionContent()}
            </form>

            {/* Footer Actions */}
            <div className="border-t border-gray-200 px-8 py-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Back to Applicants List
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-[#01a0ff] transition-colors"
              >
                {isLastSection() ? (isEditMode ? 'Update Profile' : 'Save Profile') : 'Next'}
              </button>
            </div>
          </div>
      </div>


      <ApplicantReviewModal
        isOpen={showConfirmation}
        title={isEditMode ? "Confirm Update" : "Confirm Applicant Details"}
        message={isEditMode ? "Please review the changes before saving. Are all details correct?" : "Please review the information before saving. Are all details correct?"}
        summaryContent={renderSummary()}
        onBackToEdit={() => setShowConfirmation(false)}
        onConfirm={handleConfirmSave}
      />

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Success!</h3>
              <p className="text-gray-600 mb-6">{isEditMode ? 'Applicant profile has been successfully updated.' : 'Applicant has been successfully added to the system.'}</p>
              <button
                onClick={() => {
                  setShowSuccess(false);
                  onClose();
                }}
                className="px-8 py-2 bg-brand-blue text-white rounded-lg hover:bg-[#01a0ff] transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDocument && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {previewDocument.customName || previewDocument.documentType}
                </h3>
                <p className="text-sm text-gray-500">{previewDocument.file?.name ?? previewDocument.fileName}</p>
              </div>
              <button
                onClick={() => setPreviewDocument(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-auto p-4 bg-gray-50">
              {!previewDocument.file && previewDocument.documentType === '2x2 ID Picture' && profileImage ? (
                <div className="flex items-center justify-center h-full">
                  <img src={profileImage} alt="2x2 ID photo" className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
                </div>
              ) : !previewDocument.file && previewDocument.url ? (
                /(\.png|\.jpe?g|\.gif|\.webp)$/i.test(previewDocument.fileName ?? '') ? (
                  <div className="flex items-center justify-center h-full">
                    <img src={previewDocument.url} alt={previewDocument.fileName} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
                  </div>
                ) : /\.pdf$/i.test(previewDocument.fileName ?? '') ? (
                  <iframe src={previewDocument.url} className="w-full h-full min-h-[600px] rounded-lg shadow-lg" title="PDF Preview" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <FileText size={64} className="mb-4 text-gray-400" />
                    <p className="text-lg font-medium mb-2">Preview not available</p>
                    <a href={previewDocument.url} target="_blank" rel="noreferrer" className="text-sm text-brand-blue underline">Open / download file</a>
                  </div>
                )
              ) : !previewDocument.file ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <FileText size={64} className="mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">File not available for preview</p>
                  <p className="text-sm">This document was uploaded in a previous session.</p>
                </div>
              ) : previewDocument.file.type.startsWith('image/') ? (
                <div className="flex items-center justify-center h-full">
                  <img
                    src={URL.createObjectURL(previewDocument.file)}
                    alt={previewDocument.file.name}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                  />
                </div>
              ) : previewDocument.file.type === 'application/pdf' ? (
                <iframe
                  src={URL.createObjectURL(previewDocument.file)}
                  className="w-full h-full min-h-[600px] rounded-lg shadow-lg"
                  title="PDF Preview"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <FileText size={64} className="mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">Preview not available</p>
                  <p className="text-sm">
                    This file type cannot be previewed. File: {previewDocument.file.name}
                  </p>
                  <p className="text-xs mt-2">Type: {previewDocument.file.type || 'Unknown'}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setPreviewDocument(null)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


