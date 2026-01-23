/**
 * useRankingData Hook
 * Manages data fetching, caching, and state for ranking data
 * 
 * INCREMENTAL CACHING STRATEGY:
 * =============================
 * This hook now supports two fetching modes:
 * 
 * 1. LEGACY MODE (default): Uses fetchIssuesByPeriod which hits the old in-memory cache
 * 2. INCREMENTAL MODE: Uses fetchCachedIssues which:
 *    - Stores data in MySQL for persistence
 *    - Uses `updated_since` parameter for incremental GitHub API calls
 *    - Only fetches issues that changed since last refresh
 *    - Background job refreshes every 30 minutes
 * 
 * SWITCHING MODES:
 * Set useIncrementalCache=true in loadData options to use incremental mode.
 * 
 * SELECTIVE REFRESH:
 * The incremental API only fetches data for the requested repo/user,
 * reducing data transfer and API calls for users viewing specific data.
 */

import { useState, useRef, useCallback } from 'react';
import { fetchIssuesByPeriod, fetchCachedIssues } from '../../../services/api';
import { transformRankingData, getCacheKey } from '../utils/dataTransform';
import { fetchWithCache, generateCacheKey } from '../utils/cacheUtils';

// Configuration: Set to true to use new incremental cache API
const USE_INCREMENTAL_CACHE = true;

/**
 * Merge new data with existing data, preserving unchanged items
 * This keeps React references stable for items that haven't changed,
 * optimizing re-renders.
 */
function mergeWithExisting(existing, incoming) {
  if (!existing || existing.length === 0) return incoming;
  if (!incoming || incoming.length === 0) return existing;

  const existingMap = new Map(existing.map(item => [item.username, item]));

  return incoming.map(newItem => {
    const existingItem = existingMap.get(newItem.username);

    // If item exists and data is identical, keep the old reference
    if (existingItem &&
      existingItem.assigned === newItem.assigned &&
      existingItem.inProgress === newItem.inProgress &&
      existingItem.done === newItem.done &&
      existingItem.reviewed === newItem.reviewed &&
      existingItem.devDeployed === newItem.devDeployed &&
      existingItem.devChecked === newItem.devChecked) {
      return existingItem;
    }

    return newItem;
  });
}

export function useRankingData() {
  const [rankingData, setRankingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cacheInfo, setCacheInfo] = useState(null);
  const cacheRef = useRef(new Map());
  const abortControllerRef = useRef(null);
  const lastFetchTimestampRef = useRef(new Map());

  /**
   * Load ranking data for a specific repo and filter
   */
  const loadData = useCallback(async (repo, filter, forceRefresh = false, retryCount = 0, options = {}) => {
    if (!repo) return;

    const { user = null } = options;

    // Prefix 'main' to separate from modal cache
    const localStorageKey = generateCacheKey('main', repo, filter, user || 'all');
    // 2 minutes TTL for main screen too
    const CACHE_TTL_MS = 2 * 60 * 1000;

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError('');

    try {
      // Define the fetch function that uses ETags
      const fetchFn = (etag) => fetchCachedIssues(repo, filter, {
        user,
        forceRefresh, // api supports forceRefresh
        etag,
        includeEtag: true
      });

      // Use the smart caching util
      const data = await fetchWithCache(
        localStorageKey,
        fetchFn,
        CACHE_TTL_MS
      );

      // Transform
      const transformedData = transformRankingData(data);

      // Update state using functional update to access current state without dependency
      setRankingData(current => mergeWithExisting(current, transformedData));

      setLoading(false);

    } catch (err) {
      if (err.name === 'AbortError') return;

      console.error('[useRankingData] Error:', err);
      // Fallback to cache if available? fetchWithCache already tries.
      if (retryCount < 2) {
        // Retry logic...
        setTimeout(() => loadData(repo, filter, forceRefresh, retryCount + 1, options), 1000 * (retryCount + 1));
        return;
      }

      setError(err.message || 'Failed to load data');
      setRankingData([]);
      setLoading(false);
    }
  }, []);

  /**
   * Clear cache for specific filters
   * @param {string} repo - Repository name
   * @param {string[]} filters - Array of filter names to clear
   */
  const clearCache = useCallback((repo, filters) => {
    filters.forEach(filter => {
      const key = getCacheKey(repo, filter);
      cacheRef.current.delete(key);
    });
  }, []);

  /**
   * Get the last fetch timestamp for a specific cache key
   * Used for smart polling - only fetch if backend has newer data
   */
  const getLastFetchTimestamp = useCallback((repo, filter) => {
    const key = getCacheKey(repo, filter);
    return lastFetchTimestampRef.current.get(key) || null;
  }, []);

  return {
    rankingData,
    setRankingData,
    loading,
    error,
    setError,
    loadData,
    clearCache,
    cacheRef,
    // New incremental cache features
    cacheInfo,
    getLastFetchTimestamp,
  };
}
