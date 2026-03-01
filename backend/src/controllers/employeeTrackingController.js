/**
 * Employee Tracking Controller
 * Reads Project A data from Firestore to power the Live Team Overview dashboard.
 */

const { firestoreA } = require('../config/firebaseProjectA');

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
    const snap = await firestoreA
      .collection('users')
      .where('role', '==', 'employee')
      .get();

    const employees = snap.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));
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
    const date = req.query.date || getTodayKey();

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

    res.json({
      success: true,
      data: {
        totalActiveMs: data.totalActiveMs || 0,
        totalIdleMs: data.totalIdleMs || 0,
        apps,
        activities: data.activities || [],
        lastUpdated: data.lastUpdated?.toMillis?.() || null,
      },
    });
  } catch (error) {
    console.error('[EmployeeTracking] getUserActivity error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch activity data' });
  }
}

module.exports = { getEmployees, getAllPresence, getUserActivity };
