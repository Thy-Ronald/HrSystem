// ─────────────────────────────────────────────────────────────
// Shared UI Components
// ─────────────────────────────────────────────────────────────

function StatCard({ title, value, subtitle, icon }) {
  return (
    <div className="bg-white border border-[#dadce0] rounded-xl p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-[#5f6368] mb-1">{title}</p>
          <p className="text-3xl font-normal text-[#202124]">{value}</p>
          {subtitle && (
            <p className="text-xs text-[#70757a] mt-2 flex items-center gap-1">
              <span className="text-[#1e8e3e] font-medium">↑ 0%</span> {subtitle}
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

function DashboardStats() {
  return (
    <section className="mb-10">
      <SectionHeader
        title="Overview"
        description="Performance snapshot for the current period"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Employees"
          value="0"
          subtitle="vs last month"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <StatCard
          title="Active Projects"
          value="0"
          subtitle="vs last month"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          }
        />
        <StatCard
          title="Avg Performance"
          value="0%"
          subtitle="vs last month"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
        <StatCard
          title="Tasks Completed"
          value="0"
          subtitle="vs last month"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />
      </div>
    </section>
  );
}

function QuickActions() {
  return (
    <section className="mb-10">
      <SectionHeader title="Actions" />
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1a73e8] text-white text-sm font-medium rounded-full hover:bg-[#185abc] shadow-sm active:shadow-none"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Employee
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-[#3c4043] border border-[#dadce0] text-sm font-medium rounded-full hover:bg-[#f8f9fa]"
        >
          View Full Report
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-[#3c4043] border border-[#dadce0] text-sm font-medium rounded-full hover:bg-[#f8f9fa]"
        >
          Manage Team
        </button>
      </div>
    </section>
  );
}

function RecentActivity() {
  return (
    <section className="mb-10">
      <SectionHeader title="Recent Activity" />
      <div className="bg-white border border-[#dadce0] rounded-xl overflow-hidden">
        <div className="px-6 py-16 text-center">
          <div className="w-16 h-16 bg-[#f1f3f4] rounded-full flex items-center justify-center mx-auto mb-4 text-[#dadce0]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <p className="text-sm text-[#70757a]">No recent updates to display</p>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────────────────────

function Dashboard() {
  return (
    <main className="flex flex-col h-full bg-[#ffffff]">
      <div className="flex-1 overflow-auto p-4 sm:p-6 md:p-10">
        <div className="max-w-7xl mx-auto">
          <header className="mb-10">
            <h1 className="text-3xl font-normal text-[#202124]">Dashboard</h1>
            <p className="text-sm text-[#5f6368] mt-1">
              Welcome back. Here's what's happening today.
            </p>
          </header>

          <DashboardStats />
          <QuickActions />
          <RecentActivity />
        </div>
      </div>
    </main>
  );
}

export default Dashboard;
