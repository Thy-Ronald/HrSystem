import { useState, useRef, useCallback, useEffect } from 'react';
import { fetchCachedIssues } from '../../../services/api';
import { transformRankingData, getCacheKey } from '../utils/dataTransform';
import { fetchWithCache, generateCacheKey, setCached, getCached } from '../utils/cacheUtils';

// Shared cache across instances
const sharedCache = new Map();
const cacheTimestamps = new Map();

// Configuration
const BATCH_SIZE = 10;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

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

export function useAllReposRanking(repositories, filter) {
  const [rankingData, setRankingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const loadAllReposData = useCallback(async () => {
    if (!repositories || repositories.length === 0) {
      setRankingData([]);
      return;
    }

    // Cancel pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);
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
          reposNeedingCheck.push(repo);
        }
      });

      // Initial visual update with cached data
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
}
