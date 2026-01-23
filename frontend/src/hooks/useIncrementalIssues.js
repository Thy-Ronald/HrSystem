/**
 * useIncrementalIssues Hook
 * 
 * Manages incremental fetching and caching of GitHub issues.
 * Designed to minimize API calls and data transfer by:
 * 
 * 1. SELECTIVE FETCHING: Only fetches data for the currently visible repo/user
 * 2. SMART POLLING: Polls for changes frequently, but only fetches full data when changed
 * 3. INCREMENTAL UPDATES: Backend returns only issues that have changed
 * 4. LOCAL CACHE: Maintains in-memory cache to avoid redundant fetches
 * 
 * USAGE:
 * ======
 * const {
 *   data,
 *   isLoading,
 *   error,
 *   lastFetchedAt,
 *   refetch,
 * } = useIncrementalIssues({
 *   repo: 'owner/repo',
 *   filter: 'today',
 *   user: 'username', // optional
 *   pollInterval: 60000, // optional, default 60 seconds
 * });
 * 
 * HOW IT WORKS:
 * =============
 * 1. On mount/repo change: Fetch data from cache API
 * 2. Poll /api/issues/changes every pollInterval to check for updates
 * 3. If hasChanges=true, fetch fresh data
 * 4. Update only changed items in local state (preserves React references)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  fetchCachedIssues,
  checkCachedIssuesChanges,
  refreshCachedIssues,
} from '../services/api';

// Default configuration
const DEFAULT_POLL_INTERVAL = 60000; // 60 seconds
const MIN_POLL_INTERVAL = 10000; // 10 seconds minimum

/**
 * Deep compare two user data objects
 * Returns true if they are equal, false if different
 */
function isUserDataEqual(a, b) {
  if (!a || !b) return a === b;
  return (
    a.username === b.username &&
    a.assigned === b.assigned &&
    a.inProgress === b.inProgress &&
    a.done === b.done &&
    a.reviewed === b.reviewed &&
    a.devDeployed === b.devDeployed &&
    a.devChecked === b.devChecked &&
    a.total === b.total
  );
}

/**
 * Merge new data with existing data, preserving unchanged items
 * This keeps React references stable for items that haven't changed,
 * which optimizes rendering.
 * 
 * @param {Array} existing - Current data array
 * @param {Array} incoming - New data from API
 * @returns {Array} Merged data with stable references
 */
function mergeIssueData(existing, incoming) {
  if (!existing || existing.length === 0) {
    return incoming || [];
  }
  
  if (!incoming || incoming.length === 0) {
    return existing;
  }

  const existingMap = new Map(existing.map(item => [item.username, item]));
  const result = [];

  // Process incoming items
  for (const newItem of incoming) {
    const existingItem = existingMap.get(newItem.username);
    
    if (existingItem && isUserDataEqual(existingItem, newItem)) {
      // Keep existing reference if data unchanged
      result.push(existingItem);
    } else {
      // Use new item (new user or changed data)
      result.push(newItem);
    }
    
    existingMap.delete(newItem.username);
  }

  // Items in existing but not in incoming are removed (user no longer has issues)
  // We don't add them to result

  return result;
}

/**
 * Hook for incremental issue fetching
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.repo - Repository full name (owner/repo)
 * @param {string} options.filter - Filter type (today, this-week, etc.)
 * @param {string} options.user - Optional: filter by specific username
 * @param {number} options.pollInterval - Poll interval in ms (default: 60000)
 * @param {boolean} options.enabled - Whether to fetch data (default: true)
 * @returns {Object} Hook state and controls
 */
export function useIncrementalIssues({
  repo,
  filter = 'today',
  user = null,
  pollInterval = DEFAULT_POLL_INTERVAL,
  enabled = true,
}) {
  // State
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const [cacheInfo, setCacheInfo] = useState(null);

  // Refs for tracking
  const pollTimerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const lastCheckRef = useRef(null);
  const isMountedRef = useRef(true);

  // Memoize options for dependency tracking
  const cacheKey = useMemo(() => 
    `${repo}_${filter}_${user || 'all'}`, 
    [repo, filter, user]
  );

  /**
   * Fetch fresh data from the cache API
   * @param {boolean} forceRefresh - Force backend cache refresh
   */
  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!repo || !enabled) return;

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      console.log(`[useIncrementalIssues] Fetching: ${repo}/${filter}${user ? `/${user}` : ''}${forceRefresh ? ' (force)' : ''}`);

      const result = await fetchCachedIssues(repo, filter, {
        user,
        forceRefresh,
      });

      if (!isMountedRef.current) return;

      // Merge with existing data to preserve stable references
      setData(prevData => mergeIssueData(prevData, result.data || result));
      
      // Update cache info
      if (result.cache) {
        setCacheInfo(result.cache);
        setLastFetchedAt(result.cache.lastFetchedAt);
      }

      lastCheckRef.current = new Date().toISOString();
      setError(null);

      console.log(`[useIncrementalIssues] Fetched ${(result.data || result).length} users`);

    } catch (err) {
      if (err.name === 'AbortError') return;
      
      console.error('[useIncrementalIssues] Fetch error:', err.message);
      
      if (!isMountedRef.current) return;
      setError(err.message || 'Failed to fetch data');
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [repo, filter, user, enabled]);

  /**
   * Check for changes without fetching full data
   * If changes detected, fetch fresh data
   */
  const checkForChanges = useCallback(async () => {
    if (!repo || !enabled || !lastCheckRef.current) return;

    try {
      const result = await checkCachedIssuesChanges(repo, lastCheckRef.current);

      if (!isMountedRef.current) return;

      if (result.hasChanges) {
        console.log(`[useIncrementalIssues] Changes detected for ${repo}, refreshing...`);
        await fetchData(false);
      } else {
        console.log(`[useIncrementalIssues] No changes for ${repo}`);
      }

    } catch (err) {
      console.warn('[useIncrementalIssues] Change check failed:', err.message);
      // Don't set error for poll failures - just skip this cycle
    }
  }, [repo, enabled, fetchData]);

  /**
   * Manual refresh handler
   * Forces the backend to refresh its cache, then fetches fresh data
   */
  const refetch = useCallback(async () => {
    if (!repo) return;
    
    console.log(`[useIncrementalIssues] Manual refresh requested for ${repo}`);
    
    try {
      // First, tell backend to refresh its cache
      await refreshCachedIssues(repo, false);
      
      // Then fetch the fresh data
      await fetchData(true);
    } catch (err) {
      console.error('[useIncrementalIssues] Manual refresh failed:', err.message);
      setError(err.message || 'Refresh failed');
    }
  }, [repo, fetchData]);

  /**
   * Force a full refresh (re-fetches all issues from GitHub)
   */
  const forceFullRefresh = useCallback(async () => {
    if (!repo) return;
    
    console.log(`[useIncrementalIssues] Full refresh requested for ${repo}`);
    setIsLoading(true);
    
    try {
      await refreshCachedIssues(repo, true);
      await fetchData(true);
    } catch (err) {
      console.error('[useIncrementalIssues] Full refresh failed:', err.message);
      setError(err.message || 'Full refresh failed');
      setIsLoading(false);
    }
  }, [repo, fetchData]);

  // Initial fetch when repo/filter changes
  useEffect(() => {
    if (enabled && repo) {
      // Clear existing data for new key
      setData([]);
      setError(null);
      fetchData(false);
    }
  }, [cacheKey, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Set up polling for changes
  useEffect(() => {
    if (!enabled || !repo) return;

    const interval = Math.max(pollInterval, MIN_POLL_INTERVAL);
    
    console.log(`[useIncrementalIssues] Starting poll timer (${interval / 1000}s)`);
    
    pollTimerRef.current = setInterval(() => {
      checkForChanges();
    }, interval);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [repo, pollInterval, enabled, checkForChanges]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // Data
    data,
    isLoading,
    error,
    
    // Cache info
    lastFetchedAt,
    cacheInfo,
    
    // Actions
    refetch,           // Incremental refresh
    forceFullRefresh,  // Full refresh (all issues)
    
    // Utilities
    cacheKey,
  };
}

export default useIncrementalIssues;
