/**
 * Redis client using the standard `redis` package with REDIS_URL.
 * Works with Upstash (rediss://) and any standard Redis server.
 * Falls back gracefully to a no-op cache if REDIS_URL is not set.
 */

const { createClient } = require('redis');

let client = null;
let ready = false;

if (process.env.REDIS_URL) {
  client = createClient({
    url: process.env.REDIS_URL,
    socket: {
      // Exponential back-off capped at 5 s; give up after 7 retries (~30 s total)
      reconnectStrategy: (retries) => {
        if (retries > 7) return new Error('[Redis] Max reconnect attempts reached');
        return Math.min(retries * 500, 5000);
      },
    },
  });

  client.on('ready', () => {
    ready = true;
    console.log('[Redis] Connected to Upstash Redis');
  });
  client.on('error', (err) => {
    ready = false;
    console.error('[Redis] Error:', err.message);
  });
  client.on('end', () => {
    ready = false;
    console.warn('[Redis] Connection closed');
  });

  client.connect().catch((err) => {
    console.error('[Redis] Failed to connect:', err.message);
  });
} else {
  console.warn('[Redis] REDIS_URL not set — caching disabled');
}

/**
 * Get a cached value. Returns null on miss or if Redis is disabled.
 */
async function cacheGet(key) {
  if (!client || !ready) return null;
  try {
    const val = await client.get(key);
    if (!val) return null;
    try {
      return JSON.parse(val);
    } catch {
      console.error('[Redis] Malformed JSON for key:', key);
      return null;
    }
  } catch (err) {
    console.error('[Redis] GET error:', err.message);
    return null;
  }
}

/**
 * Set a cached value with an optional TTL in seconds.
 * @param {string} key
 * @param {any} value
 * @param {number} [ttl]  seconds; omit for no expiry
 */
async function cacheSet(key, value, ttl) {
  if (!client || !ready) return;
  try {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await client.set(key, serialized, { EX: ttl });
    } else {
      await client.set(key, serialized);
    }
  } catch (err) {
    console.error('[Redis] SET error:', err.message);
  }
}

/**
 * Delete one or more cache keys.
 */
async function cacheDel(...keys) {
  if (!client || !ready || !keys.length) return;
  try {
    await client.del(keys);
  } catch (err) {
    console.error('[Redis] DEL error:', err.message);
  }
}

module.exports = { cacheGet, cacheSet, cacheDel };

