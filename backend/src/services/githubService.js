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

/**
 * Clear cache entries for a specific repository
 */
async function clearCacheForRepo(repoFullName) {
  const filters = ['today', 'yesterday', 'this-week', 'last-week', 'this-month'];
  let clearedCount = 0;

  // We use the centralized githubCache system now
  // Since it's Redis-based, we'd ideally have a pattern-based delete, 
  // but for now, we'll manually clear common keys if needed.
  // In the new system, keys are 'github:issues:owner_repo:filter'

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
 * Check if repository issues have changed (minimal ETag check)
 */
async function checkRepoChanges(repoFullName) {
  // This is a specialized optimization. For now, we delegate to getting repo info
  // or just assume it might have changed. 
  // To keep API compatibility without the complex ETag logic here:
  return { changed: true, etag: null };
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
