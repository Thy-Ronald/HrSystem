/**
 * Real-time Refresh Job
 * 
 * Background job that checks for GitHub changes using conditional requests.
 * When changes are detected, it notifies connected clients via Socket.IO.
 * 
 * OPTIMIZATIONS:
 * - Polls every 2 minutes instead of 15 seconds (saves ~700 req/hr)
 * - Uses ETag conditional requests (304 responses don't count against rate limit)
 * - Dynamically fetches tracked repos from DB instead of hardcoded list
 * - Caches repo list in-memory to avoid DB queries on every poll
 */

const { checkRepoChanges } = require('../services/githubService');
const { getAccessibleRepositories } = require('../services/github/githubRepoService');

const CHECK_INTERVAL_MS = 120000; // Check every 2 minutes (was 15 seconds)
const REPO_LIST_REFRESH_MS = 300000; // Refresh repo list every 5 minutes

let interval = null;
let isChecking = false;
let cachedRepos = [];
let lastRepoListRefresh = 0;

/**
 * Get the list of tracked repositories (with in-memory caching)
 * @returns {Promise<string[]>} Array of repo full names
 */
async function getTrackedRepoList() {
    const now = Date.now();
    if (cachedRepos.length > 0 && (now - lastRepoListRefresh) < REPO_LIST_REFRESH_MS) {
        return cachedRepos;
    }

    try {
        const repos = await getAccessibleRepositories();
        cachedRepos = repos.map(r => r.fullName).filter(Boolean);
        lastRepoListRefresh = now;
        return cachedRepos;
    } catch (error) {
        console.error('[RealtimeJob] Error fetching tracked repos:', error.message);
        return cachedRepos; // Return stale list on error
    }
}

/**
 * Start the background real-time monitoring job
 * @param {Object} io - Socket.IO server instance
 */
function startRealtimeRefreshJob(io) {
    if (interval) {
        console.log('[RealtimeJob] Job already running');
        return;
    }

    console.log(`[RealtimeJob] Starting background change detection (interval: ${CHECK_INTERVAL_MS / 1000}s)`);

    interval = setInterval(async () => {
        if (isChecking) return;
        isChecking = true;

        try {
            const repos = await getTrackedRepoList();

            if (repos.length === 0) {
                return;
            }

            for (const repoFullName of repos) {
                const result = await checkRepoChanges(repoFullName);

                if (result.changed) {
                    console.log(`[RealtimeJob] Change detected in ${repoFullName}, notifying clients...`);
                    io.emit('github:repo-updated', {
                        repo: repoFullName,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        } catch (error) {
            console.error('[RealtimeJob] Error checking for changes:', error.message);
        } finally {
            isChecking = false;
        }
    }, CHECK_INTERVAL_MS);
}

/**
 * Stop the background job
 */
function stopRealtimeRefreshJob() {
    if (interval) {
        clearInterval(interval);
        interval = null;
        console.log('[RealtimeJob] Background job stopped');
    }
}

module.exports = {
    startRealtimeRefreshJob,
    stopRealtimeRefreshJob
};
