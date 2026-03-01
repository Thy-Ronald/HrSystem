/**
 * Shared helpers for the Employee Tracking feature.
 */

export const PRODUCTIVE_CATEGORIES = ['Development', 'Design', 'Documentation'];
// Normalised lowercase version used for matching — avoids case/whitespace mismatches
const PRODUCTIVE_NORMALIZED = PRODUCTIVE_CATEGORIES.map((c) => c.toLowerCase().trim());

export const CATEGORY_COLORS = {
  Development: { bg: '#dbeafe', text: '#1d4ed8' },
  Communication: { bg: '#ede9fe', text: '#7c3aed' },
  Browsing: { bg: '#ffedd5', text: '#c2410c' },
  Design: { bg: '#fce7f3', text: '#be185d' },
  Documentation: { bg: '#ccfbf1', text: '#0f766e' },
  Other: { bg: '#f3f4f6', text: '#374151' },
  Idle: { bg: '#fef9c3', text: '#a16207' },
  Paused: { bg: '#e0f2fe', text: '#0369a1' },
};

export const STATUS_COLORS = {
  active: '#22c55e',
  idle: '#eab308',
  paused: '#3b82f6',
  offline: '#9ca3af',
};

/**
 * Format milliseconds into a human-readable string like "3h 45m" or "12m".
 */
export function formatMs(ms) {
  if (!ms || ms <= 0) return '0m';
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/**
 * Format a timestamp (epoch ms) as a relative string like "2 min ago".
 */
export function formatRelative(epochMs) {
  if (!epochMs) return 'Never';
  const diffMs = Date.now() - epochMs;
  // Guard against future timestamps (clock skew)
  if (diffMs < 0) return 'Just now';
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

/**
 * Compute productivity percentage from an activities array.
 */
export function computeProductivity(activities = []) {
  let productiveMs = 0;
  let totalMs = 0;
  activities.forEach((a) => {
    if (a.isIdle) return;
    totalMs += a.durationMs || 0;
    if (PRODUCTIVE_NORMALIZED.includes((a.category || '').toLowerCase().trim())) {
      productiveMs += a.durationMs || 0;
    }
  });
  return totalMs > 0 ? Math.round((productiveMs / totalMs) * 100) : 0;
}

/**
 * Get top N apps from the app usage map, sorted by duration desc.
 */
export function topApps(apps = {}, n = 3) {
  return Object.entries(apps)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n);
}

/**
 * Bucket activities into 24 hourly slots.
 * Returns an array of { hour, activeMs, idleMs } for hours 0–23.
 */
export function buildHourlyBuckets(activities = []) {
  const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, activeMs: 0, idleMs: 0 }));
  activities.forEach((a) => {
    const ms = a.durationMs || 0;
    if (ms <= 0 || !a.start) return;
    // Split the activity across all hour buckets it spans
    const end = a.start + ms;
    let cursor = a.start;
    while (cursor < end) {
      const h = new Date(cursor).getHours();
      const nextHourMs = cursor - (cursor % 3_600_000) + 3_600_000;
      const sliceMs = Math.min(end, nextHourMs) - cursor;
      if (h >= 0 && h <= 23) {
        if (a.isIdle) buckets[h].idleMs += sliceMs;
        else buckets[h].activeMs += sliceMs;
      }
      cursor = nextHourMs;
    }
  });
  return buckets;
}

/**
 * Returns today's date string as YYYY-MM-DD.
 */
export function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns initials from a display name.
 */
export function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join('');
}
