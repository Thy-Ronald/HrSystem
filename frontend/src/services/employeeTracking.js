/**
 * Employee Tracking API Service
 * Connects the frontend to the /api/employee-tracking/* endpoints.
 */

import { getToken } from '../utils/auth';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

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
 * @param {string} uid - Firestore user ID
 * @param {string} [date] - YYYY-MM-DD (defaults to today on the server)
 */
export async function fetchUserScreenshots(uid, date) {
  const url = new URL(`${API_BASE}/api/employee-tracking/screenshots/${uid}`);
  if (date) url.searchParams.set('date', date);
  const res = await fetch(url.toString(), { headers: authHeaders() });
  return handleResponse(res);
}

/**
 * Fetch daily activity for a specific user.
 * @param {string} uid - Firestore user ID
 * @param {string} [date] - YYYY-MM-DD (defaults to today on the server)
 */
export async function fetchUserActivity(uid, date) {
  const url = new URL(`${API_BASE}/api/employee-tracking/activity/${uid}`);
  if (date) url.searchParams.set('date', date);
  const res = await fetch(url.toString(), { headers: authHeaders() });
  return handleResponse(res);
}
