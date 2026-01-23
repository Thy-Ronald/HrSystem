import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { fetchIssuesByPeriod, fetchRepositories } from '../services/api';

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

function RankingHeader({ viewMode, onViewChange, onRefresh, isRefreshing }) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <h1 className="text-xl font-normal text-[#202124]">Ranking</h1>
      <div className="flex items-center gap-2">
        {onRefresh && (
          <button
            onClick={onRefresh}
            type="button"
            disabled={isRefreshing}
            className="px-3 py-1.5 text-sm font-medium rounded-full border bg-white border-[#dadce0] text-[#5f6368] hover:bg-[#f8f9fa] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            title="Refresh data"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={isRefreshing ? 'animate-spin' : ''}
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
            Refresh
          </button>
        )}
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
      </div>
    </header>
  );
}

// Debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function RepositorySelect({ repositories, selectedRepo, onRepoChange, loading }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  
  // Debounce search input (300ms delay)
  const debouncedSearch = useDebounce(search, 300);

  // Memoize filtered repositories
  const filteredRepos = useMemo(() => {
    if (!debouncedSearch.trim()) return repositories;
    const searchLower = debouncedSearch.toLowerCase();
    return repositories.filter((repo) =>
      repo.fullName.toLowerCase().includes(searchLower)
    );
  }, [repositories, debouncedSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (repoFullName) => {
    onRepoChange(repoFullName);
    setSearch('');
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputChange = (e) => {
    setSearch(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  // Get display value
  const displayValue = isOpen ? search : selectedRepo;

  return (
    <div className="flex flex-col gap-1 relative" ref={dropdownRef}>
      <label htmlFor="repo-search" className="text-[11px] font-medium text-[#5f6368] uppercase tracking-wider ml-1">
        Repository
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id="repo-search"
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={loading ? 'Loading...' : 'Search repositories...'}
          disabled={loading}
          className="w-full px-3 py-1.5 pr-8 text-sm border border-[#dadce0] rounded-lg bg-white text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8] min-w-[280px] disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5f6368] hover:text-[#202124] disabled:opacity-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={isOpen ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} />
          </svg>
        </button>
      </div>
      
      {isOpen && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#dadce0] rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {filteredRepos.length === 0 ? (
            <div className="px-3 py-2 text-sm text-[#70757a]">
              {repositories.length === 0 ? 'No repositories found' : 'No matching repositories'}
            </div>
          ) : (
            filteredRepos.map((repo) => (
              <button
                key={repo.fullName}
                type="button"
                onClick={() => handleSelect(repo.fullName)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-[#f1f3f4] ${
                  selectedRepo === repo.fullName ? 'bg-[#e8f0fe] text-[#1967d2]' : 'text-[#202124]'
                }`}
              >
                {repo.fullName}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function RankingFilters({ activeQuickFilter, onQuickFilterChange, repositories, selectedRepo, onRepoChange, reposLoading }) {
  const quickFilters = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this-week', label: 'This Week' },
    { value: 'last-week', label: 'Last Week' },
    { value: 'this-month', label: 'This Month' },
  ];

  return (
    <section className="flex flex-col gap-6 mb-8 pb-8 border-b border-[#e8eaed]">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <RepositorySelect
          repositories={repositories}
          selectedRepo={selectedRepo}
          onRepoChange={onRepoChange}
          loading={reposLoading}
        />
      </div>
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

// Skeleton loader component
function TableSkeleton() {
  return (
    <div className="overflow-x-auto -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8">
      <table className="w-full min-w-[800px] border-collapse">
        <thead>
          <tr className="border-b border-[#e8eaed]">
            {Array.from({ length: 8 }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <div className="h-4 bg-[#e8eaed] rounded animate-pulse" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="border-b border-[#e8eaed]">
              {Array.from({ length: 8 }).map((_, j) => (
                <td key={j} className="px-4 py-4">
                  <div className="h-4 bg-[#f1f3f4] rounded animate-pulse mx-auto" style={{ width: j === 0 ? '80px' : '40px' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RankingTable({ columns, data, loading, error }) {
  const isEmpty = !data || data.length === 0;

  if (loading) {
    return <TableSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-sm text-red-600">{error}</div>
      </div>
    );
  }

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
  const [rankingData, setRankingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [repositories, setRepositories] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [reposLoading, setReposLoading] = useState(true);
  const cacheRef = useRef(new Map()); // Cache: repo_filter -> data
  const abortControllerRef = useRef(null);

  // Load repositories on mount (only once)
  useEffect(() => {
    let mounted = true;
    const loadRepos = async () => {
      setReposLoading(true);
      try {
        const repos = await fetchRepositories();
        if (mounted) {
          setRepositories(repos);
          // Auto-select first repo if none selected
          if (repos.length > 0 && !selectedRepo) {
            setSelectedRepo(repos[0].fullName);
          }
        }
      } catch (err) {
        console.error('Error loading repositories:', err);
        if (mounted) {
          setError('Failed to load repositories');
        }
      } finally {
        if (mounted) {
          setReposLoading(false);
        }
      }
    };
    loadRepos();
    return () => { mounted = false; };
  }, []);

  const loadData = useCallback(async (repo, filter, forceRefresh = false, retryCount = 0) => {
    if (!repo) return;

    const cacheKey = `${repo}_${filter}`;
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setRankingData(cached);
        setError('');
        return;
      }
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError('');

    try {
      const data = await fetchIssuesByPeriod(repo, filter);
      
      // Transform data to match table structure (memoize this transformation)
      const transformedData = data.map((item) => ({
        id: item.username,
        assignedCards: item.issueCount,
        assignedP: 0,
        inProgressCards: 0,
        doneCards: 0,
        reviewed: 0,
        devDeployed: 0,
        devChecked: 0,
      }));

      // Update cache
      cacheRef.current.set(cacheKey, transformedData);
      setRankingData(transformedData);
    } catch (err) {
      if (err.name === 'AbortError') return;
      
      // Retry logic for network errors (max 2 retries)
      if (retryCount < 2 && (err.message.includes('fetch') || err.status >= 500)) {
        console.warn(`Retrying... (${retryCount + 1}/2)`);
        setTimeout(() => {
          loadData(repo, filter, forceRefresh, retryCount + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff
        return;
      }
      
      console.error('Error loading issues:', err);
      setError(err.message || 'Unable to load data. Please try again.');
      setRankingData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data when repo or filter changes
  useEffect(() => {
    if (!selectedRepo) return;

    let cancelled = false;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Small delay to batch rapid filter changes
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        loadData(selectedRepo, activeQuickFilter);
      }
    }, 100);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      if (controller) {
        controller.abort();
      }
    };
  }, [selectedRepo, activeQuickFilter, loadData]);

  const handleManualRefresh = useCallback(() => {
    loadData(selectedRepo, activeQuickFilter, true);
  }, [selectedRepo, activeQuickFilter, loadData]);

  const handleRepoChange = useCallback((repo) => {
    setSelectedRepo(repo);
    // Only clear cache for the old repo, keep other repos cached
    const oldRepo = cacheRef.current.get('lastRepo');
    if (oldRepo && oldRepo !== repo) {
      // Clear only entries for the old repo
      for (const key of cacheRef.current.keys()) {
        if (typeof key === 'string' && key.startsWith(`${oldRepo}_`)) {
          cacheRef.current.delete(key);
        }
      }
    }
    cacheRef.current.set('lastRepo', repo);
  }, []);

  return (
    <main className="flex flex-col h-full bg-[#ffffff]">
      <div className="flex-1 overflow-auto p-4 sm:p-6 md:p-10">
        <div className="max-w-6xl mx-auto">
          <section className="bg-white p-2">
            <RankingHeader
              viewMode={viewMode}
              onViewChange={setViewMode}
              onRefresh={handleManualRefresh}
              isRefreshing={loading}
            />

            <RankingFilters
              activeQuickFilter={activeQuickFilter}
              onQuickFilterChange={setActiveQuickFilter}
              repositories={repositories}
              selectedRepo={selectedRepo}
              onRepoChange={handleRepoChange}
              reposLoading={reposLoading}
            />

            <RankingTable columns={TABLE_COLUMNS} data={rankingData} loading={loading} error={error} />
          </section>
        </div>
      </div>
    </main>
  );
}

export default RankingPage;
