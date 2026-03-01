/**
 * Employee Tracking API Service
 * Connects the frontend to the /api/employee-tracking/* endpoints.
 *
 * Client-side in-memory cache mirrors the Redis TTLs so repeated modal
 * opens don't hit the backend at all when data is fresh.
 */

import { getToken } from '../utils/auth';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

// --- simple TTL cache ---------------------------------------------------
const _cache = new Map(); // key → { data, expiresAt }

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function memGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) { _cache.delete(key); return null; }
  return entry.data;
}

function memSet(key, data, ttlMs) {
  _cache.set(key, { data, expiresAt: ttlMs ? Date.now() + ttlMs : null });
}
// -------------------------------------------------------------------------

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data.success ? data.data : data;
}

/** Fetch all employees (profile data only). */
export async function fetchEmployees() {
  const res = await fetch(`${API_BASE}/api/employee-tracking/employees`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

/** Fetch all employees with their current presence status. */
export async function fetchAllPresence() {
  const res = await fetch(`${API_BASE}/api/employee-tracking/presence`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

/**
 * Fetch screenshots for a specific user.
 * Today → 30 min client cache (mirrors Redis TTL).
 * Past dates → cached indefinitely (immutable).
 */
export async function fetchUserScreenshots(uid, date) {
  const d = date || todayKey();
  const key = `screenshots:${uid}:${d}`;
  const cached = memGet(key);
  if (cached) return cached;

  const url = new URL(`${API_BASE}/api/employee-tracking/screenshots/${uid}`);
  url.searchParams.set('date', d);
  const res = await fetch(url.toString(), { headers: authHeaders() });
  const data = await handleResponse(res);

  const isToday = d === todayKey();
  memSet(key, data, isToday ? 30 * 60 * 1000 : null); // 30 min or permanent
  return data;
}

/**
 * Fetch daily activity for a specific user.
 * Today → 60 s client cache. Past dates → indefinite.
 */
export async function fetchUserActivity(uid, date) {
  const d = date || todayKey();
  const key = `activity:${uid}:${d}`;
  const cached = memGet(key);
  if (cached) return cached;

  const url = new URL(`${API_BASE}/api/employee-tracking/activity/${uid}`);
  url.searchParams.set('date', d);
  const res = await fetch(url.toString(), { headers: authHeaders() });
  const data = await handleResponse(res);

  const isToday = d === todayKey();
  memSet(key, data, isToday ? 60 * 1000 : null);
  return data;
}
