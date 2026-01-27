/**
 * Data Transformation Utilities
 * Transform API responses to UI-ready format
 */

import { RANKING_TYPES } from '../constants';

/**
 * Transform GitHub issues or commits data to ranking table format
 * @param {Array} data - Raw API response
 * @param {string} rankingType - Type of ranking: 'issues' or 'commits'
 * @returns {Array} Transformed data for table display
 */
export function transformRankingData(data, rankingType = 'issues') {
  if (!Array.isArray(data)) return [];
  
  if (rankingType === RANKING_TYPES.COMMITS) {
    return data.map((item) => ({
      id: item.username || 'Unknown',
      commits: item.commits || item.total || 0,
    }));
  }
  
  if (rankingType === RANKING_TYPES.LANGUAGES) {
    return data.map((item) => ({
      id: item.username || 'Unknown',
      topLanguages: item.topLanguages || [],
      totalFiles: item.totalFiles || 0,
    }));
  }
  
  // Default: issues format
  return data.map((item) => ({
    id: item.username || 'Unknown',
    assignedCards: item.total || 0, // Total of all card types
    assignedP: 0, // Reserved for future use
    inProgressCards: item.inProgress || 0,
    doneCards: item.done || 0,
    reviewed: item.reviewed || 0,
    devDeployed: item.devDeployed || 0,
    devChecked: item.devChecked || 0,
  }));
}

/**
 * Generate cache key for repo and filter combination
 * @param {string} repo - Repository full name
 * @param {string} filter - Filter name
 * @returns {string} Cache key
 */
export function getCacheKey(repo, filter) {
  return `${repo}_${filter}`;
}

/**
 * Check if cached data is valid based on timestamp
 * @param {number} timestamp - Cache timestamp
 * @param {number} ttl - Time to live in milliseconds
 * @returns {boolean} True if cache is still valid
 */
export function isCacheValid(timestamp, ttl = 10000) {
  return Date.now() - timestamp < ttl;
}
