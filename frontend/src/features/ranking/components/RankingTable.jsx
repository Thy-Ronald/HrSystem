/**
 * RankingTable Component
 * Main data table for displaying ranking information
 */

import { TableSkeleton } from './TableSkeleton';
import { EmptyState } from './EmptyState';
import { UserAvatar } from './UserAvatar';
import { memo } from 'react';

function SortIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="inline-block ml-1.5 opacity-40"
    >
      <path d="M3 6h18M7 12h10M11 18h2" />
    </svg>
  );
}

<<<<<<< HEAD
=======
import { memo } from 'react';

>>>>>>> da0f46c (feat: Implement ETag-based smart caching and UI decoupling for Ranking modal and Staff Ranking form to optimize performance and reduce API load)
export const RankingTable = memo(function RankingTable({ columns, data, loading, error }) {
  const isEmpty = !data || data.length === 0;

  if (loading) {
    return <TableSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 text-red-500">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="text-sm text-[#70757a]">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="overflow-visible">
        <table className="w-full border-collapse table-auto">
          <thead>
            <tr className="border-b border-[#e8eaed] bg-gray-50/50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-2 py-3 text-[10px] sm:text-[11px] font-medium text-[#5f6368] uppercase tracking-wider text-center first:pl-4 last:pr-4"
                >
                  <div className="flex items-center justify-center gap-1">
                    {column.label}
                    <SortIcon />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {isEmpty ? (
              <EmptyState />
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={row.id || rowIndex}
                  className="border-b border-[#e8eaed] hover:bg-[#f8f9fa] transition-colors last:border-0"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-2 py-3 text-sm text-[#202124] first:pl-4 last:pr-4 ${column.key === 'id'
                          ? 'text-left font-medium w-3/12 break-all sm:break-normal'
                          : 'text-center tabular-nums w-[10%]'
                        }`}
                    >
                      {column.key === 'id' && row[column.key] ? (
                        <UserAvatar username={row[column.key]} size={28} />
                      ) : (
                        row[column.key] ?? '-'
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});
