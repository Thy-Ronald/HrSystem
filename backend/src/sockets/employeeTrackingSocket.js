/**
 * Employee Tracking Socket Service
 *
 * Manages a singleton Firestore onSnapshot subscription for every employee's
 * presence/current doc.  Whenever a doc changes it pushes
 * `tracking:presence-update` to all connected admin sockets.
 *
 * Lifecycle:
 *  - start(io)  — called once from server.js after io is ready
 *  - stop()     — called during graceful shutdown
 */

const { firestoreA } = require('../config/firebaseProjectA');

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/** uid → Firestore unsubscribe function */
const unsubscribeMap = new Map();

let ioRef = null;
let employeeListenerUnsubscribe = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveStatus(presence) {
  if (!presence) return 'offline';
  const lastSeenMs = presence.lastSeen?.toMillis?.() || 0;
  const isStale = Date.now() - lastSeenMs > STALE_THRESHOLD_MS;
  return isStale ? 'offline' : (presence.status || 'offline');
}

function buildPayload(emp, presenceData) {
  const effectiveStatus = resolveStatus(presenceData);
  return {
    uid: emp.uid,
    name: emp.name || emp.email || emp.uid,
    email: emp.email || '',
    effectiveStatus,
    presence: presenceData
      ? {
          currentApp: presenceData.currentApp || null,
          currentTitle: presenceData.currentTitle || null,
          category: presenceData.category || '',
          isIdle: presenceData.isIdle ?? false,
          isPaused: presenceData.isPaused ?? false,
          status: presenceData.status || 'offline',
          totalActiveMs: presenceData.totalActiveMs || 0,
          sessionStartedAt: presenceData.sessionStartedAt || null,
          lastSeen: presenceData.lastSeen?.toMillis?.() || null,
          effectiveStatus,
        }
      : null,
  };
}

// ─── Per-employee listener ─────────────────────────────────────────────────────

function watchEmployee(emp) {
  if (unsubscribeMap.has(emp.uid)) return; // already watching

  const docRef = firestoreA.doc(`users/${emp.uid}/presence/current`);

  const unsub = docRef.onSnapshot(
    (snap) => {
      if (!ioRef) return;
      const presenceData = snap.exists ? snap.data() : null;
      const payload = buildPayload(emp, presenceData);
      ioRef.to('tracking:admins').emit('tracking:presence-update', payload);
    },
    (err) => {
      console.error(`[TrackingSocket] Snapshot error for ${emp.uid}:`, err.message);
    }
  );

  unsubscribeMap.set(emp.uid, unsub);
  console.log(`[TrackingSocket] Watching presence for ${emp.name || emp.uid}`);
}

function unwatchEmployee(uid) {
  const unsub = unsubscribeMap.get(uid);
  if (unsub) {
    unsub();
    unsubscribeMap.delete(uid);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start all presence listeners and set up the admin socket room.
 * @param {import('socket.io').Server} io
 */
async function start(io) {
  ioRef = io;

  // Listen for admin clients joining / leaving the tracking room
  io.on('connection', (socket) => {
    socket.on('tracking:join', () => {
      socket.join('tracking:admins');
      console.log(`[TrackingSocket] Admin ${socket.id} joined tracking:admins`);
    });

    socket.on('tracking:leave', () => {
      socket.leave('tracking:admins');
    });
  });

  // Watch all current employees via onSnapshot on the users collection
  employeeListenerUnsubscribe = firestoreA
    .collection('users')
    .where('role', '==', 'employee')
    .onSnapshot(
      async (snap) => {
        const currentUids = new Set(snap.docs.map((d) => d.id));

        // Start watching any new employees
        snap.docs.forEach((doc) => {
          const emp = { uid: doc.id, ...doc.data() };
          watchEmployee(emp);
        });

        // Stop watching removed employees
        for (const uid of unsubscribeMap.keys()) {
          if (!currentUids.has(uid)) {
            unwatchEmployee(uid);
            // Notify admins this employee is gone
            if (ioRef) {
              ioRef.to('tracking:admins').emit('tracking:employee-removed', { uid });
            }
          }
        }
      },
      (err) => {
        console.error('[TrackingSocket] Users collection snapshot error:', err.message);
      }
    );

  console.log('[TrackingSocket] Employee tracking socket service started');
}

/**
 * Stop all Firestore listeners (call during graceful shutdown).
 */
function stop() {
  if (employeeListenerUnsubscribe) {
    employeeListenerUnsubscribe();
    employeeListenerUnsubscribe = null;
  }
  for (const uid of [...unsubscribeMap.keys()]) {
    unwatchEmployee(uid);
  }
  console.log('[TrackingSocket] Employee tracking socket service stopped');
}

module.exports = { start, stop };
