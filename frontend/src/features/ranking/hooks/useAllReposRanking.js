<<<<<<< HEAD
import { useState, useRef, useCallback, useEffect } from 'react';
import { fetchCachedIssues } from '../../../services/api';
import { transformRankingData, getCacheKey } from '../utils/dataTransform';
import { fetchWithCache, generateCacheKey, setCached, getCached } from '../utils/cacheUtils';

// Shared cache across instances
=======
import { useState, useRef, useCallback } from 'react';
import { fetchCachedIssues } from '../../../services/api';
import { transformRankingData, getCacheKey } from '../utils/dataTransform';
import { fetchWithCache, generateCacheKey, clearCachePattern } from '../utils/cacheUtils';

// Shared cache across all instances
>>>>>>> da0f46c (feat: Implement ETag-based smart caching and UI decoupling for Ranking modal and Staff Ranking form to optimize performance and reduce API load)
const sharedCache = new Map();
const cacheTimestamps = new Map();

// Configuration
<<<<<<< HEAD
const BATCH_SIZE = 10;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

=======
const RESET_HOUR = 18; // 6 PM (18:00)
const RESET_AT_6PM_REPOS = ['timeriver/cnd_chat', 'timeriver/sacsys009'];
const BATCH_SIZE = 10; // Process repositories in batches to avoid overwhelming the API

/**
 * Check if cache timestamp is past the 6 PM reset time
 */
function isPastResetTime(timestamp) {
  if (!timestamp) return false;
  const now = new Date();
  const cacheDate = new Date(timestamp);
  const RESET_HOUR = 18;

  const isAfter6PM = now.getHours() >= RESET_HOUR;
  const cacheBefore6PM = cacheDate.getHours() < RESET_HOUR;
  const isDifferentDay = cacheDate.toDateString() !== now.toDateString();

  return (isAfter6PM && cacheBefore6PM) || isDifferentDay;
}

/**
 * Check if a repository should reset at 6 PM
 */
function shouldResetAt6PM(repoFullName) {
  return RESET_AT_6PM_REPOS.includes(repoFullName);
}

/**
 * Check if cache entry is valid
 */
function isCacheValid(cacheKey) {
  const timestamp = cacheTimestamps.get(cacheKey);
  if (!timestamp) return false;

  const cached = sharedCache.get(cacheKey);
  if (!cached) return false;

  // Extract repo name from cache key (format: "repo_fullName_filter")
  const parts = cacheKey.split('_');
  if (parts.length < 2) return true; // If we can't parse, assume valid

  // Reconstruct repo full name (handles repos with underscores in name)
  const filter = parts[parts.length - 1];
  const repoFullName = parts.slice(0, -1).join('_');

  if (shouldResetAt6PM(repoFullName)) {
    // For repos that reset at 6pm, check if past reset time
    return !isPastResetTime(timestamp);
  }

  // For other repos, cache is valid indefinitely (no TTL check)
  return true;
}

/**
 * Get cached data if valid
 */
function getCachedData(cacheKey) {
  if (isCacheValid(cacheKey)) {
    return sharedCache.get(cacheKey);
  }
  return null;
}

/**
 * Set cached data with timestamp
 */
function setCachedData(cacheKey, data) {
  sharedCache.set(cacheKey, data);
  cacheTimestamps.set(cacheKey, Date.now());
}

/**
 * Merge user data from multiple repositories
 */
>>>>>>> da0f46c (feat: Implement ETag-based smart caching and UI decoupling for Ranking modal and Staff Ranking form to optimize performance and reduce API load)
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
<<<<<<< HEAD
    // Clone to avoid reference issues
    targetMap.set(user.username, { ...user });
  }
}

function calculateUserTotal(user) {
  return (
    (user.assigned || 0) +
=======
    targetMap.set(user.username, {
      username: user.username,
      assigned: user.assigned || 0,
      inProgress: user.inProgress || 0,
      done: user.done || 0,
      reviewed: user.reviewed || 0,
      devDeployed: user.devDeployed || 0,
      devChecked: user.devChecked || 0,
    });
  }
}

/**
 * Calculate total for a user
 */
function calculateUserTotal(user) {
  return (user.assigned || 0) +
>>>>>>> da0f46c (feat: Implement ETag-based smart caching and UI decoupling for Ranking modal and Staff Ranking form to optimize performance and reduce API load)
    (user.inProgress || 0) +
    (user.done || 0) +
    (user.reviewed || 0) +
    (user.devDeployed || 0) +
<<<<<<< HEAD
    (user.devChecked || 0)
  );
}

export function useAllReposRanking(repositories, filter) {
  const [rankingData, setRankingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const loadAllReposData = useCallback(async () => {
=======
    (user.devChecked || 0);
}

/**
 * Hook for loading ranking data from multiple repositories
 * Used by the ranking modal to display combined rankings
 */
export function useAllReposRanking() {
  const [rankingData, setRankingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const abortControllerRef = useRef(null);

  const loadAllReposData = useCallback(async (repositories, filter, forceRefresh = false) => {
>>>>>>> da0f46c (feat: Implement ETag-based smart caching and UI decoupling for Ranking modal and Staff Ranking form to optimize performance and reduce API load)
    if (!repositories || repositories.length === 0) {
      setRankingData([]);
      return;
    }

<<<<<<< HEAD
    // Cancel pending
=======
    // Cancel any pending requests
>>>>>>> da0f46c (feat: Implement ETag-based smart caching and UI decoupling for Ranking modal and Staff Ranking form to optimize performance and reduce API load)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);
<<<<<<< HEAD
    setError(null);

    try {
      // 1. Check in-memory/localStorage cache for all repos
      const cacheResults = new Map();
      const reposNeedingCheck = [];

      repositories.forEach(repo => {
        const cacheKey = getCacheKey(repo.fullName, filter);
        const localStorageKey = generateCacheKey('allrepos', repo.fullName, filter);

        // Try to get from localStorage (synchronous check)
        const cached = getCached(localStorageKey, CACHE_TTL_MS);

        if (cached) {
          console.log(`[useAllReposRanking] Cache hit for ${repo.fullName}`);
          cacheResults.set(repo.fullName, cached);
        } else {
=======
    setError('');

    try {
      const now = new Date();
      const isAfter6PM = now.getHours() >= RESET_HOUR;

      // Clear expired cache entries for repos that reset at 6pm
      if (isAfter6PM) {
        RESET_AT_6PM_REPOS.forEach(repoFullName => {
          const cacheKey = getCacheKey(repoFullName, filter);
          if (isPastResetTime(cacheTimestamps.get(cacheKey))) {
            sharedCache.delete(cacheKey);
            cacheTimestamps.delete(cacheKey);
          }
        });
      }

      // Check cache for each repository
      const cacheResults = new Map();
      const reposNeedingCheck = [];
      const reposNeedingFetch = [];

      repositories.forEach(repo => {
        const cacheKey = getCacheKey(repo.fullName, filter);
        const repoResetsAt6PM = shouldResetAt6PM(repo.fullName);

        if (forceRefresh || (isAfter6PM && repoResetsAt6PM)) {
          console.log(`[Frontend Cache] MISS for ${cacheKey} (forceRefresh or after 6pm reset)`);
          reposNeedingCheck.push(repo);
          return;
        }

        const cached = getCachedData(cacheKey);

        if (cached) {
          console.log(`[Frontend Cache] HIT for ${cacheKey}`);
          cacheResults.set(repo.fullName, cached);
        } else {
          console.log(`[Frontend Cache] MISS for ${cacheKey} (will check backend)`);
>>>>>>> da0f46c (feat: Implement ETag-based smart caching and UI decoupling for Ranking modal and Staff Ranking form to optimize performance and reduce API load)
          reposNeedingCheck.push(repo);
        }
      });

<<<<<<< HEAD
      // Initial visual update with cached data
=======
      // Display immediate cached data if available
>>>>>>> da0f46c (feat: Implement ETag-based smart caching and UI decoupling for Ranking modal and Staff Ranking form to optimize performance and reduce API load)
      if (cacheResults.size > 0) {
        const userMap = new Map();
        cacheResults.forEach((data) => {
          if (Array.isArray(data)) {
            data.forEach(user => mergeUserData(userMap, user));
          }
        });

<<<<<<< HEAD
        const mergedRawData = Array.from(userMap.values())
          .map(user => ({ ...user, total: calculateUserTotal(user) }))
          .sort((a, b) => b.total - a.total || a.username.localeCompare(b.username));

        // Use functional state update
        setRankingData(transformRankingData(mergedRawData));
      }

      if (reposNeedingCheck.length === 0) {
        setLoading(false);
        return;
      }

      // 2. Fetch missing data in batches
      for (let i = 0; i < reposNeedingCheck.length; i += BATCH_SIZE) {
        if (signal.aborted) break;

        const batch = reposNeedingCheck.slice(i, i + BATCH_SIZE);
        const fetchPromises = batch.map(async (repo) => {
          try {
            const localStorageKey = generateCacheKey('allrepos', repo.fullName, filter);

            // fetchWithCache handles ETag logic!
            const fetchFn = (etag) => fetchCachedIssues(repo.fullName, filter, {
              etag,
              includeEtag: true
            });

            const data = await fetchWithCache(
              localStorageKey,
              fetchFn,
              CACHE_TTL_MS
            );

            return { repo: repo.fullName, data };
          } catch (err) {
            console.error(`[useAllReposRanking] Error fetching ${repo.fullName}:`, err);
            return { repo: repo.fullName, data: null };
          }
        });

        const results = await Promise.all(fetchPromises);

        // Update cacheResults with new data
        results.forEach(({ repo, data }) => {
          if (data) cacheResults.set(repo, data);
        });

        // Re-merge EVERYTHING (cached + new batch)
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
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [repositories, filter]);

  useEffect(() => {
    loadAllReposData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadAllReposData]);

  return { rankingData, loading, error, refresh: loadAllReposData };
=======
        const mergedData = Array.from(userMap.values())
          .map(user => ({
            ...user,
            total: calculateUserTotal(user),
          }))
          .sort((a, b) => b.total - a.total || a.username.localeCompare(b.username));

        setRankingData(transformRankingData(mergedData));
      }

      // Fetch remaining data in batches
      if (reposNeedingCheck.length > 0) {
        for (let i = 0; i < reposNeedingCheck.length; i += BATCH_SIZE) {
          if (signal.aborted) break;

          const batch = reposNeedingCheck.slice(i, i + BATCH_SIZE);
          const fetchPromises = batch.map(async (repo) => {
            try {
              const cacheKey = getCacheKey(repo.fullName, filter);

              // Use localStorage cache with 2-minute TTL
              const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
              const localStorageKey = generateCacheKey('allrepos', repo.fullName, filter);

              const data = await fetchWithCache(
                localStorageKey,
                (etag) => fetchCachedIssues(repo.fullName, filter, {
                  etag,
                  includeEtag: true
                }),
                CACHE_TTL_MS
              );

              console.log(`[useAllReposRanking] Fetched data for ${repo.fullName}:`, data?.length || 0, 'records');

              // Store raw data in cache (don't transform yet)
              setCachedData(cacheKey, data);

              return { repo: repo.fullName, data: data };
            } catch (err) {
              if (err.name === 'AbortError') {
                throw err;
              }
              console.error(`[useAllReposRanking] Error fetching ${repo.fullName}:`, err);
              return { repo: repo.fullName, data: null, error: err.message };
            }
          });

          const results = await Promise.all(fetchPromises);

          // Merge new data with existing
          const userMap = new Map();

          // Add existing cached data
          cacheResults.forEach((data) => {
            if (Array.isArray(data)) {
              data.forEach(user => mergeUserData(userMap, user));
            }
          });

          // Add newly fetched data
          results.forEach(({ data }) => {
            if (data && Array.isArray(data)) {
              data.forEach(user => mergeUserData(userMap, user));
            }
          });

          // Add any remaining cached data from other repos
          repositories.forEach(repo => {
            if (!cacheResults.has(repo.fullName) && !results.find(r => r.repo === repo.fullName)) {
              const cacheKey = getCacheKey(repo.fullName, filter);
              const cached = getCachedData(cacheKey);
              if (cached && Array.isArray(cached)) {
                cached.forEach(user => mergeUserData(userMap, user));
              }
            }
          });

          const mergedRawData = Array.from(userMap.values())
            .map(user => ({
              ...user,
              total: calculateUserTotal(user),
            }))
            .sort((a, b) => b.total - a.total || a.username.localeCompare(b.username));

          // Transform for display only at the very end
          setRankingData(transformRankingData(mergedRawData));
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return; // Request was cancelled, ignore
      }
      console.error('[useAllReposRanking] Error:', err);
      setError(err.message || 'Failed to load ranking data');
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

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
    // Also clear localStorage cache for all repos
    clearCachePattern('allrepos_');
    console.log('[useAllReposRanking] Cleared all caches (memory + localStorage)');
  }, []);

  return {
    rankingData,
    loading,
    error,
    loadAllReposData,
    syncCache,
    clearAllCache,
  };
>>>>>>> da0f46c (feat: Implement ETag-based smart caching and UI decoupling for Ranking modal and Staff Ranking form to optimize performance and reduce API load)
}
