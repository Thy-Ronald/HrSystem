import { useState, useRef, useCallback } from 'react';
import { fetchIssuesByPeriod, fetchCachedIssues } from '../../../services/api';
import { transformRankingData, getCacheKey } from '../utils/dataTransform';
import { fetchWithCache, generateCacheKey, getCached, getRawCache } from '../utils/cacheUtils';

const USE_INCREMENTAL_CACHE = true;

/**
 * Merge new data with existing data, preserving unchanged items
 * This keeps React references stable for items that haven't changed,
 * optimizing re-renders.
 */
function mergeWithExisting(existing, incoming) {
  if (!existing || existing.length === 0) {
    // Even if no existing, filter incoming for internal duplicates just in case
    const unique = [];
    const seen = new Set();
    for (const item of incoming) {
      if (item.id && !seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }
    return unique;
  }

  if (!incoming || incoming.length === 0) return existing;

  const existingMap = new Map(existing.map(item => [item.id, item]));
  const seenInIncoming = new Set();
  const result = [];

  for (const newItem of incoming) {
    // Avoid processing duplicates from the source data itself
    if (seenInIncoming.has(newItem.id)) continue;
    seenInIncoming.add(newItem.id);

    const existingItem = existingMap.get(newItem.id);

    // If item exists and data is identical, keep the old reference
    if (existingItem &&
      existingItem.assignedCards === newItem.assignedCards &&
      existingItem.inProgressCards === newItem.inProgressCards &&
      existingItem.doneCards === newItem.doneCards &&
      existingItem.reviewed === newItem.reviewed &&
      existingItem.devDeployed === newItem.devDeployed &&
      existingItem.devChecked === newItem.devChecked) {
      result.push(existingItem);
    } else {
      result.push(newItem);
    }
  }

  return result;
}

/**
 * useRankingData Hook
 * Manages data fetching, smart caching (ETags), and state for staff ranking
 */
export function useRankingData() {
  const [rankingData, setRankingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cacheInfo, setCacheInfo] = useState(null);
  const cacheRef = useRef(new Map());
  const abortControllerRef = useRef(null);
  const isManualRefreshRef = useRef(false);
  const lastFetchTimestampRef = useRef(new Map());

  /**
   * Load ranking data for a specific repo and filter
   */
  const loadData = useCallback(async (repo, filter, forceRefresh = false, retryCount = 0, options = {}) => {
    if (!repo) return;

    const { user = null } = options;

    // Unique key for main dashboard cache
    const localStorageKey = generateCacheKey('main', repo, filter, user || 'all');
    // 2 minutes TTL
    const CACHE_TTL_MS = 2 * 60 * 1000;

    // Synchronously check if we have ANY data (even stale) to avoid flicker
    const existingRaw = getRawCache(localStorageKey)?.data;

    if (existingRaw && rankingData.length === 0) {
      const transformed = transformRankingData(existingRaw);
      // Filter duplicates even in local cache just in case
      setRankingData(mergeWithExisting([], transformed));
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Only show loading spinner if we have NO data at all
    if (!existingRaw || forceRefresh) {
      setLoading(true);
    }
    setError('');

    try {
      // Define the fetch function that uses ETags
      const fetchFn = (etag) => fetchCachedIssues(repo, filter, {
        user,
        forceRefresh,
        etag,
        includeEtag: true
      });

      // Use the smart caching utility
      const data = await fetchWithCache(
        localStorageKey,
        fetchFn,
        CACHE_TTL_MS
      );

      // Transform data for display
      const transformedData = transformRankingData(data);

      // Update state using functional update to remove dependency on rankingData
      setRankingData(current => mergeWithExisting(current, transformedData));

      setLoading(false);
      isManualRefreshRef.current = false;

    } catch (err) {
      if (err.name === 'AbortError') return;

      console.error('[useRankingData] Error:', err);

      // Retry logic for network errors (max 2 retries)
      if (retryCount < 2 && (err.message.includes('fetch') || err.status >= 500)) {
        console.warn(`Retrying... (${retryCount + 1}/2)`);
        setTimeout(() => loadData(repo, filter, forceRefresh, retryCount + 1, options), 1000 * (retryCount + 1));
        return;
      }

      setError(err.message || 'Failed to load data');
      setRankingData([]);
      setLoading(false);
      isManualRefreshRef.current = false;
    }
  }, []);

  /**
   * Clear in-memory cache
   */
  const clearCache = useCallback((repo, filters) => {
    filters.forEach(filter => {
      const key = getCacheKey(repo, filter);
      cacheRef.current.delete(key);
    });
  }, []);

  /**
   * Get cache snapshot for persistence
   */
  const getCacheSnapshot = useCallback(() => {
    return Object.fromEntries(cacheRef.current);
  }, []);

  /**
   * Restore cache from snapshot
   */
  const restoreCache = useCallback((cacheObj) => {
    if (cacheObj && Object.keys(cacheObj).length > 0) {
      cacheRef.current = new Map(Object.entries(cacheObj));
    }
  }, []);

  /**
   * Get the last fetch timestamp
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
    getCacheSnapshot,
    restoreCache,
    cacheRef,
    isManualRefreshRef,
    cacheInfo,
    getLastFetchTimestamp,
  };
}
