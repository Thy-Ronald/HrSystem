/**
 * EmployeeDetailModal
 * Full detail view for a single employee:
 *  - Activity timeline
 *  - App usage bar chart
 *  - Hourly active/idle stacked bar chart
 */

import { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReactApexChart from 'react-apexcharts';
import { useState } from 'react';
import CategoryBadge from './CategoryBadge';
import {
  formatMs,
  formatRelative,
  computeProductivity,
  topApps,
  buildHourlyBuckets,
  todayKey,
  CATEGORY_COLORS,
} from '../utils/trackingHelpers';
import { useEmployeeActivity } from '../hooks/useEmployeeActivity';

function AppBarChart({ apps = {} }) {
  const sorted = Object.entries(apps)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const labels = sorted.map(([name]) => (name.length > 18 ? name.slice(0, 17) + '…' : name));
  const values = sorted.map(([, ms]) => Math.round(ms / 60_000)); // minutes

  const options = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
    dataLabels: { enabled: false },
    xaxis: { title: { text: 'Minutes' }, labels: { style: { fontSize: '11px' } } },
    yaxis: { labels: { style: { fontSize: '11px' } } },
    colors: ['#3b82f6'],
    grid: { strokeDashArray: 3 },
    tooltip: {
      y: { formatter: (v) => `${v} min` },
    },
  };

  return (
    <ReactApexChart
      type="bar"
      options={{ ...options, xaxis: { ...options.xaxis, categories: labels } }}
      series={[{ name: 'Duration', data: values }]}
      height={Math.max(180, sorted.length * 28)}
    />
  );
}

function HourlyChart({ activities = [] }) {
  const buckets = buildHourlyBuckets(activities);
  const hours = buckets.map((b) => `${String(b.hour).padStart(2, '0')}:00`);
  const activeMin = buckets.map((b) => Math.round(b.activeMs / 60_000));
  const idleMin = buckets.map((b) => Math.round(b.idleMs / 60_000));

  const options = {
    chart: { type: 'bar', stacked: true, toolbar: { show: false } },
    plotOptions: { bar: { columnWidth: '60%', borderRadius: 2 } },
    dataLabels: { enabled: false },
    xaxis: { categories: hours, labels: { style: { fontSize: '10px' }, rotate: -45 } },
    yaxis: { title: { text: 'Minutes' } },
    legend: { position: 'top' },
    colors: ['#22c55e', '#fbbf24'],
    grid: { strokeDashArray: 3 },
    tooltip: { y: { formatter: (v) => `${v} min` } },
  };

  return (
    <ReactApexChart
      type="bar"
      options={options}
      series={[
        { name: 'Active', data: activeMin },
        { name: 'Idle', data: idleMin },
      ]}
      height={220}
    />
  );
}

function ActivityTimeline({ activities = [] }) {
  const sorted = [...activities].sort((a, b) => (b.end ?? 0) - (a.end ?? 0));

  if (!sorted.length) {
    return (
      <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
        No activity recorded for today.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {sorted.map((a, i) => {
        const start = a.start ? new Date(a.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
        const end = a.end ? new Date(a.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
        return (
          <Box
            key={i}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1.5,
              p: 1,
              borderRadius: 1,
              bgcolor: a.isIdle ? 'action.hover' : 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            {/* Time */}
            <Box sx={{ minWidth: 100, textAlign: 'right', flexShrink: 0 }}>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                {start} – {end}
              </Typography>
            </Box>

            {/* App name + title */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: a.isIdle ? 'text.disabled' : 'text.primary',
                }}
              >
                {a.isIdle ? 'Idle' : (a.app || 'Unknown')}
              </Typography>
              {a.title && !a.isIdle && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: 'block',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: 11,
                  }}
                >
                  {a.title}
                </Typography>
              )}
            </Box>

            {/* Category + duration */}
            <Box sx={{ flexShrink: 0, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
              {!a.isIdle && a.category && <CategoryBadge category={a.category} />}
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                {formatMs(a.durationMs)}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

const TABS = ['Timeline', 'App Usage', 'Hourly Chart'];

export default function EmployeeDetailModal({ employee, open, onClose }) {
  const { data, loading, error, load, clear } = useEmployeeActivity();
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (open && employee) {
      load(employee.uid, todayKey());
      setTab(0);
    } else if (!open) {
      clear();
    }
  }, [open, employee]);

  const productivity = data ? computeProductivity(data.activities) : 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2, maxHeight: '90vh' } }}
    >
      <DialogTitle component="div" sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {employee?.name || employee?.email}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {employee?.email} · Today {todayKey()}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {!loading && (
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={() => load(employee?.uid, todayKey())}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <IconButton size="small" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Summary stats */}
        {data && (
          <Box sx={{ display: 'flex', gap: 3, mt: 1.5, flexWrap: 'wrap' }}>
            <StatPill label="Active" value={formatMs(data.totalActiveMs)} color="success.main" />
            <StatPill label="Idle" value={formatMs(data.totalIdleMs)} color="warning.main" />
            <StatPill label="Productivity" value={`${productivity}%`} color={productivity >= 70 ? 'success.main' : productivity >= 40 ? 'warning.main' : 'error.main'} />
            <StatPill label="Activities" value={data.activities?.length ?? 0} />
          </Box>
        )}
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && !data && (
          <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
            No activity data for today yet.
          </Typography>
        )}

        {!loading && !error && data && (
          <>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              sx={{ px: 3, borderBottom: '1px solid', borderColor: 'divider' }}
            >
              {TABS.map((t, i) => (
                <Tab key={t} label={t} value={i} sx={{ textTransform: 'none', fontWeight: 600 }} />
              ))}
            </Tabs>

            <Box sx={{ p: 3, overflowY: 'auto', maxHeight: 'calc(90vh - 220px)' }}>
              {tab === 0 && <ActivityTimeline activities={data.activities} />}
              {tab === 1 && <AppBarChart apps={data.apps} />}
              {tab === 2 && <HourlyChart activities={data.activities} />}
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatPill({ label, value, color = 'text.primary' }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, color }}>
        {value}
      </Typography>
    </Box>
  );
}
