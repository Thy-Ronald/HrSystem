import { useEffect, useState, useMemo } from 'react';
import Modal from '../../../components/Modal';
import { RankingTable } from './RankingTable';
import { FilterDropdown } from './FilterDropdown';
import { RepositoryMultiSelect } from './RepositoryMultiSelect';
import { TABLE_COLUMNS, COMMITS_TABLE_COLUMNS, QUICK_FILTERS, FILTER_LABELS, STORAGE_KEYS, RANKING_TYPES, RANKING_TYPE_LABELS } from '../constants';
import { useAllReposRanking } from '../hooks/useAllReposRanking';

const RANKING_REPOS = ['timeriver/cnd_chat', 'timeriver/sacsys009'];

export function RankingModal({ open, onClose, repositories, sharedCacheData }) {
  const [activeFilter, setActiveFilter] = useState(QUICK_FILTERS.THIS_MONTH);
  const [rankingType, setRankingType] = useState(RANKING_TYPES.ISSUES);
  const [selectedRepos, setSelectedRepos] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_REPOS);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter(repo => RANKING_REPOS.includes(repo)) : [];
    } catch (e) {
      return [];
    }
  });

  const {
    rankingData,
    loading,
    error,
    loadAllReposData,
    syncCache,
  } = useAllReposRanking();

  // Sync cache from parent when modal opens
  useEffect(() => {
    if (open && sharedCacheData) {
      syncCache(sharedCacheData);
    }
  }, [open, sharedCacheData, syncCache]);

  // Persist selected repos to localStorage
  useEffect(() => {
    if (selectedRepos.length > 0) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_REPOS, JSON.stringify(selectedRepos));
    }
  }, [selectedRepos]);

  // Ensure selected repos are only from RANKING_REPOS
  useEffect(() => {
    if (repositories && repositories.length > 0) {
      const validRepos = selectedRepos.filter(repo => RANKING_REPOS.includes(repo));
      if (validRepos.length !== selectedRepos.length) {
        setSelectedRepos(validRepos);
      }
    }
  }, [repositories, selectedRepos]);

  // Filter available repositories to only RANKING_REPOS
  const availableRepositories = useMemo(() => {
    if (!repositories) return [];
    return repositories.filter(repo => RANKING_REPOS.includes(repo.fullName));
  }, [repositories]);

  // Get selected repository objects
  const selectedRepositories = useMemo(() => {
    return availableRepositories.filter(repo => selectedRepos.includes(repo.fullName));
  }, [availableRepositories, selectedRepos]);

  // Load data when modal opens or filter/repos/type change
  useEffect(() => {
    if (!open || !availableRepositories || availableRepositories.length === 0) return;
    if (selectedRepos.length === 0) {
      return;
    }
    loadAllReposData(selectedRepositories, activeFilter, false, rankingType);
  }, [open, activeFilter, selectedRepos, rankingType, loadAllReposData, availableRepositories, selectedRepositories]);

  const quickFilters = [
    { value: QUICK_FILTERS.TODAY, label: FILTER_LABELS[QUICK_FILTERS.TODAY] },
    { value: QUICK_FILTERS.YESTERDAY, label: FILTER_LABELS[QUICK_FILTERS.YESTERDAY] },
    { value: QUICK_FILTERS.THIS_WEEK, label: FILTER_LABELS[QUICK_FILTERS.THIS_WEEK] },
    { value: QUICK_FILTERS.LAST_WEEK, label: FILTER_LABELS[QUICK_FILTERS.LAST_WEEK] },
    { value: QUICK_FILTERS.THIS_MONTH, label: FILTER_LABELS[QUICK_FILTERS.THIS_MONTH] },
  ];

  return (
    <Modal open={open} onClose={onClose} title="All Repositories Ranking" size="xl">
      <div className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <RepositoryMultiSelect
              repositories={availableRepositories}
              selectedRepos={selectedRepos}
              onSelectionChange={setSelectedRepos}
              loading={!repositories}
            />
          </div>
          <div className="flex-1">
            <FilterDropdown
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
            />
          </div>
          <div className="flex-1">
            <div className="flex flex-col gap-1 relative w-full">
              <label htmlFor="type-select" className="text-sm font-medium text-[#5f6368]">
                Type
              </label>
              <select
                id="type-select"
                value={rankingType}
                onChange={(e) => setRankingType(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-[#dadce0] rounded-lg bg-white text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#1a73e8] focus:border-[#1a73e8]"
              >
                <option value={RANKING_TYPES.ISSUES}>{RANKING_TYPE_LABELS[RANKING_TYPES.ISSUES]}</option>
                <option value={RANKING_TYPES.COMMITS}>{RANKING_TYPE_LABELS[RANKING_TYPES.COMMITS]}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden h-[500px] flex flex-col">
          {selectedRepos.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[#70757a]">
              <p>Please select at least one repository to view rankings</p>
            </div>
          ) : (
            <div className="overflow-y-auto h-full">
              <RankingTable
                columns={rankingType === RANKING_TYPES.COMMITS ? COMMITS_TABLE_COLUMNS : TABLE_COLUMNS}
                data={rankingData}
                loading={loading}
                error={error}
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
