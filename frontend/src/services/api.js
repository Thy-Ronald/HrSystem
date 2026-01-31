const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
import { getToken } from '../utils/auth';

/**
 * Get authorization headers with JWT token
 * @returns {Object} Headers object with Authorization header
 */
function getAuthHeaders() {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Handle API response with consistent format
 * @param {Response} res - Fetch response
 * @returns {Promise<any>} - Parsed response data
 */
async function handleResponse(res) {
  const data = await res.json();

  if (!res.ok) {
    // Handle API error format
    const error = new Error(data.error || data.message || 'Request failed');
    error.status = res.status;
    error.errors = data.errors || [];
    throw error;
  }

  // Return data from success response
  return data.success ? data.data : data;
}

/**
 * Submit a new contract
 * @param {Object} payload - Contract data
 * @returns {Promise<Object>} - Created contract
 */
export async function submitContract(payload) {
  const res = await fetch(`${API_BASE}/api/contracts`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return handleResponse(res);
}

/**
 * Fetch all contracts
 * @returns {Promise<Array>} - Array of contracts
 */
export async function fetchContracts() {
  const res = await fetch(`${API_BASE}/api/contracts`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

/**
 * Fetch a contract by ID
 * @param {number} id - Contract ID
 * @returns {Promise<Object>} - Contract object
 */
export async function fetchContractById(id) {
  const res = await fetch(`${API_BASE}/api/contracts/${id}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

/**
 * Update a contract
 * @param {number} id - Contract ID
 * @param {Object} payload - Contract data to update
 * @returns {Promise<Object>} - Updated contract
 */
export async function updateContract(id, payload) {
  const res = await fetch(`${API_BASE}/api/contracts/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return handleResponse(res);
}

/**
 * Delete a contract
 * @param {number} id - Contract ID
 * @returns {Promise<void>}
 */
export async function deleteContract(id) {
  const res = await fetch(`${API_BASE}/api/contracts/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  return handleResponse(res);
}

/**
 * Fetch contracts expiring within specified days
 * @param {number} days - Number of days (default: 7)
 * @returns {Promise<Array>} - Array of expiring contracts
 */
export async function fetchExpiringContracts(days = 7) {
  const res = await fetch(`${API_BASE}/api/contracts/expiring?days=${days}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

/**
 * Test expiration notifications
 * @returns {Promise<Object>} - Test result with found and sent counts
 */
export async function testExpirationNotifications() {
  const res = await fetch(`${API_BASE}/api/contracts/test-expiration-notifications`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

/**
 * Test direct email sending
 * @returns {Promise<Object>} - Test result
 */
export async function testDirectEmail() {
  const res = await fetch(`${API_BASE}/api/contracts/test-email`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

/**
 * Fetch GitHub profile (legacy)
 */
export async function fetchGithubProfile(username) {
  const res = await fetch(`${API_BASE}/api/github/${username}`);
  if (!res.ok) {
    const errText = res.status === 404 ? 'User not found' : 'Unable to fetch data';
    throw new Error(errText);
  }
  return res.json();
}

/**
 * Fetch all repositories accessible via the GitHub token
 * @returns {Promise<Array>} Array of { owner, name, fullName }
 */
export async function fetchRepositories() {
  const res = await fetch(`${API_BASE}/api/github/repos`);
  return handleResponse(res);
}

/**
 * Fetch issues from a repository grouped by user for a given period
 * @param {string} repo - Repository full name (owner/repo)
 * @param {string} filter - Filter: today, yesterday, this-week, last-week, this-month
 * @returns {Promise<Array>} Array of objects with username and issueCount
 */
export async function fetchIssuesByPeriod(repo, filter = 'today', options = {}) {
  const params = new URLSearchParams({ repo, filter });
  const headers = {};

  if (options.etag) {
    headers['If-None-Match'] = options.etag;
  }

  const res = await fetch(`${API_BASE}/api/github/issues?${params}`, {
    headers,
    signal: options.signal
  });

  if (res.status === 304) {
    return null;
  }

  const data = await handleResponse(res);

  if (options.includeEtag) {
    return {
      data,
      etag: res.headers.get('ETag')
    };
  }

  return data;
}

/**
 * Fetch commits from a repository grouped by user for a given period
 * @param {string} repo - Repository full name (owner/repo)
 * @param {string} filter - Filter: today, yesterday, this-week, last-week, this-month
 * @returns {Promise<Array>} Array of objects with username and commitCount
 */
export async function fetchCommitsByPeriod(repo, filter = 'today', options = {}) {
  const params = new URLSearchParams({ repo, filter });
  const headers = {};

  if (options.etag) {
    headers['If-None-Match'] = options.etag;
  }

  const res = await fetch(`${API_BASE}/api/github/commits?${params}`, {
    headers,
    signal: options.signal
  });

  if (res.status === 304) {
    return null;
  }

  const data = await handleResponse(res);

  if (options.includeEtag) {
    return {
      data,
      etag: res.headers.get('ETag')
    };
  }

  return data;
}

/**
 * Fetch languages used by each user from commits in a repository
 * @param {string} repo - Repository full name (owner/repo)
 * @param {string} filter - Filter: 'all' for overall percentages, or today, yesterday, this-week, last-week, this-month
 * @returns {Promise<Array>} Array of objects with username and topLanguages
 */
export async function fetchLanguagesByPeriod(repo, filter = 'all', options = {}) {
  const params = new URLSearchParams({ repo, filter: filter || 'all' });
  const headers = {};

  if (options.etag) {
    headers['If-None-Match'] = options.etag;
  }

  const res = await fetch(`${API_BASE}/api/github/languages?${params}`, {
    headers,
    signal: options.signal
  });

  if (res.status === 304) {
    return null;
  }

  const data = await handleResponse(res);

  if (options.includeEtag) {
    return {
      data,
      etag: res.headers.get('ETag')
    };
  }

  return data;
}

/**
 * Get analytics overview
 * @param {string} filter - Filter: today, yesterday, this-week, last-week, this-month
 * @returns {Promise<Object>} Overview statistics
 */
export async function getAnalyticsOverview(filter = 'this-month') {
  const res = await fetch(`${API_BASE}/api/analytics/overview?filter=${filter}`);
  const data = await handleResponse(res);
  return data.success ? data : { success: true, data };
}

/**
 * Get daily activity trends
 * @param {string} filter - Filter: today, yesterday, this-week, last-week, this-month
 * @returns {Promise<Array>} Daily activity data
 */
export async function getDailyActivityTrends(filter = 'this-month') {
  const res = await fetch(`${API_BASE}/api/analytics/trends?filter=${filter}`);
  const data = await handleResponse(res);
  return data.success ? data : { success: true, data: data.data || data };
}

/**
 * Get top contributors
 * @param {number} limit - Number of contributors to return
 * @param {string} filter - Filter: today, yesterday, this-week, last-week, this-month
 * @returns {Promise<Array>} Top contributors
 */
export async function getTopContributors(limit = 10, filter = 'this-month') {
  const res = await fetch(`${API_BASE}/api/analytics/top-contributors?limit=${limit}&filter=${filter}`);
  const data = await handleResponse(res);
  return data.success ? data : { success: true, data: data.data || data };
}

/**
 * Get language distribution
 * @param {string} filter - Filter: all, today, yesterday, this-week, last-week, this-month
 * @returns {Promise<Array>} Language distribution
 */
export async function getLanguageDistribution(filter = 'all') {
  const res = await fetch(`${API_BASE}/api/analytics/languages?filter=${filter}`);
  const data = await handleResponse(res);
  return data.success ? data : { success: true, data: data.data || data };
}

/**
 * Lightweight cache status check - does NOT call GitHub API
 * @param {string} repo - Repository full name (owner/repo)
 * @param {string} filter - Filter type
 * @returns {Promise<Object>} Cache info with valid, timestamp, hash
 */
export async function checkCacheStatus(repo, filter = 'today') {
  const params = new URLSearchParams({ repo, filter });
  const res = await fetch(`${API_BASE}/api/github/cache-check?${params}`);
  return handleResponse(res);
}

/**
 * Check if repository has changes using GitHub's ETag (conditional request)
 * 304 responses DON'T count against GitHub rate limit - allows frequent polling!
 * @param {string} repo - Repository full name (owner/repo)
 * @returns {Promise<Object>} { changed: boolean }
 */
export async function checkRepoChanges(repo) {
  const params = new URLSearchParams({ repo });
  const res = await fetch(`${API_BASE}/api/github/has-changes?${params}`);
  return handleResponse(res);
}

// =============================================================================
// INCREMENTAL CACHING API - MySQL-backed cache with selective refresh
// =============================================================================

/**
 * Fetch cached issues for a repo with optional user filtering
 * 
 * CACHING STRATEGY:
 * - First call for a repo triggers cache population
 * - Subsequent calls return cached data (fast)
 * - Background job refreshes cache every 30 minutes using `updated_since`
 * - forceRefresh=true triggers immediate incremental refresh
 * 
 * @param {string} repo - Repository full name (owner/repo)
 * @param {string} filter - Filter: today|yesterday|this-week|last-week|this-month
 * @param {Object} options - Additional options
 * @param {string} options.user - Optional: filter by specific username
 * @param {boolean} options.forceRefresh - Force cache refresh
 * @returns {Promise<Object>} { data, cache: { wasRefreshed, lastFetchedAt } }
 */
export async function fetchCachedIssues(repo, filter = 'today', options = {}) {
  const params = new URLSearchParams({ repo, filter });

  if (options.user) {
    params.set('user', options.user);
  }
  if (options.forceRefresh) {
    params.set('forceRefresh', 'true');
  }

  const headers = {};
  if (options.etag) {
    headers['If-None-Match'] = options.etag;
  }

  const res = await fetch(`${API_BASE}/api/issues?${params}`, {
    headers
  });

  if (res.status === 304) {
    return null;
  }

  const data = await handleResponse(res);

  if (options.includeEtag) {
    return {
      data,
      etag: res.headers.get('ETag')
    };
  }

  return data;
}

/**
 * Check cache status for a repository (lightweight, no data transfer)
 * 
 * Use this for smart polling: check status frequently, only fetch full data
 * when cache has been refreshed.
 * 
 * @param {string} repo - Repository full name
 * @returns {Promise<Object>} { isCached, lastFetchedAt, needsRefresh, totalIssues }
 */
export async function getCachedIssuesStatus(repo) {
  const params = new URLSearchParams({ repo });
  const res = await fetch(`${API_BASE}/api/issues/cache-status?${params}`);
  const result = await handleResponse(res);
  return result.cache || result;
}

/**
 * Check if issues have changed since a timestamp (for smart polling)
 * 
 * SMART POLLING STRATEGY:
 * 1. Frontend polls this endpoint every 30-60 seconds
 * 2. Returns quickly with hasChanges boolean
 * 3. Only fetch full data when hasChanges=true
 * 
 * @param {string} repo - Repository full name
 * @param {string} since - ISO timestamp from last fetch
 * @returns {Promise<Object>} { hasChanges, lastFetchedAt, needsRefresh }
 */
export async function checkCachedIssuesChanges(repo, since = null) {
  const params = new URLSearchParams({ repo });
  if (since) {
    params.set('since', since);
  }
  const res = await fetch(`${API_BASE}/api/issues/changes?${params}`);
  return handleResponse(res);
}

/**
 * Force refresh cache for a repository
 * 
 * Triggers an incremental refresh (fetches only issues updated since last fetch).
 * For a full refresh (re-fetch all issues), set fullRefresh=true.
 * 
 * @param {string} repo - Repository full name
 * @param {boolean} fullRefresh - Force full refresh (default: false for incremental)
 * @returns {Promise<Object>} Refresh result with stats
 */
export async function refreshCachedIssues(repo, fullRefresh = false) {
  const res = await fetch(`${API_BASE}/api/issues/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, fullRefresh }),
  });
  return handleResponse(res);
}

/**
 * Get background job status and tracked repositories
 * 
 * Useful for admin/debugging UI to see:
 * - Is the background job running?
 * - Which repos are being tracked?
 * - When were they last refreshed?
 * 
 * @returns {Promise<Object>} { job, trackedRepos, repos }
 */
export async function getCacheJobStatus() {
  const res = await fetch(`${API_BASE}/api/issues/job-status`);
  return handleResponse(res);
}