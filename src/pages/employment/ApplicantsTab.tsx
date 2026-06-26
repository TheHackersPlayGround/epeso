// ─── Types & constants ─────────────────────────────────────────────────────────

import { useState } from "react";
import { MoreHorizontal, Search, Plus, ChevronDown, X } from "lucide-react";
import { canManage } from "../../utils/permissions";
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
        <tr key={rowIdx} className="border-b border-gray-100">
          {Array.from({ length: 8 }).map((_, colIdx) => (
            <td key={colIdx} className="px-4 py-3">
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
  onToggleMenu: (e: React.MouseEvent, id: number) => void;
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

function ApplicantsTableRow({ applicant, activeFilters, onToggleMenu }: ApplicantsTableRowProps) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">{applicant.name}</td>
      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{applicant.age}</td>
      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{applicant.gender}</td>
      <td className="px-4 py-3 text-gray-600">{applicant.education}</td>
      <td className="px-4 py-3 text-gray-600">{applicant.skills}</td>
      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
        {(applicant.fullFormData?.referredProgram as string) || '—'}
      </td>

      {activeFilters.includes("disability") && (
        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
          {applicant.hasDisability ? "Yes" : "No"}
        </td>
      )}
      {activeFilters.includes("civilStatus") && (
        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
          {applicant.civilStatus || "N/A"}
        </td>
      )}
      {activeFilters.includes("ofw") && (
        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
          {getOFWLabel(applicant)}
        </td>
      )}
      {activeFilters.includes("4ps") && (
        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
          {applicant.is4PsBeneficiary ? "Yes" : "No"}
        </td>
      )}
      {activeFilters.includes("jobPreference") && (
        <td className="px-4 py-3 text-gray-600">
          {applicant.jobPreference || "N/A"}
        </td>
      )}
      {activeFilters.includes("employmentStatus") && (
        <td className="px-4 py-3 whitespace-nowrap">
          <span className={`px-2 py-0.5 rounded-full text-xs ${getEmploymentStatusClass(applicant.employmentStatus)}`}>
            {applicant.employmentStatus}
          </span>
        </td>
      )}
      {activeFilters.includes("language") && (
        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
          {applicant.language || "N/A"}
        </td>
      )}

      <td className="px-4 py-3 whitespace-nowrap">
        <button
          onClick={(e) => onToggleMenu(e, applicant.id)}
          aria-label={`Actions for ${applicant.name}`}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <MoreHorizontal size={16} />
        </button>
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
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  function handleToggleMenu(e: React.MouseEvent, id: number) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const menuHeight = 110;
    const showAbove = window.innerHeight - rect.bottom < menuHeight + 8;
    setMenuPos({
      top: showAbove ? rect.top - menuHeight - 4 : rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
    setOpenMenuId(openMenuId === id ? null : id);
  }

  function closeMenu() { setOpenMenuId(null); }

  const menuApplicant = applicants.find(a => a.id === openMenuId) ?? null;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-blue">
              {DEFAULT_HEADERS.map((header) => (
                <th key={header} className="px-4 py-3 text-left text-white whitespace-nowrap">
                  {header}
                </th>
              ))}
              {activeFilters.map((filterId) => (
                <th key={filterId} className="px-4 py-3 text-left text-white whitespace-nowrap">
                  {getFilterLabel(filterId)}
                </th>
              ))}
              <th className="px-4 py-3 text-left text-white whitespace-nowrap">Actions</th>
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
                  onToggleMenu={handleToggleMenu}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {openMenuId !== null && menuPos && menuApplicant && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeMenu} />
          <div
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}
            className="w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1"
          >
            <button onClick={() => { onView(menuApplicant); closeMenu(); }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">View</button>
            <button onClick={() => { onEdit(menuApplicant); closeMenu(); }} disabled={!canManage('employment')} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Edit</button>
            <button onClick={() => { onRefer(menuApplicant); closeMenu(); }} className="w-full px-3 py-2 text-left text-xs text-brand-blue hover:bg-blue-50">Refer</button>
          </div>
        </>
      )}
    </>
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
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full"
          >
            <span className="text-sm text-blue-700 font-medium whitespace-nowrap">
              {filter?.label ?? filterId}:
            </span>
            <select
              value={filterValues[filterId] ?? ""}
              onChange={(e) => onFilterValueChange(filterId, e.target.value)}
              aria-label={`Select value for ${filter?.label ?? filterId} filter`}
              className="text-sm bg-transparent border-none focus:outline-none text-blue-700 font-medium pr-1 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="">All</option>
              {(filter?.options ?? []).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <button
              onClick={() => onRemoveFilter(filterId)}
              aria-label={`Remove ${filter?.label ?? filterId} filter`}
              className="text-blue-700 hover:text-blue-900 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Search bar ────────────────────────────────────────────────────────────────

type SortOrderType = 'firstName_asc' | 'firstName_desc' | 'lastName_asc' | 'lastName_desc' | '';

type ApplicantsSearchBarProps = {
  searchQuery: string;
  activeFilters: string[];
  isFilterDropdownOpen: boolean;
  sortOrder: SortOrderType;
  onSearchChange: (value: string) => void;
  onToggleFilterDropdown: () => void;
  onAddFilter: (filterId: string) => void;
  onCloseFilterDropdown: () => void;
  onSortOrderChange: (v: SortOrderType) => void;
};

function ApplicantsSearchBar({
  searchQuery,
  activeFilters,
  isFilterDropdownOpen,
  sortOrder,
  onSearchChange,
  onToggleFilterDropdown,
  onAddFilter,
  onCloseFilterDropdown,
  onSortOrderChange,
}: ApplicantsSearchBarProps) {
  const unselectedFilters = AVAILABLE_FILTERS.filter((f) => !activeFilters.includes(f.id));

  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative flex-1 min-w-48">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, barangay, skills, occupation..."
          aria-label="Search applicants"
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-brand-blue placeholder:text-gray-400"
        />
      </div>

      <div className="relative">
        <select
          value={sortOrder}
          onChange={e => onSortOrderChange(e.target.value as SortOrderType)}
          className="appearance-none pl-4 pr-8 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:border-brand-blue cursor-pointer whitespace-nowrap"
        >
          <option value="" disabled>Sort By</option>
          <option value="firstName_asc">First Name ASC</option>
          <option value="firstName_desc">First Name DSC</option>
          <option value="lastName_asc">Last Name ASC</option>
          <option value="lastName_desc">Last Name DSC</option>
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
      </div>

      <div className="relative">
        <button
          onClick={onToggleFilterDropdown}
          aria-expanded={isFilterDropdownOpen}
          aria-haspopup="listbox"
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors whitespace-nowrap text-sm text-gray-700"
        >
          <Plus size={16} />
          Filter By
          <ChevronDown size={14} className="text-gray-500" />
        </button>

        {isFilterDropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" aria-hidden="true" onClick={onCloseFilterDropdown} />
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
              {unselectedFilters.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400 italic">All filters applied</p>
              ) : (
                unselectedFilters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => onAddFilter(filter.id)}
                    className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    {filter.label}
                  </button>
                ))
              )}
            </div>
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
    <div className="flex items-center justify-between">
      <div className="flex gap-2">
        <button
          onClick={onAddApplicant}
          disabled={!canManage('employment')}
          aria-label="Add new applicant"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue text-white rounded-md hover:bg-brand-blue-dark transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Applicant
        </button>

        <button
          onClick={onImportClick}
          aria-label="Import applicants"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-md transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-md transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M8 8l4-4m0 0l4 4m-4-4v12" />
            </svg>
            Export
            <ChevronDown size={14} />
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
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-brand-blue border border-brand-blue rounded-md bg-white hover:bg-blue-50 transition-colors whitespace-nowrap"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
  sortOrder: SortOrderType;
  onSortOrderChange: (v: SortOrderType) => void;
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
  sortOrder,
  onSortOrderChange,
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
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl shadow-md p-3">
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
      </div>

      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="mb-4">
          <ApplicantsSearchBar
            searchQuery={searchQuery}
            activeFilters={activeFilters}
            isFilterDropdownOpen={isFilterDropdownOpen}
            sortOrder={sortOrder}
            onSearchChange={onSearchChange}
            onToggleFilterDropdown={onToggleFilterDropdown}
            onAddFilter={onAddFilter}
            onCloseFilterDropdown={onCloseFilterDropdown}
            onSortOrderChange={onSortOrderChange}
          />

          {activeFilters.length > 0 && (
            <div className="mt-3">
              <ApplicantsFilterBadges
                activeFilters={activeFilters}
                filterValues={filterValues}
                onFilterValueChange={onFilterValueChange}
                onRemoveFilter={onRemoveFilter}
              />
            </div>
          )}
        </div>

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
