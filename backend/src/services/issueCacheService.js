/**
 * Issue Cache Service
 * 
 * Implements incremental caching for GitHub issues using MySQL storage.
 * 
 * CACHING STRATEGY:
 * ==================
 * 1. Full Refresh: Initial fetch of all issues for a repo (done once per repo)
 * 2. Incremental Refresh: Uses GitHub's `since` parameter to fetch only issues
 *    that have been updated since the last fetch (last_fetched_at timestamp)
 * 3. Selective Queries: When frontend requests data for specific repo/user,
 *    we query our local cache instead of hitting GitHub API
 * 
 * INCREMENTAL REFRESH LOGIC:
 * ==========================
 * - Track `last_fetched_at` per repo in github_cache_metadata table
 * - On refresh, use `since=last_fetched_at` parameter in GitHub API call
 * - This returns only issues modified after that timestamp
 * - UPSERT (INSERT ... ON DUPLICATE KEY UPDATE) to merge changes into cache
 * - Dramatically reduces API calls and response sizes
 * 
 * FILTERING BY CURRENT SCREEN:
 * ============================
 * - API endpoint accepts `repo` and `user` parameters
 * - Queries local MySQL cache with WHERE clauses
 * - Never fetches data for repos/users not currently viewed
 * - Aggregated stats table provides fast responses
 */

const axios = require('axios');
const { query, transaction } = require('../config/database');

// GitHub API configuration
const GITHUB_API = 'https://api.github.com';
const GITHUB_GRAPHQL = 'https://api.github.com/graphql';

// Cache configuration
const CACHE_CONFIG = {
  REFRESH_INTERVAL_MS: 15 * 60 * 1000, // 15 minutes (optimized from 1 minute)
  FULL_REFRESH_INTERVAL_MS: 24 * 60 * 60 * 1000, // 24 hours (full refresh once daily)
  MAX_ISSUES_PER_PAGE: 100,
  MAX_PAGES: 10, // Limit pages to prevent excessive API calls
};

// In-memory tracking for active refresh operations (prevents duplicate refreshes)
const activeRefreshes = new Map();

/**
 * Get GitHub API headers with authentication
 */
function getAuthHeaders() {
  const token = process.env.GITHUB_TOKEN;
  return token
    ? {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    }
    : { Accept: 'application/vnd.github+json' };
}

/**
 * Status labels mapping (same as githubService.js for consistency)
 * Priority order: devChecked > devDeployed > reviewed > done > inProgress > assigned
 */
const STATUS_LABELS = {
  devChecked: ['5:dev checked'],
  devDeployed: ['4:dev deployed'],
  reviewed: ['2.5 review'],
  done: ['3:local done'],
  inProgress: ['2:in progress'],
};

/**
 * Derive status from issue labels
 * @param {Array} labels - Array of label objects with `name` property
 * @returns {string} Status enum value
 */
function deriveStatusFromLabels(labels) {
  if (!labels || !Array.isArray(labels)) return 'assigned';

  const labelNames = labels.map(l => (l.name || l).toLowerCase());

  // Check in priority order
  for (const name of labelNames) {
    if (STATUS_LABELS.devChecked.includes(name)) return 'devChecked';
    if (STATUS_LABELS.devDeployed.includes(name)) return 'devDeployed';
    if (STATUS_LABELS.reviewed.includes(name)) return 'reviewed';
    if (STATUS_LABELS.done.includes(name)) return 'done';
    if (STATUS_LABELS.inProgress.includes(name)) return 'inProgress';
  }

  return 'assigned';
}

/**
 * Calculate date range for a filter type
 * @param {string} filter - Filter type: today, yesterday, this-week, last-week, this-month, or month-MM-YYYY
 * @returns {Object} { startDate, endDate }
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
      startDate = new Date(now);
      const dayOfWeek = startDate.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startDate.setDate(startDate.getDate() - diff);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case 'last-week': {
      startDate = new Date(now);
      const currentDay = startDate.getDay();
      const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
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
 * Get cache metadata for a repository
 * @param {string} repoFullName - Repository full name (owner/repo)
 * @returns {Promise<Object|null>} Cache metadata or null if not cached
 */
async function getCacheMetadata(repoFullName) {
  const sql = `
    SELECT * FROM github_cache_metadata 
    WHERE repo_full_name = ? AND username IS NULL AND filter_type = 'all'
    LIMIT 1
  `;
  const results = await query(sql, [repoFullName]);
  return results.length > 0 ? results[0] : null;
}

/**
 * Update cache metadata after a fetch
 * @param {string} repoFullName - Repository full name
 * @param {Object} data - Metadata to update
 */
async function updateCacheMetadata(repoFullName, data) {
  const sql = `
    INSERT INTO github_cache_metadata 
      (repo_full_name, filter_type, last_fetched_at, last_full_refresh_at, 
       total_issues_cached, last_issues_fetched, etag)
    VALUES (?, 'all', NOW(), ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      last_fetched_at = NOW(),
      last_full_refresh_at = COALESCE(VALUES(last_full_refresh_at), last_full_refresh_at),
      total_issues_cached = VALUES(total_issues_cached),
      last_issues_fetched = VALUES(last_issues_fetched),
      etag = COALESCE(VALUES(etag), etag),
      updated_at = NOW()
  `;

  await query(sql, [
    repoFullName,
    data.isFullRefresh ? new Date() : null,
    data.totalCached || 0,
    data.fetchedCount || 0,
    data.etag || null,
  ]);
}

/**
 * Fetch issues from GitHub using GraphQL (includes timeline for assignment dates)
 * Supports incremental fetching via `since` parameter
 * 
 * @param {string} repoFullName - Repository full name (owner/repo)
 * @param {Date|null} since - Only fetch issues updated after this date (incremental mode)
 * @returns {Promise<Array>} Array of issue objects
 */
async function fetchIssuesFromGitHub(repoFullName, since = null) {
  const [owner, repo] = repoFullName.split('/');
  const issues = [];
  let hasNextPage = true;
  let cursor = null;
  let pageCount = 0;

  // Format since date for GraphQL filter
  const sinceFilter = since ? `since: "${since.toISOString()}"` : '';

  console.log(`[IssueCache] Fetching issues for ${repoFullName}${since ? ` (since ${since.toISOString()})` : ' (full refresh)'}`);

  while (hasNextPage && pageCount < CACHE_CONFIG.MAX_PAGES) {
    pageCount++;

    const graphqlQuery = `
      query GetIssues($owner: String!, $repo: String!, $cursor: String) {
        repository(owner: $owner, name: $repo) {
          issues(
            first: ${CACHE_CONFIG.MAX_ISSUES_PER_PAGE}
            after: $cursor
            orderBy: { field: UPDATED_AT, direction: DESC }
            filterBy: { ${sinceFilter} }
          ) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              databaseId
              number
              title
              state
              createdAt
              updatedAt
              labels(first: 10) {
                nodes {
                  name
                  color
                }
              }
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

    try {
      const response = await axios.post(
        GITHUB_GRAPHQL,
        { query: graphqlQuery, variables: { owner, repo, cursor } },
        { headers: getAuthHeaders() }
      );

      if (response.data.errors) {
        console.error('[IssueCache] GraphQL errors:', response.data.errors);
        throw new Error(response.data.errors[0]?.message || 'GraphQL query failed');
      }

      const repoData = response.data.data?.repository;
      if (!repoData) {
        console.warn(`[IssueCache] Repository ${repoFullName} not found or not accessible`);
        break;
      }

      const issueNodes = repoData.issues?.nodes || [];
      const pageInfo = repoData.issues?.pageInfo;

      // Process each issue
      for (const issue of issueNodes) {
        const assignees = (issue.assignees?.nodes || []).map(a => a.login);
        const labels = (issue.labels?.nodes || []).map(l => ({ name: l.name, color: l.color }));

        // Find most recent assignment event
        let lastAssignedAt = null;
        let lastAssignedUser = null;
        const timelineEvents = issue.timelineItems?.nodes || [];

        for (const event of timelineEvents) {
          if (event.assignee?.login && event.createdAt) {
            const eventDate = new Date(event.createdAt);
            if (!lastAssignedAt || eventDate > lastAssignedAt) {
              lastAssignedAt = eventDate;
              lastAssignedUser = event.assignee.login;
            }
          }
        }

        issues.push({
          githubIssueId: issue.databaseId,
          issueNumber: issue.number,
          repoFullName,
          repoOwner: owner,
          title: issue.title,
          state: issue.state.toLowerCase(),
          assignees,
          labels,
          status: deriveStatusFromLabels(labels),
          githubCreatedAt: new Date(issue.createdAt),
          githubUpdatedAt: new Date(issue.updatedAt),
          lastAssignedAt,
          lastAssignedUser,
        });
      }

      hasNextPage = pageInfo?.hasNextPage || false;
      cursor = pageInfo?.endCursor || null;

      // Early termination for incremental updates
      // If we're doing an incremental fetch and hit issues older than 'since', we can stop
      if (since && issueNodes.length > 0) {
        const oldestInPage = new Date(issueNodes[issueNodes.length - 1].updatedAt);
        if (oldestInPage < since) {
          console.log(`[IssueCache] Reached issues older than since date, stopping pagination`);
          hasNextPage = false;
        }
      }

    } catch (error) {
      console.error(`[IssueCache] Error fetching page ${pageCount}:`, error.message);
      throw error;
    }
  }

  console.log(`[IssueCache] Fetched ${issues.length} issues from ${repoFullName} (${pageCount} pages)`);
  return issues;
}

/**
 * Save issues to the database cache (UPSERT operation)
 * @param {Array} issues - Array of issue objects to cache
 * @returns {Promise<Object>} { inserted, updated }
 */
async function saveIssuesToCache(issues) {
  if (!issues || issues.length === 0) {
    return { inserted: 0, updated: 0 };
  }

  let inserted = 0;
  let updated = 0;

  // Use transaction for batch insert
  await transaction(async (conn) => {
    const sql = `
      INSERT INTO github_issues_cache 
        (github_issue_id, issue_number, repo_full_name, repo_owner, title, state,
         assignees, labels, status, github_created_at, github_updated_at,
         last_assigned_at, last_assigned_user)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        state = VALUES(state),
        assignees = VALUES(assignees),
        labels = VALUES(labels),
        status = VALUES(status),
        github_updated_at = VALUES(github_updated_at),
        last_assigned_at = VALUES(last_assigned_at),
        last_assigned_user = VALUES(last_assigned_user),
        updated_at = NOW()
    `;

    for (const issue of issues) {
      try {
        const [result] = await conn.execute(sql, [
          issue.githubIssueId,
          issue.issueNumber,
          issue.repoFullName,
          issue.repoOwner,
          issue.title,
          issue.state,
          JSON.stringify(issue.assignees),
          JSON.stringify(issue.labels),
          issue.status,
          issue.githubCreatedAt,
          issue.githubUpdatedAt,
          issue.lastAssignedAt,
          issue.lastAssignedUser,
        ]);

        // affectedRows = 1 for insert, 2 for update
        if (result.affectedRows === 1) {
          inserted++;
        } else if (result.affectedRows === 2) {
          updated++;
        }
      } catch (err) {
        console.error(`[IssueCache] Error saving issue #${issue.issueNumber}:`, err.message);
      }
    }
  });

  console.log(`[IssueCache] Saved to cache: ${inserted} inserted, ${updated} updated`);
  return { inserted, updated };
}

/**
 * Refresh cache for a repository (incremental or full)
 * 
 * INCREMENTAL REFRESH:
 * - Reads last_fetched_at from metadata table
 * - Fetches only issues updated since that timestamp
 * - UPSERTs new/changed issues into cache
 * - Updates metadata with new timestamp
 * 
 * @param {string} repoFullName - Repository full name
 * @param {boolean} forceFullRefresh - Force a full refresh (ignore last_fetched_at)
 * @returns {Promise<Object>} Refresh result
 */
async function refreshRepoCache(repoFullName, forceFullRefresh = false) {
  // Prevent concurrent refreshes for the same repo
  if (activeRefreshes.has(repoFullName)) {
    console.log(`[IssueCache] Refresh already in progress for ${repoFullName}, skipping`);
    return { status: 'skipped', reason: 'refresh_in_progress' };
  }

  activeRefreshes.set(repoFullName, Date.now());

  try {
    // Get cache metadata
    const metadata = await getCacheMetadata(repoFullName);

    // Determine if we should do incremental or full refresh
    let since = null;
    let isFullRefresh = forceFullRefresh;

    if (!forceFullRefresh && metadata?.last_fetched_at) {
      const lastFetch = new Date(metadata.last_fetched_at);
      const lastFullRefresh = metadata.last_full_refresh_at ? new Date(metadata.last_full_refresh_at) : null;

      // Do full refresh if never done or older than 24 hours
      if (!lastFullRefresh || (Date.now() - lastFullRefresh.getTime()) > CACHE_CONFIG.FULL_REFRESH_INTERVAL_MS) {
        isFullRefresh = true;
        console.log(`[IssueCache] Full refresh needed for ${repoFullName} (last: ${lastFullRefresh || 'never'})`);
      } else {
        since = lastFetch;
        console.log(`[IssueCache] Incremental refresh for ${repoFullName} (since ${since.toISOString()})`);
      }
    } else {
      isFullRefresh = true;
      console.log(`[IssueCache] First-time full refresh for ${repoFullName}`);
    }

    // Fetch issues from GitHub
    const issues = await fetchIssuesFromGitHub(repoFullName, since);

    // Save to cache
    const saveResult = await saveIssuesToCache(issues);

    // Get total cached count
    const countResult = await query(
      'SELECT COUNT(*) as count FROM github_issues_cache WHERE repo_full_name = ?',
      [repoFullName]
    );
    const totalCached = countResult[0]?.count || 0;

    // Update metadata
    await updateCacheMetadata(repoFullName, {
      isFullRefresh,
      totalCached,
      fetchedCount: issues.length,
    });

    const result = {
      status: 'success',
      repo: repoFullName,
      isFullRefresh,
      issuesFetched: issues.length,
      issuesInserted: saveResult.inserted,
      issuesUpdated: saveResult.updated,
      totalCached,
    };

    console.log(`[IssueCache] Refresh complete for ${repoFullName}:`, result);
    return result;

  } catch (error) {
    console.error(`[IssueCache] Refresh failed for ${repoFullName}:`, error.message);
    throw error;
  } finally {
    activeRefreshes.delete(repoFullName);
  }
}

/**
 * Get issues from cache for a specific repo/user/filter
 * 
 * FILTERING BY CURRENT SCREEN:
 * - Only queries data relevant to the current view (repo + optional user)
 * - Uses indexed columns for fast lookups
 * - No GitHub API calls - all data from local cache
 * 
 * @param {string} repoFullName - Repository full name
 * @param {string} filter - Filter type: today, yesterday, this-week, last-week, this-month
 * @param {string|null} username - Optional: filter by specific user
 * @returns {Promise<Array>} Array of user stats
 */
async function getCachedIssues(repoFullName, filter = 'today', username = null) {
  const { startDate, endDate } = getDateRange(filter);

  // Build the query based on whether we're filtering by user
  // Normalize username using LOWER and TRIM directly in SQL
  let sql = `
    SELECT 
      LOWER(TRIM(username)) as normalized_username,
      status,
      COUNT(*) as count
    FROM (
      SELECT 
        JSON_UNQUOTE(JSON_EXTRACT(assignees, CONCAT('$[', idx.i, ']'))) as username,
        status,
        last_assigned_at
      FROM github_issues_cache
      CROSS JOIN (
        SELECT 0 as i UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
        UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
      ) as idx
      WHERE repo_full_name = ?
        AND JSON_UNQUOTE(JSON_EXTRACT(assignees, CONCAT('$[', idx.i, ']'))) IS NOT NULL
        AND last_assigned_at >= ?
        AND last_assigned_at <= ?
  `;

  const params = [repoFullName, startDate, endDate];

  if (username) {
    sql += ` AND JSON_CONTAINS(assignees, ?)`;
    params.push(JSON.stringify(username));
  }

  sql += `
    ) as expanded
    WHERE username IS NOT NULL
    GROUP BY normalized_username, status
    ORDER BY normalized_username, status
  `;

  try {
    const results = await query(sql, params);

    // Aggregate results by user
    const userStats = new Map();

    for (const row of results) {
      // Final safety normalization in JS Map
      const usernameKey = row.normalized_username.toLowerCase().trim();

      if (!userStats.has(usernameKey)) {
        userStats.set(usernameKey, {
          username: usernameKey,
          assigned: 0,
          inProgress: 0,
          done: 0,
          reviewed: 0,
          devDeployed: 0,
          devChecked: 0,
        });
      }

      const stats = userStats.get(usernameKey);
      stats[row.status] = row.count;
    }

    // Convert to array with totals
    const result = Array.from(userStats.values())
      .map(stats => ({
        ...stats,
        total: stats.assigned + stats.inProgress + stats.done +
          stats.reviewed + stats.devDeployed + stats.devChecked,
      }))
      .sort((a, b) => b.total - a.total || a.username.localeCompare(b.username));

    console.log(`[IssueCache] Query returned ${result.length} users for ${repoFullName}/${filter}${username ? `/${username}` : ''}`);
    return result;

  } catch (error) {
    console.error(`[IssueCache] Query failed:`, error.message);
    throw error;
  }
}

/**
 * Get cache status for a repository
 * @param {string} repoFullName - Repository full name
 * @returns {Promise<Object>} Cache status
 */
async function getCacheStatus(repoFullName) {
  const metadata = await getCacheMetadata(repoFullName);

  if (!metadata) {
    return {
      isCached: false,
      lastFetchedAt: null,
      totalIssues: 0,
      needsRefresh: true,
    };
  }

  const lastFetch = new Date(metadata.last_fetched_at);
  const timeSinceRefresh = Date.now() - lastFetch.getTime();
  const needsRefresh = timeSinceRefresh > CACHE_CONFIG.REFRESH_INTERVAL_MS;

  return {
    isCached: true,
    lastFetchedAt: metadata.last_fetched_at,
    lastFullRefreshAt: metadata.last_full_refresh_at,
    totalIssues: metadata.total_issues_cached,
    lastIssuesFetched: metadata.last_issues_fetched,
    timeSinceRefreshMs: timeSinceRefresh,
    needsRefresh,
  };
}

/**
 * Check if cache needs refresh and refresh if needed
 * Used by background job and on-demand requests
 * @param {string} repoFullName - Repository full name
 * @returns {Promise<Object>} Result with wasRefreshed flag
 */
async function ensureCacheFresh(repoFullName) {
  const status = await getCacheStatus(repoFullName);

  if (!status.isCached || status.needsRefresh) {
    const refreshResult = await refreshRepoCache(repoFullName, !status.isCached);
    return {
      wasRefreshed: true,
      ...refreshResult,
    };
  }

  return {
    wasRefreshed: false,
    status: 'cache_valid',
    lastFetchedAt: status.lastFetchedAt,
  };
}

/**
 * Get issues with automatic cache refresh if needed
 * Main entry point for API requests
 * 
 * @param {string} repoFullName - Repository full name
 * @param {string} filter - Filter type
 * @param {string|null} username - Optional user filter
 * @param {boolean} forceRefresh - Force cache refresh
 * @returns {Promise<Object>} { data, cacheStatus }
 */
async function getIssuesWithCache(repoFullName, filter = 'today', username = null, forceRefresh = false) {
  try {
    // Ensure cache is fresh (will refresh if needed)
    const cacheResult = forceRefresh
      ? await refreshRepoCache(repoFullName, false)
      : await ensureCacheFresh(repoFullName);

    // Query cached data
    const data = await getCachedIssues(repoFullName, filter, username);

    return {
      success: true,
      data,
      cache: {
        wasRefreshed: cacheResult.wasRefreshed || forceRefresh,
        lastFetchedAt: cacheResult.lastFetchedAt || new Date().toISOString(),
        totalCached: cacheResult.totalCached,
      },
    };
  } catch (error) {
    console.error(`[IssueCache] getIssuesWithCache failed:`, error.message);
    throw error;
  }
}

/**
 * Clear cache for a repository
 * @param {string} repoFullName - Repository full name
 */
async function clearRepoCache(repoFullName) {
  await query('DELETE FROM github_issues_cache WHERE repo_full_name = ?', [repoFullName]);
  await query('DELETE FROM github_cache_metadata WHERE repo_full_name = ?', [repoFullName]);
  await query('DELETE FROM github_user_issue_stats WHERE repo_full_name = ?', [repoFullName]);
  console.log(`[IssueCache] Cleared cache for ${repoFullName}`);
}

/**
 * Get list of all cached repositories
 * @returns {Promise<Array>} Array of repo metadata
 */
async function getTrackedRepositories() {
  const sql = `
    SELECT repo_full_name, last_fetched_at, total_issues_cached
    FROM github_cache_metadata
    WHERE filter_type = 'all'
    ORDER BY last_fetched_at DESC
  `;
  return query(sql);
}

module.exports = {
  refreshRepoCache,
  getCachedIssues,
  getCacheStatus,
  ensureCacheFresh,
  getIssuesWithCache,
  clearRepoCache,
  getTrackedRepositories,
  CACHE_CONFIG,
};
