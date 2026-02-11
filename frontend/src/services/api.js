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
  const res = await fetch(`${API_BASE}/api/github/repos`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

/**
 * Add a repository to tracked list
 * @param {Object} repoData - Repository data
 * @returns {Promise<Object>}
 */
export async function addTrackedRepository(repoData) {
  const res = await fetch(`${API_BASE}/api/github/tracked`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(repoData),
  });
  return handleResponse(res);
}

/**
 * Remove a repository from tracked list
 * @param {string} fullName - Repository full name
 * @returns {Promise<Object>}
 */
export async function removeTrackedRepository(fullName) {
  const params = new URLSearchParams({ fullName });
  const res = await fetch(`${API_BASE}/api/github/tracked?${params}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
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
 * Fetch timeline data from a repository grouped by user for a given period
 * @param {string} repo - Repository full name (owner/repo)
 * @param {string} filter - Filter: today, yesterday, this-week, last-week, this-month
 * @returns {Promise<Array>} Array of users with issues and timeline data
 */
export async function getGithubTimeline(repo, filter = 'this-month', options = {}) {
  const params = new URLSearchParams({ repo });
  if (filter) params.append('filter', filter);
  if (options.date) params.append('date', options.date); // Support specific date

  const headers = {};

  if (options.etag) {
    headers['If-None-Match'] = options.etag;
  }

  const res = await fetch(`${API_BASE}/api/github/timeline?${params}`, {
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

/**
 * Fetch issues for a repo with optional user filtering
 * Uses Redis-cached GraphQL via /api/issues endpoint
 * 
 * @param {string|string[]} repo - Repository full name (owner/repo) or array of names
 * @param {string} filter - Filter: today|yesterday|this-week|last-week|this-month
 * @param {Object} options - Additional options
 * @param {string} options.user - Optional: filter by specific username
 * @returns {Promise<Object>} { data: [{ username, assigned, inProgress, done, ... }] }
 */
export async function fetchCachedIssues(repo, filter = 'today', options = {}) {
  const repoParam = Array.isArray(repo) ? repo.join(',') : repo;
  const params = new URLSearchParams({ repo: repoParam, filter });

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
 * Submit a new personnel record (PDS)
 * @param {Object} payload - Personnel data
 * @returns {Promise<Object>} - Created record
 */
export async function submitPersonnelRecord(payload) {
  const res = await fetch(`${API_BASE}/api/personnel`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return handleResponse(res);
}

/**
 * Update a personnel record (PDS)
 * @param {number} id - Record ID
 * @param {Object} payload - Personnel data
 * @returns {Promise<Object>} - Updated record
 */
export async function updatePersonnelRecord(id, payload) {
  const res = await fetch(`${API_BASE}/api/personnel/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return handleResponse(res);
}


/**
 * Delete a personnel record (PDS)
 * @param {number} id - Record ID
 * @returns {Promise<void>}
 */
export async function deletePersonnelRecord(id) {
  const res = await fetch(`${API_BASE}/api/personnel/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  return handleResponse(res);
}

/**
 * Search users by name (for connection requests)
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Array of matching users
 */
export async function searchUsers(query) {
  const res = await fetch(`${API_BASE}/api/users/search?q=${encodeURIComponent(query)}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

// ─────────────────────────────────────────────────────────────
// Monitoring Request APIs
// ─────────────────────────────────────────────────────────────

/**
 * Create a monitoring request
 * @param {number} targetUserId 
 * @returns {Promise<Object>}
 */
export async function createMonitoringRequest(targetUserId) {
  const res = await fetch(`${API_BASE}/api/monitoring/requests`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ targetUserId }),
  });
  return handleResponse(res);
}

/**
 * Get pending monitoring requests (for employee)
 * @returns {Promise<Array>}
 */
export async function getMonitoringRequests() {
  const res = await fetch(`${API_BASE}/api/monitoring/requests`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

/**
 * Get sent monitoring requests (admin only)
 * @returns {Promise<Array>}
 */
export async function getSentMonitoringRequests() {
  const res = await fetch(`${API_BASE}/api/monitoring/requests/sent`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

/**
 * Cancel a pending monitoring request (admin only)
 * @param {string} requestId
 * @returns {Promise<Object>}
 */
export async function cancelMonitoringRequest(requestId) {
  const res = await fetch(`${API_BASE}/api/monitoring/requests/${requestId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

/**
 * Get all active monitoring sessions (admin only)
 * @returns {Promise<Array>}
 */
export async function getMonitoringSessions() {
  const res = await fetch(`${API_BASE}/api/monitoring/sessions`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

/**
 * Delete/Stop a monitoring session
 * @param {string} sessionId
 * @returns {Promise<Object>}
 */
export async function deleteMonitoringSession(sessionId) {
  const res = await fetch(`${API_BASE}/api/monitoring/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

/**
 * Respond to monitoring request (approve/reject)
 * @param {number} requestId 
 * @param {string} status - 'approved' | 'rejected'
 * @returns {Promise<Object>}
 */
export async function respondToMonitoringRequest(requestId, status) {
  const res = await fetch(`${API_BASE}/api/monitoring/requests/${requestId}/respond`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  return handleResponse(res);
}

/**
 * Fetch all personnel records
 * @returns {Promise<Array>} - Array of personnel records
 */
export async function fetchPersonnelRecords() {
  const res = await fetch(`${API_BASE}/api/personnel`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}



// --- Notifications ---
export const getNotifications = async (page = 1, limit = 4) => {
  const res = await fetch(`${API_BASE}/api/notifications?page=${page}&limit=${limit}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const markNotificationRead = async (id) => {
  const res = await fetch(`${API_BASE}/api/notifications/${id}/read`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};

export const deleteAllNotifications = async () => {
  const res = await fetch(`${API_BASE}/api/notifications/all`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
};