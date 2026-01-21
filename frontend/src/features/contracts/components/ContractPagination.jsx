/**
 * Pagination component for contract list
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
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[#f1f3f4] bg-[#f8f9fa]">
      <div className="text-sm text-[#5f6368]">
        Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} {searchQuery ? 'filtered ' : ''}contracts
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-2 rounded-full text-[#5f6368] transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#eaebef] disabled:hover:bg-transparent"
          title={currentPage === 1 ? "No previous page" : "Previous page"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
            // Show first page, last page, current page, and pages around current
            if (
              page === 1 ||
              page === totalPages ||
              (page >= currentPage - 1 && page <= currentPage + 1)
            ) {
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-[#1a73e8] text-white'
                      : 'text-[#5f6368] hover:bg-[#eaebef]'
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
                <span key={page} className="px-1 text-[#5f6368]">
                  ...
                </span>
              );
            }
            return null;
          })}
        </div>
        
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-2 rounded-full text-[#5f6368] transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#eaebef] disabled:hover:bg-transparent"
          title={currentPage === totalPages ? "No next page" : "Next page"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
