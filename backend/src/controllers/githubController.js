const crypto = require('crypto');
const axios = require('axios');
const cacheService = require('../services/cacheService');
const { withAuth } = require('../services/github/githubClients');
const { getGithubProfileWithRepos, getIssuesByUserForPeriod, getAccessibleRepositories, checkCacheStatus, checkRepoChanges, getCommitsByUserForPeriod, getLanguagesByUserForPeriod, getIssueTimeline, addTrackedRepository, removeTrackedRepository } = require('../services/githubService');

async function handleGithubLookup(req, res, next) {
  try {
    const username = req.params.username;
    const data = await getGithubProfileWithRepos(username);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function handleGetRepositories(req, res, next) {
  try {
    const repos = await getAccessibleRepositories(req.user.userId);

    res.json({
      success: true,
      data: repos,
    });
  } catch (error) {
    next(error);
  }
}

async function handleIssuesByPeriod(req, res, next) {
  try {
    const { repo, filter = 'today' } = req.query;

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

    const data = await getIssuesByUserForPeriod(repo, filter);
    res.json({
      success: true,
      data,
      repo,
      filter,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Lightweight endpoint to check if cache has changed
 * Returns cache status without fetching data from GitHub
 */
async function handleCacheCheck(req, res, next) {
  try {
    const { repo, filter = 'today' } = req.query;

    if (!repo) {
      const error = new Error('Repository is required. Use ?repo=owner/name');
      error.status = 400;
      throw error;
    }

    const cacheInfo = checkCacheStatus(repo, filter);
    res.json({
      success: true,
      cache: cacheInfo,
      repo,
      filter,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Check if repository has changes using GitHub's ETag (conditional request)
 * Returns 304 responses DON'T count against rate limit!
 * This allows for very frequent polling without wasting API calls.
 */
async function handleRepoChanges(req, res, next) {
  try {
    const { repo } = req.query;

    if (!repo) {
      const error = new Error('Repository is required. Use ?repo=owner/name');
      error.status = 400;
      throw error;
    }

    const result = await checkRepoChanges(repo);
    res.json({
      success: true,
      changed: result.changed,
      repo,
    });
  } catch (error) {
    next(error);
  }
}

async function handleCommitsByPeriod(req, res, next) {
  try {
    const { repo, filter = 'today' } = req.query;

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

    const data = await getCommitsByUserForPeriod(repo, filter);
    res.json({
      success: true,
      data,
      repo,
      filter,
    });
  } catch (error) {
    next(error);
  }
}

async function handleLanguagesByPeriod(req, res, next) {
  try {
    const { repo, filter = 'all' } = req.query;

    if (!repo) {
      const error = new Error('Repository is required. Use ?repo=owner/name');
      error.status = 400;
      throw error;
    }

    // Allow 'all' for overall percentages, or standard period filters, or custom month format
    const validFilters = ['all', 'today', 'yesterday', 'this-week', 'last-week', 'this-month'];
    const isValidFilter = validFilters.includes(filter) || (filter && filter.startsWith('month-') && filter.match(/^month-\d{2}-\d{4}$/));
    if (!isValidFilter) {
      const error = new Error(`Invalid filter. Must be one of: ${validFilters.join(', ')}, or a custom month format (month-MM-YYYY)`);
      error.status = 400;
      throw error;
    }

    const data = await getLanguagesByUserForPeriod(repo, filter);
    res.json({
      success: true,
      data,
      repo,
      filter,
    });
  } catch (error) {
    next(error);
  }
}

async function handleGetTimeline(req, res, next) {
  try {
    const { repo, filter = 'this-month', date } = req.query;

    if (!repo) {
      const error = new Error('Repository is required. Use ?repo=owner/name');
      error.status = 400;
      throw error;
    }

    // Validate filter / date
    // If date is provided, filter is optional or ignored

    const data = await getIssueTimeline(repo, filter, date);

    res.json({
      success: true,
      data,
      repo,
      filter,
      date,
    });
  } catch (error) {
    next(error);
  }
}

async function handleProxyImage(req, res, next) {
  try {
    const { url } = req.query;

    if (!url) {
      const error = new Error('URL is required');
      error.status = 400;
      throw error;
    }

    // Generate a secure cache key
    const urlHash = crypto.createHash('md5').update(url).digest('hex');
    const cacheKey = `media_proxy:${urlHash}`;

    // 1. Check Shared Cache (Redis)
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      // 2. Prevent Stale Data: ETag Revalidation
      const clientEtag = req.headers['if-none-match'];
      const serverEtag = cached.etag || `W/"${urlHash}"`;

      if (clientEtag === serverEtag) {
        console.log('[GithubProxy] 304 Not Modified (Shared Cache):', url);
        return res.status(304).end();
      }

      console.log('[GithubProxy] Serving from Shared Redis Cache:', url);
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('ETag', serverEtag);
      res.setHeader('Cache-Control', 'public, no-cache'); // Force revalidation

      if (cached.headers) {
        Object.entries(cached.headers).forEach(([k, v]) => {
          if (k !== 'cache-control' && k !== 'etag') res.setHeader(k, v);
        });
      }

      // Buffer conversion if stored as base64
      const buffer = Buffer.from(cached.data, 'base64');
      return res.send(buffer);
    }

    // 3. Fallback: Fetch from GitHub
    const isAllowed = url.startsWith('https://github.com/') ||
      url.startsWith('https://raw.githubusercontent.com/') ||
      url.includes('github-production-user-asset');

    if (!isAllowed) {
      const error = new Error('Only GitHub URLs and assets are allowed');
      error.status = 403;
      throw error;
    }


    const response = await axios.get(url, {
      headers: {
        ...(await withAuth()),
        'User-Agent': 'HR-System-Backend'
      },
      responseType: 'arraybuffer',
      timeout: 30000
    });

    const contentType = response.headers['content-type'] || 'application/octet-stream';
    const serverEtag = `W/"${urlHash}"`;

    // Forward important headers
    const resHeaders = {};
    const headersToForward = ['content-type', 'content-length', 'accept-ranges', 'content-range'];
    headersToForward.forEach(header => {
      if (response.headers[header]) {
        res.setHeader(header, response.headers[header]);
        resHeaders[header] = response.headers[header];
      }
    });

    res.setHeader('ETag', serverEtag);
    res.setHeader('Cache-Control', 'public, no-cache');

    // 4. Store in Shared Cache
    // We store as base64 because JSON based cache (Upstash/Redis) handles it better
    const base64Data = Buffer.from(response.data).toString('base64');

    // Use a very long TTL for shared storage, stale status is handled by ETag revalidation
    await cacheService.set(cacheKey, {
      data: base64Data,
      contentType,
      headers: resHeaders,
      etag: serverEtag
    }, 604800, serverEtag); // 7 days TTL

    res.send(response.data);

  } catch (error) {
    console.error('[GithubProxy] Error proxying content:', error.message);
    if (error.response) {
      res.status(error.response.status).send(`Failed to fetch from GitHub: ${error.message}`);
    } else {
      next(error);
    }
  }
}

async function handleSearchRepositories(req, res, next) {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json({ success: true, data: [] });
    }

    const { searchRepositories } = require('../services/githubService');
    const repos = await searchRepositories(q);

    res.json({
      success: true,
      data: repos
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Handle adding a repository to tracked list
 */
async function handleAddTrackedRepo(req, res, next) {
  try {
    const repoData = req.body;
    if (!repoData || !repoData.fullName) {
      return res.status(400).json({ success: false, error: 'Repository data required' });
    }

    const result = await addTrackedRepository(repoData, req.user.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Handle removing a repository from tracked list
 */
async function handleRemoveTrackedRepo(req, res, next) {
  try {
    const { fullName } = req.params;
    // Handle namespaced params if they come in via query or body
    const repoToRemove = fullName || req.query.fullName || req.body.fullName;

    if (!repoToRemove) {
      return res.status(400).json({ success: false, error: 'Repository fullName required' });
    }

    const result = await removeTrackedRepository(decodeURIComponent(repoToRemove), req.user.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleGithubLookup,
  handleIssuesByPeriod,
  handleGetRepositories,
  handleCacheCheck,
  handleRepoChanges,
  handleCommitsByPeriod,
  handleLanguagesByPeriod,
  handleGetTimeline,
  handleProxyImage,
  handleSearchRepositories,
  handleAddTrackedRepo,
  handleRemoveTrackedRepo
};
