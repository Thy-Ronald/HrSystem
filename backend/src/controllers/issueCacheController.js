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
 * 
 * REDIS CACHING:
 * ==============
 * Uses Upstash Redis with 2-minute TTL for API response caching.
 * Cache key format: issues:repo:filter:user
 */

const {
  getIssuesWithCache,
  getCacheStatus,
  refreshRepoCache,
  clearRepoCache,
  getTrackedRepositories,
} = require('../services/issueCacheService');

const { getJobStatus, forceRefreshRepo } = require('../jobs/cacheRefreshJob');
const cacheService = require('../services/cacheService');

// Redis cache TTL: 5 minutes (optimized from 2 minutes for better hit rates)
const REDIS_CACHE_TTL = 300;

const crypto = require('crypto');

// ... (other imports)

/**
 * Generate MD5 ETag from data
 */
function generateETag(data) {
  return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
}

/**
 * GET /api/issues
 * 
 * Fetch issues from cache for a specific repo and filter.
 * Uses Redis caching and ETag support for efficient updates.
 */
async function handleGetIssues(req, res, next) {
  try {
    const { repo, filter = 'today', user, forceRefresh } = req.query;

    // Validate params... (keep existing validation)
    if (!repo) {
      const error = new Error('Repository is required. Use ?repo=owner/name');
      error.status = 400;
      throw error;
    }

    const validFilters = ['today', 'yesterday', 'this-week', 'last-week', 'this-month'];
    // Allow standard filters or custom month format (month-MM-YYYY)
    const isValidFilter = validFilters.includes(filter) || (filter && filter.startsWith('month-') && filter.match(/^month-\d{2}-\d{4}$/));
    if (!isValidFilter) {
      const error = new Error(`Invalid filter. Must be one of: ${validFilters.join(', ')}, or a custom month format (month-MM-YYYY)`);
      error.status = 400;
      throw error;
    }

    // Build Redis cache key
    const cacheKey = `issues:${repo}:${filter}:${user || 'all'}`;
    let responseData = null;
    let fromRedis = false;

    // 1. Try to get from Redis
    if (forceRefresh !== 'true') {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        responseData = cached.data;
        fromRedis = true;
        console.log(`[Redis] ✅ Cache hit for ${cacheKey}`);
      }
    }

    // 2. If not in Redis, fetch from MySQL (incremental logic)
    if (!responseData) {
      // Clear cache if forcing refresh
      if (forceRefresh === 'true') {
        await cacheService.delete(cacheKey);
      }

      const result = await getIssuesWithCache(
        repo,
        filter,
        user || null,
        forceRefresh === 'true'
      );

      responseData = result.data;

      // Store in Redis
      await cacheService.set(cacheKey, {
        data: responseData,
        timestamp: Date.now(),
      }, REDIS_CACHE_TTL);
    }

    // 3. Prepare final response
    const finalResponse = {
      success: true,
      data: responseData,
      repo,
      filter,
      user: user || null,
      cache: {
        fromRedis,
        timestamp: new Date().toISOString(),
      },
    };

    // 4. Handle ETag / 304 Not Modified
    const etag = generateETag(finalResponse);
    const clientETag = req.headers['if-none-match'];

    if (clientETag === etag) {
      console.log(`[IssueCache API] 304 Not Modified (ETag match) for ${repo}`);
      return res.status(304).end();
    }

    // 5. Send Response
    res.set('ETag', etag);
    res.set('Cache-Control', 'public'); // Let client decide TTL based on ETag

    res.json(finalResponse);

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
 * Clears both MySQL cache and Redis cache.
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

    // Clear MySQL cache
    await clearRepoCache(repo);

    // Clear Redis cache for all filters and users for this repo
    const filters = ['today', 'yesterday', 'this-week', 'last-week', 'this-month'];
    for (const filter of filters) {
      await cacheService.delete(`issues:${repo}:${filter}:all`);
      // Also try to delete any user-specific caches (pattern matching)
      await cacheService.deletePattern(`issues:${repo}:${filter}:*`);
    }

    console.log(`[Redis] ✅ Cleared Redis cache for ${repo}`);

    res.json({
      success: true,
      message: `Cache cleared for ${repo} (MySQL and Redis)`,
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
