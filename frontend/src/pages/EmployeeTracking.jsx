/**
 * Employee Tracking Page — Project B integration.
 *
 * Tabs:
 *  1. Live Overview  — real-time presence cards (polls every 30 s)
 *  2. Daily Summary  — per-employee activity table for today
 */

import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import {
  useTeamPresence,
  EmployeeCard,
  DailySummaryTable,
  EmployeeDetailModal,
} from '../features/tracking';
import { STATUS_COLORS, formatRelative } from '../features/tracking/utils/trackingHelpers';

const STATUS_ORDER = { active: 0, idle: 1, paused: 2, offline: 3 };

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'idle', label: 'Idle' },
  { value: 'paused', label: 'Paused' },
  { value: 'offline', label: 'Offline' },
];

function StatusLegend({ data }) {
  const counts = { active: 0, idle: 0, paused: 0, offline: 0 };
  data.forEach((e) => {
    const s = e.effectiveStatus ?? 'offline';
    counts[s] = (counts[s] || 0) + 1;
  });

  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
      {Object.entries(counts).map(([status, count]) => (
        <Chip
          key={status}
          size="small"
          icon={
            <FiberManualRecordIcon
              sx={{ fontSize: '10px !important', color: `${STATUS_COLORS[status]} !important` }}
            />
          }
          label={`${status.charAt(0).toUpperCase() + status.slice(1)}: ${count}`}
          variant="outlined"
          sx={{ fontSize: 11, height: 24 }}
        />
      ))}
    </Box>
  );
}

export default function EmployeeTracking() {
  const { data, loading, error, lastUpdated, refresh } = useTeamPresence();

  // Detail modal state
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // UI state
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const handleOpenDetail = (employee) => {
    setSelectedEmployee(employee);
    setModalOpen(true);
  };

  const handleCloseDetail = () => {
    setModalOpen(false);
    setSelectedEmployee(null);
  };

  // Filtered & sorted data
  const filteredData = useMemo(() => {
    let result = [...(data ?? [])];

    if (statusFilter !== 'all') {
      result = result.filter((e) => e.effectiveStatus === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          (e.name ?? '').toLowerCase().includes(q) ||
          (e.email ?? '').toLowerCase().includes(q)
      );
    }

    // Sort by status priority, then name
    result.sort((a, b) => {
      const sA = STATUS_ORDER[a.effectiveStatus] ?? 99;
      const sB = STATUS_ORDER[b.effectiveStatus] ?? 99;
      if (sA !== sB) return sA - sB;
      return (a.name ?? '').localeCompare(b.name ?? '');
    });

    return result;
  }, [data, search, statusFilter]);

  // Employees for the summary table (all, no filter)
  const allEmployees = useMemo(
    () => [...(data ?? [])].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    [data]
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Page header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Employee Activity
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Real-time via Firestore onSnapshot ·{' '}
            {lastUpdated ? `Updated ${formatRelative(lastUpdated.getTime())}` : 'Loading…'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {!loading && data.length > 0 && <StatusLegend data={data} />}
          <Tooltip title="Refresh presence">
            <span>
              <IconButton size="small" onClick={refresh} disabled={loading}>
                {loading ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ borderBottom: '1px solid', borderColor: 'divider', mb: 2 }}
      >
        <Tab label="Live Overview" sx={{ textTransform: 'none', fontWeight: 600 }} />
        <Tab label="Daily Summary" sx={{ textTransform: 'none', fontWeight: 600 }} />
      </Tabs>

      {/* Error banner */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load presence data: {error}
        </Alert>
      )}

      {/* ── Tab 0: Live Overview ────────────────────────────────────── */}
      {tab === 0 && (
        <>
          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Search employees…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 220 }}
            />

            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUS_FILTER_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Loading skeleton */}
          {loading && data.length === 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          )}

          {/* Empty state */}
          {!loading && filteredData.length === 0 && (
            <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
              {data.length === 0 ? 'No employees found in Firestore.' : 'No employees match the current filter.'}
            </Typography>
          )}

          {/* Cards grid */}
          <Grid container spacing={2}>
            {filteredData.map((emp) => (
              <Grid key={emp.uid} item xs={12} sm={6} md={4} lg={3}>
                <EmployeeCard employee={emp} onClick={handleOpenDetail} />
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* ── Tab 1: Daily Summary ───────────────────────────────────── */}
      {tab === 1 && (
        <>
          {loading && allEmployees.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <DailySummaryTable
              employees={allEmployees}
              onSelectEmployee={handleOpenDetail}
            />
          )}
        </>
      )}

      {/* Detail modal */}
      <EmployeeDetailModal
        employee={selectedEmployee}
        open={modalOpen}
        onClose={handleCloseDetail}
      />
    </Box>
  );
}
