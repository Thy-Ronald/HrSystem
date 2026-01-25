/**
 * Cache Utilities
 * Shared caching logic for frontend components
 * 
 * Features:
 * - localStorage-based caching with TTL
 * - Automatic cache invalidation
 * - Cache key generation
 * - Cache statistics
 */

const DEFAULT_TTL_MS = 2 * 60 * 1000; // 2 minutes

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
 * @param {string} key - Cache key
 * @param {number} ttlMs - Time to live in milliseconds
 * @returns {any|null} Cached data or null if expired/missing
 */
export function getCached(key, ttlMs = DEFAULT_TTL_MS) {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) {
      return null;
    }

    const { data, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;

    if (age > ttlMs) {
      // Cache expired, remove it
      localStorage.removeItem(key);
      return null;
    }

    console.log(`[Cache HIT] ${key} (age: ${Math.round(age / 1000)}s)`);
    return data;
  } catch (error) {
    console.error('[Cache] Error reading cache:', error);
    return null;
  }
}

/**
 * Get raw cache entry regardless of expiration
 * @param {string} key 
 * @returns {Object|null} { data, timestamp, etag }
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
 * Set data in localStorage cache
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} timestamp - Optional timestamp (defaults to now)
 * @param {string} etag - Optional ETag for conditional requests
 */
export function setCached(key, data, timestamp = Date.now(), etag = null) {
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp,
      etag,
    }));
    console.log(`[Cache SET] ${key} ${etag ? '(with ETag)' : ''}`);
  } catch (error) {
    console.error('[Cache] Error writing cache:', error);
    // If localStorage is full, clear old entries
    if (error.name === 'QuotaExceededError') {
      clearOldCache();
      // Try again
      try {
        localStorage.setItem(key, JSON.stringify({ data, timestamp, etag }));
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
 * @param {string} cacheKey - Cache key
 * @param {Function} fetchFn - Async function (etag) => Promise<data | {data, etag} | null>
 * @param {number} ttlMs - Cache TTL in milliseconds
 * @returns {Promise<any>} Cached or fresh data
 */
export async function fetchWithCache(cacheKey, fetchFn, ttlMs = DEFAULT_TTL_MS) {
  // Check raw cache first
  const raw = getRawCache(cacheKey);

  // 1. Valid Cache?
  if (raw) {
    const age = Date.now() - raw.timestamp;
    if (age <= ttlMs) {
      console.log(`[Cache HIT] ${cacheKey} (age: ${Math.round(age / 1000)}s)`);
      return raw.data;
    }
    // Expired - continue to revalidation
  }

  // 2. Conditional Fetch
  const previousEtag = raw?.etag;
  let result;

  try {
    if (previousEtag) {
      console.log(`[Cache REVALIDATE] ${cacheKey} (ETag: ${previousEtag})`);
      // Pass etag to fetchFn
      result = await fetchFn(previousEtag);

      if (result === null) { // 304 Not Modified
        console.log(`[Cache 304] Not Modified - Reviving cache for ${cacheKey}`);
        // Revive stale data with new timestamp
        setCached(cacheKey, raw.data, Date.now(), previousEtag);
        return raw.data;
      }
    } else {
      console.log(`[Cache MISS] ${cacheKey}`);
      result = await fetchFn();
    }

    // 3. Store New Data
    // Check if result has etag structure or is just data
    const data = result?.data !== undefined ? result.data : result;
    const newEtag = result?.etag || null;

    setCached(cacheKey, data, Date.now(), newEtag);
    return data;

  } catch (err) {
    console.error(`[Cache] Fetch failed for ${cacheKey}`, err);
    throw err;
  }
}
