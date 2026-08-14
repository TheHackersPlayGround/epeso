import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, X, ChevronDown } from "lucide-react";
import * as XLSX from "xlsx";
import { downloadImportTemplate, importApplicants, type ImportResult } from "./applicants/applicantImport";
import type { Applicant } from "./applicants/ApplicantsTab";
import { ITEMS_PER_PAGE } from "./applicants/ApplicantsTab";
import { listApplicants, createApplicant, updateApplicant, deleteApplicant } from "../../services/applicantService";
import { listVacancies } from "../../services/vacancyService";
import { createReferral } from "../../services/referralService";
import { useReferralGuard } from "../../utils/referralGuard";
import ConfirmModal from "../shared/ConfirmModal";
import ApplicantsTab from "./applicants/ApplicantsTab";
import VacanciesTab from "./VacanciesTab";
import ReferralsTab from "./ReferralsTab";
import PlacementsTab from "./PlacementsTab";
import EmployersTab from "./employers/EmployersTab";
import AddApplicantSidebar from "./applicants/AddApplicantSidebar";
import type { ApplicantFormData } from "./applicants/AddApplicantSidebar";
import ResumeMaker, { type ApplicantData } from "./applicants/ResumeMaker";
import ViewApplicantSidebar from "./applicants/ViewApplicantSidebar";
import EmploymentHistoryPanel from "./applicants/EmploymentHistoryPanel";

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

type VacancyOption = { id: number; jobTitle: string; employer: string; vacanciesCount: number }

function ReferApplicantPanel({ applicant, onClose }: ReferApplicantPanelProps) {
  const [vacancies, setVacancies] = useState<VacancyOption[]>([])
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<{ id: number; label: string } | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [referred, setReferred] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const { confirmReferralOk, referralGuardModal } = useReferralGuard()

  useEffect(() => {
    listVacancies().then(all => {
      setVacancies(all.filter(v => v.status === 'Open').map(v => ({
        id: v.id,
        jobTitle: v.jobTitle,
        employer: v.employer,
        vacanciesCount: v.vacanciesCount,
      })))
    }).catch(() => { /* vacancies unavailable — leave empty */ })
  }, [])

  const filtered = vacancies.filter(v =>
    `${v.jobTitle} ${v.employer}`.toLowerCase().includes(search.toLowerCase())
  )

  function handleSelect(v: VacancyOption) {
    setSelected({ id: v.id, label: `${v.jobTitle} – ${v.employer} (${v.vacanciesCount} slots)` })
    setSearch("")
    setIsOpen(false)
  }

  async function handleConfirm() {
    if (!selected) return
    if (!(await confirmReferralOk(applicant.id, selected.id, applicant.name))) return
    setSubmitting(true)
    setError("")
    try {
      await createReferral(applicant.id, selected.id)
      setReferred(true)
    } catch (err: unknown) {
      // axiosClient's interceptor flattens backend errors into Error.message.
      const msg = err instanceof Error ? err.message : ''
      setError(msg || 'Failed to create referral. Please try again.')
    } finally {
      setSubmitting(false)
    }
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

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium">
                  Cancel
                </button>
                <button type="button" onClick={handleConfirm} disabled={!selected || submitting}
                  className="flex-1 py-2.5 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                  {submitting ? 'Submitting…' : 'Confirm Referral'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        isOpen={referralGuardModal.isOpen} type="confirm" confirmVariant="brand"
        title="Possible duplicate referral" message={referralGuardModal.message}
        confirmText="Yes, refer again" cancelText="Cancel"
        onConfirm={referralGuardModal.onConfirm} onCancel={referralGuardModal.onCancel}
      />
    </div>
  );
}

// ─── Import modal ──────────────────────────────────────────────────────────────

function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pickFile(f: File | null) {
    setFile(f);
    setResult(null);
    setError(null);
  }

  async function handleImport() {
    if (!file || isImporting) return;
    setIsImporting(true);
    setError(null);
    setResult(null);
    setProgress({ done: 0, total: 0 });
    try {
      const res = await importApplicants(file, (done, total) => setProgress({ done, total }));
      setResult(res);
      if (res.succeeded > 0) onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the file. Make sure it's a valid .xlsx or .csv.");
    } finally {
      setIsImporting(false);
      setProgress(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-800">Import Applicants</h3>
          <button onClick={onClose} aria-label="Close import modal" className="text-gray-400 hover:text-gray-600 transition-colors text-lg">✕</button>
        </div>

        <div className="overflow-y-auto">
          {result ? (
            <ImportResultView result={result} />
          ) : (
            <>
              <label className={`block border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${file ? "border-brand-blue bg-blue-50" : "border-gray-300 text-gray-400 hover:border-brand-blue"}`}>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  disabled={isImporting}
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-4xl mb-3">📂</p>
                {file ? (
                  <p className="text-base font-medium text-brand-blue break-all">{file.name}</p>
                ) : (
                  <>
                    <p className="text-base font-medium text-gray-600">Click to upload or drag & drop</p>
                    <p className="text-sm mt-1">Excel (.xlsx) or CSV files</p>
                  </>
                )}
              </label>

              <p className="text-sm text-gray-400 mt-4 text-center">
                Download the{" "}
                <button type="button" onClick={() => { void downloadImportTemplate(); }} className="text-brand-blue cursor-pointer hover:underline">template file</button>{" "}
                to ensure correct column format.
              </p>

              {error && <p className="text-red-500 text-sm mt-3 text-center">{error}</p>}

              {isImporting && progress && (
                <p className="text-sm text-gray-600 mt-3 text-center">
                  Importing {progress.done} of {progress.total}…
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          {result ? (
            <button onClick={onClose} className="flex-1 py-2.5 bg-brand-blue text-white rounded-lg text-base hover:bg-brand-blue-dark transition-colors">Done</button>
          ) : (
            <>
              <button onClick={onClose} disabled={isImporting} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-base text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={handleImport} disabled={!file || isImporting} className="flex-1 py-2.5 bg-brand-blue text-white rounded-lg text-base hover:bg-brand-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {isImporting ? "Importing…" : "Import"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ImportResultView({ result }: { result: ImportResult }) {
  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <div className="flex-1 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-center">
          <p className="text-2xl font-semibold text-green-700">{result.succeeded}</p>
          <p className="text-xs text-green-700">Imported</p>
        </div>
        <div className="flex-1 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-center">
          <p className="text-2xl font-semibold text-red-700">{result.failed.length}</p>
          <p className="text-xs text-red-700">Failed</p>
        </div>
      </div>

      {result.total === 0 ? (
        <p className="text-sm text-gray-500 text-center">No applicant rows were found in the file.</p>
      ) : result.failed.length === 0 ? (
        <p className="text-sm text-green-700 text-center">All {result.succeeded} applicant{result.succeeded !== 1 ? "s" : ""} imported successfully.</p>
      ) : (
        <div className="mt-1">
          <p className="text-xs font-semibold text-gray-600 mb-1">Rows that could not be imported:</p>
          <ul className="space-y-1 max-h-48 overflow-y-auto text-xs">
            {result.failed.map((f) => (
              <li key={f.row} className="rounded border border-red-100 bg-red-50 px-2 py-1.5">
                <span className="font-medium text-gray-700">Row {f.row} — {f.name}:</span>{" "}
                <span className="text-red-600">{f.error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
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
  // ── Applicant state (source of truth = the database) ──
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [deleteApplicantConfirm, setDeleteApplicantConfirm] = useState<Applicant | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; type: 'success' | 'error'; title: string; message: string
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  // Reload the Employment Facilitation applicants from the backend.
  async function reloadApplicants() {
    const data = await listApplicants();
    setApplicants(data);
  }

  // ── Search / filter / pagination state ────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(ITEMS_PER_PAGE);
  const [sortOrder, setSortOrder] = useState<'firstName_asc' | 'firstName_desc' | 'lastName_asc' | 'lastName_desc' | ''>('');

  // ── Derived data ──────────────────────────────────────────────────
  const filteredApplicants = useMemo(() => {
    let result = applicants;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      // Search across the permanent table columns (Name, Age, Sex, Educational
      // Background, Skills, Training Course, Job Preference) plus the address.
      result = result.filter((a) =>
        [
          a.name,
          String(a.age ?? ""),
          a.gender,
          a.education,
          a.skills,
          a.trainingCourses ?? "",
          a.jobPreference ?? "",
          a.address,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
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
          result = result.filter((a) => (a.language ?? "").toLowerCase().includes(value.toLowerCase()));
          break;
        case "skills":
          result = result.filter((a) => a.skills.toLowerCase().includes(value.toLowerCase()));
          break;
        case "referredProgram":
          result = result.filter((a) => ((a.fullFormData?.referredProgram as string) ?? "") === value);
          break;
        case "barangay":
          result = result.filter((a) => ((a.fullFormData?.barangay as string) ?? "").toLowerCase().includes(value.toLowerCase()));
          break;
        case "trainingCourse":
          result = result.filter((a) => (a.trainingCourses ?? "").toLowerCase().includes(value.toLowerCase()));
          break;
      }
    }

    if (sortOrder) {
      // name is "Lastname, Firstname M. Suffix" (see employment.php's $name
      // build) — split on the comma rather than whitespace, since a surname
      // can itself contain spaces (e.g. "Dela Cruz").
      const surnameOf = (n: string) => (n.split(',')[0] ?? n).trim().toLowerCase();
      const firstNameOf = (n: string) => (n.split(',')[1] ?? '').trim().split(/\s+/)[0]?.toLowerCase() ?? '';
      result = [...result].sort((a, b) => {
        const keyA = sortOrder.startsWith('firstName') ? firstNameOf(a.name) : surnameOf(a.name);
        const keyB = sortOrder.startsWith('firstName') ? firstNameOf(b.name) : surnameOf(b.name);
        return sortOrder.endsWith('asc') ? keyA.localeCompare(keyB) : keyB.localeCompare(keyA);
      });
    }

    return result;
  }, [applicants, searchQuery, activeFilters, filterValues, sortOrder]);

  const isFiltered = searchQuery.trim().length > 0 || activeFilters.some((f) => filterValues[f]);

  const paginatedApplicants = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredApplicants.slice(start, start + perPage);
  }, [filteredApplicants, currentPage, perPage]);

  // ── Modal states ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabType>("applicants");

  // Cross-tab "jump to record" state for Placements' Linked Vacancy —
  // set by PlacementsTab, consumed (and cleared) by VacanciesTab.
  const [pendingVacancyId, setPendingVacancyId] = useState<number | null>(null);

  // Load applicants on mount and whenever the user returns to the Applicants tab,
  // so the computed referralState (Refer/Referred/Hired) reflects status changes
  // made in the Referrals/Placements tabs.
  useEffect(() => {
    if (activeTab === "applicants") {
      reloadApplicants().catch(() => {
        console.warn('Failed to load applicants from the server.');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingApplicant, setEditingApplicant] = useState<Applicant | null>(null);
  const [viewingApplicant, setViewingApplicant] = useState<Applicant | null>(null);
  const [referringApplicant, setReferringApplicant] = useState<Applicant | null>(null);
  const [historyApplicant, setHistoryApplicant] = useState<Applicant | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isResumeMakerOpen, setIsResumeMakerOpen] = useState(false);

  // ── CRUD handlers ─────────────────────────────────────────────────
  // Persists to the database via the API, then refreshes the list from the
  // server (the authoritative source — resolved address, derived fields, etc.).
  // The sidebar awaits this and shows its own success screen, then closes.
  async function handleSaveApplicant(formData: ApplicantFormData) {
    if (editingApplicant) {
      await updateApplicant(editingApplicant.id, formData);
    } else {
      await createApplicant(formData);
    }
    await reloadApplicants();
  }

  function handleDeleteApplicant(applicant: Applicant) {
    setDeleteApplicantConfirm(applicant);
  }

  async function confirmDeleteApplicant() {
    const applicant = deleteApplicantConfirm;
    if (!applicant) return;
    setDeleteApplicantConfirm(null);
    try {
      await deleteApplicant(applicant.id);
      await reloadApplicants();
      setConfirmModal({ isOpen: true, type: 'success', title: 'Deleted', message: 'The applicant has been deleted and moved to the recycle bin.' });
    } catch (err: unknown) {
      // axiosClient's interceptor flattens backend errors into Error.message.
      const msg = err instanceof Error && err.message ? err.message : "Failed to delete applicant.";
      setConfirmModal({ isOpen: true, type: 'error', title: 'Error', message: msg });
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
    <>
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
              onShowHistory={setHistoryApplicant}
              onDeleteApplicant={handleDeleteApplicant}
              onImportClick={() => setIsImportModalOpen(true)}
              onShowResumeMaker={() => setIsResumeMakerOpen(true)}
              onSearchChange={handleSearchChange}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
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
              perPage={perPage}
              onPerPageChange={n => { setPerPage(n); setCurrentPage(1) }}
            />
          )
        )}
        {activeTab === "vacancies" && (
          <VacanciesTab
            focusVacancyId={pendingVacancyId}
            onFocusHandled={() => setPendingVacancyId(null)}
          />
        )}
        {activeTab === "referrals" && <ReferralsTab />}
        {activeTab === "placements" && (
          <PlacementsTab
            onNavigateToVacancy={(id) => { setActiveTab("vacancies"); setPendingVacancyId(id); }}
          />
        )}
        {activeTab === "employers" && <EmployersTab />}
      </div>

      {/* Overlay panels */}
      {referringApplicant && (
        <ReferApplicantPanel applicant={referringApplicant} onClose={() => { setReferringApplicant(null); reloadApplicants().catch(() => {}); }} />
      )}
      {historyApplicant && (
        <EmploymentHistoryPanel applicant={historyApplicant} onClose={() => setHistoryApplicant(null)} />
      )}
      {isImportModalOpen && (
        <ImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImported={() => { reloadApplicants().catch(() => {}); }}
        />
      )}
    </div>
    <ConfirmModal
      isOpen={!!deleteApplicantConfirm} type="confirm"
      title="Delete Applicant?"
      message={`Are you sure you want to delete ${deleteApplicantConfirm?.name}? This will move the applicant to the recycle bin.`}
      confirmText="Yes, Delete" cancelText="Cancel"
      onConfirm={confirmDeleteApplicant} onCancel={() => setDeleteApplicantConfirm(null)}
    />
    <ConfirmModal
      isOpen={confirmModal.isOpen} type={confirmModal.type} title={confirmModal.title} message={confirmModal.message}
      confirmText="OK" onConfirm={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
    />
    </>
  );
}
