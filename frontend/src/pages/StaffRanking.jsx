import { useState, useCallback, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import {
  RankingHeader,
  RankingFilters,
  RankingTable,
  RankingModal
} from '../features/ranking/components';
import {
  useRankingData,
  useRepositories,
} from '../features/ranking/hooks';
import {
  TABLE_COLUMNS,
  QUICK_FILTERS,
  VIEW_MODES,
} from '../features/ranking';

export default function StaffRanking() {
  // UI State
  const [activeQuickFilter, setActiveQuickFilter] = useState(QUICK_FILTERS.TODAY);
  const [viewMode, setViewMode] = useState(VIEW_MODES.RANK);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Data Management (Custom Hook)
  const {
    rankingData,
    setRankingData,
    loading,
    error,
    setError,
    loadData,
  } = useRankingData();

  // Repository Management (Custom Hook)
  const {
    repositories,
    selectedRepo,
    setSelectedRepo,
    reposLoading,
  } = useRepositories();

  // Event Handlers
  const handleQuickFilterChange = useCallback((filter) => {
    // If clicking the same filter that's already active, do nothing
    if (filter === activeQuickFilter) {
      return;
    }

    // Clear data immediately to prevent showing stale data from previous filter
    setRankingData([]);
    setActiveQuickFilter(filter);
    setError('');
    // loadData will be called by useEffect when activeQuickFilter changes
  }, [activeQuickFilter, setRankingData, setError]);

  const handleRepoChange = useCallback((repo) => {
    // Clear data immediately to prevent showing stale data from previous repo
    setRankingData([]);
    setSelectedRepo(repo);
    setError('');
    setActiveQuickFilter(QUICK_FILTERS.TODAY);
    // loadData will be called by useEffect when selectedRepo/activeQuickFilter changes
  }, [setRankingData, setSelectedRepo, setError]);

  // Initial data load when repo/filter changes
  useEffect(() => {
    if (selectedRepo) {
      loadData(selectedRepo, activeQuickFilter);
    }
  }, [selectedRepo, activeQuickFilter, loadData]);

  return (
    <Box sx={{ width: '100%', minHeight: '100%', bgcolor: 'white' }}>
      {/* Page Header */}

      {/* Page Content */}
      <Box sx={{ p: 4 }}>
        <RankingHeader
          viewMode={viewMode}
          onViewChange={setViewMode}
          onOpenModal={() => setIsModalOpen(true)}
        />

        <RankingFilters
          activeQuickFilter={activeQuickFilter}
          onQuickFilterChange={handleQuickFilterChange}
          repositories={repositories}
          selectedRepo={selectedRepo}
          onRepoChange={handleRepoChange}
          reposLoading={reposLoading}
        />

        {viewMode === VIEW_MODES.RANK ? (
          <RankingTable
            columns={TABLE_COLUMNS}
            data={rankingData}
            loading={loading}
            error={error}
          />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 10, color: 'text.secondary' }}>
            <Typography>Graph view coming soon...</Typography>
          </Box>
        )}

        <RankingModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          repositories={repositories}
          sharedCacheData={null}
        />
      </Box>
    </Box>
  );
}
