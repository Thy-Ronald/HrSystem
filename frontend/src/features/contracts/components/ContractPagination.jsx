import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Pagination component for contract list
 * Styled to match modern minimal design with text-based navigation
 */
export function ContractPagination({
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  searchQuery,
  onPageChange
}) {
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  if (totalPages <= 1 && totalItems <= (endIndex - startIndex)) return null;

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
      <div className="text-sm text-gray-500 font-medium whitespace-nowrap">
        Showing <span className="text-gray-900">{startIndex + 1}</span> to <span className="text-gray-900">{Math.min(endIndex, totalItems)}</span> of <span className="text-gray-900">{totalItems}</span> {searchQuery ? 'results' : 'entries'}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {/* Previous Button */}
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={!hasPrevious}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:text-gray-900 flex-shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Logic for showing pages: first, last, and around current
              const isFirst = page === 1;
              const isLast = page === totalPages;
              const isAroundCurrent = Math.abs(page - currentPage) <= 1;

              if (isFirst || isLast || isAroundCurrent) {
                const isActive = currentPage === page;
                return (
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`min-w-[36px] h-[36px] flex items-center justify-center rounded-lg text-sm font-semibold transition-all ${isActive
                      ? 'bg-[#1a3e62] text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                  >
                    {page}
                  </button>
                );
              } else if (
                page === currentPage - 2 ||
                page === currentPage + 2
              ) {
                return (
                  <span key={page} className="px-1 text-gray-400 font-medium">
                    ...
                  </span>
                );
              }
              return null;
            })}
          </div>

          {/* Next Button */}
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={!hasNext}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:text-gray-900 flex-shrink-0"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
