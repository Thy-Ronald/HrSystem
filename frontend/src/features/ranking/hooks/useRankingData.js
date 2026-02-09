import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCachedIssues } from '../../../services/api';
import { transformRankingData } from '../utils/dataTransform';

/**
 * useRankingData Hook
 * Manages data fetching with React Query for staff ranking
 * Simplified from 200 lines to ~40 lines by using React Query's built-in caching
 */
export function useRankingData() {
  const [selectedRepo, setSelectedRepo] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('today');
  const [error, setError] = useState('');

  // Fetch ranking data with React Query
  const { data: rankingData = [], isLoading: loading } = useQuery({
    queryKey: ['ranking', selectedRepo, selectedFilter],
    queryFn: async () => {
      if (!selectedRepo) return [];

      try {
        const data = await fetchCachedIssues(selectedRepo, selectedFilter, {
          user: null,
          forceRefresh: false,
          includeEtag: true
        });

        return transformRankingData(data);
      } catch (err) {
        console.error('[useRankingData] Error:', err);
        setError(err.message || 'Failed to load data');
        throw err;
      }
    },
    enabled: !!selectedRepo, // Only fetch when repo is selected
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2, // Retry failed requests twice
  });

  /**
   * Load data for a specific repo and filter
   * This is now just a setter function - React Query handles the fetching
   */
  const loadData = (repo, filter) => {
    setSelectedRepo(repo);
    setSelectedFilter(filter);
    setError('');
  };

  return {
    rankingData,
    setRankingData: () => { }, // No-op, React Query manages state
    loading,
    error,
    setError,
    loadData,
    // Legacy methods for backward compatibility (no-ops)
    clearCache: () => { },
    getCacheSnapshot: () => ({}),
    restoreCache: () => { },
    cacheRef: { current: new Map() },
    isManualRefreshRef: { current: false },
    cacheInfo: null,
    getLastFetchTimestamp: () => null,
  };
}
