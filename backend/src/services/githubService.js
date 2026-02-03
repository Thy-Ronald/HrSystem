/**
 * GitHub Service Wrapper
 * 
 * This service provides a consolidated API for GitHub operations,
 * delegating to specialized services for repositories, issues, and commits.
 */

const {
  getAccessibleRepositories,
  getGithubProfileWithRepos,
  getRepoInfo
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
 * Check if repository issues have changed (using pushed_at timestamp)
 */
async function checkRepoChanges(repoFullName) {
  try {
    const repo = await getRepoInfo(repoFullName);
    if (!repo) return { changed: false };

    const currentPushedAt = repo.pushed_at;
    const cacheKey = `github:repo_last_pushed:${repoFullName.replace('/', '_')}`;
    const lastPushedAt = await cacheService.get(cacheKey);

    if (lastPushedAt === currentPushedAt) {
      return { changed: false, etag: null };
    }

    // Update cache
    await cacheService.set(cacheKey, currentPushedAt, 86400 * 7); // Cache for 7 days
    return { changed: true, etag: null };
  } catch (error) {
    console.error(`[checkRepoChanges] Error for ${repoFullName}:`, error.message);
    return { changed: true, etag: null }; // Fallback to 'changed' to be safe
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
  getRepoInfo
};
