const axios = require('axios');

const githubClient = axios.create({
    baseURL: 'https://api.github.com',
    headers: {
        Accept: 'application/vnd.github+json',
    },
});

const githubGraphQLClient = axios.create({
    baseURL: 'https://api.github.com/graphql',
    headers: {
        Accept: 'application/vnd.github+json',
    },
});

const settingsService = require('../settingsService');

// Module-level token cache — avoids a Firestore read on every GitHub API call
let _cachedToken = null;
let _cacheExpiry = 0;
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const withAuth = async () => {
    // Return cached token if still valid
    if (_cachedToken && Date.now() < _cacheExpiry) {
        return { Authorization: `Bearer ${_cachedToken}` };
    }

    // Try to get token from database first
    const dbToken = await settingsService.getSetting('github_token');
    if (dbToken) {
        _cachedToken = dbToken;
        _cacheExpiry = Date.now() + TOKEN_CACHE_TTL_MS;
        return { Authorization: `Bearer ${dbToken}` };
    }

    // Fallback to environment variable
    const token = process.env.GITHUB_TOKEN;
    if (token) {
        _cachedToken = token;
        _cacheExpiry = Date.now() + TOKEN_CACHE_TTL_MS;
        return { Authorization: `Bearer ${token}` };
    }
    return {};
};

// ─── Rate Limit Tracking ────────────────────────────────────
// Reads x-ratelimit-* headers from every GitHub response
// and logs a warning when remaining drops below threshold.

let rateLimitStatus = {
    remaining: null,
    limit: null,
    reset: null,      // Unix timestamp when the rate limit resets
    updatedAt: null,   // When we last read the headers
};

const RATE_LIMIT_WARNING_THRESHOLD = 500;

function trackRateLimit(response) {
    const remaining = response.headers['x-ratelimit-remaining'];
    const limit = response.headers['x-ratelimit-limit'];
    const reset = response.headers['x-ratelimit-reset'];

    if (remaining !== undefined) {
        rateLimitStatus = {
            remaining: parseInt(remaining, 10),
            limit: parseInt(limit, 10),
            reset: parseInt(reset, 10),
            updatedAt: Date.now(),
        };

        if (rateLimitStatus.remaining <= RATE_LIMIT_WARNING_THRESHOLD && rateLimitStatus.remaining % 100 === 0) {
            const resetDate = new Date(rateLimitStatus.reset * 1000);
            console.warn(
                `[RateLimit] ⚠️  Only ${rateLimitStatus.remaining}/${rateLimitStatus.limit} requests remaining. ` +
                `Resets at ${resetDate.toLocaleTimeString()}`
            );
        }
    }

    return response;
}

// Attach interceptors to both clients
githubClient.interceptors.response.use(trackRateLimit, (error) => {
    // Also track rate limit from error responses
    if (error.response) trackRateLimit(error.response);
    return Promise.reject(error);
});

githubGraphQLClient.interceptors.response.use(trackRateLimit, (error) => {
    if (error.response) trackRateLimit(error.response);
    return Promise.reject(error);
});

/**
 * Get current rate limit status
 * @returns {{ remaining: number|null, limit: number|null, reset: number|null, updatedAt: number|null }}
 */
function getRateLimitStatus() {
    return { ...rateLimitStatus };
}

module.exports = {
    githubClient,
    githubGraphQLClient,
    withAuth,
    getRateLimitStatus
};
