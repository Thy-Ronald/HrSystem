/**
 * Cache Refresh Job
 * 
 * Background job that periodically refreshes the GitHub issues cache.
 * 
 * REFRESH STRATEGY:
 * =================
 * 1. Runs every 15 minutes (configurable via CACHE_CONFIG)
 * 2. Dynamically fetches tracked repositories from DB (Settings screen)
 * 3. Uses incremental refresh (fetches only issues updated since last fetch)
 * 4. Full refresh is done once every 24 hours to catch any edge cases
 * 
 * ERROR HANDLING:
 * ===============
 * - Individual repo refresh failures don't stop the entire job
 * - Errors are logged but job continues with next repo
 * - Retries failed repos on next interval
 * 
 * RATE LIMITING:
 * ==============
 * - Repos are refreshed sequentially with a small delay between them
 * - This prevents hitting GitHub's rate limit too quickly
 */

const {
  refreshRepoCache,
  getCacheStatus,
  CACHE_CONFIG
} = require('../services/issueCacheService');
const { getAccessibleRepositories } = require('../services/github/githubRepoService');
const { getRateLimitStatus } = require('../services/github/githubClients');

// Configuration
const DELAY_BETWEEN_REPOS_MS = 2000; // 2 second delay between repo refreshes
const RATE_LIMIT_SKIP_THRESHOLD = 300; // Skip refresh if remaining < this

let refreshInterval = null;
let isRunning = false;

/**
 * Sleep utility for adding delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get the list of tracked repositories dynamically from DB
 * @returns {Promise<string[]>} Array of repo full names
 */
async function getTrackedRepoList() {
  try {
    const repos = await getAccessibleRepositories();
    return repos.map(r => r.fullName).filter(Boolean);
  } catch (error) {
    console.error('[CacheJob] Error fetching tracked repos:', error.message);
    return [];
  }
}

/**
 * Refresh only the tracked repositories
 * Called by the scheduled job
 */
async function refreshAllTrackedRepos() {
  if (isRunning) {
    console.log('[CacheJob] Previous refresh still running, skipping this cycle');
    return;
  }

  // Adaptive backoff: skip if rate limit is low
  const rateLimit = getRateLimitStatus();
  if (rateLimit.remaining !== null && rateLimit.remaining < RATE_LIMIT_SKIP_THRESHOLD) {
    const resetDate = rateLimit.reset ? new Date(rateLimit.reset * 1000).toLocaleTimeString() : 'unknown';
    console.warn(`[CacheJob] ⚠️ Rate limit low (${rateLimit.remaining}/${rateLimit.limit}), skipping refresh. Resets at ${resetDate}`);
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  console.log('[CacheJob] ====== Starting scheduled cache refresh ======');

  try {
    const trackedRepos = await getTrackedRepoList();

    if (trackedRepos.length === 0) {
      console.log('[CacheJob] No tracked repositories found, skipping refresh');
      return;
    }

    console.log(`[CacheJob] Refreshing tracked repositories: ${trackedRepos.join(', ')}`);

    let refreshed = 0;
    let skipped = 0;
    let failed = 0;

    for (const repoFullName of trackedRepos) {
      try {
        // Check if this repo actually needs refresh
        const status = await getCacheStatus(repoFullName);

        if (!status.needsRefresh) {
          console.log(`[CacheJob] ${repoFullName} - Cache still valid, skipping`);
          skipped++;
          continue;
        }

        console.log(`[CacheJob] Refreshing ${repoFullName}...`);

        const result = await refreshRepoCache(repoFullName);

        if (result.status === 'success') {
          refreshed++;
          console.log(`[CacheJob] ${repoFullName} - Refreshed (${result.issuesFetched} issues)`);
        } else {
          skipped++;
          console.log(`[CacheJob] ${repoFullName} - Skipped (${result.reason})`);
        }

        // Add delay between repos to respect rate limits
        if (trackedRepos.length > 1) {
          await sleep(DELAY_BETWEEN_REPOS_MS);
        }

      } catch (error) {
        failed++;
        console.error(`[CacheJob] ${repoFullName} - Failed: ${error.message}`);
        // Continue with next repo
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[CacheJob] ====== Refresh complete ======`);
    console.log(`[CacheJob] Results: ${refreshed} refreshed, ${skipped} skipped, ${failed} failed`);
    console.log(`[CacheJob] Duration: ${(duration / 1000).toFixed(1)}s`);

  } catch (error) {
    console.error('[CacheJob] Critical error during refresh:', error.message);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the background refresh job
 * 
 * DISABLED: The MySQL issue cache is no longer used.
 * /api/issues now reads from Redis-cached GraphQL (getIssuesByUserForPeriod),
 * which caches on first request and serves from Redis on subsequent calls.
 * This eliminates ~40+ REST API calls/hr that were used to maintain the MySQL cache.
 */
function startCacheRefreshJob() {
  console.log('[CacheJob] Background refresh job DISABLED — /api/issues now uses Redis-cached GraphQL');
}

/**
 * Stop the background refresh job
 * Should be called during graceful shutdown
 */
function stopCacheRefreshJob() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    console.log('[CacheJob] Background job stopped');
  }
}

/**
 * Force a refresh of a specific repository
 * Can be called via API for manual refresh
 * @param {string} repoFullName - Repository full name
 */
async function forceRefreshRepo(repoFullName) {
  console.log(`[CacheJob] Force refresh requested for ${repoFullName}`);
  return refreshRepoCache(repoFullName, false);
}

/**
 * Get job status
 * @returns {Object} Job status information
 */
function getJobStatus() {
  return {
    isRunning,
    isScheduled: refreshInterval !== null,
    intervalMs: CACHE_CONFIG.REFRESH_INTERVAL_MS,
    intervalMinutes: CACHE_CONFIG.REFRESH_INTERVAL_MS / 1000 / 60,
  };
}

module.exports = {
  startCacheRefreshJob,
  stopCacheRefreshJob,
  refreshAllTrackedRepos,
  forceRefreshRepo,
  getJobStatus,
};
