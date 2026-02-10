import { useState, useRef, useCallback, useEffect } from 'react';
import { fetchCachedIssues, fetchCommitsByPeriod, fetchLanguagesByPeriod } from '../../../services/api';
import { transformRankingData, getCacheKey } from '../utils/dataTransform';
import { fetchWithCache, generateCacheKey, setCached, getCached, clearCachePattern } from '../utils/cacheUtils';
import { RANKING_TYPES } from '../constants';

// Shared cache across instances
const sharedCache = new Map();
const cacheTimestamps = new Map();

const RESET_HOUR = 18; // 6 PM

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

function mergeUserData(targetMap, user, rankingType = RANKING_TYPES.ISSUES) {
  if (!user.username) return;
  // Normalize key to lowercase to prevent duplicates
  const username = user.username.toLowerCase().trim();

  const existing = targetMap.get(username);
  if (existing) {
    if (rankingType === RANKING_TYPES.COMMITS) {
      // For commits, just sum up the commit counts
      existing.commits = (existing.commits || 0) + (user.commits || 0);
      existing.total = existing.commits;
    } else if (rankingType === RANKING_TYPES.LANGUAGES) {
      // For languages, merge language arrays and recalculate top languages with percentages
      const existingLangs = new Map();
      (existing.topLanguages || []).forEach(lang => {
        existingLangs.set(lang.language, lang.count || 0);
      });
      (user.topLanguages || []).forEach(lang => {
        const currentCount = existingLangs.get(lang.language) || 0;
        existingLangs.set(lang.language, currentCount + (lang.count || 0));
      });

      // Update total files
      existing.totalFiles = (existing.totalFiles || 0) + (user.totalFiles || 0);
      const totalFiles = existing.totalFiles;

      // Convert back to sorted array (top 5) with percentages
      existing.topLanguages = Array.from(existingLangs.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([lang, count]) => {
          const percentage = totalFiles > 0 ? Math.round((count / totalFiles) * 100) : 0;
          return { language: lang, count, percentage };
        });
    } else {
      // For issues, merge all issue-related fields
      existing.assigned += user.assigned || 0;
      existing.inProgress += user.inProgress || 0;
      existing.done += user.done || 0;
      existing.reviewed += user.reviewed || 0;
      existing.devDeployed += user.devDeployed || 0;
      existing.devChecked += user.devChecked || 0;
    }
  } else {
    // Clone to avoid reference issues
    targetMap.set(username, {
      ...user,
      username // Ensure the object also has the normalized username
    });
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

  const loadAllReposData = useCallback(async (repositories, filter, forceRefresh = false, rankingType = RANKING_TYPES.ISSUES) => {
    if (!repositories || repositories.length === 0) {
      setRankingData([]);
      return;
    }

    const allowedRepos = repositories;

    if (allowedRepos.length === 0) {
      setRankingData([]);
      setError('No repositories available');
      return;
    }

    // Cancel pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setError(null);

    try {
      const cacheResults = new Map();
      const reposNeedingCheck = [];

      // 1. Check Cache for all repos (include rankingType in cache key)
      // Uses new TTL logic: 2 minutes OR until 6 PM (whichever comes first)
      // For languages, use 'all' instead of filter to show overall percentages
      allowedRepos.forEach(repo => {
        let cachePrefix = 'allrepos';
        if (rankingType === RANKING_TYPES.COMMITS) {
          cachePrefix = 'commits';
        } else if (rankingType === RANKING_TYPES.LANGUAGES) {
          cachePrefix = 'languages';
        }
        // For languages, use 'all' filter to show overall data
        const filterForCache = rankingType === RANKING_TYPES.LANGUAGES ? 'all' : filter;
        const localStorageKey = generateCacheKey(cachePrefix, repo.fullName, filterForCache);
        const cached = getCached(localStorageKey); // Uses 2min OR 6PM TTL automatically

        // Manual check for 6PM reset (uses 6PM logic)
        const shouldReset = rankingType === RANKING_TYPES.ISSUES;
        const rawString = localStorage.getItem(localStorageKey);
        const raw = rawString ? JSON.parse(rawString) : null;
        const expiredByReset = shouldReset && isPastResetTime(raw?.timestamp);

        if (!forceRefresh && cached && !expiredByReset) {
          console.log(`[useAllReposRanking] Cache hit for ${repo.fullName} (${rankingType})`);
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
            data.forEach(user => mergeUserData(userMap, user, rankingType));
          }
        });

        const mergedRawData = Array.from(userMap.values())
          .map(user => {
            if (rankingType === RANKING_TYPES.COMMITS) {
              return { ...user, total: user.commits || 0 };
            } else if (rankingType === RANKING_TYPES.LANGUAGES) {
              return { ...user, total: user.totalFiles || 0 };
            }
            return { ...user, total: calculateUserTotal(user) };
          })
          .sort((a, b) => b.total - a.total || a.username.localeCompare(b.username));

        // Use functional state update or direct set for initial view
        setRankingData(transformRankingData(mergedRawData, rankingType));
      }

      if (reposNeedingCheck.length === 0) {
        setLoading(false);
        return;
      }

      // Show loading if we actually have to fetch and have no data yet
      if (rankingData.length === 0 || forceRefresh) {
        setLoading(true);
      }

      // 2. Fetch missing/expired data in batches
      for (let i = 0; i < reposNeedingCheck.length; i += BATCH_SIZE) {
        if (signal.aborted) break;

        const batch = reposNeedingCheck.slice(i, i + BATCH_SIZE);
        const fetchPromises = batch.map(async (repo) => {
          try {
            let cachePrefix = 'allrepos';
            if (rankingType === RANKING_TYPES.COMMITS) {
              cachePrefix = 'commits';
            } else if (rankingType === RANKING_TYPES.LANGUAGES) {
              cachePrefix = 'languages';
            }
            // For languages, use 'all' filter to show overall percentages
            const filterForCache = rankingType === RANKING_TYPES.LANGUAGES ? 'all' : filter;
            const localStorageKey = generateCacheKey(cachePrefix, repo.fullName, filterForCache);

            // Choose fetch function based on ranking type
            let fetchFn;
            if (rankingType === RANKING_TYPES.COMMITS) {
              fetchFn = (etag) => fetchCommitsByPeriod(repo.fullName, filter, {
                etag,
                includeEtag: true,
                signal
              });
            } else if (rankingType === RANKING_TYPES.LANGUAGES) {
              // For languages, fetch with 'all' filter to get overall percentages
              fetchFn = (etag) => fetchLanguagesByPeriod(repo.fullName, 'all', {
                etag,
                includeEtag: true,
                signal
              });
            } else {
              fetchFn = (etag) => fetchCachedIssues(repo.fullName, filter, {
                etag,
                includeEtag: true,
                forceRefresh
              });
            }

            // fetchWithCache uses 2min OR 6PM TTL automatically
            const data = await fetchWithCache(
              localStorageKey,
              fetchFn
            );

            return { repo: repo.fullName, data };
          } catch (err) {
            // Re-throw abort errors to stop processing
            if (err.name === 'AbortError') {
              throw err;
            }
            console.error(`[useAllReposRanking] Error fetching ${repo.fullName}:`, err);
            return { repo: repo.fullName, data: null };
          }
        });

        // Use Promise.allSettled to handle abort errors gracefully
        // Use Promise.allSettled to handle abort errors gracefully
        const results = await Promise.allSettled(fetchPromises);

        // Check if any request was aborted
        const abortError = results.find(r => r.status === 'rejected' && r.reason?.name === 'AbortError');
        if (abortError) {
          // If aborted, stop processing this batch
          throw abortError.reason;
        }

        // Update results map with new data
        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value?.data) {
            cacheResults.set(result.value.repo, result.value.data);
          } else if (result.status === 'rejected') {
            console.error(`[useAllReposRanking] Failed to fetch ${batch[index]?.fullName}:`, result.reason);
          }
        });

        // Re-merge EVERYTHING (cached + new batch) for consistent ranking
        const userMap = new Map();
        cacheResults.forEach((data) => {
          if (Array.isArray(data)) {
            data.forEach(user => mergeUserData(userMap, user, rankingType));
          }
        });

        const mergedRawData = Array.from(userMap.values())
          .map(user => {
            if (rankingType === RANKING_TYPES.COMMITS) {
              return { ...user, total: user.commits || 0 };
            } else if (rankingType === RANKING_TYPES.LANGUAGES) {
              return { ...user, total: user.totalFiles || 0 };
            }
            return { ...user, total: calculateUserTotal(user) };
          })
          .sort((a, b) => b.total - a.total || a.username.localeCompare(b.username));

        setRankingData(transformRankingData(mergedRawData, rankingType));
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
