/**
 * DailySummaryTable
 * Shows each employee's totalActiveMs, totalIdleMs, top 3 apps, and productivity%
 * by fetching today's activity document for every person.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Typography,
  LinearProgress,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonIcon from '@mui/icons-material/Person';
import { fetchUserActivity } from '../../../services/employeeTracking';
import {
  formatMs,
  computeProductivity,
  topApps,
  todayKey,
} from '../utils/trackingHelpers';

export default function DailySummaryTable({ employees = [], onSelectEmployee }) {
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
        setLoadingUids((s) => {
          const next = new Set(s);
          next.delete(emp.uid);
          return next;
        });
      }
    });

    const results = await Promise.all(promises);
    setRows(Object.fromEntries(results));
  }, [employees]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  if (!employees.length) {
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        No employees found.
      </Typography>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Today's summary — {todayKey()}
        </Typography>
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={loadAll}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Active Time</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Idle Time</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 180 }}>Top Apps</TableCell>
              <TableCell sx={{ fontWeight: 700, minWidth: 120 }}>Productivity</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.map((emp) => {
              const activity = rows[emp.uid];
              const isLoading = loadingUids.has(emp.uid);
              const productivity = activity ? computeProductivity(activity.activities) : 0;
              const apps = activity ? topApps(activity.apps, 3) : [];

              return (
                <TableRow key={emp.uid} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {emp.name || emp.email}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {emp.email}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    {isLoading ? (
                      <CircularProgress size={12} />
                    ) : (
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                        {formatMs(activity?.totalActiveMs ?? 0)}
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell>
                    {isLoading ? null : (
                      <Typography variant="body2" color="text.secondary">
                        {formatMs(activity?.totalIdleMs ?? 0)}
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {apps.map(([appName, ms]) => (
                        <Chip
                          key={appName}
                          size="small"
                          label={`${appName} · ${formatMs(ms)}`}
                          sx={{ fontSize: 10, height: 20 }}
                        />
                      ))}
                      {!isLoading && apps.length === 0 && (
                        <Typography variant="caption" color="text.disabled">
                          No data
                        </Typography>
                      )}
                    </Box>
                  </TableCell>

                  <TableCell sx={{ minWidth: 120 }}>
                    {!isLoading && activity && (
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={productivity}
                            sx={{
                              flex: 1,
                              height: 6,
                              borderRadius: 3,
                              bgcolor: 'action.hover',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                bgcolor: productivity >= 70 ? 'success.main' : productivity >= 40 ? 'warning.main' : 'error.main',
                              },
                            }}
                          />
                          <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 30 }}>
                            {productivity}%
                          </Typography>
                        </Box>
                      </Box>
                    )}
                    {!isLoading && !activity && (
                      <Typography variant="caption" color="text.disabled">
                        No data
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => onSelectEmployee?.(emp)}>
                        <PersonIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}
