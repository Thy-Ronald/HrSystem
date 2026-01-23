/**
 * Issues Routes
 * 
 * API routes for cached GitHub issues with incremental refresh support.
 * 
 * ROUTE OVERVIEW:
 * ===============
 * GET  /api/issues              - Get issues for repo/user (main endpoint)
 * GET  /api/issues/cache-status - Check cache status for a repo
 * GET  /api/issues/changes      - Check if data has changed (lightweight poll)
 * GET  /api/issues/job-status   - Get background job status
 * POST /api/issues/refresh      - Force refresh cache for a repo
 * DELETE /api/issues/cache      - Clear cache for a repo
 * 
 * USAGE EXAMPLE:
 * ==============
 * // Get issues for a repo with 'today' filter
 * GET /api/issues?repo=owner/repo&filter=today
 * 
 * // Get issues for a specific user
 * GET /api/issues?repo=owner/repo&filter=this-week&user=johndoe
 * 
 * // Force refresh data
 * GET /api/issues?repo=owner/repo&filter=today&forceRefresh=true
 * 
 * // Check if refresh needed (for smart polling)
 * GET /api/issues/changes?repo=owner/repo
 */

const express = require('express');
const {
  handleGetIssues,
  handleGetCacheStatus,
  handleRefreshCache,
  handleClearCache,
  handleGetJobStatus,
  handleCheckChanges,
} = require('../controllers/issueCacheController');

const router = express.Router();

/**
 * GET /api/issues
 * 
 * Main endpoint for fetching issues with caching.
 * 
 * Query Parameters:
 * @param {string} repo - Repository full name (owner/repo) - REQUIRED
 * @param {string} filter - Filter type: today|yesterday|this-week|last-week|this-month (default: today)
 * @param {string} user - Optional username to filter by
 * @param {string} forceRefresh - Set to 'true' to force cache refresh
 * 
 * Response:
 * {
 *   success: true,
 *   data: [{ username, assigned, inProgress, done, reviewed, devDeployed, devChecked, total }],
 *   repo: string,
 *   filter: string,
 *   user: string|null,
 *   cache: { wasRefreshed, lastFetchedAt, totalCached }
 * }
 */
router.get('/', handleGetIssues);

/**
 * GET /api/issues/cache-status
 * 
 * Get cache status without fetching data.
 * Useful for determining if refresh is needed.
 * 
 * Query Parameters:
 * @param {string} repo - Repository full name - REQUIRED
 * 
 * Response:
 * {
 *   success: true,
 *   repo: string,
 *   cache: { isCached, lastFetchedAt, totalIssues, needsRefresh, timeSinceRefreshMs }
 * }
 */
router.get('/cache-status', handleGetCacheStatus);

/**
 * GET /api/issues/changes
 * 
 * Lightweight endpoint to check if data has changed.
 * Perfect for smart polling without transferring full data.
 * 
 * Query Parameters:
 * @param {string} repo - Repository full name - REQUIRED
 * @param {string} since - ISO timestamp to compare against (optional)
 * 
 * Response:
 * {
 *   success: true,
 *   repo: string,
 *   hasChanges: boolean,
 *   lastFetchedAt: string,
 *   needsRefresh: boolean
 * }
 */
router.get('/changes', handleCheckChanges);

/**
 * GET /api/issues/job-status
 * 
 * Get status of the background cache refresh job.
 * Useful for monitoring and debugging.
 * 
 * Response:
 * {
 *   success: true,
 *   job: { isRunning, isScheduled, intervalMs, intervalMinutes },
 *   trackedRepos: number,
 *   repos: [{ name, lastFetched, issuesCached }]
 * }
 */
router.get('/job-status', handleGetJobStatus);

/**
 * POST /api/issues/refresh
 * 
 * Force refresh cache for a repository.
 * Use when user explicitly requests fresh data.
 * 
 * Request Body:
 * {
 *   repo: string (required),
 *   fullRefresh: boolean (optional, forces full refresh instead of incremental)
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   repo: string,
 *   result: { status, isFullRefresh, issuesFetched, issuesInserted, issuesUpdated, totalCached }
 * }
 */
router.post('/refresh', handleRefreshCache);

/**
 * DELETE /api/issues/cache
 * 
 * Clear cache for a repository.
 * Useful when data seems corrupted or for debugging.
 * 
 * Query Parameters:
 * @param {string} repo - Repository full name - REQUIRED
 * 
 * Response:
 * {
 *   success: true,
 *   message: string
 * }
 */
router.delete('/cache', handleClearCache);

module.exports = router;
