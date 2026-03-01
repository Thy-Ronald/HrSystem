/**
 * DailySummaryTable
 * Shows each employee's totalActiveMs, totalIdleMs, top 3 apps, and productivity%
 * using shadcn/Tailwind components.
 */

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, User } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar';
import { fetchUserActivity } from '../../../services/employeeTracking';
import {
  formatMs,
  computeProductivity,
  topApps,
  todayKey,
  getInitials,
} from '../utils/trackingHelpers';
import { cn } from '@/lib/utils';

function ProductivityBar({ value }) {
  const color =
    value >= 70 ? 'bg-green-500' :
    value >= 40 ? 'bg-yellow-500' :
                  'bg-red-500';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums w-8 text-right">{value}%</span>
    </div>
  );
}

function RowSkeleton() {
  return (
    <TableRow>
      {[220, 80, 80, 200, 130, 40].map((w, i) => (
        <TableCell key={i}>
          <div className="h-4 rounded bg-muted animate-pulse" style={{ maxWidth: w }} />
          {i === 0 && <div className="h-3 rounded bg-muted animate-pulse mt-1.5 w-28" />}
        </TableCell>
      ))}
    </TableRow>
  );
}

export default function DailySummaryTable({ employees = [], loading: presenceLoading, onSelectEmployee }) {
  const [rows, setRows] = useState({});
  const [loadingUids, setLoadingUids] = useState(new Set());

  const loadAll = useCallback(async () => {
    if (!employees.length) return;
    const today = todayKey();
    const promises = employees.map(async (emp) => {
      setLoadingUids((s) => new Set([...s, emp.uid]));
      try {
        const activity = await fetchUserActivity(emp.uid, today);
        return [emp.uid, activity];
      } catch {
        return [emp.uid, null];
      } finally {
        setLoadingUids((s) => { const n = new Set(s); n.delete(emp.uid); return n; });
      }
    });
    const results = await Promise.all(promises);
    setRows(Object.fromEntries(results));
  }, [employees]);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (!employees.length && !presenceLoading) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No employees found.
      </p>
    );
  }

  return (
    <TooltipProvider>
      <div>
        {/* Sub-header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-xs text-muted-foreground">
            Today's summary â€” {todayKey()}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadAll}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh activity data</TooltipContent>
          </Tooltip>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px]">Employee</TableHead>
              <TableHead className="w-[100px]">Active</TableHead>
              <TableHead className="w-[100px]">Idle</TableHead>
              <TableHead>Top Apps</TableHead>
              <TableHead className="w-[160px]">Productivity</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(presenceLoading && employees.length === 0
              ? Array.from({ length: 5 })
              : employees
            ).map((emp, i) => {
              if (!emp) return <RowSkeleton key={i} />;

              const activity = rows[emp.uid];
              const isLoading = loadingUids.has(emp.uid);
              const productivity = activity ? computeProductivity(activity.activities) : 0;
              const apps = activity ? topApps(activity.apps, 3) : [];
              const initials = getInitials(emp.name || emp.email || '?');

              return (
                <TableRow key={emp.uid}>
                  {/* Employee */}
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs font-bold bg-muted">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-none truncate">
                          {emp.name || emp.email}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {emp.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Active */}
                  <TableCell>
                    {isLoading ? (
                      <div className="h-4 w-12 rounded bg-muted animate-pulse" />
                    ) : (
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400 tabular-nums">
                        {formatMs(activity?.totalActiveMs ?? 0)}
                      </span>
                    )}
                  </TableCell>

                  {/* Idle */}
                  <TableCell>
                    {isLoading ? (
                      <div className="h-4 w-10 rounded bg-muted animate-pulse" />
                    ) : (
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {formatMs(activity?.totalIdleMs ?? 0)}
                      </span>
                    )}
                  </TableCell>

                  {/* Top apps */}
                  <TableCell>
                    {isLoading ? (
                      <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                    ) : apps.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {apps.map(([appName, ms]) => (
                          <span
                            key={appName}
                            className="inline-flex items-center rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-xs"
                          >
                            {appName}
                            <span className="ml-1 text-muted-foreground">{formatMs(ms)}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No data</span>
                    )}
                  </TableCell>

                  {/* Productivity */}
                  <TableCell>
                    {isLoading ? (
                      <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                    ) : activity ? (
                      <ProductivityBar value={productivity} />
                    ) : (
                      <span className="text-xs text-muted-foreground">No data</span>
                    )}
                  </TableCell>

                  {/* Action */}
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onSelectEmployee?.(emp)}
                        >
                          <User className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View details</TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}

