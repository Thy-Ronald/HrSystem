/**
 * Cache Utilities
 * Shared caching logic for frontend components
 * 
 * Features:
 * - localStorage-based caching with TTL
 * - TTL: 2 minutes OR until 6 PM (whichever comes first)
 * - Automatic cache invalidation
 * - Cache key generation
 * - Cache statistics
 */

import { getTTL2MinOr6PM, getExpiresAt2MinOr6PM } from '../../../utils/ttlHelpers';

const DEFAULT_TTL_MS = 2 * 60 * 1000; // 2 minutes (fallback for legacy code)

/**
 * Generate a cache key from parameters
 * @param {string} prefix - Cache key prefix
 * @param {...any} parts - Parts to include in key
 * @returns {string} Cache key
 */
export function generateCacheKey(prefix, ...parts) {
  return `${prefix}_${parts.join('_')}`;
}

/**
 * Get data from localStorage cache
 * 
 * Checks expiresAt field first (for 6 PM TTL), then falls back to timestamp-based TTL
 * 
 * @param {string} key - Cache key
 * @param {number} ttlMs - Time to live in milliseconds (fallback, defaults to 2min or 6PM)
 * @returns {any|null} Cached data or null if expired/missing
 */
export function getCached(key, ttlMs = null) {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) {
      return null;
    }

    const cacheEntry = JSON.parse(cached);
    const { data, timestamp, expiresAt } = cacheEntry;
    
    // Step 1: Check expiresAt field (for 6 PM TTL logic)
    if (expiresAt) {
      const expiresAtDate = new Date(expiresAt);
      const now = new Date();
      
      if (now >= expiresAtDate) {
        // Cache expired (past 6 PM or past 2 minutes)
        console.log(`[Cache] ❌ Expired: ${key} (expired at ${expiresAtDate.toISOString()})`);
        localStorage.removeItem(key);
        return null;
      }
      
      const age = now.getTime() - (timestamp || expiresAtDate.getTime());
      console.log(`[Cache HIT] ${key} (age: ${Math.round(age / 1000)}s, expires at ${expiresAtDate.toISOString()})`);
      return data;
    }
    
    // Step 2: Fallback to timestamp-based TTL (legacy format)
    if (timestamp) {
      const age = Date.now() - timestamp;
      const effectiveTTL = ttlMs || getTTL2MinOr6PM();
      
      if (age > effectiveTTL) {
        // Cache expired
        localStorage.removeItem(key);
        return null;
      }
      
      console.log(`[Cache HIT] ${key} (age: ${Math.round(age / 1000)}s)`);
      return data;
    }
    
    // Step 3: No expiration info, assume expired
    console.log(`[Cache] ❌ Invalid cache entry (no expiration): ${key}`);
    localStorage.removeItem(key);
    return null;
  } catch (error) {
    console.error('[Cache] Error reading cache:', error);
    return null;
  }
}

/**
 * Get raw cache entry regardless of expiration
 * @param {string} key 
 * @returns {Object|null} { data, timestamp, expiresAt, etag }
 */
export function getRawCache(key) {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch (error) {
    return null;
  }
}

/**
 * Set data in localStorage cache with 2min OR 6PM TTL
 * 
 * Stores:
 * - data: The cached data
 * - timestamp: Current timestamp
 * - expiresAt: Expiration time (2min from now OR 6PM, whichever comes first)
 * - etag: Optional ETag for conditional requests
 * 
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} timestamp - Optional timestamp (defaults to now)
 * @param {string} etag - Optional ETag for conditional requests
 */
export function setCached(key, data, timestamp = Date.now(), etag = null) {
  try {
    // Calculate expiration time: 2 minutes OR 6 PM (whichever comes first)
    const expiresAt = getExpiresAt2MinOr6PM();
    
    const cacheEntry = {
      data,
      timestamp,
      expiresAt: expiresAt.toISOString(),
      etag: etag || null,
    };
    
    localStorage.setItem(key, JSON.stringify(cacheEntry));
    console.log(`[Cache SET] ${key} (expires at ${expiresAt.toISOString()}) ${etag ? '(with ETag)' : ''}`);
  } catch (error) {
    console.error('[Cache] Error writing cache:', error);
    // If localStorage is full, clear old entries
    if (error.name === 'QuotaExceededError') {
      clearOldCache();
      // Try again
      try {
        const expiresAt = getExpiresAt2MinOr6PM();
        localStorage.setItem(key, JSON.stringify({ 
          data, 
          timestamp, 
          expiresAt: expiresAt.toISOString(),
          etag 
        }));
      } catch (retryError) {
        console.error('[Cache] Failed to write cache after cleanup:', retryError);
      }
    }
  }
}

/**
 * Delete a specific cache entry
 * @param {string} key - Cache key to delete
 */
export function deleteCached(key) {
  try {
    localStorage.removeItem(key);
    console.log(`[Cache DELETE] ${key}`);
  } catch (error) {
    console.error('[Cache] Error deleting cache:', error);
  }
}

/**
 * Clear all cache entries matching a pattern
 * @param {string} pattern - Pattern to match (e.g., 'ranking_')
 */
export function clearCachePattern(pattern) {
  try {
    const keysToDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => localStorage.removeItem(key));
    console.log(`[Cache] Cleared ${keysToDelete.length} entries matching '${pattern}'`);
  } catch (error) {
    console.error('[Cache] Error clearing cache pattern:', error);
  }
}

/**
 * Clear old cache entries (older than 1 hour)
 * Used when localStorage quota is exceeded
 */
export function clearOldCache() {
  try {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const keysToDelete = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      try {
        const cached = localStorage.getItem(key);
        if (!cached) continue;

        const { timestamp } = JSON.parse(cached);
        if (timestamp < oneHourAgo) {
          keysToDelete.push(key);
        }
      } catch (parseError) {
        // Invalid cache entry, delete it
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => localStorage.removeItem(key));
    console.log(`[Cache] Cleared ${keysToDelete.length} old cache entries`);
  } catch (error) {
    console.error('[Cache] Error clearing old cache:', error);
  }
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
export function getCacheStats() {
  try {
    let totalEntries = 0;
    let totalSize = 0;
    let validEntries = 0;
    let expiredEntries = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const value = localStorage.getItem(key);
      if (!value) continue;

      totalEntries++;
      totalSize += value.length;

      try {
        const { timestamp } = JSON.parse(value);
        const age = Date.now() - timestamp;
        if (age < DEFAULT_TTL_MS) {
          validEntries++;
        } else {
          expiredEntries++;
        }
      } catch (parseError) {
        expiredEntries++;
      }
    }

    return {
      totalEntries,
      validEntries,
      expiredEntries,
      totalSizeKB: Math.round(totalSize / 1024),
      hitRate: totalEntries > 0 ? Math.round((validEntries / totalEntries) * 100) : 0,
    };
  } catch (error) {
    console.error('[Cache] Error getting cache stats:', error);
    return null;
  }
}

/**
 * Check if cache key exists and is valid
 * @param {string} key - Cache key
 * @param {number} ttlMs - Time to live in milliseconds
 * @returns {boolean} True if cache exists and is valid
 */
export function isCacheValid(key, ttlMs = DEFAULT_TTL_MS) {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return false;

    const { timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;
    return age <= ttlMs;
  } catch (error) {
    return false;
  }
}

/**
 * Wrapper for async data fetching with caching and ETag support
 * 
 * Uses 2min OR 6PM TTL logic automatically
 * 
 * @param {string} cacheKey - Cache key
 * @param {Function} fetchFn - Async function (etag) => Promise<data | {data, etag} | null>
 * @param {number} ttlMs - Cache TTL in milliseconds (optional, defaults to 2min or 6PM)
 * @returns {Promise<any>} Cached or fresh data
 */
export async function fetchWithCache(cacheKey, fetchFn, ttlMs = null) {
  // Step 1: Check cache first (uses expiresAt field)
  const cached = getCached(cacheKey, ttlMs);
  
  if (cached !== null) {
    // Cache hit - return immediately
    return cached;
  }
  
  // Step 2: Get raw cache for ETag (even if expired)
  const raw = getRawCache(cacheKey);
  const previousEtag = raw?.etag;
  let result;

  try {
    // Step 3: Conditional Fetch with ETag if available
    if (previousEtag) {
      console.log(`[Cache REVALIDATE] ${cacheKey} (ETag: ${previousEtag.substring(0, 20)}...)`);
      // Pass etag to fetchFn
      result = await fetchFn(previousEtag);

      if (result === null) { // 304 Not Modified
        console.log(`[Cache 304] Not Modified - Reviving cache for ${cacheKey}`);
        // Revive stale data with new expiration (2min or 6PM)
        setCached(cacheKey, raw.data, Date.now(), previousEtag);
        return raw.data;
      }
    } else {
      console.log(`[Cache MISS] ${cacheKey}`);
      result = await fetchFn();
    }

    // Step 4: Store New Data with 2min OR 6PM TTL
    // Check if result has etag structure or is just data
    const data = result?.data !== undefined ? result.data : result;
    const newEtag = result?.etag || null;

    setCached(cacheKey, data, Date.now(), newEtag);
    return data;

  } catch (err) {
    // Don't log abort errors as they're expected when component unmounts or dependencies change
    if (err.name === 'AbortError') {
      console.log(`[Cache] Request aborted for ${cacheKey}`);
      throw err;
    }
    console.error(`[Cache] Fetch failed for ${cacheKey}`, err);
    throw err;
  }
}
