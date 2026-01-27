/**
 * Example Route: GitHub API with Redis Caching
 * 
 * This demonstrates how to use the new Redis caching system with 6 PM TTL
 * for GitHub API responses.
 * 
 * Features:
 * - Checks Redis cache before calling GitHub API
 * - Uses ETag for conditional requests (304 Not Modified)
 * - Stores responses with 6 PM TTL
 * - Handles cache refresh on 304 responses
 */

const express = require('express');
const {
  generateCacheKey,
  getCachedGitHubResponse,
  setCachedGitHubResponse,
  refreshCacheTTL,
  getCachedETag,
} = require('../utils/githubCache');
const axios = require('axios');

const router = express.Router();

// GitHub API client
const githubClient = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Accept: 'application/vnd.github+json',
  },
});

/**
 * GET /api/github/repos
 * 
 * Example endpoint demonstrating Redis caching with 6 PM TTL
 * 
 * Flow:
 * 1. Check Redis cache
 * 2. If cached and not expired → return cached data
 * 3. If cached but expired → use ETag for conditional request
 * 4. If 304 Not Modified → refresh cache TTL and return cached data
 * 5. If 200 OK → store new data + ETag with 6 PM TTL
 */
router.get('/repos', async (req, res, next) => {
  try {
    const cacheKey = generateCacheKey('repos', 'all');
    
    // Step 1: Check Redis cache first
    const cached = await getCachedGitHubResponse(cacheKey);
    
    if (cached && cached.data) {
      console.log('[Example] ✅ Cache HIT - returning cached data');
      return res.json({
        success: true,
        data: cached.data,
        cached: true,
        expiresAt: cached.expiresAt,
      });
    }
    
    // Step 2: Get cached ETag for conditional request
    const cachedETag = await getCachedETag(cacheKey);
    const headers = {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    };
    
    // Step 3: Add If-None-Match header if we have cached ETag
    if (cachedETag) {
      headers['If-None-Match'] = cachedETag;
      console.log('[Example] 🔄 Conditional request with ETag');
    }
    
    // Step 4: Call GitHub API
    const response = await githubClient.get('/user/repos', { headers });
    
    // Step 5: Handle 304 Not Modified
    if (response.status === 304 && cached) {
      console.log('[Example] ✅ 304 Not Modified - refreshing cache TTL');
      await refreshCacheTTL(cacheKey, cached.data, cachedETag);
      
      return res.json({
        success: true,
        data: cached.data,
        cached: true,
        notModified: true,
        expiresAt: cached.expiresAt,
      });
    }
    
    // Step 6: Extract ETag from response
    const responseETag = response.headers.etag || response.headers['etag'] || null;
    
    // Step 7: Store new data + ETag in Redis with 6 PM TTL
    await setCachedGitHubResponse(cacheKey, response.data, responseETag);
    console.log('[Example] ✅ Stored new data in Redis');
    
    res.json({
      success: true,
      data: response.data,
      cached: false,
      etag: responseETag,
    });
    
  } catch (error) {
    // Handle 304 Not Modified from error handler
    if (error.response && error.response.status === 304) {
      const cached = await getCachedGitHubResponse(cacheKey);
      if (cached) {
        const cachedETag = await getCachedETag(cacheKey);
        await refreshCacheTTL(cacheKey, cached.data, cachedETag);
        
        return res.json({
          success: true,
          data: cached.data,
          cached: true,
          notModified: true,
        });
      }
    }
    
    next(error);
  }
});

module.exports = router;
