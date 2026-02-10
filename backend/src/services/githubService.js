/**
 * GitHub Service Wrapper
 * 
 * This service provides a consolidated API for GitHub operations,
 * delegating to specialized services for repositories, issues, and commits.
 */

const {
  getAccessibleRepositories,
  getGithubProfileWithRepos,
  getRepoInfo,
  searchRepositories,
  addTrackedRepository,
  removeTrackedRepository
} = require('./github/githubRepoService');

const {
  getIssuesByUserForPeriod,
  getIssueTimeline
} = require('./github/githubIssueService');

const {
  getCommitsByUserForPeriod,
  getLanguagesByUserForPeriod
} = require('./github/githubCommitsService');

const {
  generateCacheKey,
  getCachedGitHubResponse,
} = require('../utils/githubCache');

const cacheService = require('./cacheService');

/**
 * Clear cache entries for a specific repository
 */
async function clearCacheForRepo(repoFullName) {
  const filters = ['today', 'yesterday', 'this-week', 'last-week', 'this-month'];
  let clearedCount = 0;

  console.log(`[Cache] Clearing entries for repo: ${repoFullName}`);
}

/**
 * Check cache status for a repo/filter combination
 */
async function checkCacheStatus(repoFullName, filter) {
  const cacheKey = generateCacheKey('issues', repoFullName, filter);
  const cached = await getCachedGitHubResponse(cacheKey);

  if (!cached) return { valid: false };

  return {
    valid: true,
    timestamp: cached.timestamp,
    expiresAt: cached.expiresAt,
    age: Date.now() - new Date(cached.timestamp || Date.now()).getTime()
  };
}

/**
 * Check if repository has changed using ETag conditional requests.
 * 304 responses don't count against GitHub's rate limit!
 * Also checks pushed_at and updated_at to detect both code and issue changes.
 */
async function checkRepoChanges(repoFullName) {
  const { githubClient, withAuth } = require('./github/githubClients');
  const etagCacheKey = `github:repo_etag:${repoFullName.replace('/', '_')}`;
  const timestampCacheKey = `github:repo_last_state:${repoFullName.replace('/', '_')}`;

  try {
    // Get stored ETag for conditional request
    const storedETag = await cacheService.get(etagCacheKey);
    const headers = withAuth();
    if (storedETag) {
      headers['If-None-Match'] = storedETag;
    }

    const response = await githubClient.get(`/repos/${repoFullName}`, {
      headers,
      validateStatus: (status) => status === 200 || status === 304,
    });

    // 304 = Not Modified (FREE — doesn't count against rate limit)
    if (response.status === 304) {
      return { changed: false };
    }

    // 200 = Data returned, check if anything meaningful changed
    const repo = response.data;
    const newETag = response.headers.etag || null;
    const currentState = `${repo.pushed_at}|${repo.updated_at}`;

    // Store the new ETag for next request
    if (newETag) {
      await cacheService.set(etagCacheKey, newETag, 86400 * 7); // 7 days
    }

    // Compare with stored state
    const storedState = await cacheService.get(timestampCacheKey);
    if (storedState === currentState) {
      return { changed: false };
    }

    // Store new state
    await cacheService.set(timestampCacheKey, currentState, 86400 * 7);
    return { changed: true };
  } catch (error) {
    console.error(`[checkRepoChanges] Error for ${repoFullName}:`, error.message);
    return { changed: true }; // Fallback to 'changed' to be safe
  }
}

module.exports = {
  getGithubProfileWithRepos,
  getIssuesByUserForPeriod,
  getAccessibleRepositories,
  clearCacheForRepo,
  checkCacheStatus,
  checkRepoChanges,
  getCommitsByUserForPeriod,
  getLanguagesByUserForPeriod,
  getIssueTimeline,
  getRepoInfo,
  searchRepositories,
  addTrackedRepository,
  removeTrackedRepository
};
