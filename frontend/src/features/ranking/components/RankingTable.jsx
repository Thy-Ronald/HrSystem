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
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-[#e8eaed] bg-gray-50/50">
              {columns.map((column) => {
                // Determine alignment based on column type
                const isLeftAligned = column.key === 'id' || column.key === 'topLanguages';
                const alignmentClass = isLeftAligned ? 'text-left' : 'text-center';
                const flexJustify = isLeftAligned ? 'justify-start' : 'justify-center';
                
                return (
                  <th
                    key={column.key}
                    className={`px-2 py-3 text-[10px] sm:text-[11px] font-medium text-[#5f6368] uppercase tracking-wider ${alignmentClass} first:pl-4 last:pr-4 ${
                      column.key === 'id' ? 'w-3/12' : column.key === 'topLanguages' ? 'w-auto' : 'w-[10%]'
                    }`}
                  >
                    <div className={`flex items-center ${flexJustify} gap-1`}>
                      {column.label}
                      <SortIcon />
                    </div>
                  </th>
                );
              })}
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
                      className={`px-2 py-3 text-sm text-[#202124] first:pl-4 last:pr-4 ${
                        column.key === 'id'
                          ? 'text-left font-medium w-3/12 break-all sm:break-normal'
                          : column.key === 'topLanguages'
                          ? 'text-left w-auto'
                          : 'text-center tabular-nums w-[10%]'
                      }`}
                    >
                      {column.key === 'id' && row[column.key] ? (
                        <UserAvatar username={row[column.key]} size={28} />
                      ) : column.key === 'topLanguages' ? (
                        <div className="flex flex-wrap gap-1.5">
                          {Array.isArray(row[column.key]) && row[column.key].length > 0 ? (
                            row[column.key].map((lang, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {lang.language} ({lang.percentage || lang.count}%)
                              </span>
                            ))
                          ) : (
                            <span className="text-[#70757a]">-</span>
                          )}
                        </div>
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
