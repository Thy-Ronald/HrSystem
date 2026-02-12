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
} from '../features/ranking/hooks';
import {
  TABLE_COLUMNS,
  QUICK_FILTERS,
  VIEW_MODES,
} from '../features/ranking';
import GithubErrorBanner from '../components/GithubErrorBanner';

export default function StaffRanking({ onNavigate }) {
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


  // Initial data load when filter changes
  useEffect(() => {
    loadData(null, activeQuickFilter);
  }, [activeQuickFilter, loadData]);

  return (
    <Box sx={{ width: '100%', minHeight: '100%', bgcolor: 'background.paper' }}>
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
        />

        {error ? (
          <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
            <GithubErrorBanner
              onNavigate={onNavigate}
              variant={(error.status === 401 || error.status === 403) ? 'auth' : 'server'}
              message={(error.status === 401 || error.status === 403)
                ? "Please check if your GitHub Personal Access Token is still valid and not expired."
                : `The server responded with an error (${error.status || error.message}). Please try again later.`
              }
            />
          </Box>
        ) : viewMode === VIEW_MODES.RANK ? (
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
          sharedCacheData={null}
        />
      </Box>
    </Box>
  );
}
