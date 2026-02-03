const axios = require('axios');
const {
  generateCacheKey,
  getCachedGitHubResponse,
  setCachedGitHubResponse,
  refreshCacheTTL,
  getCachedETag,
} = require('../utils/githubCache');

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
const etagCache = new Map(); // Store ETags for conditional requests
const CACHE_TTL = 10000; // 10 seconds - shorter TTL since we use ETags
const REPO_CACHE_TTL = 300000; // 5 minutes for repos

// Pre-compiled regex for P-value extraction
const P_VALUE_REGEX = /P\s*[:\s\-=\(]*\s*(\d+(?:\.\d+)?)\s*\)?/gi;

// Status mapping configuration
const STATUS_LABELS = {
  'In Progress': 'In Progress',
  'Review': 'Review',
  'Local Done': 'Local Done',
  'Dev Deployed': 'Dev Deployed',
  'Dev Checked': 'Dev Checked'
};

const STATUS_PRIORITY_ORDER = [
  'Dev Checked',
  'Dev Deployed',
  'Local Done',
  'Review',
  'In Progress'
];

/**
 * Help map label names to canonical status names
 */
const mapLabelToStatus = (name) => {
  const n = name.toLowerCase();
  if (n.includes('in progress')) return 'In Progress';
  if (n.includes('review')) return 'Review';
  if (n.includes('local done')) return 'Local Done';
  if (n.includes('dev deployed')) return 'Dev Deployed';
  if (n.includes('dev checked')) return 'Dev Checked';
  return null;
};

function getCached(key, ttl = CACHE_TTL) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < ttl) {
    return entry.data;
  }
  // Don't delete - keep for ETag comparison
  return null;
}

function setCache(key, data, etag = null) {
  // Generate a simple hash of the data for change detection
  const hash = JSON.stringify(data).length + '_' + (data.length || 0);
  cache.set(key, { data, timestamp: Date.now(), hash, etag });
  if (etag) {
    etagCache.set(key, etag);
  }
}

function getEtag(key) {
  return etagCache.get(key) || null;
}

/**
 * Get cache metadata for change detection (lightweight check)
 * @param {string} key - Cache key
 * @returns {Object|null} - { timestamp, hash, valid } or null if not cached
 */
function getCacheInfo(key, ttl = CACHE_TTL) {
  const entry = cache.get(key);
  if (!entry) return null;

  const valid = Date.now() - entry.timestamp < ttl;
  return {
    timestamp: entry.timestamp,
    hash: entry.hash,
    valid,
    age: Date.now() - entry.timestamp,
    etag: entry.etag,
  };
}

/**
 * Clear cache entries for a specific repository
 * Called when webhook receives updates for a repo
 * @param {string} repoFullName - Full name of the repository (owner/repo)
 */
function clearCacheForRepo(repoFullName) {
  const filters = ['today', 'yesterday', 'this-week', 'last-week', 'this-month'];
  let clearedCount = 0;

  for (const filter of filters) {
    const cacheKey = `issues_${repoFullName}_${filter}`;
    if (cache.has(cacheKey)) {
      cache.delete(cacheKey);
      clearedCount++;
    }
  }

  console.log(`[Cache] Cleared ${clearedCount} entries for repo: ${repoFullName}`);
}

const withAuth = () => {
  const token = process.env.GITHUB_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Check if repository issues have changed using GitHub's conditional request (ETag)
 * Returns 304 if unchanged (doesn't count against rate limit!)
 * @param {string} repoFullName - Repository full name (owner/repo)
 * @returns {Promise<Object>} { changed: boolean, etag: string }
 */
async function checkRepoChanges(repoFullName) {
  const [owner, repo] = repoFullName.split('/');
  const cacheKey = `etag_${repoFullName}`;
  const storedEtag = getEtag(cacheKey);

  try {
    const headers = {
      ...withAuth(),
      Accept: 'application/vnd.github+json',
    };

    // Add If-None-Match header if we have a stored ETag
    if (storedEtag) {
      headers['If-None-Match'] = storedEtag;
    }

    // Use issues endpoint with minimal data (just check for changes)
    const response = await githubClient.get(`/repos/${owner}/${repo}/issues`, {
      headers,
      params: {
        state: 'all',
        per_page: 1, // Minimal request
        sort: 'updated',
        direction: 'desc',
      },
      validateStatus: (status) => status === 200 || status === 304,
    });

    if (response.status === 304) {
      // Not modified - no changes, doesn't count against rate limit!
      return { changed: false, etag: storedEtag };
    }

    // Data changed - store new ETag
    const newEtag = response.headers.etag;
    if (newEtag) {
      etagCache.set(cacheKey, newEtag);
    }

    return { changed: true, etag: newEtag };
  } catch (error) {
    console.error('[ETag Check] Error:', error.message);
    // On error, assume changed to trigger refresh
    return { changed: true, etag: null };
  }
}

/**
 * Fetch all repositories accessible via the GitHub token
 * Optimized to only fetch the two specific repositories to reduce API calls
 * @returns {Promise<Array>} Array of { owner, name, fullName }
 */
async function getAccessibleRepositories() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    const error = new Error('GITHUB_TOKEN is required');
    error.status = 500;
    throw error;
  }

  // Only fetch these two specific repositories to reduce API calls
  const allowedRepos = [
    { owner: 'timeriver', name: 'cnd_chat', fullName: 'timeriver/cnd_chat' },
    { owner: 'timeriver', name: 'sacsys009', fullName: 'timeriver/sacsys009' },
  ];

  // Check cache first (5 min TTL for repos list)
  const cacheKey = 'accessible_repos_filtered';
  const cached = getCached(cacheKey, REPO_CACHE_TTL);
  if (cached) {
    return cached;
  }

  try {
    // Fetch only the specific repositories we need
    const repos = [];

    for (const repoInfo of allowedRepos) {
      try {
        const response = await githubClient.get(`/repos/${repoInfo.fullName}`, {
          headers: withAuth(),
        });

        const repo = response.data;
        repos.push({
          owner: repo.owner.login,
          name: repo.name,
          fullName: repo.full_name,
        });
      } catch (error) {
        // If repo doesn't exist or access denied, skip it
        if (error.response && error.response.status === 404) {
          console.warn(`Repository ${repoInfo.fullName} not found or not accessible`);
        } else {
          console.error(`Error fetching ${repoInfo.fullName}:`, error.message);
        }
      }
    }

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

  // Handle custom month format: month-MM-YYYY (e.g., month-01-2024)
  if (filter && filter.startsWith('month-')) {
    const parts = filter.split('-');
    if (parts.length === 3) {
      const month = parseInt(parts[1]) - 1; // JavaScript months are 0-indexed
      const year = parseInt(parts[2]);
      startDate = new Date(year, month, 1);
      startDate.setHours(0, 0, 0, 0);
      // Get last day of the month
      endDate = new Date(year, month + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }
  }

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

  // Step 1: Check Redis cache first (same as commits)
  const cacheKey = generateCacheKey('issues', repoFullName, filter);
  const cached = await getCachedGitHubResponse(cacheKey);

  if (cached && cached.data) {
    console.log(`[Issues Cache] ✅ Cache HIT for ${repoFullName} (${filter})`);
    return cached.data;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    const error = new Error('GITHUB_TOKEN is required');
    error.status = 500;
    throw error;
  }

  const { startDate, endDate } = getDateRange(filter);

  // Step 2: Get cached ETag for conditional request
  const cachedETag = await getCachedETag(cacheKey);
  const headers = withAuth();

  // Step 3: Add If-None-Match header if we have cached ETag
  // Note: GitHub GraphQL API doesn't support ETags, so we skip this for issues
  // But we still use Redis caching for the response data

  let hasNextPage = true;
  let cursor = null;
  let pageCount = 0;
  const maxPages = 10; // Limit to prevent excessive API calls

  // Calculate cutoff date for early termination (issues updated before this won't have recent assignments)
  const cutoffDate = new Date(startDate);
  cutoffDate.setDate(cutoffDate.getDate() - 7); // Check issues updated in last 7 days before start date

  // Track stats per user: { assigned, inProgress, done, reviewed, devDeployed, devChecked }
  const userStats = new Map();

  const initUserStats = () => ({
    assigned: 0,
    assignedP: 0,
    inProgress: 0,
    done: 0,
    reviewed: 0,
    devDeployed: 0,
    devChecked: 0,
  });

  /**
   * Labels that indicate issue status (case-insensitive matching)
   * 
   * Status Priority Order (highest to lowest):
   * 1. Dev Checked - checked first (only "5:Dev Checked" label)
   * 2. Dev Deployed - checked second (only "4:Dev Deployed" label)
   * 3. Reviewed - checked third (only "2.5 Review" label)
   * 4. Done - checked fourth (only "3:Local Done" label)
   * 5. In Progress - checked fifth (only "2:In Progress" label)
   * 6. Assigned - default if no status labels match
   * 
   * For detailed documentation on how statuses are determined, see:
   * ISSUE_STATUS_DOCUMENTATION.md
   */
  const statusLabels = {
    devChecked: ['5:dev checked'], // Only exact match for "5:Dev Checked" label
    devDeployed: ['4:dev deployed'], // Only exact match for "4:Dev Deployed" label
    reviewed: ['2.5 review'], // Only exact match for "2.5 Review" label
    done: ['3:local done'], // Only exact match for "3:Local Done" label
    inProgress: ['2:in progress'], // Only exact match for "2:In Progress" label
  };

  const getStatusFromLabels = (labels) => {
    const labelNames = labels.map((l) => l.name.toLowerCase());

    for (const name of labelNames) {
      // Check in priority order: devChecked > devDeployed > reviewed > done > inProgress
      if (statusLabels.devChecked.includes(name)) return 'devChecked';
      if (statusLabels.devDeployed.includes(name)) return 'devDeployed';
      if (statusLabels.reviewed.includes(name)) return 'reviewed';
      if (statusLabels.done.includes(name)) return 'done';
      if (statusLabels.inProgress.includes(name)) return 'inProgress';
    }
    return 'assigned'; // Default to assigned if no status label
  };

  try {
    while (hasNextPage && pageCount < maxPages) {
      pageCount++;

      // Enhanced query: includes labels and both OPEN/CLOSED states
      const query = `
        query GetIssues($owner: String!, $repo: String!, $cursor: String) {
          repository(owner: $owner, name: $repo) {
            issues(
              first: 100
              after: $cursor
              orderBy: { field: UPDATED_AT, direction: DESC }
            ) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                number
                state
                updatedAt
                labels(first: 10) {
                  nodes {
                    name
                  }
                }
                assignees(first: 10) {
                  nodes {
                    login
                  }
                }
                body
                title
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

        // Only process if issue has assignees
        if (currentAssignees.size > 0) {
          const timelineNodes = issue.timelineItems?.nodes || [];
          const labels = issue.labels?.nodes || [];
          const isClosed = issue.state === 'CLOSED';

          /**
           * Determine issue status from labels
           * 
           * Logic:
           * 1. Check labels for status keywords (reviewed > done > inProgress)
           * 2. Done status requires exact "3:Local Done" label match
           * 
           * See ISSUE_STATUS_DOCUMENTATION.md for complete details
           */
          let status = getStatusFromLabels(labels);

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

          // Count users assigned within date range
          for (const [username, assignmentDate] of userLastAssignment.entries()) {
            if (assignmentDate >= startDate && assignmentDate <= endDate && currentAssignees.has(username)) {
              // Initialize user stats if not exists
              if (!userStats.has(username)) {
                userStats.set(username, initUserStats());
              }
              const stats = userStats.get(username);

              // Increment the appropriate counter
              stats[status]++;

              // SUM P VALUE: Extract from title, body, and labels
              let pValue = extractPValue(issue.title) + extractPValue(issue.body);
              (issue.labels?.nodes || []).forEach(label => {
                pValue += extractPValue(label.name);
              });
              stats.assignedP += pValue;
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

    // Convert Map to sorted Array with all stats
    const result = Array.from(userStats.entries())
      .map(([username, stats]) => ({
        username,
        assigned: stats.assigned,
        assignedP: stats.assignedP,
        inProgress: stats.inProgress,
        done: stats.done,
        reviewed: stats.reviewed,
        devDeployed: stats.devDeployed,
        devChecked: stats.devChecked,
        total: stats.assigned + stats.inProgress + stats.done + stats.reviewed + stats.devDeployed + stats.devChecked,
      }))
      .sort((a, b) => b.total - a.total || a.username.localeCompare(b.username));

    // Step 4: Store new data in Redis with 6 PM TTL (same as commits)
    // Note: GitHub GraphQL API doesn't return ETags, so we pass null
    await setCachedGitHubResponse(cacheKey, result, null);
    console.log(`[Issues Cache] ✅ Stored new data for ${repoFullName} (${filter})`);

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

/**
 * Extract P value from issue title or body/description
 * Looks for patterns like "P:120", "P(120)", "[P:120]", etc.
 * @param {string} text - Issue title or body/description text
 * @returns {number} Sum of all P values found, or 0 if none found
 */
function extractPValue(text) {
  if (!text || typeof text !== 'string') return 0;

  let sum = 0;
  let match;

  // Use the pre-compiled P_VALUE_REGEX (reset index before use if using 'g' flag)
  P_VALUE_REGEX.lastIndex = 0;
  while ((match = P_VALUE_REGEX.exec(text)) !== null) {
    if (match[1]) {
      const value = parseFloat(match[1]);
      if (!isNaN(value)) {
        sum += value;
      }
    }
  }
  return sum;
}

/**
 * Fetch detailed timeline for issues, including "P" values and status history
 * @param {string} repoFullName - Repository full name (owner/repo)
 * @param {string} filter - Filter type: today, yesterday, this-week, last-week, this-month
 * @param {string} date - Optional specific date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of issues with timeline data
 */
async function getIssueTimeline(repoFullName, filter = 'this-month', date = null) {
  if (!repoFullName || !repoFullName.includes('/')) {
    const error = new Error('Repository must be in format owner/repo');
    error.status = 400;
    throw error;
  }

  const [owner, repo] = repoFullName.split('/');

  // Generate cache key for timeline (include date if present)
  const cacheKey = generateCacheKey('timeline', repoFullName, filter, date);

  const cached = await getCachedGitHubResponse(cacheKey);
  if (cached && cached.data) {
    console.log(`[Timeline Cache] ✅ Cache HIT for ${repoFullName} (${filter}, ${date})`);
    return cached.data;
  }

  let startDate, endDate;
  if (date) {
    // Specific date mode
    startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
  } else {
    // Filter mode
    const range = getDateRange(filter);
    startDate = range.startDate;
    endDate = range.endDate;
  }

  // Match Ranking cutoff logic (usually 7 days before start)
  const cutoffDate = new Date(startDate);
  cutoffDate.setDate(cutoffDate.getDate() - 7);

  try {
    let hasNextPage = true;
    let cursor = null;
    let allIssues = [];
    let pageCount = 0;
    const maxPages = 15;

    while (hasNextPage && pageCount < maxPages) {
      pageCount++;

      // Query to fetch body and timeline events (LabeledEvent)
      const query = `
        query GetIssueTimeline($owner: String!, $repo: String!, $cursor: String) {
          repository(owner: $owner, name: $repo) {
            issues(
              first: 50
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
                title
                url
                body
                state
                updatedAt
                createdAt
                author {
                  login
                  avatarUrl
                }
                assignees(first: 5) {
                  nodes {
                    login
                    name
                    avatarUrl
                  }
                }
                labels(first: 10) {
                  nodes {
                    name
                    color
                  }
                }
                timelineItems(last: 100, itemTypes: [LABELED_EVENT, UNLABELED_EVENT, ASSIGNED_EVENT]) {
                  nodes {
                    __typename
                    ... on LabeledEvent {
                      createdAt
                      label {
                        name
                        color
                      }
                      actor {
                        login
                      }
                    }
                    ... on UnlabeledEvent {
                      createdAt
                      label {
                        name
                        color
                      }
                      actor {
                        login
                      }
                    }
                    ... on AssignedEvent {
                      createdAt
                      assignee {
                         ... on User {
                           login
                           avatarUrl
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
        console.error('GraphQL Errors:', response.data.errors);
        throw new Error(response.data.errors[0]?.message || 'GraphQL query failed');
      }

      const issues = response.data.data?.repository?.issues?.nodes || [];
      const pageInfo = response.data.data?.repository?.issues?.pageInfo;

      let shouldContinue = true;

      for (const issue of issues) {
        const issueUpdatedAt = new Date(issue.updatedAt);
        // If issue hasn't been updated since cutoff, and it's closed, we might stop. 
        if (issueUpdatedAt < cutoffDate && issue.state === 'CLOSED') {
          shouldContinue = false;
        }

        // Sum P values from title, body, and labels
        let basePValue = extractPValue(issue.title) + extractPValue(issue.body);
        (issue.labels?.nodes || []).forEach(label => {
          basePValue += extractPValue(label.name);
        });

        // Reconstruct status history
        const events = (issue.timelineItems?.nodes || []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        // Find ALL users assigned within the period
        const userLastAssignment = new Map();
        events.forEach(event => {
          if (event.__typename === 'AssignedEvent' && event.assignee?.login && event.createdAt) {
            const eventDate = new Date(event.createdAt);
            const username = event.assignee.login;
            if (!userLastAssignment.has(username) || userLastAssignment.get(username) < eventDate) {
              userLastAssignment.set(username, eventDate);
            }
          }
        });

        const currentAssignees = new Set((issue.assignees?.nodes || []).map(a => a.login));

        // For EACH matched user, add an entry to allIssues
        for (const [username, assignmentDate] of userLastAssignment.entries()) {
          if (currentAssignees.has(username) && assignmentDate >= startDate && assignmentDate <= endDate) {
            const assigneeNode = issue.assignees?.nodes.find(n => n.login === username);

            // Reconstruct status history for this issue
            const statusHistory = [];
            let currentStatus = 'Assigned';
            let statusStartTime = new Date(issue.createdAt);

            events.forEach(event => {
              const eventDate = new Date(event.createdAt);
              if (event.__typename === 'LabeledEvent' && event.label) {
                const newStatus = mapLabelToStatus(event.label.name);
                if (newStatus && newStatus !== currentStatus) {
                  statusHistory.push({
                    status: currentStatus,
                    startDate: statusStartTime,
                    endDate: eventDate,
                    durationMs: eventDate - statusStartTime
                  });
                  currentStatus = newStatus;
                  statusStartTime = eventDate;
                }
              } else if (event.__typename === 'UnlabeledEvent' && event.label) {
                const removedStatus = mapLabelToStatus(event.label.name);
                // If we removed the current status, revert to 'Assigned' as a fallback
                if (removedStatus === currentStatus) {
                  statusHistory.push({
                    status: currentStatus,
                    startDate: statusStartTime,
                    endDate: eventDate,
                    durationMs: eventDate - statusStartTime
                  });
                  currentStatus = 'Assigned';
                  statusStartTime = eventDate;
                }
              }
            });

            // Add reconciliation logic for current labels
            const currentLabels = (issue.labels?.nodes || []).map(l => l.name);
            const highestLabelStatus = STATUS_PRIORITY_ORDER.find(status =>
              currentLabels.some(labelName => mapLabelToStatus(labelName) === status)
            );

            if (highestLabelStatus && highestLabelStatus !== currentStatus) {
              const transitionTime = new Date(issue.updatedAt);
              if (transitionTime > statusStartTime) {
                statusHistory.push({
                  status: currentStatus,
                  startDate: statusStartTime,
                  endDate: transitionTime,
                  durationMs: transitionTime - statusStartTime
                });
                currentStatus = highestLabelStatus;
                statusStartTime = transitionTime;
              }
            }

            const endTime = issue.state === 'CLOSED' ? new Date(issue.updatedAt) : new Date();
            statusHistory.push({
              status: currentStatus,
              startDate: statusStartTime,
              endDate: endTime,
              durationMs: endTime - statusStartTime
            });

            allIssues.push({
              id: `${issue.id}_${username}`,
              number: issue.number,
              title: issue.title,
              url: issue.url,
              state: issue.state,
              pValue: basePValue,
              createdAt: issue.createdAt,
              updatedAt: issue.updatedAt,
              author: issue.author,
              assignee: assigneeNode,
              statusHistory,
              currentStatus
            });

          }
        }
      }

      if (!shouldContinue || !pageInfo.hasNextPage) {
        hasNextPage = false;
      } else {
        cursor = pageInfo.endCursor;
      }
    }

    // Group by User
    const issuesByUser = {};
    allIssues.forEach(issue => {
      if (issue.assignee) {
        const username = issue.assignee.login;
        if (!issuesByUser[username]) {
          issuesByUser[username] = {
            user: issue.assignee,
            issues: [],
            totalP: 0
          };
        }
        issuesByUser[username].issues.push(issue);
        issuesByUser[username].totalP += (issue.pValue || 0);
      }
    });

    const result = Object.values(issuesByUser);

    // Cache (shorter TTL for timeline?)
    await setCachedGitHubResponse(cacheKey, result, null);

    return result;

  } catch (error) {
    console.error('[GetTimeline] Error:', error);
    throw error;
  }
}

/**
 * Check cache status for a repo/filter combination
 * @param {string} repoFullName - Repository full name
 * @param {string} filter - Filter type
 * @returns {Object} - Cache info with valid, timestamp, hash
 */
function checkCacheStatus(repoFullName, filter) {
  const cacheKey = `issues_${repoFullName}_${filter}`;
  return getCacheInfo(cacheKey) || { valid: false, timestamp: null, hash: null };
}

/**
 * Fetch commits from a repository grouped by user for a given period
 * @param {string} repoFullName - Repository full name (owner/repo)
 * @param {string} filter - Filter type: today, yesterday, this-week, last-week, this-month
 * @returns {Promise<Array>} Array of objects with username and commitCount
 */
async function getCommitsByUserForPeriod(repoFullName, filter = 'today') {
  if (!repoFullName || !repoFullName.includes('/')) {
    const error = new Error('Repository must be in format owner/repo');
    error.status = 400;
    throw error;
  }

  // Only allow commits from specific repositories
  const ALLOWED_REPOS = ['timeriver/cnd_chat', 'timeriver/sacsys009'];
  if (!ALLOWED_REPOS.includes(repoFullName)) {
    const error = new Error(`Commits can only be fetched for: ${ALLOWED_REPOS.join(', ')}`);
    error.status = 403;
    throw error;
  }

  const [owner, repo] = repoFullName.split('/');

  // Step 1: Check Redis cache first
  const cacheKey = generateCacheKey('commits', repoFullName, filter);
  const cached = await getCachedGitHubResponse(cacheKey);

  if (cached && cached.data) {
    console.log(`[Commits Cache] ✅ Cache HIT for ${repoFullName} (${filter})`);
    return cached.data;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    const error = new Error('GITHUB_TOKEN is required');
    error.status = 500;
    throw error;
  }

  const { startDate, endDate } = getDateRange(filter);

  // Step 2: Get cached ETag for conditional request
  const cachedETag = await getCachedETag(cacheKey);
  const headers = withAuth();

  // Step 3: Add If-None-Match header if we have cached ETag
  if (cachedETag) {
    headers['If-None-Match'] = cachedETag;
    console.log(`[Commits Cache] 🔄 Conditional request with ETag: ${cachedETag.substring(0, 20)}...`);
  }

  // Track commits per user
  const userCommits = new Map();

  try {
    let hasNextPage = true;
    let page = 1;
    const maxPages = 10; // Limit to prevent excessive API calls
    let responseETag = null;

    while (hasNextPage && page <= maxPages) {
      const response = await githubClient.get(`/repos/${owner}/${repo}/commits`, {
        headers,
        params: {
          since: startDate.toISOString(),
          until: endDate.toISOString(),
          per_page: 100,
          page: page,
        },
      });

      // Step 4: Handle 304 Not Modified response
      if (response.status === 304 && cached) {
        console.log(`[Commits Cache] ✅ 304 Not Modified - reusing cached data for ${repoFullName}`);
        // Refresh cache TTL to 6 PM
        await refreshCacheTTL(cacheKey, cached.data, cachedETag);
        return cached.data;
      }

      // Step 5: Extract ETag from response headers
      responseETag = response.headers.etag || response.headers['etag'] || null;

      const commits = response.data;

      if (commits.length === 0) {
        hasNextPage = false;
        break;
      }

      // Process each commit
      for (const commit of commits) {
        // Try author first, then committer if author is not a GitHub user
        const author = commit.author || commit.committer;
        if (author && author.login) {
          const username = author.login.toLowerCase().trim();
          const currentCount = userCommits.get(username) || 0;
          userCommits.set(username, currentCount + 1);
        }
      }

      // Check if there are more pages
      const linkHeader = response.headers.link;
      hasNextPage = linkHeader && linkHeader.includes('rel="next"');
      page++;
    }

    // Convert map to array format matching issues structure
    const result = Array.from(userCommits.entries()).map(([username, commitCount]) => ({
      username,
      commits: commitCount,
      total: commitCount, // For consistency with issues structure
    }));

    // Sort by commit count descending
    result.sort((a, b) => b.commits - a.commits || a.username.localeCompare(b.username));

    // Step 6: Store new data + ETag in Redis with 6 PM TTL
    await setCachedGitHubResponse(cacheKey, result, responseETag);
    console.log(`[Commits Cache] ✅ Stored new data for ${repoFullName} (${filter})`);

    return result;
  } catch (error) {
    // Step 7: Handle errors, including 304 Not Modified
    if (error.response) {
      if (error.response.status === 304 && cached) {
        console.log(`[Commits Cache] ✅ 304 Not Modified (from error handler) - reusing cached data`);
        await refreshCacheTTL(cacheKey, cached.data, cachedETag);
        return cached.data;
      }

      if (error.response.status === 404) {
        const err = new Error(`Repository ${repoFullName} not found`);
        err.status = 404;
        throw err;
      }
      if (error.response.status === 403) {
        const err = new Error('GitHub API rate limit exceeded');
        err.status = 429;
        throw err;
      }
    }
    throw error;
  }
}

/**
 * Map file extensions to programming languages
 */
const LANGUAGE_MAP = {
  'js': 'JavaScript',
  'jsx': 'JavaScript',
  'ts': 'TypeScript',
  'tsx': 'TypeScript',
  'py': 'Python',
  'java': 'Java',
  'cpp': 'C++',
  'c': 'C',
  'cs': 'C#',
  'php': 'PHP',
  'rb': 'Ruby',
  'go': 'Go',
  'rs': 'Rust',
  'swift': 'Swift',
  'kt': 'Kotlin',
  'scala': 'Scala',
  'sh': 'Shell',
  'bash': 'Shell',
  'sql': 'SQL',
  'html': 'HTML',
  'css': 'CSS',
  'scss': 'SCSS',
  'sass': 'SASS',
  'vue': 'Vue',
  'json': 'JSON',
  'xml': 'XML',
  'yaml': 'YAML',
  'yml': 'YAML',
  'md': 'Markdown',
  'dockerfile': 'Dockerfile',
  'tf': 'Terraform',
  'hcl': 'Terraform',
};

/**
 * Get language from file path
 */
function getLanguageFromFile(filename) {
  if (!filename) return null;

  // Handle special cases
  if (filename.toLowerCase() === 'dockerfile' || filename.toLowerCase().startsWith('dockerfile.')) {
    return 'Dockerfile';
  }

  const parts = filename.split('.');
  if (parts.length < 2) return null;

  const extension = parts[parts.length - 1].toLowerCase();
  return LANGUAGE_MAP[extension] || null;
}

/**
 * Fetch languages used by each user from commits in a repository
 * Analyzes file changes in commits to determine languages
 * When filter is 'all', fetches all commits (no date filtering) to show overall percentages
 * @param {string} repoFullName - Repository full name (owner/repo)
 * @param {string} filter - Filter type: today, yesterday, this-week, last-week, this-month, or 'all' for overall
 * @returns {Promise<Array>} Array of objects with username and topLanguages
 */
async function getLanguagesByUserForPeriod(repoFullName, filter = 'all') {
  if (!repoFullName || !repoFullName.includes('/')) {
    const error = new Error('Repository must be in format owner/repo');
    error.status = 400;
    throw error;
  }

  // Only allow languages from specific repositories
  const ALLOWED_REPOS = ['timeriver/cnd_chat', 'timeriver/sacsys009'];
  if (!ALLOWED_REPOS.includes(repoFullName)) {
    const error = new Error(`Languages can only be fetched for: ${ALLOWED_REPOS.join(', ')}`);
    error.status = 403;
    throw error;
  }

  const [owner, repo] = repoFullName.split('/');

  // Step 1: Check Redis cache first
  const cacheKey = generateCacheKey('languages', repoFullName, filter);
  const cached = await getCachedGitHubResponse(cacheKey);

  if (cached && cached.data) {
    console.log(`[Languages Cache] ✅ Cache HIT for ${repoFullName} (${filter})`);
    return cached.data;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    const error = new Error('GITHUB_TOKEN is required');
    error.status = 500;
    throw error;
  }

  // Step 2: Get cached ETag for conditional request
  const cachedETag = await getCachedETag(cacheKey);
  const headers = withAuth();

  if (cachedETag) {
    headers['If-None-Match'] = cachedETag;
  }

  // Track languages per user: { username: { language: count } }
  const userLanguages = new Map();

  try {
    let hasNextPage = true;
    let page = 1;
    const maxPages = filter === 'all' ? 20 : 10; // More pages for overall data
    let responseETag = null;

    while (hasNextPage && page <= maxPages) {
      // Build params - if filter is 'all', don't use date filtering
      const commitParams = {
        per_page: 100,
        page: page,
      };

      // Only add date filters if not 'all'
      if (filter !== 'all') {
        const { startDate, endDate } = getDateRange(filter);
        commitParams.since = startDate.toISOString();
        commitParams.until = endDate.toISOString();
      }

      // Fetch commits with file stats
      const response = await githubClient.get(`/repos/${owner}/${repo}/commits`, {
        headers,
        params: commitParams,
      });

      // Handle 304 Not Modified
      if (response.status === 304 && cached) {
        console.log(`[Languages Cache] ✅ 304 Not Modified - reusing cached data`);
        await refreshCacheTTL(cacheKey, cached.data, cachedETag);
        return cached.data;
      }

      responseETag = response.headers.etag || response.headers['etag'] || null;
      const commits = response.data;

      if (commits.length === 0) {
        hasNextPage = false;
        break;
      }

      // Process each commit to get file changes
      // Limit to first 50 commits per page to avoid excessive API calls
      const commitsToProcess = commits.slice(0, 50);

      for (const commit of commitsToProcess) {
        const author = commit.author || commit.committer;
        if (!author || !author.login) continue;

        const username = author.login.toLowerCase().trim();
        const commitSha = commit.sha;

        try {
          // Fetch commit details with file stats
          const commitResponse = await githubClient.get(`/repos/${owner}/${repo}/commits/${commitSha}`, {
            headers: withAuth(),
          });

          const files = commitResponse.data.files || [];

          // Initialize user language map if not exists
          if (!userLanguages.has(username)) {
            userLanguages.set(username, new Map());
          }
          const userLangMap = userLanguages.get(username);

          // Count languages from changed files
          for (const file of files) {
            const language = getLanguageFromFile(file.filename);
            if (language) {
              const currentCount = userLangMap.get(language) || 0;
              userLangMap.set(language, currentCount + 1);
            }
          }

          // Small delay to avoid hitting rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (fileError) {
          // Skip if we can't fetch commit details (rate limit or other error)
          console.warn(`[Languages] Could not fetch commit ${commitSha}:`, fileError.message);
          // Continue with next commit
        }
      }

      // If we processed fewer commits than available, don't fetch more pages
      if (commitsToProcess.length < commits.length) {
        hasNextPage = false;
      }

      // Check if there are more pages
      const linkHeader = response.headers.link;
      hasNextPage = linkHeader && linkHeader.includes('rel="next"');
      page++;
    }

    // Convert to array format with top languages (as percentages)
    const result = Array.from(userLanguages.entries()).map(([username, langMap]) => {
      // Calculate total files for this user
      const totalFiles = Array.from(langMap.values()).reduce((sum, count) => sum + count, 0);

      // Sort languages by count and get top 5, calculate percentages
      const sortedLangs = Array.from(langMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([lang, count]) => {
          const percentage = totalFiles > 0 ? Math.round((count / totalFiles) * 100) : 0;
          return { language: lang, count, percentage };
        });

      return {
        username,
        topLanguages: sortedLangs,
        totalFiles,
      };
    });

    // Sort by total files descending
    result.sort((a, b) => b.totalFiles - a.totalFiles || a.username.localeCompare(b.username));

    // Step 3: Store new data in Redis with 6 PM TTL
    await setCachedGitHubResponse(cacheKey, result, responseETag);
    console.log(`[Languages Cache] ✅ Stored new data for ${repoFullName} (${filter})`);

    return result;
  } catch (error) {
    if (error.response) {
      if (error.response.status === 304 && cached) {
        console.log(`[Languages Cache] ✅ 304 Not Modified (from error handler)`);
        await refreshCacheTTL(cacheKey, cached.data, cachedETag);
        return cached.data;
      }

      if (error.response.status === 404) {
        const err = new Error(`Repository ${repoFullName} not found`);
        err.status = 404;
        throw err;
      }
      if (error.response.status === 403) {
        const err = new Error('GitHub API rate limit exceeded');
        err.status = 429;
        throw err;
      }
    }
    throw error;
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
  getIssueTimeline
};

