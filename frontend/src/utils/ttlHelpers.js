/**
 * TTL Helpers (Frontend)
 * Utility functions for calculating time-to-live values
 * 
 * Used for localStorage cache expiration logic
 */

/**
 * Calculate TTL in milliseconds until 6:00 PM local time
 * 
 * Rules:
 * - If current time is before 6 PM today → expires at 6 PM today
 * - If current time is at or after 6 PM today → expires at 6 PM tomorrow
 * 
 * @returns {number} TTL in milliseconds until next 6 PM
 */
export function getTTLUntil6PM() {
  const now = new Date();
  
  // Create a date object for today at 6:00 PM
  const today6PM = new Date(now);
  today6PM.setHours(18, 0, 0, 0); // 6:00 PM
  
  // If current time is before 6 PM today, expire at 6 PM today
  if (now < today6PM) {
    const ttlMs = today6PM.getTime() - now.getTime();
    console.log(`[TTL] Expires today at 6 PM (${Math.round(ttlMs / 1000 / 60)}min)`);
    return ttlMs;
  }
  
  // Current time is at or after 6 PM today, expire at 6 PM tomorrow
  const tomorrow6PM = new Date(today6PM);
  tomorrow6PM.setDate(tomorrow6PM.getDate() + 1);
  
  const ttlMs = tomorrow6PM.getTime() - now.getTime();
  console.log(`[TTL] Expires tomorrow at 6 PM (${Math.round(ttlMs / 1000 / 60)}min)`);
  return ttlMs;
}

/**
 * Get expiration timestamp (Date object) for next 6 PM
 * 
 * @returns {Date} Date object representing next 6 PM
 */
export function getExpiresAt6PM() {
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
 * Calculate TTL: 2 minutes OR until 6 PM (whichever comes first)
 * 
 * This is used for frontend localStorage caching to ensure:
 * - Short-term cache (2 minutes) for quick updates
 * - Daily reset at 6 PM
 * 
 * @returns {number} TTL in milliseconds (minimum of 2min or until 6PM)
 */
export function getTTL2MinOr6PM() {
  const twoMinutesMs = 2 * 60 * 1000; // 2 minutes
  const until6PMMs = getTTLUntil6PM();
  
  // Return whichever is smaller
  const ttlMs = Math.min(twoMinutesMs, until6PMMs);
  console.log(`[TTL] Using ${Math.round(ttlMs / 1000 / 60)}min (2min or 6PM, whichever comes first)`);
  return ttlMs;
}

/**
 * Get expiration timestamp: 2 minutes from now OR 6 PM (whichever comes first)
 * 
 * @returns {Date} Date object representing expiration time
 */
export function getExpiresAt2MinOr6PM() {
  const twoMinutesFromNow = new Date(Date.now() + 2 * 60 * 1000);
  const sixPM = getExpiresAt6PM();
  
  // Return whichever comes first
  return twoMinutesFromNow < sixPM ? twoMinutesFromNow : sixPM;
}

/**
 * Check if current time is past 6 PM
 * 
 * @returns {boolean} True if current time is at or after 6 PM
 */
export function isPast6PM() {
  const now = new Date();
  const today6PM = new Date(now);
  today6PM.setHours(18, 0, 0, 0);
  return now >= today6PM;
}
