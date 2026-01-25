/**
 * Cache Refresh Job
 * 
 * Background job that periodically refreshes the GitHub issues cache.
 * 
 * REFRESH STRATEGY:
 * =================
 * 1. Runs every 30 minutes (configurable via CACHE_REFRESH_INTERVAL_MS)
 * 2. Only refreshes the two allowed repositories: timeriver/cnd_chat and timeriver/sacsys009
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

// Only refresh these two specific repositories
const ALLOWED_REPOS = ['timeriver/cnd_chat', 'timeriver/sacsys009'];

// Configuration
const DELAY_BETWEEN_REPOS_MS = 2000; // 2 second delay between repo refreshes

let refreshInterval = null;
let isRunning = false;

/**
 * Sleep utility for adding delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Refresh only the allowed repositories
 * Called by the scheduled job
 * Only refreshes timeriver/cnd_chat and timeriver/sacsys009
 */
async function refreshAllTrackedRepos() {
  if (isRunning) {
    console.log('[CacheJob] Previous refresh still running, skipping this cycle');
    return;
  }

  isRunning = true;
  const startTime = Date.now();
  
  console.log('[CacheJob] ====== Starting scheduled cache refresh ======');
  console.log(`[CacheJob] Only refreshing allowed repositories: ${ALLOWED_REPOS.join(', ')}`);

  try {
    let refreshed = 0;
    let skipped = 0;
    let failed = 0;

    // Only refresh the two allowed repositories
    for (const repoFullName of ALLOWED_REPOS) {
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
        await sleep(DELAY_BETWEEN_REPOS_MS);

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
 * Should be called once during server startup
 */
function startCacheRefreshJob() {
  if (refreshInterval) {
    console.log('[CacheJob] Job already running');
    return;
  }

  console.log(`[CacheJob] Starting background cache refresh job (interval: ${CACHE_CONFIG.REFRESH_INTERVAL_MS / 1000 / 60} minutes)`);

  // Run immediately on startup
  setTimeout(() => {
    console.log('[CacheJob] Running initial cache check...');
    refreshAllTrackedRepos().catch(err => {
      console.error('[CacheJob] Initial refresh failed:', err.message);
    });
  }, 10000); // Wait 10 seconds after startup before first run

  // Schedule periodic refreshes
  refreshInterval = setInterval(() => {
    refreshAllTrackedRepos().catch(err => {
      console.error('[CacheJob] Scheduled refresh failed:', err.message);
    });
  }, CACHE_CONFIG.REFRESH_INTERVAL_MS);

  console.log('[CacheJob] Background job scheduled successfully');
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
