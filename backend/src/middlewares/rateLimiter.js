/**
 * Rate Limiting Middleware
 * Prevents abuse of monitoring endpoints
 */

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for session creation
 * Limits: 5 sessions per 15 minutes per IP
 */
const sessionCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    error: 'Too many session creation attempts',
    message: 'Please wait before creating another session. Maximum 5 sessions per 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for authenticated users in development
    return process.env.NODE_ENV === 'development' && req.user;
  },
});

/**
 * Rate limiter for authentication attempts
 * Limits: 10 attempts per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    error: 'Too many authentication attempts',
    message: 'Too many login attempts. Please wait before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for WebRTC signaling
 * Limits: 100 signaling messages per minute per IP
 */
const signalingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    error: 'Too many signaling requests',
    message: 'Please slow down. Maximum 100 signaling messages per minute.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Socket.IO rate limiting (in-memory store)
 * Tracks requests per socket ID
 */
class SocketRateLimiter {
  constructor() {
    this.requests = new Map(); // socketId -> { count, resetTime }
  }

  /**
   * Check if socket has exceeded rate limit
   * @param {string} socketId - Socket ID
   * @param {number} maxRequests - Maximum requests
   * @param {number} windowMs - Time window in milliseconds
   * @returns {boolean} True if allowed
   */
  checkLimit(socketId, maxRequests, windowMs) {
    const now = Date.now();
    const record = this.requests.get(socketId);

    if (!record || now > record.resetTime) {
      // Create new record or reset expired one
      this.requests.set(socketId, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (record.count >= maxRequests) {
      return false; // Rate limit exceeded
    }

    // Increment count
    record.count++;
    return true;
  }

  /**
   * Clean up expired records
   */
  cleanup() {
    const now = Date.now();
    for (const [socketId, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(socketId);
      }
    }
  }
}

const socketRateLimiter = new SocketRateLimiter();

// Cleanup expired records every 5 minutes
setInterval(() => {
  socketRateLimiter.cleanup();
}, 5 * 60 * 1000);

/**
 * General API rate limiter
 * Broad protection for all /api/* routes
 * Limits: 200 requests per 15 minutes per IP
 */
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  message: {
    success: false,
    error: 'Too many requests',
    message: 'You are sending too many requests. Please slow down and try again later.',
  },
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development to avoid friction during local development
    return process.env.NODE_ENV === 'development';
  },
});

module.exports = {
  sessionCreationLimiter,
  authLimiter,
  signalingLimiter,
  socketRateLimiter,
  generalApiLimiter,
};
