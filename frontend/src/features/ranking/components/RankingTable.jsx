/**
 * RankingTable Component
 * Main data table for displaying ranking information
 */

import { TableSkeleton } from './TableSkeleton';
import { EmptyState } from './EmptyState';
import { UserAvatar } from './UserAvatar';

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

export function RankingTable({ columns, data, loading, error }) {
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
    <div className="overflow-x-auto -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8">
      <table className="w-full min-w-[800px] border-collapse">
        <thead>
          <tr className="border-b border-[#e8eaed]">
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-4 py-3 text-[11px] font-medium text-[#5f6368] uppercase tracking-wider text-center"
              >
                {column.label}
                <SortIcon />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isEmpty ? (
            <EmptyState />
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                className="border-b border-[#e8eaed] hover:bg-[#f8f9fa] transition-colors"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-4 text-sm text-[#202124] ${
                      column.key === 'id' ? 'text-left font-medium min-w-[150px] max-w-[250px]' : 'text-center'
                    }`}
                  >
                    {column.key === 'id' && row[column.key] ? (
                      <UserAvatar username={row[column.key]} size={32} />
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
  );
}
