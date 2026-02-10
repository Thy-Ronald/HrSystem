import { useEffect, useState, useMemo } from 'react';
import Modal from '../../../components/Modal';
import { RankingTable } from './RankingTable';
import { FilterDropdown } from './FilterDropdown';
import { RepositoryMultiSelect } from './RepositoryMultiSelect';
import { TABLE_COLUMNS, COMMITS_TABLE_COLUMNS, LANGUAGES_TABLE_COLUMNS, QUICK_FILTERS, FILTER_LABELS, STORAGE_KEYS, RANKING_TYPES, RANKING_TYPE_LABELS } from '../constants';
import { useAllReposRanking } from '../hooks/useAllReposRanking';


export function RankingModal({ open, onClose, repositories, sharedCacheData }) {
  const [activeFilter, setActiveFilter] = useState(QUICK_FILTERS.THIS_MONTH);
  const [rankingType, setRankingType] = useState(RANKING_TYPES.ISSUES);
  const [selectedRepos, setSelectedRepos] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_REPOS);
      return saved ? JSON.parse(saved) : [];
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

  // Ensure selected repos are valid
  useEffect(() => {
    if (repositories && repositories.length > 0) {
      if (selectedRepos.length === 0) {
        setSelectedRepos(repositories.map(r => r.fullName));
      } else {
        const validRepos = selectedRepos.filter(repo => repositories.some(r => r.fullName === repo));
        if (validRepos.length !== selectedRepos.length) {
          setSelectedRepos(validRepos);
        }
      }
    }
  }, [repositories, selectedRepos]);

  // All repositories are available
  const availableRepositories = repositories || [];

  // Get selected repository objects
  const selectedRepositories = useMemo(() => {
    return availableRepositories.filter(repo => selectedRepos.includes(repo.fullName));
  }, [availableRepositories, selectedRepos]);

  // Load data when modal opens or filter/repos/type change
  // For languages, don't use filter (show overall percentages)
  useEffect(() => {
    if (!open || !availableRepositories || availableRepositories.length === 0) return;
    if (selectedRepos.length === 0) {
      return;
    }
    // For languages, pass null filter to show overall data
    const filterToUse = rankingType === RANKING_TYPES.LANGUAGES ? null : activeFilter;
    loadAllReposData(selectedRepositories, filterToUse, false, rankingType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeFilter, selectedRepos.join(','), rankingType]);

  const quickFilters = [
    { value: QUICK_FILTERS.TODAY, label: FILTER_LABELS[QUICK_FILTERS.TODAY] },
    { value: QUICK_FILTERS.YESTERDAY, label: FILTER_LABELS[QUICK_FILTERS.YESTERDAY] },
    { value: QUICK_FILTERS.THIS_WEEK, label: FILTER_LABELS[QUICK_FILTERS.THIS_WEEK] },
    { value: QUICK_FILTERS.LAST_WEEK, label: FILTER_LABELS[QUICK_FILTERS.LAST_WEEK] },
    { value: QUICK_FILTERS.THIS_MONTH, label: FILTER_LABELS[QUICK_FILTERS.THIS_MONTH] },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="All Repositories Ranking"
      subtitle="Ranking data refreshes every 6 PM"
      size="xl"
    >
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
          {/* Hide period dropdown for languages - show overall percentages */}
          {rankingType !== RANKING_TYPES.LANGUAGES && (
            <div className="flex-1">
              <FilterDropdown
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
              />
            </div>
          )}
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
                <option value={RANKING_TYPES.LANGUAGES}>{RANKING_TYPE_LABELS[RANKING_TYPES.LANGUAGES]}</option>
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
                columns={
                  rankingType === RANKING_TYPES.COMMITS
                    ? COMMITS_TABLE_COLUMNS
                    : rankingType === RANKING_TYPES.LANGUAGES
                      ? LANGUAGES_TABLE_COLUMNS
                      : TABLE_COLUMNS
                }
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
