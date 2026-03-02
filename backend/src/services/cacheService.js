/**
 * Cache Service
 * Redis-based caching with in-memory fallback
 * 
 * Features:
 * - Redis for persistent, shared cache
 * - In-memory fallback if Redis unavailable
 * - Automatic TTL management
 * - Graceful degradation
 */

// Reuse the shared Upstash client from config/redis.js so we don't open a
// second TCP connection for every Cloud Run instance.
const sharedRedis = require('../config/redis');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    // Fallback in-memory cache
    this.memoryCache = new Map();
    this.memoryTimestamps = new Map();
  }

  /**
   * Connect to Redis
   * Falls back to in-memory cache if Redis unavailable
   */
  async connect() {
    try {
      // Reuse the already-connected client from config/redis.js.
      // This avoids opening a second TCP connection to Upstash per instance.
      const existing = sharedRedis.getClient();
      if (!existing) {
        // REDIS_URL not set — use in-memory cache only.
        console.warn('[CacheService] No shared Redis client available — using in-memory cache');
        this.isConnected = false;
        return;
      }

      this.client = existing;

      // Keep isConnected in sync with the shared client's lifecycle events.
      existing.on('ready', () => { this.isConnected = true; });
      existing.on('error', () => { this.isConnected = sharedRedis.isReady(); });
      existing.on('end',   () => { this.isConnected = false; });

      if (sharedRedis.isReady()) {
        // Already connected (fast path — module was required early enough)
        this.isConnected = true;
        console.log('[CacheService] Reusing shared Redis client from config/redis.js');
      } else {
        // Connect() fired at require() time but hasn't resolved yet.
        // Wait up to 5 s for the ready event before continuing so we don't
        // immediately fall back to in-memory cache on a cold start.
        console.log('[CacheService] Waiting for shared Redis client to become ready...');
        await new Promise((resolve) => {
          const onReady = () => { this.isConnected = true; resolve(); };
          const onError = () => resolve(); // resolve anyway — error handler above handles state
          existing.once('ready', onReady);
          existing.once('error', onError);
          setTimeout(() => {
            existing.off('ready', onReady);
            existing.off('error', onError);
            resolve(); // timed out — fall through with whatever state we have
          }, 5000);
        });
        console.log(`[CacheService] Shared Redis client ready=${this.isConnected}`);
      }
    } catch (error) {
      console.warn('⚠️ CacheService init error, falling back to in-memory cache:', error.message);
      this.isConnected = false;
    }
  }

  /**
   * Get cached data
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in milliseconds (for memory fallback)
   * @returns {Promise<any|null>} Cached data or null
   */
  async get(key, ttl = 600000) {
    if (!this.isConnected || !this.client) {
      // Fallback to memory cache
      return this.getFromMemory(key, ttl);
    }

    try {
      const data = await this.client.get(key);
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.data || parsed; // Handle both formats
      }
      return null;
    } catch (error) {
      console.error('Redis GET error:', error.message);
      // Fallback to memory cache
      return this.getFromMemory(key, ttl);
    }
  }

  /**
   * Set cached data
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttlSeconds - Time to live in seconds
   * @param {string} etag - Optional ETag for conditional requests
   */
  async set(key, data, ttlSeconds = 600, etag = null) {
    // Always wrap data in cacheEntry format
    const cacheEntry = {
      data,
      timestamp: Date.now(),
      etag: etag || null,
    };

    if (!this.isConnected || !this.client) {
      // Fallback to memory cache
      this.setInMemory(key, cacheEntry, ttlSeconds);
      if (etag) {
        this.setInMemory(`${key}_etag`, { data: etag }, ttlSeconds);
      }
      return;
    }

    try {
      await this.client.setEx(key, ttlSeconds, JSON.stringify(cacheEntry));
      console.log(`[Redis] ✅ Stored key: ${key} (TTL: ${ttlSeconds}s)`);
      if (etag) {
        await this.client.setEx(`${key}_etag`, ttlSeconds, etag);
        console.log(`[Redis] ✅ Stored ETag: ${key}_etag`);
      }
    } catch (error) {
      console.error(`[Redis] ❌ SET error for key "${key}":`, error.message);
      // Fallback to memory cache
      this.setInMemory(key, cacheEntry, ttlSeconds);
      if (etag) {
        this.setInMemory(`${key}_etag`, { data: etag }, ttlSeconds);
      }
    }
  }

  /**
   * Delete cached data
   * @param {string} key - Cache key to delete
   */
  async delete(key) {
    if (!this.isConnected || !this.client) {
      this.memoryCache.delete(key);
      this.memoryTimestamps.delete(key);
      return;
    }

    try {
      await this.client.del(key);
      await this.client.del(`${key}_etag`);
    } catch (error) {
      console.error('Redis DELETE error:', error.message);
      // Also delete from memory
      this.memoryCache.delete(key);
      this.memoryTimestamps.delete(key);
    }
  }

  /**
   * Delete multiple keys matching a pattern
   * @param {string} pattern - Pattern to match (e.g., 'issues_owner_repo_*')
   */
  async deletePattern(pattern) {
    if (!this.isConnected || !this.client) {
      // Fallback: delete matching keys from memory
      const keysToDelete = [];
      for (const key of this.memoryCache.keys()) {
        if (this.matchPattern(key, pattern)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => {
        this.memoryCache.delete(key);
        this.memoryTimestamps.delete(key);
      });
      return keysToDelete.length;
    }

    try {
      // Use SCAN for production (safer than KEYS)
      const keys = [];
      for await (const key of this.client.scanIterator({
        MATCH: pattern,
        COUNT: 100
      })) {
        keys.push(key);
      }
      
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return keys.length;
    } catch (error) {
      console.error('Redis DELETE pattern error:', error.message);
      return 0;
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    if (!this.isConnected || !this.client) {
      return this.memoryCache.has(key);
    }

    try {
      return await this.client.exists(key) === 1;
    } catch (error) {
      return this.memoryCache.has(key);
    }
  }

  /**
   * Get cache metadata (for cache-check endpoint)
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in milliseconds
   * @returns {Promise<Object|null>} Cache info or null
   */
  async getCacheInfo(key, ttl = 600000) {
    if (!this.isConnected || !this.client) {
      return this.getMemoryCacheInfo(key, ttl);
    }

    try {
      const data = await this.client.get(key);
      if (!data) return null;

      const parsed = JSON.parse(data);
      const age = Date.now() - (parsed.timestamp || 0);
      const valid = age < ttl;

      return {
        timestamp: parsed.timestamp || Date.now(),
        hash: parsed.hash || null,
        valid,
        age,
        etag: parsed.etag || null,
      };
    } catch (error) {
      console.error('Redis GET cache info error:', error.message);
      return this.getMemoryCacheInfo(key, ttl);
    }
  }

  /**
   * Get ETag for a key
   * @param {string} key - Cache key
   * @returns {Promise<string|null>} ETag or null
   */
  async getEtag(key) {
    const etagKey = `${key}_etag`;
    
    if (!this.isConnected || !this.client) {
      const entry = this.memoryCache.get(etagKey);
      return entry?.data || null;
    }

    try {
      const etag = await this.client.get(etagKey);
      return etag || null;
    } catch (error) {
      console.error('Redis GET ETag error:', error.message);
      const entry = this.memoryCache.get(etagKey);
      return entry?.data || null;
    }
  }

  /**
   * Clear all cache (use with caution!)
   */
  async clearAll() {
    if (!this.isConnected || !this.client) {
      this.memoryCache.clear();
      this.memoryTimestamps.clear();
      return;
    }

    try {
      await this.client.flushDb();
      console.log('✅ Redis cache cleared');
    } catch (error) {
      console.error('Redis FLUSH error:', error.message);
    }
  }

  /**
   * Get connection status
   * @returns {boolean}
   */
  getConnectionStatus() {
    return this.isConnected;
  }

  // ========== Private Methods (Memory Fallback) ==========

  getFromMemory(key, ttl) {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    const timestamp = this.memoryTimestamps.get(key);
    if (!timestamp || Date.now() - timestamp > ttl) {
      this.memoryCache.delete(key);
      this.memoryTimestamps.delete(key);
      return null;
    }

    return entry.data || entry;
  }

  setInMemory(key, data, ttlSeconds) {
    this.memoryCache.set(key, data);
    this.memoryTimestamps.set(key, Date.now() + (ttlSeconds * 1000));
  }

  getMemoryCacheInfo(key, ttl) {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    const timestamp = this.memoryTimestamps.get(key);
    if (!timestamp) return null;

    const age = Date.now() - timestamp;
    const valid = age < ttl;

    return {
      timestamp,
      hash: entry.hash || null,
      valid,
      age,
      etag: entry.etag || null,
    };
  }

  matchPattern(key, pattern) {
    // Simple pattern matching: convert Redis pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(key);
  }

  /**
   * Gracefully disconnect from Redis
   */
  async disconnect() {
    // The client is now shared from config/redis.js — do not quit it here.
    // Lifecycle of the shared connection is managed by redis.js itself.
    this.isConnected = false;
    this.client = null;
  }
}

// Singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
