/**
 * TTL Helpers
 * Utility functions for calculating time-to-live values
 * 
 * Used for cache expiration logic, particularly for 6 PM daily reset
 */

/**
 * Calculate TTL in seconds until 6:00 PM local server time
 * 
 * Rules:
 * - If current time is before 6 PM today → expires at 6 PM today
 * - If current time is at or after 6 PM today → expires at 6 PM tomorrow
 * 
 * @returns {number} TTL in seconds until next 6 PM
 */
function getTTLUntil6PM() {
  const now = new Date();
  
  // Create a date object for today at 6:00 PM
  const today6PM = new Date(now);
  today6PM.setHours(18, 0, 0, 0); // 6:00 PM
  
  // If current time is before 6 PM today, expire at 6 PM today
  if (now < today6PM) {
    const ttlMs = today6PM.getTime() - now.getTime();
    const ttlSeconds = Math.ceil(ttlMs / 1000);
    console.log(`[TTL] Expires today at 6 PM (${ttlSeconds}s / ${Math.round(ttlSeconds / 60)}min)`);
    return ttlSeconds;
  }
  
  // Current time is at or after 6 PM today, expire at 6 PM tomorrow
  const tomorrow6PM = new Date(today6PM);
  tomorrow6PM.setDate(tomorrow6PM.getDate() + 1);
  
  const ttlMs = tomorrow6PM.getTime() - now.getTime();
  const ttlSeconds = Math.ceil(ttlMs / 1000);
  console.log(`[TTL] Expires tomorrow at 6 PM (${ttlSeconds}s / ${Math.round(ttlSeconds / 60)}min)`);
  return ttlSeconds;
}

/**
 * Get expiration timestamp (Date object) for next 6 PM
 * 
 * @returns {Date} Date object representing next 6 PM
 */
function getExpiresAt6PM() {
  const now = new Date();
  const today6PM = new Date(now);
  today6PM.setHours(18, 0, 0, 0);
  
  if (now < today6PM) {
    return today6PM;
  }
  
  const tomorrow6PM = new Date(today6PM);
  tomorrow6PM.setDate(tomorrow6PM.getDate() + 1);
  return tomorrow6PM;
}

/**
 * Check if current time is past 6 PM
 * 
 * @returns {boolean} True if current time is at or after 6 PM
 */
function isPast6PM() {
  const now = new Date();
  const today6PM = new Date(now);
  today6PM.setHours(18, 0, 0, 0);
  return now >= today6PM;
}

module.exports = {
  getTTLUntil6PM,
  getExpiresAt6PM,
  isPast6PM,
};
