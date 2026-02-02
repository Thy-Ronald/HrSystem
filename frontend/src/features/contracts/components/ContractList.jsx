import { useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ContractPagination } from './ContractPagination';
import { filterContracts, getContractStatus, calculateTotalSalary, calculateExpirationDate } from '../utils/contractHelpers';
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
        <p className="text-lg font-medium">No contracts found</p>
        <p className="text-sm">Try adjusting your search query.</p>
      </div>
    );
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedContracts = filteredContracts.slice(startIndex, endIndex);

  return (
    <div className="w-full flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-slate-50/80 sticky top-0 z-10">
            <TableRow>
              <TableHead className="font-bold text-[#1a3e62] py-4 whitespace-nowrap">Name</TableHead>
              <TableHead className="font-bold text-[#1a3e62] py-4 whitespace-nowrap">Position</TableHead>
              <TableHead className="font-bold text-[#1a3e62] py-4 text-center whitespace-nowrap">Term</TableHead>
              <TableHead className="font-bold text-[#1a3e62] py-4 whitespace-nowrap">Assessment</TableHead>
              <TableHead className="font-bold text-[#1a3e62] py-4 whitespace-nowrap">Status</TableHead>
              <TableHead className="font-bold text-[#1a3e62] py-4 text-right whitespace-nowrap">Salary</TableHead>
              <TableHead className="font-bold text-[#1a3e62] py-4 text-right whitespace-nowrap">Expiration</TableHead>
              <TableHead className="font-bold text-[#1a3e62] py-4 text-center whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedContracts.map((contract) => {
              const contractTotalSalary = calculateTotalSalary(contract);
              const label = getContractStatus(contract, currentTime);

              // Calculate expiration date for display
              const expirationDate = calculateExpirationDate(contract.assessmentDate, contract.termMonths);
              const expirationDisplay = expirationDate
                ? formatDate(expirationDate)
                : (contract.expirationDate ? formatDate(contract.expirationDate) : 'N/A');

              // Map current colors to badge variants or custom classes
              let badgeClass = "font-semibold px-2.5 py-0.5 rounded-full capitalize border-none";
              if (label.color.includes('bg-green-100')) badgeClass += " bg-emerald-50 text-emerald-700";
              else if (label.color.includes('bg-red-100')) badgeClass += " bg-rose-50 text-rose-700";
              else if (label.color.includes('bg-blue-100')) badgeClass += " bg-blue-50 text-blue-700";
              else if (label.color.includes('bg-yellow-100')) badgeClass += " bg-amber-50 text-amber-700";
              else badgeClass += ` ${label.color}`; // Fallback

              return (
                <TableRow key={contract.id} className="hover:bg-slate-50/50 transition-colors group">
                  <TableCell className="py-4 font-semibold text-slate-900">
                    {contract.name}
                  </TableCell>
                  <TableCell className="py-4 text-slate-600">
                    {contract.position}
                  </TableCell>
                  <TableCell className="py-4 text-slate-600 text-center">
                    {contract.termMonths} mo
                  </TableCell>
                  <TableCell className="py-4 text-slate-600">
                    {formatDate(contract.assessmentDate)}
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant="secondary" className={badgeClass}>
                      {label.text}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4 font-bold text-slate-900 text-right">
                    ₱{contractTotalSalary.toLocaleString()}
                  </TableCell>
                  <TableCell className="py-4 text-slate-600 text-right text-sm">
                    {expirationDisplay}
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(contract.id);
                        }}
                        className="h-8 bg-[#1a3e62] hover:bg-[#122c46] text-white font-medium px-4 shadow-sm"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(contract.id, contract.name);
                        }}
                        className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-medium px-3"
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="border-t border-slate-100">
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
    </div>
  );
}
