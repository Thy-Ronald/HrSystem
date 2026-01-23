const axios = require('axios');

const githubClient = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Accept: 'application/vnd.github+json',
  },
});

const githubGraphQLClient = axios.create({
  baseURL: 'https://api.github.com/graphql',
  headers: {
    Accept: 'application/vnd.github+json',
  },
});

// Simple in-memory cache for GitHub API responses
const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds for issues (increased from 15)
const REPO_CACHE_TTL = 300000; // 5 minutes for repos

function getCached(key, ttl = CACHE_TTL) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < ttl) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key, data, ttl = CACHE_TTL) {
  cache.set(key, { data, timestamp: Date.now(), ttl });
}

const withAuth = () => {
  const token = process.env.GITHUB_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Fetch all repositories accessible via the GitHub token
 * @returns {Promise<Array>} Array of { owner, name, fullName }
 */
async function getAccessibleRepositories() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    const error = new Error('GITHUB_TOKEN is required');
    error.status = 500;
    throw error;
  }

  // Check cache first (5 min TTL for repos list)
  const cacheKey = 'accessible_repos';
  const cached = getCached(cacheKey, REPO_CACHE_TTL);
  if (cached) {
    return cached;
  }

  try {
    const repos = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await githubClient.get('/user/repos', {
        headers: withAuth(),
        params: {
          per_page: 100,
          page,
          sort: 'updated',
          affiliation: 'owner,collaborator,organization_member',
        },
      });

      const data = response.data;
      repos.push(...data.map((repo) => ({
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
      })));

      hasMore = data.length === 100;
      page++;

      // Limit to 500 repos max
      if (repos.length >= 500) break;
    }

    // Sort by full name
    repos.sort((a, b) => a.fullName.localeCompare(b.fullName));

    // Cache for 5 minutes
    setCache(cacheKey, repos, REPO_CACHE_TTL);

    return repos;
  } catch (error) {
    if (error.response) {
      if (error.response.status === 401 || error.response.status === 403) {
        const err = new Error('GitHub authentication failed. Check your GITHUB_TOKEN.');
        err.status = 401;
        throw err;
      }
    }
    throw error;
  }
}

async function getGithubProfileWithRepos(username) {
  if (!username) {
    const error = new Error('Username is required');
    error.status = 400;
    throw error;
  }

  try {
    const [profileRes, reposRes] = await Promise.all([
      githubClient.get(`/users/${username}`, { headers: withAuth() }),
      githubClient.get(`/users/${username}/repos`, {
        headers: withAuth(),
        params: { per_page: 100, sort: 'updated' },
      }),
    ]);

    const profile = profileRes.data;
    const repos = reposRes.data;

    const languageUsage = repos.reduce((acc, repo) => {
      const lang = repo.language;
      if (!lang) return acc;
      acc[lang] = (acc[lang] || 0) + 1;
      return acc;
    }, {});

    return {
      profile: {
        login: profile.login,
        name: profile.name,
        company: profile.company,
        avatarUrl: profile.avatar_url,
        bio: profile.bio,
        followers: profile.followers,
        following: profile.following,
        publicRepos: profile.public_repos,
        location: profile.location,
        blog: profile.blog,
      },
      repos: repos.map((repo) => ({
        id: repo.id,
        name: repo.name,
        description: repo.description,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        updatedAt: repo.updated_at,
        htmlUrl: repo.html_url,
      })),
      languageUsage,
    };
  } catch (error) {
    if (error.response && error.response.status === 404) {
      const err = new Error('GitHub user not found');
      err.status = 404;
      throw err;
    }
    if (error.response && error.response.status === 403) {
      const err = new Error('GitHub API rate limit exceeded');
      err.status = 429;
      throw err;
    }
    throw error;
  }
}

/**
 * Calculate date range based on filter type
 * @param {string} filter - Filter type: today, yesterday, this-week, last-week, this-month
 * @returns {Object} - { startDate, endDate } as Date objects
 */
function getDateRange(filter) {
  const now = new Date();
  let startDate, endDate;

  switch (filter) {
    case 'yesterday': {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case 'this-week': {
      // Start from Monday of current week
      startDate = new Date(now);
      const dayOfWeek = startDate.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust for Monday start
      startDate.setDate(startDate.getDate() - diff);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case 'last-week': {
      // Last week Monday to Sunday
      startDate = new Date(now);
      const currentDayOfWeek = startDate.getDay();
      const diffToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
      startDate.setDate(startDate.getDate() - diffToMonday - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case 'this-month': {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case 'today':
    default: {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
  }

  return { startDate, endDate };
}

/**
 * Fetch issues from a repository assigned within date range
 * Returns users with their total issue count
 * @param {string} repoFullName - Repository full name (owner/repo)
 * @param {string} filter - Filter type: today, yesterday, this-week, last-week, this-month
 * @returns {Promise<Array>} Array of objects with username and issueCount
 */
async function getIssuesByUserForPeriod(repoFullName, filter = 'today') {
  if (!repoFullName || !repoFullName.includes('/')) {
    const error = new Error('Repository must be in format owner/repo');
    error.status = 400;
    throw error;
  }

  const [owner, repo] = repoFullName.split('/');

  // Check cache first
  const cacheKey = `issues_${repoFullName}_${filter}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    const error = new Error('GITHUB_TOKEN is required');
    error.status = 500;
    throw error;
  }

  const { startDate, endDate } = getDateRange(filter);
  const issuesByUser = new Map();
  let hasNextPage = true;
  let cursor = null;
  let pageCount = 0;
  const maxPages = 10; // Limit to prevent excessive API calls
  
  // Calculate cutoff date for early termination (issues updated before this won't have recent assignments)
  const cutoffDate = new Date(startDate);
  cutoffDate.setDate(cutoffDate.getDate() - 7); // Check issues updated in last 7 days before start date

  try {
    while (hasNextPage && pageCount < maxPages) {
      pageCount++;
      
      // Optimized query: reduced timeline items from 50 to 20 (most repos won't have 50 assignments per issue)
      const query = `
        query GetIssues($owner: String!, $repo: String!, $cursor: String) {
          repository(owner: $owner, name: $repo) {
            issues(
              first: 100
              after: $cursor
              states: [OPEN]
              orderBy: { field: UPDATED_AT, direction: DESC }
            ) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                number
                updatedAt
                assignees(first: 10) {
                  nodes {
                    login
                  }
                }
                timelineItems(first: 20, itemTypes: [ASSIGNED_EVENT]) {
                  nodes {
                    ... on AssignedEvent {
                      createdAt
                      assignee {
                        ... on User {
                          login
                        }
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
        { query, variables: { owner, repo, cursor } },
        { headers: withAuth() }
      );

      if (response.data.errors) {
        const error = new Error(response.data.errors[0]?.message || 'GraphQL query failed');
        error.status = 400;
        throw error;
      }

      const issues = response.data.data?.repository?.issues?.nodes || [];
      const pageInfo = response.data.data?.repository?.issues?.pageInfo;

      let shouldContinue = true;

      // Process each issue
      for (const issue of issues) {
        // Early termination: if issue was last updated before cutoff, skip remaining issues
        const issueUpdatedAt = new Date(issue.updatedAt);
        if (issueUpdatedAt < cutoffDate) {
          shouldContinue = false;
          break; // No need to check older issues
        }

        const currentAssignees = new Set(
          (issue.assignees?.nodes || []).map((a) => a.login)
        );

        // Only process timeline if issue has assignees
        if (currentAssignees.size > 0) {
          const timelineNodes = issue.timelineItems?.nodes || [];
          
          // Find most recent assignment event for each user
          const userLastAssignment = new Map();
          for (const event of timelineNodes) {
            if (event.assignee?.login && event.createdAt) {
              const eventDate = new Date(event.createdAt);
              const username = event.assignee.login;
              
              // Track most recent assignment
              if (!userLastAssignment.has(username) || userLastAssignment.get(username) < eventDate) {
                userLastAssignment.set(username, eventDate);
              }
            }
          }

          // Count users assigned within date range who are still assigned
          for (const [username, assignmentDate] of userLastAssignment.entries()) {
            if (assignmentDate >= startDate && assignmentDate <= endDate && currentAssignees.has(username)) {
              issuesByUser.set(username, (issuesByUser.get(username) || 0) + 1);
            }
          }
        }
      }

      // Stop if we've gone past relevant issues
      if (!shouldContinue) {
        hasNextPage = false;
      } else {
        hasNextPage = pageInfo?.hasNextPage || false;
        cursor = pageInfo?.endCursor || null;
      }
    }

    // Convert Map to sorted Array
    const result = Array.from(issuesByUser.entries())
      .map(([username, issueCount]) => ({ username, issueCount }))
      .sort((a, b) => b.issueCount - a.issueCount || a.username.localeCompare(b.username));

    // Cache the result
    setCache(cacheKey, result);

    return result;
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      if (status === 401 || status === 403) {
        const err = new Error('GitHub authentication failed. Check your GITHUB_TOKEN.');
        err.status = 401;
        throw err;
      }
      if (status === 404) {
        const err = new Error(`Repository ${repoFullName} not found`);
        err.status = 404;
        throw err;
      }
      if (status === 429) {
        const err = new Error('GitHub API rate limit exceeded');
        err.status = 429;
        throw err;
      }
    }
    throw error;
  }
}

module.exports = { getGithubProfileWithRepos, getIssuesByUserForPeriod, getAccessibleRepositories };

