import { useState } from 'react';
import Chart from 'react-apexcharts';
import { useDailyActivityTrends, useLanguageDistribution } from '../hooks/useAnalytics';

// ─────────────────────────────────────────────────────────────
// Shared UI Components
// ─────────────────────────────────────────────────────────────

function StatCard({ title, value, subtitle, icon, loading }) {
  return (
    <div className="bg-white border border-[#dadce0] rounded-xl p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-[#5f6368] mb-1">{title}</p>
          <p className="text-3xl font-normal text-[#202124]">
            {loading ? '...' : value}
          </p>
          {subtitle && (
            <p className="text-xs text-[#70757a] mt-2 flex items-center gap-1">
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-[#f8f9fa] rounded-full text-[#5f6368]">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, description, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
      <div>
        <h2 className="text-xl font-normal text-[#202124]">{title}</h2>
        {description && (
          <p className="text-sm text-[#5f6368] mt-1">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Dashboard Components
// ─────────────────────────────────────────────────────────────

function DashboardStats({ filter, overview, loading }) {
  const periodLabel = filter === 'this-month' ? 'this month' : filter === 'this-week' ? 'this week' : filter;

  return (
    <section className="mb-10">
      <SectionHeader
        title="Overview"
        description={`Performance snapshot for ${periodLabel}`}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Contributors"
          value={overview?.activeContributors || 0}
          subtitle={`${periodLabel}`}
          loading={loading}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <StatCard
          title="Issues Completed"
          value={overview?.totalIssuesCompleted || 0}
          subtitle={`${periodLabel}`}
          loading={loading}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />
        <StatCard
          title="Total Commits"
          value={overview?.totalCommits || 0}
          subtitle={`${periodLabel}`}
          loading={loading}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          }
        />
        <StatCard
          title="Completion Rate"
          value={overview?.averageCompletionRate || 0}
          subtitle={`${periodLabel}`}
          loading={loading}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
      </div>
    </section>
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
            fontSize: '12px',
          },
        },
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: '#5f6368',
            fontSize: '12px',
          },
        },
      },
      colors: ['#1a73e8', '#34a853'],
      legend: {
        position: 'top',
        fontSize: '14px',
        labels: {
          colors: '#5f6368',
        },
        markers: {
          width: 12,
          height: 12,
          radius: 6,
        },
      },
      grid: {
        borderColor: '#e8eaed',
        strokeDashArray: 4,
        xaxis: {
          lines: {
            show: false,
          },
        },
        yaxis: {
          lines: {
            show: true,
          },
        },
      },
      tooltip: {
        theme: 'light',
        shared: true,
        intersect: false,
      },
    },
    series: [
      {
        name: 'Commits',
        data: trends.map(item => item.commits || 0),
      },
      {
        name: 'Issues Completed',
        data: trends.map(item => item.issues || 0),
      },
    ],
  };

  return (
    <section className="mb-10">
      <SectionHeader
        title="Daily Activity Trends"
        description="Last 10 days of commits and issues completed"
      />
      <div className="bg-white border border-[#dadce0] rounded-xl p-6">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-[#70757a]">Loading chart data...</div>
          </div>
        ) : trends.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-[#70757a]">No data available</div>
          </div>
        ) : (
          <Chart
            options={chartData.options}
            series={chartData.series}
            type="area"
            height={300}
          />
        )}
      </div>
    </section>
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
        labels: {
          colors: '#5f6368',
        },
      },
      dataLabels: {
        enabled: true,
        formatter: function (val) {
          return Math.round(val) + '%';
        },
      },
      tooltip: {
        theme: 'light',
        y: {
          formatter: function (val) {
            return val + ' files';
          },
        },
      },
    },
    series: topLanguages.map(lang => lang.count),
  };

  return (
    <section className="mb-10">
      <SectionHeader
        title="Language Distribution"
        description="Top programming languages used across repositories"
      />
      <div className="bg-white border border-[#dadce0] rounded-xl p-6">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-[#70757a]">Loading chart data...</div>
          </div>
        ) : topLanguages.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-[#70757a]">No language data available</div>
          </div>
        ) : (
          <Chart
            options={chartData.options}
            series={chartData.series}
            type="donut"
            height={350}
          />
        )}
      </div>
    </section>
  );
}

function FilterDropdown({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-1.5 text-sm border border-[#dadce0] rounded-lg bg-white text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8]"
    >
      <option value="today">Today</option>
      <option value="yesterday">Yesterday</option>
      <option value="this-week">This Week</option>
      <option value="last-week">Last Week</option>
      <option value="this-month">This Month</option>
    </select>
  );
}

// ─────────────────────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────────────────────

function Dashboard() {
  const [filter, setFilter] = useState('this-month');
  const { data: trends, loading: trendsLoading } = useDailyActivityTrends(filter);
  const { data: languages, loading: languagesLoading } = useLanguageDistribution('all');

  return (
    <main className="flex flex-col h-full bg-[#ffffff]">
      <div className="flex-1 overflow-auto p-4 sm:p-6 md:p-10">
        <div className="max-w-7xl mx-auto">
          <header className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-normal text-[#202124]">Analytics Dashboard</h1>
              <p className="text-sm text-[#5f6368] mt-1">
                Team performance metrics and insights
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-[#5f6368]">Period:</label>
              <FilterDropdown value={filter} onChange={setFilter} />
            </div>
          </header>

          <DailyActivityChart trends={trends} loading={trendsLoading} />
          <LanguageDistributionChart languages={languages} loading={languagesLoading} />
        </div>
      </div>
    </main>
  );
}

export default Dashboard;
