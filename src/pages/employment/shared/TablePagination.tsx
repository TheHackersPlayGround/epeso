// Reusable pagination footer for the Employment Facilitation tables.
// Matches the "Show N per page" + chevron style used across GIP/SPES/CDSP/etc,
// so Vacancies / Employers / Referrals / Placements share one consistent look.

import { ChevronLeft, ChevronRight } from 'lucide-react';

export const EF_ITEMS_PER_PAGE = 10;

type Props = {
  currentPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (itemsPerPage: number) => void;
};

export default function TablePagination({
  currentPage,
  totalItems,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
}: Props) {
  if (totalItems === 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const firstItem = (safePage - 1) * itemsPerPage + 1;
  const lastItem = Math.min(safePage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        Show
        <select
          value={itemsPerPage}
          onChange={e => onItemsPerPageChange(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:border-brand-blue"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
        per page
      </div>
      <div className="flex items-center gap-3 text-sm text-gray-600">
        <button
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage === 1}
          aria-label="Previous page"
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span>{firstItem} to {lastItem} of {totalItems} records</span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage === totalPages}
          aria-label="Next page"
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
