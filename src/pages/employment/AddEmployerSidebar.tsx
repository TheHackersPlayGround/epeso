import { useState } from 'react';
import { X, Briefcase } from 'lucide-react';
import ApplicantReviewModal from './ApplicantReviewModal';

interface EmployerFormData {
  companyName: string;
  industry: string;
  industryOther: string;
  companySize: string;
  businessType: string;
  yearsInOperation: string;
  tinNumber: string;
  contactPersonName: string;
  position: string;
  contactNumber: string;
  email: string;
  buildingNo: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  region: string;
  jobOpenings: Array<{ jobName: string; slots: string }>;
  status: string;
  dateRegistered: string;
  remarks: string;
}

interface AddEmployerSidebarProps {
  onSave: (data: EmployerFormData) => void;
  onClose: () => void;
}

type Section = 'companyInfo' | 'contactPerson' | 'companyAddress' | 'registration';

export default function AddEmployerSidebar({ onSave, onClose }: AddEmployerSidebarProps) {
  const [activeSection, setActiveSection] = useState<Section>('companyInfo');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState<EmployerFormData>({
    companyName: '',
    industry: '',
    industryOther: '',
    companySize: '',
    businessType: '',
    yearsInOperation: '',
    tinNumber: '',
    contactPersonName: '',
    position: '',
    contactNumber: '',
    email: '',
    buildingNo: '',
    street: '',
    barangay: '',
    city: '',
    province: '',
    region: '',
    jobOpenings: [{ jobName: '', slots: '' }],
    status: 'Active',
    dateRegistered: new Date().toISOString().split('T')[0],
    remarks: '',
  });

  const sections = [
    { id: 'companyInfo' as Section, label: 'Company information' },
    { id: 'contactPerson' as Section, label: 'Contact person' },
    { id: 'companyAddress' as Section, label: 'Company address' },
    { id: 'registration' as Section, label: 'Registration details' },
  ];

  const handleChange = (field: keyof EmployerFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleConfirmSave = () => {
    setShowConfirmation(false);
    onSave(formData);
    setShowSuccess(true);
  };

  const [showFieldErrors, setShowFieldErrors] = useState(false);

  const REQUIRED: Partial<Record<keyof EmployerFormData, string>> = {
    companyName: 'companyInfo',
    contactPersonName: 'contactPerson',
    contactNumber: 'contactPerson',
  };

  function fieldError(key: keyof EmployerFormData) {
    return showFieldErrors && !String(formData[key] ?? '').trim();
  }

  function inputCls(key: keyof EmployerFormData) {
    return `w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500 transition-colors ${
      fieldError(key)
        ? 'border-red-500 ring-2 ring-red-200 focus:ring-red-300'
        : 'border-gray-300 focus:ring-brand-blue'
    }`;
  }

  function ErrMsg({ k }: { k: keyof EmployerFormData }) {
    return fieldError(k) ? <p className="text-red-500 text-xs mt-1">This field is required.</p> : null;
  }

  function sectionRequiredKeys(section: Section): (keyof EmployerFormData)[] {
    return (Object.entries(REQUIRED) as [keyof EmployerFormData, string][])
      .filter(([, s]) => s === section)
      .map(([k]) => k);
  }

  function hasSectionErrors(section: Section) {
    return sectionRequiredKeys(section).some(k => !String(formData[k] ?? '').trim());
  }

  function hasAllErrors() {
    return (Object.keys(REQUIRED) as (keyof EmployerFormData)[]).some(k => !String(formData[k] ?? '').trim());
  }

  function firstFailingSection(): Section {
    const entry = (Object.entries(REQUIRED) as [keyof EmployerFormData, string][])
      .find(([k]) => !String(formData[k] ?? '').trim());
    return (entry?.[1] ?? 'companyInfo') as Section;
  }

  const handleNext = () => {
    const currentIndex = sections.findIndex(s => s.id === activeSection);
    const isLast = currentIndex === sections.length - 1;
    if (isLast) {
      if (hasAllErrors()) {
        setShowFieldErrors(true);
        setActiveSection(firstFailingSection());
        return;
      }
      setShowConfirmation(true);
    } else {
      if (hasSectionErrors(activeSection)) {
        setShowFieldErrors(true);
        return;
      }
      setActiveSection(sections[currentIndex + 1].id);
    }
  };

  const isLastSection = () => {
    const currentIndex = sections.findIndex(s => s.id === activeSection);
    return currentIndex === sections.length - 1;
  };

  const renderSummary = () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-bold mb-3 bg-brand-blue text-white px-3 py-2 uppercase">Company Information</h4>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div><span className="font-semibold">Company Name:</span> {formData.companyName}</div>
          <div><span className="font-semibold">Industry:</span> {formData.industry === 'Other' ? `Other - ${formData.industryOther}` : formData.industry}</div>
          <div><span className="font-semibold">Company Size:</span> {formData.companySize}</div>
          <div><span className="font-semibold">Business Type:</span> {formData.businessType}</div>
          <div><span className="font-semibold">Years in Operation:</span> {formData.yearsInOperation}</div>
          <div><span className="font-semibold">TIN Number:</span> {formData.tinNumber}</div>
        </div>
      </div>
      <div>
        <h4 className="text-sm font-bold mb-3 bg-brand-blue text-white px-3 py-2 uppercase">Contact Person</h4>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div><span className="font-semibold">Name:</span> {formData.contactPersonName}</div>
          <div><span className="font-semibold">Position:</span> {formData.position}</div>
          <div><span className="font-semibold">Contact Number:</span> {formData.contactNumber}</div>
          <div><span className="font-semibold">Email:</span> {formData.email}</div>
        </div>
      </div>
      <div>
        <h4 className="text-sm font-bold mb-3 bg-brand-blue text-white px-3 py-2 uppercase">Company Address</h4>
        <div className="text-sm">
          <p>{formData.buildingNo} {formData.street}, {formData.barangay}, {formData.city}, {formData.province}, {formData.region}</p>
        </div>
      </div>
      <div>
        <h4 className="text-sm font-bold mb-3 bg-brand-blue text-white px-3 py-2 uppercase">Registration Details</h4>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div><span className="font-semibold">Status:</span> {formData.status}</div>
          <div><span className="font-semibold">Date Registered:</span> {formData.dateRegistered}</div>
          {formData.remarks && (
            <div className="col-span-2"><span className="font-semibold">Remarks:</span> {formData.remarks}</div>
          )}
        </div>
      </div>
    </div>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'companyInfo':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">COMPANY INFORMATION</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Company Name <span className="text-red-500">*</span></label>
                <input type="text" value={formData.companyName}
                  onChange={e => handleChange('companyName', e.target.value)}
                  placeholder="e.g., ABC Corporation"
                  className={inputCls('companyName')} />
                <ErrMsg k="companyName" />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Industry</label>
                <select value={formData.industry} onChange={e => handleChange('industry', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500">
                  <option value="">Select Industry</option>
                  {['Manufacturing','Information Technology','Agriculture','Retail','Healthcare','Education','Construction','Hospitality','Transportation','Financial Services','Other'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                {formData.industry === 'Other' && (
                  <>
                    <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Please specify industry</label>
                    <input type="text" value={formData.industryOther}
                      onChange={e => handleChange('industryOther', e.target.value)}
                      placeholder="e.g., Mining, Logistics..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500" />
                  </>
                )}
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Company Size</label>
                <select value={formData.companySize} onChange={e => handleChange('companySize', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500">
                  <option value="">Select Size</option>
                  <option value="Small (1-50 employees)">Small (1-50 employees)</option>
                  <option value="Medium (51-200 employees)">Medium (51-200 employees)</option>
                  <option value="Large (201+ employees)">Large (201+ employees)</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Business Type</label>
                <select value={formData.businessType} onChange={e => handleChange('businessType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500">
                  <option value="">Select Type</option>
                  <option value="Corporation">Corporation</option>
                  <option value="Partnership">Partnership</option>
                  <option value="Sole Proprietorship">Sole Proprietorship</option>
                  <option value="Cooperative">Cooperative</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Years in Operation</label>
                <input type="text" value={formData.yearsInOperation}
                  onChange={e => handleChange('yearsInOperation', e.target.value)}
                  placeholder="e.g., 5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">TIN Number</label>
                <input type="text" value={formData.tinNumber}
                  onChange={e => handleChange('tinNumber', e.target.value)}
                  placeholder="e.g., 123-456-789-000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500" />
              </div>
            </div>
          </div>
        );

      case 'contactPerson':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">CONTACT PERSON</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Full Name <span className="text-red-500">*</span></label>
                <input type="text" value={formData.contactPersonName}
                  onChange={e => handleChange('contactPersonName', e.target.value)}
                  placeholder="e.g., Maria Santos"
                  className={inputCls('contactPersonName')} />
                <ErrMsg k="contactPersonName" />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Position</label>
                <input type="text" value={formData.position}
                  onChange={e => handleChange('position', e.target.value)}
                  placeholder="e.g., HR Manager"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500" />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Contact Number <span className="text-red-500">*</span></label>
                <input type="tel" value={formData.contactNumber}
                  onChange={e => handleChange('contactNumber', e.target.value)}
                  placeholder="e.g., 09123456789"
                  className={inputCls('contactNumber')} />
                <ErrMsg k="contactNumber" />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Email Address</label>
                <input type="email" value={formData.email}
                  onChange={e => handleChange('email', e.target.value)}
                  placeholder="e.g., hr@company.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500" />
              </div>
            </div>
          </div>
        );

      case 'companyAddress':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">COMPANY ADDRESS</h3>
            <div className="grid grid-cols-2 gap-4">
              {([
                ['buildingNo', 'Building No.'],
                ['street', 'Street'],
                ['barangay', 'Barangay'],
                ['city', 'City/Municipality'],
                ['province', 'Province'],
                ['region', 'Region'],
              ] as [keyof EmployerFormData, string][]).map(([field, label]) => (
                <div key={field}>
                  <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">{label}</label>
                  <input type="text" value={formData[field] as string}
                    onChange={e => handleChange(field, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500" />
                </div>
              ))}
            </div>
          </div>
        );

      case 'registration':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">REGISTRATION DETAILS</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Status</label>
                <select value={formData.status} onChange={e => handleChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Date Registered</label>
                <input type="date" value={formData.dateRegistered}
                  onChange={e => handleChange('dateRegistered', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Remarks</label>
                <textarea value={formData.remarks} rows={3}
                  onChange={e => handleChange('remarks', e.target.value)}
                  placeholder="Additional notes or remarks"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500" />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-md flex">
        <div className="w-64 bg-[#F8F9FA] border-r border-gray-200 pt-[88px] px-6 pb-6 overflow-y-auto flex-shrink-0">
          <nav className="space-y-2">
            {sections.map(section => (
              <button key={section.id} onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors text-sm ${
                  activeSection === section.id ? 'bg-brand-blue text-white font-semibold' : 'text-gray-700 hover:bg-gray-200'
                }`}>
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Briefcase size={20} className="text-brand-blue" />
              <h3 className="text-gray-800 m-0 text-base font-medium">Add new employer</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={24} className="text-gray-600" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6">
            {renderSectionContent()}
          </div>

          <div className="border-t border-gray-200 px-8 py-4 flex justify-end gap-3">
            <button type="button" onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              Back to Employers List
            </button>
            <button type="button" onClick={handleNext}
              className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors">
              {isLastSection() ? 'Submit' : 'Next'}
            </button>
          </div>
        </div>
      </div>

      <ApplicantReviewModal
        isOpen={showConfirmation}
        title="Confirm Employer Details"
        message="Please review the information before saving. Are all details correct?"
        summaryContent={renderSummary()}
        onBackToEdit={() => setShowConfirmation(false)}
        onConfirm={handleConfirmSave}
      />

      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Success!</h3>
              <p className="text-gray-600 mb-6">Employer has been successfully added to the system.</p>
              <button onClick={() => { setShowSuccess(false); onClose(); }}
                className="px-8 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors">
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
