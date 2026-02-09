/**
 * Real-time Refresh Job
 * 
 * Background job that frequently checks for GitHub changes using ETags.
 * When changes are detected, it notifies connected clients via Socket.IO.
 */

const { checkRepoChanges } = require('../services/githubService');

const ALLOWED_REPOS = ['timeriver/cnd_chat', 'timeriver/sacsys009', 'timeriver/learnings'];
const CHECK_INTERVAL_MS = 15000; // Check every 15 seconds

let interval = null;
let isChecking = false;

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
            for (const repoFullName of ALLOWED_REPOS) {
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
