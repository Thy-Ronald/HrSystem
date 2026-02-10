/**
 * Analytics Service
 * 
 * Aggregates GitHub data across tracked repositories for analytics dashboards.
 * Uses shared GitHub clients, caching, and dynamic repo lookup.
 */

const { getIssuesByUserForPeriod, getCommitsByUserForPeriod, getLanguagesByUserForPeriod, getAccessibleRepositories } = require('./githubService');
const { githubClient, githubGraphQLClient, withAuth } = require('./github/githubClients');
const { getDateRange } = require('./github/githubUtils');
const {
  generateCacheKey,
  getCachedGitHubResponse,
  setCachedGitHubResponse,
} = require('../utils/githubCache');

/**
 * Get the list of tracked repos dynamically
 * @returns {Promise<string[]>} Array of repo full names
 */
async function getTrackedRepoList() {
  try {
    const repos = await getAccessibleRepositories();
    return repos.map(r => r.fullName).filter(Boolean);
  } catch (error) {
    console.error('[Analytics] Error fetching tracked repos:', error.message);
    return [];
  }
}

/**
 * Get analytics overview for all tracked repositories
 * @param {string} filter - Filter type: today, yesterday, this-week, last-week, this-month
 * @returns {Promise<Object>} Overview statistics
 */
async function getAnalyticsOverview(filter = 'this-month') {
  // Check Redis cache first (15-minute TTL)
  const cacheKey = generateCacheKey('analytics', 'overview', filter);
  const cached = await getCachedGitHubResponse(cacheKey);
  if (cached && cached.data) return cached.data;

  const overview = {
    activeContributors: 0,
    totalIssuesCompleted: 0,
    totalCommits: 0,
    averageCompletionRate: 0,
    topPerformer: null,
    period: filter,
  };

  const allUsers = new Map();
  let totalAssigned = 0;
  let totalDone = 0;

  const trackedRepos = await getTrackedRepoList();

  // Fetch data from all tracked repositories
  for (const repo of trackedRepos) {
    try {
      // Get issues
      const issues = await getIssuesByUserForPeriod(repo, filter);
      issues.forEach(user => {
        const username = user.username.toLowerCase().trim();
        if (!allUsers.has(username)) {
          allUsers.set(username, {
            username: user.username,
            issues: 0,
            commits: 0,
            done: 0,
            assigned: 0,
          });
        }
        const userData = allUsers.get(username);
        userData.issues += user.total || 0;
        userData.done += user.done || 0;
        userData.assigned += user.assigned || 0;
        totalAssigned += user.assigned || 0;
        totalDone += user.done || 0;
      });

      // Get commits
      const commits = await getCommitsByUserForPeriod(repo, filter);
      commits.forEach(user => {
        const username = user.username.toLowerCase().trim();
        if (!allUsers.has(username)) {
          allUsers.set(username, {
            username: user.username,
            issues: 0,
            commits: 0,
            done: 0,
            assigned: 0,
          });
        }
        allUsers.get(username).commits += user.commits || user.total || 0;
      });
    } catch (error) {
      console.error(`[Analytics] Error fetching data for ${repo}:`, error.message);
    }
  }

  // Calculate metrics
  overview.activeContributors = allUsers.size;
  overview.totalIssuesCompleted = totalDone;
  overview.totalCommits = Array.from(allUsers.values()).reduce((sum, user) => sum + user.commits, 0);
  overview.averageCompletionRate = totalAssigned > 0 ? Math.round((totalDone / totalAssigned) * 100) : 0;

  // Find top performer (highest combined score)
  const usersArray = Array.from(allUsers.values()).map(user => ({
    ...user,
    score: user.done * 2 + user.commits, // Weight issues more than commits
  }));
  usersArray.sort((a, b) => b.score - a.score);
  overview.topPerformer = usersArray.length > 0 ? usersArray[0].username : null;

  // Cache for 15 minutes
  await setCachedGitHubResponse(cacheKey, overview, null, 900);

  return overview;
}

/**
 * Get daily activity trends for the last 10 days
 * @param {string} filter - Filter type (not used, always returns last 10 days)
 * @returns {Promise<Array>} Array of daily activity data
 */
async function getDailyActivityTrends(filter = 'this-month') {
  // Check Redis cache first (30-minute TTL)
  const cacheKey = generateCacheKey('analytics', 'daily-trends', filter);
  const cached = await getCachedGitHubResponse(cacheKey);
  if (cached && cached.data) return cached.data;

  const now = new Date();
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  // Start from 9 days ago (to get 10 days total including today)
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 9);
  startDate.setHours(0, 0, 0, 0);

  console.log(`[Analytics] Fetching daily trends from ${startDate.toISOString()} to ${endDate.toISOString()}`);

  // Initialize daily counters
  const dailyData = new Map();
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    dailyData.set(dateKey, { date: dateKey, commits: 0, issues: 0 });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const trackedRepos = await getTrackedRepoList();

  // Fetch commits for all tracked repositories
  let totalCommitsCounted = 0;
  for (const repo of trackedRepos) {
    try {
      const [owner, repoName] = repo.split('/');
      console.log(`[Analytics] Fetching commits for ${repo} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Fetch commits for the 10-day period
      let hasNextPage = true;
      let page = 1;
      const maxPages = 10;
      let repoCommitsFetched = 0;
      let repoCommitsCounted = 0;

      while (hasNextPage && page <= maxPages) {
        const response = await githubClient.get(`/repos/${owner}/${repoName}/commits`, {
          headers: withAuth(),
          params: {
            since: startDate.toISOString(),
            until: endDate.toISOString(),
            per_page: 100,
            page: page,
          },
        });

        const commits = response.data;

        if (commits.length === 0) {
          hasNextPage = false;
          break;
        }

        repoCommitsFetched += commits.length;

        // Count commits by date
        for (const commit of commits) {
          let commitDate = null;
          if (commit.commit) {
            commitDate = commit.commit.author?.date || commit.commit.committer?.date;
          }

          if (commitDate) {
            const date = new Date(commitDate);
            const dateKey = date.toISOString().split('T')[0];

            if (dailyData.has(dateKey)) {
              dailyData.get(dateKey).commits += 1;
              repoCommitsCounted++;
              totalCommitsCounted++;
            }
          }
        }

        const linkHeader = response.headers.link;
        hasNextPage = linkHeader && linkHeader.includes('rel="next"');
        page++;
      }

      console.log(`[Analytics] Fetched ${repoCommitsFetched} commits from ${repo}, counted ${repoCommitsCounted} in date range`);
    } catch (error) {
      console.error(`[Analytics] Error fetching commits for ${repo}:`, error.message);
      if (error.response) {
        console.error(`[Analytics] Response status:`, error.response.status);
      }
    }
  }

  // Fetch issues completed (done status) for all tracked repositories
  let totalIssuesFound = 0;
  for (const repo of trackedRepos) {
    try {
      const [owner, repoName] = repo.split('/');
      console.log(`[Analytics] Fetching issues for ${repo}`);

      let hasNextPage = true;
      let cursor = null;
      let pageCount = 0;
      const maxPages = 10;
      let repoIssuesProcessed = 0;
      let repoIssuesDone = 0;

      while (hasNextPage && pageCount < maxPages) {
        pageCount++;

        const query = `
          query GetIssues($owner: String!, $repo: String!, $cursor: String) {
            repository(owner: $owner, name: $repo) {
              issues(
                first: 100
                after: $cursor
                orderBy: { field: UPDATED_AT, direction: DESC }
                filterBy: { states: [OPEN, CLOSED] }
              ) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  number
                  updatedAt
                  labels(first: 10) {
                    nodes {
                      name
                    }
                  }
                  timelineItems(first: 100, itemTypes: [LABELED_EVENT]) {
                    nodes {
                      ... on LabeledEvent {
                        createdAt
                        label {
                          name
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `;

        const response = await githubGraphQLClient.post(
          '',
          { query, variables: { owner, repo: repoName, cursor } },
          { headers: withAuth() }
        );

        if (response.data.errors) {
          console.error(`[Analytics] GraphQL errors for ${repo}:`, response.data.errors);
          break;
        }

        const issues = response.data.data?.repository?.issues?.nodes || [];
        const pageInfo = response.data.data?.repository?.issues?.pageInfo;

        // Process issues - find when "3:Local Done" label was added
        for (const issue of issues) {
          repoIssuesProcessed++;
          const updatedAt = new Date(issue.updatedAt);
          // Early termination if issue is too old
          if (updatedAt < startDate) {
            hasNextPage = false;
            break;
          }

          // Check if issue has "3:Local Done" label
          const hasDoneLabel = issue.labels?.nodes?.some(label => label.name === '3:Local Done');

          if (hasDoneLabel) {
            repoIssuesDone++;
            const timelineItems = issue.timelineItems?.nodes || [];
            let doneDate = null;

            for (const event of timelineItems) {
              if (event.label?.name === '3:Local Done' && event.createdAt) {
                const eventDate = new Date(event.createdAt);
                if (eventDate >= startDate && eventDate <= endDate) {
                  if (!doneDate || eventDate > doneDate) {
                    doneDate = eventDate;
                  }
                }
              }
            }

            if (doneDate) {
              const dateKey = doneDate.toISOString().split('T')[0];
              if (dailyData.has(dateKey)) {
                dailyData.get(dateKey).issues += 1;
                totalIssuesFound++;
              }
            } else if (updatedAt >= startDate && updatedAt <= endDate) {
              const dateKey = updatedAt.toISOString().split('T')[0];
              if (dailyData.has(dateKey)) {
                dailyData.get(dateKey).issues += 1;
                totalIssuesFound++;
              }
            }
          }
        }

        hasNextPage = pageInfo?.hasNextPage || false;
        cursor = pageInfo?.endCursor || null;
      }

      console.log(`[Analytics] Processed ${repoIssuesProcessed} issues from ${repo}, found ${repoIssuesDone} with done label, counted ${totalIssuesFound} total`);
    } catch (error) {
      console.error(`[Analytics] Error fetching issues for ${repo}:`, error.message);
      if (error.response) {
        console.error(`[Analytics] Response status:`, error.response.status);
      }
    }
  }

  // Convert map to sorted array
  const result = Array.from(dailyData.values())
    .sort((a, b) => a.date.localeCompare(b.date));

  console.log(`[Analytics] Daily trends result:`, result);
  console.log(`[Analytics] Total commits counted: ${totalCommitsCounted}, Total issues counted: ${totalIssuesFound}`);

  // Cache for 30 minutes
  await setCachedGitHubResponse(cacheKey, result, null, 1800);

  return result;
}

/**
 * Get top contributors
 * @param {number} limit - Number of top contributors to return
 * @param {string} filter - Filter type
 * @returns {Promise<Array>} Array of top contributors
 */
async function getTopContributors(limit = 10, filter = 'this-month') {
  // Check Redis cache first (15-minute TTL)
  const cacheKey = generateCacheKey('analytics', 'top-contributors', filter);
  const cached = await getCachedGitHubResponse(cacheKey);
  if (cached && cached.data) return cached.data;

  const allUsers = new Map();
  const trackedRepos = await getTrackedRepoList();

  // Fetch data from all tracked repositories
  for (const repo of trackedRepos) {
    try {
      // Get issues
      const issues = await getIssuesByUserForPeriod(repo, filter);
      issues.forEach(user => {
        const username = user.username.toLowerCase().trim();
        if (!allUsers.has(username)) {
          allUsers.set(username, {
            username: user.username,
            issues: 0,
            commits: 0,
            done: 0,
            assigned: 0,
            inProgress: 0,
            reviewed: 0,
            devDeployed: 0,
            devChecked: 0,
          });
        }
        const userData = allUsers.get(username);
        userData.issues += user.total || 0;
        userData.done += user.done || 0;
        userData.assigned += user.assigned || 0;
        userData.inProgress += user.inProgress || 0;
        userData.reviewed += user.reviewed || 0;
        userData.devDeployed += user.devDeployed || 0;
        userData.devChecked += user.devChecked || 0;
      });

      // Get commits
      const commits = await getCommitsByUserForPeriod(repo, filter);
      commits.forEach(user => {
        const username = user.username.toLowerCase().trim();
        if (!allUsers.has(username)) {
          allUsers.set(username, {
            username: user.username,
            issues: 0,
            commits: 0,
            done: 0,
            assigned: 0,
            inProgress: 0,
            reviewed: 0,
            devDeployed: 0,
            devChecked: 0,
          });
        }
        allUsers.get(username).commits += user.commits || user.total || 0;
      });
    } catch (error) {
      console.error(`[Analytics] Error fetching data for ${repo}:`, error.message);
    }
  }

  // Calculate scores and sort
  const contributors = Array.from(allUsers.values()).map(user => ({
    ...user,
    totalScore: user.done * 2 + user.commits,
  }));

  contributors.sort((a, b) => b.totalScore - a.totalScore);

  const result = contributors.slice(0, limit);

  // Cache for 15 minutes
  await setCachedGitHubResponse(cacheKey, result, null, 900);

  return result;
}

/**
 * Get language distribution
 * @param {string} filter - Filter type (or 'all' for overall)
 * @returns {Promise<Array>} Language distribution data
 */
async function getLanguageDistribution(filter = 'all') {
  // Check Redis cache first (15-minute TTL)
  const cacheKey = generateCacheKey('analytics', 'language-dist', filter);
  const cached = await getCachedGitHubResponse(cacheKey);
  if (cached && cached.data) return cached.data;

  const languageMap = new Map();
  const trackedRepos = await getTrackedRepoList();

  for (const repo of trackedRepos) {
    try {
      const languages = await getLanguagesByUserForPeriod(repo, filter);
      languages.forEach(user => {
        if (user.topLanguages && Array.isArray(user.topLanguages)) {
          user.topLanguages.forEach(lang => {
            const langName = lang.language;
            const currentCount = languageMap.get(langName) || 0;
            languageMap.set(langName, currentCount + (lang.count || 0));
          });
        }
      });
    } catch (error) {
      console.error(`[Analytics] Error fetching languages for ${repo}:`, error.message);
    }
  }

  // Convert to array and sort
  const result = Array.from(languageMap.entries())
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count);

  // Cache for 15 minutes
  await setCachedGitHubResponse(cacheKey, result, null, 900);

  return result;
}

module.exports = {
  getAnalyticsOverview,
  getDailyActivityTrends,
  getTopContributors,
  getLanguageDistribution,
};
