import { useState } from 'react';

// ─────────────────────────────────────────────────────────────
// Shared UI Components
// ─────────────────────────────────────────────────────────────

function ViewToggleButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`
        px-5 py-1.5 text-sm font-medium rounded-full border
        ${active
          ? 'bg-[#e8f0fe] border-transparent text-[#1967d2]'
          : 'bg-white border-[#dadce0] text-[#5f6368] hover:bg-[#f8f9fa]'
        }
      `}
    >
      {label}
    </button>
  );
}

function QuickFilterButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`
        px-4 py-1.5 text-sm font-medium rounded-full border
        ${active
          ? 'bg-[#1a73e8] border-transparent text-white shadow-sm'
          : 'bg-white border-[#dadce0] text-[#3c4043] hover:bg-[#f8f9fa]'
        }
      `}
    >
      {label}
    </button>
  );
}

function DateInput({ label, id }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[11px] font-medium text-[#5f6368] uppercase tracking-wider ml-1">
        {label}
      </label>
      <input
        type="date"
        id={id}
        className="px-3 py-1.5 text-sm border border-[#dadce0] rounded-lg bg-white text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8]"
      />
    </div>
  );
}

function SortIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="inline-block ml-1.5 opacity-40"
    >
      <path d="M3 6h18M7 12h10M11 18h2" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Ranking Components
// ─────────────────────────────────────────────────────────────

function RankingHeader({ viewMode, onViewChange }) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <h1 className="text-xl font-normal text-[#202124]">Ranking</h1>
      <nav className="flex items-center gap-1 bg-[#f1f3f4] p-1 rounded-full" aria-label="View mode selection">
        <ViewToggleButton
          label="Rank"
          active={viewMode === 'rank'}
          onClick={() => onViewChange('rank')}
        />
        <ViewToggleButton
          label="Graph Ranking"
          active={viewMode === 'graph'}
          onClick={() => onViewChange('graph')}
        />
      </nav>
    </header>
  );
}

function RankingFilters({ activeQuickFilter, onQuickFilterChange }) {
  const quickFilters = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this-week', label: 'This Week' },
    { value: 'last-week', label: 'Last Week' },
    { value: 'this-month', label: 'This Month' },
  ];

  return (
    <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8 pb-8 border-b border-[#e8eaed]">
      <nav className="flex flex-nowrap items-center gap-2 overflow-x-auto" aria-label="Quick date filters">
        {quickFilters.map((filter) => (
          <QuickFilterButton
            key={filter.value}
            label={filter.label}
            active={activeQuickFilter === filter.value}
            onClick={() => onQuickFilterChange(filter.value)}
          />
        ))}
      </nav>

      <div className="flex items-end">
        <DateInput label="Start Date" id="start-date" />
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <tr>
      <td colSpan="100%" className="px-4 py-32">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 mb-4 bg-[#f1f3f4] rounded-full flex items-center justify-center text-[#dadce0]">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-sm text-[#70757a]">No data available for the selected period</p>
        </div>
      </td>
    </tr>
  );
}

function RankingTable({ columns, data }) {
  const isEmpty = !data || data.length === 0;

  return (
    <div className="overflow-x-auto -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8">
      <table className="w-full min-w-[800px] border-collapse">
        <thead>
          <tr className="border-b border-[#e8eaed]">
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-4 py-3 text-[11px] font-medium text-[#5f6368] uppercase tracking-wider text-center"
              >
                <span className="inline-flex items-center justify-center">
                  {column.label}
                  <SortIcon />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isEmpty ? (
            <EmptyState />
          ) : (
            data.map((row, index) => (
              <tr
                key={row.id || index}
                className="border-b border-[#e8eaed] hover:bg-[#f8f9fa] group"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-4 py-4 text-sm text-[#3c4043] text-center group-hover:text-[#202124]"
                  >
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────────────────────

const TABLE_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'assignedCards', label: 'Assigned Cards' },
  { key: 'assignedP', label: 'Assigned P' },
  { key: 'inProgressCards', label: 'In Progress Cards' },
  { key: 'doneCards', label: 'Done Cards' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'devDeployed', label: 'Dev Deployed' },
  { key: 'devChecked', label: 'Dev Checked' },
];

function RankingPage() {
  const [activeQuickFilter, setActiveQuickFilter] = useState('today');
  const [viewMode, setViewMode] = useState('rank');
  const rankingData = [];

  return (
    <main className="flex flex-col h-full bg-[#ffffff]">
      <div className="flex-1 overflow-auto p-4 sm:p-6 md:p-10">
        <div className="max-w-6xl mx-auto">
          <section className="bg-white p-2">
            <RankingHeader
              viewMode={viewMode}
              onViewChange={setViewMode}
            />

            <RankingFilters
              activeQuickFilter={activeQuickFilter}
              onQuickFilterChange={setActiveQuickFilter}
            />

            <RankingTable columns={TABLE_COLUMNS} data={rankingData} />
          </section>
        </div>
      </div>
    </main>
  );
}

export default RankingPage;
