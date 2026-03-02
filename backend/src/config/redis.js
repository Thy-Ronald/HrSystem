/**
 * Redis client using the standard `redis` package with REDIS_URL.
 * Works with Upstash (rediss://) and any standard Redis server.
 * Falls back gracefully to a no-op cache if REDIS_URL is not set.
 */

const { createClient } = require('redis');

let client = null;
let ready = false;
let pingInterval = null;

if (process.env.REDIS_URL) {
  client = createClient({
    url: process.env.REDIS_URL,
    socket: {
      // Always retry with exponential back-off (no hard cap) so a bad cold-start
      // doesn't permanently kill the client.
      reconnectStrategy: (retries) => Math.min(retries * 500, 10000),
      // TCP-level keepalive (prevents OS/firewall idle drops).
      keepAlive: 10000,
      // Give TLS handshake more time — Upstash from cold Cloud Run can be slow.
      connectTimeout: 10000,
    },
  });

  client.on('ready', () => {
    ready = true;
    console.log('[Redis] Connected to Upstash Redis');
    // Application-level heartbeat: send a PING every 25 s so Upstash's
    // ~30 s idle-disconnect timer never fires on a quiet connection.
    if (!pingInterval) {
      pingInterval = setInterval(() => {
        if (ready) client.ping().catch(() => {});
      }, 25000);
    }
  });
  client.on('error', (err) => {
    ready = false;
    console.error('[Redis] Error:', err.message);
  });
  client.on('end', () => {
    ready = false;
    console.warn('[Redis] Connection closed');
    if (pingInterval) { clearInterval(pingInterval); pingInterval = null; }
  });

  // NOTE: We do NOT call client.connect() here.
  // server.js calls the exported connect() explicitly during startServer()
  // so the connection attempt happens AFTER Cloud Run networking is ready.
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

/**
 * Expose the raw client so other services (e.g. CacheService) can reuse the
 * same connection instead of opening a second one to Upstash.
 */
function getClient() {
  return client;
}

function isReady() {
  return ready;
}

/**
 * Explicitly connect to Redis.  Gives Upstash up to 20 s to complete the
 * TLS handshake.  If it doesn't make it in time the server continues
 * without Redis and the built-in reconnectStrategy keeps retrying in
 * the background — the 'ready' event will flip the flag when it connects.
 */
async function connect() {
  if (!client) return;
  try {
    await Promise.race([
      client.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Initial connect timed out after 20 s')), 20000)
      ),
    ]);
  } catch (err) {
    console.warn('[Redis] ' + err.message);
    console.warn('[Redis] Server will continue — Redis will reconnect in the background');
  }
}

module.exports = { cacheGet, cacheSet, cacheDel, getClient, isReady, connect };

