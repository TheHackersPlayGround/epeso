// ─── Types & constants ─────────────────────────────────────────────────────────

import type { Applicant } from "../../contexts/EmploymentContext";
export type { Applicant };

export type FilterOption = {
  id: string;
  label: string;
  options: string[];
};

export const AVAILABLE_FILTERS: FilterOption[] = [
  { id: "disability", label: "PWD / Disability", options: ["Yes", "No"] },
  { id: "civilStatus", label: "Civil Status", options: ["Single", "Married", "Widowed", "Separated", "Annulled"] },
  { id: "sex", label: "Sex", options: ["Male", "Female"] },
  { id: "ofw", label: "OFW Status", options: ["Active OFW", "Former OFW", "Not OFW"] },
  { id: "4ps", label: "4Ps Beneficiary", options: ["Yes", "No"] },
  { id: "educationalLevel", label: "Educational Level", options: [
    "Elementary Graduate", "High School Graduate", "Senior High School Graduate",
    "Vocational / Technical", "College Graduate", "Post Graduate",
  ]},
  { id: "employmentStatus", label: "Employment Status", options: ["Unemployed", "Underemployed", "Employed"] },
  { id: "language", label: "Language", options: ["Filipino", "English", "Bisaya", "Hiligaynon", "Ilocano"] },
  { id: "skills", label: "Skills", options: [
    "Computer Literacy", "Driving", "Cooking", "Caregiving",
    "Electrical", "Plumbing", "Welding", "Sewing",
  ]},
  { id: "jobPreference", label: "Job Preference", options: [
    "Office Work", "Skilled Trade", "Healthcare", "Education",
    "Agriculture", "Manufacturing", "Service Industry", "IT / Technology",
  ]},
];

export const ITEMS_PER_PAGE = 10;

// ─── Skeleton ──────────────────────────────────────────────────────────────────

const SKELETON_ROW_COUNT = 6;

function ApplicantsSkeleton() {
  return (
    <>
      {Array.from({ length: SKELETON_ROW_COUNT }).map((_, rowIdx) => (
        <tr key={rowIdx} className="border-b border-gray-200">
          {Array.from({ length: 8 }).map((_, colIdx) => (
            <td key={colIdx} className="px-6 py-5">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function ApplicantsEmptyState({ isFiltered }: { isFiltered: boolean }) {
  return (
    <tr>
      <td colSpan={100} className="py-16 text-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <svg
            className="w-12 h-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {isFiltered ? (
            <>
              <p className="text-base font-medium text-gray-500">No applicants match your filters</p>
              <p className="text-sm">Try adjusting your search or removing some filters.</p>
            </>
          ) : (
            <>
              <p className="text-base font-medium text-gray-500">No applicants yet</p>
              <p className="text-sm">Add an applicant or import a list to get started.</p>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Table row ─────────────────────────────────────────────────────────────────

type ApplicantsTableRowProps = {
  applicant: Applicant;
  activeFilters: string[];
  onView: (applicant: Applicant) => void;
  onEdit: (applicant: Applicant) => void;
  onRefer: (applicant: Applicant) => void;
};

function getEmploymentStatusClass(status: string): string {
  switch (status) {
    case "Unemployed": return "bg-red-100 text-red-700";
    case "Employed": return "bg-green-100 text-green-700";
    case "Underemployed": return "bg-yellow-100 text-yellow-700";
    default: return "bg-gray-100 text-gray-700";
  }
}

function getOFWLabel(applicant: Applicant): string {
  if (applicant.isOFW) return "Active OFW";
  if (applicant.isFormerOFW) return "Former OFW";
  return "Not OFW";
}

function ApplicantsTableRow({ applicant, activeFilters, onView, onEdit, onRefer }: ApplicantsTableRowProps) {
  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors align-top">
      <td className="px-6 py-5 text-gray-800 font-semibold w-32">{applicant.name}</td>
      <td className="px-6 py-5 text-gray-600 whitespace-nowrap">{applicant.age}</td>
      <td className="px-6 py-5 text-gray-600 whitespace-nowrap">{applicant.gender}</td>
      <td className="px-6 py-5 text-gray-600">{applicant.education}</td>
      <td className="px-6 py-5 text-gray-600">{applicant.skills}</td>
      <td className="px-6 py-5 text-gray-600 whitespace-nowrap">General Program</td>

      {activeFilters.includes("disability") && (
        <td className="px-6 py-5 text-gray-600 whitespace-nowrap">
          {applicant.hasDisability ? "Yes" : "No"}
        </td>
      )}
      {activeFilters.includes("civilStatus") && (
        <td className="px-6 py-5 text-gray-600 whitespace-nowrap">
          {applicant.civilStatus || "N/A"}
        </td>
      )}
      {activeFilters.includes("ofw") && (
        <td className="px-6 py-5 text-gray-600 whitespace-nowrap">
          {getOFWLabel(applicant)}
        </td>
      )}
      {activeFilters.includes("4ps") && (
        <td className="px-6 py-5 text-gray-600 whitespace-nowrap">
          {applicant.is4PsBeneficiary ? "Yes" : "No"}
        </td>
      )}
      {activeFilters.includes("jobPreference") && (
        <td className="px-6 py-5 text-gray-600">
          {applicant.jobPreference || "N/A"}
        </td>
      )}
      {activeFilters.includes("employmentStatus") && (
        <td className="px-6 py-5 whitespace-nowrap">
          <span className={`px-3 py-1 rounded-full text-sm ${getEmploymentStatusClass(applicant.employmentStatus)}`}>
            {applicant.employmentStatus}
          </span>
        </td>
      )}
      {activeFilters.includes("language") && (
        <td className="px-6 py-5 text-gray-600 whitespace-nowrap">
          {applicant.language || "N/A"}
        </td>
      )}

      <td className="px-6 py-5 whitespace-nowrap">
        <div className="flex gap-4">
          <button
            onClick={() => onView(applicant)}
            aria-label={`View ${applicant.name}`}
            className="text-base text-brand-orange hover:underline transition-colors font-medium"
          >
            View
          </button>
          <button
            onClick={() => onEdit(applicant)}
            aria-label={`Edit ${applicant.name}`}
            className="text-base text-brand-blue hover:underline transition-colors font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => onRefer(applicant)}
            aria-label={`Refer ${applicant.name} to a vacancy`}
            className="text-base text-green-600 hover:underline transition-colors font-medium"
          >
            Refer
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Table ─────────────────────────────────────────────────────────────────────

type ApplicantsTableProps = {
  applicants: Applicant[];
  activeFilters: string[];
  isLoading: boolean;
  isFiltered: boolean;
  onView: (applicant: Applicant) => void;
  onEdit: (applicant: Applicant) => void;
  onRefer: (applicant: Applicant) => void;
};

const DEFAULT_HEADERS = ["Name", "Age", "Sex", "Educational Background", "Skills", "Referred Program"];

function getFilterLabel(filterId: string): string {
  return AVAILABLE_FILTERS.find((f) => f.id === filterId)?.label ?? filterId;
}

function ApplicantsTable({ applicants, activeFilters, isLoading, isFiltered, onView, onEdit, onRefer }: ApplicantsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-base text-left">
        <thead>
          <tr className="border-b-2 border-gray-200">
            {DEFAULT_HEADERS.map((header) => (
              <th key={header} className="px-6 py-4 text-gray-700 font-bold whitespace-nowrap">
                {header}
              </th>
            ))}
            {activeFilters.map((filterId) => (
              <th key={filterId} className="px-6 py-4 text-gray-700 font-bold whitespace-nowrap">
                {getFilterLabel(filterId)}
              </th>
            ))}
            <th className="px-6 py-4 text-gray-700 font-bold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <ApplicantsSkeleton />
          ) : applicants.length === 0 ? (
            <ApplicantsEmptyState isFiltered={isFiltered} />
          ) : (
            applicants.map((applicant) => (
              <ApplicantsTableRow
                key={applicant.id}
                applicant={applicant}
                activeFilters={activeFilters}
                onView={onView}
                onEdit={onEdit}
                onRefer={onRefer}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Pagination ────────────────────────────────────────────────────────────────

type ApplicantsPaginationProps = {
  currentPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};

function ApplicantsPagination({ currentPage, totalItems, onPageChange }: ApplicantsPaginationProps) {
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  if (totalPages <= 1) return null;

  const firstItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const lastItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  function buildPageNumbers(): (number | "...")[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (currentPage > 3) pages.push("...");
    for (let p = Math.max(2, currentPage - 1); p <= Math.min(totalPages - 1, currentPage + 1); p++) {
      pages.push(p);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  }

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
      <p className="text-sm text-gray-500">
        Showing {firstItem}–{lastItem} of {totalItems} applicant{totalItems !== 1 ? "s" : ""}
      </p>
      <nav aria-label="Pagination" className="flex items-center gap-1">
        <button
          onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
          className="px-3 py-1.5 rounded border border-gray-300 text-sm text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
        >
          ← Prev
        </button>
        {buildPageNumbers().map((page, idx) =>
          page === "..." ? (
            <span key={`ellipsis-${idx}`} className="px-3 py-1.5 text-sm text-gray-400 select-none">…</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              aria-label={`Go to page ${page}`}
              aria-current={currentPage === page ? "page" : undefined}
              className={`px-3 py-1.5 rounded border text-sm transition-colors ${
                currentPage === page
                  ? "bg-brand-blue border-brand-blue text-white font-semibold"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {page}
            </button>
          ),
        )}
        <button
          onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
          className="px-3 py-1.5 rounded border border-gray-300 text-sm text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
        >
          Next →
        </button>
      </nav>
    </div>
  );
}

// ─── Filter badges ─────────────────────────────────────────────────────────────

type ApplicantsFilterBadgesProps = {
  activeFilters: string[];
  filterValues: Record<string, string>;
  onFilterValueChange: (filterId: string, value: string) => void;
  onRemoveFilter: (filterId: string) => void;
};

function ApplicantsFilterBadges({ activeFilters, filterValues, onFilterValueChange, onRemoveFilter }: ApplicantsFilterBadgesProps) {
  if (activeFilters.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {activeFilters.map((filterId) => {
        const filter = AVAILABLE_FILTERS.find((f) => f.id === filterId);
        return (
          <div
            key={filterId}
            className="flex items-center gap-1 px-3 py-1 bg-blue-50 border border-brand-blue rounded-full"
          >
            <span className="text-xs font-medium text-brand-blue whitespace-nowrap">
              {filter?.label ?? filterId}:
            </span>
            <select
              value={filterValues[filterId] ?? ""}
              onChange={(e) => onFilterValueChange(filterId, e.target.value)}
              aria-label={`Select value for ${filter?.label ?? filterId} filter`}
              className="text-xs text-gray-700 bg-transparent border-none outline-none cursor-pointer pr-1"
            >
              <option value="">All</option>
              {(filter?.options ?? []).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <button
              onClick={() => onRemoveFilter(filterId)}
              aria-label={`Remove ${filter?.label ?? filterId} filter`}
              className="ml-1 text-gray-400 hover:text-red-500 transition-colors text-xs leading-none"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Search bar ────────────────────────────────────────────────────────────────

type ApplicantsSearchBarProps = {
  searchQuery: string;
  activeFilters: string[];
  isFilterDropdownOpen: boolean;
  onSearchChange: (value: string) => void;
  onToggleFilterDropdown: () => void;
  onAddFilter: (filterId: string) => void;
  onCloseFilterDropdown: () => void;
};

function ApplicantsSearchBar({
  searchQuery,
  activeFilters,
  isFilterDropdownOpen,
  onSearchChange,
  onToggleFilterDropdown,
  onAddFilter,
  onCloseFilterDropdown,
}: ApplicantsSearchBarProps) {
  const unselectedFilters = AVAILABLE_FILTERS.filter((f) => !activeFilters.includes(f.id));

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <div className="relative flex-1 min-w-0">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
          fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, barangay, skills, occupation..."
          aria-label="Search applicants"
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-base text-gray-700 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
        />
      </div>

      <div className="relative flex-shrink-0">
        <button
          onClick={onToggleFilterDropdown}
          aria-expanded={isFilterDropdownOpen}
          aria-haspopup="listbox"
          className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 rounded-lg text-base text-gray-600 bg-white hover:bg-gray-50 transition-colors whitespace-nowrap"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Filter By
          {activeFilters.length > 0 && (
            <span className="bg-brand-blue text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {activeFilters.length}
            </span>
          )}
          <svg
            className={`w-4 h-4 transition-transform ${isFilterDropdownOpen ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isFilterDropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" aria-hidden="true" onClick={onCloseFilterDropdown} />
            <ul
              role="listbox"
              aria-label="Filter options"
              className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[200px] py-1"
            >
              {unselectedFilters.length === 0 ? (
                <li className="px-4 py-3 text-sm text-gray-400 italic">All filters applied</li>
              ) : (
                unselectedFilters.map((filter) => (
                  <li
                    key={filter.id}
                    role="option"
                    aria-selected={false}
                    onClick={() => onAddFilter(filter.id)}
                    className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-blue-50 hover:text-brand-blue transition-colors"
                  >
                    {filter.label}
                  </li>
                ))
              )}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Toolbar ───────────────────────────────────────────────────────────────────

type ApplicantsToolbarProps = {
  isExportDropdownOpen: boolean;
  onAddApplicant: () => void;
  onImportClick: () => void;
  onExportExcel: () => void;
  onExportCsv: () => void;
  onToggleExportDropdown: () => void;
  onCloseExportDropdown: () => void;
  onShowResumeMaker: () => void;
};

function ApplicantsToolbar({
  isExportDropdownOpen,
  onAddApplicant,
  onImportClick,
  onExportExcel,
  onExportCsv,
  onToggleExportDropdown,
  onCloseExportDropdown,
  onShowResumeMaker,
}: ApplicantsToolbarProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center justify-between">
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={onAddApplicant}
          aria-label="Add new applicant"
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium whitespace-nowrap text-base text-white bg-brand-blue hover:bg-brand-blue-dark transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Applicant
        </button>

        <button
          onClick={onImportClick}
          aria-label="Import applicants"
          className="flex items-center gap-2 px-5 py-2.5 text-base text-gray-600 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors whitespace-nowrap"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M8 12l4 4m0 0l4-4m-4 4V4" />
          </svg>
          Import
        </button>

        <div className="relative">
          <button
            onClick={onToggleExportDropdown}
            aria-expanded={isExportDropdownOpen}
            aria-haspopup="menu"
            aria-label="Export applicants"
            className="flex items-center gap-2 px-5 py-2.5 text-base text-gray-600 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M8 8l4-4m0 0l4 4m-4-4v12" />
            </svg>
            Export
            <svg
              className={`w-4 h-4 transition-transform ${isExportDropdownOpen ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isExportDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" aria-hidden="true" onClick={onCloseExportDropdown} />
              <ul role="menu" className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[170px] py-1">
                <li role="menuitem">
                  <button onClick={onExportExcel} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-brand-blue transition-colors">
                    Export as Excel
                  </button>
                </li>
                <li role="menuitem">
                  <button onClick={onExportCsv} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-brand-blue transition-colors">
                    Export as CSV
                  </button>
                </li>
              </ul>
            </>
          )}
        </div>
      </div>

      <button
        onClick={onShowResumeMaker}
        aria-label="Open Resume Builder"
        className="flex items-center gap-2 px-5 py-2.5 text-base text-brand-blue border border-brand-blue rounded-lg bg-white hover:bg-blue-50 transition-colors whitespace-nowrap"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Resume Builder
      </button>
    </div>
  );
}

// ─── ApplicantsTab — pure display, all state lives in EmploymentFacilitation ───

type ApplicantsTabProps = {
  paginatedApplicants: Applicant[];
  filteredCount: number;
  activeFilters: string[];
  filterValues: Record<string, string>;
  searchQuery: string;
  currentPage: number;
  isFilterDropdownOpen: boolean;
  isExportDropdownOpen: boolean;
  isFiltered: boolean;
  onAddApplicant: () => void;
  onEditApplicant: (a: Applicant) => void;
  onViewApplicant: (a: Applicant) => void;
  onReferApplicant: (a: Applicant) => void;
  onImportClick: () => void;
  onShowResumeMaker: () => void;
  onSearchChange: (v: string) => void;
  onToggleFilterDropdown: () => void;
  onCloseFilterDropdown: () => void;
  onAddFilter: (id: string) => void;
  onRemoveFilter: (id: string) => void;
  onFilterValueChange: (id: string, v: string) => void;
  onToggleExportDropdown: () => void;
  onCloseExportDropdown: () => void;
  onExportExcel: () => void;
  onExportCsv: () => void;
  onPageChange: (page: number) => void;
};

export default function ApplicantsTab({
  paginatedApplicants,
  filteredCount,
  activeFilters,
  filterValues,
  searchQuery,
  currentPage,
  isFilterDropdownOpen,
  isExportDropdownOpen,
  isFiltered,
  onAddApplicant,
  onEditApplicant,
  onViewApplicant,
  onReferApplicant,
  onImportClick,
  onShowResumeMaker,
  onSearchChange,
  onToggleFilterDropdown,
  onCloseFilterDropdown,
  onAddFilter,
  onRemoveFilter,
  onFilterValueChange,
  onToggleExportDropdown,
  onCloseExportDropdown,
  onExportExcel,
  onExportCsv,
  onPageChange,
}: ApplicantsTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-5">
        <ApplicantsToolbar
          isExportDropdownOpen={isExportDropdownOpen}
          onAddApplicant={onAddApplicant}
          onImportClick={onImportClick}
          onExportExcel={onExportExcel}
          onExportCsv={onExportCsv}
          onToggleExportDropdown={onToggleExportDropdown}
          onCloseExportDropdown={onCloseExportDropdown}
          onShowResumeMaker={onShowResumeMaker}
        />

        <ApplicantsSearchBar
          searchQuery={searchQuery}
          activeFilters={activeFilters}
          isFilterDropdownOpen={isFilterDropdownOpen}
          onSearchChange={onSearchChange}
          onToggleFilterDropdown={onToggleFilterDropdown}
          onAddFilter={onAddFilter}
          onCloseFilterDropdown={onCloseFilterDropdown}
        />

        <ApplicantsFilterBadges
          activeFilters={activeFilters}
          filterValues={filterValues}
          onFilterValueChange={onFilterValueChange}
          onRemoveFilter={onRemoveFilter}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <ApplicantsTable
          applicants={paginatedApplicants}
          activeFilters={activeFilters}
          isLoading={false}
          isFiltered={isFiltered}
          onView={onViewApplicant}
          onEdit={onEditApplicant}
          onRefer={onReferApplicant}
        />

        <ApplicantsPagination
          currentPage={currentPage}
          totalItems={filteredCount}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
