const { getGithubProfileWithRepos, getIssuesByUserForPeriod, getAccessibleRepositories, checkCacheStatus, checkRepoChanges } = require('../services/githubService');

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
    const allRepos = await getAccessibleRepositories();
    
    // Filter to only return the two specific repositories to reduce API calls
    const allowedRepos = ['timeriver/cnd_chat', 'timeriver/sacsys009'];
    const filteredRepos = allRepos.filter(repo => 
      allowedRepos.includes(repo.fullName)
    );
    
    res.json({
      success: true,
      data: filteredRepos,
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
    if (!validFilters.includes(filter)) {
      const error = new Error(`Invalid filter. Must be one of: ${validFilters.join(', ')}`);
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

module.exports = { handleGithubLookup, handleIssuesByPeriod, handleGetRepositories, handleCacheCheck, handleRepoChanges };
