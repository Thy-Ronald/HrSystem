/**
 * GitHub API Cache Helper
 * 
 * Redis-based caching for GitHub API responses with 6 PM TTL
 * 
 * Features:
 * - Stores data, ETag, and expiresAt in Redis
 * - TTL expires exactly at 6:00 PM local server time
 * - Handles conditional requests (304 Not Modified)
 * - Graceful fallback to in-memory cache if Redis unavailable
 */

const cacheService = require('../services/cacheService');
const { getTTLUntil6PM, getExpiresAt6PM } = require('./ttlHelpers');

/**
 * Generate cache key for GitHub API responses
 * 
 * @param {string} type - Type of data (e.g., 'commits', 'issues', 'repos')
 * @param {string} repoFullName - Repository full name (owner/repo)
 * @param {string} filter - Filter type (e.g., 'today', 'this-week')
 * @returns {string} Cache key
 */
function generateCacheKey(type, repoFullName, ...extras) {
  const parts = ['github', type, repoFullName.replace('/', '_')];
  extras.forEach(extra => {
    if (extra) {
      parts.push(String(extra));
    }
  });
  return parts.join(':');
}

/**
 * Get cached GitHub API response from Redis
 * 
 * Checks Redis cache and returns data if:
 * - Cache exists
 * - Cache is not expired (expiresAt > now)
 * 
 * @param {string} cacheKey - Cache key
 * @returns {Promise<Object|null>} { data, etag, expiresAt } or null if not cached/expired
 */
async function getCachedGitHubResponse(cacheKey) {
  try {
    // Get cached entry from Redis (or memory fallback)
    const cached = await cacheService.get(cacheKey);

    if (!cached) {
      return null;
    }

    // Parse cached data (could be string or object)
    // Parse cached data
    // cacheService.get returns the data field if it exists, or the parsed JSON
    let cacheEntry;
    if (typeof cached === 'string') {
      try {
        cacheEntry = JSON.parse(cached);
      } catch (e) {
        cacheEntry = { data: cached };
      }
    } else if (cached && cached.data !== undefined && typeof cached.data === 'object') {
      // cacheService wraps our cacheEntry in { data: cacheEntry, timestamp, etag }
      cacheEntry = cached.data;
    } else {
      cacheEntry = cached;
    }

    // Extract actual data and metadata
    const actualData = cacheEntry.data || cacheEntry;
    const expiresAtStr = cacheEntry.expiresAt || cacheEntry._expiresAt;
    const etag = cacheEntry.etag || cached?.etag || null;

    // Check if cache entry has expiresAt field
    if (expiresAtStr) {
      const expiresAt = new Date(expiresAtStr);
      const now = new Date();

      // If expired, return null
      if (now >= expiresAt) {
        console.log(`[GitHub Cache] ❌ Expired: ${cacheKey} (expired at ${expiresAt.toISOString()})`);
        return null;
      }

      console.log(`[GitHub Cache] ✅ HIT: ${cacheKey} (expires at ${expiresAt.toISOString()})`);
      return {
        data: actualData,
        etag: etag,
        expiresAt: expiresAt,
      };
    }

    // Legacy format: check timestamp-based expiration
    if (cacheEntry.timestamp) {
      const age = Date.now() - cacheEntry.timestamp;
      const expiresAt = new Date(cacheEntry.timestamp + (cacheEntry.ttlSeconds || 600) * 1000);

      if (Date.now() >= expiresAt.getTime()) {
        return null;
      }

      return {
        data: actualData,
        etag: etag,
        expiresAt: expiresAt,
      };
    }

    // Fallback: assume data is valid (shouldn't happen with new format)
    return {
      data: actualData,
      etag: etag,
      expiresAt: getExpiresAt6PM(),
    };
  } catch (error) {
    console.error(`[GitHub Cache] Error getting cache for ${cacheKey}:`, error.message);
    return null;
  }
}

/**
 * Store GitHub API response in Redis cache
 * 
 * Stores:
 * - data: The API response data
 * - etag: ETag from GitHub response headers
 * - expiresAt: Timestamp when cache expires (6 PM)
 * 
 * @param {string} cacheKey - Cache key
 * @param {any} data - Data to cache
 * @param {string|null} etag - ETag from GitHub response headers
 * @returns {Promise<void>}
 */
async function setCachedGitHubResponse(cacheKey, data, etag = null) {
  try {
    // Calculate TTL until 6 PM
    const ttlSeconds = getTTLUntil6PM();
    const expiresAt = getExpiresAt6PM();

    // Create cache entry with all required fields
    // cacheService.set wraps data in { data: <ourData>, timestamp, etag } format
    // So we store our cacheEntry object as the data
    const cacheEntry = {
      data: data, // The actual GitHub API response data
      expiresAt: expiresAt.toISOString(), // Expiration timestamp
      timestamp: Date.now(),
      etag: etag || null,
    };

    // Store in Redis with TTL
    // cacheService.set(key, data, ttlSeconds, etag)
    // It wraps our cacheEntry in { data: cacheEntry, timestamp, etag }
    await cacheService.set(cacheKey, cacheEntry, ttlSeconds, etag);

    console.log(`[GitHub Cache] ✅ SET: ${cacheKey} (expires at ${expiresAt.toISOString()}, TTL: ${ttlSeconds}s)`);
  } catch (error) {
    console.error(`[GitHub Cache] Error setting cache for ${cacheKey}:`, error.message);
    // Don't throw - caching failure shouldn't break the app
  }
}

/**
 * Refresh cache TTL without changing data
 * 
 * Used when GitHub returns 304 Not Modified - we reuse cached data
 * but refresh the expiration time to 6 PM
 * 
 * @param {string} cacheKey - Cache key
 * @param {any} data - Existing cached data
 * @param {string|null} etag - Existing ETag
 * @returns {Promise<void>}
 */
async function refreshCacheTTL(cacheKey, data, etag = null) {
  try {
    // Re-store with new 6 PM TTL
    await setCachedGitHubResponse(cacheKey, data, etag);
    console.log(`[GitHub Cache] 🔄 Refreshed TTL: ${cacheKey}`);
  } catch (error) {
    console.error(`[GitHub Cache] Error refreshing TTL for ${cacheKey}:`, error.message);
  }
}

/**
 * Get ETag from cache
 * 
 * @param {string} cacheKey - Cache key
 * @returns {Promise<string|null>} ETag or null
 */
async function getCachedETag(cacheKey) {
  try {
    const cached = await getCachedGitHubResponse(cacheKey);
    return cached?.etag || null;
  } catch (error) {
    console.error(`[GitHub Cache] Error getting ETag for ${cacheKey}:`, error.message);
    return null;
  }
}

/**
 * Delete cached GitHub response
 * 
 * @param {string} cacheKey - Cache key
 * @returns {Promise<void>}
 */
async function deleteCachedGitHubResponse(cacheKey) {
  try {
    await cacheService.delete(cacheKey);
    console.log(`[GitHub Cache] 🗑️  Deleted: ${cacheKey}`);
  } catch (error) {
    console.error(`[GitHub Cache] Error deleting cache for ${cacheKey}:`, error.message);
  }
}

module.exports = {
  generateCacheKey,
  getCachedGitHubResponse,
  setCachedGitHubResponse,
  refreshCacheTTL,
  getCachedETag,
  deleteCachedGitHubResponse,
};
