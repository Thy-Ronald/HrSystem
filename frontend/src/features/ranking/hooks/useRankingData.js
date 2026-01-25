/**
 * useRankingData Hook
 * Manages data fetching, caching, and state for ranking data
 */

import { useState, useRef, useCallback } from 'react';
import { fetchIssuesByPeriod } from '../../../services/api';
import { transformRankingData, getCacheKey } from '../utils/dataTransform';

export function useRankingData() {
  const [rankingData, setRankingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const cacheRef = useRef(new Map());
  const abortControllerRef = useRef(null);
  const isManualRefreshRef = useRef(false);
  const refreshTimerRef = useRef(null);
  const currentRepoRef = useRef(null);
  const currentFilterRef = useRef(null);

  /**
   * Load ranking data for a specific repo and filter
   * @param {string} repo - Repository full name
   * @param {string} filter - Filter name
   * @param {boolean} forceRefresh - Force fresh fetch, bypass cache
   * @param {number} retryCount - Current retry attempt
   */
  const loadData = useCallback(async (repo, filter, forceRefresh = false, retryCount = 0) => {
    if (!repo) return;

    const cacheKey = getCacheKey(repo, filter);
    
    // Cancel any pending request first to prevent race conditions
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    // Store current repo and filter immediately to track the active request
    currentRepoRef.current = repo;
    currentFilterRef.current = filter;
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        // Verify this is still the current request (not aborted by a newer filter change)
        if (currentRepoRef.current === repo && currentFilterRef.current === filter) {
          setRankingData(cached);
          setError('');
          setLoading(false);
          return;
        }
      }
    }

    setLoading(true);
    setError('');

    try {
      
      // Clear existing refresh timer
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      
      const data = await fetchIssuesByPeriod(repo, filter, abortControllerRef.current?.signal, true);
      
      // Verify this is still the current request (not aborted by a newer filter change)
      if (currentRepoRef.current !== repo || currentFilterRef.current !== filter) {
        console.log('[loadData] Request completed but filter/repo changed, ignoring result');
        return;
      }
      
      // Transform data to match table structure
      const transformedData = transformRankingData(data);

      // Update cache and state only if this is still the active request
      if (currentRepoRef.current === repo && currentFilterRef.current === filter) {
        cacheRef.current.set(cacheKey, transformedData);
        setRankingData(transformedData);
        setError('');
      }
      
    } catch (err) {
      if (err.name === 'AbortError') return;
      
      // Retry logic for network errors (max 2 retries)
      if (retryCount < 2 && (err.message.includes('fetch') || err.status >= 500)) {
        console.warn(`Retrying... (${retryCount + 1}/2)`);
        setTimeout(() => {
          loadData(repo, filter, forceRefresh, retryCount + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff
        return;
      }
      
      console.error('Error loading issues:', err);
      const errorMessage = err.message || 'Unable to load data. Please try again.';
      setError(errorMessage);
      setRankingData([]);
      
      // If this was a manual refresh, mark error for UI feedback
      if (isManualRefreshRef.current) {
        // Error will be handled by refresh handler
      }
    } finally {
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
   * Get all cached data as object (for persistence)
   * @returns {Object} Cache as plain object
   */
  const getCacheSnapshot = useCallback(() => {
    return Object.fromEntries(cacheRef.current);
  }, []);

  /**
   * Restore cache from object (for persistence)
   * @param {Object} cacheObj - Cache object to restore
   */
  const restoreCache = useCallback((cacheObj) => {
    if (cacheObj && Object.keys(cacheObj).length > 0) {
      cacheRef.current = new Map(Object.entries(cacheObj));
    }
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
  };
}
