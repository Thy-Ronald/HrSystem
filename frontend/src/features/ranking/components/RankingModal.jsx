import { useEffect, useState, useMemo } from 'react';
import Modal from '../../../components/Modal';
import { RankingTable } from './RankingTable';
import { FilterDropdown } from './FilterDropdown';
import { RepositoryMultiSelect } from './RepositoryMultiSelect';
import { TABLE_COLUMNS, QUICK_FILTERS, FILTER_LABELS, STORAGE_KEYS } from '../constants';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { useAllReposRanking } from '../hooks/useAllReposRanking';

const RANKING_REPOS = ['timeriver/cnd_chat', 'timeriver/sacsys009'];

export function RankingModal({ open, onClose, repositories, sharedCacheData }) {
  const [activeFilter, setActiveFilter] = useState(QUICK_FILTERS.THIS_MONTH);
  const [selectedRepos, setSelectedRepos] = useState(() => {
    const saved = loadFromStorage(STORAGE_KEYS.SELECTED_REPOS, []);
    return saved.filter(repo => RANKING_REPOS.includes(repo));
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
      saveToStorage(STORAGE_KEYS.SELECTED_REPOS, selectedRepos);
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

  // Load data when modal opens or filter/repos change
  useEffect(() => {
    if (!open || !availableRepositories || availableRepositories.length === 0) return;
    if (selectedRepos.length === 0) {
      return;
    }
    loadAllReposData(selectedRepositories, activeFilter, false);
  }, [open, activeFilter, selectedRepos, loadAllReposData, availableRepositories, selectedRepositories]);

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
        </div>

        {selectedRepos.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px] text-[#70757a]">
            <p>Please select at least one repository to view rankings</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <RankingTable
              columns={TABLE_COLUMNS}
              data={rankingData}
              loading={loading}
              error={error}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
