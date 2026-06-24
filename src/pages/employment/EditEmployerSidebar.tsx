import { useState } from 'react';
import { X, Briefcase, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import DatePicker from '../../components/DatePicker';

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

interface EditEmployerSidebarProps {
  initialData: EmployerFormData;
  onSave: (data: EmployerFormData) => void;
  onClose: () => void;
}

type Section = 'companyInfo' | 'contactPerson' | 'companyAddress' | 'jobOpenings' | 'registration';

function SaveConfirmModal({ isOpen, onConfirm, onCancel }: { isOpen: boolean; onConfirm: () => void; onCancel: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={36} className="text-brand-blue" />
          </div>
          <h3 className="text-xl text-gray-800 mb-2">Save Changes?</h3>
          <p className="text-gray-500 text-sm mb-6">Are you sure you want to save the changes made to this employer's information?</p>
          <div className="flex gap-3">
            <button onClick={onCancel}
              className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium">
              Cancel
            </button>
            <button onClick={onConfirm}
              className="flex-1 py-2.5 bg-brand-blue text-white rounded-xl hover:bg-brand-blue-dark transition-colors text-sm font-medium">
              Yes, Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SaveSuccessModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={36} className="text-green-500" />
          </div>
          <h3 className="text-xl text-gray-800 mb-2">Changes Saved!</h3>
          <p className="text-gray-500 text-sm mb-6">Employer information has been successfully updated.</p>
          <button onClick={onClose}
            className="w-full py-2.5 bg-brand-blue text-white rounded-xl hover:bg-brand-blue-dark transition-colors text-sm font-medium">
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EditEmployerSidebar({ initialData, onSave, onClose }: EditEmployerSidebarProps) {
  const [activeSection, setActiveSection] = useState<Section>('companyInfo');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState<EmployerFormData>({ ...initialData });

  const sections = [
    { id: 'companyInfo' as Section, label: 'Company information' },
    { id: 'contactPerson' as Section, label: 'Contact person' },
    { id: 'companyAddress' as Section, label: 'Company address' },
    { id: 'jobOpenings' as Section, label: 'Job openings' },
    { id: 'registration' as Section, label: 'Registration details' },
  ];

  const totalJobOpenings = formData.jobOpenings.reduce((sum, j) => sum + (parseInt(j.slots) || 0), 0);

  const handleChange = (field: keyof EmployerFormData, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleConfirmSave = () => {
    setShowConfirm(false);
    onSave(formData);
    setShowSuccess(true);
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'companyInfo':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">COMPANY INFORMATION</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Company Name</label>
                <input type="text" value={formData.companyName}
                  onChange={e => handleChange('companyName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500" />
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
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">TIN Number</label>
                <input type="text" value={formData.tinNumber}
                  onChange={e => handleChange('tinNumber', e.target.value)}
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
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Full Name</label>
                <input type="text" value={formData.contactPersonName}
                  onChange={e => handleChange('contactPersonName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500" />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Position</label>
                <input type="text" value={formData.position}
                  onChange={e => handleChange('position', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500" />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 text-xs font-semibold uppercase">Contact Number</label>
                <input type="tel" value={formData.contactNumber}
                  onChange={e => handleChange('contactNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none text-gray-900 placeholder:text-gray-500" />
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
            <button type="button" onClick={() => setShowConfirm(true)}
              className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors font-medium">
              Save Changes
            </button>
          </div>
        </div>
      </div>

      <SaveConfirmModal isOpen={showConfirm} onConfirm={handleConfirmSave} onCancel={() => setShowConfirm(false)} />
      <SaveSuccessModal isOpen={showSuccess} onClose={() => { setShowSuccess(false); onClose(); }} />
    </>
  );
}
