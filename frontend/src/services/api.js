const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return handleResponse(res);
}

/**
 * Fetch all contracts
 * @returns {Promise<Array>} - Array of contracts
 */
export async function fetchContracts() {
  const res = await fetch(`${API_BASE}/api/contracts`);
  return handleResponse(res);
}

/**
 * Fetch a contract by ID
 * @param {number} id - Contract ID
 * @returns {Promise<Object>} - Contract object
 */
export async function fetchContractById(id) {
  const res = await fetch(`${API_BASE}/api/contracts/${id}`);
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
    headers: { 'Content-Type': 'application/json' },
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
  });

  return handleResponse(res);
}

/**
 * Fetch contracts expiring within specified days
 * @param {number} days - Number of days (default: 7)
 * @returns {Promise<Array>} - Array of expiring contracts
 */
export async function fetchExpiringContracts(days = 7) {
  const res = await fetch(`${API_BASE}/api/contracts/expiring?days=${days}`);
  return handleResponse(res);
}

/**
 * Test expiration notifications
 * @returns {Promise<Object>} - Test result with found and sent counts
 */
export async function testExpirationNotifications() {
  const res = await fetch(`${API_BASE}/api/contracts/test-expiration-notifications`, {
    method: 'POST',
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
