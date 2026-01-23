/**
 * Staff Ranking Page (Refactored with Clean Architecture)
 * 
 * Displays GitHub repository staff ranking based on issue assignments
 * Features: Manual refresh, localStorage persistence
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  RankingHeader, 
  RankingFilters, 
  RankingTable 
} from '../features/ranking/components';
import {
  useRankingData,
  useRankingPersistence,
  useRepositories,
} from '../features/ranking/hooks';
import {
  TABLE_COLUMNS,
  QUICK_FILTERS,
  VIEW_MODES,
  loadFromStorage,
  STORAGE_KEYS,
} from '../features/ranking';

export default function StaffRanking() {
  // UI State
  const [activeQuickFilter, setActiveQuickFilter] = useState(() => 
    loadFromStorage(STORAGE_KEYS.ACTIVE_FILTER, QUICK_FILTERS.TODAY)
  );
  const [viewMode, setViewMode] = useState(() => 
    loadFromStorage(STORAGE_KEYS.VIEW_MODE, VIEW_MODES.RANK)
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');

  // Data Management (Custom Hook)
  const {
    rankingData,
    loading,
    error,
    setError,
    loadData,
    clearCache,
    getCacheSnapshot,
    restoreCache,
    isManualRefreshRef,
  } = useRankingData();

  // Repository Management (Custom Hook)
  const {
    repositories,
    selectedRepo,
    setSelectedRepo,
    reposLoading,
  } = useRepositories();

  // Persistence (Custom Hook)
  useRankingPersistence({
    activeFilter: activeQuickFilter,
    viewMode,
    rankingData,
    selectedRepo,
    getCacheSnapshot,
    restoreCache,
    setRankingData: () => {}, // Data is managed by useRankingData
  });

  // Event Handlers
  const handleQuickFilterChange = useCallback((filter) => {
    setActiveQuickFilter(filter);
    setError('');
    loadData(selectedRepo, filter);
  }, [selectedRepo, loadData, setError]);

  const handleRepoChange = useCallback((repo) => {
    setSelectedRepo(repo);
    setError('');
    setActiveQuickFilter(QUICK_FILTERS.TODAY);
    loadData(repo, QUICK_FILTERS.TODAY);
  }, [setSelectedRepo, setError, loadData]);

  const handleManualRefresh = useCallback(async () => {
    if (!selectedRepo || isRefreshing) return;
    
    // Clear errors and set refreshing state
    setRefreshError('');
    setError('');
    isManualRefreshRef.current = true;
    setIsRefreshing(true);
    
    try {
      // Clear cache for all filters
      const filters = Object.values(QUICK_FILTERS);
      clearCache(selectedRepo, filters);
      
      // Fetch latest data
      await loadData(selectedRepo, activeQuickFilter, true);
      setRefreshError('');
    } catch (err) {
      console.error('[Refresh] Error:', err);
      const errorMessage = err.message || 'Failed to refresh. Please try again.';
      setRefreshError(errorMessage);
      setError(errorMessage);
    } finally {
      setIsRefreshing(false);
      isManualRefreshRef.current = false;
    }
  }, [selectedRepo, activeQuickFilter, isRefreshing, clearCache, loadData, setError, isManualRefreshRef]);

  // Initial data load when repo/filter changes
  useEffect(() => {
    if (selectedRepo) {
      loadData(selectedRepo, activeQuickFilter);
    }
  }, [selectedRepo, activeQuickFilter, loadData]);

  return (
    <div className="min-h-screen bg-white px-4 sm:px-6 md:px-8 py-6">
      <main className="max-w-7xl mx-auto">
        <RankingHeader
          viewMode={viewMode}
          onViewChange={setViewMode}
          onRefresh={handleManualRefresh}
          isRefreshing={isRefreshing}
          refreshError={refreshError}
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
          <div className="flex items-center justify-center py-16 text-[#70757a]">
            <p>Graph view coming soon...</p>
          </div>
        )}
      </main>
    </div>
  );
}
