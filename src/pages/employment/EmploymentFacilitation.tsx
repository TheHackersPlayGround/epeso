import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, X, ChevronDown } from "lucide-react";
import * as XLSX from "xlsx";
import type { Applicant } from "./ApplicantsTab";
import { ITEMS_PER_PAGE } from "./ApplicantsTab";
import { SEED } from "../../contexts/EmploymentContext";
import ApplicantsTab from "./ApplicantsTab";
import VacanciesTab from "./VacanciesTab";
import ReferralsTab from "./ReferralsTab";
import PlacementsTab from "./PlacementsTab";
import EmployersTab from "./EmployersTab";
import AddApplicantSidebar from "./AddApplicantSidebar";
import type { ApplicantFormData } from "./AddApplicantSidebar";
import ResumeMaker, { type ApplicantData } from "./ResumeMaker";
import ViewApplicantSidebar from "./ViewApplicantSidebar";

const LS_KEY = "ef_applicants";

function loadApplicants(): Applicant[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Applicant[]) : SEED;
  } catch {
    return SEED;
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type EmploymentFacilitationProps = {
  onBack: () => void;
};

type TabType = "applicants" | "vacancies" | "referrals" | "placements" | "employers";

const TABS: { id: TabType; label: string }[] = [
  { id: "applicants", label: "Applicants" },
  { id: "vacancies", label: "Vacancies" },
  { id: "referrals", label: "Referrals" },
  { id: "placements", label: "Placements" },
  { id: "employers", label: "Employers" },
];


// ─── Refer applicant slide-over panel ─────────────────────────────────────────

type ReferApplicantPanelProps = {
  applicant: Applicant;
  onClose: () => void;
};

function loadVacanciesForRefer(): Array<{ id: number; jobTitle: string; employer: string; vacanciesCount: number }> {
  try {
    const raw = localStorage.getItem('ef_vacancies')
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function ReferApplicantPanel({ applicant, onClose }: ReferApplicantPanelProps) {
  const vacancies = loadVacanciesForRefer().filter(v => (v as any).status !== 'Closed')
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<{ id: number; label: string } | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [referred, setReferred] = useState(false)

  const filtered = vacancies.filter(v =>
    `${v.jobTitle} ${v.employer}`.toLowerCase().includes(search.toLowerCase())
  )

  function handleSelect(v: typeof vacancies[number]) {
    setSelected({ id: v.id, label: `${v.jobTitle} – ${v.employer} (${v.vacanciesCount} slots)` })
    setSearch("")
    setIsOpen(false)
  }

  function handleConfirm() {
    if (!selected) return
    setReferred(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <p className="text-xl font-bold text-gray-900">Refer Applicant to Job Vacancy</p>
            <p className="text-sm text-gray-500 mt-0.5">Applicant: {applicant.name}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-6">
          {referred ? (
            <div className="flex flex-col items-center gap-4 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-800">Referral Submitted</p>
              <p className="text-sm text-gray-500">{applicant.name} has been referred to the selected vacancy.</p>
              <button onClick={onClose} className="mt-2 px-6 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark transition-colors">
                Done
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Select Job Vacancy <span className="text-red-500">*</span>
                </label>

                <div className="relative">
                  {isOpen && (
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                  )}
                  <div
                    className={`flex items-center border rounded-lg px-3 py-2.5 gap-2 cursor-text ${isOpen ? 'border-brand-blue ring-2 ring-brand-blue/20' : 'border-brand-blue'}`}
                    onClick={() => setIsOpen(true)}
                  >
                    <input
                      type="text"
                      value={isOpen ? search : (selected?.label ?? '')}
                      onChange={e => { setSearch(e.target.value); setIsOpen(true) }}
                      onFocus={() => setIsOpen(true)}
                      placeholder="Select a vacancy..."
                      className="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder:text-gray-400"
                    />
                    <ChevronDown size={16} className={`text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {isOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-52 overflow-y-auto">
                      {filtered.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-gray-400">No vacancies found</p>
                      ) : (
                        filtered.map(v => (
                          <button key={v.id} type="button"
                            onClick={() => handleSelect(v)}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-brand-blue transition-colors border-b border-gray-100 last:border-b-0">
                            <span className="font-medium">{v.jobTitle}</span>
                            <span className="text-gray-400"> – {v.employer} ({v.vacanciesCount} slots)</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium">
                  Cancel
                </button>
                <button type="button" onClick={handleConfirm} disabled={!selected}
                  className="flex-1 py-2.5 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                  Confirm Referral
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Import modal ──────────────────────────────────────────────────────────────

function ImportModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Import Applicants</h3>
          <button onClick={onClose} aria-label="Close import modal" className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
        </div>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400 hover:border-brand-blue transition-colors cursor-pointer">
          <p className="text-3xl mb-2">📂</p>
          <p className="text-sm font-medium text-gray-600">Click to upload or drag & drop</p>
          <p className="text-xs mt-1">Excel (.xlsx) or CSV files</p>
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center">
          Download the{" "}
          <span className="text-brand-blue cursor-pointer hover:underline">template file</span>{" "}
          to ensure correct column format.
        </p>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onClose} className="flex-1 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark transition-colors">Import</button>
        </div>
      </div>
    </div>
  );
}

// ─── Applicant data mapper ─────────────────────────────────────────────────────

function toApplicantData(a: Applicant): ApplicantData {
  const fd = (a.fullFormData ?? {}) as Record<string, unknown>;
  return {
    id: a.id,
    surname:      (fd.surname      as string) ?? '',
    firstName:    (fd.firstName    as string) ?? a.name,
    middleName:   (fd.middleName   as string) ?? '',
    suffix:       (fd.suffix       as string) ?? '',
    dateOfBirth:  (fd.dateOfBirth  as string) ?? '',
    sex:          (fd.sex          as string) ?? a.gender,
    religion:     (fd.religion     as string) ?? '',
    civilStatus:  (fd.civilStatus  as string) ?? (a.civilStatus ?? ''),
    height:       (fd.height       as string) ?? '',
    houseNo:      (fd.houseNo      as string) ?? '',
    barangay:     (fd.barangay     as string) ?? '',
    municipality: (fd.municipality as string) ?? '',
    province:     (fd.province     as string) ?? '',
    hasDisability:      (fd.hasDisability      as string[]) ?? [],
    disabilityOther:    (fd.disabilityOther    as string)   ?? '',
    tin:          (fd.tin          as string) ?? '',
    contactNumber:(fd.contactNumber as string) ?? a.contactNumber,
    email:        (fd.email        as string) ?? a.email,
    isOFW:        (fd.isOFW        as string) ?? '',
    ofwCountry:   (fd.ofwCountry   as string) ?? '',
    isFormerOFW:  (fd.isFormerOFW  as string) ?? '',
    formerOFWCountry:    (fd.formerOFWCountry    as string) ?? '',
    formerOFWReturnDate: (fd.formerOFWReturnDate as string) ?? '',
    is4PsBeneficiary:    (fd.is4PsBeneficiary    as string) ?? '',
    householdIdNo:(fd.householdIdNo as string) ?? '',
    jobPrefEmploymentType: (fd.jobPrefEmploymentType as string[]) ?? [],
    jobPrefWorkLocation:   (fd.jobPrefWorkLocation   as string[]) ?? [],
    jobPreferences:   (fd.jobPreferences   as ApplicantData['jobPreferences'])   ?? [],
    languages:        (fd.languages        as ApplicantData['languages'])        ?? [],
    currentlyInSchool:(fd.currentlyInSchool as string) ?? '',
    elementary:   (fd.elementary   as ApplicantData['elementary'])   ?? { graduated: '', yearGraduated: '', levelReached: '', yearLastAttended: '' },
    secondary:    (fd.secondary    as ApplicantData['secondary'])    ?? { type: '', seniorHighStrand: '', graduated: '', yearGraduated: '', levelReached: '', yearLastAttended: '' },
    tertiary:     (fd.tertiary     as ApplicantData['tertiary'])     ?? { course: '', graduated: '', yearGraduated: '', levelReached: '', yearLastAttended: '' },
    graduateStudies:     (fd.graduateStudies     as ApplicantData['graduateStudies'])     ?? [],
    trainings:           (fd.trainings           as ApplicantData['trainings'])           ?? [],
    eligibilities:       (fd.eligibilities       as ApplicantData['eligibilities'])       ?? [],
    professionalLicenses:(fd.professionalLicenses as ApplicantData['professionalLicenses']) ?? [],
    workExperiences:     (fd.workExperiences     as ApplicantData['workExperiences'])     ?? [],
    otherSkills:         (fd.otherSkills         as string[]) ?? (a.skills ? a.skills.split(', ') : []),
    otherSkillsSpecify:  (fd.otherSkillsSpecify  as string[]) ?? [],
    referredProgram: (fd.referredProgram as string) ?? '',
    cdspPrograms:    (fd.cdspPrograms    as string[]) ?? [],
    projectIdNumber: (fd.projectIdNumber as string) ?? '',
    projectLocation: (fd.projectLocation as string) ?? '',
    projectRegion:   (fd.projectRegion   as string) ?? '',
    projectCity:     (fd.projectCity     as string) ?? '',
    projectDetails:  (fd.projectDetails  as ApplicantData['projectDetails']) ?? { type: [], programComponent: [], wayOfImplementation: [], nameOfProject: '' },
    pagIbigNo:    (fd.pagIbigNo    as string) ?? '',
    philHealthNo: (fd.philHealthNo as string) ?? '',
    sssNo:        (fd.sssNo        as string) ?? '',
    otherProgramName: (fd.otherProgramName as string) ?? '',
    otherProgramNo:   (fd.otherProgramNo   as string) ?? '',
    profileImage:     (fd.profileImage     as string | undefined),
  };
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function EmploymentFacilitation({ onBack }: EmploymentFacilitationProps) {
  // ── Applicant state (source of truth, persisted to localStorage) ──
  const [applicants, setApplicants] = useState<Applicant[]>(loadApplicants);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(applicants));
    } catch {
      console.warn('localStorage quota exceeded — applicant data (including photos) could not be saved.');
    }
  }, [applicants]);

  // ── Search / filter / pagination state ────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // ── Derived data ──────────────────────────────────────────────────
  const filteredApplicants = useMemo(() => {
    let result = applicants;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.skills.toLowerCase().includes(query) ||
          a.address.toLowerCase().includes(query) ||
          a.education.toLowerCase().includes(query),
      );
    }

    for (const filterId of activeFilters) {
      const value = filterValues[filterId];
      if (!value) continue;
      switch (filterId) {
        case "disability":
          result = result.filter((a) => value === "Yes" ? a.hasDisability : !a.hasDisability);
          break;
        case "civilStatus":
          result = result.filter((a) => a.civilStatus === value);
          break;
        case "sex":
          result = result.filter((a) => a.gender === value);
          break;
        case "ofw":
          result = result.filter((a) => {
            if (value === "Active OFW") return a.isOFW;
            if (value === "Former OFW") return a.isFormerOFW;
            return !a.isOFW && !a.isFormerOFW;
          });
          break;
        case "4ps":
          result = result.filter((a) => value === "Yes" ? a.is4PsBeneficiary : !a.is4PsBeneficiary);
          break;
        case "educationalLevel":
          result = result.filter((a) => a.education === value);
          break;
        case "employmentStatus":
          result = result.filter((a) => a.employmentStatus === value);
          break;
        case "language":
          result = result.filter((a) => a.language === value);
          break;
        case "skills":
          result = result.filter((a) => a.skills.toLowerCase().includes(value.toLowerCase()));
          break;
        case "jobPreference":
          result = result.filter((a) => a.jobPreference === value);
          break;
      }
    }

    return result;
  }, [applicants, searchQuery, activeFilters, filterValues]);

  const isFiltered = searchQuery.trim().length > 0 || activeFilters.some((f) => filterValues[f]);

  const paginatedApplicants = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredApplicants.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredApplicants, currentPage]);

  // ── Modal states ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabType>("applicants");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingApplicant, setEditingApplicant] = useState<Applicant | null>(null);
  const [viewingApplicant, setViewingApplicant] = useState<Applicant | null>(null);
  const [referringApplicant, setReferringApplicant] = useState<Applicant | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isResumeMakerOpen, setIsResumeMakerOpen] = useState(false);

  // ── CRUD handlers ─────────────────────────────────────────────────
  function handleSaveApplicant(formData: ApplicantFormData) {
    const mapped: Omit<Applicant, "id"> = {
      name: [formData.surname, formData.firstName, formData.middleName].filter(Boolean).join(", "),
      gender: formData.sex,
      age: formData.dateOfBirth
        ? new Date().getFullYear() - new Date(formData.dateOfBirth).getFullYear()
        : 0,
      education: formData.tertiary.course
        ? `${formData.tertiary.course} (Tertiary)`
        : formData.secondary.graduated
          ? "Senior High School Graduate"
          : formData.elementary.graduated
            ? "Elementary Graduate"
            : "",
      skills: formData.otherSkills.join(", "),
      employmentStatus: "Unemployed",
      contactNumber: formData.contactNumber,
      email: formData.email,
      address: [formData.barangay, formData.municipality, formData.province].filter(Boolean).join(", "),
      civilStatus: formData.civilStatus,
      hasDisability: formData.hasDisability.length > 0,
      is4PsBeneficiary: formData.is4PsBeneficiary === "Yes",
      isOFW: formData.isOFW === "Yes",
      isFormerOFW: formData.isFormerOFW === "Yes",
      jobPreference: formData.jobPreferences[0]?.occupation ?? "",
      language: formData.languages.find((l) => l.speak)?.language ?? "",
      fullFormData: formData as unknown as Record<string, unknown>,
    };

    if (editingApplicant) {
      setApplicants((prev) =>
        prev.map((a) => (a.id === editingApplicant.id ? { id: a.id, ...mapped } : a)),
      );
      setEditingApplicant(null);
    } else {
      const newId = Math.max(0, ...applicants.map((a) => a.id)) + 1;
      setApplicants((prev) => [...prev, { id: newId, ...mapped }]);
      setIsAddModalOpen(false);
    }
  }

  function handleCloseSidebar() {
    setIsAddModalOpen(false);
    setEditingApplicant(null);
  }

  // ── Search / filter / pagination handlers ─────────────────────────
  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setCurrentPage(1);
  }

  function handleAddFilter(filterId: string) {
    setActiveFilters((prev) => [...prev, filterId]);
    setIsFilterDropdownOpen(false);
    setCurrentPage(1);
  }

  function handleRemoveFilter(filterId: string) {
    setActiveFilters((prev) => prev.filter((f) => f !== filterId));
    setFilterValues((prev) => {
      const next = { ...prev };
      delete next[filterId];
      return next;
    });
    setCurrentPage(1);
  }

  function handleFilterValueChange(filterId: string, value: string) {
    setFilterValues((prev) => ({ ...prev, [filterId]: value }));
    setCurrentPage(1);
  }

  // ── Export handlers ───────────────────────────────────────────────
  function buildExportRows() {
    return filteredApplicants.map((a) => ({
      Name: a.name, Age: a.age, Sex: a.gender,
      "Educational Background": a.education, Skills: a.skills,
      "Employment Status": a.employmentStatus, "Contact Number": a.contactNumber,
      Email: a.email, Address: a.address, "Civil Status": a.civilStatus ?? "",
      "Has Disability": a.hasDisability ? "Yes" : "No",
      OFW: a.isOFW ? "Active OFW" : a.isFormerOFW ? "Former OFW" : "Not OFW",
      "4Ps Beneficiary": a.is4PsBeneficiary ? "Yes" : "No",
      "Job Preference": a.jobPreference ?? "", Language: a.language ?? "",
    }));
  }

  function handleExportExcel() {
    const ws = XLSX.utils.json_to_sheet(buildExportRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Applicants");
    XLSX.writeFile(wb, "applicants.xlsx");
    setIsExportDropdownOpen(false);
  }

  function handleExportCsv() {
    const ws = XLSX.utils.json_to_sheet(buildExportRows());
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "applicants.csv";
    link.click();
    URL.revokeObjectURL(url);
    setIsExportDropdownOpen(false);
  }

  if (isResumeMakerOpen) {
    return (
      <ResumeMaker
        applicants={applicants.map(toApplicantData)}
        onBack={() => setIsResumeMakerOpen(false)}
      />
    );
  }

  // ── Tab layout ────────────────────────────────────────────────────
  return (
    <div className="min-h-full flex flex-col bg-brand-bg">
      {/* Title row */}
      <div className="px-8 pt-7 pb-5 flex items-center gap-4">
        <button onClick={onBack} aria-label="Back to dashboard" className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><ArrowLeft size={24} /></button>
        <p className="text-2xl font-bold text-gray-800 m-0 p-0 leading-tight">
          Employment Facilitation
        </p>
      </div>

      {/* Tabs card */}
      <div className="px-7.5 pb-2">
        <div className="bg-white rounded-xl shadow-sm px-6">
          <nav role="tablist" aria-label="Employment Facilitation tabs" className="flex gap-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-base font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-brand-blue text-brand-blue"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab content */}
      <div className="p-6">
        {activeTab === "applicants" && (
          (isAddModalOpen || editingApplicant) ? (
            <AddApplicantSidebar
              onClose={handleCloseSidebar}
              onSave={handleSaveApplicant}
              initialData={editingApplicant?.fullFormData as ApplicantFormData | undefined}
              isEditMode={!!editingApplicant}
            />
          ) : viewingApplicant ? (
            <ViewApplicantSidebar
              applicant={viewingApplicant}
              onClose={() => setViewingApplicant(null)}
            />
          ) : (
            <ApplicantsTab
              paginatedApplicants={paginatedApplicants}
              filteredCount={filteredApplicants.length}
              activeFilters={activeFilters}
              filterValues={filterValues}
              searchQuery={searchQuery}
              currentPage={currentPage}
              isFilterDropdownOpen={isFilterDropdownOpen}
              isExportDropdownOpen={isExportDropdownOpen}
              isFiltered={isFiltered}
              onAddApplicant={() => setIsAddModalOpen(true)}
              onEditApplicant={setEditingApplicant}
              onViewApplicant={setViewingApplicant}
              onReferApplicant={setReferringApplicant}
              onImportClick={() => setIsImportModalOpen(true)}
              onShowResumeMaker={() => setIsResumeMakerOpen(true)}
              onSearchChange={handleSearchChange}
              onToggleFilterDropdown={() => setIsFilterDropdownOpen((p) => !p)}
              onCloseFilterDropdown={() => setIsFilterDropdownOpen(false)}
              onAddFilter={handleAddFilter}
              onRemoveFilter={handleRemoveFilter}
              onFilterValueChange={handleFilterValueChange}
              onToggleExportDropdown={() => setIsExportDropdownOpen((p) => !p)}
              onCloseExportDropdown={() => setIsExportDropdownOpen(false)}
              onExportExcel={handleExportExcel}
              onExportCsv={handleExportCsv}
              onPageChange={setCurrentPage}
            />
          )
        )}
        {activeTab === "vacancies" && <VacanciesTab />}
        {activeTab === "referrals" && <ReferralsTab />}
        {activeTab === "placements" && <PlacementsTab />}
        {activeTab === "employers" && <EmployersTab />}
      </div>

      {/* Overlay panels */}
      {referringApplicant && (
        <ReferApplicantPanel applicant={referringApplicant} onClose={() => setReferringApplicant(null)} />
      )}
      {isImportModalOpen && <ImportModal onClose={() => setIsImportModalOpen(false)} />}
    </div>
  );
}
