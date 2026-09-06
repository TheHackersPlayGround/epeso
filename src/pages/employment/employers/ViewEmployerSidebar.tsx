import { useState } from 'react';
import { X, Eye } from 'lucide-react';

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
  status: string;
  dateRegistered: string;
  remarks: string;
}

interface ViewEmployerSidebarProps {
  data: EmployerFormData;
  onClose: () => void;
}

type Section = 'companyInfo' | 'contactPerson' | 'companyAddress' | 'registration';

export default function ViewEmployerSidebar({ data, onClose }: ViewEmployerSidebarProps) {
  const [activeSection, setActiveSection] = useState<Section>('companyInfo');

  const sections = [
    { id: 'companyInfo' as Section, label: 'Company information' },
    { id: 'contactPerson' as Section, label: 'Contact person' },
    { id: 'companyAddress' as Section, label: 'Company address' },
    { id: 'registration' as Section, label: 'Registration details' },
  ];

  const ReadOnlyField = ({ label, value }: { label: string; value: string }) => (
    <div>
      <label className="block text-gray-700 mb-1 text-xs font-semibold uppercase">{label}</label>
      <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">
        {value || '-'}
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
                <ReadOnlyField label="Company Name" value={data.companyName} />
              </div>
              <ReadOnlyField label="Industry" value={data.industry === 'Other' ? `Other - ${data.industryOther}` : data.industry} />
              <ReadOnlyField label="Company Size" value={data.companySize} />
              <ReadOnlyField label="Business Type" value={data.businessType} />
              <ReadOnlyField label="Years in Operation" value={data.yearsInOperation} />
              <div className="col-span-2">
                <ReadOnlyField label="TIN Number" value={data.tinNumber} />
              </div>
            </div>
          </div>
        );

      case 'contactPerson':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">CONTACT PERSON</h3>
            <div className="grid grid-cols-2 gap-4">
              <ReadOnlyField label="Full Name" value={data.contactPersonName} />
              <ReadOnlyField label="Position" value={data.position} />
              <ReadOnlyField label="Contact Number" value={data.contactNumber} />
              <ReadOnlyField label="Email Address" value={data.email} />
            </div>
          </div>
        );

      case 'companyAddress':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">COMPANY ADDRESS</h3>
            <div className="grid grid-cols-2 gap-4">
              <ReadOnlyField label="Building No." value={data.buildingNo} />
              <ReadOnlyField label="Street" value={data.street} />
              <ReadOnlyField label="Barangay" value={data.barangay} />
              <ReadOnlyField label="City/Municipality" value={data.city} />
              <ReadOnlyField label="Province" value={data.province} />
              <ReadOnlyField label="Region" value={data.region} />
            </div>
          </div>
        );

      case 'registration':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">REGISTRATION DETAILS</h3>
            <div className="grid grid-cols-2 gap-4">
              <ReadOnlyField label="Status" value={data.status} />
              <ReadOnlyField label="Date Registered" value={data.dateRegistered} />
              {data.remarks && (
                <div className="col-span-2">
                  <label className="block text-gray-700 mb-1 text-xs font-semibold uppercase">Remarks</label>
                  <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">
                    {data.remarks}
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

  return (
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

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Eye size={20} className="text-brand-blue" />
            <h3 className="text-gray-800 m-0 text-base font-medium">View Employer Details</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {renderSectionContent()}
        </div>

        <div className="border-t border-gray-200 px-8 py-4 flex justify-end">
          <button type="button" onClick={onClose}
            className="px-8 py-2 text-white bg-brand-blue rounded-lg hover:bg-brand-blue-dark transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
