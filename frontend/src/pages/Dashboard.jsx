import { useState } from 'react';
import Chart from 'react-apexcharts';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Code as CodeIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useDailyActivityTrends, useLanguageDistribution } from '../hooks/useAnalytics';

// ─────────────────────────────────────────────────────────────
// Shared UI Components (MUI versions)
// ─────────────────────────────────────────────────────────────

function StatCard({ title, value, subtitle, icon, loading }) {
  return (
    <Card variant="outlined" sx={{ height: '100%', borderRadius: 1 }}>
      <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, display: 'block', mb: 0.5 }}>
            {title}
          </Typography>
          {loading ? (
            <CircularProgress size={24} sx={{ my: 1 }} />
          ) : (
            <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 500 }}>
              {value}
            </Typography>
          )}
          {subtitle && (
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ p: 1, bgcolor: '#f5f7f9', borderRadius: 1.5, color: 'text.secondary' }}>
          {icon}
        </Box>
      </CardContent>
    </Card>
  );
}

function SectionHeader({ title, description, action }) {
  return (
    <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 500 }}>
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {description}
          </Typography>
        )}
      </Box>
      {action && <Box>{action}</Box>}
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────
// Dashboard Components
// ─────────────────────────────────────────────────────────────

function DashboardStats({ filter, overview, loading }) {
  const periodLabel = filter === 'this-month' ? 'this month' : filter === 'this-week' ? 'this week' : filter;

  return (
    <Box sx={{ mb: 6 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Contributors"
            value={overview?.activeContributors || 0}
            subtitle={periodLabel}
            loading={loading}
            icon={<PeopleIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Issues Completed"
            value={overview?.totalIssuesCompleted || 0}
            subtitle={periodLabel}
            loading={loading}
            icon={<CheckCircleIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Commits"
            value={overview?.totalCommits || 0}
            subtitle={periodLabel}
            loading={loading}
            icon={<CodeIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Completion Rate"
            value={overview?.averageCompletionRate || 0}
            subtitle={periodLabel}
            loading={loading}
            icon={<TrendingUpIcon />}
          />
        </Grid>
      </Grid>
    </Box>
  );
}

function DailyActivityChart({ trends, loading }) {
  const chartData = {
    options: {
      chart: {
        type: 'area',
        toolbar: { show: false },
        fontFamily: 'inherit',
        stacked: false,
      },
      dataLabels: { enabled: false },
      stroke: {
        curve: 'smooth',
        width: 2,
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.4,
          opacityTo: 0.1,
          stops: [0, 100],
        },
      },
      xaxis: {
        categories: trends.map(item => {
          const date = new Date(item.date);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }),
        labels: {
          style: {
            colors: '#5f6368',
            fontSize: '11px',
          },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: {
            colors: '#5f6368',
            fontSize: '11px',
          },
        },
      },
      colors: ['#1a73e8', '#34a853'],
      legend: {
        position: 'top',
        fontSize: '12px',
        labels: { colors: '#5f6368' },
        markers: { width: 10, height: 10, radius: 2 },
      },
      grid: {
        borderColor: '#e8eaed',
        strokeDashArray: 4,
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
      },
    },
    series: [
      { name: 'Commits', data: trends.map(item => item.commits || 0) },
      { name: 'Issues Completed', data: trends.map(item => item.issues || 0) },
    ],
  };

  return (
    <Box sx={{ mb: 6 }}>
      <SectionHeader
        title="Daily Activity Trends"
        description="Last 10 days of commits and issues completed"
      />
      <Card variant="outlined" sx={{ borderRadius: 1 }}>
        <CardContent>
          {loading ? (
            <Box sx={{ h: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress size={30} />
            </Box>
          ) : trends.length === 0 ? (
            <Box sx={{ h: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body2" color="text.secondary">No data available</Typography>
            </Box>
          ) : (
            <Chart
              options={chartData.options}
              series={chartData.series}
              type="area"
              height={300}
            />
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

function LanguageDistributionChart({ languages, loading }) {
  const topLanguages = languages.slice(0, 10);

  const chartData = {
    options: {
      chart: {
        type: 'donut',
        toolbar: { show: false },
        fontFamily: 'inherit',
      },
      labels: topLanguages.map(lang => lang.language),
      colors: ['#1a73e8', '#34a853', '#ea4335', '#fbbc04', '#4285f4', '#9c27b0', '#00bcd4', '#ff9800', '#4caf50', '#e91e63'],
      legend: {
        position: 'bottom',
        fontSize: '12px',
        labels: { colors: '#5f6368' },
      },
      dataLabels: {
        enabled: true,
        formatter: (val) => Math.round(val) + '%',
      },
      tooltip: {
        theme: 'light',
        y: { formatter: (val) => val + ' files' },
      },
    },
    series: topLanguages.map(lang => lang.count),
  };

  return (
    <Box sx={{ mb: 6 }}>
      <SectionHeader
        title="Language Distribution"
        description="Top programming languages used across repositories"
      />
      <Card variant="outlined" sx={{ borderRadius: 1 }}>
        <CardContent>
          {loading ? (
            <Box sx={{ h: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress size={30} />
            </Box>
          ) : topLanguages.length === 0 ? (
            <Box sx={{ h: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body2" color="text.secondary">No data available</Typography>
            </Box>
          ) : (
            <Chart
              options={chartData.options}
              series={chartData.series}
              type="donut"
              height={350}
            />
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

function FilterSelect({ value, onChange }) {
  return (
    <FormControl size="small" sx={{ minWidth: 150 }}>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        displayEmpty
        sx={{ bgcolor: 'white' }}
      >
        <MenuItem value="today">Today</MenuItem>
        <MenuItem value="yesterday">Yesterday</MenuItem>
        <MenuItem value="this-week">This Week</MenuItem>
        <MenuItem value="last-week">Last Week</MenuItem>
        <MenuItem value="this-month">This Month</MenuItem>
      </Select>
    </FormControl>
  );
}

// ─────────────────────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────────────────────

function Dashboard() {
  return (
    <Box sx={{ width: '100%', minHeight: '100%', bgcolor: 'white' }}>
      {/* Page Header */}
      <Box sx={{
        p: 3,
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Box>
          <Typography variant="h6" sx={{ color: '#333', fontWeight: 500 }}>
            Dashboard
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Welcome to THY HR System
          </Typography>
        </Box>
      </Box>

      {/* Page Content */}
      <Box sx={{ p: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <Typography color="text.secondary">
          Dashboard content is currently hidden.
        </Typography>
      </Box>
    </Box>
  );
}

export default Dashboard;

