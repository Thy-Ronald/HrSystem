/**
 * Issue Cache Controller
 * 
 * Handles API requests for cached GitHub issues.
 * 
 * ENDPOINTS:
 * ==========
 * GET /api/issues - Get cached issues for repo/user with optional filtering
 * GET /api/issues/cache-status - Get cache status for a repository
 * POST /api/issues/refresh - Force refresh cache for a repository
 * GET /api/issues/job-status - Get background job status
 * 
 * FILTERING BY CURRENT SCREEN:
 * ============================
 * The frontend sends `repo` and optionally `user` parameters.
 * We only return data relevant to those parameters - no excess data is sent.
 * This optimizes both API response size and frontend processing.
 */

const {
  getIssuesWithCache,
  getCacheStatus,
  refreshRepoCache,
  clearRepoCache,
  getTrackedRepositories,
} = require('../services/issueCacheService');

const { getJobStatus, forceRefreshRepo } = require('../jobs/cacheRefreshJob');

/**
 * GET /api/issues
 * 
 * Fetch issues from cache for a specific repo and filter.
 * Automatically refreshes cache if stale.
 * 
 * Query Parameters:
 * - repo (required): Repository full name (owner/repo)
 * - filter (optional): today|yesterday|this-week|last-week|this-month (default: today)
 * - user (optional): Filter by specific username
 * - forceRefresh (optional): Force cache refresh (default: false)
 */
async function handleGetIssues(req, res, next) {
  try {
    const { repo, filter = 'today', user, forceRefresh } = req.query;

    // Validate required parameters
    if (!repo) {
      const error = new Error('Repository is required. Use ?repo=owner/name');
      error.status = 400;
      throw error;
    }

    // Validate filter value
    const validFilters = ['today', 'yesterday', 'this-week', 'last-week', 'this-month'];
    if (!validFilters.includes(filter)) {
      const error = new Error(`Invalid filter. Must be one of: ${validFilters.join(', ')}`);
      error.status = 400;
      throw error;
    }

    console.log(`[IssueCache API] GET /api/issues - repo=${repo}, filter=${filter}, user=${user || 'all'}, forceRefresh=${forceRefresh}`);

    // Get issues from cache (will refresh if needed)
    const result = await getIssuesWithCache(
      repo,
      filter,
      user || null,
      forceRefresh === 'true'
    );

    res.json({
      success: true,
      data: result.data,
      repo,
      filter,
      user: user || null,
      cache: result.cache,
    });

  } catch (error) {
    console.error('[IssueCache API] Error:', error.message);
    next(error);
  }
}

/**
 * GET /api/issues/cache-status
 * 
 * Get cache status for a repository without fetching data.
 * Useful for frontend to determine if refresh is needed.
 * 
 * Query Parameters:
 * - repo (required): Repository full name
 */
async function handleGetCacheStatus(req, res, next) {
  try {
    const { repo } = req.query;

    if (!repo) {
      const error = new Error('Repository is required. Use ?repo=owner/name');
      error.status = 400;
      throw error;
    }

    const status = await getCacheStatus(repo);

    res.json({
      success: true,
      repo,
      cache: status,
    });

  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/issues/refresh
 * 
 * Force refresh cache for a repository.
 * Use when user explicitly requests fresh data.
 * 
 * Body:
 * - repo (required): Repository full name
 * - fullRefresh (optional): Force full refresh instead of incremental
 */
async function handleRefreshCache(req, res, next) {
  try {
    const { repo, fullRefresh } = req.body;

    if (!repo) {
      const error = new Error('Repository is required in request body');
      error.status = 400;
      throw error;
    }

    console.log(`[IssueCache API] POST /api/issues/refresh - repo=${repo}, fullRefresh=${fullRefresh}`);

    const result = await refreshRepoCache(repo, fullRefresh === true);

    res.json({
      success: true,
      repo,
      result,
    });

  } catch (error) {
    console.error('[IssueCache API] Refresh error:', error.message);
    next(error);
  }
}

/**
 * DELETE /api/issues/cache
 * 
 * Clear cache for a repository.
 * Useful when data seems corrupted or for debugging.
 * 
 * Query Parameters:
 * - repo (required): Repository full name
 */
async function handleClearCache(req, res, next) {
  try {
    const { repo } = req.query;

    if (!repo) {
      const error = new Error('Repository is required. Use ?repo=owner/name');
      error.status = 400;
      throw error;
    }

    await clearRepoCache(repo);

    res.json({
      success: true,
      message: `Cache cleared for ${repo}`,
    });

  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/issues/job-status
 * 
 * Get status of the background cache refresh job.
 * Useful for monitoring and debugging.
 */
async function handleGetJobStatus(req, res, next) {
  try {
    const status = getJobStatus();
    const repos = await getTrackedRepositories();

    res.json({
      success: true,
      job: status,
      trackedRepos: repos.length,
      repos: repos.map(r => ({
        name: r.repo_full_name,
        lastFetched: r.last_fetched_at,
        issuesCached: r.total_issues_cached,
      })),
    });

  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/issues/changes
 * 
 * Check if there are any changes since last fetch (lightweight check).
 * Used for smart polling - frontend can check frequently without full data transfer.
 * 
 * Query Parameters:
 * - repo (required): Repository full name
 * - since (optional): ISO timestamp to check against
 */
async function handleCheckChanges(req, res, next) {
  try {
    const { repo, since } = req.query;

    if (!repo) {
      const error = new Error('Repository is required. Use ?repo=owner/name');
      error.status = 400;
      throw error;
    }

    const status = await getCacheStatus(repo);
    
    // If client provided a 'since' timestamp, compare
    let hasChanges = false;
    if (since) {
      const sinceDate = new Date(since);
      const lastFetch = status.lastFetchedAt ? new Date(status.lastFetchedAt) : null;
      hasChanges = !lastFetch || lastFetch > sinceDate;
    } else {
      hasChanges = status.needsRefresh;
    }

    res.json({
      success: true,
      repo,
      hasChanges,
      lastFetchedAt: status.lastFetchedAt,
      needsRefresh: status.needsRefresh,
    });

  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleGetIssues,
  handleGetCacheStatus,
  handleRefreshCache,
  handleClearCache,
  handleGetJobStatus,
  handleCheckChanges,
};
