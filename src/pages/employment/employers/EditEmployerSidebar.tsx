import { useState, useRef } from 'react';
import { X, Briefcase, Plus } from 'lucide-react';
import ConfirmModal from '../../shared/ConfirmModal';
import DatePicker from '../../../components/DatePicker';
import SearchableSelect from '../../../components/SearchableSelect';
import { searchProvinces, searchCities, searchBarangaysByCity } from '../../../services/locationService';
import { useFieldValidation, NAME_REGEX, type ValidationError } from '../../../hooks/useFieldValidation';

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
  barangayId: number | null;
  city: string;
  cityId: number | null;
  province: string;
  provinceId: number | null;
  region: string;
  jobOpenings: Array<{ jobName: string; slots: string }>;
  status: string;
  dateRegistered: string;
  remarks: string;
}

interface EditEmployerSidebarProps {
  initialData: Omit<EmployerFormData, 'barangayId' | 'cityId' | 'provinceId'> & { barangayId?: number | null; cityId?: number | null; provinceId?: number | null };
  onSave: (data: EmployerFormData) => void;
  onClose: () => void;
}

type Section = 'companyInfo' | 'contactPerson' | 'companyAddress' | 'jobOpenings' | 'registration';

export default function EditEmployerSidebar({ initialData, onSave, onClose }: EditEmployerSidebarProps) {
  const [activeSection, setActiveSection] = useState<Section>('companyInfo');
  const [saveConfirm, setSaveConfirm] = useState(false);
  const [formData, setFormData] = useState<EmployerFormData>({
    ...initialData,
    barangayId: initialData.barangayId ?? null,
    cityId: initialData.cityId ?? null,
    provinceId: initialData.provinceId ?? null,
  });

  const sections = [
    { id: 'companyInfo' as Section, label: 'Company information' },
    { id: 'contactPerson' as Section, label: 'Contact person' },
    { id: 'companyAddress' as Section, label: 'Company address' },
    { id: 'jobOpenings' as Section, label: 'Job openings' },
    { id: 'registration' as Section, label: 'Registration details' },
  ];

  const totalJobOpenings = formData.jobOpenings.reduce((sum, j) => sum + (parseInt(j.slots) || 0), 0);

  const { fieldErrors, clearFieldError, errCls, fieldMessage, runValidation } = useFieldValidation();

  const companyNameRef = useRef<HTMLInputElement>(null);
  const tinNumberRef = useRef<HTMLInputElement>(null);
  const contactPersonNameRef = useRef<HTMLInputElement>(null);
  const contactNumberRef = useRef<HTMLInputElement>(null);
  const streetRef = useRef<HTMLInputElement>(null);
  const provinceWrapRef = useRef<HTMLDivElement>(null);
  const cityWrapRef = useRef<HTMLDivElement>(null);
  const barangayWrapRef = useRef<HTMLDivElement>(null);

  const SECTION_OF: Partial<Record<keyof EmployerFormData, Section>> = {
    companyName: 'companyInfo',
    tinNumber: 'companyInfo',
    contactPersonName: 'contactPerson',
    contactNumber: 'contactPerson',
    street: 'companyAddress',
    province: 'companyAddress',
    city: 'companyAddress',
    barangay: 'companyAddress',
  };

  // Deferred one tick so that a section switch (which may need to happen
  // first when the failing field lives on a different tab) has re-rendered
  // before we try to focus/scroll to the field.
  const deferFocus = (fn: () => void) => () => setTimeout(fn, 0);

  function inputCls(base: string, key: keyof EmployerFormData) {
    return `${base} ${errCls(key)}`;
  }

  function ErrMsg({ k }: { k: keyof EmployerFormData }) {
    return fieldMessage(k) ? <p className="text-red-500 text-xs mt-1">{fieldMessage(k)}</p> : null;
  }

  function buildValidationErrors(): ValidationError[] {
    const errors: ValidationError[] = [];
    const contactPersonName = formData.contactPersonName.trim();

    if (!formData.companyName.trim()) {
      errors.push({ field: 'companyName', message: 'Company Name is required.', focus: deferFocus(() => companyNameRef.current?.focus()) });
    }
    if (!formData.tinNumber.trim()) {
      errors.push({ field: 'tinNumber', message: 'TIN Number is required.', focus: deferFocus(() => tinNumberRef.current?.focus()) });
    }
    if (!contactPersonName) {
      errors.push({ field: 'contactPersonName', message: 'Full Name is required.', focus: deferFocus(() => contactPersonNameRef.current?.focus()) });
    } else if (!NAME_REGEX.test(contactPersonName)) {
      errors.push({ field: 'contactPersonName', message: 'Full Name must contain letters only (no numbers or symbols).', focus: deferFocus(() => contactPersonNameRef.current?.focus()) });
    }
    if (!formData.contactNumber.trim()) {
      errors.push({ field: 'contactNumber', message: 'Contact Number is required.', focus: deferFocus(() => contactNumberRef.current?.focus()) });
    }
    if (!formData.street.trim()) {
      errors.push({ field: 'street', message: 'Street is required.', focus: deferFocus(() => streetRef.current?.focus()) });
    }
    if (!formData.province.trim()) {
      errors.push({ field: 'province', message: 'Province is required.', focus: deferFocus(() => provinceWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })) });
    }
    if (!formData.city.trim()) {
      errors.push({ field: 'city', message: 'City/Municipality is required.', focus: deferFocus(() => cityWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })) });
    }
    if (!formData.barangay.trim()) {
      errors.push({ field: 'barangay', message: 'Barangay is required.', focus: deferFocus(() => barangayWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })) });
    }
    return errors;
  }

  const handleChange = (field: keyof EmployerFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    clearFieldError(field);
  };

  const handleSave = async () => {
    const errors = buildValidationErrors();
    if (errors.length > 0) {
      const firstSection = SECTION_OF[errors[0].field as keyof EmployerFormData] ?? 'companyInfo';
      setActiveSection(firstSection);
      runValidation(errors);
      return;
    }

    setSaveConfirm(true);
  };

  const confirmSave = () => {
    setSaveConfirm(false);
    // The parent persists, closes this sidebar, and shows the success alert.
    onSave(formData);
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'companyInfo':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">COMPANY INFORMATION</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Company Name <span className="text-red-500">*</span></label>
                <input ref={companyNameRef} type="text" value={formData.companyName}
                  onChange={e => handleChange('companyName', e.target.value)}
                  className={inputCls('w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500 border-gray-300 focus:ring-brand-blue', 'companyName')} />
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">TIN Number <span className="text-red-500">*</span></label>
                <input ref={tinNumberRef} type="text" value={formData.tinNumber}
                  onChange={e => handleChange('tinNumber', e.target.value)}
                  className={inputCls('w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500 border-gray-300 focus:ring-brand-blue', 'tinNumber')} />
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
                  className={inputCls('w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500 border-gray-300 focus:ring-brand-blue', 'contactPersonName')} />
                <ErrMsg k="contactPersonName" />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Position</label>
                <input type="text" value={formData.position}
                  onChange={e => handleChange('position', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500" />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Contact Number <span className="text-red-500">*</span></label>
                <input ref={contactNumberRef} type="tel" value={formData.contactNumber}
                  onChange={e => handleChange('contactNumber', e.target.value)}
                  className={inputCls('w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500 border-gray-300 focus:ring-brand-blue', 'contactNumber')} />
                <ErrMsg k="contactNumber" />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Email Address</label>
                <input type="email" value={formData.email}
                  onChange={e => handleChange('email', e.target.value)}
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
                  className={inputCls('w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500 border-gray-300 focus:ring-brand-blue', 'street')} />
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

      case 'jobOpenings':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">JOB OPENINGS</h3>
            <div>
              <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase font-semibold">
                Number of Job Openings: {totalJobOpenings}
              </label>
              <p className="text-xs text-gray-500 mb-3">Automatically calculated from total available slots.</p>
            </div>
            <div>
              <label className="block text-gray-700 mb-3 text-sm font-semibold">Positions Available</label>
              <div className="border border-gray-300 rounded overflow-hidden">
                <div className="grid grid-cols-2 bg-gray-200 border-b border-gray-300">
                  <div className="px-4 py-2 font-bold text-xs">NAME OF JOB</div>
                  <div className="px-4 py-2 font-bold text-xs border-l border-gray-300">NUMBER OF AVAILABLE SLOTS</div>
                </div>
                {formData.jobOpenings.map((job, idx) => (
                  <div key={idx} className="grid grid-cols-2 border-b border-gray-300 last:border-b-0">
                    <div className="p-2">
                      <input type="text" value={job.jobName}
                        onChange={e => {
                          const jobs = [...formData.jobOpenings];
                          jobs[idx] = { ...jobs[idx], jobName: e.target.value };
                          setFormData(prev => ({ ...prev, jobOpenings: jobs }));
                        }}
                        placeholder="e.g., Customer Service Representative"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
                    </div>
                    <div className="p-2 border-l border-gray-300">
                      <input type="number" value={job.slots}
                        onChange={e => {
                          const jobs = [...formData.jobOpenings];
                          jobs[idx] = { ...jobs[idx], slots: e.target.value };
                          setFormData(prev => ({ ...prev, jobOpenings: jobs }));
                        }}
                        placeholder="e.g., 5"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
                    </div>
                  </div>
                ))}
              </div>
              <button type="button"
                onClick={() => setFormData(prev => ({ ...prev, jobOpenings: [...prev.jobOpenings, { jobName: '', slots: '' }] }))}
                className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded hover:bg-brand-blue-dark transition-colors text-sm mt-3">
                <Plus size={16} /> Add Row
              </button>
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
                <DatePicker value={formData.dateRegistered}
                  onChange={value => handleChange('dateRegistered', value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Remarks</label>
                <textarea value={formData.remarks} rows={3}
                  onChange={e => handleChange('remarks', e.target.value)}
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
              <div>
                <h3 className="text-gray-800 m-0 text-base font-medium">Edit Employer</h3>
                <p className="text-gray-500 text-xs mt-0.5">{initialData.companyName}</p>
              </div>
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
              Cancel
            </button>
            <button type="button" onClick={handleSave}
              className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors font-medium">
              Save Changes
            </button>
          </div>
        </div>
      </div>
      <ConfirmModal
        isOpen={saveConfirm} type="confirm" confirmVariant="brand"
        title="Save Changes?" message="Are you sure you want to save the changes made to this employer's information?"
        confirmText="Yes, Save" cancelText="Cancel"
        onConfirm={confirmSave} onCancel={() => setSaveConfirm(false)}
      />
    </>
  );
}
