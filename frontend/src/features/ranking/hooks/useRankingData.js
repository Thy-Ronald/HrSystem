import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { fetchCachedIssues, fetchRepositories } from '../../../services/api';
import { transformRankingData } from '../utils/dataTransform';

/**
 * useRankingData Hook
 * Manages data fetching with React Query for staff ranking
 * Simplified from 200 lines to ~40 lines by using React Query's built-in caching
 */
export function useRankingData() {
  const [selectedFilter, setSelectedFilter] = useState('today');
  const [error, setError] = useState('');

  // Fetch repositories with React Query
  const { data: repos = [], isLoading: reposLoading } = useQuery({
    queryKey: ['repositories'],
    queryFn: fetchRepositories,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch ranking data for ALL repositories in parallel
  const issuesQueries = useQueries({
    queries: repos.map(repo => ({
      queryKey: ['ranking', repo.fullName, selectedFilter],
      queryFn: async () => {
        const response = await fetchCachedIssues(repo.fullName, selectedFilter, {
          user: null,
          forceRefresh: false,
          includeEtag: true
        });
        return response?.data || response;
      },
      staleTime: 2 * 60 * 1000,
    }))
  });

  const loading = reposLoading || issuesQueries.some(q => q.isLoading);
  const reposIssuesData = issuesQueries.map(q => q.data).filter(Boolean);

  // Aggregate ranking data across all repositories
  const rankingData = useMemo(() => {
    const userMap = new Map();

    reposIssuesData.forEach(repoData => {
      if (!Array.isArray(repoData)) return;

      repoData.forEach(item => {
        const username = item.username || 'Unknown';
        if (!userMap.has(username)) {
          userMap.set(username, { ...item });
        } else {
          const existing = userMap.get(username);
          // Sum up all metrics
          existing.total = (existing.total || 0) + (item.total || 0);
          existing.assignedP = (existing.assignedP || 0) + (item.assignedP || 0);
          existing.inProgress = (existing.inProgress || 0) + (item.inProgress || 0);
          existing.done = (existing.done || 0) + (item.done || 0);
          existing.reviewed = (existing.reviewed || 0) + (item.reviewed || 0);
          existing.devDeployed = (existing.devDeployed || 0) + (item.devDeployed || 0);
          existing.devChecked = (existing.devChecked || 0) + (item.devChecked || 0);
        }
      });
    });

    const aggregated = Array.from(userMap.values());
    return transformRankingData(aggregated);
  }, [reposIssuesData]);

  /**
   * Load data for a specific repo and filter
   * This is now just a setter function - React Query handles the fetching
   * Wrapped in useCallback to prevent unnecessary re-renders
   */
  const loadData = useCallback((repoIgnored, filter) => {
    setSelectedFilter(filter);
    setError('');
  }, []);

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
