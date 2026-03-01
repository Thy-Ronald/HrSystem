/**
 * Employee Tracking Controller
 * Reads Project A data from Firestore to power the Live Team Overview dashboard.
 */

const { firestoreA } = require('../config/firebaseProjectA');
const { cacheGet, cacheSet } = require('../config/redis');

// TTLs in seconds
const TTL_EMPLOYEES   = 1800; // 30 min  — rarely changes
const TTL_PRESENCE    =    5; // 5 s     — socket handles real-time; just guards burst reconnects
const TTL_ACTIVITY_TODAY     =   60; // 1 min   — live today data
const TTL_SCREENSHOTS_TODAY  = 1800; // 30 min  — screenshots don't change that frequently
// Past dates are immutable → no expiry (TTL omitted = permanent)

/**
 * Returns today's date key in YYYY-MM-DD format (local time of the server).
 */
function getTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Resolve effective status from presence doc.
 * Treat as 'offline' if lastSeen is stale (> 5 min ago).
 */
function resolveStatus(presence) {
  if (!presence) return 'offline';
  const lastSeenMs = presence.lastSeen?.toMillis?.() || 0;
  const isStale = Date.now() - lastSeenMs > 5 * 60 * 1000;
  return isStale ? 'offline' : (presence.status || 'offline');
}

/**
 * GET /api/employee-tracking/employees
 * Returns all users with role = 'employee' from Firestore.
 */
async function getEmployees(req, res) {
  try {
    const CACHE_KEY = 'employees';
    const cached = await cacheGet(CACHE_KEY);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    const snap = await firestoreA
      .collection('users')
      .where('role', '==', 'employee')
      .get();

    const employees = snap.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));
    await cacheSet(CACHE_KEY, employees, TTL_EMPLOYEES);
    res.json({ success: true, data: employees });
  } catch (error) {
    console.error('[EmployeeTracking] getEmployees error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch employees' });
  }
}

/**
 * GET /api/employee-tracking/presence
 * Returns presence data for every employee (with staleness check).
 */
async function getAllPresence(req, res) {
  try {
    const CACHE_KEY = 'presence:all';
    const cached = await cacheGet(CACHE_KEY);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    // 1. Fetch all employee profiles
    const usersSnap = await firestoreA
      .collection('users')
      .where('role', '==', 'employee')
      .get();

    const employees = usersSnap.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));

    // 2. Batch-fetch all presence docs in a single round-trip
    const presenceRefs = employees.map((emp) =>
      firestoreA.doc(`users/${emp.uid}/presence/current`)
    );
    const presenceSnaps = presenceRefs.length > 0
      ? await firestoreA.getAll(...presenceRefs)
      : [];

    const presenceData = employees.map((emp, i) => {
      const presSnap = presenceSnaps[i];
      const presence = presSnap?.exists ? presSnap.data() : null;
      const effectiveStatus = resolveStatus(presence);

      return {
        uid: emp.uid,
        name: emp.name || emp.email || emp.uid,
        email: emp.email || '',
        effectiveStatus,
        presence: presence
          ? {
              currentApp: presence.currentApp || null,
              currentTitle: presence.currentTitle || null,
              category: presence.category || '',
              isIdle: presence.isIdle ?? false,
              isPaused: presence.isPaused ?? false,
              status: presence.status || 'offline',
              totalActiveMs: presence.totalActiveMs || 0,
              sessionStartedAt: presence.sessionStartedAt || null,
              lastSeen: presence.lastSeen?.toMillis?.() || null,
              effectiveStatus,
            }
          : null,
      };
    });
    await cacheSet(CACHE_KEY, presenceData, TTL_PRESENCE);
    res.json({ success: true, data: presenceData });
  } catch (error) {
    console.error('[EmployeeTracking] getAllPresence error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch presence data' });
  }
}

/**
 * GET /api/employee-tracking/activity/:uid?date=YYYY-MM-DD
 * Returns activity document for a specific user and date.
 * Defaults to today if no date is provided.
 */
async function getUserActivity(req, res) {
  try {
    const { uid } = req.params;
    const today = getTodayKey();
    const date = req.query.date || today;

    // Validate inputs to prevent cache-key injection
    if (!uid || !/^[\w-]{1,128}$/.test(uid)) {
      return res.status(400).json({ success: false, error: 'Invalid uid' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: 'Invalid date format (expected YYYY-MM-DD)' });
    }

    const isToday = date === today;
    const CACHE_KEY = `activity:${uid}:${date}`;
    const cached = await cacheGet(CACHE_KEY);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    const snap = await firestoreA.doc(`users/${uid}/activity/${date}`).get();

    if (!snap.exists) {
      return res.json({ success: true, data: null });
    }

    const data = snap.data();

    // Unsanitize dot-encoded app keys for display
    const apps = {};
    Object.entries(data.apps || {}).forEach(([key, ms]) => {
      apps[key.replace(/__dot__/g, '.')] = ms;
    });

    const payload = {
      totalActiveMs: data.totalActiveMs || 0,
      totalIdleMs: data.totalIdleMs || 0,
      apps,
      activities: data.activities || [],
      lastUpdated: data.lastUpdated?.toMillis?.() || null,
    };
    // Today: short TTL (data updates live). Past dates: permanent (immutable).
    await cacheSet(CACHE_KEY, payload, isToday ? TTL_ACTIVITY_TODAY : undefined);
    res.json({ success: true, data: payload });
  } catch (error) {
    console.error('[EmployeeTracking] getUserActivity error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch activity data' });
  }
}

/**
 * GET /api/employee-tracking/screenshots/:uid?date=YYYY-MM-DD
 * Reads users/{uid}/screenshots/{dateKey} and returns the images array.
 */
async function getUserScreenshots(req, res) {
  try {
    const { uid } = req.params;
    const today = getTodayKey();
    const date = req.query.date || today;

    // Validate inputs to prevent cache-key injection
    if (!uid || !/^[\w-]{1,128}$/.test(uid)) {
      return res.status(400).json({ success: false, error: 'Invalid uid' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: 'Invalid date format (expected YYYY-MM-DD)' });
    }

    const isToday = date === today;
    const CACHE_KEY = `screenshots:${uid}:${date}`;
    const cached = await cacheGet(CACHE_KEY);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    const snap = await firestoreA.doc(`users/${uid}/screenshots/${date}`).get();

    if (!snap.exists) {
      return res.json({ success: true, data: [] });
    }

    const data = snap.data();
    const images = (data.images || []).map((img, i) => ({
      id: i,
      url: img.url || null,
      timestamp: typeof img.timestamp === 'number'
        ? img.timestamp
        : img.timestamp?.toMillis?.() || null,
    }));

    // Return newest first
    images.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));

    // Today: short TTL. Past dates: permanent (immutable).
    await cacheSet(CACHE_KEY, images, isToday ? TTL_SCREENSHOTS_TODAY : undefined);
    res.json({ success: true, data: images });
  } catch (error) {
    console.error('[EmployeeTracking] getUserScreenshots error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch screenshots' });
  }
}

module.exports = { getEmployees, getAllPresence, getUserActivity, getUserScreenshots };
