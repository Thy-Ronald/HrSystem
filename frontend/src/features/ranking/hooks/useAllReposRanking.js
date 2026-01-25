import { useState, useRef, useCallback, useEffect } from 'react';
import { fetchCachedIssues } from '../../../services/api';
import { transformRankingData, getCacheKey } from '../utils/dataTransform';
import { fetchWithCache, generateCacheKey, setCached, getCached, clearCachePattern } from '../utils/cacheUtils';

// Shared cache across instances
const sharedCache = new Map();
const cacheTimestamps = new Map();

// Configuration
const BATCH_SIZE = 10;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
const RESET_HOUR = 18; // 6 PM
const RESET_AT_6PM_REPOS = ['timeriver/cnd_chat', 'timeriver/sacsys009'];

/**
 * Check if cache timestamp is past the 6 PM reset time
 */
function isPastResetTime(timestamp) {
  if (!timestamp) return false;
  const now = new Date();
  const cacheDate = new Date(timestamp);

  const isAfter6PM = now.getHours() >= RESET_HOUR;
  const cacheBefore6PM = cacheDate.getHours() < RESET_HOUR;
  const isDifferentDay = cacheDate.toDateString() !== now.toDateString();

  return (isAfter6PM && cacheBefore6PM) || isDifferentDay;
}

function mergeUserData(targetMap, user) {
  const existing = targetMap.get(user.username);
  if (existing) {
    existing.assigned += user.assigned || 0;
    existing.inProgress += user.inProgress || 0;
    existing.done += user.done || 0;
    existing.reviewed += user.reviewed || 0;
    existing.devDeployed += user.devDeployed || 0;
    existing.devChecked += user.devChecked || 0;
  } else {
    // Clone to avoid reference issues
    targetMap.set(user.username, { ...user });
  }
}

function calculateUserTotal(user) {
  return (
    (user.assigned || 0) +
    (user.inProgress || 0) +
    (user.done || 0) +
    (user.reviewed || 0) +
    (user.devDeployed || 0) +
    (user.devChecked || 0)
  );
}

/**
 * Hook for loading ranking data from multiple repositories
 * Used by the ranking modal to display combined rankings
 * 
 * Includes ETag-based smart caching and automatic 6PM reset logic.
 */
export function useAllReposRanking() {
  const [rankingData, setRankingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const loadAllReposData = useCallback(async (repositories, filter, forceRefresh = false) => {
    if (!repositories || repositories.length === 0) {
      setRankingData([]);
      return;
    }

    // Cancel pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);
    setError(null);

    try {
      const cacheResults = new Map();
      const reposNeedingCheck = [];

      // 1. Check Cache for all repos
      repositories.forEach(repo => {
        const localStorageKey = generateCacheKey('allrepos', repo.fullName, filter);
        const cached = getCached(localStorageKey, CACHE_TTL_MS);

        // Manual check for 6PM reset repositories
        const shouldReset = RESET_AT_6PM_REPOS.includes(repo.fullName);
        const rawString = localStorage.getItem(localStorageKey);
        const raw = rawString ? JSON.parse(rawString) : null;
        const expiredByReset = shouldReset && isPastResetTime(raw?.timestamp);

        if (!forceRefresh && cached && !expiredByReset) {
          console.log(`[useAllReposRanking] Cache hit for ${repo.fullName}`);
          cacheResults.set(repo.fullName, cached);
        } else {
          reposNeedingCheck.push(repo);
        }
      });

      // Initial visual update with cached data (Partial result)
      if (cacheResults.size > 0) {
        const userMap = new Map();
        cacheResults.forEach((data) => {
          if (Array.isArray(data)) {
            data.forEach(user => mergeUserData(userMap, user));
          }
        });

        const mergedRawData = Array.from(userMap.values())
          .map(user => ({ ...user, total: calculateUserTotal(user) }))
          .sort((a, b) => b.total - a.total || a.username.localeCompare(b.username));

        // Use functional state update or direct set for initial view
        setRankingData(transformRankingData(mergedRawData));
      }

      if (reposNeedingCheck.length === 0) {
        setLoading(false);
        return;
      }

      // 2. Fetch missing/expired data in batches
      for (let i = 0; i < reposNeedingCheck.length; i += BATCH_SIZE) {
        if (signal.aborted) break;

        const batch = reposNeedingCheck.slice(i, i + BATCH_SIZE);
        const fetchPromises = batch.map(async (repo) => {
          try {
            const localStorageKey = generateCacheKey('allrepos', repo.fullName, filter);

            // fetchWithCache handles ETag logic!
            const fetchFn = (etag) => fetchCachedIssues(repo.fullName, filter, {
              etag,
              includeEtag: true,
              forceRefresh
            });

            const data = await fetchWithCache(
              localStorageKey,
              fetchFn,
              CACHE_TTL_MS
            );

            return { repo: repo.fullName, data };
          } catch (err) {
            if (err.name === 'AbortError') throw err;
            console.error(`[useAllReposRanking] Error fetching ${repo.fullName}:`, err);
            return { repo: repo.fullName, data: null };
          }
        });

        const results = await Promise.all(fetchPromises);

        // Update results map with new data
        results.forEach(({ repo, data }) => {
          if (data) cacheResults.set(repo, data);
        });

        // Re-merge EVERYTHING (cached + new batch) for consistent ranking
        const userMap = new Map();
        cacheResults.forEach((data) => {
          if (Array.isArray(data)) {
            data.forEach(user => mergeUserData(userMap, user));
          }
        });

        const mergedRawData = Array.from(userMap.values())
          .map(user => ({ ...user, total: calculateUserTotal(user) }))
          .sort((a, b) => b.total - a.total || a.username.localeCompare(b.username));

        setRankingData(transformRankingData(mergedRawData));
      }

    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('[useAllReposRanking] Error:', err);
      setError('Failed to load ranking data');
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // This useEffect is now only for cleanup of the abort controller
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []); // Empty dependency array as loadAllReposData is no longer called here

  const syncCache = useCallback((cacheData) => {
    if (!cacheData || typeof cacheData !== 'object') return;
    Object.entries(cacheData).forEach(([key, data]) => {
      if (data && Array.isArray(data)) {
        sharedCache.set(key, data);
        cacheTimestamps.set(key, Date.now());
      }
    });
  }, []);

  const clearAllCache = useCallback(() => {
    sharedCache.clear();
    cacheTimestamps.clear();
    clearCachePattern('allrepos_');
    // Note: requires args to reload, but we can't easily do it here without state.
    // Modal will handle refresh if needed.
  }, []);

  return {
    rankingData,
    loading,
    error,
    loadAllReposData,
    syncCache,
    clearAllCache
  };
}
