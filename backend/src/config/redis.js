/**
 * Redis cache layer — uses the Upstash REST SDK (@upstash/redis).
 *
 * Previous versions used the TCP `redis` package with TLS, which failed
 * due to port-6379 connectivity issues from Cloud Run (ECONNRESET /
 * Connection timeout).  The REST API (HTTPS port 443) works reliably.
 *
 * Environment variables (both required):
 *   UPSTASH_REDIS_REST_URL   – e.g. https://fun-sheepdog-28590.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN – the bearer token from the Upstash console
 *
 * Falls back to a no-op cache if either variable is missing.
 */

const { Redis } = require('@upstash/redis');

let client = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  client = new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  console.log('[Redis] Upstash REST client initialised');
} else {
  console.warn('[Redis] UPSTASH_REDIS_REST_URL / TOKEN not set — caching disabled');
}

// ──────────────────────────────────────────────────────────────────────────────
// Convenience helpers used by controllers (e.g. employeeTrackingController)
// ──────────────────────────────────────────────────────────────────────────────

async function cacheGet(key) {
  if (!client) return null;
  try {
    const val = await client.get(key);
    if (val === null || val === undefined) return null;
    // @upstash/redis auto-deserialises JSON, so val may already be an object.
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch { return val; }
  } catch (err) {
    console.error('[Redis] GET error:', err.message);
    return null;
  }
}

async function cacheSet(key, value, ttl) {
  if (!client) return;
  try {
    if (ttl) {
      await client.set(key, JSON.stringify(value), { ex: ttl });
    } else {
      await client.set(key, JSON.stringify(value));
    }
  } catch (err) {
    console.error('[Redis] SET error:', err.message);
  }
}

async function cacheDel(...keys) {
  if (!client || !keys.length) return;
  try {
    await client.del(...keys);
  } catch (err) {
    console.error('[Redis] DEL error:', err.message);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Shared-client API consumed by cacheService.js
//
// getClient() returns a thin wrapper that exposes the subset of the node-redis
// API that cacheService uses (get / set / setEx / del / exists / scan /
// flushDb) backed by the Upstash REST client.  This keeps cacheService
// largely unchanged.
// ──────────────────────────────────────────────────────────────────────────────

function getClient() {
  if (!client) return null;

  // Return a compatibility shim so existing callers don't break.
  return {
    /** get(key) → string | null */
    async get(key) {
      const val = await client.get(key);
      if (val === null || val === undefined) return null;
      // node-redis always returns a string; callers JSON.parse() it themselves.
      return typeof val === 'string' ? val : JSON.stringify(val);
    },

    /** set(key, value, { EX: seconds }) */
    async set(key, value, opts) {
      const ttl = opts?.EX || opts?.ex;
      if (ttl) {
        await client.set(key, value, { ex: ttl });
      } else {
        await client.set(key, value);
      }
    },

    /** setEx(key, seconds, value) — convenience used by cacheService */
    async setEx(key, seconds, value) {
      await client.set(key, value, { ex: seconds });
    },

    /** del(key) or del([key1, key2, ...]) */
    async del(keyOrKeys) {
      const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
      if (keys.length === 0) return;
      await client.del(...keys);
    },

    /** exists(key) → 0 | 1 */
    async exists(key) {
      return await client.exists(key);
    },

    /**
     * scanIterator — Upstash REST supports SCAN.
     * Yields keys matching the MATCH pattern in batches.
     */
    async *scanIterator({ MATCH, COUNT = 100 } = {}) {
      let cursor = 0;
      do {
        const [nextCursor, keys] = await client.scan(cursor, { match: MATCH, count: COUNT });
        cursor = Number(nextCursor);
        for (const key of keys) yield key;
      } while (cursor !== 0);
    },

    /** flushDb — caution! */
    async flushDb() {
      await client.flushdb();
    },
  };
}

/** REST client is stateless — always "ready" when configured. */
function isReady() {
  return client !== null;
}

/**
 * connect() — kept for backward compatibility with server.js.
 * REST needs no persistent connection; we just verify reachability.
 */
async function connect() {
  if (!client) return;
  try {
    const pong = await client.ping();
    console.log('[Redis] Upstash REST reachable — PING:', pong);
  } catch (err) {
    console.warn('[Redis] Upstash REST ping failed:', err.message);
    console.warn('[Redis] Caching may be unavailable — will retry on each request');
  }
}

module.exports = { cacheGet, cacheSet, cacheDel, getClient, isReady, connect };

