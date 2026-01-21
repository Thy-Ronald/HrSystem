import { useEffect } from 'react';
import { ContractListHeader } from './ContractListHeader';
import { ContractListItem } from './ContractListItem';
import { ContractPagination } from './ContractPagination';
import { filterContracts } from '../utils/contractHelpers';
import { formatDate } from '../../../utils/format';

/**
 * Contract list component with filtering and pagination
 */
export function ContractList({ 
  contracts, 
  searchQuery, 
  currentPage, 
  itemsPerPage, 
  currentTime,
  onPageChange,
  onEdit,
  onDelete
}) {
  // Filter contracts based on search query
  const filteredContracts = filterContracts(contracts, searchQuery, formatDate);
  
  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage);
  
  // Reset to page 1 if current page is out of bounds after filtering
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      onPageChange(1);
    }
  }, [filteredContracts.length, currentPage, totalPages, onPageChange]);
  
  if (filteredContracts.length === 0 && searchQuery.trim()) {
    return (
      <div className="p-8 text-center text-[#5f6368]">
        <p className="text-lg">No contracts found</p>
        <p className="text-sm">Try adjusting your search query.</p>
      </div>
    );
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedContracts = filteredContracts.slice(startIndex, endIndex);

  return (
    <div className="w-full">
      <ContractListHeader />
      
      {paginatedContracts.map((contract) => (
        <ContractListItem
          key={contract.id}
          contract={contract}
          currentTime={currentTime}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
      
      <ContractPagination
        currentPage={currentPage}
        totalPages={totalPages}
        startIndex={startIndex}
        endIndex={endIndex}
        totalItems={filteredContracts.length}
        searchQuery={searchQuery}
        onPageChange={onPageChange}
      />
    </div>
  );
}
