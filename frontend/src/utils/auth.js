/**
 * Authentication Utilities
 * Handles JWT token storage and retrieval
 */

import Cookies from 'js-cookie';

const TOKEN_KEY = 'monitoring_token';
const TOKEN_EXPIRY_DAYS = 1; // 1 day

/**
 * Store JWT token in cookies
 * @param {string} token - JWT token
 */
export function setToken(token) {
  Cookies.set(TOKEN_KEY, token, { expires: TOKEN_EXPIRY_DAYS, secure: true, sameSite: 'strict' });
}

/**
 * Get JWT token from cookies
 * @returns {string|null} JWT token or null
 */
export function getToken() {
  return Cookies.get(TOKEN_KEY) || null;
}

/**
 * Remove JWT token from cookies
 */
export function removeToken() {
  Cookies.remove(TOKEN_KEY);
}

/**
 * Check if user has a valid token
 * @returns {boolean} True if token exists
 */
export function hasToken() {
  return getToken() !== null;
}
