import { useState, useRef } from 'react';
import { X, Briefcase } from 'lucide-react';
import DatePicker from '../../../components/DatePicker';
import SearchableSelect from '../../../components/SearchableSelect';
import { searchProvinces, searchCities, searchBarangaysByCity } from '../../../services/locationService';
import ApplicantReviewModal from '../shared/ApplicantReviewModal';
import ConfirmModal from '../../shared/ConfirmModal';
import { useFieldValidation, NAME_REGEX, type ValidationError } from '../../../hooks/useFieldValidation';
import { useFormDraft } from '../../../hooks/useFormDraft';
import { useEmployment } from '../../../contexts/EmploymentContext';
import { sanitizeContactNumber, isValidContactNumber, CONTACT_NUMBER_MESSAGE } from '../../../utils/contactNumber';
import { todayIso } from '../../../utils/formatDate';

interface EmployerFormData {
  companyName: string;
  industry: string;
  industryOther: string;
  businessType: string;
  tinNumber: string;
  contactPersonName: string;
  position: string;
  contactNumber: string;
  email: string;
  buildingNo: string;
  street: string;
  barangay: string;
  barangayId: number | null;
  city: string;
  cityId: number | null;
  province: string;
  provinceId: number | null;
  region: string;
  status: string;
  dateRegistered: string;
  remarks: string;
}

interface AddEmployerSidebarProps {
  onSave: (data: EmployerFormData) => void | Promise<void>;
  onClose: () => void;
}

type Section = 'companyInfo' | 'contactPerson' | 'companyAddress' | 'registration';

export default function AddEmployerSidebar({ onSave, onClose }: AddEmployerSidebarProps) {
  const [activeSection, setActiveSection] = useState<Section>('companyInfo');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [resultModal, setResultModal] = useState<{ isOpen: boolean; type: 'success' | 'error'; message: string }>({ isOpen: false, type: 'success', message: '' });
  const [formData, setFormData] = useState<EmployerFormData>({
    companyName: '',
    industry: '',
    industryOther: '',
    businessType: '',
    tinNumber: '',
    contactPersonName: '',
    position: '',
    contactNumber: '',
    email: '',
    buildingNo: '',
    street: '',
    barangay: '',
    barangayId: null,
    city: '',
    cityId: null,
    province: '',
    provinceId: null,
    region: '',
    status: 'Active',
    dateRegistered: new Date().toISOString().split('T')[0],
    remarks: '',
  });

  const { industryOptions } = useEmployment();

  const draft = useFormDraft<EmployerFormData>({
    draftKey: 'employment-employer', mode: 'add', snapshot: formData, onRestore: setFormData, onClose,
  });

  const sections = [
    { id: 'companyInfo' as Section, label: 'Company information' },
    { id: 'contactPerson' as Section, label: 'Contact person' },
    { id: 'companyAddress' as Section, label: 'Company address' },
    { id: 'registration' as Section, label: 'Registration details' },
  ];

  const handleChange = (field: keyof EmployerFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    clearFieldError(field);
  };

  const handleConfirmSave = async () => {
    setShowConfirmation(false);
    try {
      // onSave persists to the backend; await so success only shows on success.
      await draft.wrapSave(onSave)(formData);
      setResultModal({ isOpen: true, type: 'success', message: 'Employer has been successfully added to the system.' });
    } catch {
      setResultModal({ isOpen: true, type: 'error', message: 'Could not save the employer. Please try again.' });
    }
  };

  const { fieldErrors, clearFieldError, errCls, fieldMessage, runValidation } = useFieldValidation();

  const companyNameRef = useRef<HTMLInputElement>(null);
  const tinNumberRef = useRef<HTMLInputElement>(null);
  const contactPersonNameRef = useRef<HTMLInputElement>(null);
  const contactNumberRef = useRef<HTMLInputElement>(null);
  const streetRef = useRef<HTMLInputElement>(null);
  const provinceWrapRef = useRef<HTMLDivElement>(null);
  const cityWrapRef = useRef<HTMLDivElement>(null);
  const barangayWrapRef = useRef<HTMLDivElement>(null);
  const industryOtherRef = useRef<HTMLInputElement>(null);

  const SECTION_OF: Partial<Record<keyof EmployerFormData, Section>> = {
    companyName: 'companyInfo',
    tinNumber: 'companyInfo',
    contactPersonName: 'contactPerson',
    contactNumber: 'contactPerson',
    industryOther: 'companyInfo',
    street: 'companyAddress',
    province: 'companyAddress',
    city: 'companyAddress',
    barangay: 'companyAddress',
  };

  // Deferred one tick so a section switch has re-rendered before focusing the field.
  const deferFocus = (fn: () => void) => () => setTimeout(fn, 0);

  function inputCls(key: keyof EmployerFormData) {
    return `w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500 transition-colors border-gray-300 focus:ring-brand-blue ${errCls(key)}`;
  }

  function ErrMsg({ k }: { k: keyof EmployerFormData }) {
    return fieldMessage(k) ? <p className="text-red-500 text-xs mt-1">{fieldMessage(k)}</p> : null;
  }

  function buildValidationErrors(scope?: Section): ValidationError[] {
    const errors: ValidationError[] = [];
    const contactPersonName = formData.contactPersonName.trim();

    const inScope = (key: keyof EmployerFormData) => !scope || SECTION_OF[key] === scope;

    if (inScope('companyName') && !formData.companyName.trim()) {
      errors.push({ field: 'companyName', message: 'Company Name is required.', focus: deferFocus(() => companyNameRef.current?.focus()) });
    }
    if (inScope('industryOther') && formData.industry === 'Other' && !formData.industryOther.trim()) {
      errors.push({ field: 'industryOther', message: 'Please specify the industry.', focus: deferFocus(() => industryOtherRef.current?.focus()) });
    }
    if (inScope('tinNumber') && !formData.tinNumber.trim()) {
      errors.push({ field: 'tinNumber', message: 'TIN Number is required.', focus: deferFocus(() => tinNumberRef.current?.focus()) });
    }
    if (inScope('contactPersonName')) {
      if (!contactPersonName) {
        errors.push({ field: 'contactPersonName', message: 'Full Name is required.', focus: deferFocus(() => contactPersonNameRef.current?.focus()) });
      } else if (!NAME_REGEX.test(contactPersonName)) {
        errors.push({ field: 'contactPersonName', message: 'Full Name must contain letters only (no numbers or symbols).', focus: deferFocus(() => contactPersonNameRef.current?.focus()) });
      }
    }
    if (inScope('contactNumber') && !formData.contactNumber.trim()) {
      errors.push({ field: 'contactNumber', message: 'Contact Number is required.', focus: deferFocus(() => contactNumberRef.current?.focus()) });
    } else if (inScope('contactNumber') && !isValidContactNumber(formData.contactNumber)) {
      errors.push({ field: 'contactNumber', message: CONTACT_NUMBER_MESSAGE, focus: deferFocus(() => contactNumberRef.current?.focus()) });
    }
    if (inScope('street') && !formData.street.trim()) {
      errors.push({ field: 'street', message: 'Street is required.', focus: deferFocus(() => streetRef.current?.focus()) });
    }
    if (inScope('province') && !formData.province.trim()) {
      errors.push({ field: 'province', message: 'Province is required.', focus: deferFocus(() => provinceWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })) });
    }
    if (inScope('city') && !formData.city.trim()) {
      errors.push({ field: 'city', message: 'City/Municipality is required.', focus: deferFocus(() => cityWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })) });
    }
    if (inScope('barangay') && !formData.barangay.trim()) {
      errors.push({ field: 'barangay', message: 'Barangay is required.', focus: deferFocus(() => barangayWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })) });
    }
    return errors;
  }

  const handleNext = () => {
    const currentIndex = sections.findIndex(s => s.id === activeSection);
    const isLast = currentIndex === sections.length - 1;
    if (isLast) {
      const errors = buildValidationErrors();
      if (errors.length > 0) {
        const firstSection = SECTION_OF[errors[0].field as keyof EmployerFormData] ?? 'companyInfo';
        setActiveSection(firstSection);
        runValidation(errors);
        return;
      }
      setShowConfirmation(true);
    } else {
      const errors = buildValidationErrors(activeSection);
      if (errors.length > 0) {
        runValidation(errors);
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
          <div><span className="font-semibold">Business Type:</span> {formData.businessType}</div>
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
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Company Name <span className="text-red-500">*</span></label>
                <input ref={companyNameRef} type="text" value={formData.companyName}
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
                  {[...industryOptions.standard, 'Other'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              {formData.industry === 'Other' && (
                <div className="col-span-2">
                  <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Please specify industry</label>
                  <input ref={industryOtherRef} type="text" value={formData.industryOther}
                    onChange={e => handleChange('industryOther', e.target.value)}
                    placeholder="e.g., Mining, Logistics..."
                    className={inputCls('industryOther')} />
                  <ErrMsg k="industryOther" />
                </div>
              )}
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
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">TIN Number <span className="text-red-500">*</span></label>
                <input ref={tinNumberRef} type="text" value={formData.tinNumber}
                  onChange={e => handleChange('tinNumber', e.target.value)}
                  placeholder="e.g., 123-456-789-000"
                  className={inputCls('tinNumber')} />
                <ErrMsg k="tinNumber" />
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
                <input ref={contactPersonNameRef} type="text" value={formData.contactPersonName}
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
                <input ref={contactNumberRef} type="tel" value={formData.contactNumber}
                  onChange={e => handleChange('contactNumber', sanitizeContactNumber(e.target.value))}
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
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Building No.</label>
                <input type="text" value={formData.buildingNo}
                  onChange={e => handleChange('buildingNo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500" />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Street <span className="text-red-500">*</span></label>
                <input ref={streetRef} type="text" value={formData.street}
                  onChange={e => handleChange('street', e.target.value)}
                  className={inputCls('street')} />
                <ErrMsg k="street" />
              </div>
              {/* Cascade: Province -> City/Municipality -> Barangay */}
              <div ref={provinceWrapRef}>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Province <span className="text-red-500">*</span></label>
                <SearchableSelect
                  value={formData.province}
                  placeholder="Search province…"
                  hasError={!!fieldErrors.province}
                  fetchOptions={s => searchProvinces(s)}
                  onSelect={opt => {
                    setFormData(prev => ({ ...prev, province: opt.name, provinceId: opt.id, city: '', cityId: null, barangay: '', barangayId: null }));
                    clearFieldError('province');
                  }}
                />
                <ErrMsg k="province" />
              </div>
              <div ref={cityWrapRef}>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">City/Municipality <span className="text-red-500">*</span></label>
                <SearchableSelect
                  value={formData.city}
                  placeholder={formData.provinceId ? 'Search city/municipality…' : 'Select province first'}
                  disabled={!formData.provinceId}
                  hasError={!!fieldErrors.city}
                  refetchKey={formData.provinceId ?? ''}
                  fetchOptions={s => searchCities(formData.provinceId ?? 0, s)}
                  onSelect={opt => {
                    setFormData(prev => ({ ...prev, city: opt.name, cityId: opt.id, barangay: '', barangayId: null }));
                    clearFieldError('city');
                  }}
                />
                <ErrMsg k="city" />
              </div>
              <div className="col-span-2" ref={barangayWrapRef}>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Barangay <span className="text-red-500">*</span></label>
                <SearchableSelect
                  value={formData.barangay}
                  placeholder={formData.cityId ? 'Search barangay…' : 'Select city first'}
                  disabled={!formData.cityId}
                  hasError={!!fieldErrors.barangay}
                  refetchKey={formData.cityId ?? ''}
                  fetchOptions={s => searchBarangaysByCity(formData.cityId ?? 0, s)}
                  onSelect={opt => { setFormData(prev => ({ ...prev, barangay: opt.name, barangayId: opt.id })); clearFieldError('barangay'); }}
                />
                <ErrMsg k="barangay" />
              </div>
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
                {/* New employers always start Active; the status can be changed later via Edit. */}
                <select value={formData.status} disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-500 cursor-not-allowed outline-none">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Date Registered</label>
                <DatePicker max={todayIso()} value={formData.dateRegistered}
                  onChange={value => handleChange('dateRegistered', value)}
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
            <button onClick={draft.requestClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={24} className="text-gray-600" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6">
            {renderSectionContent()}
          </div>

          <div className="border-t border-gray-200 px-8 py-4 flex justify-end gap-3">
            <button type="button" onClick={draft.requestClose}
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
      <ConfirmModal
        isOpen={resultModal.isOpen} type={resultModal.type}
        title={resultModal.type === 'success' ? 'Success!' : 'Save failed'} message={resultModal.message}
        confirmText="OK"
        onConfirm={() => { setResultModal(prev => ({ ...prev, isOpen: false })); if (resultModal.type === 'success') onClose(); }}
        onCancel={() => { setResultModal(prev => ({ ...prev, isOpen: false })); if (resultModal.type === 'success') onClose(); }}
      />
      {draft.modals}

    </>
  );
}
