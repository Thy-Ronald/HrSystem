# Two-Layer Caching System Documentation

## Overview

This system implements a two-layer caching strategy for GitHub API responses:

1. **Backend (Redis)**: Primary cache with 6 PM daily reset
2. **Frontend (localStorage)**: UX cache with 2 minutes OR 6 PM (whichever comes first)

## Architecture

### Backend Layer (Redis)

**Location**: `backend/src/utils/githubCache.js`

**Features**:
- Uses Redis (Upstash-compatible) as primary cache
- Stores: `data`, `etag`, `expiresAt`
- TTL expires exactly at 6:00 PM local server time
- If current time is past 6 PM, TTL is set to tomorrow at 6 PM
- Handles conditional requests (304 Not Modified)
- Falls back to in-memory cache if Redis unavailable

**Key Functions**:
- `getCachedGitHubResponse(cacheKey)` - Get cached data
- `setCachedGitHubResponse(cacheKey, data, etag)` - Store data with 6 PM TTL
- `refreshCacheTTL(cacheKey, data, etag)` - Refresh TTL on 304 responses
- `getCachedETag(cacheKey)` - Get cached ETag for conditional requests

**TTL Helper**: `backend/src/utils/ttlHelpers.js`
- `getTTLUntil6PM()` - Calculate seconds until next 6 PM
- `getExpiresAt6PM()` - Get Date object for next 6 PM
- `isPast6PM()` - Check if current time is past 6 PM

### Frontend Layer (localStorage)

**Location**: `frontend/src/features/ranking/utils/cacheUtils.js`

**Features**:
- Uses browser localStorage
- Stores: `data`, `expiresAt`, `etag`
- TTL: 2 minutes OR until 6 PM (whichever comes first)
- Checks localStorage on app load
- Automatically expires at 6 PM for daily reset

**Key Functions**:
- `getCached(key)` - Get cached data (checks expiresAt)
- `setCached(key, data, timestamp, etag)` - Store with 2min OR 6PM TTL
- `fetchWithCache(cacheKey, fetchFn)` - Wrapper with automatic TTL logic

**TTL Helper**: `frontend/src/utils/ttlHelpers.js`
- `getTTLUntil6PM()` - Calculate milliseconds until next 6 PM
- `getTTL2MinOr6PM()` - Calculate TTL (2min or 6PM, whichever is smaller)
- `getExpiresAt2MinOr6PM()` - Get expiration Date (2min or 6PM)

## Usage Examples

### Backend: GitHub Service

```javascript
const {
  generateCacheKey,
  getCachedGitHubResponse,
  setCachedGitHubResponse,
  refreshCacheTTL,
  getCachedETag,
} = require('../utils/githubCache');

async function getCommitsByUserForPeriod(repoFullName, filter) {
  // Step 1: Generate cache key
  const cacheKey = generateCacheKey('commits', repoFullName, filter);
  
  // Step 2: Check Redis cache
  const cached = await getCachedGitHubResponse(cacheKey);
  if (cached && cached.data) {
    return cached.data; // Cache hit!
  }
  
  // Step 3: Get cached ETag for conditional request
  const cachedETag = await getCachedETag(cacheKey);
  const headers = withAuth();
  if (cachedETag) {
    headers['If-None-Match'] = cachedETag;
  }
  
  // Step 4: Call GitHub API
  const response = await githubClient.get('/repos/...', { headers });
  
  // Step 5: Handle 304 Not Modified
  if (response.status === 304 && cached) {
    await refreshCacheTTL(cacheKey, cached.data, cachedETag);
    return cached.data;
  }
  
  // Step 6: Store new data with 6 PM TTL
  const responseETag = response.headers.etag;
  await setCachedGitHubResponse(cacheKey, response.data, responseETag);
  
  return response.data;
}
```

### Frontend: React Hook

```javascript
import { fetchWithCache, generateCacheKey } from '../utils/cacheUtils';

// Automatic TTL handling (2min OR 6PM)
const data = await fetchWithCache(
  generateCacheKey('commits', repo.fullName, filter),
  async (etag) => {
    // Fetch function - receives ETag if available
    return await fetchCommitsByPeriod(repo.fullName, filter, { etag });
  }
);
```

## Cache Flow

### Backend Flow

1. **Request arrives** → Check Redis cache
2. **Cache hit** → Return cached data
3. **Cache miss/expired** → Get cached ETag
4. **Call GitHub API** → Include `If-None-Match` header
5. **304 Not Modified** → Refresh cache TTL, return cached data
6. **200 OK** → Store new data + ETag with 6 PM TTL

### Frontend Flow

1. **App loads** → Check localStorage
2. **Cache valid** → Use cached data immediately
3. **Cache expired** → Call backend API
4. **Backend response** → Save to localStorage with 2min OR 6PM TTL

## TTL Calculation

### Backend (6 PM TTL)

```javascript
// If current time is 2:00 PM → expires at 6:00 PM today (4 hours)
// If current time is 7:00 PM → expires at 6:00 PM tomorrow (23 hours)
const ttlSeconds = getTTLUntil6PM();
```

### Frontend (2min OR 6PM)

```javascript
// If current time is 2:00 PM → expires in 2 minutes (2min < 4 hours)
// If current time is 5:59 PM → expires at 6:00 PM (1 minute < 2 minutes)
// If current time is 6:01 PM → expires in 2 minutes (2min < 23 hours)
const ttlMs = getTTL2MinOr6PM(); // Returns minimum of 2min or until 6PM
```

## Configuration

### Environment Variables

```bash
# Backend
REDIS_URL=redis://localhost:6379  # Or Upstash Redis URL
GITHUB_TOKEN=your_github_token
```

### Cache Keys

**Backend Format**: `github:{type}:{repo}:{filter}`
- Example: `github:commits:timeriver_cnd_chat:today`

**Frontend Format**: `{prefix}_{repo}_{filter}`
- Example: `commits_timeriver_cnd_chat_today`

## Benefits

1. **Reduced API Calls**: ETag support prevents unnecessary requests
2. **Daily Reset**: Automatic cache expiration at 6 PM
3. **Fast UX**: Frontend cache provides instant data on app load
4. **Scalable**: Redis supports multiple server instances
5. **Resilient**: Falls back to in-memory cache if Redis unavailable

## Files Modified/Created

### Backend
- ✅ `backend/src/utils/ttlHelpers.js` - TTL calculation helpers
- ✅ `backend/src/utils/githubCache.js` - Redis cache helpers
- ✅ `backend/src/services/githubService.js` - Updated to use Redis caching
- ✅ `backend/src/routes/github.example.js` - Example route

### Frontend
- ✅ `frontend/src/utils/ttlHelpers.js` - Frontend TTL helpers
- ✅ `frontend/src/features/ranking/utils/cacheUtils.js` - Updated with 2min OR 6PM logic
- ✅ `frontend/src/features/ranking/hooks/useAllReposRanking.js` - Updated to use new cache

## Testing

To test the caching system:

1. **Backend**: Check Redis logs for cache hits/misses
2. **Frontend**: Check browser console for cache logs
3. **ETag**: Verify 304 responses don't count against rate limit
4. **TTL**: Verify cache expires at 6 PM daily

## Notes

- Cache expiration is based on **local server time** (backend) and **browser time** (frontend)
- ETag support reduces GitHub API rate limit usage
- Cache failures don't break the application (graceful degradation)
- Existing cache entries are automatically migrated to new format
