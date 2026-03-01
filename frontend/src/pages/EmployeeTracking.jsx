/**
 * Employee Tracking Page â€” Project B integration.
 *
 * Tabs:
 *  1. Live Overview  â€” real-time presence table
 *  2. Daily Summary  â€” per-employee activity table for today
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  useTeamPresence,
  EmployeeDetailModal,
} from '../features/tracking';
import { fetchUserActivity } from '../services/employeeTracking';
import {
  STATUS_COLORS,
  formatMs,
  formatRelative,
  getInitials,
  computeProductivity,
  topApps,
  todayKey,
} from '../features/tracking/utils/trackingHelpers';
import { cn } from '@/lib/utils';

const STATUS_ORDER = { active: 0, idle: 1, paused: 2, offline: 3 };

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'idle', label: 'Idle' },
  { value: 'paused', label: 'Paused' },
  { value: 'offline', label: 'Offline' },
];

/* â”€â”€ Status dot â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function StatusDot({ status = 'offline' }) {
  const color = STATUS_COLORS[status] ?? STATUS_COLORS.offline;
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{
        width: 8,
        height: 8,
        backgroundColor: color,
        boxShadow: status === 'active' ? `0 0 0 3px ${color}33` : undefined,
      }}
    />
  );
}

/* â”€â”€ Status badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const STATUS_CLASS = {
  active:  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  idle:    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  paused:  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  offline: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
};

function StatusBadge({ status = 'offline' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold',
        STATUS_CLASS[status] ?? STATUS_CLASS.offline,
      )}
    >
      <StatusDot status={status} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/* â”€â”€ Category badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function CategoryBadge({ category = 'Other' }) {
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Other;
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {category || 'Other'}
    </span>
  );
}

/* â”€â”€ Status legend counts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function StatusCounts({ data }) {
  const counts = { active: 0, idle: 0, paused: 0, offline: 0 };
  data.forEach((e) => { counts[e.effectiveStatus ?? 'offline'] = (counts[e.effectiveStatus ?? 'offline'] || 0) + 1; });
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(counts).map(([status, count]) => (
        <span
          key={status}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
            STATUS_CLASS[status] ?? STATUS_CLASS.offline,
          )}
        >
          <StatusDot status={status} />
          {status.charAt(0).toUpperCase() + status.slice(1)}: {count}
        </span>
      ))}
    </div>
  );
}


/* â”€â”€ Productivity bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€ Live overview + daily summary table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function LiveOverviewTable({ data, loading, onOpen, recentlyUpdated }) {
  const [activityRows, setActivityRows] = useState({});
  const [loadingUids, setLoadingUids] = useState(new Set());
  const prevUidsRef = useRef('');

  // Only re-fetch activity when the set of employee UIDs changes
  // (not on every presence status update, which would cause N requests per push)
  const uidKey = useMemo(() => data.map((e) => e.uid).sort().join(','), [data]);

  const loadAll = useCallback(async () => {
    if (!data.length) return;
    const today = todayKey();
    const promises = data.map(async (emp) => {
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
    setActivityRows(Object.fromEntries(results));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uidKey]);

  useEffect(() => {
    if (uidKey && uidKey !== prevUidsRef.current) {
      prevUidsRef.current = uidKey;
      loadAll();
    }
  }, [uidKey, loadAll]);

  const COL_COUNT = 7;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[220px]">Employee</TableHead>
          <TableHead className="w-[110px]">Status</TableHead>
          <TableHead className="w-[90px]">Active</TableHead>
          <TableHead className="w-[80px]">Idle</TableHead>
          <TableHead>Top Apps</TableHead>
          <TableHead className="w-[160px]">Productivity</TableHead>
          <TableHead className="w-[60px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading && data.length === 0 && (
          Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: COL_COUNT }).map((__, j) => (
                <TableCell key={j}>
                  <div className="h-4 rounded bg-muted animate-pulse" />
                </TableCell>
              ))}
            </TableRow>
          ))
        )}

        {!loading && data.length === 0 && (
          <TableRow>
            <TableCell colSpan={COL_COUNT} className="py-12 text-center text-muted-foreground text-sm">
              No employees match the current filter.
            </TableCell>
          </TableRow>
        )}

        {data.map((emp) => {
          const { name, email, effectiveStatus } = emp;
          const initials = getInitials(name || email || '?');
          const statusColor = STATUS_COLORS[effectiveStatus] ?? STATUS_COLORS.offline;
          const isFlashing = recentlyUpdated?.has(emp.uid);
          const activity = activityRows[emp.uid];
          const isLoadingActivity = loadingUids.has(emp.uid);
          const productivity = activity ? computeProductivity(activity.activities) : 0;
          const apps = activity ? topApps(activity.apps, 3) : [];

          return (
            <TableRow
              key={emp.uid}
              className={cn(
                'cursor-pointer transition-colors duration-700',
                isFlashing && 'bg-primary/5 dark:bg-primary/10',
              )}
              onClick={() => onOpen(emp)}
            >
              {/* Employee */}
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback
                      className="text-xs font-bold"
                      style={{ backgroundColor: `${statusColor}22`, color: statusColor }}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-none truncate">{name || email}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{email}</p>
                  </div>
                </div>
              </TableCell>

              {/* Status */}
              <TableCell>
                <StatusBadge status={effectiveStatus} />
              </TableCell>

              {/* Active */}
              <TableCell>
                {isLoadingActivity ? (
                  <div className="h-4 w-12 rounded bg-muted animate-pulse" />
                ) : (
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400 tabular-nums">
                    {formatMs(activity?.totalActiveMs ?? 0)}
                  </span>
                )}
              </TableCell>

              {/* Idle */}
              <TableCell>
                {isLoadingActivity ? (
                  <div className="h-4 w-10 rounded bg-muted animate-pulse" />
                ) : (
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {formatMs(activity?.totalIdleMs ?? 0)}
                  </span>
                )}
              </TableCell>

              {/* Top Apps */}
              <TableCell>
                {isLoadingActivity ? (
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
                {isLoadingActivity ? (
                  <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                ) : activity ? (
                  <ProductivityBar value={productivity} />
                ) : (
                  <span className="text-xs text-muted-foreground">No data</span>
                )}
              </TableCell>

              {/* View */}
              <TableCell onClick={(e) => { e.stopPropagation(); onOpen(emp); }}>
                <Button size="sm" className="h-7 px-2 text-xs bg-[#1a73e8] hover:bg-[#185abc] text-white dark:bg-blue-600 dark:hover:bg-blue-700">
                  View
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/* â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function EmployeeTracking() {
  const { data, loading, error, lastUpdated, recentlyUpdated, refresh } = useTeamPresence();

  // Tick every 30 s so "Updated X ago" stays fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const handleOpenDetail = (employee) => { setSelectedEmployee(employee); setModalOpen(true); };
  const handleCloseDetail = () => { setModalOpen(false); setSelectedEmployee(null); };

  const filteredData = useMemo(() => {
    let result = [...(data ?? [])];
    if (statusFilter !== 'all') result = result.filter((e) => e.effectiveStatus === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) => (e.name ?? '').toLowerCase().includes(q) || (e.email ?? '').toLowerCase().includes(q),
      );
    }
    result.sort((a, b) => {
      const sA = STATUS_ORDER[a.effectiveStatus] ?? 99;
      const sB = STATUS_ORDER[b.effectiveStatus] ?? 99;
      if (sA !== sB) return sA - sB;
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
    return result;
  }, [data, search, statusFilter]);

  return (
    <TooltipProvider>
      <div className="p-4 md:p-6 space-y-4">

        {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Employee Activity</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time via Firestore onSnapshot Â·{' '}
              {lastUpdated ? (
                <span>
                  Updated{' '}
                  <span
                    key={lastUpdated.getTime()}
                    className="text-foreground font-medium animate-in fade-in duration-300"
                  >
                    {formatRelative(lastUpdated.getTime())}
                  </span>
                </span>
              ) : 'Loading…'}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {!loading && data.length > 0 && <StatusCounts data={data} />}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={refresh} disabled={loading}>
                  <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* â”€â”€ Error â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Failed to load presence data: {error}
          </div>
        )}

        <Card>
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px] max-w-[260px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search employees…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-[150px] text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-sm">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {search || statusFilter !== 'all' ? (
                <span className="text-xs text-muted-foreground">
                  {filteredData.length} of {data.length} employees
                </span>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <LiveOverviewTable data={filteredData} loading={loading} onOpen={handleOpenDetail} recentlyUpdated={recentlyUpdated} />
          </CardContent>
        </Card>
        {/* â”€â”€ Detail modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <EmployeeDetailModal employee={selectedEmployee} open={modalOpen} onClose={handleCloseDetail} />
      </div>
    </TooltipProvider>
  );
}

