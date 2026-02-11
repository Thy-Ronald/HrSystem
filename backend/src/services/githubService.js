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
 * Check if repository has changed by comparing pushed_at timestamps.
 * 
 * Uses cached `getRepoInfo()` (5-min Redis TTL) instead of direct API calls.
 * This means the polling loop costs 0 API calls when the cache is warm.
 * Only on cache miss does it make 1 API call, and getRepoInfo uses ETag
 * so most misses return 304 (free).
 */
async function checkRepoChanges(repoFullName) {
  const pushedAtCacheKey = `github:repo_pushed_at:${repoFullName.replace('/', '_')}`;

  try {
    // Use cached getRepoInfo — no direct API call needed
    const repo = await getRepoInfo(repoFullName);
    if (!repo) return { changed: false };

    // Only compare pushed_at — ignore updated_at which changes too often
    const storedPushedAt = await cacheService.get(pushedAtCacheKey);
    if (storedPushedAt === repo.pushed_at) {
      return { changed: false };
    }

    // Store new pushed_at
    await cacheService.set(pushedAtCacheKey, repo.pushed_at, 86400 * 7);
    return { changed: true };
  } catch (error) {
    console.error(`[checkRepoChanges] Error for ${repoFullName}:`, error.message);
    return { changed: false }; // Changed to false — don't trigger unnecessary refreshes on error
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
