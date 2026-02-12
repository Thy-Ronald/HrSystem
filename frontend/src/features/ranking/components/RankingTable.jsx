/**
 * RankingTable Component
 * Main data table for displaying ranking information
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { TableSkeleton } from './TableSkeleton';
import { EmptyState } from './EmptyState';
import { UserAvatar } from './UserAvatar';
import { memo } from 'react';
import { ArrowUpDown } from "lucide-react"

export const RankingTable = memo(function RankingTable({ columns, data, loading, error }) {
  const isEmpty = !data || data.length === 0;

  if (loading) {
    return <TableSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 text-rose-500">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-auto">
        <Table>
          <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80 sticky top-0 z-10">
            <TableRow className="hover:bg-transparent border-b border-slate-200 dark:border-slate-800">
              {columns.map((column) => {
                // Determine alignment based on column type
                const isLeftAligned = column.key === 'id' || column.key === 'topLanguages';
                const alignmentClass = isLeftAligned ? 'text-left' : 'text-center';
                const flexJustify = isLeftAligned ? 'justify-start' : 'justify-center';

                return (
                  <TableHead
                    key={column.key}
                    className={`px-4 py-4 h-auto text-[10px] sm:text-[11px] font-bold text-[#1a3e62] dark:text-blue-400 uppercase tracking-wider whitespace-nowrap ${alignmentClass} ${column.key === 'id' ? 'w-3/12' : column.key === 'topLanguages' ? 'w-auto' : 'w-[10%]'
                      }`}
                  >
                    <div className={`flex items-center ${flexJustify} gap-1.5`}>
                      {column.label}
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isEmpty ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <EmptyState />
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, rowIndex) => (
                <TableRow
                  key={row.id || rowIndex}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 group"
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={`px-4 py-4 text-sm text-slate-600 dark:text-slate-400 ${column.key === 'id'
                        ? 'text-left font-medium text-slate-900 dark:text-slate-100 w-3/12 break-all sm:break-normal'
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
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 border-none font-semibold px-2 py-0.5 rounded text-[10px]"
                              >
                                {lang.language} ({lang.percentage || lang.count}%)
                              </Badge>
                            ))
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 text-xs">-</span>
                          )}
                        </div>
                      ) : (
                        row[column.key] ?? <span className="text-slate-400 dark:text-slate-500">-</span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
});
