# 🏗️ Caching Architecture Documentation

## Overview

This document explains the multi-layer caching architecture of the HrSystem staff ranking feature.

---

## 📊 Cache Layers (Top to Bottom)

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Layer 1: React Component State (Instant)                 │  │
│  │  - In-memory state management                             │  │
│  │  - No TTL (cleared on navigation)                         │  │
│  │  - Used for: Current view data                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Layer 2: localStorage Cache (2 minutes)                  │  │
│  │  - Browser persistent storage                             │  │
│  │  - TTL: 2 minutes                                         │  │
│  │  - Used for: Modal data, repeated views                   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    HTTP Request (if cache miss)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVER                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Layer 3: Redis Cache (5 minutes)                         │  │
│  │  - Upstash Redis (shared across servers)                  │  │
│  │  - TTL: 5 minutes                                         │  │
│  │  - Used for: API response caching                         │  │
│  │  - Fallback: In-memory if Redis unavailable              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Layer 4: MySQL Cache (15 minutes)                        │  │
│  │  - Persistent database storage                            │  │
│  │  - Refresh interval: 15 minutes                           │  │
│  │  - Used for: Issue data, user stats                       │  │
│  │  - Incremental refresh (only changed data)               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Layer 5: In-Memory Cache (10 seconds)                    │  │
│  │  - Node.js Map() object                                   │  │
│  │  - TTL: 10 seconds                                        │  │
│  │  - Used for: GitHub API response caching                  │  │
│  │  - ETag support for conditional requests                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                  GitHub API Call (if all caches miss)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       GITHUB API                                │
│  - GraphQL API for issue data                                  │
│  - Rate limit: 5000 requests/hour                              │
│  - Supports: ETag, conditional requests, incremental fetch     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Examples

### Example 1: First Page Load (Cold Cache)

```
User opens Staff Ranking page
    ↓
React component loads
    ↓
Check localStorage → MISS
    ↓
API call to backend
    ↓
Check Redis → MISS
    ↓
Check MySQL cache → MISS (first time)
    ↓
GitHub API call (GraphQL)
    ↓
Store in MySQL cache
    ↓
Store in Redis (5 min TTL)
    ↓
Return to frontend
    ↓
Store in localStorage (2 min TTL)
    ↓
Render data

Total time: ~1.5 seconds
API calls: 1 GitHub call
```

### Example 2: Second Page Load (Warm Cache)

```
User opens Staff Ranking page again (within 2 minutes)
    ↓
React component loads
    ↓
Check localStorage → HIT! ✅
    ↓
Render data immediately

Total time: ~50ms
API calls: 0
```

### Example 3: Modal Open (First Time)

```
User clicks "All Repos" button
    ↓
Modal component loads
    ↓
Check localStorage → MISS (first time)
    ↓
API call to backend (2 repos)
    ↓
Check Redis → HIT! ✅ (from previous page load)
    ↓
Return cached data
    ↓
Store in localStorage (2 min TTL)
    ↓
Render modal

Total time: ~200ms
API calls: 0 (Redis cache hit)
```

### Example 4: Modal Open (Second Time)

```
User closes and reopens modal (within 2 minutes)
    ↓
Modal component loads
    ↓
Check localStorage → HIT! ✅
    ↓
Render modal immediately

Total time: ~10ms
API calls: 0
```

### Example 5: Background Refresh

```
Background job runs (every 15 minutes)
    ↓
Check MySQL cache metadata
    ↓
Last refresh: 16 minutes ago → needs refresh
    ↓
GitHub API call with "since" parameter (incremental)
    ↓
Fetch only issues updated in last 16 minutes
    ↓
UPSERT into MySQL cache
    ↓
Update metadata timestamp
    ↓
Clear Redis cache (force fresh data on next request)

Total time: ~500ms
API calls: 1 incremental GitHub call (only changed data)
```

---

## 🎯 Cache Invalidation Strategies

### Time-Based Invalidation
```javascript
// localStorage: 2 minutes
if (Date.now() - timestamp > 2 * 60 * 1000) {
  // Cache expired, fetch fresh data
}

// Redis: 5 minutes (automatic TTL)
await redis.setEx(key, 300, data);

// MySQL: 15 minutes (background job)
if (Date.now() - lastRefresh > 15 * 60 * 1000) {
  // Trigger refresh
}
```

### Event-Based Invalidation
```javascript
// User clicks refresh button
function handleRefresh() {
  // Clear all caches
  localStorage.clear();
  clearRedisCache();
  forceRefreshMySQL();
}

// Repo filter changes
function handleFilterChange(newFilter) {
  // Clear only relevant caches
  clearCachePattern(`ranking_${repo}_${oldFilter}`);
}
```

### Smart Invalidation (Conditional Requests)
```javascript
// Check if data changed before fetching
const result = await checkCachedIssuesChanges(repo, lastFetchTime);
if (result.hasChanges) {
  // Data changed, fetch fresh
  fetchFreshData();
} else {
  // No changes, use cache
  useCachedData();
}
```

---

## 📊 Cache Performance Metrics

### Cache Hit Rates (Expected)

| Layer | Hit Rate | Avg Response Time |
|-------|----------|-------------------|
| localStorage | 85% | 10ms |
| Redis | 80% | 50ms |
| MySQL | 95% | 100ms |
| In-Memory | 60% | 5ms |
| GitHub API | N/A | 1500ms |

### API Call Reduction

```
Before Optimization:
- Page load: 1 GitHub API call
- Modal open: 2 GitHub API calls
- Background: 60 API calls/hour
- Total: ~100 API calls/hour

After Optimization:
- Page load: 0 API calls (cache hit)
- Modal open: 0 API calls (cache hit)
- Background: 4 API calls/hour
- Total: ~8 API calls/hour

Reduction: 92% fewer API calls! 🎉
```

---

## 🔧 Configuration Reference

### Frontend Cache TTLs

```javascript
// localStorage (cacheUtils.js)
const DEFAULT_TTL_MS = 2 * 60 * 1000; // 2 minutes

// In-memory (useRankingData.js)
const CACHE_TTL = 10000; // 10 seconds

// Modal cache (useAllReposRanking.js)
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
```

### Backend Cache TTLs

```javascript
// Redis (issueCacheController.js)
const REDIS_CACHE_TTL = 300; // 5 minutes

// MySQL refresh (issueCacheService.js)
const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const FULL_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory (githubService.js)
const CACHE_TTL = 10000; // 10 seconds
const REPO_CACHE_TTL = 300000; // 5 minutes
```

---

## 🎓 Cache Key Patterns

### Frontend Keys
```
Format: prefix_repo_filter_user

Examples:
- ranking_timeriver/cnd_chat_today
- allrepos_timeriver/cnd_chat_today
- allrepos_timeriver/sacsys009_this-week
```

### Backend Redis Keys
```
Format: issues:repo:filter:user

Examples:
- issues:timeriver/cnd_chat:today:all
- issues:timeriver/cnd_chat:today:john
- issues:timeriver/sacsys009:this-week:all
```

### Backend MySQL Keys
```
Format: repo_fullName_filter

Examples:
- issues_timeriver/cnd_chat_today
- issues_timeriver/sacsys009_this-week
```

---

## 🚀 Best Practices

### 1. Cache Warming
```javascript
// Warm cache on app startup
useEffect(() => {
  // Pre-fetch common data
  repositories.forEach(repo => {
    fetchCachedIssues(repo.fullName, 'today');
  });
}, []);
```

### 2. Stale-While-Revalidate
```javascript
// Return stale data immediately, fetch fresh in background
const cachedData = getCached(key);
if (cachedData) {
  // Return stale data immediately
  setData(cachedData);
  
  // Fetch fresh data in background
  fetchFreshData().then(freshData => {
    setData(freshData);
    setCached(key, freshData);
  });
}
```

### 3. Cache Versioning
```javascript
// Include version in cache key
const CACHE_VERSION = 'v1';
const cacheKey = `${CACHE_VERSION}_${prefix}_${repo}_${filter}`;

// When schema changes, bump version:
const CACHE_VERSION = 'v2'; // Old v1 caches ignored
```

### 4. Graceful Degradation
```javascript
// Always have fallback
try {
  const data = await getCached(key);
  if (data) return data;
} catch (error) {
  console.warn('Cache error, fetching fresh:', error);
}
// Fetch fresh data as fallback
return await fetchFreshData();
```

---

## 🐛 Debugging Cache Issues

### Check Cache Contents

```javascript
// Frontend (browser console)
// View all localStorage caches
Object.keys(localStorage)
  .filter(key => key.includes('ranking') || key.includes('allrepos'))
  .forEach(key => {
    const data = JSON.parse(localStorage.getItem(key));
    console.log(key, {
      age: Math.round((Date.now() - data.timestamp) / 1000) + 's',
      size: JSON.stringify(data).length + ' bytes',
      data: data.data
    });
  });

// Backend (Node.js)
// Check Redis cache
const keys = await redis.keys('issues:*');
console.log('Redis keys:', keys);

// Check MySQL cache
const result = await query('SELECT * FROM github_cache_metadata');
console.log('MySQL cache metadata:', result);
```

### Clear All Caches

```javascript
// Frontend
localStorage.clear();

// Backend
await redis.flushDb(); // Redis
await query('TRUNCATE github_issues_cache'); // MySQL
```

---

## 📈 Monitoring & Alerts

### Metrics to Track

1. **Cache Hit Rate**: Should be > 70%
2. **API Call Rate**: Should be < 10/hour
3. **Response Time**: Should be < 500ms
4. **Error Rate**: Should be < 1%

### Alert Thresholds

```javascript
// Set up alerts for:
if (cacheHitRate < 0.5) {
  alert('Low cache hit rate - check TTL configuration');
}

if (apiCallsPerHour > 50) {
  alert('High API usage - check cache invalidation');
}

if (avgResponseTime > 1000) {
  alert('Slow responses - check database indexes');
}
```

---

## 🎯 Future Optimizations

### 1. Service Worker Cache
- Add offline support
- Cache static assets
- Background sync

### 2. GraphQL Query Optimization
- Request only needed fields
- Use fragments for reusability
- Batch multiple queries

### 3. Database Sharding
- Split data by repository
- Parallel query execution
- Better scalability

### 4. CDN Integration
- Cache API responses at edge
- Reduce latency globally
- Better for distributed teams

---

**Last Updated**: January 26, 2026  
**Maintained by**: Backend Team  
**Review Frequency**: Quarterly
