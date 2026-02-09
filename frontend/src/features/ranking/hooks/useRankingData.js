import { useState, useCallback } from 'react';
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
        console.log('[useRankingData] Fetching data for:', { selectedRepo, selectedFilter });

        const response = await fetchCachedIssues(selectedRepo, selectedFilter, {
          user: null,
          forceRefresh: false,
          includeEtag: true
        });

        console.log('[useRankingData] Raw API response:', response);

        // Extract data array from response object {data: [...], etag: null}
        const data = response?.data || response;
        console.log('[useRankingData] Extracted data:', data, 'isArray:', Array.isArray(data));

        const transformed = transformRankingData(data);
        console.log('[useRankingData] Transformed data:', transformed);
        console.log('[useRankingData] Transformed length:', transformed?.length);

        return transformed;
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
   * Wrapped in useCallback to prevent unnecessary re-renders
   */
  const loadData = useCallback((repo, filter) => {
    setSelectedRepo(repo);
    setSelectedFilter(filter);
    setError('');
  }, []); // No dependencies - setters are stable

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
