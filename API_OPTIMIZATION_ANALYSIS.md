# API Optimization Analysis: Reducing GitHub API Calls Without WebSockets

**Senior Engineering Analysis - January 2026**

---

## Current Implementation Analysis

### What We're Doing Right ✅

1. **ETag-based Polling (HTTP 304)**
   - Using GitHub's `If-None-Match` header
   - 304 responses are FREE (don't count against rate limit)
   - Currently polling every 3 seconds
   - **Cost: ~0 API calls when no changes**

2. **Multi-layer Caching**
   - Backend in-memory cache (10s TTL)
   - Frontend localStorage cache (persistent)
   - Frontend in-memory cache (session)
   - **Benefit: Prevents redundant requests**

3. **Page Visibility Detection**
   - Only polls when tab is active
   - **Savings: ~60-80% reduction when tab inactive**

4. **Request Deduplication**
   - AbortController cancels pending requests
   - **Benefit: Prevents duplicate requests during rapid interactions**

---

## Current API Call Patterns

### Scenario 1: User Browsing (No Changes)
```
Time    | Action                  | GitHub API Calls | Cost
--------|-------------------------|------------------|------
0s      | Page load              | 2 (repos + issues)| ✓
3s      | ETag check             | 0 (304 response) | FREE
6s      | ETag check             | 0 (304 response) | FREE
9s      | ETag check             | 0 (304 response) | FREE
...     | Continue...            | 0 (all 304s)     | FREE

Total per minute: ~0-1 counted API calls (20 ETags = FREE)
```

### Scenario 2: Active Repository (Frequent Changes)
```
Time    | Action                  | GitHub API Calls | Cost
--------|-------------------------|------------------|------
0s      | Page load              | 2                | ✓✓
3s      | ETag check (304)       | 0                | FREE
6s      | ETag check (changed)   | 1                | ✓
6s      | Fetch issues           | 1                | ✓
9s      | ETag check (304)       | 0                | FREE

Total per minute: ~2-4 counted calls (worst case)
```

---

## Optimization Strategies (Priority Order)

### 🟢 **IMMEDIATE - Easy Wins (0-1 day)**

#### 1. **Adaptive Polling Interval**
**Current:** Fixed 3-second polling
**Proposed:** Dynamic intervals based on activity

```javascript
// Adaptive polling logic
let pollInterval = 3000; // Start at 3s
let consecutiveNoChanges = 0;

function adjustPollInterval(hasChanges) {
  if (hasChanges) {
    // Reset to fast polling when changes detected
    pollInterval = 3000;
    consecutiveNoChanges = 0;
  } else {
    consecutiveNoChanges++;
    
    // Gradually slow down if no changes
    if (consecutiveNoChanges > 5) pollInterval = 10000;  // 10s after 15s
    if (consecutiveNoChanges > 20) pollInterval = 30000; // 30s after 1min
    if (consecutiveNoChanges > 60) pollInterval = 60000; // 60s after 3min
  }
  
  return pollInterval;
}
```

**Savings:** 50-70% reduction in ETag checks (which are free but still use bandwidth)

---

#### 2. **Smart Time-based Polling**
**Current:** Poll continuously during work hours
**Proposed:** Adjust based on typical update patterns

```javascript
function getSmartPollInterval() {
  const hour = new Date().getHours();
  
  // Business hours (9am-6pm): frequent polling
  if (hour >= 9 && hour < 18) return 3000;
  
  // Early morning/evening: moderate
  if (hour >= 7 && hour < 9 || hour >= 18 && hour < 22) return 15000;
  
  // Night time: slow
  return 60000;
}
```

**Savings:** 40-60% reduction during off-hours

---

#### 3. **Prefetch Adjacent Filters**
**Current:** Fetch data only when filter clicked
**Proposed:** Prefetch likely next filters in background

```javascript
// When user selects "today", prefetch "yesterday" in background
async function prefetchAdjacentFilters(currentFilter, repo) {
  const adjacentFilters = {
    'today': ['yesterday', 'this-week'],
    'yesterday': ['today', 'this-week'],
    'this-week': ['today', 'last-week'],
    'last-week': ['this-week', 'this-month'],
    'this-month': ['this-week'],
  };
  
  const toPrefetch = adjacentFilters[currentFilter] || [];
  
  // Prefetch with low priority (after 2s delay)
  setTimeout(() => {
    toPrefetch.forEach(filter => {
      if (!cacheRef.current.has(`${repo}_${filter}`)) {
        loadData(repo, filter); // Silent background load
      }
    });
  }, 2000);
}
```

**Benefit:** Near-instant filter switching, better UX

---

### 🟡 **SHORT-TERM - Medium Effort (2-3 days)**

#### 4. **Differential Updates (GraphQL)**
**Current:** Fetch all issues on every update
**Proposed:** Fetch only issues updated since last check

```javascript
async function getIssuesByUserForPeriod(repoFullName, filter, since = null) {
  // If we have a 'since' timestamp, only fetch issues updated after it
  const lastUpdated = since || getDateRange(filter).startDate;
  
  const query = `
    query($owner: String!, $repo: String!, $since: DateTime!) {
      repository(owner: $owner, name: $repo) {
        issues(
          first: 100,
          filterBy: { since: $since }  # Only updated issues
          states: [OPEN, CLOSED]
        ) {
          nodes { ... }
        }
      }
    }
  `;
  
  // Merge with cached data instead of replacing
  const newIssues = await fetchFromGitHub(query);
  const cachedData = getCached(cacheKey);
  
  return mergeDifferentialData(cachedData, newIssues);
}
```

**Savings:** 60-80% reduction in data transfer size
**GitHub Cost:** Same API call count, but faster responses

---

#### 5. **Batch Multiple Repositories**
**Current:** Poll each repo separately
**Proposed:** Check multiple repos in single request

```javascript
// Use GitHub GraphQL to check multiple repos at once
async function checkMultipleReposChanges(repoList) {
  const query = `
    query($repos: [ID!]!) {
      nodes(ids: $repos) {
        ... on Repository {
          id
          updatedAt
          issues(first: 1, orderBy: {field: UPDATED_AT, direction: DESC}) {
            nodes { updatedAt }
          }
        }
      }
    }
  `;
  
  // One API call checks 5-10 repos
  return await githubGraphQL(query, { repos: repoList });
}
```

**Savings:** 5-10x reduction when monitoring multiple repos

---

#### 6. **Stale-While-Revalidate Pattern**
**Current:** Show loading state while fetching
**Proposed:** Show cached data immediately, update in background

```javascript
async function loadData(repo, filter, forceRefresh = false) {
  const cacheKey = `${repo}_${filter}`;
  const cached = cacheRef.current.get(cacheKey);
  
  // 1. Show cached data immediately (if available)
  if (cached && !forceRefresh) {
    setRankingData(cached);
    setLoading(false); // No loading spinner
  }
  
  // 2. Fetch fresh data in background
  const isCacheStale = !cached || Date.now() - cached.timestamp > 10000;
  if (isCacheStale || forceRefresh) {
    const freshData = await fetchIssuesByPeriod(repo, filter);
    
    // 3. Update if different
    if (JSON.stringify(freshData) !== JSON.stringify(cached)) {
      setRankingData(freshData);
      cacheRef.current.set(cacheKey, freshData);
    }
  }
}
```

**Benefit:** Instant UI updates, better perceived performance

---

### 🔴 **LONG-TERM - Significant Effort (1-2 weeks)**

#### 7. **Implement GitHub App with Webhooks (Instead of Polling)**
**Current:** Poll every 3 seconds
**Proposed:** GitHub pushes updates to us

```javascript
// This would eliminate polling entirely
// But requires infrastructure:
// - GitHub App registration
// - Webhook endpoint (already have infrastructure)
// - Webhook signature verification (already implemented)
// - WebSocket/SSE to push to connected clients

// When issue updated:
// GitHub → Your Backend → Connected Clients
// API calls: 0 (GitHub pushes to you)
```

**Savings:** 95%+ reduction in API calls
**Trade-off:** Requires persistent connection mechanism

---

#### 8. **Edge Caching with Service Workers**
**Current:** Cache in memory only
**Proposed:** Cache at browser level with Service Worker

```javascript
// Service Worker intercepts API calls
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/github/issues')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // Return cached response immediately
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Update cache in background
          caches.open('github-data').then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
          return networkResponse;
        });
        
        return cachedResponse || fetchPromise;
      })
    );
  }
});
```

**Benefit:** Works offline, extremely fast, survives page refresh

---

#### 9. **Database-backed Cache (Redis/SQLite)**
**Current:** In-memory cache (lost on restart)
**Proposed:** Persistent backend cache

```javascript
// Backend with Redis
const redis = require('redis');
const client = redis.createClient();

async function getCached(key) {
  const cached = await client.get(key);
  return cached ? JSON.parse(cached) : null;
}

async function setCache(key, data, ttl = 600) {
  await client.setex(key, ttl, JSON.stringify(data));
}

// Survives server restarts
// Can share cache across multiple backend instances
// Reduces GitHub API calls even after deployment
```

**Savings:** Eliminates cold-start API calls

---

#### 10. **Predictive Prefetching with ML**
**Current:** Static prefetch logic
**Proposed:** Learn user patterns and prefetch accordingly

```javascript
// Track user behavior
const userPatterns = {
  'today': { next: { 'yesterday': 0.6, 'this-week': 0.3 }, avgTime: 45 },
  'yesterday': { next: { 'today': 0.4, 'this-week': 0.4 }, avgTime: 30 },
};

function predictNextAction(currentFilter) {
  const pattern = userPatterns[currentFilter];
  
  // Prefetch highest probability filter
  const mostLikely = Object.entries(pattern.next)
    .sort(([,a], [,b]) => b - a)[0];
  
  return mostLikely[0];
}
```

**Benefit:** Smarter prefetching, better cache hit rate

---

## Recommended Implementation Plan

### Phase 1: Quick Wins (This Week)
1. ✅ Implement adaptive polling intervals
2. ✅ Add time-based polling adjustment  
3. ✅ Implement prefetch for adjacent filters
4. ✅ Add stale-while-revalidate pattern

**Expected Savings:** 60-70% reduction in API calls

---

### Phase 2: Medium-term (Next Sprint)
1. ⏸️ Implement differential GraphQL updates
2. ⏸️ Add batch repo checking for multi-repo scenarios
3. ⏸️ Optimize cache invalidation strategies

**Expected Savings:** Additional 20-30% reduction

---

### Phase 3: Long-term (Next Quarter)
1. ⏸️ Evaluate GitHub App + Webhook architecture
2. ⏸️ Implement Service Worker caching
3. ⏸️ Add Redis/persistent cache layer

**Expected Savings:** Near-zero polling, 90%+ total reduction

---

## Cost-Benefit Analysis

### Current System (After Recent Optimizations)
- **Active User (1 hour):** ~10-15 counted API calls
- **Idle User (1 hour):** ~0-2 counted API calls (all 304s)
- **Daily per user:** ~50-100 API calls
- **GitHub Rate Limit:** 5,000 calls/hour ✅

### After Phase 1 (Adaptive + Smart Polling)
- **Active User (1 hour):** ~5-8 counted API calls
- **Idle User (1 hour):** ~0-1 counted API calls
- **Daily per user:** ~20-40 API calls
- **50% reduction** ✅

### After Phase 2 (Differential Updates)
- **Active User (1 hour):** ~3-5 counted API calls
- **Idle User (1 hour):** ~0 counted API calls
- **Daily per user:** ~10-25 API calls
- **70-80% reduction** ✅

### After Phase 3 (Webhooks + Edge Cache)
- **Active User (1 hour):** ~1-2 counted API calls
- **Idle User (1 hour):** ~0 counted API calls
- **Daily per user:** ~2-10 API calls
- **90-95% reduction** ✅

---

## Monitoring & Metrics

### Track These KPIs
```javascript
// Add to backend analytics
const metrics = {
  totalAPICalls: 0,
  cacheHits: 0,
  cacheMisses: 0,
  etagHits304: 0,  // Free calls
  etagMiss200: 0,  // Paid calls
  avgResponseTime: 0,
};

// Log every API call
function trackAPICall(type, cached, responseTime) {
  metrics.totalAPICalls++;
  if (cached) metrics.cacheHits++;
  else metrics.cacheMisses++;
  
  // Calculate cache hit rate
  const hitRate = (metrics.cacheHits / metrics.totalAPICalls * 100).toFixed(1);
  console.log(`Cache hit rate: ${hitRate}%`);
}
```

### Success Metrics
- Cache hit rate: >70%
- ETag 304 rate: >80% (of polling checks)
- API calls per user per day: <50
- Rate limit consumption: <20% of daily quota

---

## Conclusion

**Current state:** Already well-optimized with ETag polling (304s are FREE)

**Quick wins available:** Adaptive intervals + smart timing = 50% reduction

**No websockets needed:** Current approach is efficient and scalable

**Best next step:** Implement Phase 1 optimizations this week

**GitHub Rate Limit:** Not currently a concern, but optimizations provide headroom for growth

---

## Code Implementation Priority

1. **START HERE:** Adaptive polling (1-2 hours)
2. **NEXT:** Time-based polling (30 minutes)
3. **THEN:** Prefetch adjacent filters (1 hour)
4. **LATER:** Stale-while-revalidate (2 hours)

Total implementation time: ~5-6 hours for 60%+ improvement

---

*Document created: January 23, 2026*
*Author: Senior Software Engineer*
*Status: Ready for implementation*
