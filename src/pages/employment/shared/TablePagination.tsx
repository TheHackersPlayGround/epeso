// Reusable pagination footer for the Employment Facilitation tables.
// Mirrors the original ApplicantsTab pagination look, generalized over the row
// label and page size so Vacancies / Employers / Referrals / Placements can share it.

export const EF_ITEMS_PER_PAGE = 10;

type Props = {
  currentPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  itemLabel: string;          // singular, e.g. "vacancy"
  itemLabelPlural?: string;   // optional plural; defaults to itemLabel + "s"
  itemsPerPage?: number;      // defaults to EF_ITEMS_PER_PAGE
};

export default function TablePagination({
  currentPage,
  totalItems,
  onPageChange,
  itemLabel,
  itemLabelPlural,
  itemsPerPage = EF_ITEMS_PER_PAGE,
}: Props) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;

  const firstItem = (currentPage - 1) * itemsPerPage + 1;
  const lastItem = Math.min(currentPage * itemsPerPage, totalItems);
  const plural = itemLabelPlural ?? `${itemLabel}s`;

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
        Showing {firstItem}–{lastItem} of {totalItems} {totalItems !== 1 ? plural : itemLabel}
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
