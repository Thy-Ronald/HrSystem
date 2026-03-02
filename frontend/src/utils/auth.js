/**
 * Authentication Utilities
 * Provides Firebase ID token retrieval with cookie fallback.
 *
 * AuthContext calls setToken() on every Firebase token refresh so the
 * cookie stays current. getToken() prefers Firebase's in-memory token
 * (always fresh) and falls back to the cookie when the user object
 * isn't initialised yet (e.g. the useSocket singleton creates the
 * connection before onIdTokenChanged has fired).
 */

import Cookies from 'js-cookie';
import { auth } from '../config/firebase';

const TOKEN_KEY = 'monitoring_token';

/**
 * Async: get a guaranteed-fresh Firebase ID token.
 * Falls back to the last cookie value if auth.currentUser isn't ready yet.
 * @returns {Promise<string|null>}
 */
export async function getToken() {
  try {
    const user = auth.currentUser;
    if (user) return await user.getIdToken();
  } catch (e) {
    console.error('[auth] getIdToken failed:', e.message);
  }
  // Fallback: cookie kept fresh by AuthContext's onIdTokenChanged
  return Cookies.get(TOKEN_KEY) || null;
}

/**
 * Sync: read the last-known token from the cookie.
 * Used by the useSocket singleton which is created synchronously.
 * @returns {string|null}
 */
export function getTokenSync() {
  return Cookies.get(TOKEN_KEY) || null;
}

/**
 * Called by AuthContext on every Firebase token refresh.
 * Keeps the cookie current so getTokenSync() / useSocket stay valid.
 * @param {string|null} token
 */
export function setToken(token) {
  if (token) {
    Cookies.set(TOKEN_KEY, token, { expires: 1, secure: true, sameSite: 'strict' });
  } else {
    Cookies.remove(TOKEN_KEY);
  }
}

/** Remove the cookie (called on sign-out). */
export function removeToken() {
  Cookies.remove(TOKEN_KEY);
}

/** True if a (possibly stale) cookie token exists. */
export function hasToken() {
  return !!Cookies.get(TOKEN_KEY);
}
