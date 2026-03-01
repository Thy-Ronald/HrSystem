/**
 * EmployeeDetailModal
 * Full detail view for a single employee:
 *  - Activity timeline
 *  - App usage bar chart
 *  - Hourly active/idle stacked bar chart
 */

import { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReactApexChart from 'react-apexcharts';
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
import { fetchUserScreenshots } from '../../../services/employeeTracking';

const APP_BAR_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#06b6d4', '#f97316', '#6366f1', '#84cc16', '#ec4899'];

function AppBarChart({ apps = {}, activities = [] }) {
  // Derive app usage from activities if the apps map is empty
  const appsMap = Object.keys(apps).length > 0
    ? apps
    : activities.reduce((acc, a) => {
        if (!a.isIdle && a.app) {
          acc[a.app] = (acc[a.app] || 0) + (a.durationMs || 0);
        }
        return acc;
      }, {});

  const sorted = Object.entries(appsMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  if (!sorted.length) {
    return (
      <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
        No app usage data for today.
      </Typography>
    );
  }

  const maxMs = sorted[0][1];
  const totalMs = sorted.reduce((acc, [, m]) => acc + m, 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1.5, fontSize: 11, color: 'text.secondary' }}>
        Application Usage
      </Typography>
      {sorted.map(([appName, ms], i) => {
        const color = APP_BAR_COLORS[i % APP_BAR_COLORS.length];
        const pct = Math.round((ms / maxMs) * 100);
        const minutes = Math.floor(ms / 60_000);
        const seconds = Math.round((ms % 60_000) / 1000);
        const label = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
        const sharePct = Math.round((ms / totalMs) * 100);

        return (
          <Box key={appName}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 3, height: 18, borderRadius: 1, bgcolor: color, flexShrink: 0 }} />
                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: 13 }}>
                  {appName}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0, ml: 2 }}>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' }}>
                  {label}
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 12, color: 'text.secondary', minWidth: 32, textAlign: 'right' }}>
                  {sharePct}%
                </Typography>
              </Box>
            </Box>
            <Box sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(128,128,128,0.25)', overflow: 'hidden' }}>
              <Box
                sx={{
                  height: '100%',
                  width: `${pct}%`,
                  borderRadius: 3,
                  bgcolor: color,
                  transition: 'width 0.6s ease',
                }}
              />
            </Box>
          </Box>
        );
      })}
    </Box>
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

const TABS = ['Timeline', 'App Usage', 'Hourly Chart', 'Screenshots'];

// ─── Screenshots tab ───────────────────────────────────────────────────────────
function ScreenshotsTab({ uid }) {
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lightbox, setLightbox] = useState(null); // url of enlarged image

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchUserScreenshots(uid, todayKey());
      setScreenshots(result ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
    );
  }

  if (!screenshots.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
        <Typography color="text.secondary">No screenshots for today.</Typography>
      </Box>
    );
  }

  const fmtTime = (ts) =>
    ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Lightbox overlay */}
      {lightbox && (
        <Box
          onClick={() => setLightbox(null)}
          sx={{
            position: 'fixed', inset: 0, zIndex: 9999,
            bgcolor: 'rgba(0,0,0,0.9)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <Box
            component="img"
            src={lightbox.url}
            onClick={(e) => e.stopPropagation()}
            sx={{ maxWidth: '92vw', maxHeight: '85vh', borderRadius: 1.5, boxShadow: 24 }}
          />
          {lightbox.ts && (
            <Typography sx={{ mt: 1.5, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              {new Date(lightbox.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </Typography>
          )}
        </Box>
      )}

      {/* Count header */}
      <Box sx={{ px: 2.5, pt: 1.5, pb: 1, flexShrink: 0 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          {screenshots.length} screenshot{screenshots.length !== 1 ? 's' : ''} today
        </Typography>
      </Box>

      {/* Scrollable grid */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 2.5, pb: 2.5 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
          {screenshots.map((s) => (
            <Box
              key={s.id}
              onClick={() => s.url && setLightbox({ url: s.url, ts: s.timestamp })}
              sx={{
                borderRadius: 2, overflow: 'hidden',
                border: '1px solid', borderColor: 'divider',
                cursor: s.url ? 'zoom-in' : 'default',
                bgcolor: 'background.paper',
                boxShadow: 1,
                transition: 'box-shadow 0.15s, transform 0.15s',
                '&:hover': s.url ? {
                  boxShadow: 6,
                  transform: 'translateY(-2px)',
                  '& .ss-overlay': { opacity: 1 },
                } : {},
              }}
            >
              {/* 16:9 image */}
              <Box sx={{ position: 'relative', width: '100%', paddingTop: '56.25%', bgcolor: 'action.hover' }}>
                {s.url ? (
                  <>
                    <Box
                      component="img"
                      src={s.url}
                      alt="Screenshot"
                      sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    <Box
                      className="ss-overlay"
                      sx={{
                        position: 'absolute', inset: 0,
                        bgcolor: 'rgba(0,0,0,0.45)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: 0, transition: 'opacity 0.15s',
                      }}
                    >
                      <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
                        🔍 View full size
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="caption" color="text.disabled">No image</Typography>
                  </Box>
                )}
              </Box>

              {/* Timestamp footer */}
              <Box sx={{ px: 1.5, py: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12, fontWeight: 500 }}>
                  🕐 {fmtTime(s.timestamp)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

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
      PaperProps={{ sx: { borderRadius: 2, height: '85vh', maxHeight: '85vh', display: 'flex', flexDirection: 'column' } }}
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

      <DialogContent sx={{ p: 0, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Tabs always visible */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ px: 3, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}
        >
          {TABS.map((t, i) => (
            <Tab key={t} label={t} value={i} sx={{ textTransform: 'none', fontWeight: 600 }} />
          ))}
        </Tabs>

        {/* Tab content */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>

          {/* Screenshots tab — always works, independent of activity */}
          {tab === 3 && <ScreenshotsTab uid={employee?.uid} />}

          {/* Activity tabs — show loading / error / no-data accordingly */}
          {tab !== 3 && loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
              <CircularProgress />
            </Box>
          )}
          {tab !== 3 && !loading && error && (
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, p: 2 }}>
              <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>
            </Box>
          )}
          {tab !== 3 && !loading && !error && !data && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
              <Typography color="text.secondary">No activity data for today yet.</Typography>
            </Box>
          )}
          {tab !== 3 && !loading && !error && data && (
            <Box sx={{ p: 3, overflowY: 'auto', flex: 1, minHeight: 0 }}>
              {tab === 0 && <ActivityTimeline activities={data.activities} />}
              {tab === 1 && <AppBarChart apps={data.apps} activities={data.activities} />}
              {tab === 2 && <HourlyChart activities={data.activities} />}
            </Box>
          )}
        </Box>
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
